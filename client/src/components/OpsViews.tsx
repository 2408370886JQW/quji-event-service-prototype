import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CheckCheck,
  FileArchive,
  ScrollText,
  Ticket,
  CircleAlert,
  ClipboardList,
  Download,
  FileDown,
  FileText,
  History,
  IdCard,
  Keyboard,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  DAILY_SALES,
  E_TICKETS,
  EXCEPTION_TYPES,
  HOURLY_ENTRIES,
  ISSUE_CATEGORIES,
  ISSUE_OWNERS,
  MATERIAL_READY,
  ONSITE_BASE,
  OPS_SESSIONS,
  PRIMARY_EVENT_ID,
  STAFF_AREAS,
  addCheckin,
  addException,
  addIssue,
  addStaff,
  buildNotices,
  checkRealName,
  markArchiveSummary,
  markNoticeRead,
  onsiteStats,
  opsNow,
  recordExport,
  searchTickets,
  sessionLabel,
  unreadNotices,
  updateIssue,
  validateException,
  validateIssue,
  validateStaff,
  verifyStaff,
  verifyTicket,
  type CheckinRecord,
  type ExceptionErrors,
  type ExceptionInput,
  type IssueErrors,
  type IssueInput,
  type IssueLevel,
  type IssueRecord,
  type NoticeItem,
  type OpsActor,
  type RealNameOutcome,
  type RefundStateMap,
  type StaffErrors,
  type StaffInput,
  type VerifyOutcome,
} from "./activityOpsCore";
import { getActivityOps, updateOps, useActivityOps } from "./activityOps";
import {
  buildActivityReport,
  downloadReportDocx,
  type ActivityReport,
  type ReportEventInput,
} from "./activityReport";
import { useRefundRecords } from "./refundData";
import { useTicketConfig } from "./ticketConfig";
import { buildSessionStock } from "./ticketStats";
import { SUBMISSION_STATUS_LABEL, useSubmissions } from "./submissionReview";
import { useMyReviewCount } from "./CostumeReview";
import { downloadCsv } from "./TicketConfigViews";

export type OpsRole = "platform" | "organizer" | "culture";

/* ---------------- 通用样式与组件 ---------------- */

const primaryBtn =
  "h-11 px-5 rounded-full bg-brand-grad text-white text-[15px] font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50";
const outlineBtn =
  "h-11 px-4 rounded-full border border-brand-200 bg-white text-[15px] font-semibold text-brand-700 hover:bg-brand-50 inline-flex items-center justify-center gap-1.5 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50";
const dangerBtn =
  "h-11 px-4 rounded-full bg-rose-600 text-white text-[15px] font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap hover:bg-rose-700";
const linkBtn =
  "h-10 rounded-md px-3 text-[14px] font-semibold text-brand-600 hover:bg-brand-50 inline-flex items-center gap-1 whitespace-nowrap";
const fieldClass =
  "block h-11 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15";
const areaClass =
  "block min-h-[96px] w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-[15px] leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15";

const n = (value: number) => value.toLocaleString("zh-CN");
const money = (value: number) => `¥${value.toLocaleString("zh-CN")}`;

/** 语义短语：每个短语整体不拆行，短语之间允许换行 */
export function Phrases({
  parts,
  className = "",
}: {
  parts: string[];
  className?: string;
}) {
  return (
    <span className={className}>
      {parts.map((part, index) => (
        <Fragment key={`${part}-${index}`}>
          {index > 0 && " "}
          <span className="whitespace-nowrap">{part}</span>
        </Fragment>
      ))}
    </span>
  );
}

function Tag({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "blue" | "green" | "amber" | "rose";
}) {
  const colors = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-brand-100 text-brand-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <span
      className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ${colors[tone]}`}
    >
      {children}
    </span>
  );
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
}

/** 右侧抽屉 */
export function Sheet({
  title,
  eyebrow,
  onClose,
  children,
  footer,
  cy,
  wide = false,
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  cy?: string;
  wide?: boolean;
}) {
  useEscape(onClose);
  return (
    <div
      className="fixed inset-0 z-[60] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="关闭面板"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/30"
      />
      <aside
        data-cy={cy}
        className={`relative flex h-full w-full ${wide ? "max-w-[760px]" : "max-w-[600px]"} flex-col bg-white shadow-2xl`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            {eyebrow && (
              <div className="text-[13px] font-semibold text-slate-500">
                {eyebrow}
              </div>
            )}
            <h2 className="mt-0.5 text-[21px] leading-7 font-semibold text-slate-900">
              {title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>
        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 sm:px-6">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  );
}

/** 居中弹窗（手机宽度贴底） */
export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  cy,
  wide = false,
}: {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  cy?: string;
  wide?: boolean;
}) {
  useEscape(onClose);
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="关闭弹窗"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40"
      />
      <section
        data-cy={cy}
        className={`relative flex max-h-[92vh] w-full ${wide ? "sm:max-w-[920px]" : "sm:max-w-[560px]"} flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-[20px] leading-7 font-semibold text-slate-900">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-[14px] leading-6 text-slate-600">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>
        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 sm:px-6">
            {footer}
          </footer>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  children,
  required = false,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="block text-[14px] font-semibold text-slate-800">
        {label}
        {required && <span className="ml-0.5 text-rose-600">*</span>}
      </span>
      <div className="mt-2">{children}</div>
      {error ? (
        <span
          role="alert"
          data-cy="form-error"
          className="mt-1.5 block text-[13px] leading-5 text-rose-600"
        >
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-[13px] leading-5 text-slate-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  cy,
}: {
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (value: T) => void;
  cy?: string;
}) {
  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-full bg-brand-50 p-1"
      role="tablist"
    >
      {options.map(option => (
        <button
          type="button"
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          data-cy={cy ? `${cy}-${option.value}` : undefined}
          onClick={() => onChange(option.value)}
          className={`h-9 whitespace-nowrap rounded-full px-3.5 text-[14px] font-semibold ${
            value === option.value
              ? "bg-white text-brand-700 shadow-sm ring-1 ring-brand-200"
              : "text-slate-600 hover:text-brand-700"
          }`}
        >
          {option.label}
          {option.count !== undefined && (
            <span className="ml-1 text-[13px] text-slate-500">
              {option.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function SectionCard({
  title,
  description,
  actions,
  children,
  cy,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  cy?: string;
}) {
  return (
    <section
      data-cy={cy}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-[18px] leading-7 font-semibold">{title}</h3>
          {description && (
            <p className="mt-1 text-[14px] leading-6 text-slate-600">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

function PageTitle({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[12px] font-semibold tracking-wide text-slate-500">
            {eyebrow}
          </div>
        )}
        <h2 className="mt-1 text-[24px] leading-8 font-semibold tracking-[-0.04em]">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-[15px] leading-6 text-slate-600">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

function InfoGrid({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-5 gap-y-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
      {items.map(item => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[13px] text-slate-500">{item.label}</dt>
          <dd className="mt-0.5 text-[15px] leading-6 font-semibold break-words text-slate-900">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Timeline({
  logs,
}: {
  logs: { action: string; actor: string; time: string; comment?: string }[];
}) {
  if (!logs.length)
    return <p className="text-[14px] text-slate-500">暂无操作记录</p>;
  return (
    <ol className="space-y-0">
      {logs.map((log, index) => (
        <li
          key={`${log.time}-${index}`}
          data-cy="timeline-item"
          className="relative pb-4 pl-6 last:pb-0"
        >
          <span className="absolute top-1.5 left-0 h-2.5 w-2.5 rounded-full bg-brand-500" />
          {index < logs.length - 1 && (
            <span className="absolute top-4 bottom-0 left-[4.5px] w-px bg-brand-100" />
          )}
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="text-[15px] font-semibold text-slate-900">
              {log.action}
            </span>
            <span className="text-[13px] whitespace-nowrap text-slate-500">
              {log.time}
            </span>
          </div>
          <div className="mt-0.5 text-[13px] text-slate-600">{log.actor}</div>
          {log.comment && (
            <p className="mt-1.5 rounded-md bg-slate-50 px-3 py-2 text-[14px] leading-6 text-slate-700">
              {log.comment}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

const RESULT_TONE = {
  通过: "green",
  复验: "amber",
  拦截: "rose",
} as const;

function useRefundMap(): RefundStateMap {
  const refunds = useRefundRecords();
  return useMemo(
    () =>
      Object.fromEntries(
        refunds.map(item => [item.id, item.status])
      ) as RefundStateMap,
    [refunds]
  );
}

function useSessionSold() {
  const config = useTicketConfig();
  return (date: string) =>
    config.sessions
      .find(session => session.date === date)
      ?.tickets.reduce((sum, ticket) => sum + ticket.sold, 0) ?? 0;
}

/* ---------------- 现场核验 ---------------- */

export function OnsiteWorkbench({
  actor,
  role,
  compact = false,
  exceptionOpen,
  setExceptionOpen,
}: {
  actor: OpsActor;
  role: OpsRole;
  compact?: boolean;
  exceptionOpen?: boolean;
  setExceptionOpen?: (open: boolean) => void;
}) {
  const ops = useActivityOps();
  const refundMap = useRefundMap();
  const soldOf = useSessionSold();
  const [session, setSession] = useState<string>(OPS_SESSIONS[0]);
  const [dialog, setDialog] = useState<"scan" | "manual" | "realname" | null>(
    null
  );
  const [localException, setLocalException] = useState(false);
  const [prefill, setPrefill] = useState("");
  const [issueId, setIssueId] = useState<string | null>(null);
  const canEdit = role !== "culture";
  const excOpen = exceptionOpen ?? localException;
  const setExcOpen = setExceptionOpen ?? setLocalException;
  const stats = onsiteStats(ops, session);
  const sold = soldOf(session);
  const records = ops.checkins.filter(item => item.sessionDate === session);
  const exceptions = ops.issues.filter(item => item.source === "现场异常");
  const openExceptions = exceptions.filter(item => item.status !== "已完成");

  const openException = (related = "") => {
    setPrefill(related);
    setDialog(null);
    setExcOpen(true);
  };

  const exportHandover = () => {
    const rows: (string | number)[][] = [
      [
        "场次",
        "核验时间",
        "电子票码",
        "持票人",
        "票种",
        "核验方式",
        "核验结果",
        "说明",
        "入口",
        "操作人",
      ],
      ...records.map(item => [
        sessionLabel(item.sessionDate),
        item.time,
        item.code,
        item.holder,
        item.ticketName,
        item.method,
        item.result,
        item.reason,
        item.gate,
        item.operator,
      ]),
      [],
      ["现场统计", "已售票", "已实名", "已入场", "当前场内", "未完成异常"],
      [
        sessionLabel(session),
        sold,
        stats.realName,
        stats.entered,
        stats.inVenue,
        openExceptions.length,
      ],
      [],
      [
        "现场异常编号",
        "类型",
        "关联对象",
        "等级",
        "责任方",
        "状态",
        "处置记录",
      ],
      ...exceptions.map(item => [
        item.no,
        item.title,
        item.related ?? "",
        item.level,
        item.owner,
        item.status,
        item.logs.map(log => `${log.time} ${log.action}`).join(" / "),
      ]),
    ];
    downloadCsv(
      `现场交接表_${sessionLabel(session)}_${opsNow().slice(0, 10)}.csv`,
      rows
    );
    updateOps(state =>
      recordExport(
        state,
        actor,
        "导出现场交接表",
        `${sessionLabel(session)} 核验记录 ${records.length} 条`
      )
    );
    toast.success(`已导出现场交接表 共 ${records.length} 条核验记录`);
  };

  return (
    <div className="space-y-5" data-cy="onsite-workbench">
      {!compact && (
        <PageTitle
          eyebrow="现场管理"
          title="现场核验与入场运行"
          description={
            <Phrases
              parts={[
                "电子票二维码",
                "实名信息",
                "角色服装道具",
                "现场异常 统一处理",
              ]}
            />
          }
          actions={
            canEdit ? (
              <button
                type="button"
                data-cy="onsite-exception-top"
                onClick={() => openException()}
                className={dangerBtn}
              >
                <CircleAlert className="h-5 w-5" />
                登记现场异常
              </button>
            ) : undefined
          }
        />
      )}
      <section className="relative overflow-hidden rounded-2xl bg-brand-900 p-5 text-white sm:p-6">
        <div
          className="vi-halftone pointer-events-none absolute inset-0 opacity-60"
          aria-hidden="true"
        />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-brand-100">
                2026 魔都动漫嘉年华 · 当前场次
              </span>
              <div className="inline-flex rounded-full bg-white/10 p-1">
                {OPS_SESSIONS.map(date => (
                  <button
                    key={date}
                    type="button"
                    data-cy={`onsite-session-${date}`}
                    aria-pressed={session === date}
                    onClick={() => setSession(date)}
                    className={`h-8 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold ${
                      session === date
                        ? "bg-white text-brand-900"
                        : "text-white/85 hover:text-white"
                    }`}
                  >
                    {sessionLabel(date)}
                  </button>
                ))}
              </div>
            </div>
            <h2 className="mt-2 text-[26px] font-semibold">现场核验工作台</h2>
            <p className="mt-2 text-[15px] leading-6 text-white/85">
              <Phrases
                parts={["扫描电子票二维码", "系统核对订单 实名与退款状态"]}
              />
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              data-cy="onsite-scan"
              onClick={() => setDialog("scan")}
              className="flex h-16 w-full items-center justify-center gap-3 rounded-full bg-sun-400 px-7 text-[18px] font-semibold text-brand-900 shadow-[0_4px_0_0_#2b2350] transition-transform hover:bg-[#ffd04d] active:translate-y-[2px] active:shadow-[0_2px_0_0_#2b2350] sm:w-auto"
            >
              <ScanLine className="h-7 w-7" />
              扫码核验
            </button>
          )}
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <BannerStat
            label="本场已售票"
            value={n(sold)}
            cy="onsite-stat-sold"
          />
          <BannerStat
            label="已实名"
            value={n(stats.realName)}
            cy="onsite-stat-realname"
          />
          <BannerStat
            label="已入场"
            value={n(stats.entered)}
            cy="onsite-stat-entered"
          />
          <BannerStat
            label="当前场内"
            value={n(stats.inVenue)}
            cy="onsite-stat-invenue"
          />
          <BannerStat
            label="未完成异常"
            value={String(openExceptions.length).padStart(2, "0")}
            danger={openExceptions.length > 0}
            cy="onsite-stat-exceptions"
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="实时入场记录"
          description={
            <Phrases parts={["扫码 手动核验与实名核对", "即时写入活动档案"]} />
          }
          actions={<Tag tone="green">本场 {records.length} 条</Tag>}
          cy="checkin-list"
        >
          {records.length ? (
            <div className="divide-y divide-slate-200">
              {records.slice(0, 8).map(item => (
                <CheckinItem key={item.id} record={item} />
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-[15px] font-semibold text-slate-800">
                本场次暂无核验记录
              </p>
              <p className="mt-1 text-[14px] text-slate-600">
                开场后扫码核验的记录会显示在这里
              </p>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setDialog("scan")}
                  className={`${outlineBtn} mt-4`}
                >
                  <ScanLine className="h-4 w-4" />
                  开始扫码核验
                </button>
              )}
            </div>
          )}
        </SectionCard>
        <div className="space-y-5">
          <SectionCard
            title="分时入场"
            description={`${sessionLabel(session)} 每小时入场人数`}
          >
            {session === OPS_SESSIONS[0] ? (
              <div className="px-3 pt-4 pb-2" data-cy="onsite-entry-chart">
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={HOURLY_ENTRIES} margin={{ left: -18 }}>
                      <CartesianGrid vertical={false} stroke="#eceaf7" />
                      <XAxis
                        dataKey="hour"
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                      />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} />
                      <Tooltip
                        cursor={{ fill: "#f1f0fd" }}
                        formatter={value => [`${value} 人`, "入场"]}
                      />
                      <Bar
                        dataKey="entered"
                        fill="#7471d6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="px-2 pb-2 text-[14px] font-semibold text-slate-700">
                  高峰 10:00 时段 504 人
                </p>
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-[14px] text-slate-600">
                该场次尚未开始入场
              </p>
            )}
          </SectionCard>
          <SectionCard title="现场操作">
            <div className="grid grid-cols-1 gap-3 p-4 min-[460px]:grid-cols-2">
              <OpsTile
                cy="onsite-manual"
                icon={<Keyboard className="h-5 w-5" />}
                title="手动核验电子票"
                text="二维码无法识别时使用"
                disabled={!canEdit}
                onClick={() => setDialog("manual")}
              />
              <OpsTile
                cy="onsite-realname"
                icon={<IdCard className="h-5 w-5" />}
                title="实名信息核对"
                text="姓名与证件号后 4 位"
                disabled={!canEdit}
                onClick={() => setDialog("realname")}
              />
              <OpsTile
                cy="onsite-exception"
                icon={<ShieldAlert className="h-5 w-5" />}
                title="登记现场异常"
                text="同步生成问题记录"
                disabled={!canEdit}
                onClick={() => openException()}
              />
              <OpsTile
                cy="onsite-export"
                icon={<FileDown className="h-5 w-5" />}
                title="导出现场交接表"
                text="核验记录与异常处置"
                onClick={exportHandover}
              />
            </div>
          </SectionCard>
        </div>
      </section>

      <SectionCard
        title="现场异常"
        description={
          <Phrases parts={["登记后自动进入问题记录", "处理进展双向同步"]} />
        }
        actions={
          canEdit ? (
            <button
              type="button"
              onClick={() => openException()}
              className={outlineBtn}
            >
              <CircleAlert className="h-4 w-4" />
              登记现场异常
            </button>
          ) : undefined
        }
        cy="onsite-exceptions"
      >
        {exceptions.length ? (
          <div className="divide-y divide-slate-200">
            {exceptions.map(item => (
              <IssueLine
                key={item.id}
                issue={item}
                onOpen={() => setIssueId(item.id)}
              />
            ))}
          </div>
        ) : (
          <p className="px-5 py-8 text-center text-[14px] text-slate-600">
            暂无现场异常
          </p>
        )}
      </SectionCard>

      {dialog === "scan" && (
        <ScanDialog
          session={session}
          refundMap={refundMap}
          actor={actor}
          onClose={() => setDialog(null)}
          onException={openException}
        />
      )}
      {dialog === "manual" && (
        <ManualDialog
          session={session}
          refundMap={refundMap}
          actor={actor}
          onClose={() => setDialog(null)}
          onException={openException}
        />
      )}
      {dialog === "realname" && (
        <RealNameDialog
          session={session}
          actor={actor}
          onClose={() => setDialog(null)}
          onException={openException}
        />
      )}
      {excOpen && (
        <ExceptionDialog
          session={session}
          prefill={prefill}
          actor={actor}
          onClose={() => setExcOpen(false)}
          onDone={id => {
            setExcOpen(false);
            setIssueId(id);
          }}
        />
      )}
      {issueId && (
        <IssueDrawer
          issueId={issueId}
          actor={actor}
          canEdit={canEdit}
          onClose={() => setIssueId(null)}
        />
      )}
    </div>
  );
}

function BannerStat({
  label,
  value,
  danger,
  cy,
}: {
  label: string;
  value: string;
  danger?: boolean;
  cy?: string;
}) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 p-3">
      <div className="text-[13px] whitespace-nowrap text-brand-100">
        {label}
      </div>
      <div
        data-cy={cy}
        className={`mt-1 text-[24px] leading-7 font-semibold tabular-nums ${danger ? "text-rose-300" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function OpsTile({
  icon,
  title,
  text,
  onClick,
  disabled,
  cy,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  onClick: () => void;
  disabled?: boolean;
  cy?: string;
}) {
  return (
    <button
      type="button"
      data-cy={cy}
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-[84px] items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-brand-300 hover:bg-brand-50/50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold whitespace-nowrap text-slate-900">
          {title}
        </span>
        <span className="mt-1 block text-[13px] leading-5 text-slate-600">
          {text}
        </span>
      </span>
    </button>
  );
}

function CheckinItem({ record }: { record: CheckinRecord }) {
  return (
    <div data-cy="checkin-row" className="flex items-start gap-3 px-5 py-4">
      <span
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          record.result === "通过"
            ? "bg-emerald-50 text-emerald-700"
            : record.result === "复验"
              ? "bg-amber-50 text-amber-700"
              : "bg-rose-50 text-rose-700"
        }`}
      >
        {record.method === "实名核对" ? (
          <IdCard className="h-4 w-4" />
        ) : record.result === "拦截" ? (
          <ShieldAlert className="h-4 w-4" />
        ) : (
          <BadgeCheck className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[15px] font-semibold whitespace-nowrap">
            {record.holder}
          </span>
          <span className="text-[13px] whitespace-nowrap text-slate-600">
            {record.ticketName}
          </span>
          <span className="text-[12px] whitespace-nowrap text-slate-500">
            {record.method} · {record.gate}
          </span>
        </div>
        <p className="mt-1 text-[14px] leading-5 text-slate-700">
          {record.reason}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <Tag tone={RESULT_TONE[record.result]}>{record.result}</Tag>
        <div className="mt-1 text-[12px] whitespace-nowrap text-slate-500">
          {record.time.slice(11)}
        </div>
      </div>
    </div>
  );
}

function OutcomeCard({
  outcome,
  onException,
  cy = "scan-result",
}: {
  outcome: Pick<VerifyOutcome, "result" | "reason" | "ticket"> & {
    code?: string;
  };
  onException?: (related: string) => void;
  cy?: string;
}) {
  const tone = {
    通过: "border-emerald-200 bg-emerald-50 text-emerald-800",
    复验: "border-amber-200 bg-amber-50 text-amber-800",
    拦截: "border-rose-200 bg-rose-50 text-rose-800",
  }[outcome.result];
  const title = {
    通过: "核验通过 可以入场",
    复验: "实名通过 请引导至复验区",
    拦截: "已拦截 暂不能入场",
  }[outcome.result];
  const ticket = outcome.ticket;
  return (
    <div
      data-cy={cy}
      data-result={outcome.result}
      className={`rounded-xl border p-4 ${tone}`}
    >
      <div className="flex items-center gap-2 text-[18px] font-semibold">
        {outcome.result === "拦截" ? (
          <ShieldAlert className="h-5 w-5" />
        ) : (
          <BadgeCheck className="h-5 w-5" />
        )}
        {title}
      </div>
      <p className="mt-1.5 text-[15px] leading-6">{outcome.reason}</p>
      {ticket && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-white/70 p-3 text-slate-800">
          <div>
            <dt className="text-[12px] text-slate-500">持票人</dt>
            <dd className="text-[15px] font-semibold">{ticket.holder}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-slate-500">票种 · 场次</dt>
            <dd className="text-[15px] font-semibold whitespace-nowrap">
              {ticket.ticketName} · {sessionLabel(ticket.sessionDate)}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[12px] text-slate-500">电子票码</dt>
            <dd className="text-[15px] font-semibold tabular-nums">
              {ticket.code}
            </dd>
          </div>
        </dl>
      )}
      {outcome.result !== "通过" && onException && (
        <button
          type="button"
          data-cy="scan-to-exception"
          onClick={() =>
            onException(
              ticket ? `${ticket.holder} ${ticket.code}` : (outcome.code ?? "")
            )
          }
          className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50"
        >
          <CircleAlert className="h-4 w-4" />
          登记为现场异常
        </button>
      )}
    </div>
  );
}

const GATES = ["1号入口", "2号入口", "Coser 复验区"];

function ScanDialog({
  session,
  refundMap,
  actor,
  onClose,
  onException,
}: {
  session: string;
  refundMap: RefundStateMap;
  actor: OpsActor;
  onClose: () => void;
  onException: (related: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [gate, setGate] = useState(GATES[0]);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<
    (VerifyOutcome & { code: string }) | null
  >(null);
  const [count, setCount] = useState(0);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const submit = () => {
    if (!value.trim()) {
      setError("请扫描电子票二维码 或输入电子票码 订单号");
      inputRef.current?.focus();
      return;
    }
    const result = verifyTicket(getActivityOps(), value, {
      session,
      refunds: refundMap,
      method: "扫码核验",
      operator: actor.name,
      gate,
    });
    updateOps(state => addCheckin(state, result.record));
    setOutcome({ ...result, code: value.trim().toUpperCase() });
    setCount(current => current + 1);
    setValue("");
    setError("");
    inputRef.current?.focus();
  };
  return (
    <Modal
      title="扫码核验"
      cy="scan-dialog"
      description={
        <Phrases
          parts={[
            `${sessionLabel(session)} 场次`,
            "扫码枪扫描后自动识别",
            "也可输入电子票码",
          ]}
        />
      }
      onClose={onClose}
      footer={
        <>
          <span className="mr-auto text-[14px] text-slate-600">
            本次已核验 {count} 张
          </span>
          <button type="button" onClick={onClose} className={outlineBtn}>
            完成核验
          </button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
          <Field label="电子票码或订单号" error={error}>
            <div className="relative">
              <ScanLine className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-brand-600" />
              <input
                ref={inputRef}
                data-cy="scan-input"
                value={value}
                onChange={event => {
                  setValue(event.target.value);
                  setError("");
                }}
                placeholder="例如 QT-20260628-48305"
                autoComplete="off"
                className={`${fieldClass} pl-10 tabular-nums`}
              />
            </div>
          </Field>
          <Field label="核验入口">
            <select
              value={gate}
              onChange={event => setGate(event.target.value)}
              className={fieldClass}
            >
              {GATES.map(item => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
        </div>
        <button
          type="submit"
          data-cy="scan-submit"
          className={`${primaryBtn} w-full`}
        >
          <ScanLine className="h-5 w-5" />
          核验电子票
        </button>
      </form>
      <div className="mt-4">
        {outcome ? (
          <OutcomeCard outcome={outcome} onException={onException} />
        ) : (
          <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/60 p-4 text-[14px] leading-6 text-slate-600">
            <Phrases
              parts={[
                "核验顺序",
                "票码有效",
                "场次一致",
                "退款状态",
                "是否已入场",
                "实名认证",
                "道具复验",
              ]}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

const MANUAL_REASONS = [
  "手机无法出示二维码",
  "二维码无法识别",
  "购票人未携带手机",
];

function ManualDialog({
  session,
  refundMap,
  actor,
  onClose,
  onException,
}: {
  session: string;
  refundMap: RefundStateMap;
  actor: OpsActor;
  onClose: () => void;
  onException: (related: string) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [why, setWhy] = useState(MANUAL_REASONS[0]);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<VerifyOutcome | null>(null);
  const results = searchTickets(keyword, 8);
  const confirm = () => {
    if (!selected) {
      setError("请先查找并选择要核验的电子票");
      return;
    }
    const result = verifyTicket(getActivityOps(), selected, {
      session,
      refunds: refundMap,
      method: "手动核验",
      operator: actor.name,
      gate: "人工核验台",
    });
    const record = { ...result.record, reason: `${result.reason}（${why}）` };
    updateOps(state => addCheckin(state, record));
    setOutcome(result);
    setError("");
  };
  return (
    <Modal
      title="手动核验电子票"
      cy="manual-dialog"
      description={
        <Phrases
          parts={["按姓名 电子票码或订单号查找", "核验规则与扫码一致"]}
        />
      }
      onClose={onClose}
      footer={
        outcome ? (
          <>
            <button
              type="button"
              onClick={() => {
                setOutcome(null);
                setSelected(null);
                setKeyword("");
              }}
              className={outlineBtn}
            >
              核验下一位
            </button>
            <button type="button" onClick={onClose} className={primaryBtn}>
              完成
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onClose} className={outlineBtn}>
              取消
            </button>
            <button
              type="button"
              data-cy="manual-confirm"
              onClick={confirm}
              className={primaryBtn}
            >
              核验所选电子票
            </button>
          </>
        )
      }
    >
      {outcome ? (
        <OutcomeCard
          outcome={outcome}
          onException={onException}
          cy="manual-result"
        />
      ) : (
        <div className="space-y-4">
          <Field label="查找电子票" error={error}>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                data-cy="manual-search"
                value={keyword}
                onChange={event => {
                  setKeyword(event.target.value);
                  setSelected(null);
                  setError("");
                }}
                placeholder="输入购票人姓名 电子票码或订单号"
                className={`${fieldClass} pl-10`}
              />
            </div>
          </Field>
          {keyword.trim() && (
            <div className="space-y-2" role="listbox">
              {results.length ? (
                results.map(ticket => (
                  <button
                    type="button"
                    key={ticket.code}
                    role="option"
                    aria-selected={selected === ticket.code}
                    data-cy="manual-option"
                    onClick={() => {
                      setSelected(ticket.code);
                      setError("");
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left ${
                      selected === ticket.code
                        ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/15"
                        : "border-slate-200 hover:border-brand-300"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold">
                        {ticket.holder}
                        <span className="ml-2 text-[13px] font-normal text-slate-600">
                          {ticket.ticketName}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[13px] text-slate-500 tabular-nums">
                        {ticket.code}
                      </span>
                    </span>
                    <Tag
                      tone={ticket.sessionDate === session ? "blue" : "slate"}
                    >
                      {sessionLabel(ticket.sessionDate)}
                    </Tag>
                  </button>
                ))
              ) : (
                <p className="rounded-lg bg-slate-50 px-4 py-3 text-[14px] text-slate-600">
                  未找到匹配的电子票
                </p>
              )}
            </div>
          )}
          <Field label="手动核验原因">
            <select
              value={why}
              onChange={event => setWhy(event.target.value)}
              className={fieldClass}
            >
              {MANUAL_REASONS.map(item => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
        </div>
      )}
    </Modal>
  );
}

function RealNameDialog({
  session,
  actor,
  onClose,
  onException,
}: {
  session: string;
  actor: OpsActor;
  onClose: () => void;
  onException: (related: string) => void;
}) {
  const [form, setForm] = useState({ code: "", name: "", idTail: "" });
  const [errors, setErrors] = useState<
    Partial<Record<keyof typeof form, string>>
  >({});
  const [outcome, setOutcome] = useState<RealNameOutcome | null>(null);
  const set = (key: keyof typeof form, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
  };
  const submit = () => {
    const next: typeof errors = {};
    if (!form.code.trim()) next.code = "请输入电子票码或订单号";
    if (!form.name.trim()) next.name = "请输入证件上的姓名";
    if (!/^\d{3}[\dXx]$/.test(form.idTail.trim()))
      next.idTail = "请输入证件号后 4 位";
    setErrors(next);
    if (Object.keys(next).length) return;
    const result = checkRealName(form, { session, operator: actor.name });
    if (!result.ticket) {
      setErrors({ code: result.reason });
      return;
    }
    const record = result.record;
    if (record) updateOps(state => addCheckin(state, record));
    setOutcome(result);
  };
  return (
    <Modal
      title="实名信息核对"
      cy="realname-dialog"
      description={
        <Phrases parts={["核对证件与购票实名信息", "不显示完整证件号"]} />
      }
      onClose={onClose}
      footer={
        outcome ? (
          <>
            <button
              type="button"
              onClick={() => {
                setOutcome(null);
                setForm({ code: "", name: "", idTail: "" });
              }}
              className={outlineBtn}
            >
              核对下一位
            </button>
            <button type="button" onClick={onClose} className={primaryBtn}>
              完成
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onClose} className={outlineBtn}>
              取消
            </button>
            <button
              type="button"
              data-cy="realname-submit"
              onClick={submit}
              className={primaryBtn}
            >
              开始核对
            </button>
          </>
        )
      }
    >
      {outcome ? (
        <div
          data-cy="realname-result"
          data-match={outcome.match ? "yes" : "no"}
          className={`rounded-xl border p-4 ${outcome.match ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
        >
          <div className="flex items-center gap-2 text-[18px] font-semibold">
            {outcome.match ? (
              <ShieldCheck className="h-5 w-5" />
            ) : (
              <ShieldAlert className="h-5 w-5" />
            )}
            {outcome.match ? "实名信息一致" : "实名信息不一致"}
          </div>
          <p className="mt-1.5 text-[15px] leading-6">{outcome.reason}</p>
          {outcome.ticket && (
            <p className="mt-2 text-[14px] text-slate-700">
              <Phrases
                parts={[
                  outcome.ticket.ticketName,
                  sessionLabel(outcome.ticket.sessionDate),
                  outcome.ticket.code,
                ]}
              />
            </p>
          )}
          {!outcome.match && outcome.ticket && (
            <button
              type="button"
              onClick={() =>
                onException(`${outcome.ticket?.holder} ${outcome.ticket?.code}`)
              }
              className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50"
            >
              <CircleAlert className="h-4 w-4" />
              登记为现场异常
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="电子票码或订单号" error={errors.code} required>
            <input
              autoFocus
              data-cy="realname-code"
              value={form.code}
              onChange={event => set("code", event.target.value)}
              placeholder="例如 QT-20260628-48305"
              className={`${fieldClass} tabular-nums`}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="证件姓名" error={errors.name} required>
              <input
                data-cy="realname-name"
                value={form.name}
                onChange={event => set("name", event.target.value)}
                placeholder="与证件一致"
                className={fieldClass}
              />
            </Field>
            <Field label="证件号后 4 位" error={errors.idTail} required>
              <input
                data-cy="realname-tail"
                value={form.idTail}
                maxLength={4}
                inputMode="text"
                onChange={event => set("idTail", event.target.value)}
                placeholder="如 0034"
                className={`${fieldClass} tabular-nums`}
              />
            </Field>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ExceptionDialog({
  session,
  prefill,
  actor,
  onClose,
  onDone,
}: {
  session: string;
  prefill: string;
  actor: OpsActor;
  onClose: () => void;
  onDone: (issueId: string) => void;
}) {
  const [form, setForm] = useState<ExceptionInput>({
    type: "",
    related: prefill,
    session,
    level: "中",
    action: "",
  });
  const [errors, setErrors] = useState<ExceptionErrors>({});
  const set = <K extends keyof ExceptionInput>(
    key: K,
    value: ExceptionInput[K]
  ) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
  };
  const submit = () => {
    const next = validateException(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    updateOps(state => addException(state, form, actor));
    const created = getActivityOps().issues[0];
    toast.success(`已登记现场异常 ${created.no} 并同步到问题记录`);
    onDone(created.id);
  };
  return (
    <Modal
      title="登记现场异常"
      cy="exception-dialog"
      description={
        <Phrases parts={["登记后进入问题记录", "可继续分派与跟进处置"]} />
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={outlineBtn}>
            取消
          </button>
          <button
            type="button"
            data-cy="exception-submit"
            onClick={submit}
            className={dangerBtn}
          >
            提交异常
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="异常类型" error={errors.type} required>
            <select
              data-cy="exception-type"
              value={form.type}
              onChange={event => set("type", event.target.value)}
              className={fieldClass}
            >
              <option value="">请选择</option>
              {EXCEPTION_TYPES.map(item => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="发生场次">
            <select
              value={form.session}
              onChange={event => set("session", event.target.value)}
              className={fieldClass}
            >
              {OPS_SESSIONS.map(date => (
                <option key={date} value={date}>
                  {sessionLabel(date)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="关联电子票 订单或参与人" error={errors.related} required>
          <input
            data-cy="exception-related"
            value={form.related}
            onChange={event => set("related", event.target.value)}
            placeholder="如 李思远 QT-20260628-47720"
            className={fieldClass}
          />
        </Field>
        <div>
          <span className="block text-[14px] font-semibold text-slate-800">
            紧急程度
          </span>
          <div className="mt-2 flex gap-2">
            {(["高", "中", "低"] as IssueLevel[]).map(level => (
              <button
                type="button"
                key={level}
                data-cy={`exception-level-${level}`}
                aria-pressed={form.level === level}
                onClick={() => set("level", level)}
                className={`h-10 min-w-[64px] rounded-full border px-4 text-[14px] font-semibold ${
                  form.level === level
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-300 text-slate-700 hover:border-brand-300"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
        <Field label="核验结果与现场处置" error={errors.action} required>
          <textarea
            data-cy="exception-action"
            value={form.action}
            onChange={event => set("action", event.target.value)}
            placeholder="如 道具长度超出规定 已引导至复验区等待安保确认"
            className={areaClass}
          />
        </Field>
      </div>
    </Modal>
  );
}

/* ---------------- 问题记录 ---------------- */

const LEVEL_TONE = { 高: "rose", 中: "amber", 低: "slate" } as const;
const STATUS_TONE = {
  待处理: "amber",
  处理中: "blue",
  已完成: "green",
} as const;

function IssueLine({
  issue,
  onOpen,
}: {
  issue: IssueRecord;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      data-cy="issue-row"
      data-status={issue.status}
      onClick={onOpen}
      className="flex w-full flex-col gap-3 px-5 py-4 text-left hover:bg-brand-50/40 sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Tag tone={LEVEL_TONE[issue.level]}>{issue.level}</Tag>
        <div className="min-w-0">
          <div className="text-[15px] leading-6 font-semibold text-slate-900">
            {issue.title}
          </div>
          <div className="mt-0.5 text-[13px] leading-5 text-slate-600">
            <Phrases
              parts={[
                issue.no,
                issue.category,
                issue.source,
                `责任方 ${issue.owner}`,
                `时限 ${issue.deadline}`,
              ]}
            />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 pl-11 sm:pl-0">
        <Tag tone={STATUS_TONE[issue.status]}>{issue.status}</Tag>
        <span className="inline-flex items-center gap-1 text-[14px] font-semibold whitespace-nowrap text-brand-600">
          处理记录
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </button>
  );
}

export function IssueDrawer({
  issueId,
  actor,
  canEdit,
  onClose,
}: {
  issueId: string;
  actor: OpsActor;
  canEdit: boolean;
  onClose: () => void;
}) {
  const ops = useActivityOps();
  const issue = ops.issues.find(item => item.id === issueId);
  const [comment, setComment] = useState("");
  const [owner, setOwner] = useState(issue?.owner ?? ISSUE_OWNERS[0]);
  const [error, setError] = useState("");
  if (!issue) return null;
  const act = (action: "progress" | "complete" | "reopen" | "assign") => {
    if ((action === "progress" || action === "complete") && !comment.trim()) {
      setError(action === "complete" ? "请填写处置结果" : "请填写本次处理进展");
      return;
    }
    if (action === "assign" && owner === issue.owner) {
      setError("请选择新的责任方");
      return;
    }
    updateOps(state =>
      updateIssue(state, issue.id, action, { comment, owner }, actor)
    );
    setComment("");
    setError("");
    toast.success(
      {
        progress: "已记录处理进展",
        complete: "已标记处置完成",
        reopen: "已重新打开",
        assign: `已改派给 ${owner}`,
      }[action]
    );
  };
  return (
    <Sheet
      title={issue.title}
      eyebrow={`${issue.source} · ${issue.no}`}
      onClose={onClose}
      cy="issue-drawer"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Tag tone={LEVEL_TONE[issue.level]}>紧急程度 {issue.level}</Tag>
          <span data-cy="issue-status">
            <Tag tone={STATUS_TONE[issue.status]}>{issue.status}</Tag>
          </span>
        </div>
        <InfoGrid
          items={[
            { label: "问题类型", value: issue.category },
            { label: "责任方", value: issue.owner },
            { label: "处理时限", value: issue.deadline },
            { label: "关联对象", value: issue.related ?? "—" },
            {
              label: "登记",
              value: `${issue.createdBy} ${issue.createdAt}`,
            },
          ]}
        />
        <div>
          <h3 className="text-[15px] font-semibold">问题描述</h3>
          <p className="mt-1.5 text-[15px] leading-7 text-slate-700">
            {issue.detail}
          </p>
        </div>
        <div>
          <h3 className="mb-3 flex items-center gap-1.5 text-[15px] font-semibold">
            <History className="h-4 w-4 text-brand-600" />
            处理记录
          </h3>
          <Timeline logs={issue.logs} />
        </div>
        {canEdit && (
          <div className="space-y-4 rounded-xl border border-brand-200 bg-brand-50/50 p-4">
            <h3 className="text-[15px] font-semibold">
              {issue.status === "已完成" ? "重新打开" : "办理"}
            </h3>
            <Field
              label={issue.status === "已完成" ? "重新打开原因" : "处理说明"}
              error={error}
            >
              <textarea
                data-cy="issue-comment"
                value={comment}
                onChange={event => {
                  setComment(event.target.value);
                  setError("");
                }}
                placeholder={
                  issue.status === "已完成"
                    ? "选填 说明重新打开的原因"
                    : "如 已联系场馆协调组 20:00 后由马俊值守"
                }
                className={areaClass}
              />
            </Field>
            {issue.status === "已完成" ? (
              <button
                type="button"
                data-cy="issue-reopen"
                onClick={() => act("reopen")}
                className={outlineBtn}
              >
                重新打开
              </button>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-cy="issue-progress"
                    onClick={() => act("progress")}
                    className={outlineBtn}
                  >
                    记录进展
                  </button>
                  <button
                    type="button"
                    data-cy="issue-complete"
                    onClick={() => act("complete")}
                    className={primaryBtn}
                  >
                    处置完成
                  </button>
                </div>
                <div className="flex flex-col gap-2 border-t border-brand-100 pt-4 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Field label="改派责任方">
                      <select
                        data-cy="issue-assign-owner"
                        value={owner}
                        onChange={event => {
                          setOwner(event.target.value);
                          setError("");
                        }}
                        className={fieldClass}
                      >
                        {ISSUE_OWNERS.map(item => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <button
                    type="button"
                    data-cy="issue-assign"
                    onClick={() => act("assign")}
                    className={outlineBtn}
                  >
                    改派
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ---------------- 第 2 部分：问题记录 参与人员 活动数据 归档 数据中心 摘要 通知 ---------------- */

const todayDate = () => opsNow().slice(0, 10);
const maskName = (name: string) => {
  const plain = name.split("·")[0];
  return `${plain.slice(0, 1)}${"*".repeat(Math.min(Math.max(plain.length - 1, 1), 2))}`;
};
const REFUND_TEXT = {
  pending_review: "退款待审批",
  refunded: "已退款",
  rejected: "退款已驳回",
} as const;

function EmptyBlock({
  title,
  text,
  action,
}: {
  title: string;
  text?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      data-cy="empty-state"
      className="flex flex-col items-center px-5 py-10 text-center"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <ClipboardList className="h-5 w-5" />
      </div>
      <div className="mt-3 text-[16px] font-semibold text-slate-900">
        {title}
      </div>
      {text && (
        <p className="mt-1 text-[14px] leading-6 text-slate-600">{text}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "blue",
  cy,
  action,
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  icon: ReactNode;
  tone?: "blue" | "amber" | "rose";
  cy?: string;
  action?: ReactNode;
}) {
  const colors = {
    blue: "bg-brand-500 text-white",
    amber: "bg-sun-400 text-brand-900",
    rose: "bg-candy-400 text-candy-700",
  }[tone];
  return (
    <div
      data-cy={cy}
      className="flex min-w-0 flex-col rounded-xl border border-[#e7e6f4] bg-white p-5"
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full ${colors}`}
      >
        {icon}
      </div>
      <div className="mt-4 text-[14px] leading-5 text-slate-600 [word-break:keep-all]">
        {label}
      </div>
      <div
        data-cy={cy ? `${cy}-value` : undefined}
        className="mt-1 text-[28px] leading-8 font-semibold tracking-[-0.05em] text-slate-900"
      >
        {value}
      </div>
      {sub && (
        <div className="mt-2 text-[14px] leading-6 font-medium text-slate-600">
          {sub}
        </div>
      )}
      {action && <div className="mt-auto pt-4">{action}</div>}
    </div>
  );
}

/* ---------- 问题记录 ---------- */

type IssueFilter = "all" | "待处理" | "处理中" | "已完成";

export function IssuesPanel({
  actor,
  role,
}: {
  actor: OpsActor;
  role: OpsRole;
}) {
  const ops = useActivityOps();
  const canEdit = role !== "culture";
  const [filter, setFilter] = useState<IssueFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [issueId, setIssueId] = useState<string | null>(null);
  const count = (status: IssueFilter) =>
    status === "all"
      ? ops.issues.length
      : ops.issues.filter(item => item.status === status).length;
  const list = ops.issues.filter(
    item => filter === "all" || item.status === filter
  );
  const exportIssues = () => {
    downloadCsv(`问题记录_${todayDate()}.csv`, [
      [
        "编号",
        "等级",
        "标题",
        "类型",
        "来源",
        "责任方",
        "处理时限",
        "状态",
        "关联对象",
        "登记人",
        "登记时间",
        "处理记录",
      ],
      ...ops.issues.map(item => [
        item.no,
        item.level,
        item.title,
        item.category,
        item.source,
        item.owner,
        item.deadline,
        item.status,
        item.related ?? "",
        item.createdBy,
        item.createdAt,
        item.logs
          .map(
            log =>
              `${log.time} ${log.action}${log.comment ? ` ${log.comment}` : ""}`
          )
          .join(" / "),
      ]),
    ]);
    updateOps(state =>
      recordExport(state, actor, "导出问题记录", `共 ${state.issues.length} 条`)
    );
    toast.success(`已导出问题记录 共 ${ops.issues.length} 条`);
  };
  return (
    <div className="space-y-5" data-cy="issues-panel">
      <PageTitle
        title="问题记录"
        description={
          <Phrases
            parts={[
              "记录活动准备 售票 现场服务与核验中的问题",
              "分派责任方并跟进到处置完成",
            ]}
          />
        }
        actions={
          <>
            <button
              type="button"
              data-cy="issue-export"
              onClick={exportIssues}
              className={outlineBtn}
            >
              <Download className="h-4 w-4" />
              导出记录
            </button>
            {canEdit && (
              <button
                type="button"
                data-cy="issue-create"
                onClick={() => setCreateOpen(true)}
                className={dangerBtn}
              >
                <CircleAlert className="h-4 w-4" />
                登记问题
              </button>
            )}
          </>
        }
      />
      <Segmented<IssueFilter>
        value={filter}
        cy="issue-filter"
        onChange={setFilter}
        options={[
          { value: "all", label: "全部", count: count("all") },
          { value: "待处理", label: "待处理", count: count("待处理") },
          { value: "处理中", label: "处理中", count: count("处理中") },
          { value: "已完成", label: "已完成", count: count("已完成") },
        ]}
      />
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {list.length ? (
          <div className="divide-y divide-slate-200">
            {list.map(item => (
              <IssueLine
                key={item.id}
                issue={item}
                onOpen={() => setIssueId(item.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyBlock
            title="当前筛选下没有问题记录"
            text="可切换到全部查看 或登记新的问题"
            action={
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={outlineBtn}
              >
                查看全部
              </button>
            }
          />
        )}
      </section>
      {createOpen && (
        <IssueCreateDialog
          actor={actor}
          onClose={() => setCreateOpen(false)}
          onDone={id => {
            setCreateOpen(false);
            setFilter("all");
            setIssueId(id);
          }}
        />
      )}
      {issueId && (
        <IssueDrawer
          issueId={issueId}
          actor={actor}
          canEdit={canEdit}
          onClose={() => setIssueId(null)}
        />
      )}
    </div>
  );
}

function IssueCreateDialog({
  actor,
  onClose,
  onDone,
}: {
  actor: OpsActor;
  onClose: () => void;
  onDone: (id: string) => void;
}) {
  const [form, setForm] = useState<IssueInput>({
    title: "",
    detail: "",
    category: "",
    level: "中",
    owner: ISSUE_OWNERS[0],
    deadline: todayDate(),
    related: "",
  });
  const [errors, setErrors] = useState<IssueErrors>({});
  const set = <K extends keyof IssueInput>(key: K, value: IssueInput[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
  };
  const submit = () => {
    const next = validateIssue(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    updateOps(state => addIssue(state, form, actor));
    const created = getActivityOps().issues[0];
    toast.success(`已登记问题 ${created.no} 已通知${created.owner}`);
    onDone(created.id);
  };
  return (
    <Modal
      title="登记问题"
      cy="issue-form"
      description={
        <Phrases parts={["登记后进入问题记录", "责任方可在处理记录中跟进"]} />
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={outlineBtn}>
            取消
          </button>
          <button
            type="button"
            data-cy="issue-form-submit"
            onClick={submit}
            className={dangerBtn}
          >
            提交问题
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="问题标题" error={errors.title} required>
          <input
            data-cy="issue-form-title"
            value={form.title}
            maxLength={40}
            onChange={event => set("title", event.target.value)}
            placeholder="如 2号入口排队超过 20 分钟"
            className={fieldClass}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="问题类型" error={errors.category} required>
            <select
              data-cy="issue-form-category"
              value={form.category}
              onChange={event => set("category", event.target.value)}
              className={fieldClass}
            >
              <option value="">请选择</option>
              {ISSUE_CATEGORIES.map(item => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="责任方" error={errors.owner} required>
            <select
              data-cy="issue-form-owner"
              value={form.owner}
              onChange={event => set("owner", event.target.value)}
              className={fieldClass}
            >
              {ISSUE_OWNERS.map(item => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="block text-[14px] font-semibold text-slate-800">
              紧急程度
            </span>
            <div className="mt-2 flex gap-2">
              {(["高", "中", "低"] as IssueLevel[]).map(level => (
                <button
                  type="button"
                  key={level}
                  data-cy={`issue-form-level-${level}`}
                  aria-pressed={form.level === level}
                  onClick={() => set("level", level)}
                  className={`h-11 min-w-[64px] rounded-full border px-4 text-[14px] font-semibold ${
                    form.level === level
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-300 text-slate-700 hover:border-brand-300"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          <Field label="处理时限" error={errors.deadline} required>
            <input
              type="date"
              data-cy="issue-form-deadline"
              value={form.deadline}
              onChange={event => set("deadline", event.target.value)}
              className={fieldClass}
            />
          </Field>
        </div>
        <Field label="关联对象" hint="选填 如电子票码 参与人或材料名称">
          <input
            data-cy="issue-form-related"
            value={form.related ?? ""}
            onChange={event => set("related", event.target.value)}
            placeholder="如 安全工作方案"
            className={fieldClass}
          />
        </Field>
        <Field label="问题描述" error={errors.detail} required>
          <textarea
            data-cy="issue-form-detail"
            value={form.detail}
            onChange={event => set("detail", event.target.value)}
            placeholder="说明发现时间 地点 影响范围和已采取的措施"
            className={areaClass}
          />
        </Field>
      </div>
    </Modal>
  );
}

/* ---------- 参与人员 ---------- */

function useParticipantFigures() {
  const config = useTicketConfig();
  const ops = useActivityOps();
  const submissions = useSubmissions();
  const byName = (name: string) =>
    config.sessions.reduce(
      (sum, session) =>
        sum +
        session.tickets
          .filter(ticket => ticket.name === name)
          .reduce((acc, ticket) => acc + ticket.sold, 0),
      0
    );
  const totalSold = config.sessions.reduce(
    (sum, session) =>
      sum + session.tickets.reduce((acc, ticket) => acc + ticket.sold, 0),
    0
  );
  const coserSold = byName("Coser 专属票");
  const realName = OPS_SESSIONS.reduce(
    (sum, date) => sum + (ONSITE_BASE[date]?.realName ?? 0),
    0
  );
  const entered = OPS_SESSIONS.reduce(
    (sum, date) => sum + onsiteStats(ops, date).entered,
    0
  );
  const staffTotal = ops.units.reduce((sum, unit) => sum + unit.count, 0);
  const staffVerified = ops.units.reduce((sum, unit) => sum + unit.verified, 0);
  const reviewing = submissions.filter(item => item.status !== "approved");
  return {
    totalSold,
    coserSold,
    realName,
    entered,
    staffTotal,
    staffVerified,
    submissions,
    reviewing,
  };
}

export function ParticipantsPanel({
  actor,
  role,
  onOpenReview,
}: {
  actor: OpsActor;
  role: OpsRole;
  onOpenReview: () => void;
}) {
  const ops = useActivityOps();
  const figures = useParticipantFigures();
  const canEdit = role !== "culture";
  const [sheet, setSheet] = useState<"audience" | "staff" | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const exportList = () => {
    downloadCsv(`参与人员脱敏名单_${todayDate()}.csv`, [
      [
        "类别",
        "姓名",
        "票种或单位",
        "场次或岗位",
        "证件号",
        "实名或资料",
        "入场或区域",
      ],
      ...E_TICKETS.map(ticket => {
        const checkin = ops.checkins.find(
          item => item.code === ticket.code && item.result !== "拦截"
        );
        return [
          "购票观众",
          maskName(ticket.holder),
          ticket.ticketName,
          sessionLabel(ticket.sessionDate),
          `**** ${ticket.idTail}`,
          ticket.realName ? "已实名" : "未实名",
          checkin ? `已入场 ${checkin.time}` : "未入场",
        ];
      }),
      ...ops.staff.map(item => [
        "工作人员",
        maskName(item.name),
        item.unit,
        item.post,
        `**** ${item.idTail}`,
        item.status,
        item.area,
      ]),
    ]);
    updateOps(state =>
      recordExport(
        state,
        actor,
        "导出参与人员脱敏名单",
        `电子票 ${E_TICKETS.length} 条 工作人员 ${state.staff.length} 人`
      )
    );
    toast.success("已导出参与人员脱敏名单");
  };
  return (
    <div className="space-y-5" data-cy="participants-panel">
      <PageTitle
        title="参与人员"
        description={
          <Phrases
            parts={[
              "统一查看购票观众 Coser 参展商与工作人员",
              "证件号与手机号均脱敏显示",
            ]}
          />
        }
        actions={
          <>
            <button
              type="button"
              data-cy="participants-export"
              onClick={exportList}
              className={outlineBtn}
            >
              <Download className="h-4 w-4" />
              导出脱敏名单
            </button>
            {canEdit && (
              <button
                type="button"
                data-cy="staff-create"
                onClick={() => setCreateOpen(true)}
                className={primaryBtn}
              >
                <UserPlus className="h-4 w-4" />
                新增工作人员
              </button>
            )}
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          cy="participants-audience"
          label="购票观众"
          value={n(figures.totalSold)}
          icon={<Ticket className="h-5 w-5" />}
          sub={
            <Phrases
              parts={[
                `已实名 ${n(figures.realName)}`,
                `已入场 ${n(figures.entered)}`,
              ]}
            />
          }
          action={
            <button
              type="button"
              data-cy="participants-open-audience"
              onClick={() => setSheet("audience")}
              className={linkBtn}
            >
              查看名单
              <ArrowRight className="h-4 w-4" />
            </button>
          }
        />
        <StatCard
          cy="participants-coser"
          label="Coser 参与者"
          value={n(figures.coserSold)}
          tone="rose"
          icon={<BadgeCheck className="h-5 w-5" />}
          sub={
            <Phrases
              parts={[
                `角色申报 ${figures.submissions.length} 份`,
                `审核中 ${figures.reviewing.length} 份`,
              ]}
            />
          }
          action={
            <button
              type="button"
              data-cy="participants-open-review"
              onClick={onOpenReview}
              className={linkBtn}
            >
              {canEdit ? "进入审核" : "查看申报"}
              <ArrowRight className="h-4 w-4" />
            </button>
          }
        />
        <StatCard
          cy="participants-staff"
          label="参展商与工作人员"
          value={n(figures.staffTotal)}
          tone="amber"
          icon={<Users className="h-5 w-5" />}
          sub={
            <Phrases
              parts={[
                `资料已核验 ${n(figures.staffVerified)}`,
                `待核验 ${n(figures.staffTotal - figures.staffVerified)}`,
              ]}
            />
          }
          action={
            <button
              type="button"
              data-cy="participants-open-staff"
              onClick={() => setSheet("staff")}
              className={linkBtn}
            >
              查看资料
              <ArrowRight className="h-4 w-4" />
            </button>
          }
        />
      </div>
      <SectionCard
        title="工作人员登记"
        cy="staff-section"
        description={
          <Phrases parts={["新增人员默认待资料核验", "核验后计入上岗人数"]} />
        }
      >
        <StaffList actor={actor} canEdit={canEdit} />
        {canEdit && (
          <div className="border-t border-slate-200 px-5 py-4">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className={outlineBtn}
            >
              <UserPlus className="h-4 w-4" />
              新增工作人员
            </button>
          </div>
        )}
      </SectionCard>
      {sheet === "audience" && <AudienceSheet onClose={() => setSheet(null)} />}
      {sheet === "staff" && (
        <StaffSheet
          actor={actor}
          canEdit={canEdit}
          onClose={() => setSheet(null)}
          onCreate={() => setCreateOpen(true)}
        />
      )}
      {createOpen && (
        <StaffCreateDialog actor={actor} onClose={() => setCreateOpen(false)} />
      )}
    </div>
  );
}

function StaffList({ actor, canEdit }: { actor: OpsActor; canEdit: boolean }) {
  const ops = useActivityOps();
  if (!ops.staff.length) return <EmptyBlock title="还没有登记工作人员" />;
  return (
    <div className="divide-y divide-slate-200">
      {ops.staff.map(item => (
        <div
          key={item.id}
          data-cy="staff-row"
          data-status={item.status}
          className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
        >
          <div className="min-w-0 flex-1">
            <div className="text-[15px] leading-6 font-semibold text-slate-900">
              {item.name}
              <span className="ml-2 text-[14px] font-medium text-slate-600">
                {item.post}
              </span>
            </div>
            <div className="mt-0.5 text-[13px] leading-5 text-slate-600">
              <Phrases
                parts={[
                  item.unit,
                  item.area,
                  item.phone,
                  `证件后四位 ${item.idTail}`,
                ]}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tag tone={item.status === "资料已核验" ? "green" : "amber"}>
              {item.status}
            </Tag>
            {canEdit && item.status !== "资料已核验" && (
              <button
                type="button"
                data-cy="staff-verify"
                onClick={() => {
                  updateOps(state => verifyStaff(state, item.id, actor));
                  toast.success(`${item.name} 资料已核验`);
                }}
                className={linkBtn}
              >
                <ShieldCheck className="h-4 w-4" />
                核验通过
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

type AudienceFilter = "all" | (typeof OPS_SESSIONS)[number];

function AudienceSheet({ onClose }: { onClose: () => void }) {
  const ops = useActivityOps();
  const refundMap = useRefundMap();
  const [keyword, setKeyword] = useState("");
  const [session, setSession] = useState<AudienceFilter>("all");
  const word = keyword.trim().toLowerCase();
  const list = E_TICKETS.filter(
    ticket =>
      (session === "all" || ticket.sessionDate === session) &&
      (!word ||
        ticket.holder.toLowerCase().includes(word) ||
        ticket.code.toLowerCase().includes(word) ||
        ticket.orderNo.toLowerCase().includes(word))
  );
  return (
    <Sheet
      title="购票观众名单"
      eyebrow="参与人员"
      cy="audience-sheet"
      wide
      onClose={onClose}
    >
      <div className="space-y-4">
        <p className="text-[14px] leading-6 text-slate-600">
          <Phrases
            parts={[
              "按出票时间列出最近的电子票",
              "姓名 证件号已脱敏",
              "入场状态来自现场核验记录",
            ]}
          />
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              data-cy="audience-search"
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
              placeholder="搜索姓名 电子票码或订单号"
              className={`${fieldClass} pl-9`}
            />
          </div>
          <Segmented<AudienceFilter>
            value={session}
            cy="audience-session"
            onChange={setSession}
            options={[
              { value: "all", label: "全部场次" },
              ...OPS_SESSIONS.map(date => ({
                value: date,
                label: sessionLabel(date),
              })),
            ]}
          />
        </div>
        {list.length ? (
          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">
            {list.map(ticket => {
              const checkin = ops.checkins.find(
                item => item.code === ticket.code && item.result !== "拦截"
              );
              const refund = ticket.refundId
                ? refundMap[ticket.refundId]
                : undefined;
              return (
                <div
                  key={ticket.code}
                  data-cy="audience-row"
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] leading-6 font-semibold text-slate-900">
                      {maskName(ticket.holder)}
                      <span className="ml-2 text-[14px] font-medium text-slate-600">
                        {ticket.ticketName}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[13px] leading-5 text-slate-600">
                      <Phrases
                        parts={[
                          sessionLabel(ticket.sessionDate),
                          ticket.code,
                          `证件 **** ${ticket.idTail}`,
                        ]}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Tag tone={ticket.realName ? "green" : "rose"}>
                      {ticket.realName ? "已实名" : "未实名"}
                    </Tag>
                    {refund && (
                      <Tag tone={refund === "refunded" ? "slate" : "amber"}>
                        {REFUND_TEXT[refund]}
                      </Tag>
                    )}
                    <Tag tone={checkin ? "blue" : "slate"}>
                      {checkin ? `已入场 ${checkin.time.slice(11)}` : "未入场"}
                    </Tag>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyBlock
            title="没有找到匹配的电子票"
            text="请核对姓名或票码"
            action={
              <button
                type="button"
                onClick={() => {
                  setKeyword("");
                  setSession("all");
                }}
                className={outlineBtn}
              >
                清除条件
              </button>
            }
          />
        )}
      </div>
    </Sheet>
  );
}

function StaffSheet({
  actor,
  canEdit,
  onClose,
  onCreate,
}: {
  actor: OpsActor;
  canEdit: boolean;
  onClose: () => void;
  onCreate: () => void;
}) {
  const ops = useActivityOps();
  return (
    <Sheet
      title="参展商与工作人员资料"
      eyebrow="参与人员"
      cy="staff-sheet"
      wide
      onClose={onClose}
      footer={
        canEdit ? (
          <button type="button" onClick={onCreate} className={primaryBtn}>
            <UserPlus className="h-4 w-4" />
            新增工作人员
          </button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="bg-slate-50 text-[13px] text-slate-600">
                <th className="px-4 py-3 font-semibold">单位</th>
                <th className="px-4 py-3 font-semibold">人员类别</th>
                <th className="px-4 py-3 text-right font-semibold">登记人数</th>
                <th className="px-4 py-3 text-right font-semibold">已核验</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {ops.units.map(unit => (
                <tr key={unit.name} data-cy="staff-unit">
                  <td className="px-4 py-3 text-[15px] font-semibold">
                    {unit.name}
                  </td>
                  <td className="px-4 py-3 text-[14px] text-slate-600">
                    {unit.type}
                  </td>
                  <td className="px-4 py-3 text-right text-[15px] font-semibold tabular-nums">
                    {n(unit.count)}
                  </td>
                  <td className="px-4 py-3 text-right text-[15px] font-semibold tabular-nums">
                    <span
                      className={
                        unit.verified < unit.count
                          ? "text-amber-700"
                          : "text-emerald-700"
                      }
                    >
                      {n(unit.verified)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="mb-2 text-[15px] font-semibold">重点岗位人员</h3>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <StaffList actor={actor} canEdit={canEdit} />
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function StaffCreateDialog({
  actor,
  onClose,
}: {
  actor: OpsActor;
  onClose: () => void;
}) {
  const ops = useActivityOps();
  const [form, setForm] = useState<StaffInput>({
    name: "",
    unit: "",
    post: "",
    phone: "",
    idTail: "",
    area: "",
  });
  const [errors, setErrors] = useState<StaffErrors>({});
  const set = <K extends keyof StaffInput>(key: K, value: StaffInput[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
  };
  const submit = () => {
    const next = validateStaff(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    updateOps(state => addStaff(state, form, actor));
    toast.success(`已新增工作人员 ${form.name.trim()} 待资料核验`);
    onClose();
  };
  return (
    <Modal
      title="新增工作人员"
      cy="staff-form"
      description={
        <Phrases parts={["登记后进入工作人员名单", "资料核验后计入上岗人数"]} />
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={outlineBtn}>
            取消
          </button>
          <button
            type="button"
            data-cy="staff-form-submit"
            onClick={submit}
            className={primaryBtn}
          >
            保存
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="姓名" error={errors.name} required>
          <input
            data-cy="staff-form-name"
            value={form.name}
            onChange={event => set("name", event.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="所属单位" error={errors.unit} required>
          <select
            data-cy="staff-form-unit"
            value={form.unit}
            onChange={event => set("unit", event.target.value)}
            className={fieldClass}
          >
            <option value="">请选择</option>
            {ops.units.map(unit => (
              <option key={unit.name}>{unit.name}</option>
            ))}
          </select>
        </Field>
        <Field label="岗位" error={errors.post} required>
          <input
            data-cy="staff-form-post"
            value={form.post}
            onChange={event => set("post", event.target.value)}
            placeholder="如 入口引导"
            className={fieldClass}
          />
        </Field>
        <Field label="工作区域" error={errors.area} required>
          <select
            data-cy="staff-form-area"
            value={form.area}
            onChange={event => set("area", event.target.value)}
            className={fieldClass}
          >
            <option value="">请选择</option>
            {STAFF_AREAS.map(area => (
              <option key={area}>{area}</option>
            ))}
          </select>
        </Field>
        <Field label="手机号" error={errors.phone} required>
          <input
            data-cy="staff-form-phone"
            inputMode="numeric"
            maxLength={13}
            value={form.phone}
            onChange={event => set("phone", event.target.value)}
            className={fieldClass}
          />
        </Field>
        <Field label="证件号后 4 位" error={errors.idTail} required>
          <input
            data-cy="staff-form-idtail"
            maxLength={4}
            value={form.idTail}
            onChange={event => set("idTail", event.target.value)}
            className={fieldClass}
          />
        </Field>
      </div>
    </Modal>
  );
}

/* ---------- 活动数据 ---------- */

function useEventFigures() {
  const config = useTicketConfig();
  const refunds = useRefundRecords();
  const ops = useActivityOps();
  return useMemo(() => {
    const sessions = OPS_SESSIONS.map(date => {
      const rows = buildSessionStock(config.sessions, refunds, date);
      const sold = rows.reduce((sum, row) => sum + row.sold, 0);
      const refunded = rows.reduce((sum, row) => sum + row.refunded, 0);
      const revenue = rows.reduce(
        (sum, row) => sum + row.sold * row.ticket.price - row.refundedAmount,
        0
      );
      const onsite = onsiteStats(ops, date);
      return { date, sold, refunded, revenue, ...onsite };
    });
    const sold = sessions.reduce((sum, item) => sum + item.sold, 0);
    const revenue = sessions.reduce((sum, item) => sum + item.revenue, 0);
    const refundedCount = refunds.filter(
      item => item.status === "refunded"
    ).length;
    const refundedAmount = refunds
      .filter(item => item.status === "refunded")
      .reduce((sum, item) => sum + item.amount, 0);
    const pendingRefunds = refunds.filter(
      item => item.status === "pending_review"
    ).length;
    const first = sessions[0];
    const openIssues = ops.issues.filter(item => item.status !== "已完成");
    const exceptions = ops.issues.filter(item => item.source === "现场异常");
    const checks = ops.checkins.filter(item => item.method !== "实名核对");
    const blocked = checks.filter(item => item.result === "拦截").length;
    return {
      sessions,
      sold,
      revenue,
      refundedCount,
      refundedAmount,
      pendingRefunds,
      first,
      openIssues,
      exceptions,
      checks,
      blocked,
      realName: sessions.reduce((sum, item) => sum + item.realName, 0),
      entered: sessions.reduce((sum, item) => sum + item.entered, 0),
      inVenue: sessions.reduce((sum, item) => sum + item.inVenue, 0),
    };
  }, [config, refunds, ops]);
}

const pctText = (part: number, total: number) =>
  total ? `${((part / total) * 100).toFixed(1)}%` : "—";

type ChartMode = "sales" | "entries";

export function EventDataPanel({ actor }: { actor: OpsActor }) {
  const figures = useEventFigures();
  const [mode, setMode] = useState<ChartMode>("sales");
  const chartData =
    mode === "sales"
      ? DAILY_SALES.map(item => ({ label: item.day, value: item.sold }))
      : HOURLY_ENTRIES.map(item => ({ label: item.hour, value: item.entered }));
  const chartTotal = chartData.reduce((sum, item) => sum + item.value, 0);
  const exportData = () => {
    downloadCsv(`活动数据_${todayDate()}.csv`, [
      [
        "场次",
        "已售票",
        "已退款",
        "净收入",
        "已实名",
        "已入场",
        "当前场内",
        "入场率",
      ],
      ...figures.sessions.map(item => [
        sessionLabel(item.date),
        item.sold,
        item.refunded,
        item.revenue,
        item.realName,
        item.entered,
        item.inVenue,
        pctText(item.entered, item.sold),
      ]),
      [],
      ["售票周期", "售出张数"],
      ...DAILY_SALES.map(item => [item.day, item.sold]),
      [],
      ["6月28日入场时段", "入场人数"],
      ...HOURLY_ENTRIES.map(item => [item.hour, item.entered]),
      [],
      [
        "退款已完成",
        "退款金额",
        "退款待审批",
        "现场核验次数",
        "核验拦截",
        "未完成问题",
      ],
      [
        figures.refundedCount,
        figures.refundedAmount,
        figures.pendingRefunds,
        figures.checks.length,
        figures.blocked,
        figures.openIssues.length,
      ],
    ]);
    updateOps(state =>
      recordExport(
        state,
        actor,
        "导出活动数据",
        "售票 入场 退款 核验与问题统计"
      )
    );
    toast.success("已导出活动数据");
  };
  return (
    <div className="space-y-5" data-cy="event-data-panel">
      <PageTitle
        title="活动数据"
        description={
          <Phrases
            parts={[
              "售票 退款 实名 入场与核验数据",
              "随票务与现场操作实时更新",
            ]}
          />
        }
        actions={
          <button
            type="button"
            data-cy="event-data-export"
            onClick={exportData}
            className={outlineBtn}
          >
            <Download className="h-4 w-4" />
            导出活动数据
          </button>
        }
      />
      <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 xl:grid-cols-4">
        <StatCard
          cy="data-revenue"
          label="售票净收入"
          value={money(figures.revenue)}
          icon={<Ticket className="h-5 w-5" />}
          sub={<Phrases parts={[`已售 ${n(figures.sold)} 张`, "已扣除退款"]} />}
        />
        <StatCard
          cy="data-refund"
          label="退款"
          value={`${figures.refundedCount} 笔`}
          tone="amber"
          icon={<History className="h-5 w-5" />}
          sub={
            <Phrases
              parts={[
                `退款金额 ${money(figures.refundedAmount)}`,
                `待审批 ${figures.pendingRefunds} 笔`,
              ]}
            />
          }
        />
        <StatCard
          cy="data-entry"
          label="6月28日入场率"
          value={pctText(figures.first.entered, figures.first.sold)}
          icon={<ScanLine className="h-5 w-5" />}
          sub={
            <Phrases
              parts={[
                `已入场 ${n(figures.first.entered)}`,
                `已售 ${n(figures.first.sold)}`,
              ]}
            />
          }
        />
        <StatCard
          cy="data-issue"
          label="未完成问题"
          value={`${figures.openIssues.length} 项`}
          tone="rose"
          icon={<CircleAlert className="h-5 w-5" />}
          sub={
            <Phrases
              parts={[
                `现场异常 ${figures.exceptions.length} 项`,
                `核验拦截 ${figures.blocked} 次`,
              ]}
            />
          }
        />
      </div>
      <div className="grid grid-cols-1 gap-5 min-[1080px]:grid-cols-[1.4fr_0.6fr]">
        <section
          data-cy="trend-chart"
          className="rounded-xl border border-slate-200 bg-white p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-[18px] leading-7 font-semibold">
                售票与入场趋势
              </h3>
              <p className="mt-1 text-[14px] leading-6 text-slate-600">
                {mode === "sales" ? (
                  <Phrases
                    parts={["按售票周期统计", `合计 ${n(chartTotal)} 张`]}
                  />
                ) : (
                  <Phrases
                    parts={["6月28日按小时统计", `合计 ${n(chartTotal)} 人`]}
                  />
                )}
              </p>
            </div>
            <Segmented<ChartMode>
              value={mode}
              cy="trend-mode"
              onChange={setMode}
              options={[
                { value: "sales", label: "售票趋势" },
                { value: "entries", label: "入场时段" },
              ]}
            />
          </div>
          <div className="mt-5 h-[280px] w-full" data-cy="trend-canvas">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#ecebf7"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: "#dcdaf5" }}
                  interval={0}
                  tick={{ fontSize: 12, fill: "#5b5f73" }}
                  tickFormatter={(value: string) =>
                    value.replace("现场 ", "").replace(/—.*$/, "起")
                  }
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#5b5f73" }}
                  width={48}
                />
                <Tooltip
                  cursor={{ fill: "rgba(156,154,250,0.12)" }}
                  formatter={(value: number) => [
                    `${n(value)} ${mode === "sales" ? "张" : "人"}`,
                    mode === "sales" ? "售出" : "入场",
                  ]}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #dcdaf5",
                    fontSize: 13,
                  }}
                />
                <Bar
                  dataKey="value"
                  fill={mode === "sales" ? "#7471d6" : "#9c9afa"}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-[18px] leading-7 font-semibold">数据口径</h3>
          <dl className="mt-4 space-y-4">
            {[
              ["售票", "支付成功的订单", "按场次与票种统计 含现场售票"],
              ["退款", "平台同意并原路退款", "退款完成后释放库存与限购额度"],
              ["入场", "电子票核验通过", "含扫码核验与手动核验 复验计入"],
              ["问题", "登记问题与现场异常", "处置完成后不再计入未完成"],
            ].map(([label, value, sub]) => (
              <div
                key={label}
                className="rounded-lg border border-slate-200 p-3"
              >
                <dt className="text-[13px] font-semibold text-slate-500">
                  {label}
                </dt>
                <dd className="mt-0.5 text-[15px] font-semibold text-slate-900">
                  {value}
                </dd>
                <dd className="mt-0.5 text-[13px] leading-5 text-slate-600">
                  {sub}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <SectionCard
        title="分场次运行数据"
        cy="session-data"
        description={<Phrases parts={["已售含已退款票", "入场率按已售计算"]} />}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="bg-slate-50 text-[13px] text-slate-600">
                {[
                  "场次",
                  "已售票",
                  "已退款",
                  "净收入",
                  "已实名",
                  "已入场",
                  "当前场内",
                  "入场率",
                ].map(head => (
                  <th
                    key={head}
                    className={`px-4 py-3 font-semibold whitespace-nowrap ${head === "场次" ? "" : "text-right"}`}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {figures.sessions.map(item => (
                <tr key={item.date} data-cy="session-data-row">
                  <td className="px-4 py-3 text-[15px] font-semibold whitespace-nowrap">
                    {sessionLabel(item.date)}
                  </td>
                  {[
                    n(item.sold),
                    n(item.refunded),
                    money(item.revenue),
                    n(item.realName),
                    n(item.entered),
                    n(item.inVenue),
                    pctText(item.entered, item.sold),
                  ].map((value, index) => (
                    <td
                      key={index}
                      className="px-4 py-3 text-right text-[15px] font-semibold whitespace-nowrap tabular-nums"
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

/* ---------- 活动摘要报告（预览与 Word 下载） ---------- */

export function useActivityReportInput(
  event: ReportEventInput,
  actor: OpsActor
) {
  const ops = useActivityOps();
  const config = useTicketConfig();
  const refunds = useRefundRecords();
  const submissions = useSubmissions();
  return useMemo(() => {
    const primary = event.id === PRIMARY_EVENT_ID;
    return {
      event,
      primary,
      stock: primary
        ? config.sessions.map(session => ({
            session: session.date,
            rows: buildSessionStock(config.sessions, refunds, session.date).map(
              row => ({
                name: row.ticket.name,
                price: row.ticket.price,
                inventory: row.ticket.inventory,
                sold: row.sold,
                refunded: row.refunded,
                remaining: row.remaining,
                status: row.ticket.status,
                purchaseLimit: row.ticket.purchaseLimit,
                realName: row.ticket.realName,
              })
            ),
          }))
        : [],
      refunds: primary
        ? refunds.map(item => ({
            requestNo: item.requestNo,
            buyerName: item.buyerName,
            ticketName: item.ticketName,
            ticketCode: item.ticketCode,
            amount: item.amount,
            reason: item.reason,
            status: item.status,
            processedBy: item.processedBy,
          }))
        : [],
      submissions: primary
        ? submissions.map(item => ({
            participant: item.participant,
            role: item.role,
            source: item.source,
            riskLabel: item.riskLabel,
            statusLabel: SUBMISSION_STATUS_LABEL[item.status],
          }))
        : [],
      ops,
      actor,
    };
  }, [event, actor, ops, config, refunds, submissions]);
}

async function downloadReport(report: ActivityReport) {
  try {
    await downloadReportDocx(report);
    return true;
  } catch {
    toast.error("文件生成失败 请稍后重试");
    return false;
  }
}

export function ActivityReportDialog({
  event,
  actor,
  onClose,
}: {
  event: ReportEventInput;
  actor: OpsActor;
  onClose: () => void;
}) {
  const input = useActivityReportInput(event, actor);
  const report = useMemo(() => buildActivityReport(input), [input]);
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    const ok = await downloadReport(report);
    setBusy(false);
    if (!ok) return;
    updateOps(state =>
      recordExport(state, actor, "导出活动摘要", report.fileName)
    );
    toast.success(`已下载 ${report.fileName}`);
  };
  return (
    <Modal
      title="活动摘要"
      cy="report-dialog"
      wide
      description={
        <Phrases
          parts={[
            `${report.generatedAt} 生成`,
            "下载的 Word 文件与预览内容一致",
          ]}
        />
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={outlineBtn}>
            关闭
          </button>
          <button
            type="button"
            data-cy="report-download"
            disabled={busy}
            onClick={download}
            className={primaryBtn}
          >
            <FileDown className="h-4 w-4" />
            {busy ? "正在生成" : "下载 Word 文件"}
          </button>
        </>
      }
    >
      <ReportView report={report} />
    </Modal>
  );
}

function ReportView({ report }: { report: ActivityReport }) {
  return (
    <article className="space-y-6" data-cy="report-view">
      <header className="rounded-xl bg-brand-900 px-5 py-5 text-white vi-halftone">
        <div className="text-[13px] font-semibold text-brand-100">
          活动摘要 · {report.stage}
        </div>
        <h3 className="mt-1 text-[22px] leading-8 font-semibold">
          {report.title}
        </h3>
        <div className="mt-0.5 text-[15px] text-brand-100">
          {report.subtitle}
        </div>
      </header>
      <dl className="grid gap-x-5 gap-y-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
        {report.meta.map(item => (
          <div key={item.label} className="min-w-0">
            <dt className="text-[13px] text-slate-500">{item.label}</dt>
            <dd className="mt-0.5 text-[15px] leading-6 font-semibold break-words text-slate-900">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {report.highlights.map(item => (
          <div
            key={item.label}
            className={`rounded-lg border p-3 ${item.tone === "warn" ? "border-amber-200 bg-amber-50/60" : "border-slate-200"}`}
          >
            <div className="text-[13px] text-slate-500">{item.label}</div>
            <div className="mt-1 text-[20px] leading-7 font-semibold tabular-nums">
              {item.value}
            </div>
            {item.note && (
              <div className="mt-0.5 text-[12px] leading-5 text-slate-600">
                {item.note}
              </div>
            )}
          </div>
        ))}
      </div>
      {report.sections.map((section, index) => (
        <section
          key={section.id}
          data-cy="report-section"
          data-section={section.id}
          className="border-t border-slate-200 pt-5"
        >
          <h4 className="text-[17px] leading-7 font-semibold text-slate-900">
            {index + 1}. {section.title}
          </h4>
          {section.intro && (
            <p className="mt-1 text-[14px] leading-6 text-slate-600">
              {section.intro}
            </p>
          )}
          {section.metrics && section.metrics.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              {section.metrics.map(metric => (
                <div
                  key={metric.label}
                  className="rounded-md bg-slate-50 px-3 py-2"
                >
                  <div className="text-[12px] text-slate-500">
                    {metric.label}
                  </div>
                  <div
                    className={`text-[16px] font-semibold tabular-nums ${metric.tone === "warn" ? "text-amber-700" : "text-slate-900"}`}
                  >
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          )}
          {section.table && section.table.rows.length > 0 && (
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="bg-brand-50 text-[13px] text-slate-700">
                    {section.table.headers.map(head => (
                      <th
                        key={head}
                        className="px-3 py-2 font-semibold whitespace-nowrap"
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {section.table.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-3 py-2 text-[14px] leading-6 text-slate-800"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {section.bullets && section.bullets.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {section.bullets.map(item => (
                <li
                  key={item}
                  className="relative pl-4 text-[14px] leading-6 text-slate-700"
                >
                  <span className="absolute top-2.5 left-0 h-1.5 w-1.5 rounded-full bg-brand-500" />
                  {item}
                </li>
              ))}
            </ul>
          )}
          {section.empty &&
            !section.table?.rows.length &&
            !section.bullets?.length &&
            !section.metrics?.length && (
              <p className="mt-2 text-[14px] text-slate-500">{section.empty}</p>
            )}
        </section>
      ))}
    </article>
  );
}

/* ---------- 活动档案 ---------- */

type ArchiveKey = "materials" | "tickets" | "people" | "issues" | "logs";

export function ArchivePanel({
  actor,
  role,
  event,
  compact = false,
}: {
  actor: OpsActor;
  role: OpsRole;
  event: ReportEventInput;
  compact?: boolean;
}) {
  const ops = useActivityOps();
  const refunds = useRefundRecords();
  const input = useActivityReportInput(event, actor);
  const canEdit = role !== "culture";
  const [open, setOpen] = useState<ArchiveKey | null>(null);
  const [busy, setBusy] = useState(false);
  const required = ops.materials.filter(item => !item.conditional);
  const ready = required.filter(item => MATERIAL_READY.includes(item.status));
  const pendingRefunds = refunds.filter(
    item => item.status === "pending_review"
  ).length;
  const pendingStaff = ops.staff.filter(
    item => item.status !== "资料已核验"
  ).length;
  const openIssues = ops.issues.filter(item => item.status !== "已完成").length;
  const ended = event.stageIndex >= 5;
  const generate = async () => {
    setBusy(true);
    const report = buildActivityReport(input);
    const ok = await downloadReport(report);
    setBusy(false);
    if (!ok) return;
    updateOps(state =>
      canEdit
        ? markArchiveSummary(state, actor)
        : recordExport(state, actor, "下载活动摘要", report.fileName)
    );
    toast.success(`已生成并下载 ${report.fileName}`);
  };
  const lines: {
    key: ArchiveKey;
    icon: ReactNode;
    title: string;
    detail: string;
    status: string;
    tone: "green" | "blue" | "amber";
  }[] = [
    {
      key: "materials",
      icon: <FileText className="h-5 w-5" />,
      title: "活动资料与材料版本",
      detail: `必备材料 ${ready.length} / ${required.length} 已归集`,
      status: ready.length === required.length ? "已归集" : "归集中",
      tone: ready.length === required.length ? "green" : "amber",
    },
    {
      key: "tickets",
      icon: <Ticket className="h-5 w-5" />,
      title: "票务 订单 退款与电子票核验汇总",
      detail: pendingRefunds
        ? `${pendingRefunds} 笔退款待审批`
        : "订单与退款均已处理",
      status: pendingRefunds ? "持续更新" : "已归集",
      tone: pendingRefunds ? "blue" : "green",
    },
    {
      key: "people",
      icon: <Users className="h-5 w-5" />,
      title: "参与人员脱敏汇总与现场入场记录",
      detail: pendingStaff
        ? `${pendingStaff} 名工作人员待资料核验`
        : `入场核验 ${ops.checkins.length} 条`,
      status: pendingStaff ? "持续更新" : "已归集",
      tone: pendingStaff ? "blue" : "green",
    },
    {
      key: "issues",
      icon: <CircleAlert className="h-5 w-5" />,
      title: "问题记录 异常核验与处置过程",
      detail: openIssues
        ? `${openIssues} 项未完成`
        : `${ops.issues.length} 项均已处置`,
      status: openIssues ? "持续更新" : "已归集",
      tone: openIssues ? "blue" : "green",
    },
    {
      key: "logs",
      icon: <ScrollText className="h-5 w-5" />,
      title: "活动复盘摘要与操作日志",
      detail: ops.archive.summaryAt
        ? `${ops.archive.summaryBy} ${ops.archive.summaryAt} 生成摘要`
        : `操作日志 ${ops.logs.length} 条`,
      status: ops.archive.summaryAt ? "已生成" : "待生成",
      tone: ops.archive.summaryAt ? "green" : "amber",
    },
  ];
  return (
    <div className="space-y-5" data-cy="archive-panel">
      {!compact && (
        <PageTitle
          eyebrow="数字档案"
          title="活动档案"
          description={
            <Phrases
              parts={[
                "汇集活动资料 票务 参与人员 现场核验与问题记录",
                "活动结束后形成完整数字档案",
              ]}
            />
          }
          actions={
            <button
              type="button"
              data-cy="archive-generate"
              disabled={busy}
              onClick={generate}
              className={primaryBtn}
            >
              <FileArchive className="h-4 w-4" />
              {busy ? "正在生成" : canEdit ? "生成归档摘要" : "下载活动摘要"}
            </button>
          }
        />
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          cy="archive-materials"
          label="资料归集"
          value={`${ready.length} / ${required.length}`}
          icon={<FileText className="h-5 w-5" />}
          sub="活动方案 安全保障与场地材料"
        />
        <StatCard
          cy="archive-data"
          label="运行数据"
          value="6 / 6"
          tone="amber"
          icon={<ClipboardList className="h-5 w-5" />}
          sub="售票 退款 实名 入场 申报与问题"
        />
        <StatCard
          cy="archive-final"
          label="结项归档"
          value={
            ops.archive.summaryAt
              ? "摘要已生成"
              : ended
                ? "待生成摘要"
                : "活动结束后"
          }
          tone="rose"
          icon={<FileArchive className="h-5 w-5" />}
          sub={
            ops.archive.summaryAt ? (
              <Phrases
                parts={[ops.archive.summaryAt, `${ops.archive.summaryBy} 生成`]}
              />
            ) : (
              "生成归档摘要后形成结项档案"
            )
          }
        />
      </div>
      <SectionCard
        title="本场活动归档清单"
        cy="archive-list"
        description={
          <Phrases parts={["归档动作全程留痕", "点击查看对应内容"]} />
        }
      >
        <div className="divide-y divide-slate-200">
          {lines.map(line => (
            <button
              type="button"
              key={line.key}
              data-cy="archive-line"
              data-key={line.key}
              onClick={() => setOpen(line.key)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-brand-50/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                {line.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] leading-6 font-semibold text-slate-900">
                  {line.title}
                </span>
                <span className="block text-[13px] leading-5 text-slate-600">
                  {line.detail}
                </span>
              </span>
              <Tag tone={line.tone}>{line.status}</Tag>
              <span className="hidden items-center gap-1 text-[14px] font-semibold whitespace-nowrap text-brand-600 sm:inline-flex">
                查看
                <ArrowRight className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>
      </SectionCard>
      {open && (
        <ArchiveSheet
          kind={open}
          actor={actor}
          canEdit={canEdit}
          busy={busy}
          onGenerate={generate}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

const ARCHIVE_TITLE: Record<ArchiveKey, string> = {
  materials: "活动资料与材料版本",
  tickets: "票务 订单 退款与电子票核验汇总",
  people: "参与人员脱敏汇总与现场入场记录",
  issues: "问题记录 异常核验与处置过程",
  logs: "活动复盘摘要与操作日志",
};

function ArchiveSheet({
  kind,
  actor,
  canEdit,
  busy,
  onGenerate,
  onClose,
}: {
  kind: ArchiveKey;
  actor: OpsActor;
  canEdit: boolean;
  busy: boolean;
  onGenerate: () => void;
  onClose: () => void;
}) {
  const ops = useActivityOps();
  const refunds = useRefundRecords();
  const config = useTicketConfig();
  const figures = useParticipantFigures();
  const [issueId, setIssueId] = useState<string | null>(null);
  let body: ReactNode = null;
  if (kind === "materials")
    body = (
      <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">
        {ops.materials.map(item => {
          const latest = item.versions[0];
          return (
            <div
              key={item.name}
              data-cy="archive-material"
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[15px] leading-6 font-semibold">
                  {item.name}
                  {item.conditional && (
                    <span className="ml-1.5 text-[13px] font-medium text-slate-500">
                      按需提交
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[13px] leading-5 text-slate-600">
                  {latest ? (
                    <Phrases
                      parts={[
                        `${latest.version} ${latest.fileName}`,
                        `${latest.uploadedBy} ${latest.uploadedAt}`,
                      ]}
                    />
                  ) : (
                    "尚未上传"
                  )}
                </div>
              </div>
              <Tag
                tone={
                  MATERIAL_READY.includes(item.status)
                    ? "green"
                    : item.conditional
                      ? "slate"
                      : "amber"
                }
              >
                {item.status}
              </Tag>
            </div>
          );
        })}
      </div>
    );
  if (kind === "tickets")
    body = (
      <div className="space-y-5">
        {config.sessions.map(session => {
          const rows = buildSessionStock(
            config.sessions,
            refunds,
            session.date
          );
          return (
            <div key={session.date}>
              <h3 className="mb-2 text-[15px] font-semibold">
                {sessionLabel(session.date)}场次
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[520px] text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[13px] text-slate-600">
                      {["票种", "库存", "已售", "已退款", "剩余"].map(head => (
                        <th
                          key={head}
                          className={`px-4 py-2.5 font-semibold ${head === "票种" ? "" : "text-right"}`}
                        >
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rows.map(row => (
                      <tr key={row.ticket.name}>
                        <td className="px-4 py-2.5 text-[14px] font-semibold whitespace-nowrap">
                          {row.ticket.name}
                        </td>
                        {[
                          row.ticket.inventory,
                          row.sold,
                          row.refunded,
                          row.remaining,
                        ].map((value, index) => (
                          <td
                            key={index}
                            className="px-4 py-2.5 text-right text-[14px] font-semibold tabular-nums"
                          >
                            {n(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
        <div>
          <h3 className="mb-2 text-[15px] font-semibold">退款申请</h3>
          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">
            {refunds.map(item => (
              <div
                key={item.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1 text-[14px] leading-6">
                  <span className="font-semibold">
                    {maskName(item.buyerName)} {item.ticketName}
                  </span>
                  <span className="ml-2 text-slate-600">
                    {item.requestNo} {money(item.amount)}
                  </span>
                </div>
                <Tag
                  tone={
                    item.status === "refunded"
                      ? "green"
                      : item.status === "rejected"
                        ? "slate"
                        : "amber"
                  }
                >
                  {
                    {
                      pending_review: "待平台审批",
                      refunded: "已同意并退款",
                      rejected: "已驳回",
                    }[item.status]
                  }
                </Tag>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  if (kind === "people")
    body = (
      <div className="space-y-5">
        <InfoGrid
          items={[
            { label: "购票观众", value: `${n(figures.totalSold)} 人次` },
            { label: "已实名", value: `${n(figures.realName)} 人` },
            { label: "已入场", value: `${n(figures.entered)} 人` },
            {
              label: "Coser 申报",
              value: `${figures.submissions.length} 份 审核中 ${figures.reviewing.length} 份`,
            },
            {
              label: "参展商与工作人员",
              value: `${n(figures.staffTotal)} 人 已核验 ${n(figures.staffVerified)}`,
            },
          ]}
        />
        <div>
          <h3 className="mb-2 text-[15px] font-semibold">现场核验记录</h3>
          {ops.checkins.length ? (
            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">
              {ops.checkins.slice(0, 12).map(item => (
                <div
                  key={item.id}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1 text-[14px] leading-6">
                    <span className="font-semibold">
                      {maskName(item.holder)} {item.ticketName}
                    </span>
                    <span className="ml-2 text-slate-600">
                      <Phrases parts={[item.time, item.method, item.gate]} />
                    </span>
                  </div>
                  <Tag tone={RESULT_TONE[item.result]}>{item.result}</Tag>
                </div>
              ))}
            </div>
          ) : (
            <EmptyBlock title="暂无现场核验记录" />
          )}
        </div>
      </div>
    );
  if (kind === "issues")
    body = ops.issues.length ? (
      <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
        {ops.issues.map(item => (
          <IssueLine
            key={item.id}
            issue={item}
            onOpen={() => setIssueId(item.id)}
          />
        ))}
      </div>
    ) : (
      <EmptyBlock title="暂无问题记录" />
    );
  if (kind === "logs")
    body = (
      <div className="space-y-5">
        <div className="flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold">
              {ops.archive.summaryAt ? "归档摘要已生成" : "归档摘要尚未生成"}
            </div>
            <div className="mt-0.5 text-[14px] leading-6 text-slate-600">
              {ops.archive.summaryAt ? (
                <Phrases
                  parts={[
                    `${ops.archive.summaryBy} ${ops.archive.summaryAt}`,
                    "可随时重新生成最新版本",
                  ]}
                />
              ) : (
                <Phrases
                  parts={["汇总资料 票务 人员 现场与问题", "生成 Word 文件"]}
                />
              )}
            </div>
          </div>
          <button
            type="button"
            data-cy="archive-sheet-generate"
            disabled={busy}
            onClick={onGenerate}
            className={primaryBtn}
          >
            <FileDown className="h-4 w-4" />
            {busy ? "正在生成" : canEdit ? "生成归档摘要" : "下载活动摘要"}
          </button>
        </div>
        <div>
          <h3 className="mb-3 text-[15px] font-semibold">操作日志</h3>
          <Timeline
            logs={ops.logs.map(log => ({
              action: log.action,
              actor: log.actor,
              time: log.time,
              comment: log.detail,
            }))}
          />
        </div>
      </div>
    );
  return (
    <>
      <Sheet
        title={ARCHIVE_TITLE[kind]}
        eyebrow="活动档案"
        cy="archive-sheet"
        wide
        onClose={onClose}
      >
        {body}
      </Sheet>
      {issueId && (
        <IssueDrawer
          issueId={issueId}
          actor={actor}
          canEdit={canEdit}
          onClose={() => setIssueId(null)}
        />
      )}
    </>
  );
}

/* ---------- 数据中心 ---------- */

export function DataCenterPanel({
  actor,
  role,
  event,
  permissions,
  onOpen,
}: {
  actor: OpsActor;
  role: OpsRole;
  event: ReportEventInput;
  permissions: string[];
  onOpen: (page: string, tab?: string) => void;
}) {
  const figures = useEventFigures();
  const people = useParticipantFigures();
  const security = people.submissions.filter(
    item => item.status === "security_review"
  ).length;
  const rows: {
    title: string;
    value: string;
    definition: string;
    module: string;
    page: string;
    tab?: string;
  }[] = [
    {
      title: "票务销售",
      value: `${n(figures.sold)} 张 / ${money(figures.revenue)}`,
      definition: "支付成功订单 按场次与票种统计 已扣除退款",
      module: "票务管理",
      page: "tickets",
    },
    {
      title: "人员与实名",
      value: `${n(figures.realName)} 人完成实名`,
      definition: "购票人实名状态汇总 不展示原始证件影像",
      module: "参与人员",
      page: "activity",
      tab: "participants",
    },
    {
      title: "入场与客流",
      value: `${n(figures.entered)} 人已入场 场内 ${n(figures.inVenue)}`,
      definition: "电子票扫码核验与手动核验通过记录",
      module: "现场管理",
      page: "onsite",
    },
    {
      title: "退款情况",
      value: `${figures.refundedCount} 笔已退款 / ${figures.pendingRefunds} 笔待审批`,
      definition: "漫圈 App 退款申请与平台审批结果",
      module: "票务管理",
      page: "tickets",
    },
    {
      title: "角色服装道具",
      value: `${people.submissions.length} 份申报 / ${security} 项待现场复验`,
      definition: "Coser 提交的角色 服装 道具与审核记录",
      module: "角色服装道具",
      page: "costumes",
    },
    {
      title: "异常与问题",
      value: `${figures.openIssues.length} 项未完成 / 现场异常 ${figures.exceptions.length} 项`,
      definition: "活动准备与现场登记的问题及处置过程",
      module: "问题记录",
      page: "activity",
      tab: "issues",
    },
  ];
  const canOpen = (page: string) =>
    page === "activity" || permissions.includes(page);
  const exportAll = () => {
    downloadCsv(`活动复盘数据_${todayDate()}.csv`, [
      ["业务主题", "当前值", "统计口径", "关联模块"],
      ...rows.map(row => [row.title, row.value, row.definition, row.module]),
      [],
      ["场次", "已售票", "已退款", "净收入", "已实名", "已入场", "入场率"],
      ...figures.sessions.map(item => [
        sessionLabel(item.date),
        item.sold,
        item.refunded,
        item.revenue,
        item.realName,
        item.entered,
        pctText(item.entered, item.sold),
      ]),
    ]);
    updateOps(state =>
      recordExport(
        state,
        actor,
        "导出活动复盘数据",
        `${rows.length} 项业务主题`
      )
    );
    toast.success("已导出活动复盘数据");
  };
  return (
    <div className="space-y-5" data-cy="data-center">
      <PageTitle
        eyebrow="数据中心"
        title="活动业务数据"
        description={
          <Phrases
            parts={["售票 入场 退款 人员 核验与问题", "数据与各业务模块同源"]}
          />
        }
        actions={
          <button
            type="button"
            data-cy="data-center-export"
            onClick={exportAll}
            className={outlineBtn}
          >
            <Download className="h-4 w-4" />
            导出活动复盘数据
          </button>
        }
      />
      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="bg-slate-50 text-[13px] text-slate-600">
              <th className="px-4 py-3 font-semibold">业务主题</th>
              <th className="px-4 py-3 font-semibold">当前值</th>
              <th className="px-4 py-3 font-semibold">统计口径</th>
              <th className="px-4 py-3 font-semibold">关联模块</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map(row => (
              <tr key={row.title} data-cy="data-center-row">
                <td className="px-4 py-3.5 text-[15px] font-semibold whitespace-nowrap">
                  {row.title}
                </td>
                <td className="px-4 py-3.5 text-[15px] font-semibold text-brand-700">
                  {row.value}
                </td>
                <td className="px-4 py-3.5 text-[14px] leading-6 text-slate-600">
                  {row.definition}
                </td>
                <td className="px-4 py-3.5">
                  {canOpen(row.page) ? (
                    <button
                      type="button"
                      data-cy="data-center-open"
                      onClick={() => onOpen(row.page, row.tab)}
                      className="inline-flex h-9 items-center gap-1 rounded-full bg-brand-50 px-3 text-[13px] font-semibold whitespace-nowrap text-brand-700 hover:bg-brand-100"
                    >
                      {row.module}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <Tag>{row.module}</Tag>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <EventDataPanel actor={actor} />
      <ArchivePanel actor={actor} role={role} event={event} compact />
    </div>
  );
}

/* ---------- 通知中心 ---------- */

function useNotices(role: OpsRole, permissions: string[]) {
  const ops = useActivityOps();
  const refunds = useRefundRecords();
  const myReviews = useMyReviewCount(role);
  const pendingRefunds = refunds.filter(
    item => item.status === "pending_review"
  ).length;
  const notices = useMemo(
    () =>
      buildNotices({
        role,
        permissions,
        state: ops,
        pendingRefunds,
        myReviews,
      }),
    [role, permissions, ops, pendingRefunds, myReviews]
  );
  const unread = unreadNotices(notices, ops, role);
  return { notices, unread };
}

export function useUnreadNoticeCount(role: OpsRole, permissions: string[]) {
  return useNotices(role, permissions).unread.length;
}

const NOTICE_TONE = {
  rose: "bg-rose-50 text-rose-600",
  amber: "bg-amber-50 text-amber-700",
  blue: "bg-brand-50 text-brand-600",
} as const;

export function NoticePanel({
  role,
  permissions,
  onClose,
  onOpen,
}: {
  role: OpsRole;
  permissions: string[];
  onClose: () => void;
  onOpen: (page: string, tab?: string) => void;
}) {
  const { notices, unread } = useNotices(role, permissions);
  const unreadIds = new Set(unread.map(item => item.id));
  const markAll = () => {
    updateOps(state =>
      markNoticeRead(
        state,
        role,
        notices.map(item => item.id)
      )
    );
    toast.success("已全部标记为已读");
  };
  const openNotice = (item: NoticeItem) => {
    updateOps(state => markNoticeRead(state, role, [item.id]));
    onClose();
    onOpen(item.page, item.tab);
  };
  return (
    <Sheet
      title="通知中心"
      eyebrow="活动待办与提醒"
      cy="notice-panel"
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14px] text-slate-600">
            {unread.length ? `${unread.length} 条未读` : "全部已读"}
          </span>
          <button
            type="button"
            data-cy="notice-read-all"
            disabled={!unread.length}
            onClick={markAll}
            className={outlineBtn}
          >
            <CheckCheck className="h-4 w-4" />
            全部标记为已读
          </button>
        </div>
        {notices.length ? (
          <div className="space-y-3">
            {notices.map(item => {
              const isUnread = unreadIds.has(item.id);
              return (
                <button
                  type="button"
                  key={item.id}
                  data-cy="notice-item"
                  data-unread={isUnread ? "true" : "false"}
                  onClick={() => openNotice(item)}
                  className={`flex w-full gap-3 rounded-xl border p-4 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/40 ${isUnread ? "border-brand-200 bg-white" : "border-slate-200 bg-slate-50/60"}`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${NOTICE_TONE[item.tone]}`}
                  >
                    <Bell className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-2">
                      <span className="flex-1 text-[15px] leading-6 font-semibold text-slate-900">
                        {item.title}
                      </span>
                      {isUnread && (
                        <span
                          aria-label="未读"
                          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-candy-500"
                        />
                      )}
                    </span>
                    <span className="mt-0.5 block text-[14px] leading-6 text-slate-600">
                      {item.text}
                    </span>
                    <span className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-[13px] text-slate-500">
                        {item.time}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[14px] font-semibold whitespace-nowrap text-brand-600">
                        {item.action}
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyBlock title="暂无通知" text="新的待办和提醒会显示在这里" />
        )}
      </div>
    </Sheet>
  );
}
