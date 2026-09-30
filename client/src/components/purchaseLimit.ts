/**
 * 票务 · 按同一身份证严格限购
 * 与 Vue3 工程 src/utils/purchaseLimit.ts 保持同一口径，后端下单接口以此为校验规则：
 * 1. 限购按购票人身份证号统计，不按登录账号统计，同一身份证用多个账号购买合并计算；
 * 2. 统计范围为同一场次、同一票种；
 * 3. 已支付和退款处理中的票计入已持有，平台同意并完成退款的票释放额度；
 * 4. 身份证号按 GB 11643 规则校验出生日期与校验码，未通过不允许下单。
 */
export type PurchaseStatus = "paid" | "refund_pending" | "refunded";

export interface PurchaseRecord {
  orderNo: string;
  /** 漫圈 App 登录账号（脱敏手机号） */
  account: string;
  buyerName: string;
  idCard: string;
  /** 场次日期 YYYY-MM-DD */
  sessionDate: string;
  ticketName: string;
  quantity: number;
  status: PurchaseStatus;
  /** 关联退款申请，退款结果决定是否释放额度 */
  refundId?: string;
}

export interface RefundLink {
  id: string;
  status: "pending_review" | "refunded" | "rejected";
}

export interface LimitCheckInput {
  idCard: string;
  sessionDate: string;
  ticketName: string;
  quantity: number | string;
  limit: number;
}

export interface LimitCheckResult {
  /** 输入是否完整有效 */
  valid: boolean;
  allowed: boolean;
  message: string;
  held: number;
  accounts: string[];
  /** 本次之前还可再购张数 */
  available: number;
  /** 超出限购张数 */
  exceed: number;
}

const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const CHECK_CODES = "10X98765432";

export function normalizeIdCard(value: string) {
  return value.replace(/\s/g, "").toUpperCase();
}

/** 18 位居民身份证号：地址码 出生日期 顺序码 校验码 */
export function isValidIdCard(value: string) {
  const id = normalizeIdCard(value);
  if (!/^[1-9]\d{16}[\dX]$/.test(id)) return false;
  const y = Number(id.slice(6, 10));
  const m = Number(id.slice(10, 12));
  const d = Number(id.slice(12, 14));
  const birth = new Date(Date.UTC(y, m - 1, d));
  if (
    y < 1900 ||
    birth.getUTCFullYear() !== y ||
    birth.getUTCMonth() !== m - 1 ||
    birth.getUTCDate() !== d
  )
    return false;
  const sum = WEIGHTS.reduce((acc, w, i) => acc + Number(id[i]) * w, 0);
  return CHECK_CODES[sum % 11] === id[17];
}

/** 650102********002X */
export function maskIdCard(value: string) {
  const id = normalizeIdCard(value);
  return id.length < 10 ? id : `${id.slice(0, 6)}********${id.slice(-4)}`;
}

/** 按退款结果得到购票记录的实际状态 */
export function resolvePurchaseStatus(
  records: PurchaseRecord[],
  refunds: RefundLink[]
): PurchaseRecord[] {
  return records.map(record => {
    if (!record.refundId) return record;
    const refund = refunds.find(item => item.id === record.refundId);
    if (!refund) return record;
    const status: PurchaseStatus =
      refund.status === "refunded"
        ? "refunded"
        : refund.status === "pending_review"
          ? "refund_pending"
          : "paid";
    return { ...record, status };
  });
}

/** 同一身份证在同一场次同一票种的已持有张数与涉及账号 */
export function heldByIdCard(
  records: PurchaseRecord[],
  idCard: string,
  sessionDate: string,
  ticketName: string
) {
  const id = normalizeIdCard(idCard);
  const related = records.filter(
    record =>
      normalizeIdCard(record.idCard) === id &&
      record.sessionDate === sessionDate &&
      record.ticketName === ticketName &&
      record.status !== "refunded"
  );
  const accounts = Array.from(new Set(related.map(record => record.account)));
  const held = related.reduce((sum, record) => sum + record.quantity, 0);
  return { held, accounts, records: related };
}

export function checkPurchaseLimit(
  records: PurchaseRecord[],
  input: LimitCheckInput
): LimitCheckResult {
  const empty = {
    valid: false,
    allowed: false,
    held: 0,
    accounts: [] as string[],
    available: 0,
    exceed: 0,
  };
  if (!normalizeIdCard(input.idCard))
    return { ...empty, message: "请输入购票人身份证号" };
  if (!isValidIdCard(input.idCard))
    return { ...empty, message: "身份证号校验未通过 请核对后重新输入" };
  if (!input.sessionDate || !input.ticketName)
    return { ...empty, message: "请选择场次和票种" };
  const quantity = Number(input.quantity);
  if (!Number.isInteger(quantity) || quantity < 1)
    return { ...empty, message: "购买张数需为不小于 1 的整数" };
  const { held, accounts } = heldByIdCard(
    records,
    input.idCard,
    input.sessionDate,
    input.ticketName
  );
  const available = Math.max(input.limit - held, 0);
  const exceed = Math.max(held + quantity - input.limit, 0);
  const allowed = exceed === 0;
  const accountNote =
    accounts.length > 1 ? `已通过 ${accounts.length} 个账号购买` : "";
  const message = allowed
    ? `可以下单 本次后该身份证共持有 ${held + quantity} 张`
    : held >= input.limit
      ? `超出限购 该身份证${accountNote || "已"}持有 ${held} 张`
      : `超出限购 该身份证还可再购 ${available} 张`;
  return {
    valid: true,
    allowed,
    message,
    held,
    accounts,
    available,
    exceed,
  };
}
