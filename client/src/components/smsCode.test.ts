import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MOCK_SMS_CODE,
  REGISTRATION_DRAFT_KEY,
  SMS_MAX_ATTEMPTS,
  SMS_MESSAGES,
  clearRegistrationDraft,
  createSmsTicket,
  isValidPhone,
  loadRegistrationDraft,
  maskPhone,
  recordFailedAttempt,
  resendSeconds,
  sanitizeCode,
  sanitizePhone,
  saveRegistrationDraft,
  sendButtonLabel,
  smsPrecheck,
} from "./smsCode";

const T0 = 1_790_000_000_000;

describe("手机号与验证码输入", () => {
  it("粘贴带国家码 空格或短横线的号码能识别为 11 位", () => {
    expect(sanitizePhone("+86 138 0013 8000")).toBe("13800138000");
    expect(sanitizePhone("0086-138-0013-8000")).toBe("13800138000");
    expect(sanitizePhone("138 0013 8000")).toBe("13800138000");
    expect(sanitizePhone("1380013800012")).toBe("13800138000");
    expect(sanitizePhone("86")).toBe("86");
  });
  it("按号段校验手机号", () => {
    expect(isValidPhone("13800138000")).toBe(true);
    expect(isValidPhone("19912345678")).toBe(true);
    expect(isValidPhone("12345678901")).toBe(false);
    expect(isValidPhone("1380013800")).toBe(false);
  });
  it("验证码只保留 6 位数字 手机号脱敏展示", () => {
    expect(sanitizeCode("24a68 10 9")).toBe("246810");
    expect(maskPhone("13800138000")).toBe("138****8000");
  });
});

describe("发送与重发", () => {
  it("发送后 60 秒内不能重发 按钮文案随状态变化", () => {
    const ticket = createSmsTicket("13800138000", T0);
    expect(sendButtonLabel(null, T0, false)).toBe("获取验证码");
    expect(sendButtonLabel(null, T0, true)).toBe("发送中");
    expect(resendSeconds(ticket, T0)).toBe(60);
    expect(sendButtonLabel(ticket, T0 + 3_000, false)).toBe("57s 后重发");
    expect(resendSeconds(ticket, T0 + 60_000)).toBe(0);
    expect(sendButtonLabel(ticket, T0 + 60_000, false)).toBe("重新获取");
  });
  it("可使用服务端返回的有效期与重发间隔", () => {
    const ticket = createSmsTicket("13800138000", T0, {
      expiresIn: 120,
      resendAfter: 30,
    });
    expect(ticket.expiresAt - T0).toBe(120_000);
    expect(resendSeconds(ticket, T0)).toBe(30);
    expect(ticket.mockCode).toBeUndefined();
  });
});

describe("提交前检查", () => {
  const ticket = createSmsTicket("13800138000", T0, {
    mockCode: MOCK_SMS_CODE,
  });
  it("依次拦截号码错误 未获取 格式错误", () => {
    expect(smsPrecheck(ticket, "12345678901", "246810", T0)).toBe(
      SMS_MESSAGES.invalidPhone
    );
    expect(smsPrecheck(null, "13800138000", "246810", T0)).toBe(
      SMS_MESSAGES.notSent
    );
    expect(smsPrecheck(ticket, "13900139000", "246810", T0)).toBe(
      SMS_MESSAGES.notSent
    );
    expect(smsPrecheck(ticket, "13800138000", "2468", T0)).toBe(
      SMS_MESSAGES.invalidFormat
    );
    expect(smsPrecheck(ticket, "13800138000", "246810", T0 + 1_000)).toBe("");
  });
  it("超过 5 分钟有效期后失效", () => {
    expect(smsPrecheck(ticket, "13800138000", "246810", T0 + 300_000)).toBe("");
    expect(smsPrecheck(ticket, "13800138000", "246810", T0 + 300_001)).toBe(
      SMS_MESSAGES.expired
    );
  });
  it("连续输错 5 次后作废 需要重新获取", () => {
    let current = ticket;
    const errors: string[] = [];
    for (let index = 0; index < SMS_MAX_ATTEMPTS; index += 1) {
      const result = recordFailedAttempt(current);
      current = result.ticket;
      errors.push(result.error);
    }
    expect(errors[0]).toBe("验证码不正确 还可再试 4 次");
    expect(errors[3]).toBe("验证码不正确 还可再试 1 次");
    expect(errors[4]).toBe(SMS_MESSAGES.locked);
    expect(smsPrecheck(current, "13800138000", "246810", T0 + 1_000)).toBe(
      SMS_MESSAGES.locked
    );
  });
});

describe("注册草稿", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("保存后可恢复 不含身份证号 清除后为空", () => {
    const ticket = createSmsTicket("13800138000", T0);
    saveRegistrationDraft({
      step: 1,
      phone: "13800138000",
      ticket,
      agentIdentity: "authorized_agent",
      realName: "林洁",
      organizationName: "",
    });
    const raw = sessionStorage.getItem(REGISTRATION_DRAFT_KEY) || "";
    expect(raw).not.toContain("idNumber");
    expect(loadRegistrationDraft()).toEqual({
      step: 1,
      phone: "13800138000",
      ticket,
      agentIdentity: "authorized_agent",
      realName: "林洁",
      organizationName: "",
    });
    clearRegistrationDraft();
    expect(loadRegistrationDraft()).toBeNull();
  });
  it("损坏或被篡改的草稿按安全默认值恢复", () => {
    sessionStorage.setItem(REGISTRATION_DRAFT_KEY, "{bad json");
    expect(loadRegistrationDraft()).toBeNull();
    sessionStorage.setItem(
      REGISTRATION_DRAFT_KEY,
      JSON.stringify({
        step: 9,
        phone: "+86 13800138000",
        ticket: { phone: 1 },
        agentIdentity: "admin",
      })
    );
    expect(loadRegistrationDraft()).toEqual({
      step: 0,
      phone: "13800138000",
      ticket: null,
      agentIdentity: "",
      realName: "",
      organizationName: "",
    });
  });
});
