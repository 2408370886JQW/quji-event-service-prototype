import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  History,
  Minus,
  Plus,
  ReceiptText,
  Save,
  X,
} from "lucide-react";
import type { SessionTicket, SessionTicketStatus } from "./ticketSamples";
import {
  addTicketType,
  commitTicketConfig,
  findTicket,
  MAX_TICKET_TYPES,
  SALE_STATUSES,
  saleWindow,
  updateTicketConfig,
  useTicketConfig,
  type TicketActor,
  type TicketConfigErrors,
  type TicketConfigInput,
} from "./ticketConfig";
import {
  buildSessionStock,
  formatCount,
  type RefundSource,
} from "./ticketStats";
import { formatSessionDate } from "./ticketTypes";

export type TicketEditorRole = "platform" | "organizer" | "culture";

export const TICKET_ACTOR: Record<TicketEditorRole, TicketActor> = {
  organizer: { name: "林洁", role: "主办方活动运营人员" },
  platform: { name: "周可", role: "平台运营人员" },
  culture: { name: "王处长", role: "文旅业务指导人员" },
};

export const canEditTickets = (role: TicketEditorRole) => role !== "culture";

const primaryBtn =
  "h-10 px-4 rounded-full bg-brand-grad text-white text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-60";
const outlineBtn =
  "h-10 px-4 rounded-full border border-brand-200 bg-white text-[14px] font-semibold text-brand-700 hover:bg-brand-50 inline-flex items-center justify-center gap-1.5 whitespace-nowrap";
const fieldClass =
  "block h-11 w-full min-w-0 rounded-md border bg-white px-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15";

const toLocal = (value: string) => value.replace(" ", "T");
const fromLocal = (value: string) => value.replace("T", " ").slice(0, 16);

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="block text-[14px] font-semibold text-slate-800">
        {label}
      </span>
      <div className="mt-2">{children}</div>
      {error ? (
        <span
          role="alert"
          data-cy="config-error"
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

function LimitStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div
      className="inline-flex h-11 items-center rounded-md border border-slate-300 bg-white"
      data-cy="config-limit"
    >
      <button
        type="button"
        aria-label="减少限购张数"
        disabled={value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
        className="flex h-full w-11 items-center justify-center text-slate-600 disabled:text-slate-300"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span
        className="data-token w-16 text-center text-[16px] font-semibold text-slate-900"
        data-cy="config-limit-value"
      >
        {value} 张
      </span>
      <button
        type="button"
        aria-label="增加限购张数"
        disabled={value >= 10}
        onClick={() => onChange(Math.min(10, value + 1))}
        className="flex h-full w-11 items-center justify-center text-slate-600 disabled:text-slate-300"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function RealNameSwitch({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      data-cy="config-realname"
      onClick={() => onChange(!value)}
      className="flex h-11 w-full items-center justify-between gap-3 rounded-md border border-slate-300 bg-white px-3 text-left"
    >
      <span className="text-[15px] text-slate-800">
        {value ? "需要实名 一票一证" : "无需实名"}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${value ? "bg-brand-600" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-[22px]" : "translate-x-0.5"}`}
        />
      </span>
    </button>
  );
}

function StatusPicker({
  value,
  onChange,
}: {
  value: SessionTicketStatus;
  onChange: (value: SessionTicketStatus) => void;
}) {
  return (
    <div
      className="grid grid-cols-3 gap-1 rounded-full border border-[#e4e3f0] bg-white p-1"
      data-cy="config-status"
      role="radiogroup"
      aria-label="销售状态"
    >
      {SALE_STATUSES.map(status => (
        <button
          key={status}
          type="button"
          role="radio"
          aria-checked={value === status}
          onClick={() => onChange(status)}
          className={`h-9 rounded-full text-[14px] font-semibold whitespace-nowrap ${value === status ? "bg-brand-grad text-white" : "text-slate-600 hover:bg-brand-50"}`}
        >
          {status === "售票中" ? "开售" : status === "已停售" ? "停售" : status}
        </button>
      ))}
    </div>
  );
}

const inputFrom = (ticket: SessionTicket, date: string): TicketConfigInput => {
  const window = saleWindow(ticket, date);
  return {
    price: String(ticket.price),
    inventory: String(ticket.inventory),
    purchaseLimit: ticket.purchaseLimit,
    realName: ticket.realName,
    status: ticket.status,
    saleStart: window.start,
    saleEnd: window.end,
  };
};

/** 票种配置抽屉：按场次查看与修改一个票种 */
export function TicketConfigDrawer({
  role,
  ticketName,
  initialDate,
  refunds,
  onClose,
  onViewOrders,
}: {
  role: TicketEditorRole;
  ticketName: string;
  initialDate: string;
  refunds: RefundSource[];
  onClose: () => void;
  onViewOrders: (date: string) => void;
}) {
  const config = useTicketConfig();
  const editable = canEditTickets(role);
  const dates = config.sessions
    .filter(session => session.tickets.some(item => item.name === ticketName))
    .map(session => session.date);
  const [date, setDate] = useState(
    dates.includes(initialDate) ? initialDate : dates[0]
  );
  const ticket = findTicket(config, date, ticketName);
  const [form, setForm] = useState<TicketConfigInput | null>(
    ticket ? inputFrom(ticket, date) : null
  );
  const [syncAll, setSyncAll] = useState(false);
  const [errors, setErrors] = useState<TicketConfigErrors>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const current = findTicket(config, date, ticketName);
    setForm(current ? inputFrom(current, date) : null);
    setErrors({});
    setSaved(false);
    // 切换场次时载入该场次配置
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, ticketName]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const stockByDate = useMemo(() => {
    const map: Record<string, { sold: number; refunded: number }> = {};
    config.sessions.forEach(session => {
      const row = buildSessionStock(
        config.sessions,
        refunds,
        session.date
      ).find(item => item.ticket.name === ticketName);
      if (row) map[session.date] = { sold: row.sold, refunded: row.refunded };
    });
    return map;
  }, [config, refunds, ticketName]);
  const netSold = Object.fromEntries(
    Object.entries(stockByDate).map(([key, value]) => [
      key,
      value.sold - value.refunded,
    ])
  );
  if (!ticket || !form) return null;
  const stock = stockByDate[date] ?? { sold: 0, refunded: 0 };
  const remaining = ticket.inventory - stock.sold + stock.refunded;
  const logs = config.logs.filter(log => log.ticketName === ticketName);
  const set = (patch: Partial<TicketConfigInput>) => {
    setForm({ ...form, ...patch });
    setSaved(false);
    setErrors(current => {
      const next = { ...current };
      Object.keys(patch).forEach(key => {
        delete next[key as keyof TicketConfigErrors];
        if (key === "saleStart") delete next.saleEnd;
      });
      return next;
    });
  };
  const save = () => {
    const result = updateTicketConfig(config, {
      sessionDate: date,
      ticketName,
      input: form,
      syncAll,
      netSold,
      actor: TICKET_ACTOR[role],
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    commitTicketConfig(result.state);
    setErrors({});
    setSaved(true);
    toast.success(
      result.changed
        ? `${ticketName} 已保存${syncAll ? ` 同步 ${dates.length} 个场次` : ` ${formatSessionDate(date)}`}`
        : "配置没有变化"
    );
  };
  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        aria-label="关闭票种配置"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/30"
      />
      <section
        data-cy="ticket-config-drawer"
        className="relative flex h-full w-full max-w-[600px] flex-col bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <div className="text-[13px] text-slate-500">
              票种配置 · {editable ? "可修改" : "只读查看"}
            </div>
            <h2 className="mt-1 text-[20px] leading-7 font-semibold text-slate-900">
              {ticketName}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭票种配置"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div>
            <div className="flex items-center gap-1.5 text-[14px] font-semibold text-slate-800">
              <CalendarDays className="h-4 w-4 text-brand-600" />
              选择场次
            </div>
            <div
              className="mt-2 flex flex-wrap gap-2"
              data-cy="config-sessions"
            >
              {dates.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  data-cy="config-session"
                  data-value={item}
                  aria-pressed={item === date}
                  onClick={() => setDate(item)}
                  className={`min-w-[132px] rounded-xl border px-3 py-2 text-left ${item === date ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:border-brand-300"}`}
                >
                  <span className="block text-[14px] font-semibold whitespace-nowrap text-slate-900">
                    {formatSessionDate(item)}
                  </span>
                  <span className="mt-0.5 block text-[12px] whitespace-nowrap text-slate-500">
                    第 {index + 1} 天 · 已售{" "}
                    {formatCount(stockByDate[item]?.sold ?? 0)}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <dl
            data-cy="stock-detail"
            className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 sm:grid-cols-3"
          >
            {(
              [
                ["库存", [`${formatCount(ticket.inventory)} 张`]],
                ["已售", [`${formatCount(stock.sold)} 张`]],
                ["已退款", [`${formatCount(stock.refunded)} 张`]],
                ["剩余", [`${formatCount(remaining)} 张`]],
                [
                  "身份证限购",
                  [`每个身份证 ${ticket.purchaseLimit} 张`, "多账号合并计算"],
                ],
                [
                  "实名购票",
                  ticket.realName ? ["需要实名", "一票一证"] : ["无需实名"],
                ],
                [
                  "销售状态",
                  [`${ticket.status} ·`, ...ticket.sales.split(/ (?=\S+$)/)],
                ],
                ["票价", [`¥${ticket.price}`]],
                ["销售渠道", [ticket.channel]],
              ] as [string, string[]][]
            ).map(([label, parts], index, list) => (
              <div
                key={label}
                className={`border-b border-r border-slate-200 px-3 py-2.5 ${index === list.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}
              >
                <dt className="text-[12px] text-slate-500">{label}</dt>
                <dd className="mt-0.5 text-[14px] leading-5 font-semibold text-slate-900">
                  {parts.map((part, at) => (
                    <span key={part}>
                      {at > 0 && " "}
                      <span className="inline-block whitespace-nowrap">
                        {part}
                      </span>
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
          {editable ? (
            <section
              className="space-y-4 rounded-lg border border-slate-200 p-4"
              data-cy="config-form"
            >
              <h3 className="text-[16px] font-semibold text-slate-900">
                修改 {formatSessionDate(date)} 配置
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="票价（元）" error={errors.price}>
                  <input
                    data-cy="config-price"
                    inputMode="decimal"
                    value={form.price}
                    onChange={event => set({ price: event.target.value })}
                    className={`${fieldClass} ${errors.price ? "border-rose-400" : "border-slate-300"}`}
                  />
                </Field>
                <Field
                  label="本场次库存（张）"
                  error={errors.inventory}
                  hint={`已售出 ${formatCount(netSold[date] ?? 0)} 张 库存不能少于此数`}
                >
                  <input
                    data-cy="config-inventory"
                    inputMode="numeric"
                    value={form.inventory}
                    onChange={event => set({ inventory: event.target.value })}
                    className={`${fieldClass} ${errors.inventory ? "border-rose-400" : "border-slate-300"}`}
                  />
                </Field>
                <Field
                  label="每个身份证限购"
                  error={errors.purchaseLimit}
                  hint="同一场次同一票种 多账号合并计算"
                >
                  <LimitStepper
                    value={Number(form.purchaseLimit)}
                    onChange={value => set({ purchaseLimit: value })}
                  />
                </Field>
                <Field label="实名购票">
                  <RealNameSwitch
                    value={form.realName}
                    onChange={value => set({ realName: value })}
                  />
                </Field>
              </div>
              <Field label="销售状态" hint="停售后漫圈 App 不再展示购买入口">
                <StatusPicker
                  value={form.status}
                  onChange={value => set({ status: value })}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="开售时间" error={errors.saleStart}>
                  <input
                    type="datetime-local"
                    data-cy="config-sale-start"
                    value={toLocal(form.saleStart)}
                    onChange={event =>
                      set({ saleStart: fromLocal(event.target.value) })
                    }
                    className={`${fieldClass} ${errors.saleStart ? "border-rose-400" : "border-slate-300"}`}
                  />
                </Field>
                <Field label="停售时间" error={errors.saleEnd}>
                  <input
                    type="datetime-local"
                    data-cy="config-sale-end"
                    value={toLocal(form.saleEnd)}
                    max={`${date}T23:59`}
                    onChange={event =>
                      set({ saleEnd: fromLocal(event.target.value) })
                    }
                    className={`${fieldClass} ${errors.saleEnd ? "border-rose-400" : "border-slate-300"}`}
                  />
                </Field>
              </div>
              {dates.length > 1 && (
                <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-[14px] leading-6 text-slate-700">
                  <input
                    type="checkbox"
                    data-cy="config-sync"
                    checked={syncAll}
                    onChange={event => {
                      setSyncAll(event.target.checked);
                      setSaved(false);
                    }}
                    className="mt-1 h-4 w-4 accent-brand-600"
                  />
                  <span>
                    <span className="block font-semibold text-slate-900">
                      同步到全部 {dates.length} 个场次
                    </span>
                    <span className="block text-[13px] text-slate-500">
                      票价 库存 限购 实名和销售状态一起同步
                    </span>
                    <span className="block text-[13px] text-slate-500">
                      开售停售时间按各场次保留
                    </span>
                  </span>
                </label>
              )}
              {saved && (
                <div
                  data-cy="config-saved"
                  className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-[14px] font-semibold text-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  已保存 票种配置表与限购校验同步更新
                </div>
              )}
            </section>
          ) : (
            <p className="rounded-lg bg-slate-50 p-3 text-[14px] leading-6 text-slate-600">
              票种由主办方配置 平台运营人员可协助调整
            </p>
          )}
          <section>
            <h3 className="flex items-center gap-1.5 text-[15px] font-semibold text-slate-900">
              <History className="h-4 w-4 text-brand-600" />
              配置记录
            </h3>
            {logs.length ? (
              <ol className="mt-3 space-y-3" data-cy="config-logs">
                {logs.slice(0, 8).map(log => (
                  <li
                    key={log.id}
                    data-cy="config-log"
                    className="border-l-2 border-brand-200 pl-3"
                  >
                    <strong className="block text-[14px] text-slate-900">
                      {log.action} · {formatSessionDate(log.sessionDate)}
                    </strong>
                    <span className="mt-0.5 block text-[13px] leading-5 text-slate-600">
                      {log.detail}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-slate-500">
                      {log.actorName} · {log.actorRole} · {log.occurredAt}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-[14px] text-slate-500">
                活动发布时创建 暂无修改记录
              </p>
            )}
          </section>
        </div>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            className={outlineBtn}
            onClick={() => onViewOrders(date)}
          >
            <ReceiptText className="h-4 w-4" />
            查看该场次订单
          </button>
          {editable && (
            <button
              type="button"
              data-cy="config-save"
              className={primaryBtn}
              onClick={save}
            >
              <Save className="h-4 w-4" />
              保存配置
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

/** 新增票种抽屉 */
export function TicketCreateDrawer({
  role,
  onClose,
  onCreated,
}: {
  role: TicketEditorRole;
  onClose: () => void;
  onCreated: (name: string, date: string) => void;
}) {
  const config = useTicketConfig();
  const dates = config.sessions.map(session => session.date);
  const typeCount = new Set(
    config.sessions.flatMap(session => session.tickets.map(item => item.name))
  ).size;
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("漫圈用户端");
  const [selected, setSelected] = useState<string[]>(dates);
  const [form, setForm] = useState<TicketConfigInput>({
    price: "",
    inventory: "",
    purchaseLimit: 2,
    realName: true,
    status: "待开售",
    saleStart: "2026-06-20 10:00",
    saleEnd: `${dates[0]} 17:00`,
  });
  const [errors, setErrors] = useState<TicketConfigErrors>({});
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const set = (patch: Partial<TicketConfigInput>) => {
    setForm({ ...form, ...patch });
    setErrors(current => {
      const next = { ...current };
      Object.keys(patch).forEach(
        key => delete next[key as keyof TicketConfigErrors]
      );
      return next;
    });
  };
  const submit = () => {
    const result = addTicketType(
      config,
      { ...form, name, channel, dates: selected },
      TICKET_ACTOR[role]
    );
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    commitTicketConfig(result.state);
    toast.success(`已新增票种 ${name.trim()} · ${selected.length} 个场次`);
    onCreated(name.trim(), selected[0]);
  };
  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        aria-label="关闭新增票种"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/30"
      />
      <section
        data-cy="ticket-create-drawer"
        className="relative flex h-full w-full max-w-[600px] flex-col bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-[13px] text-slate-500">
              票种配置 · 已有 {typeCount} 个 最多 {MAX_TICKET_TYPES} 个
            </div>
            <h2 className="mt-1 text-[20px] leading-7 font-semibold text-slate-900">
              新增票种
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭新增票种"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="票种名称" error={errors.name}>
              <input
                data-cy="create-name"
                value={name}
                placeholder="例如 家庭套票"
                onChange={event => {
                  setName(event.target.value);
                  setErrors(current => ({ ...current, name: undefined }));
                }}
                className={`${fieldClass} ${errors.name ? "border-rose-400" : "border-slate-300"}`}
              />
            </Field>
            <Field label="销售渠道">
              <input
                data-cy="create-channel"
                value={channel}
                onChange={event => setChannel(event.target.value)}
                className={`${fieldClass} border-slate-300`}
              />
            </Field>
            <Field label="票价（元）" error={errors.price}>
              <input
                data-cy="create-price"
                inputMode="decimal"
                value={form.price}
                placeholder="例如 128"
                onChange={event => set({ price: event.target.value })}
                className={`${fieldClass} ${errors.price ? "border-rose-400" : "border-slate-300"}`}
              />
            </Field>
            <Field label="每场次库存（张）" error={errors.inventory}>
              <input
                data-cy="create-inventory"
                inputMode="numeric"
                value={form.inventory}
                placeholder="例如 200"
                onChange={event => set({ inventory: event.target.value })}
                className={`${fieldClass} ${errors.inventory ? "border-rose-400" : "border-slate-300"}`}
              />
            </Field>
            <Field label="每个身份证限购" hint="多账号合并计算">
              <LimitStepper
                value={Number(form.purchaseLimit)}
                onChange={value => set({ purchaseLimit: value })}
              />
            </Field>
            <Field label="实名购票">
              <RealNameSwitch
                value={form.realName}
                onChange={value => set({ realName: value })}
              />
            </Field>
          </div>
          <Field label="销售状态">
            <StatusPicker
              value={form.status}
              onChange={value => set({ status: value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="开售时间" error={errors.saleStart}>
              <input
                type="datetime-local"
                value={toLocal(form.saleStart)}
                onChange={event =>
                  set({ saleStart: fromLocal(event.target.value) })
                }
                className={`${fieldClass} border-slate-300`}
              />
            </Field>
            <Field
              label="停售时间"
              error={errors.saleEnd}
              hint="各场次按当天这一时刻停售"
            >
              <input
                type="datetime-local"
                value={toLocal(form.saleEnd)}
                onChange={event =>
                  set({ saleEnd: fromLocal(event.target.value) })
                }
                className={`${fieldClass} border-slate-300`}
              />
            </Field>
          </div>
          <Field label="适用场次" error={errors.dates}>
            <div className="flex flex-wrap gap-2" data-cy="create-dates">
              {dates.map(item => {
                const on = selected.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setSelected(
                        on
                          ? selected.filter(value => value !== item)
                          : [...selected, item].sort()
                      );
                      setErrors(current => ({ ...current, dates: undefined }));
                    }}
                    className={`h-10 rounded-full border px-4 text-[14px] font-semibold whitespace-nowrap ${on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"}`}
                  >
                    {formatSessionDate(item)}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
          <button type="button" className={outlineBtn} onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            data-cy="create-submit"
            className={primaryBtn}
            onClick={submit}
          >
            <Plus className="h-4 w-4" />
            添加票种
          </button>
        </footer>
      </section>
    </div>
  );
}

/** 生成并下载 CSV（Excel 可直接打开） */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = "\ufeff" + rows.map(row => row.map(escape).join(",")).join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
