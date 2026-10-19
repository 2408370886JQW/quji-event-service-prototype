import { describe, expect, it, vi } from "vitest";
import {
  canAccessConsumerAccounts,
  canManageConsumerSecurity,
  canReviewConsumerKyc,
  createConsumerAccountsApi,
  createDemoConfigurationApi,
  maskConsumerText,
  validateComplianceDocument,
  validateSecurityPolicy,
  type ConsumerSecurityPolicy,
} from "./consumerAccounts";

const validDocument = {
  title: "隐私政策",
  version: "1.0.0",
  effectiveAt: "2026-10-20T09:00:00",
  contentBody: "我们仅按必要范围处理个人信息。",
  contentUrl: "https://example.test/privacy",
  locale: "zh-CN",
};

const validPolicy = (): ConsumerSecurityPolicy => ({
  version: "1.0.0",
  updatedAt: "2026-10-19T00:00:00Z",
  sms: {
    login_sms: {
      resendAfterSeconds: 60,
      expiresInSeconds: 300,
      maxAttempts: 5,
      maxPerPhonePerDay: 10,
      maxPerIpPerDay: 30,
      maxPerDevicePerDay: 20,
      lockMinutes: 30,
    },
    consumer_register: {
      resendAfterSeconds: 60,
      expiresInSeconds: 300,
      maxAttempts: 5,
      maxPerPhonePerDay: 10,
      maxPerIpPerDay: 30,
      maxPerDevicePerDay: 20,
      lockMinutes: 30,
    },
    password_reset: {
      resendAfterSeconds: 60,
      expiresInSeconds: 300,
      maxAttempts: 5,
      maxPerPhonePerDay: 10,
      maxPerIpPerDay: 30,
      maxPerDevicePerDay: 20,
      lockMinutes: 30,
    },
    consumer_phone_bind: {
      resendAfterSeconds: 60,
      expiresInSeconds: 300,
      maxAttempts: 5,
      maxPerPhonePerDay: 10,
      maxPerIpPerDay: 30,
      maxPerDevicePerDay: 20,
      lockMinutes: 30,
    },
  },
});

describe("消费者账户平台前端守卫", () => {
  it("拒绝 organizer、culture 及没有服务端声明的 platform", () => {
    expect(
      canAccessConsumerAccounts({ role: "organizer", permissions: ["privacy"] })
    ).toBe(false);
    expect(
      canAccessConsumerAccounts({ role: "culture", permissions: ["privacy"] })
    ).toBe(false);
    expect(canAccessConsumerAccounts({ role: "platform" })).toBe(false);
  });

  it("缺少细粒度 claims 时不放行 KYC 审批或强制解绑", () => {
    expect(
      canAccessConsumerAccounts({ role: "platform", permissions: ["privacy"] })
    ).toBe(true);
    expect(
      canReviewConsumerKyc({ role: "platform", permissions: ["privacy"] })
    ).toBe(false);
    expect(
      canManageConsumerSecurity({
        role: "platform",
        permissions: ["privacy", "security"],
      })
    ).toBe(true);
    expect(
      canManageConsumerSecurity({ role: "platform", permissions: ["security"] })
    ).toBe(false);
  });
});

describe("最小投影与配置校验", () => {
  it("只显示掩码字段，绝不回传原手机号形式", () => {
    expect(maskConsumerText("13800138000")).toBe("13•••••••00");
    expect(maskConsumerText("ab")).toBe("••");
  });

  it("发布前验证版本、生效时间、正文或 https 链接以及乱码", () => {
    expect(validateComplianceDocument(validDocument)).toEqual([]);
    expect(
      validateComplianceDocument({ ...validDocument, version: "release-one" })
    ).toContain("版本号需为数字语义版本，例如 1.0.0");
    expect(
      validateComplianceDocument({ ...validDocument, contentBody: "隐私�政策" })
    ).toContain("正文或链接包含乱码，请修正后再发布");
    expect(
      validateComplianceDocument({
        ...validDocument,
        contentUrl: "http://insecure.test",
      })
    ).toContain("文档链接必须使用 https://");
  });

  it("策略必须分隔每个短信场景且拒绝任何密钥字段", () => {
    expect(validateSecurityPolicy(validPolicy())).toEqual([]);
    const leaked = {
      ...validPolicy(),
      providerSecret: "never-render",
    } as unknown as ConsumerSecurityPolicy;
    expect(validateSecurityPolicy(leaked)).toContain(
      "安全策略不得包含密码、验证码或供应商密钥"
    );
  });
});

describe("真实 API 失败不回退样例或 local fake success", () => {
  it("读取失败原样拒绝，并保留统一的消费者账户 endpoint", async () => {
    const request = vi.fn().mockRejectedValue(new Error("503 unavailable"));
    const api = createConsumerAccountsApi(request);
    await expect(api.listConsumers({ keyword: "138" })).rejects.toThrow(
      "503 unavailable"
    );
    expect(request).toHaveBeenCalledWith(
      "/platform/consumer-accounts?keyword=138"
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("KYC 决策只调用独立消费者 KYC endpoint，不会落到活动角色审核", async () => {
    const request = vi.fn().mockRejectedValue(new Error("network down"));
    const api = createConsumerAccountsApi(request);
    await expect(
      api.reviewKyc({
        id: "kyc-1",
        decision: "verified",
        reason: "已核对",
        version: "3",
      })
    ).rejects.toThrow("network down");
    expect(request.mock.calls[0][0]).toBe(
      "/platform/consumer-kyc/kyc-1/decisions"
    );
    expect(request.mock.calls[0][1]).toMatchObject({ method: "POST" });
  });
});

describe("Demo 配置边界", () => {
  it("仅保存合规/策略版本审计，且不提供消费者账户或 KYC 模拟器", async () => {
    const demo = createDemoConfigurationApi();
    const draft = await demo.saveComplianceDocument({
      ...validDocument,
      kind: "privacy",
    });
    const scheduled = await demo.publishComplianceDocument({
      id: draft.id,
      version: "1.0.0",
      effectiveAt: "2099-01-01T00:00:00Z",
    });
    const savedPolicy = await demo.saveSecurityPolicy(validPolicy());
    expect(scheduled.status).toBe("scheduled");
    expect(scheduled.versionAudit.at(-1)?.action).toBe(
      "demo_publication_saved_not_app_live"
    );
    expect(savedPolicy.versionAudit?.at(-1)?.action).toBe(
      "security_policy_saved_not_app_live"
    );
    expect("listConsumers" in demo).toBe(false);
    expect("reviewKyc" in demo).toBe(false);
  });
});

describe("本地配置刷新和存储失败边界", () => {
  function storage() {
    const values = new Map<string, string>();
    return {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
  }

  it("新的适配器实例仍能读取已保存合规版本及发布审计", async () => {
    const shared = storage();
    const first = createDemoConfigurationApi(undefined, shared);
    const draft = await first.saveComplianceDocument({
      ...validDocument,
      kind: "privacy",
    });
    await first.publishComplianceDocument({
      id: draft.id,
      version: "1.0.0",
      effectiveAt: "2099-01-01T00:00:00Z",
    });
    const restored = createDemoConfigurationApi(undefined, shared);
    const documents = await restored.listComplianceDocuments();
    expect(documents).toHaveLength(1);
    expect(documents[0]).toMatchObject({
      id: draft.id,
      title: "隐私政策",
      status: "scheduled",
    });
    expect(documents[0].versionAudit).toHaveLength(2);
  });

  it("安全策略和四个短信场景在刷新后完整保留", async () => {
    const shared = storage();
    const first = createDemoConfigurationApi(undefined, shared);
    const saved = await first.saveSecurityPolicy(validPolicy());
    const restored = createDemoConfigurationApi(undefined, shared);
    expect(await restored.getSecurityPolicy()).toEqual(saved);
  });

  it("存储写入失败必须拒绝，不能先改内存后宣称保存", async () => {
    const unavailable = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
    };
    const api = createDemoConfigurationApi(undefined, unavailable);
    await expect(
      api.saveComplianceDocument({ ...validDocument, kind: "privacy" })
    ).rejects.toThrow("保存");
    expect(await api.listComplianceDocuments()).toEqual([]);
    await expect(api.saveSecurityPolicy(validPolicy())).rejects.toThrow("保存");
    await expect(api.getSecurityPolicy()).rejects.toThrow("尚未配置");
  });
});
