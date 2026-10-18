import type { RefundStatus } from "./refundData";
import { normalizeEventId, PRIMARY_EVENT_ID } from "./eventScope";

/** Identity-based purchase limits. Client-side logic only; a server must repeat it. */
export type PurchaseStatus =
  | "paid"
  | "refund_pending"
  | "refunded"
  | "unpaid"
  | "payment_pending"
  | "payment_unknown"
  | "payment_failed"
  | "closed";

export interface PurchaseRecord {
  eventId?: string;
  orderNo: string;
  account: string;
  buyerName: string;
  idCard: string;
  sessionDate: string;
  ticketName: string;
  quantity: number;
  status: PurchaseStatus;
  /** Legacy whole-order refund pointer. New partial refunds must use ticketId/ticketIds. */
  refundId?: string;
  ticketId?: string;
  ticketIds?: string[];
  /** Authoritatively refunded ticket IDs; retained so duplicate callbacks are idempotent. */
  refundedTicketIds?: string[];
}

export interface RefundLink {
  id: string;
  status: RefundStatus | string;
  /** Individual affected ticket. No order-level inference is permitted. */
  ticketId?: string;
  /** Only a verified channel result can release quota/inventory. */
  channelConfirmedAt?: string;
}

export interface LimitCheckInput {
  eventId?: string;
  idCard: string;
  sessionDate: string;
  ticketName: string;
  quantity: number | string;
  limit: number;
}

export interface LimitCheckResult {
  valid: boolean;
  allowed: boolean;
  message: string;
  held: number;
  accounts: string[];
  available: number;
  exceed: number;
}

const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const CHECK_CODES = "10X98765432";

export function normalizeIdCard(value: string) {
  return value.replace(/\s/g, "").toUpperCase();
}

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

export function maskIdCard(value: string) {
  const id = normalizeIdCard(value);
  return id.length < 10 ? id : `${id.slice(0, 6)}********${id.slice(-4)}`;
}

const holdsQuota = (status: PurchaseStatus) =>
  !["unpaid", "payment_failed", "closed", "refunded"].includes(status);

const scopedRecord = (record: PurchaseRecord, eventId?: string) => {
  const scope = normalizeEventId(eventId);
  return record.eventId ? record.eventId === scope : scope === PRIMARY_EVENT_ID;
};

/**
 * Resolves refund outcome without optimistic recovery. A missing/unknown refund
 * record remains frozen; only an authoritative `refunded` outcome releases it.
 */
export function resolvePurchaseStatus(
  records: PurchaseRecord[],
  refunds: RefundLink[],
  eventId?: string
): PurchaseRecord[] {
  const scope = normalizeEventId(eventId);
  return records
    .filter(record => scopedRecord(record, scope))
    .map(record => {
      const ticketIds =
        record.ticketIds ?? (record.ticketId ? [record.ticketId] : []);
      const linked = ticketIds.length
        ? refunds.filter(
            refund => !!refund.ticketId && ticketIds.includes(refund.ticketId)
          )
        : [];
      // A legacy refund pointer without a ticketId must remain frozen; it must
      // never be expanded to sibling tickets in the same order.
      if (!ticketIds.length && record.refundId)
        return { ...record, status: "refund_pending" };
      if (!linked.length)
        return record.refundId
          ? { ...record, status: "refund_pending" }
          : record;
      if (
        linked.some(
          refund =>
            refund.status !== "rejected" &&
            !(
              refund.status === "refunded" &&
              !!refund.ticketId &&
              !!refund.channelConfirmedAt &&
              Number.isFinite(Date.parse(refund.channelConfirmedAt))
            )
        )
      )
        return { ...record, status: "refund_pending" };

      const completed = new Set(
        linked
          .filter(
            refund =>
              refund.status === "refunded" &&
              !!refund.ticketId &&
              !!refund.channelConfirmedAt
          )
          .map(refund => refund.ticketId!)
      );
      const released = new Set([
        ...(record.refundedTicketIds ?? []).filter(id =>
          ticketIds.includes(id)
        ),
        ...Array.from(completed),
      ]);
      if (!released.size)
        return {
          ...record,
          status: record.status === "refund_pending" ? "paid" : record.status,
        };
      if (released.size >= ticketIds.length)
        return {
          ...record,
          status: "refunded",
          refundedTicketIds: Array.from(released),
        };
      return {
        ...record,
        status: "paid",
        refundedTicketIds: Array.from(released),
      };
    });
}

export function heldByIdCard(
  records: PurchaseRecord[],
  idCard: string,
  sessionDate: string,
  ticketName: string,
  eventId?: string
) {
  const id = normalizeIdCard(idCard);
  const related = records.filter(
    record =>
      scopedRecord(record, eventId) &&
      normalizeIdCard(record.idCard) === id &&
      record.sessionDate === sessionDate &&
      record.ticketName === ticketName &&
      holdsQuota(record.status)
  );
  const accounts = Array.from(new Set(related.map(record => record.account)));
  const held = related.reduce(
    (sum, record) =>
      sum +
      Math.max(record.quantity - (record.refundedTicketIds?.length ?? 0), 0),
    0
  );
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
    input.ticketName,
    input.eventId
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
  return { valid: true, allowed, message, held, accounts, available, exceed };
}
