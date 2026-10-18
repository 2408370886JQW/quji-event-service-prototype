import { describe, expect, it } from "vitest";
import {
  approveRefundForProcessing,
  DEFAULT_REFUNDS,
  isRefundFrozen,
  type RefundRecord,
} from "./refundData";

describe("退款状态边界", () => {
  it("缺少订单冻结规则、金额或未使用状态时不能同意退款", () => {
    expect(() =>
      approveRefundForProcessing(
        DEFAULT_REFUNDS,
        "refund-20260929-001",
        "周可",
        "2026-09-30 10:00"
      )
    ).toThrow("缺少订单冻结退款规则");
  });

  it("同意退款只能进入 processing，并且重复审批不重复记录", () => {
    const record: RefundRecord = {
      ...DEFAULT_REFUNDS[0],
      frozenRefundRule: {
        ruleVersion: "RULE-2026-06-v1",
        refundAmountCents: 8800,
        eligible: true,
        ticketUnused: true,
      },
    };
    const once = approveRefundForProcessing(
      [record],
      record.id,
      "周可",
      "2026-09-30 10:00"
    );
    expect(once[0].status).toBe("processing");
    expect(once[0].logs).toHaveLength(record.logs.length + 1);
    const twice = approveRefundForProcessing(
      once,
      record.id,
      "周可",
      "2026-09-30 10:00"
    );
    expect(twice).toEqual(once);
  });

  it("处理中、失败、未知与申诉状态始终冻结票", () => {
    for (const status of [
      "pending_review",
      "submitting",
      "processing",
      "failed",
      "unknown",
      "appeal_pending",
      "appeal_approved",
      "appeal_rejected",
    ] as const)
      expect(isRefundFrozen(status)).toBe(true);
    expect(isRefundFrozen("refunded")).toBe(false);
    expect(isRefundFrozen("rejected")).toBe(false);
    expect(isRefundFrozen("a-new-status")).toBe(true);
  });
});
