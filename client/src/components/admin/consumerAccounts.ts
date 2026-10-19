import { requestApi } from "@/lib/api";

export type ConsumerAdminRole = "platform" | "organizer" | "culture";
export type ConsumerPermission =
  | "privacy"
  | "identity_review"
  | "security"
  | "compliance";
export type ConsumerPanelMode = "api" | "demo";

export type ConsumerAdminAccess = {
  role: ConsumerAdminRole;
  /** Claims must come from the current server-authenticated session. Missing claims never imply a grant. */
  permissions?: readonly ConsumerPermission[];
};

export type ConsumerAccountStatus =
  | "active"
  | "suspended"
  | "closed"
  | "locked";
export type ConsumerKycStatus =
  | "unverified"
  | "submitted"
  | "verifying"
  | "verified"
  | "failed"
  | "review_required"
  | "revoked";

export type ConsumerAccountSummary = {
  id: string;
  accountId: string;
  /** All account search fields are server-projected and masked. */
  maskedPhone: string;
  maskedNickname: string;
  accountStatus: ConsumerAccountStatus;
  wechatBindingStatus: "bound" | "unbound" | "risk_hold";
  profileCompleteness: number;
  kycStatus: ConsumerKycStatus;
  registeredAt: string;
  lastAuthenticatedAt?: string;
};

export type ConsumerSecurityEvent = {
  id: string;
  type: string;
  occurredAt: string;
  result: "allowed" | "blocked" | "review";
  auditId: string;
};

export type ConsumerAccountDetail = ConsumerAccountSummary & {
  profile: {
    maskedNickname: string;
    gender?: string;
    mbti?: string;
    tags?: string[];
    missingFields: string[];
    profileVersion: string;
    updatedAt: string;
  };
  bindings: Array<{
    id: string;
    provider: "wechat" | "other";
    maskedExternalId: string;
    status: "bound" | "unbound" | "risk_hold";
    boundAt?: string;
  }>;
  profileQr: {
    codeType: "profile";
    status: "active" | "rotated" | "revoked";
    createdAt: string;
    rotatedAt?: string;
    revocationAuditId?: string;
  };
  securityEvents: ConsumerSecurityEvent[];
};

export type ConsumerKycSummary = {
  id: string;
  consumerUserId: string;
  maskedAccount: string;
  documentType: string;
  maskedDocument: string;
  status: Extract<ConsumerKycStatus, "failed" | "review_required">;
  failureReasonCode?: string;
  submittedAt?: string;
  updatedAt: string;
  appeal?: {
    id: string;
    status: "submitted" | "processing" | "resolved";
    summary: string;
  };
  version: string;
};

export type ConsumerKycDetail = ConsumerKycSummary & {
  ruleVersion: string;
  retryAvailableAt?: string;
  appeal?: ConsumerKycSummary["appeal"] & {
    submittedAt?: string;
    resolution?: string;
  };
  audit: Array<{
    id: string;
    action: string;
    occurredAt: string;
    actorType: string;
    reason?: string;
  }>;
};

export type ComplianceDocumentKind =
  | "terms"
  | "privacy"
  | "kyc"
  | "sdk"
  | "about";
export type ComplianceDocumentStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "retired";

export type ComplianceDocument = {
  id: string;
  kind: ComplianceDocumentKind;
  title: string;
  version: string;
  status: ComplianceDocumentStatus;
  effectiveAt?: string;
  contentBody?: string;
  contentUrl?: string;
  locale: string;
  updatedAt: string;
  versionAudit: Array<{
    id: string;
    action: string;
    occurredAt: string;
    actor: string;
  }>;
};

export const SMS_SCENES = [
  "login_sms",
  "consumer_register",
  "password_reset",
  "consumer_phone_bind",
] as const;
export type SmsScene = (typeof SMS_SCENES)[number];

export type ConsumerSecurityPolicy = {
  version: string;
  updatedAt: string;
  versionAudit?: Array<{
    id: string;
    action: string;
    occurredAt: string;
    actor: string;
  }>;
  sms: Record<
    SmsScene,
    {
      resendAfterSeconds: number;
      expiresInSeconds: number;
      maxAttempts: number;
      maxPerPhonePerDay: number;
      maxPerIpPerDay: number;
      maxPerDevicePerDay: number;
      lockMinutes: number;
    }
  >;
};

export type ListConsumersQuery = {
  keyword?: string;
  accountStatus?: ConsumerAccountStatus;
  cursor?: string;
};

export type ConsumerListResult = {
  items: ConsumerAccountSummary[];
  nextCursor?: string;
  requestId?: string;
};
export type KycListResult = {
  items: ConsumerKycSummary[];
  nextCursor?: string;
  requestId?: string;
};
export type KycDecision =
  | "verified"
  | "changes_required"
  | "review_required"
  | "rejected";

export type ConsumerAccountsApi = {
  listConsumers(query?: ListConsumersQuery): Promise<ConsumerListResult>;
  getConsumer(id: string): Promise<ConsumerAccountDetail>;
  updateAccountStatus(input: {
    id: string;
    status: ConsumerAccountStatus;
    reason: string;
    version?: string;
  }): Promise<ConsumerAccountDetail>;
  forceUnbind(input: {
    accountId: string;
    bindingId: string;
    reason: string;
    version?: string;
  }): Promise<ConsumerAccountDetail>;
  listKycQueue(query?: {
    status?: Array<"failed" | "review_required">;
    cursor?: string;
  }): Promise<KycListResult>;
  getKyc(id: string): Promise<ConsumerKycDetail>;
  reviewKyc(input: {
    id: string;
    decision: KycDecision;
    reason: string;
    version: string;
  }): Promise<ConsumerKycDetail>;
  listComplianceDocuments(): Promise<ComplianceDocument[]>;
  saveComplianceDocument(
    document: Omit<
      ComplianceDocument,
      "id" | "updatedAt" | "versionAudit" | "status"
    > & { id?: string; status?: "draft" | "scheduled" }
  ): Promise<ComplianceDocument>;
  publishComplianceDocument(input: {
    id: string;
    version: string;
    effectiveAt: string;
  }): Promise<ComplianceDocument>;
  getSecurityPolicy(): Promise<ConsumerSecurityPolicy>;
  saveSecurityPolicy(
    policy: ConsumerSecurityPolicy
  ): Promise<ConsumerSecurityPolicy>;
};

export type ConsumerConfigurationApi = Pick<
  ConsumerAccountsApi,
  | "listComplianceDocuments"
  | "saveComplianceDocument"
  | "publishComplianceDocument"
  | "getSecurityPolicy"
  | "saveSecurityPolicy"
>;

type ApiRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

const queryString = (params: Record<string, string | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
};

const jsonRequest = <T>(
  request: ApiRequest,
  path: string,
  method: "POST" | "PUT",
  body: unknown
) =>
  request<T>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/** Uses only v1 requestApi responses. It deliberately has no mock/localStorage fallback. */
export function createConsumerAccountsApi(
  request: ApiRequest = requestApi
): ConsumerAccountsApi {
  return {
    listConsumers: (input = {}) =>
      request<ConsumerListResult>(
        `/platform/consumer-accounts${queryString({ keyword: input.keyword, accountStatus: input.accountStatus, cursor: input.cursor })}`
      ),
    getConsumer: id =>
      request<ConsumerAccountDetail>(
        `/platform/consumer-accounts/${encodeURIComponent(id)}`
      ),
    updateAccountStatus: input =>
      jsonRequest(
        request,
        `/platform/consumer-accounts/${encodeURIComponent(input.id)}/status`,
        "PUT",
        input
      ),
    forceUnbind: input =>
      jsonRequest(
        request,
        `/platform/consumer-accounts/${encodeURIComponent(input.accountId)}/bindings/${encodeURIComponent(input.bindingId)}/force-unbind`,
        "POST",
        input
      ),
    listKycQueue: (input = {}) =>
      request<KycListResult>(
        `/platform/consumer-kyc${queryString({ status: input.status?.join(","), cursor: input.cursor })}`
      ),
    getKyc: id =>
      request<ConsumerKycDetail>(
        `/platform/consumer-kyc/${encodeURIComponent(id)}`
      ),
    reviewKyc: input =>
      jsonRequest(
        request,
        `/platform/consumer-kyc/${encodeURIComponent(input.id)}/decisions`,
        "POST",
        input
      ),
    listComplianceDocuments: () =>
      request<ComplianceDocument[]>("/platform/compliance-documents"),
    saveComplianceDocument: input => {
      const path = input.id
        ? `/platform/compliance-documents/${encodeURIComponent(input.id)}`
        : "/platform/compliance-documents";
      return jsonRequest(request, path, input.id ? "PUT" : "POST", input);
    },
    publishComplianceDocument: input =>
      jsonRequest(
        request,
        `/platform/compliance-documents/${encodeURIComponent(input.id)}/publish`,
        "POST",
        input
      ),
    getSecurityPolicy: () =>
      request<ConsumerSecurityPolicy>("/platform/consumer-security-policy"),
    saveSecurityPolicy: policy =>
      jsonRequest(request, "/platform/consumer-security-policy", "PUT", policy),
  };
}

export const defaultConsumerAccountsApi = createConsumerAccountsApi();

export function hasPermission(
  access: ConsumerAdminAccess,
  permission: ConsumerPermission
): boolean {
  return (
    access.role === "platform" &&
    Boolean(access.permissions?.includes(permission))
  );
}

/** A platform role alone is not proof of any entitlement; each tab/action applies its own claim. */
export function canAccessConsumerAccounts(
  access: ConsumerAdminAccess
): boolean {
  return (
    access.role === "platform" &&
    Boolean(
      access.permissions?.some(
        permission =>
          permission === "privacy" ||
          permission === "identity_review" ||
          permission === "security" ||
          permission === "compliance"
      )
    )
  );
}

export function canReviewConsumerKyc(access: ConsumerAdminAccess): boolean {
  return (
    hasPermission(access, "privacy") && hasPermission(access, "identity_review")
  );
}

export function canManageConsumerSecurity(
  access: ConsumerAdminAccess
): boolean {
  return hasPermission(access, "privacy") && hasPermission(access, "security");
}

export function canManageConsumerCompliance(
  access: ConsumerAdminAccess
): boolean {
  return hasPermission(access, "compliance");
}

export function maskConsumerText(value: string, visible = 2): string {
  if (!value) return "—";
  if (value.length <= visible * 2) return "•".repeat(value.length);
  return `${value.slice(0, visible)}${"•".repeat(Math.max(2, value.length - visible * 2))}${value.slice(-visible)}`;
}

const mojibake = /\uFFFD|Ã.|Â.|â€|锟斤拷/;

export function validateComplianceDocument(
  input: Pick<
    ComplianceDocument,
    | "title"
    | "version"
    | "effectiveAt"
    | "contentBody"
    | "contentUrl"
    | "locale"
  >
): string[] {
  const errors: string[] = [];
  const fields = [
    input.title,
    input.version,
    input.contentBody ?? "",
    input.contentUrl ?? "",
    input.locale,
  ];
  if (!input.title.trim()) errors.push("请填写文档标题");
  if (!/^v?\d+(?:\.\d+){0,3}(?:-[a-z0-9]+)?$/i.test(input.version.trim()))
    errors.push("版本号需为数字语义版本，例如 1.0.0");
  if (!input.effectiveAt || Number.isNaN(Date.parse(input.effectiveAt)))
    errors.push("请设置有效生效时间");
  if (!input.contentBody?.trim() && !input.contentUrl?.trim())
    errors.push("请提供正文或公开链接");
  if (input.contentUrl && !/^https:\/\/.+/i.test(input.contentUrl))
    errors.push("文档链接必须使用 https://");
  if (fields.some(value => mojibake.test(value)))
    errors.push("正文或链接包含乱码，请修正后再发布");
  return errors;
}

export function validateSecurityPolicy(
  policy: ConsumerSecurityPolicy
): string[] {
  const errors: string[] = [];
  if (!/^v?\d+(?:\.\d+){0,3}(?:-[a-z0-9]+)?$/i.test(policy.version.trim()))
    errors.push("策略版本号格式无效");
  for (const scene of SMS_SCENES) {
    const setting = policy.sms[scene];
    if (!setting) {
      errors.push(`缺少 ${scene} 的独立配置`);
      continue;
    }
    for (const [key, value] of Object.entries(setting)) {
      if (!Number.isInteger(value) || value <= 0)
        errors.push(`${scene}.${key} 必须为正整数`);
    }
    if (setting.resendAfterSeconds >= setting.expiresInSeconds)
      errors.push(`${scene} 重发间隔必须短于有效期`);
  }
  const containsSensitiveKey = (value: unknown): boolean => {
    if (!value || typeof value !== "object") return false;
    return Object.entries(value as Record<string, unknown>).some(
      ([key, nested]) =>
        /^(?:secret|providersecret|password|token|verificationcode|apikey)$/i.test(
          key
        ) || containsSensitiveKey(nested)
    );
  };
  if (containsSensitiveKey(policy)) {
    errors.push("安全策略不得包含密码、验证码或供应商密钥");
  }
  return errors;
}

/**
 * Explicit demo-only store for compliance and policy configuration. It cannot list users,
 * change accounts, or review KYC; nothing here represents an App publication.
 */
export function createDemoConfigurationApi(seed?: {
  documents?: ComplianceDocument[];
  policy?: ConsumerSecurityPolicy;
}): ConsumerConfigurationApi {
  let documents = structuredClone(seed?.documents ?? []);
  let policy = seed?.policy ? structuredClone(seed.policy) : null;
  const audit = (action: string) => ({
    id: `demo-${Date.now()}`,
    action,
    occurredAt: new Date().toISOString(),
    actor: "demo-config",
  });
  return {
    listComplianceDocuments: async () => structuredClone(documents),
    saveComplianceDocument: async input => {
      const errors = validateComplianceDocument(input);
      if (errors.length) throw new Error(errors.join("；"));
      const now = new Date().toISOString();
      const found = input.id
        ? documents.find(item => item.id === input.id)
        : undefined;
      const saved: ComplianceDocument = {
        id: found?.id ?? `demo-doc-${Date.now()}`,
        kind: input.kind,
        title: input.title,
        version: input.version,
        status: input.status ?? "draft",
        effectiveAt: input.effectiveAt,
        contentBody: input.contentBody,
        contentUrl: input.contentUrl,
        locale: input.locale,
        updatedAt: now,
        versionAudit: [...(found?.versionAudit ?? []), audit("draft_saved")],
      };
      documents = found
        ? documents.map(item => (item.id === found.id ? saved : item))
        : [saved, ...documents];
      return structuredClone(saved);
    },
    publishComplianceDocument: async input => {
      const index = documents.findIndex(item => item.id === input.id);
      if (index < 0) throw new Error("未找到待发布文档");
      const current = documents[index];
      const errors = validateComplianceDocument({
        ...current,
        version: input.version,
        effectiveAt: input.effectiveAt,
      });
      if (errors.length) throw new Error(errors.join("；"));
      const updated: ComplianceDocument = {
        ...current,
        version: input.version,
        effectiveAt: input.effectiveAt,
        status:
          new Date(input.effectiveAt).getTime() > Date.now()
            ? "scheduled"
            : "published",
        updatedAt: new Date().toISOString(),
        versionAudit: [
          ...current.versionAudit,
          audit("demo_publication_saved_not_app_live"),
        ],
      };
      documents = documents.map((item, itemIndex) =>
        itemIndex === index ? updated : item
      );
      return structuredClone(updated);
    },
    getSecurityPolicy: async () => {
      if (!policy) throw new Error("尚未配置短信安全策略");
      return structuredClone(policy);
    },
    saveSecurityPolicy: async input => {
      const errors = validateSecurityPolicy(input);
      if (errors.length) throw new Error(errors.join("；"));
      policy = {
        ...structuredClone(input),
        updatedAt: new Date().toISOString(),
        versionAudit: [
          ...(input.versionAudit ?? []),
          audit("security_policy_saved_not_app_live"),
        ],
      };
      return structuredClone(policy);
    },
  };
}
