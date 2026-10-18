export type ScopedRole = "platform" | "organizer" | "culture";

/**
 * UI visibility is an ID allow-list, never a display-name comparison. Server-side
 * authorization remains authoritative; this only avoids presenting unauthorized
 * activity records in the prototype workspace.
 */
export const AUTHORIZED_EVENT_IDS: Record<ScopedRole, readonly string[]> = {
  platform: [
    "EVT-2026-0628",
    "EVT-2026-0720",
    "EVT-2026-0731",
    "EVT-2026-0808",
  ],
  organizer: ["EVT-2026-0628"],
  culture: ["EVT-2026-0628", "EVT-2026-0720", "EVT-2026-0731", "EVT-2026-0808"],
};

export function visibleEventsForRole<T extends { id: string }>(
  role: ScopedRole,
  events: readonly T[]
): T[] {
  const allowed = new Set(AUTHORIZED_EVENT_IDS[role]);
  return events.filter(event => allowed.has(event.id));
}

export type RefundStatusPresentation = {
  label: string;
  tone: string;
  terminal: boolean;
  freezesTicket: boolean;
};

const REFUND_STATUS: Record<string, RefundStatusPresentation> = {
  pending_review: {
    label: "待平台审批",
    tone: "bg-amber-50 text-amber-700",
    terminal: false,
    freezesTicket: true,
  },
  submitting: {
    label: "退款提交中",
    tone: "bg-brand-50 text-brand-700",
    terminal: false,
    freezesTicket: true,
  },
  processing: {
    label: "已同意退款 退款处理中",
    tone: "bg-brand-50 text-brand-700",
    terminal: false,
    freezesTicket: true,
  },
  refunded: {
    label: "退款已到账",
    tone: "bg-emerald-50 text-emerald-700",
    terminal: true,
    freezesTicket: false,
  },
  rejected: {
    label: "已驳回",
    tone: "bg-slate-100 text-slate-700",
    terminal: true,
    freezesTicket: false,
  },
  failed: {
    label: "退款失败 待渠道核对",
    tone: "bg-rose-50 text-rose-700",
    terminal: false,
    freezesTicket: true,
  },
  unknown: {
    label: "退款结果待核对",
    tone: "bg-slate-100 text-slate-700",
    terminal: false,
    freezesTicket: true,
  },
  appeal_pending: {
    label: "退款申诉处理中",
    tone: "bg-amber-50 text-amber-700",
    terminal: false,
    freezesTicket: true,
  },
  appeal_approved: {
    label: "申诉已通过 等待退款渠道结果",
    tone: "bg-brand-50 text-brand-700",
    terminal: false,
    freezesTicket: true,
  },
  appeal_rejected: {
    label: "退款申诉已驳回",
    tone: "bg-slate-100 text-slate-700",
    terminal: true,
    freezesTicket: true,
  },
};

export function refundStatusPresentation(
  status: string | undefined
): RefundStatusPresentation {
  return (
    REFUND_STATUS[status ?? ""] ?? {
      label: "退款结果待核对",
      tone: "bg-slate-100 text-slate-700",
      terminal: false,
      freezesTicket: true,
    }
  );
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  return value && typeof value === "object"
    ? (value as UnknownRecord)
    : undefined;
}

function firstString(...values: unknown[]): string | undefined {
  return values.find(
    value => typeof value === "string" && value.trim().length > 0
  ) as string | undefined;
}

function firstBoolean(...values: unknown[]): boolean | undefined {
  return values.find(value => typeof value === "boolean") as
    | boolean
    | undefined;
}

function firstAmountCents(...values: unknown[]): number | undefined {
  return values.find(
    value => typeof value === "number" && Number.isInteger(value) && value >= 0
  ) as number | undefined;
}

export type RefundRuleCheck = {
  label: string;
  detail: string;
  passed: boolean;
};

/**
 * A refund decision may use only an order-time frozen rule snapshot. Legacy
 * records without one remain visible but must be manually reconciled; the UI
 * must not invent a 24-hour rule, a fee, or a refund amount.
 */
export function refundRuleChecks(record: unknown): RefundRuleCheck[] {
  const item = asRecord(record) ?? {};
  const rule =
    asRecord(item.frozenRefundRule) ??
    asRecord(item.refundRule) ??
    asRecord(item.ruleSnapshot) ??
    asRecord(item.policy);
  const ruleVersion = firstString(
    rule?.ruleVersion,
    rule?.version,
    item.frozenRuleVersion,
    item.ruleVersion
  );
  const amountCents = firstAmountCents(
    rule?.refundAmountCents,
    rule?.amountCents,
    item.refundAmountCents,
    item.amountCents
  );
  const eligible = firstBoolean(
    rule?.eligible,
    rule?.refundable,
    item.refundEligible,
    item.eligible
  );
  const ticketUnused = firstBoolean(
    rule?.ticketUnused,
    rule?.unused,
    item.ticketUnused,
    item.unused
  );

  return [
    {
      label: "冻结规则版本与退款金额",
      detail:
        ruleVersion && amountCents !== undefined
          ? `规则 ${ruleVersion} · 冻结金额 ¥${(amountCents / 100).toFixed(2)}`
          : "订单未提供冻结规则版本或退款金额，需渠道/订单侧核对",
      passed: Boolean(ruleVersion) && amountCents !== undefined,
    },
    {
      label: "订单时点退款资格",
      detail:
        eligible === true
          ? "已按订单冻结规则校验可退"
          : eligible === false
            ? "订单冻结规则判定不可退"
            : "未返回订单时点退款资格，不能同意",
      passed: eligible === true,
    },
    {
      label: "电子票使用状态",
      detail:
        ticketUnused === true
          ? "电子票未使用"
          : ticketUnused === false
            ? "电子票已使用或已失效"
            : "票使用状态待核对，不能同意",
      passed: ticketUnused === true,
    },
  ];
}

export function canApproveRefund(record: unknown): boolean {
  const item = asRecord(record) ?? {};
  return (
    item.status === "pending_review" &&
    refundRuleChecks(record).every(check => check.passed)
  );
}
