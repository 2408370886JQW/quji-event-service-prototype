import { useSyncExternalStore } from "react";
import { assertPrototypeWriteAllowed, isApiDataMode } from "../lib/api";
import {
  isRecordInEvent,
  normalizeEventId,
  PRIMARY_EVENT_ID,
  storageKeyForEvent,
} from "./eventScope";

/** 退款申请数据（漫圈 App 用户提交，平台运营人员审批）。前端存储仅为原型状态。 */
export type RefundStatus =
  | "pending_review"
  | "submitting"
  | "processing"
  | "refunded"
  | "rejected"
  | "failed"
  | "unknown"
  | "appeal_pending"
  | "appeal_approved"
  | "appeal_rejected";

export type FrozenRefundRule = {
  ruleVersion: string;
  refundAmountCents: number;
  eligible: boolean;
  ticketUnused: boolean;
};

export type RefundRecord = {
  id: string;
  /** Activity scope. Historic primary-key records without this field are primary only. */
  eventId: string;
  /** The individual ticket affected; partial refunds must identify this ID. */
  ticketId: string;
  requestNo: string;
  orderNo: string;
  buyerName: string;
  buyerPhone: string;
  ticketName: string;
  ticketCode: string;
  /** Amount in yuan in this prototype; a production API must use frozen cents. */
  amount: number;
  reason: string;
  detail: string;
  requestedAt: string;
  status: RefundStatus;
  /** Frozen at order time. Missing legacy rules must be reconciled, not approved. */
  frozenRefundRule?: FrozenRefundRule;
  /** Set only from a verified refund-channel result; never by a UI success control. */
  channelConfirmedAt?: string;
  processedBy?: string;
  processedAt?: string;
  comment?: string;
  logs: { action: string; actor: string; time: string; comment?: string }[];
};

export const REFUND_STORAGE_KEY = "quji_preview_refund_requests_v3";
export const REFUND_EVENT = "quji-refunds-changed";
const memoryRefunds = new Map<string, RefundRecord[]>();

export function isConfirmedRefund(record: {
  status: unknown;
  channelConfirmedAt?: string;
  ticketId?: string;
  ticketCode?: string;
  amount: number;
}): boolean {
  return (
    record.status === "refunded" &&
    !!record.channelConfirmedAt &&
    Number.isFinite(Date.parse(record.channelConfirmedAt)) &&
    !!(record.ticketId || record.ticketCode) &&
    Number.isFinite(record.amount) &&
    record.amount >= 0
  );
}

/** Only an authoritative payment-channel success may make a ticket refundable/released. */
export const isRefundCompleted = (status: unknown) => status === "refunded";
export const isRefundRejected = (status: unknown) => status === "rejected";
export const isRefundFrozen = (status: unknown) =>
  !isRefundCompleted(status) && !isRefundRejected(status);

export const DEFAULT_REFUNDS: RefundRecord[] = [
  {
    id: "refund-20260929-001",
    eventId: PRIMARY_EVENT_ID,
    ticketId: "QT-20260628-10316",
    requestNo: "TK202609290001",
    orderNo: "ORD1789301120316",
    buyerName: "马晓彤",
    buyerPhone: "138****9036",
    ticketName: "普通观众票",
    ticketCode: "QT-20260628-10316",
    amount: 88,
    reason: "重复购票",
    detail:
      "家人已经帮我购买同场次门票，本人购买的这张电子票尚未使用，申请原路退款。",
    requestedAt: "2026-09-29 16:42",
    status: "pending_review",
    logs: [
      {
        action: "用户提交退款申请",
        actor: "马晓彤 · 漫圈 App 用户",
        time: "2026-09-29 16:42",
        comment: "重复购票",
      },
    ],
  },
  {
    id: "refund-20260929-004",
    eventId: PRIMARY_EVENT_ID,
    ticketId: "QT-20260629-21958",
    requestNo: "TK202609290004",
    orderNo: "ORD1789301121958",
    buyerName: "帕提古丽·吐尔逊",
    buyerPhone: "159****2207",
    ticketName: "学生早鸟票",
    ticketCode: "QT-20260629-21958",
    amount: 58,
    reason: "活动时间冲突",
    detail: "学校临时安排考试，6月29日无法到场，电子票尚未使用。",
    requestedAt: "2026-09-29 09:30",
    status: "pending_review",
    logs: [
      {
        action: "用户提交退款申请",
        actor: "帕提古丽·吐尔逊 · 漫圈 App 用户",
        time: "2026-09-29 09:30",
        comment: "活动时间冲突",
      },
    ],
  },
  {
    id: "refund-20260928-002",
    eventId: PRIMARY_EVENT_ID,
    ticketId: "QT-20260629-20762",
    requestNo: "TK202609280002",
    orderNo: "ORD1789301120762",
    buyerName: "艾力江·买买提",
    buyerPhone: "186****5218",
    ticketName: "Coser 专属票",
    ticketCode: "QT-20260629-20762",
    amount: 68,
    reason: "活动时间冲突",
    detail: "临时有课程安排，无法按时参加活动。",
    requestedAt: "2026-09-28 13:20",
    status: "processing",
    processedBy: "周可",
    processedAt: "2026-09-28 13:38",
    comment: "已同意退款，退款处理中，等待原支付渠道确认",
    logs: [
      {
        action: "用户提交退款申请",
        actor: "艾力江·买买提 · 漫圈 App 用户",
        time: "2026-09-28 13:20",
      },
      {
        action: "平台同意退款",
        actor: "周可 · 平台运营人员",
        time: "2026-09-28 13:38",
        comment: "符合活动退票规则",
      },
      {
        action: "退款处理中",
        actor: "系统 · 票务系统",
        time: "2026-09-28 13:38",
        comment: "已提交原支付渠道，等待权威到账结果",
      },
    ],
  },
  {
    id: "refund-20260927-003",
    eventId: PRIMARY_EVENT_ID,
    ticketId: "QT-20260628-98175",
    requestNo: "TK202609270003",
    orderNo: "ORD1789301098175",
    buyerName: "赵宁",
    buyerPhone: "177****1182",
    ticketName: "学生早鸟票",
    ticketCode: "QT-20260628-98175",
    amount: 58,
    reason: "个人原因",
    detail: "临时无法到场。",
    requestedAt: "2026-09-27 19:05",
    status: "rejected",
    processedBy: "周可",
    processedAt: "2026-09-27 19:18",
    comment: "电子票已核验入场，当前订单不符合退款条件",
    logs: [
      {
        action: "用户提交退款申请",
        actor: "赵宁 · 漫圈 App 用户",
        time: "2026-09-27 19:05",
      },
      {
        action: "平台驳回退款申请",
        actor: "周可 · 平台运营人员",
        time: "2026-09-27 19:18",
        comment: "电子票已核验入场，当前订单不符合退款条件",
      },
    ],
  },
];

const EMPTY_REFUNDS: RefundRecord[] = [];
function defaultRefunds(eventId?: string) {
  if (isApiDataMode()) return EMPTY_REFUNDS;
  return normalizeEventId(eventId) === PRIMARY_EVENT_ID ? DEFAULT_REFUNDS : [];
}

function parseRefunds(raw: string | null, eventId?: string): RefundRecord[] {
  const scope = normalizeEventId(eventId);
  if (!raw) return defaultRefunds(scope);
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaultRefunds(scope);
    return parsed.filter(
      (item): item is RefundRecord =>
        !!item &&
        typeof item === "object" &&
        isRecordInEvent(item as RefundRecord, scope)
    );
  } catch {
    return defaultRefunds(scope);
  }
}

/** Legacy primary key remains intact; non-primary activities use explicit sibling keys. */
export function loadRefundRecords(eventId?: string) {
  const scope = normalizeEventId(eventId);
  if (isApiDataMode()) return EMPTY_REFUNDS;
  if (typeof window === "undefined")
    return memoryRefunds.get(scope) ?? defaultRefunds(scope);
  try {
    return parseRefunds(
      window.localStorage.getItem(
        storageKeyForEvent(REFUND_STORAGE_KEY, eventId)
      ),
      eventId
    );
  } catch {
    return defaultRefunds(eventId);
  }
}

const refundCache = new Map<
  string,
  { raw: string | null; list: RefundRecord[] }
>();
function refundSnapshot(eventId?: string) {
  const scope = normalizeEventId(eventId);
  if (isApiDataMode()) return EMPTY_REFUNDS;
  if (typeof window === "undefined") return defaultRefunds(scope);
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(
      storageKeyForEvent(REFUND_STORAGE_KEY, scope)
    );
  } catch {
    return defaultRefunds(scope);
  }
  const cached = refundCache.get(scope);
  if (cached?.raw === raw) return cached.list;
  const list = parseRefunds(raw, scope);
  refundCache.set(scope, { raw, list });
  return list;
}

export function saveRefundRecords(next: RefundRecord[], eventId?: string) {
  assertPrototypeWriteAllowed("保存退款状态");
  const scope = normalizeEventId(eventId);
  if (next.some(record => record.eventId && record.eventId !== scope))
    throw new Error("不能把其他活动的退款记录改绑到当前活动");
  const scoped = next.map(record => ({ ...record, eventId: scope }));
  memoryRefunds.set(scope, scoped);
  refundCache.delete(scope);
  try {
    window.localStorage.setItem(
      storageKeyForEvent(REFUND_STORAGE_KEY, scope),
      JSON.stringify(scoped)
    );
  } catch {
    /* Storage failure must not imply a refund succeeded. */
  }
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(REFUND_EVENT));
}

/** Approval is idempotent and deliberately never marks a refund as received. */
export function approveRefundForProcessing(
  records: RefundRecord[],
  id: string,
  actor: string,
  time: string
): RefundRecord[] {
  return records.map(record => {
    if (record.id !== id || record.status !== "pending_review") return record;
    const rule = record.frozenRefundRule;
    if (
      !rule ||
      !rule.ruleVersion ||
      !Number.isInteger(rule.refundAmountCents) ||
      rule.refundAmountCents < 0 ||
      !rule.eligible ||
      !rule.ticketUnused
    )
      throw new Error("缺少订单冻结退款规则、金额或未使用状态，不能同意退款");
    return {
      ...record,
      status: "processing",
      processedBy: actor,
      processedAt: time,
      comment: "已同意退款，退款处理中",
      logs: [
        ...record.logs,
        {
          action: "平台同意退款",
          actor,
          time,
          comment: "已同意退款，退款处理中",
        },
      ],
    };
  });
}

export function useRefundRecords(eventId?: string) {
  const scope = normalizeEventId(eventId);
  return useSyncExternalStore(
    listener => {
      window.addEventListener(REFUND_EVENT, listener);
      window.addEventListener("storage", listener);
      return () => {
        window.removeEventListener(REFUND_EVENT, listener);
        window.removeEventListener("storage", listener);
      };
    },
    () => refundSnapshot(scope),
    () => defaultRefunds(scope)
  );
}
