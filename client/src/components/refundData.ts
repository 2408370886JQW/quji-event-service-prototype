import { useSyncExternalStore } from "react";
/** 退款申请数据（漫圈 App 用户提交 平台运营人员审批） */
export type RefundStatus = "pending_review" | "refunded" | "rejected";
export type RefundRecord = {
  id: string;
  requestNo: string;
  orderNo: string;
  buyerName: string;
  buyerPhone: string;
  ticketName: string;
  ticketCode: string;
  amount: number;
  reason: string;
  detail: string;
  requestedAt: string;
  status: RefundStatus;
  processedBy?: string;
  processedAt?: string;
  comment?: string;
  logs: { action: string; actor: string; time: string; comment?: string }[];
};

export const REFUND_STORAGE_KEY = "quji_preview_refund_requests_v3";
export const DEFAULT_REFUNDS: RefundRecord[] = [
  {
    id: "refund-20260929-001",
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
    status: "refunded",
    processedBy: "周可",
    processedAt: "2026-09-28 13:38",
    comment: "符合活动退票规则，同意原路退回",
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
        comment: "符合活动退票规则，同意原路退回",
      },
      {
        action: "退款已提交原支付渠道",
        actor: "系统 · 票务系统",
        time: "2026-09-28 13:38",
        comment: "预计 1—3 个工作日到账",
      },
    ],
  },
  {
    id: "refund-20260927-003",
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

export function loadRefundRecords() {
  if (typeof window === "undefined") return DEFAULT_REFUNDS;
  try {
    const saved = window.localStorage.getItem(REFUND_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as RefundRecord[]) : DEFAULT_REFUNDS;
  } catch {
    return DEFAULT_REFUNDS;
  }
}

/* 退款状态订阅：票务页审批后通知中心 现场核验与活动报告同步刷新 */
const REFUND_EVENT = "quji-refunds-changed";
let refundCache: { raw: string | null; list: RefundRecord[] } | null = null;
function refundSnapshot() {
  if (typeof window === "undefined") return DEFAULT_REFUNDS;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(REFUND_STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (refundCache && refundCache.raw === raw) return refundCache.list;
  let list = DEFAULT_REFUNDS;
  try {
    list = raw ? (JSON.parse(raw) as RefundRecord[]) : DEFAULT_REFUNDS;
  } catch {
    list = DEFAULT_REFUNDS;
  }
  refundCache = { raw, list };
  return list;
}
export function saveRefundRecords(next: RefundRecord[]) {
  try {
    window.localStorage.setItem(REFUND_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* 忽略存储失败 */
  }
  window.dispatchEvent(new Event(REFUND_EVENT));
}
export function useRefundRecords() {
  return useSyncExternalStore(
    listener => {
      window.addEventListener(REFUND_EVENT, listener);
      window.addEventListener("storage", listener);
      return () => {
        window.removeEventListener(REFUND_EVENT, listener);
        window.removeEventListener("storage", listener);
      };
    },
    refundSnapshot,
    () => DEFAULT_REFUNDS
  );
}
