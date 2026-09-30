import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  IdCard,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import {
  checkPurchaseLimit,
  heldByIdCard,
  maskIdCard,
  normalizeIdCard,
  resolvePurchaseStatus,
  type LimitCheckResult,
  type RefundLink,
} from "./purchaseLimit";
import {
  DEFAULT_LIMIT_LOGS,
  EVENT_SESSIONS,
  PURCHASE_RECORDS,
  SESSION_DATES,
  ticketLimit,
  type LimitCheckLog,
} from "./ticketSamples";
import { ALL_SESSIONS } from "./ticketStats";
import { formatSessionDate } from "./ticketTypes";

const SESSION_KEY = "quji_ticket_session";
const LIMIT_LOG_KEY = "quji_preview_limit_logs_v1";

export function loadTicketSession() {
  try {
    const saved = window.sessionStorage.getItem(SESSION_KEY);
    return saved && (saved === ALL_SESSIONS || SESSION_DATES.includes(saved))
      ? saved
      : ALL_SESSIONS;
  } catch {
    return ALL_SESSIONS;
  }
}

export function saveTicketSession(value: string) {
  try {
    window.sessionStorage.setItem(SESSION_KEY, value);
  } catch {
    /* 忽略存储失败 */
  }
}

/** 票务管理 · 场次日期筛选 */
export function SessionFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const options = [
    {
      value: ALL_SESSIONS,
      label: "全部场次",
      sub: `${SESSION_DATES.length} 天合计`,
    },
    ...SESSION_DATES.map((date, index) => ({
      value: date,
      label: formatSessionDate(date),
      sub: `第 ${index + 1} 天`,
    })),
  ];
  return (
    <div
      className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
      data-cy="session-filter"
    >
      <span className="flex items-center gap-1.5 text-[14px] font-semibold whitespace-nowrap text-slate-800">
        <CalendarDays className="h-4 w-4 text-slate-500" />
        场次日期
      </span>
      <div
        className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 sm:inline-grid sm:w-fit sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none"
        role="radiogroup"
        aria-label="场次日期"
      >
        {options.map(option => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              data-cy="session-filter-option"
              data-value={option.value}
              onClick={() => onChange(option.value)}
              className={`min-w-0 rounded-md px-3 py-1.5 text-center transition-colors sm:min-w-[118px] ${active ? "bg-white text-[#255ec8] shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              <span className="block text-[14px] font-semibold whitespace-nowrap">
                {option.label}
              </span>
              <span
                className={`block text-[12px] whitespace-nowrap ${active ? "text-[#255ec8]/80" : "text-slate-500"}`}
              >
                {option.sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function loadLogs(): LimitCheckLog[] {
  try {
    const saved = window.localStorage.getItem(LIMIT_LOG_KEY);
    return saved ? (JSON.parse(saved) as LimitCheckLog[]) : DEFAULT_LIMIT_LOGS;
  } catch {
    return DEFAULT_LIMIT_LOGS;
  }
}

const TICKET_NAMES = EVENT_SESSIONS[0].tickets.map(ticket => ticket.name);
const fieldClass =
  "block h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#245fc4] focus:ring-2 focus:ring-[#245fc4]/15";

function SelectField({
  label,
  value,
  onChange,
  options,
  dataCy,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  dataCy: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="block text-[14px] font-semibold text-slate-800">
        {label}
      </span>
      <span className="relative mt-2 block">
        <select
          value={value}
          data-cy={dataCy}
          onChange={event => onChange(event.target.value)}
          className={`${fieldClass} appearance-none pr-9`}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </span>
    </label>
  );
}

const statusText = {
  paid: "已支付",
  refund_pending: "退款处理中",
  refunded: "已退款 释放额度",
} as const;

/** 票务管理 · 身份证限购校验 */
export function PurchaseLimitPanel({ refunds }: { refunds: RefundLink[] }) {
  const records = useMemo(
    () => resolvePurchaseStatus(PURCHASE_RECORDS, refunds),
    [refunds]
  );
  const [logs, setLogs] = useState<LimitCheckLog[]>(loadLogs);
  const [idCard, setIdCard] = useState("");
  const [sessionDate, setSessionDate] = useState(SESSION_DATES[0]);
  const [ticketName, setTicketName] = useState(TICKET_NAMES[0]);
  const [quantity, setQuantity] = useState("1");
  const [result, setResult] = useState<LimitCheckResult | null>(null);
  const limit = ticketLimit(ticketName);
  const related = result?.valid
    ? heldByIdCard(records, idCard, sessionDate, ticketName)
    : null;
  const allRelated = result?.valid
    ? records.filter(
        record =>
          normalizeIdCard(record.idCard) === normalizeIdCard(idCard) &&
          record.sessionDate === sessionDate &&
          record.ticketName === ticketName
      )
    : [];

  const persist = (next: LimitCheckLog[]) => {
    setLogs(next);
    try {
      window.localStorage.setItem(LIMIT_LOG_KEY, JSON.stringify(next));
    } catch {
      /* 忽略存储失败 */
    }
  };

  const runCheck = () => {
    const checked = checkPurchaseLimit(records, {
      idCard,
      sessionDate,
      ticketName,
      quantity,
      limit,
    });
    setResult(checked);
    if (!checked.valid) return;
    const owner = records.find(
      record => normalizeIdCard(record.idCard) === normalizeIdCard(idCard)
    );
    const time = new Date().toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    persist([
      {
        id: `limit-${Date.now().toString(36)}`,
        time: time.replace(/\//g, "-"),
        buyerName: owner?.buyerName ?? "未登记购票人",
        idCard: normalizeIdCard(idCard),
        account: "后台复核",
        sessionDate,
        ticketName,
        quantity: Number(quantity),
        held: checked.held,
        accountCount: checked.accounts.length,
        limit,
        allowed: checked.allowed,
        source: "后台校验",
      },
      ...logs,
    ]);
  };

  const review = (log: LimitCheckLog) => {
    setIdCard(log.idCard);
    setSessionDate(log.sessionDate);
    setTicketName(log.ticketName);
    setQuantity(String(log.quantity));
    setResult(null);
    document
      .querySelector('[data-cy="limit-form"]')
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const blocked = logs.filter(log => !log.allowed).length;

  return (
    <div data-cy="limit-panel">
      <div className="grid gap-4 border-b border-slate-200 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="rounded-lg border border-slate-200 p-4 lg:self-start">
          <h3 className="flex items-center gap-2 text-[16px] font-semibold text-slate-900">
            <IdCard className="h-4.5 w-4.5 text-[#255ec8]" />
            限购按身份证统计
          </h3>
          <ul className="mt-3 space-y-1.5 text-[14px] leading-6 text-slate-600">
            <li>同一身份证在同一场次同一票种合并计算</li>
            <li>多个账号购买合并 不按登录账号分开算</li>
            <li>已支付和退款处理中计入 退款完成后释放额度</li>
            <li>漫圈 App 下单和现场售票都按此规则校验</li>
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {EVENT_SESSIONS[0].tickets.map(ticket => (
              <div
                key={ticket.name}
                className="rounded-md bg-slate-50 px-3 py-2"
                data-cy="limit-rule"
              >
                <div className="text-[13px] font-semibold whitespace-nowrap text-slate-800">
                  {ticket.name}
                </div>
                <div className="mt-0.5 text-[13px] whitespace-nowrap text-slate-500">
                  每个身份证 {ticket.purchaseLimit} 张
                </div>
              </div>
            ))}
          </div>
        </section>
        <section
          className="rounded-lg border border-slate-200 p-4"
          data-cy="limit-form"
        >
          <h3 className="text-[16px] font-semibold text-slate-900">
            下单前限购校验
          </h3>
          <p className="mt-1 text-[13px] leading-5 text-slate-500">
            输入购票人身份证号 按场次和票种核对已持有张数
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block min-w-0 sm:col-span-2">
              <span className="block text-[14px] font-semibold text-slate-800">
                购票人身份证号
              </span>
              <input
                value={idCard}
                data-cy="limit-idcard"
                maxLength={20}
                autoComplete="off"
                onChange={event => {
                  setIdCard(event.target.value.toUpperCase());
                  setResult(null);
                }}
                placeholder="18 位居民身份证号"
                className={`${fieldClass} mt-2 tracking-wide`}
              />
            </label>
            <SelectField
              label="场次日期"
              value={sessionDate}
              dataCy="limit-session"
              onChange={value => {
                setSessionDate(value);
                setResult(null);
              }}
              options={SESSION_DATES.map(date => ({
                value: date,
                label: formatSessionDate(date),
              }))}
            />
            <SelectField
              label="票种"
              value={ticketName}
              dataCy="limit-ticket"
              onChange={value => {
                setTicketName(value);
                setResult(null);
              }}
              options={TICKET_NAMES.map(name => ({
                value: name,
                label: `${name} · 限购 ${ticketLimit(name)} 张`,
              }))}
            />
            <label className="block min-w-0">
              <span className="block text-[14px] font-semibold text-slate-800">
                本次购买张数
              </span>
              <input
                value={quantity}
                data-cy="limit-quantity"
                inputMode="numeric"
                onChange={event => {
                  setQuantity(event.target.value.replace(/\D/g, ""));
                  setResult(null);
                }}
                className={`${fieldClass} mt-2`}
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                data-cy="limit-check"
                onClick={runCheck}
                className="h-11 w-full rounded-lg bg-[#255ec8] px-4 text-[15px] font-semibold whitespace-nowrap text-white transition-transform active:scale-[0.97]"
              >
                校验并记录
              </button>
            </div>
          </div>
          {result && (
            <div
              data-cy="limit-result"
              data-allowed={result.valid ? String(result.allowed) : "invalid"}
              className={`mt-4 rounded-lg border p-4 ${!result.valid ? "border-slate-200 bg-slate-50" : result.allowed ? "border-emerald-200 bg-emerald-50/60" : "border-rose-200 bg-rose-50/60"}`}
            >
              <div
                className={`flex items-start gap-2 text-[15px] leading-6 font-semibold ${!result.valid ? "text-slate-700" : result.allowed ? "text-emerald-700" : "text-rose-700"}`}
              >
                {result.valid && result.allowed ? (
                  <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0" />
                ) : (
                  <ShieldAlert className="mt-0.5 h-4.5 w-4.5 shrink-0" />
                )}
                <span data-cy="limit-result-message" className="min-w-0">
                  <span className="block">{result.message.split(" ")[0]}</span>
                  {result.message.includes(" ") && (
                    <span className="block text-[14px] font-medium">
                      {result.message.slice(result.message.indexOf(" ") + 1)}
                    </span>
                  )}
                </span>
              </div>
              {result.valid && (
                <>
                  <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                    {(
                      [
                        ["已持有", `${result.held} 张`, "limit-held"],
                        [
                          "涉及账号",
                          `${result.accounts.length} 个`,
                          "limit-accounts",
                        ],
                        ["限购", `${limit} 张`, "limit-max"],
                        [
                          "还可再购",
                          `${result.available} 张`,
                          "limit-available",
                        ],
                      ] as const
                    ).map(([label, value, cy]) => (
                      <div
                        key={label}
                        className="rounded-md bg-white px-3 py-2"
                      >
                        <dt className="text-[12px] whitespace-nowrap text-slate-500">
                          {label}
                        </dt>
                        <dd
                          className="mt-0.5 text-[16px] font-semibold whitespace-nowrap text-slate-900"
                          data-cy={cy}
                        >
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {allRelated.length > 0 && (
                    <ul
                      className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200 bg-white"
                      data-cy="limit-orders"
                    >
                      {allRelated.map(record => (
                        <li
                          key={record.orderNo}
                          className="px-3 py-2 text-[13px]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold whitespace-nowrap text-slate-800">
                              {record.orderNo}
                            </span>
                            <span className="whitespace-nowrap text-slate-600">
                              {record.quantity} 张 · {statusText[record.status]}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1 whitespace-nowrap text-slate-500">
                            <UsersRound className="h-3.5 w-3.5" />
                            下单账号 {record.account}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {related && related.accounts.length > 1 && (
                    <p className="mt-2 text-[13px] leading-5 text-slate-600">
                      该身份证使用了 {related.accounts.length} 个账号购票
                      已合并计算
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[14px]">
        <strong className="text-slate-900">限购校验记录</strong>
        <span className="text-[13px] text-slate-500">
          已拦截 {blocked} 次 · 共 {logs.length} 条
        </span>
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] text-left">
          <thead>
            <tr className="bg-slate-50 text-[13px] text-slate-600">
              <th className="p-4 font-semibold">时间 / 来源</th>
              <th className="p-4 font-semibold">购票人 / 身份证</th>
              <th className="p-4 font-semibold">下单账号</th>
              <th className="p-4 font-semibold">场次 / 票种</th>
              <th className="p-4 text-right font-semibold">
                本次 / 已持有 / 限购
              </th>
              <th className="p-4 font-semibold">结果</th>
              <th className="p-4 text-right font-semibold">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {logs.map(log => (
              <tr key={log.id} data-cy="limit-log-row" className="align-top">
                <td className="p-4">
                  <div className="text-[14px] whitespace-nowrap text-slate-800">
                    {log.time}
                  </div>
                  <div className="mt-1 text-[12px] whitespace-nowrap text-slate-500">
                    {log.source}
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-[14px] font-semibold whitespace-nowrap text-slate-900">
                    {log.buyerName}
                  </div>
                  <div className="mt-1 text-[13px] whitespace-nowrap text-slate-500">
                    {maskIdCard(log.idCard)}
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-[14px] whitespace-nowrap text-slate-700">
                    {log.account}
                  </div>
                  {log.accountCount > 1 && (
                    <div className="mt-1 text-[12px] whitespace-nowrap text-amber-700">
                      此前已用 {log.accountCount} 个账号购买
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <div className="text-[14px] whitespace-nowrap text-slate-800">
                    {formatSessionDate(log.sessionDate)}
                  </div>
                  <div className="mt-1 text-[13px] whitespace-nowrap text-slate-500">
                    {log.ticketName}
                  </div>
                </td>
                <td className="p-4 text-right text-[14px] whitespace-nowrap text-slate-800">
                  {log.quantity} / {log.held} / {log.limit} 张
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex h-6 items-center rounded-md px-2 text-[13px] font-semibold whitespace-nowrap ${log.allowed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                  >
                    {log.allowed ? "已放行" : "已拦截"}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    type="button"
                    data-cy="limit-review"
                    onClick={() => review(log)}
                    className="text-[14px] font-semibold whitespace-nowrap text-[#255ec8] hover:underline"
                  >
                    复核
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-slate-200 border-t border-slate-200 md:hidden">
        {logs.map(log => (
          <article key={log.id} className="p-4" data-cy="limit-log-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-slate-900">
                  {log.buyerName}
                </div>
                <div className="mt-0.5 text-[13px] whitespace-nowrap text-slate-500">
                  {maskIdCard(log.idCard)}
                </div>
              </div>
              <span
                className={`inline-flex h-6 shrink-0 items-center rounded-md px-2 text-[13px] font-semibold whitespace-nowrap ${log.allowed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
              >
                {log.allowed ? "已放行" : "已拦截"}
              </span>
            </div>
            <div className="mt-2 text-[13px] leading-6 text-slate-600">
              <span className="block">
                {formatSessionDate(log.sessionDate)} · {log.ticketName}
              </span>
              <span className="block">
                本次 {log.quantity} 张 · 已持有 {log.held} 张 · 限购 {log.limit}{" "}
                张
              </span>
              <span className="block">
                {log.time} · {log.source}
              </span>
            </div>
            <button
              type="button"
              onClick={() => review(log)}
              className="mt-2 text-[14px] font-semibold text-[#255ec8]"
            >
              复核
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
