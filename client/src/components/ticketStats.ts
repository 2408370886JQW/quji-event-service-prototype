/**
 * 票务管理 · 按票种统计
 * 与 Vue3 工程 src/utils/ticketStats.ts 保持同一口径：
 * 已售为支付成功张数；已退款为平台同意并原路退款的张数；
 * 退款票回到库存，剩余 = 库存 - 已售 + 已退款。
 */
export type RefundState = "pending_review" | "refunded" | "rejected";

export interface TicketStockSource {
  name: string;
  price: number;
  inventory: number;
  sold: number;
}

export interface RefundSource {
  ticketName: string;
  status: RefundState;
  amount: number;
  quantity?: number;
  /** 场次日期 YYYY-MM-DD，缺省时从电子票号 QT-YYYYMMDD-xxxxx 读取 */
  sessionDate?: string;
  ticketCode?: string;
}

export interface TicketStockRow<T extends TicketStockSource> {
  ticket: T;
  sold: number;
  refunded: number;
  refundedAmount: number;
  pending: number;
  remaining: number;
  /** 0 - 100，按库存计算的净售出占比 */
  soldPercent: number;
}

export function buildTicketStock<T extends TicketStockSource>(
  tickets: T[],
  refunds: RefundSource[]
): TicketStockRow<T>[] {
  return tickets.map(ticket => {
    const related = refunds.filter(item => item.ticketName === ticket.name);
    const refundedItems = related.filter(item => item.status === "refunded");
    const refunded = refundedItems.reduce(
      (sum, item) => sum + (item.quantity ?? 1),
      0
    );
    const pending = related
      .filter(item => item.status === "pending_review")
      .reduce((sum, item) => sum + (item.quantity ?? 1), 0);
    const refundedAmount = refundedItems.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const remaining = Math.max(ticket.inventory - ticket.sold + refunded, 0);
    const net = Math.max(ticket.sold - refunded, 0);
    return {
      ticket,
      sold: ticket.sold,
      refunded,
      refundedAmount,
      pending,
      remaining,
      soldPercent: ticket.inventory
        ? Math.min(Math.round((net / ticket.inventory) * 1000) / 10, 100)
        : 0,
    };
  });
}

export function totalTicketStock<T extends TicketStockSource>(
  rows: TicketStockRow<T>[]
) {
  return rows.reduce(
    (sum, row) => ({
      inventory: sum.inventory + row.ticket.inventory,
      sold: sum.sold + row.sold,
      refunded: sum.refunded + row.refunded,
      refundedAmount: sum.refundedAmount + row.refundedAmount,
      pending: sum.pending + row.pending,
      remaining: sum.remaining + row.remaining,
    }),
    {
      inventory: 0,
      sold: 0,
      refunded: 0,
      refundedAmount: 0,
      pending: 0,
      remaining: 0,
    }
  );
}

export const formatCount = (value: number) => value.toLocaleString("zh-CN");

/* ---------- 按场次日期查看 ---------- */

export const ALL_SESSIONS = "all";

export interface StockSession<T extends TicketStockSource> {
  date: string;
  tickets: T[];
}

/** 退款对应的场次日期 */
export function refundSessionDate(refund: RefundSource) {
  if (refund.sessionDate) return refund.sessionDate;
  const match = /QT-(\d{4})(\d{2})(\d{2})-/.exec(refund.ticketCode ?? "");
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

export function filterRefundsBySession<R extends RefundSource>(
  refunds: R[],
  date: string
) {
  return date === ALL_SESSIONS
    ? refunds
    : refunds.filter(item => refundSessionDate(item) === date);
}

/** 全部场次时按票种名称合并库存与已售 */
export function mergeSessionTickets<T extends TicketStockSource>(
  sessions: StockSession<T>[]
): T[] {
  const merged: T[] = [];
  sessions.forEach(session =>
    session.tickets.forEach(ticket => {
      const index = merged.findIndex(item => item.name === ticket.name);
      if (index < 0) merged.push({ ...ticket });
      else
        merged[index] = {
          ...merged[index],
          inventory: merged[index].inventory + ticket.inventory,
          sold: merged[index].sold + ticket.sold,
        };
    })
  );
  return merged;
}

/** 某一场次或全部场次的按票种统计 */
export function buildSessionStock<T extends TicketStockSource>(
  sessions: StockSession<T>[],
  refunds: RefundSource[],
  date: string
) {
  const tickets =
    date === ALL_SESSIONS
      ? mergeSessionTickets(sessions)
      : (sessions.find(session => session.date === date)?.tickets ?? []);
  return buildTicketStock(tickets, filterRefundsBySession(refunds, date));
}
