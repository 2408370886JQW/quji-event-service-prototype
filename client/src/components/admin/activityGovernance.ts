export type ActivityGovernanceRole = "platform" | "organizer" | "culture";
export type GovernanceCommand =
  | "save"
  | "publish"
  | "withdraw"
  | "publishRule"
  | "end"
  | "cancel";
export type Visibility = "public" | "login";
export type PropPolicy = "declared_only" | "restricted" | "prohibited";
export type LifecycleState = "active" | "ended" | "cancelled";

export interface GovernanceAuditEntry {
  id: string;
  activityId: string;
  action: string;
  detail: string;
  actorRole: ActivityGovernanceRole;
  occurredAt: string;
  version: number;
}

export interface PublicationSettings {
  title: string;
  summary: string;
  coverUrl: string;
  visibility: Visibility;
  allowShare: boolean;
  visibleFields: string[];
  status: "draft" | "published" | "withdrawn";
  publishedAt?: string;
  withdrawnAt?: string;
  withdrawReason?: string;
}

export interface AdmissionRuleSettings {
  coserReviewRequired: boolean;
  ordinaryAttireAllowed: boolean;
  pledgeText: string;
  propPolicy: PropPolicy;
  propRestrictionNote: string;
  sessionScope: "all" | "selected";
  sessionIds: string[];
  validFrom: string;
  validUntil: string;
  ruleVersion: string;
  status: "draft" | "published";
  publishedAt?: string;
}

export interface LifecycleSettings {
  state: LifecycleState;
  reason: string;
  affectedSessions: string[];
  impactConfirmed: boolean;
  changedAt?: string;
}

export interface ActivityGovernanceConfig {
  schemaVersion: 1;
  activityId: string;
  /** Optimistic-concurrency version supplied to the real service on every write. */
  version: number;
  updatedAt: string;
  publication: PublicationSettings;
  admission: AdmissionRuleSettings;
  lifecycle: LifecycleSettings;
  audit: GovernanceAuditEntry[];
}

export interface EligibilityRecord {
  id: string;
  activityId: string;
  attendeeLabel?: string;
  kind: "coser" | "ordinary" | "unknown";
  status:
    | "valid"
    | "expiring"
    | "expired"
    | "revoked"
    | "rule_changed"
    | "unknown";
  ruleVersion?: string;
  validUntil?: string;
  revokedAt?: string;
  revocationReason?: string;
  changeNotice?: string;
  version?: number;
}

export interface AppealCase {
  id: string;
  activityId: string;
  submissionId?: string;
  status: "open" | "processing" | "resolved" | "unknown";
  updatedAt?: string;
}

export type GovernanceErrors = Partial<Record<string, string>>;

export class GovernanceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "VALIDATION"
      | "FORBIDDEN"
      | "VERSION_CONFLICT"
      | "ACTIVITY_SCOPE"
      | "ALREADY_CANCELLED"
      | "UNKNOWN_ELIGIBILITY"
      | "API_CONTRACT"
  ) {
    super(message);
    this.name = "GovernanceError";
  }
}

const STORAGE_PREFIX = "quji_activity_governance:v1:";
const URL_PATTERN = /^https?:\/\//i;

export function normalizeActivityId(activityId: string): string {
  const value = activityId.trim();
  if (!value)
    throw new GovernanceError(
      "活动 ID 缺失，拒绝读取或写入未限定范围的配置",
      "ACTIVITY_SCOPE"
    );
  return value;
}

export function isSameActivityId(left: string, right: string): boolean {
  return normalizeActivityId(left) === normalizeActivityId(right);
}

export function activityGovernanceStorageKey(activityId: string): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(normalizeActivityId(activityId))}`;
}

export function createActivityGovernance(
  activityId: string,
  now = new Date().toISOString()
): ActivityGovernanceConfig {
  const scopedId = normalizeActivityId(activityId);
  return {
    schemaVersion: 1,
    activityId: scopedId,
    version: 1,
    updatedAt: now,
    publication: {
      title: "",
      summary: "",
      coverUrl: "",
      visibility: "login",
      allowShare: false,
      visibleFields: ["title", "summary", "cover"],
      status: "draft",
    },
    admission: {
      coserReviewRequired: true,
      ordinaryAttireAllowed: false,
      pledgeText: "",
      propPolicy: "declared_only",
      propRestrictionNote: "",
      sessionScope: "all",
      sessionIds: [],
      validFrom: "",
      validUntil: "",
      ruleVersion: "RULE-1",
      status: "draft",
    },
    lifecycle: {
      state: "active",
      reason: "",
      affectedSessions: [],
      impactConfirmed: false,
    },
    audit: [],
  };
}

function cloned<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertConfigScope(
  config: ActivityGovernanceConfig,
  activityId: string
) {
  if (!isSameActivityId(config.activityId, activityId)) {
    throw new GovernanceError(
      "活动范围不一致，拒绝使用其他活动的配置或记录",
      "ACTIVITY_SCOPE"
    );
  }
}

export function validateGovernance(
  config: ActivityGovernanceConfig
): GovernanceErrors {
  const errors: GovernanceErrors = {};
  const publication = config.publication;
  const admission = config.admission;

  if (!publication.title.trim())
    errors["publication.title"] = "请填写用户端活动标题";
  if (!publication.summary.trim())
    errors["publication.summary"] = "请填写用户端活动摘要";
  if (publication.title.trim().length > 80)
    errors["publication.title"] = "标题不能超过 80 个字符";
  if (publication.summary.trim().length > 240)
    errors["publication.summary"] = "摘要不能超过 240 个字符";
  if (
    publication.coverUrl.trim() &&
    !URL_PATTERN.test(publication.coverUrl.trim())
  ) {
    errors["publication.coverUrl"] = "封面 URL 仅支持 http 或 https 地址";
  }
  if (
    !publication.visibleFields.includes("title") ||
    !publication.visibleFields.includes("summary")
  ) {
    errors["publication.visibleFields"] =
      "标题和摘要为用户端最小公开字段，不可同时撤除";
  }

  if (!admission.ruleVersion.trim())
    errors["admission.ruleVersion"] = "请填写准入规则版本";
  if (admission.ordinaryAttireAllowed && !admission.pledgeText.trim()) {
    errors["admission.pledgeText"] = "允许普通服装时必须配置用户承诺正文";
  }
  if (
    admission.propPolicy === "restricted" &&
    !admission.propRestrictionNote.trim()
  ) {
    errors["admission.propRestrictionNote"] = "请说明道具限制、尺寸或风险等级";
  }
  if (
    admission.sessionScope === "selected" &&
    admission.sessionIds.length === 0
  ) {
    errors["admission.sessionIds"] = "请选择至少一个适用场次";
  }
  if (!admission.validUntil)
    errors["admission.validUntil"] = "请填写准入规则有效期";
  if (
    admission.validFrom &&
    admission.validUntil &&
    admission.validFrom > admission.validUntil
  ) {
    errors["admission.validUntil"] = "有效期结束不能早于生效日期";
  }
  return errors;
}

export function assertCanMutate(
  role: ActivityGovernanceRole,
  command: GovernanceCommand | "revoke"
) {
  if (role === "culture") {
    throw new GovernanceError(
      "文旅角色仅可查看，不能修改发布、准入、生命周期或资格",
      "FORBIDDEN"
    );
  }
  if (
    role === "organizer" &&
    (command === "end" || command === "cancel" || command === "revoke")
  ) {
    throw new GovernanceError(
      "结束、取消活动与撤销资格仅限平台办理",
      "FORBIDDEN"
    );
  }
}

export function assertExpectedVersion(
  current: ActivityGovernanceConfig,
  expectedVersion: number
) {
  if (current.version !== expectedVersion) {
    throw new GovernanceError(
      "配置版本已变化，请刷新后再提交，避免覆盖他人修改",
      "VERSION_CONFLICT"
    );
  }
}

export function assertKnownEligibility(
  activityId: string,
  records: EligibilityRecord[],
  eligibilityId: string
): EligibilityRecord {
  const item = records.find(record => record.id === eligibilityId);
  if (!item || !isSameActivityId(item.activityId, activityId)) {
    throw new GovernanceError(
      "未找到当前活动的资格记录，不能撤销",
      "UNKNOWN_ELIGIBILITY"
    );
  }
  return item;
}

export function assertEligibilityResponseScope(
  activityId: string,
  records: EligibilityRecord[]
) {
  records.forEach(record => {
    if (!isSameActivityId(record.activityId, activityId)) {
      throw new GovernanceError(
        "资格接口返回了其他活动的数据，已拒绝展示",
        "ACTIVITY_SCOPE"
      );
    }
  });
  return records;
}

function auditDetail(
  command: GovernanceCommand,
  config: ActivityGovernanceConfig
): string {
  switch (command) {
    case "save":
      return `保存用户端发布与准入配置（规则 ${config.admission.ruleVersion}）`;
    case "publish":
      return `发布用户端活动（${config.publication.visibility === "public" ? "公开访问" : "登录后可见"}）`;
    case "withdraw":
      return `撤回用户端发布：${config.publication.withdrawReason?.trim() || "未填写原因"}`;
    case "publishRule":
      return `发布准入规则 ${config.admission.ruleVersion}`;
    case "end":
      return `结束活动配置：${config.lifecycle.reason.trim()}`;
    case "cancel":
      return `取消活动配置：${config.lifecycle.reason.trim()}`;
  }
}

function assertLifecycleInput(
  config: ActivityGovernanceConfig,
  command: "end" | "cancel"
) {
  if (!config.lifecycle.reason.trim()) {
    throw new GovernanceError(
      `${command === "cancel" ? "取消" : "结束"}活动必须填写原因`,
      "VALIDATION"
    );
  }
  if (!config.lifecycle.impactConfirmed) {
    throw new GovernanceError(
      "请确认受影响场次与票务/退款交由既有权威对象处理",
      "VALIDATION"
    );
  }
  if (command === "cancel" && config.lifecycle.state === "cancelled") {
    throw new GovernanceError(
      "该活动已取消，不能重复取消",
      "ALREADY_CANCELLED"
    );
  }
  if (command === "end" && config.lifecycle.state !== "active") {
    throw new GovernanceError("仅进行中的活动可办理结束", "VALIDATION");
  }
}

export function applyDemoGovernance(
  current: ActivityGovernanceConfig,
  input: {
    activityId: string;
    expectedVersion: number;
    role: ActivityGovernanceRole;
    command: GovernanceCommand;
    candidate: ActivityGovernanceConfig;
    now?: string;
  }
): ActivityGovernanceConfig {
  assertConfigScope(current, input.activityId);
  assertConfigScope(input.candidate, input.activityId);
  assertCanMutate(input.role, input.command);
  assertExpectedVersion(current, input.expectedVersion);

  const next = cloned(input.candidate);
  const now = input.now ?? new Date().toISOString();
  if (
    input.command === "save" ||
    input.command === "publish" ||
    input.command === "publishRule"
  ) {
    const errors = validateGovernance(next);
    if (Object.keys(errors).length) {
      throw new GovernanceError(Object.values(errors)[0]!, "VALIDATION");
    }
  }
  if (input.command === "withdraw") {
    if (current.publication.status !== "published") {
      throw new GovernanceError("只有已发布的用户端活动可以撤回", "VALIDATION");
    }
    if (!next.publication.withdrawReason?.trim()) {
      throw new GovernanceError("撤回发布必须填写原因", "VALIDATION");
    }
  }
  if (input.command === "end" || input.command === "cancel")
    assertLifecycleInput(next, input.command);

  next.version = current.version + 1;
  next.updatedAt = now;
  if (input.command === "publish") {
    next.publication.status = "published";
    next.publication.publishedAt = now;
    next.publication.withdrawnAt = undefined;
    next.publication.withdrawReason = undefined;
  }
  if (input.command === "withdraw") {
    next.publication.status = "withdrawn";
    next.publication.withdrawnAt = now;
  }
  if (input.command === "publishRule") {
    next.admission.status = "published";
    next.admission.publishedAt = now;
  }
  if (input.command === "end" || input.command === "cancel") {
    next.lifecycle.state = input.command === "end" ? "ended" : "cancelled";
    next.lifecycle.changedAt = now;
  }
  next.audit = [
    {
      id: `demo-governance-${next.version}`,
      activityId: next.activityId,
      action: auditDetail(input.command, next),
      detail:
        input.command === "cancel" || input.command === "end"
          ? "仅记录演示配置；未创建退款、未改变订单冻结快照，也不表示资金已到账。"
          : "Demo 配置操作记录",
      actorRole: input.role,
      occurredAt: now,
      version: next.version,
    },
    ...current.audit,
  ];
  return next;
}

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadDemoGovernance(
  activityId: string,
  storage: Storage | null = browserStorage()
): ActivityGovernanceConfig {
  const scopedId = normalizeActivityId(activityId);
  const empty = createActivityGovernance(scopedId);
  if (!storage) return empty;
  try {
    const raw = storage.getItem(activityGovernanceStorageKey(scopedId));
    if (!raw) return empty;
    const saved = JSON.parse(raw) as Partial<ActivityGovernanceConfig>;
    if (
      saved.schemaVersion !== 1 ||
      typeof saved.activityId !== "string" ||
      !isSameActivityId(saved.activityId, scopedId) ||
      typeof saved.version !== "number" ||
      !saved.publication ||
      !saved.admission ||
      !saved.lifecycle ||
      !Array.isArray(saved.audit)
    )
      return empty;
    return saved as ActivityGovernanceConfig;
  } catch {
    return empty;
  }
}

export function saveDemoGovernance(
  config: ActivityGovernanceConfig,
  storage: Storage | null = browserStorage()
): void {
  assertConfigScope(config, config.activityId);
  if (!storage) throw new Error("浏览器存储不可用，Demo 配置没有保存");
  try {
    storage.setItem(
      activityGovernanceStorageKey(config.activityId),
      JSON.stringify(config)
    );
  } catch {
    throw new Error("Demo 配置未能写入浏览器存储，未宣称保存成功");
  }
}

export interface ActivityGovernanceApiPayload {
  id?: string;
  activityId?: string;
  version?: number;
  governance?: ActivityGovernanceConfig;
  auditLogs?: GovernanceAuditEntry[];
}

/** API mode accepts only a complete authoritative governance object; it never fills gaps from demo data. */
export function governanceFromApi(
  activityId: string,
  payload: ActivityGovernanceApiPayload
): ActivityGovernanceConfig {
  const scopedId = normalizeActivityId(activityId);
  const responseId = payload.activityId ?? payload.id;
  if (!responseId || !isSameActivityId(responseId, scopedId)) {
    throw new GovernanceError(
      "活动接口未返回当前活动范围的标识，已拒绝使用响应",
      "ACTIVITY_SCOPE"
    );
  }
  const governance = payload.governance;
  if (!governance || typeof governance !== "object") {
    throw new GovernanceError(
      "活动接口未返回 governance 配置，无法以样例或本地配置代替",
      "API_CONTRACT"
    );
  }
  assertConfigScope(governance, scopedId);
  if (!Number.isInteger(governance.version) || governance.version < 1) {
    throw new GovernanceError(
      "活动 governance 响应缺少有效版本号",
      "API_CONTRACT"
    );
  }
  return {
    ...governance,
    audit: payload.auditLogs ?? governance.audit ?? [],
  };
}

export function auditLogsFromApi(
  activityId: string,
  payload: GovernanceAuditEntry[] | { items?: GovernanceAuditEntry[] }
): GovernanceAuditEntry[] {
  const logs = Array.isArray(payload) ? payload : payload.items;
  if (!Array.isArray(logs))
    throw new GovernanceError("审计接口未返回日志数组", "API_CONTRACT");
  logs.forEach(entry => {
    if (!isSameActivityId(entry.activityId, activityId)) {
      throw new GovernanceError(
        "审计接口返回了其他活动的记录，已拒绝展示",
        "ACTIVITY_SCOPE"
      );
    }
  });
  return logs;
}

export function governanceApiBody(
  config: ActivityGovernanceConfig,
  command: GovernanceCommand
) {
  return {
    action: `governance.${command}`,
    expectedVersion: config.version,
    governance: config,
  };
}

/** Deliberately contains no local persistence: a rejected API write simply remains rejected. */
export async function writeGovernanceThroughApi<T>(
  activityId: string,
  config: ActivityGovernanceConfig,
  command: GovernanceCommand,
  execute: (body: ReturnType<typeof governanceApiBody>) => Promise<T>
): Promise<ActivityGovernanceConfig> {
  assertConfigScope(config, activityId);
  const result = await execute(governanceApiBody(config, command));
  return governanceFromApi(activityId, result as ActivityGovernanceApiPayload);
}
