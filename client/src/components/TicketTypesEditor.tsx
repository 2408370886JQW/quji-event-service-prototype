import { useEffect, useState, type ReactNode } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { zhCN } from "react-day-picker/locale";
import { CalendarDays, ChevronDown, Plus, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/useMobile";
import {
  MAX_TICKET_TYPES,
  TICKET_CATEGORY_LABEL,
  TICKET_CATEGORY_OPTIONS,
  addDays,
  createTicketType,
  suggestSaleRange,
  summarizeTicketTypes,
  todayYMD,
  type ActivityWindow,
  type TicketCategory,
  type TicketErrors,
  type TicketTypeDraft,
} from "./ticketTypes";

const inputBase =
  "block h-11 w-full min-w-0 rounded-md border bg-white px-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2";
const inputTone = (invalid: boolean) =>
  invalid
    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
    : "border-slate-300 focus:border-[#245fc4] focus:ring-blue-100";

function fromYMD(value: string) {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function Field({
  label,
  required,
  error,
  htmlFor,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label
        htmlFor={htmlFor}
        className="block text-[14px] font-semibold text-slate-800"
      >
        {required && <span className="mr-0.5 text-rose-600">*</span>}
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {error && (
        <p
          className="mt-1.5 text-[13px] leading-5 text-rose-600"
          data-ticket-error="true"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/** 销售时间：开始日期 - 结束日期，同一输入框内选择区间，与 B 站后台交互一致 */
function SaleDateRange({
  id,
  value,
  onChange,
  window,
  category,
  invalid,
}: {
  id: string;
  value: { saleStart: string; saleEnd: string };
  onChange: (next: { saleStart: string; saleEnd: string }) => void;
  window: ActivityWindow;
  category: TicketCategory | "";
  invalid: boolean;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();
  const activityStart = fromYMD(window.start);
  const activityEnd = fromYMD(window.end);

  useEffect(() => {
    if (open)
      setDraft(
        value.saleStart
          ? { from: fromYMD(value.saleStart), to: fromYMD(value.saleEnd) }
          : undefined
      );
  }, [open, value.saleStart, value.saleEnd]);

  // 预售票只能在活动开始前 现场票只能在活动举办期间
  const disabled = [
    ...(activityEnd ? [{ after: activityEnd }] : []),
    ...(category === "presale" && activityStart
      ? [{ after: fromYMD(addDays(window.start, -1))! }]
      : []),
    ...(category === "onsite" && activityStart
      ? [{ before: activityStart }]
      : []),
  ];
  const presaleMonth = activityStart
    ? new Date(activityStart.getFullYear(), activityStart.getMonth() - 1, 1)
    : undefined;
  const defaultMonth =
    draft?.from ??
    (category === "presale" && !isMobile ? presaleMonth : activityStart);
  const ready = Boolean(draft?.from);
  // 与常见后台日期区间一致：第一次点击为开始日期 第二次为结束日期 已选完整区间后再点击则重新开始
  const pick = (_range: DateRange | undefined, day: Date) => {
    setDraft(current => {
      if (!current?.from || current.to) return { from: day, to: undefined };
      return day < current.from
        ? { from: day, to: current.from }
        : { from: current.from, to: day };
    });
  };
  const confirm = () => {
    if (!draft?.from) return;
    onChange({
      saleStart: todayYMD(draft.from),
      saleEnd: todayYMD(draft.to ?? draft.from),
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          data-cy="ticket-sale-range"
          className={`${inputBase} ${inputTone(invalid)} flex items-center gap-2 text-left`}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
          <span
            className={`date-token flex-1 text-center ${value.saleStart ? "text-slate-900" : "text-slate-400"}`}
          >
            {value.saleStart || "开始日期"}
          </span>
          <span className="shrink-0 text-slate-400">-</span>
          <span
            className={`date-token flex-1 text-center ${value.saleEnd ? "text-slate-900" : "text-slate-400"}`}
          >
            {value.saleEnd || "结束日期"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto max-w-[calc(100vw-24px)] border-slate-200 bg-white p-0 text-slate-900 shadow-[0_18px_48px_rgb(15_23_42/0.14)]"
      >
        <DayPicker
          mode="range"
          locale={zhCN}
          weekStartsOn={0}
          labels={{
            labelPrevious: () => "上个月",
            labelNext: () => "下个月",
          }}
          numberOfMonths={isMobile ? 1 : 2}
          selected={draft}
          onSelect={pick}
          defaultMonth={defaultMonth}
          disabled={disabled}
          showOutsideDays={false}
          classNames={{
            root: "relative p-4",
            months: "relative flex flex-col gap-6 sm:flex-row",
            month: "space-y-3",
            month_caption:
              "flex h-9 items-center justify-center text-[15px] font-semibold text-slate-800",
            caption_label: "",
            nav: "absolute inset-x-4 top-4 z-10 flex h-9 items-center justify-between",
            button_previous:
              "inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30",
            button_next:
              "inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30",
            chevron: "h-4 w-4 fill-current",
            month_grid: "border-collapse",
            weekdays: "flex",
            weekday: "w-10 text-[12px] font-normal text-slate-500",
            weeks: "",
            week: "mt-1 flex",
            day: "h-10 w-10 p-0 text-center text-[14px]",
            day_button:
              "h-10 w-10 rounded-md text-slate-800 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-200",
            selected: "",
            range_start:
              "[&>button]:bg-[#245fc4] [&>button]:text-white [&>button]:hover:bg-[#1c4c9e]",
            range_end:
              "[&>button]:bg-[#245fc4] [&>button]:text-white [&>button]:hover:bg-[#1c4c9e]",
            range_middle:
              "bg-blue-50 [&>button]:rounded-none [&>button]:bg-transparent [&>button]:text-[#1c4c9e]",
            today: "[&>button]:font-semibold [&>button]:text-[#245fc4]",
            outside: "[&>button]:text-slate-300",
            disabled:
              "[&>button]:cursor-not-allowed [&>button]:text-slate-300 [&>button]:hover:bg-transparent",
            hidden: "invisible",
            focused: "",
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
          <div className="text-[13px] leading-5 text-slate-600">
            <span className="date-token block">
              {draft?.from
                ? `${todayYMD(draft.from)} 至 ${todayYMD(draft.to ?? draft.from)}`
                : "请选择开始日期和结束日期"}
            </span>
            <span className="block text-slate-500">
              开始日 00:00 起售 结束日 23:59 停售
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDraft(undefined)}
              className="h-9 rounded-md px-3 text-[14px] font-semibold text-[#245fc4] hover:bg-blue-50"
            >
              清空
            </button>
            <button
              type="button"
              disabled={!ready}
              onClick={confirm}
              data-cy="ticket-sale-range-confirm"
              className="h-9 rounded-md bg-[#245fc4] px-4 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              确定
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TicketCard({
  ticket,
  index,
  errors,
  window,
  canRemove,
  onChange,
  onRemove,
}: {
  ticket: TicketTypeDraft;
  index: number;
  errors: TicketErrors[string] | undefined;
  window: ActivityWindow;
  canRemove: boolean;
  onChange: (patch: Partial<TicketTypeDraft>) => void;
  onRemove: () => void;
}) {
  const fid = (field: string) => `${ticket.id}-${field}`;
  const remarkLength = ticket.remark.length;
  const changeCategory = (category: TicketCategory) => {
    const patch: Partial<TicketTypeDraft> = { category };
    // 仅在尚未选择销售时间时按活动日期给出建议 已选择的不覆盖
    if (!ticket.saleStart) {
      const suggestion = suggestSaleRange(category, window, todayYMD());
      if (suggestion) Object.assign(patch, suggestion);
    }
    onChange(patch);
  };

  return (
    <article
      className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5"
      data-cy="ticket-card"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[15px] font-semibold text-slate-900">
            票种 {index + 1}
          </span>
          {ticket.category && (
            <span className="status-token rounded bg-blue-50 px-2 py-0.5 text-[12px] font-semibold text-[#1c4c9e]">
              {TICKET_CATEGORY_LABEL[ticket.category]}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          data-cy="ticket-remove"
          title={canRemove ? "删除该票种" : "至少保留一个票种"}
          className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[14px] font-semibold text-slate-600 hover:bg-white hover:text-rose-700 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
        >
          <Trash2 className="h-4 w-4" />
          删除
        </button>
      </header>

      <div className="mt-4 grid gap-x-6 gap-y-4 md:grid-cols-2">
        <Field
          label="票种名称"
          required
          htmlFor={fid("name")}
          error={errors?.name}
        >
          <input
            id={fid("name")}
            data-cy="ticket-name"
            value={ticket.name}
            maxLength={20}
            onChange={event => onChange({ name: event.target.value })}
            placeholder="请输入票种名称"
            className={`${inputBase} ${inputTone(Boolean(errors?.name))}`}
          />
        </Field>
        <Field
          label="单场次总库存"
          required
          htmlFor={fid("inventory")}
          error={errors?.inventory}
        >
          <div className="relative">
            <input
              id={fid("inventory")}
              data-cy="ticket-inventory"
              inputMode="numeric"
              value={String(ticket.inventory ?? "")}
              onChange={event =>
                onChange({ inventory: event.target.value.replace(/\D/g, "") })
              }
              placeholder="请输入单场次总库存"
              className={`${inputBase} ${inputTone(Boolean(errors?.inventory))} pr-10`}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[14px] text-slate-500">
              张
            </span>
          </div>
        </Field>
        <Field
          label="类别"
          required
          htmlFor={fid("category")}
          error={errors?.category}
        >
          <div className="relative">
            <select
              id={fid("category")}
              data-cy="ticket-category"
              value={ticket.category}
              onChange={event =>
                changeCategory(event.target.value as TicketCategory)
              }
              className={`${inputBase} ${inputTone(Boolean(errors?.category))} appearance-none pr-10 ${ticket.category ? "" : "text-slate-400"}`}
            >
              <option value="" disabled>
                请选择票种类别
              </option>
              {TICKET_CATEGORY_OPTIONS.map(option => (
                <option
                  key={option.value}
                  value={option.value}
                  className="text-slate-900"
                >
                  {option.label}（{option.hint}）
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>
        </Field>
        <Field
          label="价格"
          required
          htmlFor={fid("price")}
          error={errors?.price}
        >
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[15px] text-slate-500">
              ¥
            </span>
            <input
              id={fid("price")}
              data-cy="ticket-price"
              inputMode="decimal"
              value={String(ticket.price ?? "")}
              onChange={event =>
                onChange({
                  price: event.target.value
                    .replace(/[^\d.]/g, "")
                    .replace(/(\..*)\./g, "$1"),
                })
              }
              placeholder="请输入价格 免费填 0"
              className={`${inputBase} ${inputTone(Boolean(errors?.price))} pl-8 pr-10`}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[14px] text-slate-500">
              元
            </span>
          </div>
        </Field>
        <Field
          label="销售时间"
          required
          htmlFor={fid("sale")}
          error={errors?.saleRange}
        >
          <SaleDateRange
            id={fid("sale")}
            value={{ saleStart: ticket.saleStart, saleEnd: ticket.saleEnd }}
            onChange={range => onChange(range)}
            window={window}
            category={ticket.category}
            invalid={Boolean(errors?.saleRange)}
          />
        </Field>
        <Field label="入场次数" required error={errors?.entryTimes}>
          <div className="flex min-h-11 flex-wrap items-center gap-x-5 gap-y-2">
            {(
              [
                ["limited", "限制次数"],
                ["unlimited", "不限次数"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className="inline-flex cursor-pointer items-center gap-2 text-[15px] whitespace-nowrap text-slate-800"
              >
                <input
                  type="radio"
                  name={fid("entry")}
                  value={value}
                  checked={ticket.entryLimit === value}
                  data-cy={`ticket-entry-${value}`}
                  onChange={() =>
                    onChange({
                      entryLimit: value,
                      entryTimes:
                        value === "limited"
                          ? (ticket.entryTimes ?? 1)
                          : ticket.entryTimes,
                    })
                  }
                  className="h-4 w-4 accent-[#245fc4]"
                />
                {label}
              </label>
            ))}
            {ticket.entryLimit === "limited" && (
              <span className="inline-flex items-center gap-2 text-[14px] whitespace-nowrap text-slate-600">
                每张票可入场
                <input
                  aria-label="每张票可入场次数"
                  data-cy="ticket-entry-times"
                  inputMode="numeric"
                  value={String(ticket.entryTimes ?? "")}
                  onChange={event =>
                    onChange({
                      entryTimes: event.target.value.replace(/\D/g, ""),
                    })
                  }
                  className={`block h-9 w-14 rounded-md border bg-white px-2 text-center text-[15px] text-slate-900 outline-none focus:ring-2 ${inputTone(Boolean(errors?.entryTimes))}`}
                />
                次
              </span>
            )}
          </div>
        </Field>
        <Field
          label="其他备注"
          htmlFor={fid("remark")}
          error={errors?.remark}
          className="md:col-span-2"
        >
          <div className="relative">
            <textarea
              id={fid("remark")}
              data-cy="ticket-remark"
              value={ticket.remark}
              maxLength={200}
              rows={2}
              onChange={event => onChange({ remark: event.target.value })}
              placeholder="例如 需凭学生证入场"
              className={`block w-full min-w-0 resize-y rounded-md border bg-white px-3 py-2.5 pb-7 text-[15px] leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 ${inputTone(Boolean(errors?.remark))}`}
            />
            <span className="pointer-events-none absolute right-3 bottom-2 text-[12px] text-slate-400">
              {remarkLength}/200
            </span>
          </div>
        </Field>
      </div>
    </article>
  );
}

export function TicketTypesEditor({
  tickets,
  onChange,
  errors,
  window,
}: {
  tickets: TicketTypeDraft[];
  onChange: (next: TicketTypeDraft[]) => void;
  errors: TicketErrors;
  window: ActivityWindow;
}) {
  const summary = summarizeTicketTypes(tickets);
  const canAdd = tickets.length < MAX_TICKET_TYPES;
  const update = (id: string, patch: Partial<TicketTypeDraft>) =>
    onChange(
      tickets.map(ticket =>
        ticket.id === id ? { ...ticket, ...patch } : ticket
      )
    );
  const add = () => {
    if (!canAdd) return;
    onChange([...tickets, createTicketType()]);
    requestAnimationFrame(() =>
      document
        .querySelectorAll('[data-cy="ticket-card"]')
        [tickets.length]?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  };

  return (
    <div data-cy="ticket-types-editor">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold">票种及库存</h2>
          <p className="mt-1 text-[14px] leading-6 text-slate-600">
            <span className="block">预售票在活动开始前线上销售</span>
            <span className="block">现场票在活动当天现场销售</span>
          </p>
        </div>
        <div className="text-[14px] text-slate-600" data-cy="ticket-summary">
          共 <strong className="text-slate-900">{summary.count}</strong> 个票种
          <span className="mx-2 text-slate-300">|</span>
          总库存{" "}
          <strong className="text-slate-900">
            {summary.totalInventory.toLocaleString("zh-CN")}
          </strong>{" "}
          张
        </div>
      </div>
      <div className="mt-5 space-y-4">
        {tickets.map((ticket, index) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            index={index}
            errors={errors[ticket.id]}
            window={window}
            canRemove={tickets.length > 1}
            onChange={patch => update(ticket.id, patch)}
            onRemove={() =>
              onChange(tickets.filter(item => item.id !== ticket.id))
            }
          />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={add}
          disabled={!canAdd}
          data-cy="ticket-add"
          className="inline-flex h-11 items-center gap-2 rounded-md border border-[#245fc4] bg-white px-4 text-[14px] font-semibold text-[#245fc4] hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
        >
          <Plus className="h-4 w-4" />
          添加票种
        </button>
        <span className="text-[13px] text-slate-500">
          最多 {MAX_TICKET_TYPES} 个票种 例如 学生票 Coser 票 双人票
        </span>
      </div>
    </div>
  );
}
