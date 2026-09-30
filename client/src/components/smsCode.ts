/**
 * 主办方首次入驻 · 短信验证码前端规则
 * 与 Vue3 工程 src/utils/smsCode.ts 保持一致
 * 前端校验只负责交互提示 真实环境的有效期 错误次数与发送频率必须由服务端再次校验
 */
export const SMS_CODE_TTL_SECONDS = 300;
export const SMS_RESEND_SECONDS = 60;
export const SMS_MAX_ATTEMPTS = 5;
export const MOCK_SMS_CODE = "246810";
export const REGISTRATION_DRAFT_KEY = "quji_registration_draft";

export const SMS_MESSAGES = {
  invalidPhone: "请输入正确的 11 位手机号",
  notSent: "请先点击获取验证码",
  expired: "验证码已过期 请重新获取",
  locked: "错误次数过多 请重新获取验证码",
  invalidFormat: "请输入 6 位短信验证码",
  sendFailed: "验证码发送失败 请稍后重试",
} as const;

export type SmsTicket = {
  phone: string;
  sentAt: number;
  expiresAt: number;
  resendAt: number;
  attempts: number;
  /** 仅本地样例模式返回 用于页面提示本次验证码 */
  mockCode?: string;
};

export type SmsSendOptions = {
  expiresIn?: number;
  resendAfter?: number;
  mockCode?: string;
};

/** 过滤非数字 去掉 +86 或 0086 国家码 最多保留 11 位 */
export function sanitizePhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.length > 11 && digits.startsWith("0086")) digits = digits.slice(4);
  else if (digits.length > 11 && digits.startsWith("86"))
    digits = digits.slice(2);
  return digits.slice(0, 11);
}

export function sanitizeCode(input: string): string {
  return input.replace(/\D/g, "").slice(0, 6);
}

/** 中国大陆手机号 1 开头 第二位 3 到 9 共 11 位 */
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

export function maskPhone(phone: string): string {
  return `${phone.slice(0, 3)}****${phone.slice(7)}`;
}

export function createSmsTicket(
  phone: string,
  now: number,
  options: SmsSendOptions = {}
): SmsTicket {
  const expiresIn = options.expiresIn ?? SMS_CODE_TTL_SECONDS;
  const resendAfter = options.resendAfter ?? SMS_RESEND_SECONDS;
  return {
    phone,
    sentAt: now,
    expiresAt: now + expiresIn * 1000,
    resendAt: now + resendAfter * 1000,
    attempts: 0,
    ...(options.mockCode ? { mockCode: options.mockCode } : {}),
  };
}

export function resendSeconds(ticket: SmsTicket | null, now: number): number {
  if (!ticket) return 0;
  return Math.max(0, Math.ceil((ticket.resendAt - now) / 1000));
}

export function sendButtonLabel(
  ticket: SmsTicket | null,
  now: number,
  sending: boolean
): string {
  if (sending) return "发送中";
  const seconds = resendSeconds(ticket, now);
  if (seconds > 0) return `${seconds}s 后重发`;
  return ticket ? "重新获取" : "获取验证码";
}

/** 提交前的本地检查 返回空字符串表示可以继续比对验证码 */
export function smsPrecheck(
  ticket: SmsTicket | null,
  phone: string,
  code: string,
  now: number
): string {
  if (!isValidPhone(phone)) return SMS_MESSAGES.invalidPhone;
  if (!ticket || ticket.phone !== phone) return SMS_MESSAGES.notSent;
  if (ticket.attempts >= SMS_MAX_ATTEMPTS) return SMS_MESSAGES.locked;
  if (now > ticket.expiresAt) return SMS_MESSAGES.expired;
  if (!/^\d{6}$/.test(code)) return SMS_MESSAGES.invalidFormat;
  return "";
}

/** 记录一次验证码错误 达到上限后该验证码作废 */
export function recordFailedAttempt(ticket: SmsTicket): {
  ticket: SmsTicket;
  error: string;
} {
  const attempts = ticket.attempts + 1;
  const left = SMS_MAX_ATTEMPTS - attempts;
  return {
    ticket: { ...ticket, attempts },
    error: left > 0 ? `验证码不正确 还可再试 ${left} 次` : SMS_MESSAGES.locked,
  };
}

export type RegistrationIdentityDraft =
  | ""
  | "legal_representative"
  | "authorized_agent";

/** 刷新页面时保留的注册进度 不保存身份证号与验证码 */
export type RegistrationDraft = {
  step: 0 | 1 | 2;
  phone: string;
  ticket: SmsTicket | null;
  agentIdentity: RegistrationIdentityDraft;
  realName: string;
  organizationName: string;
};

function draftStorage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function readTicket(value: unknown): SmsTicket | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.phone !== "string" ||
    !isFiniteNumber(item.sentAt) ||
    !isFiniteNumber(item.expiresAt) ||
    !isFiniteNumber(item.resendAt) ||
    !isFiniteNumber(item.attempts)
  )
    return null;
  return {
    phone: item.phone,
    sentAt: item.sentAt,
    expiresAt: item.expiresAt,
    resendAt: item.resendAt,
    attempts: item.attempts,
    ...(typeof item.mockCode === "string" ? { mockCode: item.mockCode } : {}),
  };
}

export function loadRegistrationDraft(): RegistrationDraft | null {
  try {
    const raw = draftStorage()?.getItem(REGISTRATION_DRAFT_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Record<string, unknown>;
    const step = saved.step === 1 || saved.step === 2 ? saved.step : 0;
    const identity =
      saved.agentIdentity === "legal_representative" ||
      saved.agentIdentity === "authorized_agent"
        ? saved.agentIdentity
        : "";
    return {
      step,
      phone: typeof saved.phone === "string" ? sanitizePhone(saved.phone) : "",
      ticket: readTicket(saved.ticket),
      agentIdentity: identity,
      realName: typeof saved.realName === "string" ? saved.realName : "",
      organizationName:
        typeof saved.organizationName === "string"
          ? saved.organizationName
          : "",
    };
  } catch {
    return null;
  }
}

export function saveRegistrationDraft(draft: RegistrationDraft): void {
  try {
    draftStorage()?.setItem(REGISTRATION_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* 浏览器禁止会话存储时仅保留当前页面状态 */
  }
}

export function clearRegistrationDraft(): void {
  try {
    draftStorage()?.removeItem(REGISTRATION_DRAFT_KEY);
  } catch {
    /* 忽略存储清理失败 */
  }
}
