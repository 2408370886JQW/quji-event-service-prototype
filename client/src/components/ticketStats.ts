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
