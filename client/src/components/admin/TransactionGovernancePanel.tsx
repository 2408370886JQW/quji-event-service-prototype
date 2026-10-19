import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  assertActivityId,
  assertAppealAction,
  assertPolicyPublishable,
  assertResourceScope,
  canEditPolicy,
  canHandleMoney,
  canReadGovernance,
  createGovernanceApi,
  createPolicyDraft,
  isGovernanceTicketFrozen,
  loadTransactionGovernance,
  publishDemoPolicy,
  saveDemoAppeal,
  saveDemoPolicy,
  transitionDemoAppeal,
  validatePolicy,
  type AppealAction,
  type GovernanceRole,
  type GovernanceSnapshot,
  type OrderDetail,
  type RefundAppeal,
  type TicketPolicy,
} from "./transactionGovernance";

export type TransactionGovernancePanelProps = {
  activityId: string;
  role: GovernanceRole;
};

type PanelTab = "policy" | "orders" | "appeals" | "cancellation";

const tabs: Array<{ id: PanelTab; label: string }> = [
  { id: "policy", label: "购票与退票政策" },
  { id: "orders", label: "订单核对" },
  { id: "appeals", label: "退款申诉" },
  { id: "cancellation", label: "取消影响" },
];

const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";
const primaryButton =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-brand-grad px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50";
const field =
  "mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15";

function money(cents: number | undefined, role: GovernanceRole) {
  if (role === "organizer") return "金额已脱敏";
  if (!Number.isSafeInteger(cents)) return "待核对";
  return `¥${(cents! / 100).toFixed(2)}`;
}

function policyStatus(status: TicketPolicy["status"]) {
  return status === "published" ? "已发布" : "草稿";
}

function statusTone(status: string | undefined) {
  if (/refunded|paid|issued|used|succeeded/i.test(status ?? ""))
    return "bg-emerald-50 text-emerald-700";
  if (/failed|rejected|closed/i.test(status ?? ""))
    return "bg-rose-50 text-rose-700";
  if (/unknown|pending|processing|appeal/i.test(status ?? ""))
    return "bg-amber-50 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

function Status({ value }: { value?: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(value)}`}
    >
      {value || "待核对"}
    </span>
  );
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
      <ClipboardList className="mx-auto h-7 w-7 text-slate-400" />
      <p className="mt-3 text-sm font-semibold text-slate-800">{title}</p>
      <p className="mx-auto mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
        {detail}
      </p>
    </div>
  );
}

function SourceNotice({ source }: { source: GovernanceSnapshot["source"] }) {
  return source === "api" ? (
    <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm leading-5 text-emerald-800">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />{" "}
      当前数据来自已接入的后台接口；状态以服务端回读为准。
    </p>
  ) : (
    <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-900">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{" "}
      当前为本地演示配置：只保存政策和已有演示申诉流程，不代表订单、支付、退款回执或核销码。
    </p>
  );
}

export function TransactionGovernancePanel({
  activityId,
  role,
}: TransactionGovernancePanelProps) {
  const api = useMemo(() => createGovernanceApi(), []);
  const [activeTab, setActiveTab] = useState<PanelTab>("policy");
  const [data, setData] = useState<GovernanceSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [policy, setPolicy] = useState<TicketPolicy>(() =>
    createPolicyDraft(activityId)
  );
  const [policyErrors, setPolicyErrors] = useState<Record<string, string>>({});
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [ticketFilter, setTicketFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [issueReason, setIssueReason] = useState("");
  const [appealReason, setAppealReason] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!canReadGovernance(role)) {
      setData(null);
      return;
    }
    try {
      assertActivityId(activityId);
      setLoading(true);
      setError(null);
      const next = await loadTransactionGovernance(activityId, api);
      setData(next);
      setPolicy(current => {
        const match = next.policies.find(item => item.id === current.id);
        return match ?? next.policies[0] ?? createPolicyDraft(activityId);
      });
    } catch (cause) {
      setData(null);
      setError(
        cause instanceof Error ? cause.message : "交易数据加载失败，请重试"
      );
    } finally {
      setLoading(false);
    }
  }, [activityId, api, role]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updatePolicy = <K extends keyof TicketPolicy>(
    key: K,
    value: TicketPolicy[K]
  ) => {
    setPolicy(current => ({ ...current, [key]: value }));
    setPolicyErrors(current => ({ ...current, [key]: "" }));
  };

  const persistPolicy = async (publish: boolean) => {
    if (!canEditPolicy(role)) return;
    try {
      setError(null);
      setNotice(null);
      const errors = validatePolicy(policy);
      setPolicyErrors(errors);
      if (Object.keys(errors).length) return;
      if (publish) assertPolicyPublishable(policy);
      setBusy(publish ? "policy-publish" : "policy-save");
      let returned: TicketPolicy;
      if (data?.source === "demo") {
        returned = publish
          ? publishDemoPolicy(activityId, policy, policy.version)
          : saveDemoPolicy(activityId, policy);
        setNotice(
          publish
            ? "已更新本地演示发布状态；未改变真实售卖或退款规则。"
            : "已保存本地演示政策配置；未提交任何后台规则。"
        );
      } else {
        const saved = assertResourceScope(
          activityId,
          await api.savePolicy(activityId, policy, policy.version)
        );
        returned = publish
          ? assertResourceScope(
              activityId,
              await api.publishPolicy(activityId, saved.id, saved.version)
            )
          : saved;
        setNotice(
          publish
            ? "政策已由后台发布，后续订单应按服务端冻结版本处理。"
            : "政策已由后台保存。"
        );
      }
      setPolicy(returned);
      setData(current =>
        current
          ? {
              ...current,
              policies: [
                ...current.policies.filter(item => item.id !== returned.id),
                returned,
              ],
            }
          : current
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "政策操作失败，请重试");
    } finally {
      setBusy(null);
    }
  };

  const openOrder = async (orderId: string) => {
    if (data?.source !== "api") {
      setError(
        "演示模式不构造订单详情、支付回执或电子票码；请接入订单接口后查询。"
      );
      return;
    }
    try {
      setBusy(`order-${orderId}`);
      setError(null);
      setSelectedOrder(
        assertResourceScope(activityId, await api.getOrder(activityId, orderId))
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "订单详情加载失败，请重试"
      );
    } finally {
      setBusy(null);
    }
  };

  const refreshChannel = async () => {
    if (!selectedOrder || !canHandleMoney(role)) return;
    if (data?.source !== "api") {
      setError("演示模式不能查询支付渠道；未生成任何渠道结果。\n");
      return;
    }
    try {
      setBusy("channel-refresh");
      setError(null);
      const returned = assertResourceScope(
        activityId,
        await api.refreshChannel(activityId, selectedOrder.orderId)
      );
      setSelectedOrder(returned);
      setNotice("已请求后台刷新渠道结果；待核对不代表已支付或已退款。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "渠道查询失败，请重试");
    } finally {
      setBusy(null);
    }
  };

  const registerIssue = async () => {
    if (!selectedOrder || !canHandleMoney(role)) return;
    if (!issueReason.trim()) {
      setError("请填写需人工核对的问题说明");
      return;
    }
    if (data?.source !== "api") {
      setError("演示模式不能登记渠道问题；不会伪造处理工单。");
      return;
    }
    try {
      setBusy("issue-register");
      setError(null);
      await api.registerIssue(activityId, selectedOrder.orderId, {
        reason: issueReason.trim(),
      });
      setIssueReason("");
      setNotice("问题已提交后台登记，后续以渠道和订单服务的处理记录为准。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "问题登记失败，请重试");
    } finally {
      setBusy(null);
    }
  };

  const handleAppeal = async (appeal: RefundAppeal, action: AppealAction) => {
    try {
      setError(null);
      setNotice(null);
      assertAppealAction(appeal, role, action, appealReason);
      setBusy(`appeal-${appeal.id}-${action}`);
      let returned: RefundAppeal;
      if (data?.source === "demo") {
        returned = transitionDemoAppeal(
          appeal,
          role,
          action,
          appealReason,
          new Date().toISOString()
        );
        saveDemoAppeal(activityId, returned);
        setNotice(
          "已更新本地演示申诉流程，未发起原路退款、未生成回执，也不代表到账。"
        );
      } else {
        returned = assertResourceScope(
          activityId,
          await api.decideAppeal(activityId, appeal.id, {
            action,
            reason: appealReason.trim() || undefined,
          })
        );
        setNotice(
          action === "approve"
            ? "申诉已由后台转入退款处理中；仍需等待权威渠道结果，不能视为到账。"
            : "申诉办理结果已由后台回读。"
        );
      }
      setAppealReason("");
      setData(current =>
        current
          ? {
              ...current,
              appeals: current.appeals.map(item =>
                item.id === returned.id ? returned : item
              ),
            }
          : current
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "申诉办理失败，请重试");
    } finally {
      setBusy(null);
    }
  };

  if (!canReadGovernance(role)) {
    return (
      <section className={`${card} p-6`} aria-label="交易管理权限提示">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-slate-500" />
          <div>
            <h3 className="font-semibold text-slate-900">无票务交易访问权限</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              文旅角色不展示订单、退款、申诉或渠道信息。请由平台运营人员在已授权活动内办理。
            </p>
          </div>
        </div>
      </section>
    );
  }

  const orders = (data?.orders ?? []).filter(order => {
    const paymentMatches =
      paymentFilter === "all" || order.paymentStatus === paymentFilter;
    const ticketMatches =
      ticketFilter === "all" ||
      order.orderStatus === ticketFilter ||
      order.issuanceStatus === ticketFilter;
    return paymentMatches && ticketMatches;
  });
  const selectedBatch =
    data?.cancellationBatches.find(
      batch => batch.batchId === selectedBatchId
    ) ?? data?.cancellationBatches[0];

  return (
    <section className="space-y-4" aria-label="票务交易管理补齐">
      <div className={`${card} overflow-hidden`}>
        <div className="border-b border-slate-200 px-5 pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  交易管理补齐
                </h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                活动 {activityId} · 订单、政策与退款按单票和活动范围核对。
              </p>
            </div>
            <button
              type="button"
              onClick={() => void reload()}
              disabled={loading}
              className={secondaryButton}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />{" "}
              刷新
            </button>
          </div>
          <div
            className="mt-4 flex gap-1 overflow-x-auto"
            role="tablist"
            aria-label="交易管理页签"
          >
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold ${activeTab === tab.id ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-4 p-5">
          {loading ? (
            <p className="text-sm text-slate-500">
              正在读取当前活动的交易数据…
            </p>
          ) : null}
          {error ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm leading-5 text-rose-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
          {notice ? (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-5 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{notice}</span>
            </div>
          ) : null}
          {data ? <SourceNotice source={data.source} /> : null}

          {activeTab === "policy" ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
              <form
                className={`${card} p-5`}
                onSubmit={event => {
                  event.preventDefault();
                  void persistPolicy(false);
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      购票与退票政策版本
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      已支付订单读取下单时冻结的版本；更新不会覆盖历史快照。
                    </p>
                  </div>
                  <Status value={policyStatus(policy.status)} />
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-800">
                    政策名称
                    <input
                      className={field}
                      value={policy.title}
                      onChange={event =>
                        updatePolicy("title", event.target.value)
                      }
                      disabled={!canEditPolicy(role)}
                    />
                    {policyErrors.title ? (
                      <span className="mt-1 block text-xs text-rose-600">
                        {policyErrors.title}
                      </span>
                    ) : null}
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    版本号
                    <input
                      className={field}
                      value={policy.version}
                      onChange={event =>
                        updatePolicy("version", event.target.value)
                      }
                      disabled={!canEditPolicy(role)}
                    />
                    {policyErrors.version ? (
                      <span className="mt-1 block text-xs text-rose-600">
                        {policyErrors.version}
                      </span>
                    ) : null}
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    生效时间
                    <input
                      className={field}
                      type="datetime-local"
                      value={policy.effectiveAt.slice(0, 16)}
                      onChange={event =>
                        updatePolicy("effectiveAt", event.target.value)
                      }
                      disabled={!canEditPolicy(role)}
                    />
                    {policyErrors.effectiveAt ? (
                      <span className="mt-1 block text-xs text-rose-600">
                        {policyErrors.effectiveAt}
                      </span>
                    ) : null}
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">
                    退款手续费（%）
                    <input
                      className={field}
                      type="number"
                      min="0"
                      max="100"
                      value={policy.refundFeePercent}
                      onChange={event =>
                        updatePolicy(
                          "refundFeePercent",
                          Number(event.target.value)
                        )
                      }
                      disabled={!canEditPolicy(role)}
                    />
                    {policyErrors.refundFeePercent ? (
                      <span className="mt-1 block text-xs text-rose-600">
                        {policyErrors.refundFeePercent}
                      </span>
                    ) : null}
                  </label>
                </div>
                <label className="mt-4 block text-sm font-semibold text-slate-800">
                  购票须知
                  <textarea
                    className={`${field} min-h-24 resize-y`}
                    value={policy.purchaseNotice}
                    onChange={event =>
                      updatePolicy("purchaseNotice", event.target.value)
                    }
                    disabled={!canEditPolicy(role)}
                  />
                  {policyErrors.purchaseNotice ? (
                    <span className="mt-1 block text-xs text-rose-600">
                      {policyErrors.purchaseNotice}
                    </span>
                  ) : null}
                </label>
                <label className="mt-4 block text-sm font-semibold text-slate-800">
                  退票条件与算法说明
                  <textarea
                    className={`${field} min-h-24 resize-y`}
                    value={policy.refundCondition}
                    onChange={event =>
                      updatePolicy("refundCondition", event.target.value)
                    }
                    disabled={!canEditPolicy(role)}
                  />
                  {policyErrors.refundCondition ? (
                    <span className="mt-1 block text-xs text-rose-600">
                      {policyErrors.refundCondition}
                    </span>
                  ) : null}
                </label>
                <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={policy.requiresFinalEligibility}
                    disabled
                    title="先取得最终有效资格，再购票付款"
                  />
                  购票前必须具有最终有效资格
                </label>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button
                    type="submit"
                    disabled={!canEditPolicy(role) || busy !== null}
                    className={secondaryButton}
                  >
                    <FileText className="h-4 w-4" />
                    保存草稿
                  </button>
                  <button
                    type="button"
                    onClick={() => void persistPolicy(true)}
                    disabled={!canEditPolicy(role) || busy !== null}
                    className={primaryButton}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    发布版本
                  </button>
                </div>
              </form>
              <aside className={`${card} p-5`}>
                <h3 className="font-bold text-slate-900">已有版本</h3>
                <div className="mt-3 space-y-2">
                  {data?.policies.length ? (
                    data.policies.map(item => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => {
                          setPolicy(item);
                          setPolicyErrors({});
                        }}
                        className={`w-full rounded-xl border p-3 text-left ${item.id === policy.id ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:bg-slate-50"}`}
                      >
                        <div className="flex justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {item.title || "未命名政策"}
                          </span>
                          <Status value={policyStatus(item.status)} />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.version} ·{" "}
                          {item.effectiveAt || "未设置生效时间"}
                        </p>
                      </button>
                    ))
                  ) : (
                    <Empty
                      title="暂无政策版本"
                      detail="可建立本地演示政策配置；真实售卖规则须由后台接口保存并发布。"
                    />
                  )}
                </div>
              </aside>
            </div>
          ) : null}

          {activeTab === "orders" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 rounded-xl bg-slate-50 p-3">
                <label className="text-sm text-slate-700">
                  支付状态
                  <select
                    className="ml-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5"
                    value={paymentFilter}
                    onChange={event => setPaymentFilter(event.target.value)}
                  >
                    <option value="all">全部</option>
                    <option value="payment_unknown">待核对</option>
                    <option value="payment_pending">确认中</option>
                    <option value="payment_failed">支付失败</option>
                    <option value="paid">已支付</option>
                  </select>
                </label>
                <label className="text-sm text-slate-700">
                  订单/出票状态
                  <select
                    className="ml-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5"
                    value={ticketFilter}
                    onChange={event => setTicketFilter(event.target.value)}
                  >
                    <option value="all">全部</option>
                    <option value="unpaid">待支付</option>
                    <option value="closed">已关闭</option>
                    <option value="issuance_pending">出票处理中</option>
                    <option value="issued">待使用</option>
                    <option value="used">已核销</option>
                  </select>
                </label>
              </div>
              {!orders.length ? (
                <Empty
                  title="暂无可显示订单"
                  detail={
                    data?.source === "api"
                      ? "接口返回当前活动没有订单，或筛选条件没有命中。"
                      : "演示模式不会造已支付订单、退款回执或电子票码；接入订单接口后将在此加载。"
                  }
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-[900px] w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="px-4 py-3">订单</th>
                        <th className="px-4 py-3">支付</th>
                        <th className="px-4 py-3">订单/出票</th>
                        <th className="px-4 py-3">金额</th>
                        <th className="px-4 py-3">幂等键</th>
                        <th className="px-4 py-3">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr
                          key={order.orderId}
                          className="border-t border-slate-100"
                        >
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {order.orderId}
                            <span className="mt-1 block text-xs text-slate-500">
                              {order.sessionDate || "场次待核对"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Status value={order.paymentStatus} />
                          </td>
                          <td className="px-4 py-3">
                            <Status
                              value={order.issuanceStatus || order.orderStatus}
                            />
                          </td>
                          <td className="px-4 py-3">
                            {money(order.amountCents, role)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">
                            {order.idempotencyKey || "未返回"}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="font-semibold text-brand-700 hover:underline"
                              onClick={() => void openOrder(order.orderId)}
                              disabled={busy !== null}
                            >
                              查看明细
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {selectedOrder ? (
                <OrderDetailCard
                  detail={selectedOrder}
                  role={role}
                  onClose={() => setSelectedOrder(null)}
                  onRefresh={() => void refreshChannel()}
                  onRegister={() => void registerIssue()}
                  issueReason={issueReason}
                  setIssueReason={setIssueReason}
                  busy={busy}
                />
              ) : null}
            </div>
          ) : null}

          {activeTab === "appeals" ? (
            <div className="space-y-4">
              {role === "organizer" ? (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  主办方仅可查看本活动的脱敏申诉进度，不能审批、要求补充或办理资金动作。
                </p>
              ) : null}
              {!data?.appeals.length ? (
                <Empty
                  title="暂无退款申诉待办"
                  detail={
                    data?.source === "api"
                      ? "接口未返回当前活动的申诉记录。"
                      : "本地演示没有预置退款申请、到账回执或资金结果；若已有本地演示申诉，操作仅演示流程。"
                  }
                />
              ) : (
                data.appeals.map(appeal => (
                  <article key={appeal.id} className={`${card} p-4`}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900">
                            申诉 {appeal.id}
                          </h3>
                          <Status value={appeal.status} />
                          {isGovernanceTicketFrozen(appeal.status) ? (
                            <span className="text-xs font-semibold text-amber-700">
                              单票保持冻结
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          ticketId：{appeal.ticketId} · 冻结金额：
                          {money(appeal.amountCents, role)} · 规则：
                          {appeal.policyVersion || "待核对"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {appeal.description || "未返回申诉说明"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                      <span className="font-semibold">审计：</span>
                      {appeal.audit.length
                        ? appeal.audit
                            .map(entry => `${entry.occurredAt} ${entry.label}`)
                            .join("；")
                        : "暂无审计记录"}
                    </div>
                    {canHandleMoney(role) ? (
                      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                        <textarea
                          className={`${field} mt-0 min-h-20`}
                          value={appealReason}
                          onChange={event =>
                            setAppealReason(event.target.value)
                          }
                          placeholder="要求补充或驳回时必须说明原因；通过时可留处理说明"
                        />
                        <div className="flex flex-wrap items-end gap-2">
                          <button
                            type="button"
                            className={secondaryButton}
                            disabled={busy !== null}
                            onClick={() =>
                              void handleAppeal(appeal, "request_more")
                            }
                          >
                            要求补充
                          </button>
                          <button
                            type="button"
                            className={primaryButton}
                            disabled={busy !== null}
                            onClick={() => void handleAppeal(appeal, "approve")}
                          >
                            通过并进入处理中
                          </button>
                          <button
                            type="button"
                            className={secondaryButton}
                            disabled={busy !== null}
                            onClick={() => void handleAppeal(appeal, "reject")}
                          >
                            驳回申诉
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          ) : null}

          {activeTab === "cancellation" ? (
            <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className={`${card} p-4`}>
                <h3 className="font-bold text-slate-900">退款批次</h3>
                <div className="mt-3 space-y-2">
                  {data?.cancellationBatches.length ? (
                    data.cancellationBatches.map(batch => (
                      <button
                        key={batch.batchId}
                        type="button"
                        onClick={() => setSelectedBatchId(batch.batchId)}
                        className={`w-full rounded-xl border p-3 text-left ${selectedBatch?.batchId === batch.batchId ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:bg-slate-50"}`}
                      >
                        <p className="font-semibold text-slate-900">
                          {batch.batchId}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {batch.reason} · {batch.tickets.length} 张票
                        </p>
                      </button>
                    ))
                  ) : (
                    <Empty
                      title="暂无取消影响批次"
                      detail="这里只读显示活动取消后由后台建立的逐票任务。"
                    />
                  )}
                </div>
              </aside>
              <div className={`${card} p-4`}>
                {selectedBatch ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          {selectedBatch.batchId}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {selectedBatch.reason} · 建立时间{" "}
                          {selectedBatch.createdAt || "待核对"}
                        </p>
                      </div>
                      <Status value={selectedBatch.status} />
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-[700px] w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-500">
                          <tr>
                            <th className="px-3 py-2">原 ticketId</th>
                            <th className="px-3 py-2">订单</th>
                            <th className="px-3 py-2">冻结政策</th>
                            <th className="px-3 py-2">渠道进度（只读）</th>
                            <th className="px-3 py-2">金额</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBatch.tickets.map(ticket => (
                            <tr
                              key={ticket.ticketId}
                              className="border-t border-slate-100"
                            >
                              <td className="px-3 py-3 font-mono text-xs text-slate-800">
                                {ticket.ticketId}
                              </td>
                              <td className="px-3 py-3">
                                {ticket.orderId || "待核对"}
                              </td>
                              <td className="px-3 py-3">
                                {ticket.frozenPolicyVersion || "缺少冻结版本"}
                              </td>
                              <td className="px-3 py-3">
                                <Status value={ticket.channelStatus} />
                              </td>
                              <td className="px-3 py-3">
                                {money(ticket.amountCents, role)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <Empty
                    title="请选择退款批次"
                    detail="取消影响必须按原 ticketId 查看，已支付订单的冻结政策不会在这里改写。"
                  />
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function OrderDetailCard({
  detail,
  role,
  onClose,
  onRefresh,
  onRegister,
  issueReason,
  setIssueReason,
  busy,
}: {
  detail: OrderDetail;
  role: GovernanceRole;
  onClose: () => void;
  onRefresh: () => void;
  onRegister: () => void;
  issueReason: string;
  setIssueReason: (value: string) => void;
  busy: string | null;
}) {
  const canHandle = canHandleMoney(role);
  const isUnknown = /unknown|failed|pending/i.test(
    `${detail.paymentStatus} ${detail.orderStatus}`
  );
  return (
    <article className={`${card} p-5`} aria-label="订单详情">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold text-slate-900">订单 {detail.orderId}</h3>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            金额 {money(detail.amountCents, role)} · 幂等键{" "}
            {detail.idempotencyKey || "未返回"} · 库存{" "}
            {detail.inventoryReservationStatus || "待核对"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          关闭
        </button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <p className="font-semibold text-slate-800">资格快照</p>
          <p className="mt-1 text-slate-600">
            {detail.eligibilitySnapshot?.status || "待核对"} · 规则{" "}
            {detail.eligibilitySnapshot?.ruleVersion || "未返回"} · 有效至{" "}
            {detail.eligibilitySnapshot?.validUntil || "未返回"}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          <p className="font-semibold text-slate-800">政策冻结</p>
          <p className="mt-1 text-slate-600">
            版本 {detail.policySnapshot?.version || "未返回"} · 确认{" "}
            {detail.policySnapshot?.confirmedAt || "未返回"}
          </p>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2">ticketId</th>
              <th className="px-3 py-2">单票状态</th>
              <th className="px-3 py-2">费用</th>
              <th className="px-3 py-2">退款冻结</th>
              <th className="px-3 py-2">资格</th>
            </tr>
          </thead>
          <tbody>
            {detail.tickets.map(ticket => (
              <tr key={ticket.ticketId} className="border-t border-slate-100">
                <td className="px-3 py-3 font-mono text-xs">
                  {ticket.ticketId}
                </td>
                <td className="px-3 py-3">
                  <Status value={ticket.ticketStatus} />
                </td>
                <td className="px-3 py-3">
                  {money(ticket.amountCents, role)}
                  {ticket.feeCents !== undefined
                    ? `（费用 ${money(ticket.feeCents, role)}）`
                    : ""}
                </td>
                <td className="px-3 py-3">
                  {ticket.frozenPolicyVersion || "待核对"} ·{" "}
                  {ticket.refundStatus || "无"}
                </td>
                <td className="px-3 py-3">
                  {ticket.eligibilityStatus || "待核对"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <p className="font-semibold text-slate-800">状态时间线</p>
        <ol className="mt-2 space-y-2 border-l border-slate-200 pl-4 text-sm">
          {detail.timeline.length ? (
            detail.timeline.map(entry => (
              <li key={entry.id}>
                <span className="font-medium text-slate-800">
                  {entry.label}
                </span>
                <span className="ml-2 text-slate-500">
                  {entry.occurredAt}
                  {entry.detail ? ` · ${entry.detail}` : ""}
                </span>
              </li>
            ))
          ) : (
            <li className="text-slate-500">暂无时间线</li>
          )}
        </ol>
      </div>
      {canHandle && isUnknown ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">渠道结果待核对</p>
          <p className="mt-1 text-sm text-amber-800">
            刷新只查询原渠道状态；不会创建支付、退款成功或电子票码。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryButton}
              disabled={busy !== null}
              onClick={onRefresh}
            >
              刷新渠道结果
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"
              value={issueReason}
              onChange={event => setIssueReason(event.target.value)}
              placeholder="说明异常或人工核对事项"
            />
            <button
              type="button"
              className={secondaryButton}
              disabled={busy !== null}
              onClick={onRegister}
            >
              登记问题
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default TransactionGovernancePanel;
