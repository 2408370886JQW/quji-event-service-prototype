import { normalizeEventId, PRIMARY_EVENT_ID } from "./eventScope";
import { isConfirmedRefund, type RefundStatus } from "./refundData";

/** Ticket statistics for the frontend prototype; production reconciliation remains server-owned. */
export type RefundState = RefundStatus | string;

export interface TicketStockSource {
  name: string;
  price: number;
  inventory: number;
  sold: number;
}

export interface RefundSource {
  eventId?: string;
  ticketId?: string;
  ticketName: string;
  status: RefundState;
  amount: number;
  quantity?: number;
  sessionDate?: string;
  ticketCode?: string;
  /** Authority evidence from the payment/refund channel; missing values fail closed. */
  channelConfirmedAt?: string;
}

export interface TicketStockRow<T extends TicketStockSource> {
  ticket: T;
  sold: number;
  refunded: number;
  refundedAmount: number;
  /** Pending includes all non-final, unknown and appeal states, which keep stock frozen. */
  pending: number;
  remaining: number;
  soldPercent: number;
}

const completedRefund = isConfirmedRefund;
const rejectedRefund = (status: RefundState) => status === "rejected";
const frozenRefund = (refund: RefundSource) =>
  !completedRefund(refund) && !rejectedRefund(refund.status);

export function buildTicketStock<T extends TicketStockSource>(
  tickets: T[],
  refunds: RefundSource[]
): TicketStockRow<T>[] {
  return tickets.map(ticket => {
    const related = refunds.filter(item => item.ticketName === ticket.name);
    const settled = new Map<string, RefundSource>();
    for (const item of related.filter(completedRefund))
      settled.set(
        `${item.eventId ?? PRIMARY_EVENT_ID}:${item.ticketId || item.ticketCode}`,
        item
      );
    const refundedItems = Array.from(settled.values());
    const refunded = refundedItems.length;
    const pending = related
      .filter(
        item =>
          frozenRefund(item) &&
          !settled.has(
            `${item.eventId ?? PRIMARY_EVENT_ID}:${item.ticketId || item.ticketCode}`
          )
      )
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
export const ALL_SESSIONS = "all";

export interface StockSession<T extends TicketStockSource> {
  /** Optional for legacy primary fixtures; scoped stores must not borrow these sessions. */
  eventId?: string;
  date: string;
  tickets: T[];
}

export function refundSessionDate(refund: RefundSource) {
  if (refund.sessionDate) return refund.sessionDate;
  const match = /QT-(\d{4})(\d{2})(\d{2})-/.exec(refund.ticketCode ?? "");
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

export function filterRefundsByEvent<R extends RefundSource>(
  refunds: R[],
  eventId?: string
) {
  const scope = normalizeEventId(eventId);
  return refunds.filter(refund =>
    refund.eventId ? refund.eventId === scope : scope === PRIMARY_EVENT_ID
  );
}

export function filterRefundsBySession<R extends RefundSource>(
  refunds: R[],
  date: string
) {
  return date === ALL_SESSIONS
    ? refunds
    : refunds.filter(item => refundSessionDate(item) === date);
}

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

/** Scoped callers pass their scoped sessions and eventId; legacy samples only resolve to primary. */
export function buildSessionStock<T extends TicketStockSource>(
  sessions: StockSession<T>[],
  refunds: RefundSource[],
  date: string,
  eventId?: string
) {
  const scope = normalizeEventId(eventId);
  const scopedSessions = sessions.filter(session =>
    session.eventId ? session.eventId === scope : scope === PRIMARY_EVENT_ID
  );
  const tickets =
    date === ALL_SESSIONS
      ? mergeSessionTickets(scopedSessions)
      : (scopedSessions.find(session => session.date === date)?.tickets ?? []);
  return buildTicketStock(
    tickets,
    filterRefundsBySession(filterRefundsByEvent(refunds, scope), date)
  );
}
