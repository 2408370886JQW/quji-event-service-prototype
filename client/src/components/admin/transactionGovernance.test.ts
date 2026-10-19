import { describe, expect, it } from "vitest";
import {
  assertActivityId,
  assertAppealAction,
  assertCollectionScope,
  assertExpectedVersion,
  hasFrozenRefundInputs,
  isGovernanceTicketFrozen,
  loadApiGovernance,
  transitionDemoAppeal,
  validatePolicy,
  type GovernanceApi,
  type RefundAppeal,
  type TicketPolicy,
} from "./transactionGovernance";

const policy: TicketPolicy = {
  id: "policy-1",
  activityId: "EVT-2026-0628",
  version: "v1",
  title: "活动退票政策",
  purchaseNotice: "购票前请确认场次。",
  refundCondition: "活动开始前可按冻结规则申请。",
  refundFeePercent: 0,
  effectiveAt: "2026-06-01T10:00",
  requiresFinalEligibility: true,
  status: "draft",
  updatedAt: "2026-06-01T09:00",
};

const appeal: RefundAppeal = {
  id: "appeal-1",
  activityId: "EVT-2026-0628",
  refundRequestId: "refund-1",
  ticketId: "ticket-1",
  status: "appeal_pending",
  amountCents: 8800,
  policyVersion: "v1",
  frozenEligible: true,
  frozenTicketUnused: true,
  audit: [],
};

function failingApi(): GovernanceApi {
  const fail = async () => {
    throw new Error("服务暂不可用");
  };
  return {
    listPolicies: fail,
    savePolicy: fail,
    publishPolicy: fail,
    listOrders: fail,
    getOrder: fail,
    refreshChannel: fail,
    registerIssue: fail,
    listAppeals: fail,
    decideAppeal: fail,
    listCancellationBatches: fail,
  } as GovernanceApi;
}

describe("交易管理强回归", () => {
  it("校验政策的必填字段、费用和生效时间", () => {
    expect(validatePolicy(policy)).toEqual({});
    expect(
      validatePolicy({
        ...policy,
        title: "",
        refundFeePercent: 120,
        effectiveAt: "not-a-date",
      })
    ).toMatchObject({
      title: "请填写政策名称",
      refundFeePercent: "退款手续费需为 0 至 100 的数字",
      effectiveAt: "请选择有效的生效时间",
    });
  });

  it("拒绝跨活动响应和版本冲突", () => {
    expect(() => assertActivityId("  ")).toThrow("缺少活动标识");
    expect(() =>
      assertCollectionScope("EVT-1", [{ ...policy, activityId: "EVT-2" }])
    ).toThrow("其他活动");
    expect(() => assertExpectedVersion("v2", "v1")).toThrow("版本已更新");
  });

  it("通过申诉只进入 processing，且资金冻结字段缺失时拒绝", () => {
    expect(hasFrozenRefundInputs(appeal)).toBe(true);
    const processing = transitionDemoAppeal(
      appeal,
      "platform",
      "approve",
      "规则已核对",
      "2026-06-01T12:00"
    );
    expect(processing.status).toBe("processing");
    expect(processing.status).not.toBe("refunded");
    expect(isGovernanceTicketFrozen(processing.status)).toBe(true);
    expect(() =>
      assertAppealAction(
        { ...appeal, amountCents: undefined },
        "platform",
        "approve"
      )
    ).toThrow("缺少冻结金额");
  });

  it("对 processing/refunded 禁止重复审批，驳回必须带原因", () => {
    expect(() =>
      assertAppealAction(
        { ...appeal, status: "processing" },
        "platform",
        "approve"
      )
    ).toThrow("不能重复审批");
    expect(() =>
      assertAppealAction(
        { ...appeal, status: "refunded" },
        "platform",
        "approve"
      )
    ).toThrow("不能重复审批");
    expect(() => assertAppealAction(appeal, "platform", "reject", " ")).toThrow(
      "请填写驳回原因"
    );
    expect(() =>
      assertAppealAction(appeal, "organizer", "approve", "已核对")
    ).toThrow("仅平台运营人员");
  });

  it("API 失败直接上抛，绝不回退本地演示订单或退款数据", async () => {
    await expect(
      loadApiGovernance("EVT-2026-0628", failingApi())
    ).rejects.toThrow("服务暂不可用");
  });
});

it("最终有效资格门禁不能由退票政策关闭", () => {
  expect(
    validatePolicy({ ...policy, requiresFinalEligibility: false })
  ).toHaveProperty("requiresFinalEligibility");
});

it("未支付与待退款状态绝不显示为资金成功", async () => {
  const { transactionStatusTone } = await import("./transactionGovernance");
  expect(transactionStatusTone("unpaid")).toBe("warning");
  expect(transactionStatusTone("not_paid")).toBe("warning");
  expect(transactionStatusTone("refund_pending")).toBe("warning");
  expect(transactionStatusTone("not_refunded")).not.toBe("success");
  expect(transactionStatusTone("paid")).toBe("success");
  expect(transactionStatusTone("refunded")).toBe("success");
});

it("浏览器存储失败不得伪造政策保存成功", async () => {
  const { saveDemoPolicy } = await import("./transactionGovernance");
  const { vi } = await import("vitest");
  vi.stubGlobal("window", {
    localStorage: {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
    },
  });
  try {
    expect(() => saveDemoPolicy(policy.activityId, policy)).toThrow("保存");
  } finally {
    vi.unstubAllGlobals();
  }
});
