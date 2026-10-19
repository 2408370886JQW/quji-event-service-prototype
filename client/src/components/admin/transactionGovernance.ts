import { isApiDataMode, requestApi } from "@/lib/api";
import { isRefundFrozen } from "../refundData";

export function transactionStatusTone(
  status?: string
): "success" | "danger" | "warning" | "neutral" {
  const value = (status ?? "").trim().toLowerCase();
  if (
    ["unpaid", "not_paid"].includes(value) ||
    /(^|_)(unknown|pending|processing|appeal)(_|$)/.test(value)
  )
    return "warning";
  if (
    [
      "refunded",
      "paid",
      "issued",
      "used",
      "succeeded",
      "published",
      "已发布",
      "已支付",
      "已退款",
    ].includes(value)
  )
    return "success";
  if (
    [
      "failed",
      "rejected",
      "closed",
      "refund_failed",
      "payment_failed",
    ].includes(value)
  )
    return "danger";
  return "neutral";
}

export type GovernanceRole = "platform" | "organizer" | "culture";
export type PolicyStatus = "draft" | "published";
export type AppealStatus =
  | "appeal_pending"
  | "appeal_approved"
  | "appeal_rejected"
  | "processing"
  | "refunded"
  | "rejected"
  | "failed"
  | "unknown";

export type TicketPolicy = {
  id: string;
  activityId: string;
  version: string;
  title: string;
  purchaseNotice: string;
  refundCondition: string;
  refundFeePercent: number;
  effectiveAt: string;
  requiresFinalEligibility: boolean;
  status: PolicyStatus;
  publishedAt?: string;
  updatedAt: string;
};

export type PolicyValidationErrors = Partial<
  Record<
    | "title"
    | "purchaseNotice"
    | "refundCondition"
    | "refundFeePercent"
    | "effectiveAt"
    | "version"
    | "requiresFinalEligibility",
    string
  >
>;

export type TimelineEntry = {
  id: string;
  occurredAt: string;
  label: string;
  detail?: string;
  actor?: string;
};

export type OrderTicket = {
  ticketId: string;
  attendeeLabel?: string;
  ticketStatus: string;
  amountCents?: number;
  feeCents?: number;
  refundStatus?: string;
  frozenPolicyVersion?: string;
  eligibilityStatus?: string;
  requiresFinalEligibility?: boolean;
};

export type OrderSummary = {
  orderId: string;
  activityId: string;
  sessionDate?: string;
  orderStatus: string;
  paymentStatus: string;
  issuanceStatus?: string;
  amountCents?: number;
  currency?: string;
  createdAt?: string;
  idempotencyKey?: string;
  ticketCount?: number;
};

export type OrderDetail = OrderSummary & {
  inventoryReservationStatus?: string;
  paymentChannelOrderId?: string;
  tickets: OrderTicket[];
  policySnapshot?: {
    version?: string;
    confirmedAt?: string;
    hash?: string;
  };
  eligibilitySnapshot?: {
    status?: string;
    ruleVersion?: string;
    materialVersion?: string;
    validUntil?: string;
    reason?: string;
  };
  timeline: TimelineEntry[];
};

export type RefundAppeal = {
  id: string;
  activityId: string;
  refundRequestId: string;
  ticketId: string;
  status: AppealStatus;
  amountCents?: number;
  policyVersion?: string;
  frozenEligible?: boolean;
  frozenTicketUnused?: boolean;
  description?: string;
  requestedAt?: string;
  channelRefundId?: string;
  audit: TimelineEntry[];
};

export type CancellationImpactTicket = {
  ticketId: string;
  orderId?: string;
  amountCents?: number;
  frozenPolicyVersion?: string;
  channelStatus: string;
  updatedAt?: string;
};

export type CancellationImpactBatch = {
  batchId: string;
  activityId: string;
  reason: string;
  status: string;
  createdAt?: string;
  tickets: CancellationImpactTicket[];
};

export type GovernanceSnapshot = {
  source: "api" | "demo";
  policies: TicketPolicy[];
  orders: OrderSummary[];
  appeals: RefundAppeal[];
  cancellationBatches: CancellationImpactBatch[];
};

export type GovernanceApi = {
  listPolicies(activityId: string): Promise<TicketPolicy[]>;
  savePolicy(
    activityId: string,
    policy: TicketPolicy,
    expectedVersion?: string
  ): Promise<TicketPolicy>;
  publishPolicy(
    activityId: string,
    policyId: string,
    expectedVersion: string
  ): Promise<TicketPolicy>;
  listOrders(activityId: string): Promise<OrderSummary[]>;
  getOrder(activityId: string, orderId: string): Promise<OrderDetail>;
  refreshChannel(activityId: string, orderId: string): Promise<OrderDetail>;
  registerIssue(
    activityId: string,
    orderId: string,
    payload: { reason: string }
  ): Promise<{ id: string }>;
  listAppeals(activityId: string): Promise<RefundAppeal[]>;
  decideAppeal(
    activityId: string,
    appealId: string,
    payload: { action: AppealAction; reason?: string }
  ): Promise<RefundAppeal>;
  listCancellationBatches(
    activityId: string
  ): Promise<CancellationImpactBatch[]>;
};

type Request = <T>(path: string, init?: RequestInit) => Promise<T>;
type ItemsResponse<T> = { items: T[] };

function route(activityId: string, suffix: string) {
  return `/activities/${encodeURIComponent(activityId)}/${suffix}`;
}

function json(init: RequestInit): RequestInit {
  return {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  };
}

/** Adapter only: API mode never substitutes local records if any request fails. */
export function createGovernanceApi(
  request: Request = requestApi
): GovernanceApi {
  return {
    async listPolicies(activityId) {
      return (
        await request<ItemsResponse<TicketPolicy>>(
          route(activityId, "ticket-policies")
        )
      ).items;
    },
    async savePolicy(activityId, policy, expectedVersion) {
      const result = await request<TicketPolicy>(
        route(activityId, `ticket-policies/${encodeURIComponent(policy.id)}`),
        json({
          method: "PUT",
          body: JSON.stringify({ policy, expectedVersion }),
        })
      );
      return result;
    },
    async publishPolicy(activityId, policyId, expectedVersion) {
      return request<TicketPolicy>(
        route(
          activityId,
          `ticket-policies/${encodeURIComponent(policyId)}/publish`
        ),
        json({ method: "POST", body: JSON.stringify({ expectedVersion }) })
      );
    },
    async listOrders(activityId) {
      return (
        await request<ItemsResponse<OrderSummary>>(route(activityId, "orders"))
      ).items;
    },
    getOrder(activityId, orderId) {
      return request<OrderDetail>(
        route(activityId, `orders/${encodeURIComponent(orderId)}`)
      );
    },
    refreshChannel(activityId, orderId) {
      return request<OrderDetail>(
        route(
          activityId,
          `orders/${encodeURIComponent(orderId)}/channel-refresh`
        ),
        json({ method: "POST" })
      );
    },
    registerIssue(activityId, orderId, payload) {
      return request<{ id: string }>(
        route(
          activityId,
          `orders/${encodeURIComponent(orderId)}/reconciliation-issues`
        ),
        json({ method: "POST", body: JSON.stringify(payload) })
      );
    },
    async listAppeals(activityId) {
      return (
        await request<ItemsResponse<RefundAppeal>>(
          route(activityId, "refund-appeals")
        )
      ).items;
    },
    decideAppeal(activityId, appealId, payload) {
      return request<RefundAppeal>(
        route(
          activityId,
          `refund-appeals/${encodeURIComponent(appealId)}/decisions`
        ),
        json({ method: "POST", body: JSON.stringify(payload) })
      );
    },
    async listCancellationBatches(activityId) {
      return (
        await request<ItemsResponse<CancellationImpactBatch>>(
          route(activityId, "cancellation-refund-batches")
        )
      ).items;
    },
  };
}

export function canonicalActivityId(activityId: string) {
  return activityId.trim().toUpperCase();
}

export function assertActivityId(activityId: string) {
  if (!canonicalActivityId(activityId))
    throw new Error("缺少活动标识，不能加载交易管理数据");
}

/** A server response from a different activity is never rendered or retained. */
export function assertResourceScope<T extends { activityId: string }>(
  activityId: string,
  resource: T
): T {
  assertActivityId(activityId);
  if (
    canonicalActivityId(resource.activityId) !== canonicalActivityId(activityId)
  ) {
    throw new Error("接口返回了其他活动的数据，已拒绝展示");
  }
  return resource;
}

export function assertCollectionScope<T extends { activityId: string }>(
  activityId: string,
  resources: T[]
): T[] {
  return resources.map(resource => assertResourceScope(activityId, resource));
}

export function validatePolicy(
  policy: Pick<
    TicketPolicy,
    | "title"
    | "purchaseNotice"
    | "refundCondition"
    | "refundFeePercent"
    | "effectiveAt"
    | "version"
    | "requiresFinalEligibility"
  >
): PolicyValidationErrors {
  const errors: PolicyValidationErrors = {};
  if (!policy.title.trim()) errors.title = "请填写政策名称";
  else if (policy.title.trim().length > 60)
    errors.title = "政策名称最多 60 个字";
  if (!policy.purchaseNotice.trim()) errors.purchaseNotice = "请填写购票须知";
  if (!policy.refundCondition.trim()) errors.refundCondition = "请填写退票条件";
  if (
    !Number.isFinite(policy.refundFeePercent) ||
    policy.refundFeePercent < 0 ||
    policy.refundFeePercent > 100
  ) {
    errors.refundFeePercent = "退款手续费需为 0 至 100 的数字";
  }
  if (!policy.effectiveAt || Number.isNaN(Date.parse(policy.effectiveAt))) {
    errors.effectiveAt = "请选择有效的生效时间";
  }
  if (!policy.version.trim()) errors.version = "请填写政策版本";
  if (policy.requiresFinalEligibility !== true)
    errors.requiresFinalEligibility = "购票前必须取得本活动最终有效资格";
  return errors;
}

export function assertPolicyPublishable(policy: TicketPolicy) {
  const errors = validatePolicy(policy);
  if (Object.keys(errors).length)
    throw new Error(Object.values(errors)[0] ?? "政策字段不完整");
  if (!policy.activityId) throw new Error("政策缺少活动范围");
}

export function assertExpectedVersion(
  currentVersion: string | undefined,
  expectedVersion: string | undefined
) {
  if (currentVersion && expectedVersion && currentVersion !== expectedVersion) {
    throw new Error("政策版本已更新，请刷新后再提交");
  }
}

export function canEditPolicy(role: GovernanceRole) {
  return role === "platform" || role === "organizer";
}

export function canHandleMoney(role: GovernanceRole) {
  return role === "platform";
}

export function canReadGovernance(role: GovernanceRole) {
  return role !== "culture";
}

/** Preserve the shared refund invariant: processing/unknown/appeal states remain frozen. */
export function isGovernanceTicketFrozen(status: string | undefined) {
  return isRefundFrozen(status);
}

export function hasFrozenRefundInputs(appeal: RefundAppeal) {
  return Boolean(
    appeal.ticketId &&
      appeal.policyVersion?.trim() &&
      Number.isSafeInteger(appeal.amountCents) &&
      (appeal.amountCents ?? -1) >= 0 &&
      appeal.frozenEligible === true &&
      appeal.frozenTicketUnused === true
  );
}

export type AppealAction = "request_more" | "approve" | "reject";

export function assertAppealAction(
  appeal: RefundAppeal,
  role: GovernanceRole,
  action: AppealAction,
  reason?: string
) {
  if (!canHandleMoney(role)) throw new Error("仅平台运营人员可以办理退款申诉");
  if (appeal.status === "processing" || appeal.status === "refunded") {
    throw new Error("该退款已进入处理中或已到账，不能重复审批");
  }
  if (appeal.status !== "appeal_pending")
    throw new Error("当前申诉不在待办理状态");
  if (action === "approve" && !hasFrozenRefundInputs(appeal)) {
    throw new Error("缺少冻结金额、规则或电子票状态，不能通过申诉");
  }
  if (action === "reject" && !reason?.trim()) throw new Error("请填写驳回原因");
  if (action === "request_more" && !reason?.trim())
    throw new Error("请填写需补充的材料或说明");
}

/** Demo-only transition: it intentionally does not create a channel refund or a settlement receipt. */
export function transitionDemoAppeal(
  appeal: RefundAppeal,
  role: GovernanceRole,
  action: AppealAction,
  reason: string,
  occurredAt: string
): RefundAppeal {
  assertAppealAction(appeal, role, action, reason);
  const label =
    action === "approve"
      ? "申诉演示通过，等待真实渠道处理"
      : action === "reject"
        ? "申诉演示驳回"
        : "演示要求补充材料";
  return {
    ...appeal,
    status:
      action === "approve"
        ? "processing"
        : action === "reject"
          ? "appeal_rejected"
          : "appeal_pending",
    audit: [
      ...appeal.audit,
      {
        id: `demo-${appeal.id}-${Date.now()}`,
        occurredAt,
        label,
        detail: reason,
        actor: "本地演示",
      },
    ],
  };
}

const POLICY_KEY = "quji_transaction_governance_policies_v1";
const APPEAL_KEY = "quji_transaction_governance_appeals_v1";
const memory = new Map<string, string>();

function storageRead(key: string): string | null {
  try {
    if (typeof window !== "undefined") return window.localStorage.getItem(key);
  } catch {
    /* Local demo data may be unavailable; the UI will remain empty. */
  }
  return memory.get(key) ?? null;
}
function storageWrite(key: string, value: string) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      throw new Error("浏览器存储写入失败，配置未保存");
    }
    return;
  }
  // Memory is for SSR/unit tests only; never a substitute for a successful browser write.
  memory.set(key, value);
}
function readScoped<T extends { activityId: string }>(
  key: string,
  activityId: string
): T[] {
  const raw = storageRead(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is T =>
        Boolean(
          item &&
            typeof item === "object" &&
            typeof (item as T).activityId === "string"
        ) &&
        canonicalActivityId((item as T).activityId) ===
          canonicalActivityId(activityId)
    );
  } catch {
    return [];
  }
}

function writeScoped<T extends { activityId: string }>(
  key: string,
  activityId: string,
  records: T[]
) {
  assertCollectionScope(activityId, records);
  const kept = readAll<T>(key).filter(
    record =>
      canonicalActivityId(record.activityId) !== canonicalActivityId(activityId)
  );
  storageWrite(key, JSON.stringify([...kept, ...records]));
}

function readAll<T extends { activityId: string }>(key: string): T[] {
  const raw = storageRead(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is T =>
          Boolean(
            item &&
              typeof item === "object" &&
              typeof (item as T).activityId === "string"
          )
        )
      : [];
  } catch {
    return [];
  }
}

export function createPolicyDraft(activityId: string): TicketPolicy {
  assertActivityId(activityId);
  const now = new Date().toISOString();
  return {
    id: `policy-${Date.now().toString(36)}`,
    activityId,
    version: "v1",
    title: "",
    purchaseNotice: "",
    refundCondition: "",
    refundFeePercent: 0,
    effectiveAt: "",
    requiresFinalEligibility: true,
    status: "draft",
    updatedAt: now,
  };
}

export function loadDemoPolicies(activityId: string) {
  return readScoped<TicketPolicy>(POLICY_KEY, activityId);
}

export function saveDemoPolicy(activityId: string, policy: TicketPolicy) {
  assertResourceScope(activityId, policy);
  const next = { ...policy, updatedAt: new Date().toISOString() };
  const policies = loadDemoPolicies(activityId);
  const index = policies.findIndex(item => item.id === next.id);
  if (index >= 0) policies[index] = next;
  else policies.push(next);
  writeScoped(POLICY_KEY, activityId, policies);
  return next;
}

export function publishDemoPolicy(
  activityId: string,
  policy: TicketPolicy,
  expectedVersion?: string
) {
  const existing = loadDemoPolicies(activityId).find(
    item => item.id === policy.id
  );
  assertExpectedVersion(existing?.version, expectedVersion);
  assertPolicyPublishable(policy);
  const published: TicketPolicy = {
    ...policy,
    status: "published",
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return saveDemoPolicy(activityId, published);
}

export function loadDemoAppeals(activityId: string) {
  return readScoped<RefundAppeal>(APPEAL_KEY, activityId);
}

export function saveDemoAppeal(activityId: string, appeal: RefundAppeal) {
  assertResourceScope(activityId, appeal);
  const appeals = loadDemoAppeals(activityId);
  const index = appeals.findIndex(item => item.id === appeal.id);
  if (index >= 0) appeals[index] = appeal;
  else appeals.push(appeal);
  writeScoped(APPEAL_KEY, activityId, appeals);
  return appeal;
}

export async function loadApiGovernance(
  activityId: string,
  api: GovernanceApi
): Promise<GovernanceSnapshot> {
  assertActivityId(activityId);
  const [policies, orders, appeals, cancellationBatches] = await Promise.all([
    api.listPolicies(activityId),
    api.listOrders(activityId),
    api.listAppeals(activityId),
    api.listCancellationBatches(activityId),
  ]);
  return {
    source: "api",
    policies: assertCollectionScope(activityId, policies),
    orders: assertCollectionScope(activityId, orders),
    appeals: assertCollectionScope(activityId, appeals),
    cancellationBatches: assertCollectionScope(activityId, cancellationBatches),
  };
}

/** API errors deliberately propagate: there is no demo/local fallback in API mode. */
export async function loadTransactionGovernance(
  activityId: string,
  api = createGovernanceApi()
): Promise<GovernanceSnapshot> {
  if (isApiDataMode()) return loadApiGovernance(activityId, api);
  assertActivityId(activityId);
  return {
    source: "demo",
    policies: loadDemoPolicies(activityId),
    orders: [],
    appeals: loadDemoAppeals(activityId),
    cancellationBatches: [],
  };
}
