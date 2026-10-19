import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  FileText,
  KeyRound,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  SMS_SCENES,
  canAccessConsumerAccounts,
  canManageConsumerCompliance,
  canManageConsumerSecurity,
  canReviewConsumerKyc,
  createDemoConfigurationApi,
  defaultConsumerAccountsApi,
  hasPermission,
  validateComplianceDocument,
  validateSecurityPolicy,
  type ComplianceDocument,
  type ComplianceDocumentKind,
  type ConsumerAccountDetail,
  type ConsumerAccountsApi,
  type ConsumerAdminAccess,
  type ConsumerAdminRole,
  type ConsumerConfigurationApi,
  type ConsumerKycDetail,
  type ConsumerPanelMode,
  type ConsumerPermission,
  type ConsumerSecurityPolicy,
  type SmsScene,
} from "./consumerAccounts";

export type ConsumerAccountsPanelProps = {
  /** Parent registration owns route/menu placement; this component is the sole content surface. */
  role: ConsumerAdminRole;
  /** Server session claims. An omitted value never grants a sensitive action. */
  permissions?: readonly ConsumerPermission[];
  mode?: ConsumerPanelMode;
  api?: ConsumerAccountsApi;
  /** 本地 is intentionally limited to compliance/security configuration; it can never mock account or KYC actions. */
  demoConfigurationApi?: ConsumerConfigurationApi;
};

type Tab = "accounts" | "kyc" | "compliance" | "security";
type DocumentDraft = Omit<
  ComplianceDocument,
  "id" | "updatedAt" | "versionAudit" | "status"
> & {
  id?: string;
};

const tabs: Array<{ id: Tab; label: string; icon: typeof UserRound }> = [
  { id: "accounts", label: "账户查询", icon: UserRound },
  { id: "kyc", label: "消费者 KYC", icon: ShieldCheck },
  { id: "compliance", label: "合规版本", icon: FileText },
  { id: "security", label: "账号安全策略", icon: KeyRound },
];

const button =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45";
const primaryButton = `${button} bg-brand-600 text-white hover:bg-brand-700`;
const secondaryButton = `${button} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
const field =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15";
const textarea =
  "min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15";

const emptyDocument = (): DocumentDraft => ({
  kind: "terms",
  title: "",
  version: "",
  effectiveAt: "",
  contentBody: "",
  contentUrl: "",
  locale: "zh-CN",
});

const emptyPolicy = (): ConsumerSecurityPolicy => ({
  version: "",
  updatedAt: "",
  sms: Object.fromEntries(
    SMS_SCENES.map(scene => [
      scene,
      {
        resendAfterSeconds: 60,
        expiresInSeconds: 300,
        maxAttempts: 5,
        maxPerPhonePerDay: 10,
        maxPerIpPerDay: 30,
        maxPerDevicePerDay: 20,
        lockMinutes: 30,
      },
    ])
  ) as ConsumerSecurityPolicy["sms"],
});

const formatTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("zh-CN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
const replaceOne = <T extends { id: string }>(items: T[], next: T) =>
  items.map(item => (item.id === next.id ? next : item));

function ClaimLock({ children }: { children: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
      {children}
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const tone = /verified|active|bound|published|allowed/.test(value)
    ? "bg-emerald-50 text-emerald-700"
    : /failed|suspended|locked|revoked|blocked/.test(value)
      ? "bg-rose-50 text-rose-700"
      : "bg-amber-50 text-amber-700";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      {value}
    </span>
  );
}

/**
 * Platform-only consumer-account surface. Parent AppLayout/router registration is deliberately
 * external. UI guards assist privacy, but the API remains the authorization authority.
 */
export function ConsumerAccountsPanel({
  role,
  permissions,
  mode = "api",
  api = defaultConsumerAccountsApi,
  demoConfigurationApi,
}: ConsumerAccountsPanelProps) {
  const access = useMemo<ConsumerAdminAccess>(
    () => ({ role, permissions }),
    [role, permissions]
  );
  const [tab, setTab] = useState<Tab>("accounts");
  const [keyword, setKeyword] = useState("");
  const [accounts, setAccounts] = useState<
    Awaited<ReturnType<ConsumerAccountsApi["listConsumers"]>>["items"]
  >([]);
  const [kycQueue, setKycQueue] = useState<
    Awaited<ReturnType<ConsumerAccountsApi["listKycQueue"]>>["items"]
  >([]);
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [detail, setDetail] = useState<ConsumerAccountDetail | null>(null);
  const [kycDetail, setKycDetail] = useState<ConsumerKycDetail | null>(null);
  const [documentDraft, setDocumentDraft] =
    useState<DocumentDraft>(emptyDocument);
  const [policy, setPolicy] = useState<ConsumerSecurityPolicy | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const demoConfigurationOnly = mode === "demo" && role === "platform";
  const canOpen = demoConfigurationOnly || canAccessConsumerAccounts(access);
  const canReadAccounts = mode !== "demo" && hasPermission(access, "privacy");
  const canReviewKyc = mode !== "demo" && canReviewConsumerKyc(access);
  const canManageCompliance =
    demoConfigurationOnly || canManageConsumerCompliance(access);
  const canManageSecurity =
    demoConfigurationOnly || canManageConsumerSecurity(access);
  const generated本地ConfigurationApi = useMemo(
    () => createDemoConfigurationApi(),
    []
  );
  const configurationApi =
    mode === "demo"
      ? (demoConfigurationApi ?? generated本地ConfigurationApi)
      : api;

  const clearFeedback = () => {
    setError("");
    setNotice("");
  };

  const loadAccounts = async () => {
    if (!canReadAccounts) return;
    clearFeedback();
    setLoading(true);
    try {
      const result = await api.listConsumers({
        keyword: keyword.trim() || undefined,
      });
      setAccounts(result.items);
    } catch (cause) {
      setAccounts([]);
      setError(cause instanceof Error ? cause.message : "用户账户查询失败");
    } finally {
      setLoading(false);
    }
  };

  const loadKyc = async () => {
    if (!canReviewKyc) return;
    clearFeedback();
    setLoading(true);
    try {
      const result = await api.listKycQueue({
        status: ["failed", "review_required"],
      });
      setKycQueue(result.items);
    } catch (cause) {
      setKycQueue([]);
      setError(cause instanceof Error ? cause.message : "KYC 队列查询失败");
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    if (!canManageCompliance || !configurationApi) return;
    clearFeedback();
    setLoading(true);
    try {
      setDocuments(await configurationApi.listComplianceDocuments());
    } catch (cause) {
      setDocuments([]);
      setError(cause instanceof Error ? cause.message : "合规版本查询失败");
    } finally {
      setLoading(false);
    }
  };

  const loadPolicy = async () => {
    if (!canManageSecurity || !configurationApi) return;
    clearFeedback();
    setLoading(true);
    try {
      setPolicy(await configurationApi.getSecurityPolicy());
    } catch (cause) {
      setPolicy(null);
      setError(cause instanceof Error ? cause.message : "账号安全策略查询失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setAccounts([]);
    setKycQueue([]);
    setDetail(null);
    setKycDetail(null);
    setError("");
    setNotice("");
    if (tab === "accounts") void loadAccounts();
    // Claims change must clear in-memory sensitive projections before the next request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    role,
    permissions,
    canReadAccounts,
    canReviewKyc,
    canManageCompliance,
    canManageSecurity,
  ]);

  useEffect(() => {
    if (tab === "accounts") void loadAccounts();
    if (tab === "kyc") void loadKyc();
    if (tab === "compliance") void loadDocuments();
    if (tab === "security") void loadPolicy();
    // Fetches only follow a permitted tab selection; unavailable claims never issue a request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  if (!canOpen) {
    return (
      <section
        className="rounded-2xl border border-slate-200 bg-white p-6"
        data-cy="consumer-accounts-denied"
      >
        <div className="flex items-start gap-3 text-slate-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <h2 className="font-semibold">用户与账户不可用</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              仅 platform 且收到 privacy、identity_review、security 或
              compliance
              服务端声明的会话可打开此入口。前端拦截不代表服务端已经鉴权。
            </p>
          </div>
        </div>
      </section>
    );
  }

  const openAccount = async (id: string) => {
    if (!canReadAccounts) return;
    clearFeedback();
    setLoading(true);
    try {
      setDetail(await api.getConsumer(id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "账户详情查询失败");
    } finally {
      setLoading(false);
    }
  };

  const openKyc = async (id: string) => {
    if (!canReviewKyc) return;
    clearFeedback();
    setLoading(true);
    try {
      setKycDetail(await api.getKyc(id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "KYC 详情查询失败");
    } finally {
      setLoading(false);
    }
  };

  const changeAccountStatus = async () => {
    if (!detail || !canManageSecurity || !reason.trim()) return;
    setSaving(true);
    clearFeedback();
    try {
      const result = await api.updateAccountStatus({
        id: detail.id,
        status: detail.accountStatus === "suspended" ? "active" : "suspended",
        reason: reason.trim(),
      });
      setDetail(result);
      setAccounts(previous => replaceOne(previous, result));
      setReason("");
      setNotice("已收到服务端账户状态回执。");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "账户状态操作失败；未刷新本地状态。"
      );
    } finally {
      setSaving(false);
    }
  };

  const unbind = async (bindingId: string) => {
    if (!detail || !canManageSecurity || !reason.trim()) return;
    setSaving(true);
    clearFeedback();
    try {
      const result = await api.forceUnbind({
        accountId: detail.id,
        bindingId,
        reason: reason.trim(),
      });
      setDetail(result);
      setAccounts(previous => replaceOne(previous, result));
      setReason("");
      setNotice("已收到服务端强制解除回执。");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "强制解除失败；未刷新本地状态。"
      );
    } finally {
      setSaving(false);
    }
  };

  const decideKyc = async (
    decision: "verified" | "changes_required" | "review_required" | "rejected"
  ) => {
    if (!kycDetail || !canReviewKyc || !reason.trim()) return;
    setSaving(true);
    clearFeedback();
    try {
      const result = await api.reviewKyc({
        id: kycDetail.id,
        decision,
        reason: reason.trim(),
        version: kycDetail.version,
      });
      setKycDetail(result);
      setKycQueue(previous => previous.filter(item => item.id !== result.id));
      setReason("");
      setNotice("KYC 决定已由服务端持久化并回读。");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "KYC 办理失败；队列未按本地结果更新。"
      );
    } finally {
      setSaving(false);
    }
  };

  const saveDocument = async () => {
    if (!canManageCompliance || !configurationApi) return;
    const validation = validateComplianceDocument(documentDraft);
    if (validation.length) {
      setError(validation.join("；"));
      return;
    }
    setSaving(true);
    clearFeedback();
    try {
      const saved =
        await configurationApi.saveComplianceDocument(documentDraft);
      setDocuments(previous =>
        previous.some(item => item.id === saved.id)
          ? replaceOne(previous, saved)
          : [saved, ...previous]
      );
      setDocumentDraft({ ...saved });
      setNotice(
        mode === "demo"
          ? "本地 配置已保存版本审计；尚未接入正式 App 发布。"
          : "合规草稿已按服务端回执保存。"
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "合规草稿保存失败。");
    } finally {
      setSaving(false);
    }
  };

  const publishDocument = async () => {
    if (!canManageCompliance || !configurationApi || !documentDraft.id) {
      setError("请先取得草稿的服务端 ID 后再发布。");
      return;
    }
    const validation = validateComplianceDocument(documentDraft);
    if (validation.length) {
      setError(validation.join("；"));
      return;
    }
    setSaving(true);
    clearFeedback();
    try {
      const saved = await configurationApi.publishComplianceDocument({
        id: documentDraft.id,
        version: documentDraft.version,
        effectiveAt: documentDraft.effectiveAt || "",
      });
      setDocuments(previous => replaceOne(previous, saved));
      setDocumentDraft({ ...saved });
      setNotice(
        mode === "demo"
          ? "本地 发布计划已留审计，未使正式 App 上线。"
          : "文档发布已取得服务端回执。"
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "文档发布失败；未显示为已生效。"
      );
    } finally {
      setSaving(false);
    }
  };

  const savePolicy = async () => {
    if (!canManageSecurity || !configurationApi || !policy) return;
    const validation = validateSecurityPolicy(policy);
    if (validation.length) {
      setError(validation.join("；"));
      return;
    }
    setSaving(true);
    clearFeedback();
    try {
      const saved = await configurationApi.saveSecurityPolicy(policy);
      setPolicy(saved);
      setNotice(
        mode === "demo"
          ? "本地 安全策略已留版本审计；不会发送短信，也未接入正式 App。"
          : "安全策略已取得服务端回执；此操作不会发送短信。"
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "安全策略保存失败；未伪造成功。"
      );
    } finally {
      setSaving(false);
    }
  };

  const updatePolicy = (
    scene: SmsScene,
    key: keyof ConsumerSecurityPolicy["sms"][SmsScene],
    raw: string
  ) => {
    if (!policy) return;
    const value = Number(raw);
    setPolicy({
      ...policy,
      sms: { ...policy.sms, [scene]: { ...policy.sms[scene], [key]: value } },
    });
  };

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white shadow-sm"
      data-cy="consumer-accounts-panel"
    >
      <header className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <p className="text-xs font-semibold tracking-wide text-brand-700">
          账号与主体 / 平台受控入口
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">
          用户与账户
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          仅处理消费者账户、消费者
          KYC、合规版本与安全策略。不是活动角色申报、主办方认证或个人资料/收藏/想去/黑名单审批。
        </p>
      </header>
      <nav
        className="flex overflow-x-auto border-b border-slate-100 px-3"
        aria-label="用户与账户分区"
      >
        {tabs.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                clearFeedback();
              }}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${tab === item.id ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-5 sm:p-6">
        {mode === "demo" && (tab === "compliance" || tab === "security") && (
          <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm leading-6 text-brand-800">
            本地 仅允许保存合规/策略配置及版本审计；它不代表正式 App
            已上线，且不会生成真实用户、KYC、短信发送或服务端审批成功。
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {error}
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {notice}
          </div>
        )}

        {tab === "accounts" && (
          <div>
            {!canReadAccounts ? (
              <ClaimLock>
                缺少 privacy 权限声明，不能请求或展示消费者隐私详情。
              </ClaimLock>
            ) : (
              <>
                <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                  <label className="relative flex-1">
                    <span className="sr-only">检索脱敏账号</span>
                    <Search className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                    <input
                      className={`${field} pl-9`}
                      value={keyword}
                      onChange={event => setKeyword(event.target.value)}
                      placeholder="搜索脱敏手机号、账户 ID 或脱敏昵称"
                      onKeyDown={event => {
                        if (event.key === "Enter") void loadAccounts();
                      }}
                    />
                  </label>
                  <button
                    className={primaryButton}
                    type="button"
                    onClick={() => void loadAccounts()}
                    disabled={loading}
                  >
                    检索
                  </button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-[860px] w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="px-4 py-3">账户</th>
                        <th className="px-4 py-3">账号状态</th>
                        <th className="px-4 py-3">微信绑定</th>
                        <th className="px-4 py-3">资料完整度</th>
                        <th className="px-4 py-3">KYC</th>
                        <th className="px-4 py-3">最近认证</th>
                        <th className="px-4 py-3">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map(item => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">
                              {item.maskedNickname}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {item.maskedPhone} · {item.accountId}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill value={item.accountStatus} />
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill value={item.wechatBindingStatus} />
                          </td>
                          <td className="px-4 py-3">
                            {item.profileCompleteness}%
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill value={item.kycStatus} />
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatTime(item.lastAuthenticatedAt)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              className="text-sm font-semibold text-brand-700 hover:underline"
                              type="button"
                              onClick={() => void openAccount(item.id)}
                            >
                              查看详情
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!loading && !accounts.length && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-10 text-center text-slate-500"
                          >
                            暂无匹配的消费者账户。列表不会生成真实姓名、手机号或身份证样例。
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "kyc" && (
          <div>
            {!canReviewKyc ? (
              <ClaimLock>
                消费者 KYC 队列需要同时具备 privacy 与 identity_review
                权限；未声明时不加载队列、不允许敏感审批。
              </ClaimLock>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-slate-600">
                    仅消费者实名认证失败 / 人工复核 /
                    申诉对象；与活动角色申报、票务实名、主办方认证完全隔离。
                  </p>
                  <button
                    className={secondaryButton}
                    type="button"
                    onClick={() => void loadKyc()}
                    disabled={loading}
                  >
                    刷新队列
                  </button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-[840px] w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="px-4 py-3">脱敏账户</th>
                        <th className="px-4 py-3">证件</th>
                        <th className="px-4 py-3">状态</th>
                        <th className="px-4 py-3">失败原因</th>
                        <th className="px-4 py-3">申诉</th>
                        <th className="px-4 py-3">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kycQueue.map(item => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {item.maskedAccount}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.documentType} · {item.maskedDocument}
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill value={item.status} />
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.failureReasonCode ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.appeal
                              ? `${item.appeal.status} · ${item.appeal.summary}`
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              className="text-sm font-semibold text-brand-700 hover:underline"
                              type="button"
                              onClick={() => void openKyc(item.id)}
                            >
                              复核 / 申诉详情
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!loading && !kycQueue.length && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-10 text-center text-slate-500"
                          >
                            当前没有待人工复核的消费者 KYC。
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "compliance" && (
          <div>
            {!canManageCompliance ? (
              <ClaimLock>
                缺少 compliance 权限声明，不能读取或修改协议、隐私、实名、SDK
                清单或关于文档。
              </ClaimLock>
            ) : (
              <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
                    版本记录
                  </div>
                  {documents.length ? (
                    <ul className="divide-y divide-slate-100">
                      {documents.map(doc => (
                        <li
                          key={doc.id}
                          className="flex items-center justify-between gap-3 px-4 py-3"
                        >
                          <div>
                            <p className="font-medium text-slate-900">
                              {doc.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {doc.kind} · v{doc.version} ·{" "}
                              {formatTime(doc.effectiveAt)} · 审计{" "}
                              {doc.versionAudit.length} 条
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusPill value={doc.status} />
                            <button
                              className="text-sm font-semibold text-brand-700 hover:underline"
                              type="button"
                              onClick={() => setDocumentDraft({ ...doc })}
                            >
                              编辑
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-4 py-10 text-center text-sm text-slate-500">
                      尚无版本记录；不会展示虚构协议。
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-900">文档草稿</h2>
                    <button
                      className="text-sm font-semibold text-brand-700 hover:underline"
                      type="button"
                      onClick={() => setDocumentDraft(emptyDocument())}
                    >
                      新建
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm text-slate-600">
                      类型
                      <select
                        className={field}
                        value={documentDraft.kind}
                        onChange={event =>
                          setDocumentDraft({
                            ...documentDraft,
                            kind: event.target.value as ComplianceDocumentKind,
                          })
                        }
                      >
                        {(
                          [
                            "terms",
                            "privacy",
                            "kyc",
                            "sdk",
                            "about",
                          ] as ComplianceDocumentKind[]
                        ).map(kind => (
                          <option key={kind} value={kind}>
                            {kind}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm text-slate-600">
                      版本
                      <input
                        className={field}
                        value={documentDraft.version}
                        onChange={event =>
                          setDocumentDraft({
                            ...documentDraft,
                            version: event.target.value,
                          })
                        }
                        placeholder="1.0.0"
                      />
                    </label>
                    <label className="text-sm text-slate-600 sm:col-span-2">
                      标题
                      <input
                        className={field}
                        value={documentDraft.title}
                        onChange={event =>
                          setDocumentDraft({
                            ...documentDraft,
                            title: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="text-sm text-slate-600">
                      生效时间
                      <input
                        className={field}
                        type="datetime-local"
                        value={documentDraft.effectiveAt?.slice(0, 16) ?? ""}
                        onChange={event =>
                          setDocumentDraft({
                            ...documentDraft,
                            effectiveAt: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="text-sm text-slate-600">
                      语言
                      <input
                        className={field}
                        value={documentDraft.locale}
                        onChange={event =>
                          setDocumentDraft({
                            ...documentDraft,
                            locale: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="text-sm text-slate-600 sm:col-span-2">
                      公开链接（https）
                      <input
                        className={field}
                        value={documentDraft.contentUrl ?? ""}
                        onChange={event =>
                          setDocumentDraft({
                            ...documentDraft,
                            contentUrl: event.target.value,
                          })
                        }
                        placeholder="https://..."
                      />
                    </label>
                    <label className="text-sm text-slate-600 sm:col-span-2">
                      正文
                      <textarea
                        className={textarea}
                        value={documentDraft.contentBody ?? ""}
                        onChange={event =>
                          setDocumentDraft({
                            ...documentDraft,
                            contentBody: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    发布前校验版本、生效时间、正文/链接与乱码。用户同意记录由服务端按版本留痕；这里不审批用户自助同意。
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className={primaryButton}
                      type="button"
                      disabled={saving}
                      onClick={() => void saveDocument()}
                    >
                      保存草稿
                    </button>
                    <button
                      className={secondaryButton}
                      type="button"
                      disabled={saving || !documentDraft.id}
                      onClick={() => void publishDocument()}
                    >
                      发布 / 设定生效
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "security" && (
          <div>
            {!canManageSecurity ? (
              <ClaimLock>
                缺少 privacy 与 security
                权限声明，不能读取策略、变更账户状态或强制解除第三方绑定。
              </ClaimLock>
            ) : (
              <>
                {!policy ? (
                  <div className="rounded-xl border border-slate-200 p-5">
                    <p className="text-sm leading-6 text-slate-600">
                      尚未读取到安全策略。可新建未保存配置，或重新请求服务端；不会显示密码、验证码、供应商密钥，也不会伪造短信已发送。
                    </p>
                    <div className="mt-4 flex gap-2">
                      <button
                        className={secondaryButton}
                        type="button"
                        onClick={() => void loadPolicy()}
                        disabled={loading}
                      >
                        重新请求
                      </button>
                      <button
                        className={primaryButton}
                        type="button"
                        onClick={() => {
                          setPolicy(emptyPolicy());
                          clearFeedback();
                        }}
                      >
                        新建策略草稿
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-sm leading-6 text-slate-600">
                        各 SMS
                        场景严格隔离：登录、注册、找回密码与绑定手机分别频控。配置仅更新规则，不会调用短信发送接口。
                      </p>
                      <label className="w-40 text-sm text-slate-600">
                        策略版本
                        <input
                          className={field}
                          value={policy.version}
                          onChange={event =>
                            setPolicy({
                              ...policy,
                              version: event.target.value,
                            })
                          }
                          placeholder="1.0.0"
                        />
                      </label>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="min-w-[980px] w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-500">
                          <tr>
                            <th className="px-3 py-3">场景</th>
                            <th className="px-3 py-3">重发秒数</th>
                            <th className="px-3 py-3">有效秒数</th>
                            <th className="px-3 py-3">尝试次数</th>
                            <th className="px-3 py-3">手机号/日</th>
                            <th className="px-3 py-3">IP/日</th>
                            <th className="px-3 py-3">设备/日</th>
                            <th className="px-3 py-3">锁定分钟</th>
                          </tr>
                        </thead>
                        <tbody>
                          {SMS_SCENES.map(scene => (
                            <tr
                              key={scene}
                              className="border-t border-slate-100"
                            >
                              <td className="px-3 py-3 font-medium text-slate-900">
                                {scene}
                              </td>
                              {(
                                [
                                  "resendAfterSeconds",
                                  "expiresInSeconds",
                                  "maxAttempts",
                                  "maxPerPhonePerDay",
                                  "maxPerIpPerDay",
                                  "maxPerDevicePerDay",
                                  "lockMinutes",
                                ] as Array<
                                  keyof ConsumerSecurityPolicy["sms"][SmsScene]
                                >
                              ).map(key => (
                                <td key={key} className="px-2 py-2">
                                  <input
                                    className="h-9 w-24 rounded-md border border-slate-200 px-2 text-sm"
                                    type="number"
                                    min="1"
                                    value={policy.sms[scene][key]}
                                    onChange={event =>
                                      updatePolicy(
                                        scene,
                                        key,
                                        event.target.value
                                      )
                                    }
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      策略版本审计 {policy.versionAudit?.length ?? 0}{" "}
                      条由服务端保存；不在前端展示或接收密码、验证码、token、API
                      key 或供应商密钥。
                    </p>
                    <button
                      className={`${primaryButton} mt-4`}
                      type="button"
                      disabled={saving}
                      onClick={() => void savePolicy()}
                    >
                      保存策略版本
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {detail && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/35"
          role="dialog"
          aria-modal="true"
          aria-label="消费者账户详情"
        >
          <aside className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-semibold text-brand-700">
                  脱敏消费者详情
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  {detail.maskedNickname} · {detail.accountId}
                </h2>
              </div>
              <button
                className={secondaryButton}
                type="button"
                onClick={() => {
                  setDetail(null);
                  setReason("");
                }}
              >
                关闭
              </button>
            </div>
            <div className="space-y-5 p-5">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
                <div>
                  <span className="text-slate-500">手机号</span>
                  <p className="mt-1 font-medium">{detail.maskedPhone}</p>
                </div>
                <div>
                  <span className="text-slate-500">账户状态</span>
                  <p className="mt-1">
                    <StatusPill value={detail.accountStatus} />
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">资料完整度</span>
                  <p className="mt-1 font-medium">
                    {detail.profileCompleteness}% · 缺{" "}
                    {detail.profile.missingFields.join("、") || "无"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">KYC</span>
                  <p className="mt-1">
                    <StatusPill value={detail.kycStatus} />
                  </p>
                </div>
              </div>
              <section>
                <h3 className="font-semibold text-slate-900">
                  绑定与个人二维码
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  个人二维码仅 codeType=profile
                  状态查看，绝不作为核销码或写入入场记录。
                </p>
                <div className="mt-3 space-y-2">
                  {detail.bindings.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm"
                    >
                      <span>
                        {item.provider} · {item.maskedExternalId}
                      </span>
                      <div className="flex items-center gap-2">
                        <StatusPill value={item.status} />
                        {canManageSecurity && item.status === "bound" && (
                          <button
                            className="text-sm font-semibold text-rose-700 hover:underline"
                            type="button"
                            disabled={saving || !reason.trim()}
                            onClick={() => void unbind(item.id)}
                          >
                            强制解除
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="rounded-lg border border-slate-200 p-3 text-sm">
                    二维码：
                    <StatusPill value={detail.profileQr.status} />{" "}
                    <span className="ml-2 text-slate-600">
                      codeType={detail.profileQr.codeType}
                    </span>
                  </div>
                </div>
              </section>
              <section>
                <h3 className="font-semibold text-slate-900">安全事件</h3>
                <ul className="mt-3 space-y-2">
                  {detail.securityEvents.map(event => (
                    <li
                      key={event.id}
                      className="rounded-lg border border-slate-200 p-3 text-sm"
                    >
                      <div className="flex justify-between gap-3">
                        <span className="font-medium text-slate-800">
                          {event.type}
                        </span>
                        <StatusPill value={event.result} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatTime(event.occurredAt)} · 审计 {event.auditId}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
              {canManageSecurity && (
                <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h3 className="font-semibold text-amber-900">受控安全处置</h3>
                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    需要理由并以服务端回执为准；不会处理用户自助资料、收藏、想去、黑名单或清缓存。
                  </p>
                  <textarea
                    className={`${textarea} mt-3`}
                    value={reason}
                    onChange={event => setReason(event.target.value)}
                    placeholder="填写安全处置理由（必填）"
                  />
                  <button
                    className={`${secondaryButton} mt-3`}
                    type="button"
                    disabled={saving || !reason.trim()}
                    onClick={() => void changeAccountStatus()}
                  >
                    {detail.accountStatus === "suspended"
                      ? "恢复账户"
                      : "暂停账户"}
                  </button>
                </section>
              )}
            </div>
          </aside>
        </div>
      )}

      {kycDetail && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="消费者 KYC 复核"
        >
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-semibold text-brand-700">
                  消费者 KYC · 非活动角色审核
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  {kycDetail.maskedAccount}
                </h2>
              </div>
              <button
                className={secondaryButton}
                type="button"
                onClick={() => {
                  setKycDetail(null);
                  setReason("");
                }}
              >
                关闭
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
                <div>
                  证件：{kycDetail.documentType} · {kycDetail.maskedDocument}
                </div>
                <div>
                  状态：
                  <StatusPill value={kycDetail.status} />
                </div>
                <div>规则版本：{kycDetail.ruleVersion}</div>
                <div>失败码：{kycDetail.failureReasonCode ?? "—"}</div>
              </div>
              {kycDetail.appeal && (
                <section className="rounded-xl border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900">申诉详情</h3>
                  <p className="mt-2 text-sm text-slate-700">
                    {kycDetail.appeal.summary}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {kycDetail.appeal.status} ·{" "}
                    {formatTime(kycDetail.appeal.submittedAt)}
                  </p>
                </section>
              )}
              <section>
                <h3 className="font-semibold text-slate-900">审计记录</h3>
                <ul className="mt-2 space-y-2">
                  {kycDetail.audit.map(entry => (
                    <li
                      key={entry.id}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{entry.action}</span>
                      <span className="ml-2 text-slate-500">
                        {entry.actorType} · {formatTime(entry.occurredAt)}
                      </span>
                      {entry.reason && (
                        <p className="mt-1 text-slate-600">{entry.reason}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-xl border border-brand-200 bg-brand-50 p-4">
                <label className="text-sm font-medium text-slate-800">
                  办理理由（必填）
                  <textarea
                    className={`${textarea} mt-2`}
                    value={reason}
                    onChange={event => setReason(event.target.value)}
                    placeholder="说明依据；决定将写入服务端 KYC 审计"
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className={primaryButton}
                    type="button"
                    disabled={saving || !reason.trim()}
                    onClick={() => void decideKyc("verified")}
                  >
                    通过
                  </button>
                  <button
                    className={secondaryButton}
                    type="button"
                    disabled={saving || !reason.trim()}
                    onClick={() => void decideKyc("changes_required")}
                  >
                    退回补充
                  </button>
                  <button
                    className={secondaryButton}
                    type="button"
                    disabled={saving || !reason.trim()}
                    onClick={() => void decideKyc("review_required")}
                  >
                    转人工复核
                  </button>
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 disabled:opacity-45"
                    type="button"
                    disabled={saving || !reason.trim()}
                    onClick={() => void decideKyc("rejected")}
                  >
                    驳回申诉
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ConsumerAccountsPanel;
