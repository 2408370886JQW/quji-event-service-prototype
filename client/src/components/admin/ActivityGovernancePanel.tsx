import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArchiveX,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileClock,
  Gavel,
  Globe2,
  History,
  LoaderCircle,
  LockKeyhole,
  Megaphone,
  RefreshCcw,
  Save,
  Send,
  ShieldAlert,
  ShieldCheck,
  Undo2,
  UsersRound,
  XCircle,
} from "lucide-react";
import { isApiDataMode, requestApi } from "@/lib/api";
import {
  activityGovernanceStorageKey,
  applyDemoGovernance,
  assertCanMutate,
  assertEligibilityResponseScope,
  assertKnownEligibility,
  auditLogsFromApi,
  createActivityGovernance,
  governanceFromApi,
  loadDemoGovernance,
  saveDemoGovernance,
  validateGovernance,
  writeGovernanceThroughApi,
  type ActivityGovernanceApiPayload,
  type ActivityGovernanceConfig,
  type ActivityGovernanceRole,
  type AppealCase,
  type EligibilityRecord,
  type GovernanceCommand,
} from "./activityGovernance";

export type ActivityGovernancePanelProps = {
  activityId: string;
  role: "platform" | "organizer" | "culture";
};

const inputClass =
  "mt-1.5 block h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-[14px] outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";
const textareaClass =
  "mt-1.5 block min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[14px] leading-6 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";
const primaryButton =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-brand-grad px-4 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55";
const outlineButton =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-brand-200 bg-white px-4 text-[14px] font-semibold text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-55";

const fieldOptions = [
  ["title", "标题"],
  ["summary", "摘要"],
  ["cover", "封面"],
  ["schedule", "场次范围"],
  ["venue", "场地"],
  ["admission", "准入说明"],
] as const;

function messageFor(command: GovernanceCommand, api: boolean) {
  const verb: Record<GovernanceCommand, string> = {
    save: "配置已保存",
    publish: "用户端发布已提交",
    withdraw: "发布撤回已提交",
    publishRule: "准入规则已发布",
    end: "活动结束已提交",
    cancel: "活动取消已提交",
  };
  return `${verb[command]}${api ? "，已以服务端回执为准" : "（Demo 配置）"}`;
}

function errorMessage(problem: unknown) {
  return problem instanceof Error
    ? problem.message
    : "当前操作未完成，请稍后重试";
}

function scopePath(activityId: string, suffix = "") {
  return `/activities/${encodeURIComponent(activityId)}${suffix}`;
}

function statusTone(value: string) {
  if (["published", "valid", "resolved"].includes(value))
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (["cancelled", "revoked", "expired"].includes(value))
    return "bg-rose-50 text-rose-700 border-rose-200";
  if (["expiring", "rule_changed", "withdrawn"].includes(value))
    return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="text-[14px] font-semibold text-slate-800">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-[12px] text-rose-600">{error}</span>
      ) : null}
      {!error && hint ? (
        <span className="mt-1 block text-[12px] leading-5 text-slate-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/**
 * Embeddable activity-detail panel. API mode has no mock/localStorage fallback; demo mode
 * only stores versioned configuration keyed by the exact activity ID.
 */
export function ActivityGovernancePanel({
  activityId,
  role,
}: ActivityGovernancePanelProps) {
  const apiMode = isApiDataMode();
  const [draft, setDraft] = useState<ActivityGovernanceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState<GovernanceCommand | null>(null);
  const [eligibilities, setEligibilities] = useState<
    EligibilityRecord[] | null
  >(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityError, setEligibilityError] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [appeals, setAppeals] = useState<AppealCase[] | null>(null);
  const [appealLoading, setAppealLoading] = useState(false);
  const [appealError, setAppealError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    setActionError("");
    setNotice("");
    try {
      if (!apiMode) {
        setDraft(loadDemoGovernance(activityId));
        return;
      }
      const [activity, auditPayload] = await Promise.all([
        requestApi<ActivityGovernanceApiPayload>(scopePath(activityId)),
        requestApi<unknown>(scopePath(activityId, "/audit-logs")),
      ]);
      const next = governanceFromApi(activityId, activity);
      next.audit = auditLogsFromApi(
        activityId,
        auditPayload as Parameters<typeof auditLogsFromApi>[1]
      );
      setDraft(next);
    } catch (problem) {
      // API mode intentionally keeps this panel empty: no demo configuration is substituted.
      setDraft(null);
      setLoadError(errorMessage(problem));
    } finally {
      setLoading(false);
    }
  }, [activityId, apiMode]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const update = (
    updater: (current: ActivityGovernanceConfig) => ActivityGovernanceConfig
  ) => {
    setNotice("");
    setActionError("");
    setDraft(current => (current ? updater(current) : current));
  };

  const commit = async (command: GovernanceCommand) => {
    if (!draft || saving) return;
    setActionError("");
    setNotice("");
    try {
      assertCanMutate(role, command);
      setSaving(command);
      if (!apiMode) {
        const next = applyDemoGovernance(draft, {
          activityId,
          expectedVersion: draft.version,
          role,
          command,
          candidate: draft,
        });
        saveDemoGovernance(next);
        setDraft(next);
      } else {
        const next = await writeGovernanceThroughApi(
          activityId,
          draft,
          command,
          body =>
            requestApi<ActivityGovernanceApiPayload>(scopePath(activityId), {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            })
        );
        // The in-memory draft is updated only after the authoritative PATCH succeeds.
        setDraft(next);
        try {
          const logPayload = await requestApi<unknown>(
            scopePath(activityId, "/audit-logs")
          );
          setDraft(current =>
            current
              ? {
                  ...current,
                  audit: auditLogsFromApi(
                    activityId,
                    logPayload as Parameters<typeof auditLogsFromApi>[1]
                  ),
                }
              : current
          );
        } catch (auditProblem) {
          setActionError(
            `配置已由服务端保存，但审计记录刷新失败：${errorMessage(auditProblem)}`
          );
        }
      }
      setNotice(messageFor(command, apiMode));
    } catch (problem) {
      setActionError(errorMessage(problem));
    } finally {
      setSaving(null);
    }
  };

  const loadEligibility = async () => {
    setEligibilityError("");
    setEligibilityLoading(true);
    try {
      if (!apiMode) {
        setEligibilities([]);
        setNotice(
          "Demo 不生成或签发资格；资格列表保持为空，不能作为入场依据。"
        );
        return;
      }
      const records = await requestApi<EligibilityRecord[]>(
        scopePath(activityId, "/eligibilities")
      );
      setEligibilities(assertEligibilityResponseScope(activityId, records));
    } catch (problem) {
      setEligibilities(null);
      setEligibilityError(errorMessage(problem));
    } finally {
      setEligibilityLoading(false);
    }
  };

  const revokeEligibility = async () => {
    if (!revokeTarget || !eligibilities || !revokeReason.trim()) {
      setEligibilityError("请填写撤销原因，并从当前活动资格列表中选择记录。");
      return;
    }
    try {
      assertCanMutate(role, "revoke");
      assertKnownEligibility(activityId, eligibilities, revokeTarget);
      if (!apiMode) {
        throw new Error(
          "Demo 模式不会伪造资格撤销成功；请接入权威资格服务后办理。"
        );
      }
      await requestApi<unknown>(
        scopePath(
          activityId,
          `/eligibilities/${encodeURIComponent(revokeTarget)}/revoke`
        ),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: revokeReason.trim() }),
        }
      );
      setRevokeTarget(null);
      setRevokeReason("");
      setNotice("资格撤销已收到服务端成功回执，正在刷新权威资格列表。");
      await loadEligibility();
    } catch (problem) {
      setEligibilityError(errorMessage(problem));
    }
  };

  const loadAppeals = async () => {
    setAppealError("");
    setAppealLoading(true);
    try {
      if (!apiMode) {
        setAppeals([]);
        setNotice(
          "Demo 不生成用户异议；异议仅由 App 用户端发起，后台只读取权威案件。"
        );
        return;
      }
      const rows = await requestApi<AppealCase[]>(
        scopePath(activityId, "/appeals")
      );
      rows.forEach(row => {
        if (row.activityId !== activityId)
          throw new Error("异议接口返回了其他活动的数据，已拒绝展示");
      });
      setAppeals(rows);
    } catch (problem) {
      setAppeals(null);
      setAppealError(errorMessage(problem));
    } finally {
      setAppealLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-[14px] text-slate-500">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        正在读取活动治理配置…
      </div>
    );
  }
  if (loadError || !draft) {
    return (
      <section
        className="rounded-xl border border-rose-200 bg-rose-50 p-5"
        data-cy="activity-governance-error"
      >
        <div className="flex items-start gap-3 text-rose-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <strong className="block text-[15px]">活动治理配置无法读取</strong>
            <p className="mt-1 text-[14px] leading-6">
              {loadError || "未取得当前活动的权威配置"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          className={`${outlineButton} mt-4`}
        >
          <RefreshCcw className="h-4 w-4" />
          重试
        </button>
      </section>
    );
  }

  const canEdit = role !== "culture";
  const canLifecycle = role === "platform";
  const errors = validateGovernance(draft);
  const updatePublication = (
    patch: Partial<ActivityGovernanceConfig["publication"]>
  ) =>
    update(current => ({
      ...current,
      publication: { ...current.publication, ...patch },
    }));
  const updateAdmission = (
    patch: Partial<ActivityGovernanceConfig["admission"]>
  ) =>
    update(current => ({
      ...current,
      admission: { ...current.admission, ...patch },
    }));
  const updateLifecycle = (
    patch: Partial<ActivityGovernanceConfig["lifecycle"]>
  ) =>
    update(current => ({
      ...current,
      lifecycle: { ...current.lifecycle, ...patch },
    }));

  return (
    <div className="grid gap-5" data-cy="activity-governance-panel">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[13px] font-semibold text-slate-500">
            活动档案 · 用户端发布与准入治理
          </div>
          <h2 className="mt-1 text-[23px] font-semibold tracking-[-0.03em] text-slate-900">
            用户端发布、准入规则与活动影响
          </h2>
          <p className="mt-2 max-w-3xl text-[14px] leading-6 text-slate-600">
            配置只作用于{" "}
            <span className="font-semibold text-slate-800">{activityId}</span>
            。主办方仅能在服务端已授权活动内编辑；文旅角色只读，最终范围与权限由服务端校验。
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${statusTone(draft.publication.status)}`}
        >
          <FileClock className="h-3.5 w-3.5" />
          配置 v{draft.version} ·{" "}
          {draft.publication.status === "published"
            ? "已发布"
            : draft.publication.status === "withdrawn"
              ? "已撤回"
              : "未发布"}
        </span>
      </header>

      {!apiMode ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-6 text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Demo 配置，不代表 App 已上线。</strong>{" "}
            本地仅保存当前活动的配置与操作记录；不会创建公开页、资格、退款、订单或任何资金完成状态。
          </div>
        </div>
      ) : null}
      {notice ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4" />
          {notice}
        </div>
      ) : null}
      {actionError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] leading-5 text-rose-800"
        >
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {actionError}
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[16px] font-semibold text-slate-900">
              <Megaphone className="h-5 w-5 text-brand-600" />
              用户端发布设置
            </div>
            <p className="mt-1 text-[13px] leading-5 text-slate-500">
              定义用户端最小公开投影、登录策略、封面和分享权限；不展示参与者、订单或资格等敏感数据。
            </p>
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold ${statusTone(draft.publication.status)}`}
          >
            {draft.publication.status === "published"
              ? "用户端已发布"
              : draft.publication.status === "withdrawn"
                ? "已撤回"
                : "草稿"}
          </span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="用户端标题" error={errors["publication.title"]}>
            <input
              disabled={!canEdit}
              value={draft.publication.title}
              onChange={event =>
                updatePublication({ title: event.target.value })
              }
              className={inputClass}
              maxLength={80}
              placeholder="例如：2026 趣集漫展"
            />
          </Field>
          <Field
            label="封面 URL"
            hint="仅支持受控的 http/https 资源地址"
            error={errors["publication.coverUrl"]}
          >
            <input
              disabled={!canEdit}
              value={draft.publication.coverUrl}
              onChange={event =>
                updatePublication({ coverUrl: event.target.value })
              }
              className={inputClass}
              placeholder="https://…/cover.webp"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="用户端摘要" error={errors["publication.summary"]}>
              <textarea
                disabled={!canEdit}
                value={draft.publication.summary}
                onChange={event =>
                  updatePublication({ summary: event.target.value })
                }
                className={textareaClass}
                maxLength={240}
                placeholder="说明活动亮点、时间和必要的参与提示"
              />
            </Field>
          </div>
          <div>
            <span className="text-[14px] font-semibold text-slate-800">
              访问策略
            </span>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => updatePublication({ visibility: "public" })}
                className={`h-10 rounded-md border text-[13px] font-semibold ${draft.publication.visibility === "public" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 text-slate-600"}`}
              >
                <Globe2 className="mr-1 inline h-4 w-4" />
                公开访问
              </button>
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => updatePublication({ visibility: "login" })}
                className={`h-10 rounded-md border text-[13px] font-semibold ${draft.publication.visibility === "login" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 text-slate-600"}`}
              >
                <LockKeyhole className="mr-1 inline h-4 w-4" />
                登录后可见
              </button>
            </div>
          </div>
          <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-[13px] leading-5 text-slate-700">
            <input
              disabled={!canEdit}
              type="checkbox"
              checked={draft.publication.allowShare}
              onChange={event =>
                updatePublication({ allowShare: event.target.checked })
              }
              className="mt-0.5 h-4 w-4 accent-brand-600"
            />
            <span>
              <strong className="block text-slate-800">允许受控分享</strong>
              分享链接仍遵从公开/登录策略，撤回后应立即失效。
            </span>
          </label>
        </div>
        <div className="mt-4">
          <div className="text-[14px] font-semibold text-slate-800">
            用户端可见字段
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {fieldOptions.map(([key, label]) => (
              <label
                key={key}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] text-slate-700"
              >
                <input
                  disabled={!canEdit}
                  type="checkbox"
                  checked={draft.publication.visibleFields.includes(key)}
                  onChange={event =>
                    updatePublication({
                      visibleFields: event.target.checked
                        ? Array.from(
                            new Set([...draft.publication.visibleFields, key])
                          )
                        : draft.publication.visibleFields.filter(
                            item => item !== key
                          ),
                    })
                  }
                  className="h-3.5 w-3.5 accent-brand-600"
                />
                {label}
              </label>
            ))}
          </div>
          {errors["publication.visibleFields"] ? (
            <p className="mt-1 text-[12px] text-rose-600">
              {errors["publication.visibleFields"]}
            </p>
          ) : null}
        </div>
        {draft.publication.status === "published" ? (
          <div className="mt-4">
            <Field
              label="撤回原因"
              hint="撤回不会改变已支付订单、退款或资金状态；这些由既有权威对象处理。"
            >
              <input
                disabled={!canEdit}
                value={draft.publication.withdrawReason || ""}
                onChange={event =>
                  updatePublication({ withdrawReason: event.target.value })
                }
                className={inputClass}
                placeholder="例如：活动信息需更新"
              />
            </Field>
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={!canEdit || saving !== null}
            onClick={() => void commit("save")}
            className={outlineButton}
          >
            <Save className="h-4 w-4" />
            保存配置
          </button>
          <button
            type="button"
            disabled={
              !canEdit ||
              saving !== null ||
              draft.publication.status === "published"
            }
            onClick={() => void commit("publish")}
            className={primaryButton}
          >
            <Send className="h-4 w-4" />
            {saving === "publish" ? "发布中…" : "发布用户端"}
          </button>
          {draft.publication.status === "published" ? (
            <button
              type="button"
              disabled={!canEdit || saving !== null}
              onClick={() => void commit("withdraw")}
              className={outlineButton}
            >
              <Undo2 className="h-4 w-4" />
              撤回发布
            </button>
          ) : null}
          <span className="self-center text-[12px] text-slate-500">
            发布版本 v{draft.version} ·{" "}
            {draft.publication.publishedAt
              ? `最近发布 ${draft.publication.publishedAt}`
              : "尚未发布"}
          </span>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-brand-600" />
          <div>
            <h3 className="text-[16px] font-semibold text-slate-900">
              活动准入规则
            </h3>
            <p className="mt-1 text-[13px] leading-5 text-slate-500">
              发布后冻结规则版本；消费者提交应记录承诺时间、规则版本和活动/场次范围。本面板不会代替用户提交或签发资格。
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="flex items-start gap-3 rounded-md border border-slate-200 p-3 text-[13px] leading-5 text-slate-700">
            <input
              disabled={!canEdit}
              type="checkbox"
              checked={draft.admission.coserReviewRequired}
              onChange={event =>
                updateAdmission({ coserReviewRequired: event.target.checked })
              }
              className="mt-0.5 h-4 w-4 accent-brand-600"
            />
            <span>
              <strong className="block text-slate-800">Coser 需两级审核</strong>
              主办方初审后由平台复核，文旅仅查看脱敏结果。
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-md border border-slate-200 p-3 text-[13px] leading-5 text-slate-700">
            <input
              disabled={!canEdit}
              type="checkbox"
              checked={draft.admission.ordinaryAttireAllowed}
              onChange={event =>
                updateAdmission({ ordinaryAttireAllowed: event.target.checked })
              }
              className="mt-0.5 h-4 w-4 accent-brand-600"
            />
            <span>
              <strong className="block text-slate-800">允许普通服装承诺</strong>
              仅允许用户自助确认，不建立人工普通服装审批。
            </span>
          </label>
          <Field label="道具限制">
            <select
              disabled={!canEdit}
              value={draft.admission.propPolicy}
              onChange={event =>
                updateAdmission({
                  propPolicy: event.target
                    .value as ActivityGovernanceConfig["admission"]["propPolicy"],
                })
              }
              className={inputClass}
            >
              <option value="declared_only">必须申报后携带</option>
              <option value="restricted">允许受限道具</option>
              <option value="prohibited">禁止携带道具</option>
            </select>
          </Field>
          <Field label="规则版本" error={errors["admission.ruleVersion"]}>
            <input
              disabled={!canEdit}
              value={draft.admission.ruleVersion}
              onChange={event =>
                updateAdmission({ ruleVersion: event.target.value })
              }
              className={inputClass}
              placeholder="RULE-2026-11-v1"
            />
          </Field>
          {draft.admission.propPolicy === "restricted" ? (
            <div className="md:col-span-2">
              <Field
                label="道具限制说明"
                error={errors["admission.propRestrictionNote"]}
              >
                <textarea
                  disabled={!canEdit}
                  value={draft.admission.propRestrictionNote}
                  onChange={event =>
                    updateAdmission({ propRestrictionNote: event.target.value })
                  }
                  className={textareaClass}
                  placeholder="说明禁止、尺寸、材质、风险分级和现场复验要求"
                />
              </Field>
            </div>
          ) : null}
          {draft.admission.ordinaryAttireAllowed ? (
            <div className="md:col-span-2">
              <Field
                label="普通服装承诺正文"
                error={errors["admission.pledgeText"]}
              >
                <textarea
                  disabled={!canEdit}
                  value={draft.admission.pledgeText}
                  onChange={event =>
                    updateAdmission({ pledgeText: event.target.value })
                  }
                  className={textareaClass}
                  placeholder="用户在 App 中确认的版本化承诺"
                />
              </Field>
            </div>
          ) : null}
          <div>
            <span className="text-[14px] font-semibold text-slate-800">
              适用范围
            </span>
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                disabled={!canEdit}
                onClick={() =>
                  updateAdmission({ sessionScope: "all", sessionIds: [] })
                }
                className={`h-10 flex-1 rounded-md border text-[13px] font-semibold ${draft.admission.sessionScope === "all" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 text-slate-600"}`}
              >
                全活动场次
              </button>
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => updateAdmission({ sessionScope: "selected" })}
                className={`h-10 flex-1 rounded-md border text-[13px] font-semibold ${draft.admission.sessionScope === "selected" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 text-slate-600"}`}
              >
                指定场次
              </button>
            </div>
          </div>
          {draft.admission.sessionScope === "selected" ? (
            <Field
              label="场次 ID（逗号分隔）"
              error={errors["admission.sessionIds"]}
            >
              <input
                disabled={!canEdit}
                value={draft.admission.sessionIds.join(", ")}
                onChange={event =>
                  updateAdmission({
                    sessionIds: event.target.value
                      .split(",")
                      .map(item => item.trim())
                      .filter(Boolean),
                  })
                }
                className={inputClass}
                placeholder="2026-11-01-AM, 2026-11-01-PM"
              />
            </Field>
          ) : (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[13px] leading-5 text-slate-600">
              当前规则适用于该活动全部场次。服务端仍须按场次和票种再次校验。
            </div>
          )}
          <Field label="生效日期">
            <input
              disabled={!canEdit}
              type="date"
              value={draft.admission.validFrom}
              onChange={event =>
                updateAdmission({ validFrom: event.target.value })
              }
              className={inputClass}
            />
          </Field>
          <Field label="有效期结束" error={errors["admission.validUntil"]}>
            <input
              disabled={!canEdit}
              type="date"
              value={draft.admission.validUntil}
              onChange={event =>
                updateAdmission({ validUntil: event.target.value })
              }
              className={inputClass}
            />
          </Field>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={!canEdit || saving !== null}
            onClick={() => void commit("save")}
            className={outlineButton}
          >
            <Save className="h-4 w-4" />
            保存规则
          </button>
          <button
            type="button"
            disabled={!canEdit || saving !== null}
            onClick={() => void commit("publishRule")}
            className={primaryButton}
          >
            <ClipboardCheck className="h-4 w-4" />
            {saving === "publishRule" ? "发布中…" : "发布准入规则"}
          </button>
          <span className="self-center text-[12px] text-slate-500">
            {draft.admission.status === "published"
              ? `已发布 ${draft.admission.ruleVersion}`
              : "未发布规则"}
          </span>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-2">
          <ArchiveX className="mt-0.5 h-5 w-5 text-brand-600" />
          <div>
            <h3 className="text-[16px] font-semibold text-slate-900">
              结束或取消活动
            </h3>
            <p className="mt-1 text-[13px] leading-5 text-slate-500">
              仅平台可办理。必须记录原因和影响确认；本操作不会伪造退款完成、资金到账或更改既有订单冻结快照。
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="结束/取消原因">
            <textarea
              disabled={!canLifecycle}
              value={draft.lifecycle.reason}
              onChange={event =>
                updateLifecycle({ reason: event.target.value })
              }
              className={textareaClass}
              placeholder="说明状态变更的业务原因"
            />
          </Field>
          <Field label="受影响场次（逗号分隔）">
            <input
              disabled={!canLifecycle}
              value={draft.lifecycle.affectedSessions.join(", ")}
              onChange={event =>
                updateLifecycle({
                  affectedSessions: event.target.value
                    .split(",")
                    .map(item => item.trim())
                    .filter(Boolean),
                })
              }
              className={inputClass}
              placeholder="未填写时由服务端计算影响范围"
            />
          </Field>
        </div>
        <label className="mt-4 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-[13px] leading-5 text-amber-900">
          <input
            disabled={!canLifecycle}
            type="checkbox"
            checked={draft.lifecycle.impactConfirmed}
            onChange={event =>
              updateLifecycle({ impactConfirmed: event.target.checked })
            }
            className="mt-0.5 h-4 w-4 accent-brand-600"
          />
          <span>
            <strong className="block">我已确认影响范围</strong>
            取消/结束后的停售、通知及逐票退款任务须交给既有票务/退款权威对象处理；不能以本面板状态代替渠道退款回执。
          </span>
        </label>
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <span
            className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold ${statusTone(draft.lifecycle.state)}`}
          >
            {draft.lifecycle.state === "active"
              ? "活动进行中"
              : draft.lifecycle.state === "ended"
                ? "活动已结束"
                : "活动已取消"}
          </span>
          <button
            type="button"
            disabled={
              !canLifecycle ||
              saving !== null ||
              draft.lifecycle.state !== "active"
            }
            onClick={() => void commit("end")}
            className={outlineButton}
          >
            <CheckCircle2 className="h-4 w-4" />
            结束活动
          </button>
          <button
            type="button"
            disabled={
              !canLifecycle ||
              saving !== null ||
              draft.lifecycle.state !== "active"
            }
            onClick={() => void commit("cancel")}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-rose-200 bg-white px-4 text-[14px] font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <ArchiveX className="h-4 w-4" />
            取消活动
          </button>
          {!canLifecycle ? (
            <span className="text-[12px] text-slate-500">
              文旅/主办方不可办理生命周期变更
            </span>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <UsersRound className="mt-0.5 h-5 w-5 text-brand-600" />
            <div>
              <h3 className="text-[16px] font-semibold text-slate-900">
                资格状态与审核异议
              </h3>
              <p className="mt-1 text-[13px] leading-5 text-slate-500">
                仅读取当前活动的权威资格/异议记录。没有真实数据时显示空态，不生成用户、资格或异议样例。
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={eligibilityLoading}
              onClick={() => void loadEligibility()}
              className={outlineButton}
            >
              <RefreshCcw
                className={`h-4 w-4 ${eligibilityLoading ? "animate-spin" : ""}`}
              />
              读取资格列表
            </button>
            <button
              type="button"
              disabled={appealLoading}
              onClick={() => void loadAppeals()}
              className={outlineButton}
            >
              <Gavel className="h-4 w-4" />
              审核异议入口
            </button>
          </div>
        </div>
        {eligibilityError ? (
          <div
            role="alert"
            className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-800"
          >
            {eligibilityError}
          </div>
        ) : null}
        {eligibilities === null ? (
          <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-[13px] leading-6 text-slate-500">
            尚未读取资格记录。Demo 不会生成资格；API 模式须从权威资格服务读取。
          </div>
        ) : eligibilities.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-[13px] leading-6 text-slate-500">
            当前活动没有可展示的权威资格记录。
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">资格 / 参与人</th>
                  <th className="px-3 py-2.5 font-semibold">类型</th>
                  <th className="px-3 py-2.5 font-semibold">规则与有效期</th>
                  <th className="px-3 py-2.5 font-semibold">状态提示</th>
                  <th className="px-3 py-2.5 text-right font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {eligibilities.map(item => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="px-3 py-3">
                      <strong className="block text-slate-800">
                        {item.attendeeLabel || "脱敏参与人"}
                      </strong>
                      <span className="text-slate-500">{item.id}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {item.kind === "coser"
                        ? "Coser"
                        : item.kind === "ordinary"
                          ? "普通服装"
                          : "未知"}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      <span className="block">
                        {item.ruleVersion || "规则版本待核实"}
                      </span>
                      <span>
                        {item.validUntil
                          ? `至 ${item.validUntil}`
                          : "有效期待核实"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-[12px] font-semibold ${statusTone(item.status)}`}
                      >
                        {item.status}
                      </span>
                      {item.changeNotice ? (
                        <span className="mt-1 block max-w-[250px] leading-5 text-amber-800">
                          {item.changeNotice}
                        </span>
                      ) : item.status === "rule_changed" ||
                        item.status === "expiring" ? (
                        <span className="mt-1 block leading-5 text-amber-800">
                          规则/有效期已变化，请以权威资格决策重新校验。
                        </span>
                      ) : null}
                      {item.revocationReason ? (
                        <span className="mt-1 block leading-5 text-rose-700">
                          撤销原因：{item.revocationReason}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {role === "platform" && item.status !== "revoked" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setRevokeTarget(item.id);
                            setRevokeReason("");
                            setEligibilityError("");
                          }}
                          className="text-[13px] font-semibold text-rose-700 hover:underline"
                        >
                          撤销资格
                        </button>
                      ) : (
                        <span className="text-slate-400">只读</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {revokeTarget ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-rose-900">
              <ShieldAlert className="h-4 w-4" />
              撤销资格（{revokeTarget}）
            </div>
            <textarea
              value={revokeReason}
              onChange={event => setRevokeReason(event.target.value)}
              className={`${textareaClass} border-rose-200`}
              placeholder="必须填写撤销原因；服务端会校验资格活动范围和并发版本"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void revokeEligibility()}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-rose-600 px-4 text-[13px] font-semibold text-white"
              >
                确认撤销
              </button>
              <button
                type="button"
                onClick={() => setRevokeTarget(null)}
                className="inline-flex h-9 items-center rounded-full border border-rose-200 bg-white px-4 text-[13px] font-semibold text-rose-700"
              >
                取消
              </button>
            </div>
          </div>
        ) : null}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-800">
            <Gavel className="h-4 w-4 text-brand-600" />
            审核异议（由 App 用户端发起，本面板仅查看）
          </div>
          {appealError ? (
            <p role="alert" className="mt-2 text-[13px] text-rose-700">
              {appealError}
            </p>
          ) : null}
          {appeals === null ? (
            <p className="mt-2 text-[13px] leading-5 text-slate-500">
              点击“审核异议入口”读取当前活动关联的申报异议；不会在后台模拟用户发起。
            </p>
          ) : appeals.length === 0 ? (
            <p className="mt-2 text-[13px] text-slate-500">
              暂无可展示的权威异议案件。
            </p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {appeals.map(item => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-[13px]"
                >
                  <span>
                    <strong className="text-slate-800">{item.id}</strong>
                    {item.submissionId ? (
                      <span className="ml-2 text-slate-500">
                        关联申报 {item.submissionId}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-1 text-[12px] font-semibold ${statusTone(item.status)}`}
                  >
                    {item.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-2">
          <History className="mt-0.5 h-5 w-5 text-brand-600" />
          <div>
            <h3 className="text-[16px] font-semibold text-slate-900">
              发布与配置审计
            </h3>
            <p className="mt-1 text-[13px] leading-5 text-slate-500">
              展示当前活动范围内的版本化操作。API 模式以{" "}
              <code className="rounded bg-slate-100 px-1">
                GET /activities/:id/audit-logs
              </code>{" "}
              回读为准。
            </p>
          </div>
        </div>
        {draft.audit.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-[13px] text-slate-500">
            暂无操作记录。
          </div>
        ) : (
          <ol className="mt-4 divide-y divide-slate-100">
            {draft.audit.map(entry => (
              <li
                key={entry.id}
                className="flex flex-wrap items-start justify-between gap-3 py-3"
              >
                <div>
                  <strong className="block text-[14px] text-slate-800">
                    {entry.action}
                  </strong>
                  <span className="mt-1 block text-[13px] leading-5 text-slate-500">
                    {entry.detail}
                  </span>
                </div>
                <div className="text-right text-[12px] text-slate-500">
                  <span className="block">
                    {entry.actorRole} · v{entry.version}
                  </span>
                  <span>{entry.occurredAt}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
      <p className="text-[12px] leading-5 text-slate-500">
        Demo 存储键：<code>{activityGovernanceStorageKey(activityId)}</code>
        。API
        模式失败时不会读取或写入该键；退款批准、渠道回执和资金到账均不由本组件处理。
      </p>
    </div>
  );
}

export default ActivityGovernancePanel;
