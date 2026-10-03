import { useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarRange, Check, ChevronDown, ListFilter, X } from "lucide-react";

/** 活动日期文本 2026-06-28—06-29 09:00—18:00 → 起止日期 */
export function eventDateRange(date: string) {
  const day = date.split(" ")[0] ?? "";
  const [start, endRaw = ""] = day.split("—");
  const year = start.slice(0, 4);
  const end = endRaw
    ? endRaw.length === 5
      ? `${year}-${endRaw}`
      : endRaw
    : start;
  return { start, end };
}

export type TimePreset = "all" | "2026-06" | "2026-07" | "2026-08" | "custom";
export interface EventFilterValue {
  statuses: string[];
  time: TimePreset;
  from: string;
  to: string;
}
export const EMPTY_EVENT_FILTER: EventFilterValue = {
  statuses: [],
  time: "all",
  from: "",
  to: "",
};
export const TIME_PRESETS: { value: TimePreset; label: string }[] = [
  { value: "all", label: "全部时间" },
  { value: "2026-06", label: "2026 年 6 月" },
  { value: "2026-07", label: "2026 年 7 月" },
  { value: "2026-08", label: "2026 年 8 月" },
  { value: "custom", label: "自定义起止日期" },
];

/** 活动与所选时间段有交集即命中 */
export function matchEventFilter(
  item: { status: string; date: string },
  filter: EventFilterValue
) {
  if (filter.statuses.length && !filter.statuses.includes(item.status))
    return false;
  if (filter.time === "all") return true;
  const { start, end } = eventDateRange(item.date);
  if (filter.time === "custom") {
    if (filter.from && end < filter.from) return false;
    if (filter.to && start > filter.to) return false;
    return true;
  }
  return start.startsWith(filter.time) || end.startsWith(filter.time);
}

export function timeLabel(filter: EventFilterValue) {
  if (filter.time !== "custom")
    return TIME_PRESETS.find(item => item.value === filter.time)?.label ?? "";
  if (filter.from && filter.to) return `${filter.from} 至 ${filter.to}`;
  if (filter.from) return `${filter.from} 起`;
  if (filter.to) return `${filter.to} 前`;
  return "自定义起止日期";
}

function Popover({
  label,
  icon,
  active,
  testId,
  children,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  testId: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node))
        setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-cy={testId}
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className={`h-10 px-3.5 rounded-full border text-[14px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap ${active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
      >
        {icon}
        {label}
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          data-cy={`${testId}-menu`}
          className="absolute right-0 z-30 mt-2 w-[min(320px,calc(100vw-32px))] rounded-2xl border border-brand-100 bg-white p-2 shadow-[0_12px_32px_rgba(67,47,108,0.16)]"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function EventFilterBar({
  value,
  onChange,
  statusOptions,
}: {
  value: EventFilterValue;
  onChange: (next: EventFilterValue) => void;
  statusOptions: { value: string; label: string; count: number }[];
}) {
  const [from, setFrom] = useState(value.from);
  const [to, setTo] = useState(value.to);
  const [rangeError, setRangeError] = useState("");
  const statusLabel = value.statuses.length
    ? value.statuses.length === 1
      ? (statusOptions.find(item => item.value === value.statuses[0])?.label ??
        "状态筛选")
      : `已选 ${value.statuses.length} 个状态`
    : "状态筛选";
  const toggleStatus = (status: string) =>
    onChange({
      ...value,
      statuses: value.statuses.includes(status)
        ? value.statuses.filter(item => item !== status)
        : [...value.statuses, status],
    });
  return (
    <div className="flex flex-wrap gap-2">
      <Popover
        label={statusLabel}
        icon={<ListFilter className="w-4 h-4" />}
        active={value.statuses.length > 0}
        testId="filter-status"
      >
        {() => (
          <div>
            <div className="px-2 pt-1 pb-2 text-[13px] font-semibold text-slate-500">
              按活动阶段筛选 可多选
            </div>
            {statusOptions.map(option => {
              const checked = value.statuses.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  data-cy="filter-status-option"
                  role="menuitemcheckbox"
                  aria-checked={checked}
                  onClick={() => toggleStatus(option.value)}
                  className={`w-full min-h-11 px-3 rounded-xl flex items-center gap-3 text-left text-[14px] ${checked ? "bg-brand-50 text-brand-800 font-semibold" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  <span
                    className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center ${checked ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white"}`}
                  >
                    {checked && (
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    )}
                  </span>
                  <span className="flex-1 whitespace-nowrap">
                    {option.label}
                  </span>
                  <span className="text-[13px] text-slate-500 tabular-nums">
                    {option.count} 场
                  </span>
                </button>
              );
            })}
            {value.statuses.length > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...value, statuses: [] })}
                className="mt-1 w-full h-10 rounded-xl text-[14px] font-semibold text-brand-700 hover:bg-brand-50"
              >
                清除状态
              </button>
            )}
          </div>
        )}
      </Popover>
      <Popover
        label={value.time === "all" ? "时间范围" : timeLabel(value)}
        icon={<CalendarRange className="w-4 h-4" />}
        active={value.time !== "all"}
        testId="filter-time"
      >
        {close => (
          <div>
            <div className="px-2 pt-1 pb-2 text-[13px] font-semibold text-slate-500">
              按活动举办时间筛选
            </div>
            {TIME_PRESETS.filter(item => item.value !== "custom").map(item => {
              const checked = value.time === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  data-cy="filter-time-option"
                  role="menuitemradio"
                  aria-checked={checked}
                  onClick={() => {
                    onChange({ ...value, time: item.value, from: "", to: "" });
                    setFrom("");
                    setTo("");
                    close();
                  }}
                  className={`w-full min-h-11 px-3 rounded-xl flex items-center justify-between text-left text-[14px] ${checked ? "bg-brand-50 text-brand-800 font-semibold" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  <span className="whitespace-nowrap">{item.label}</span>
                  {checked && <Check className="w-4 h-4 text-brand-600" />}
                </button>
              );
            })}
            <div className="mt-2 border-t border-slate-100 px-2 pt-3 pb-1">
              <div className="text-[13px] font-semibold text-slate-600">
                自定义起止日期
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="block min-w-0">
                  <span className="text-[12px] text-slate-500">开始日期</span>
                  <input
                    type="date"
                    data-cy="filter-time-from"
                    value={from}
                    onChange={event => setFrom(event.target.value)}
                    className="mt-1 w-full min-w-0 h-10 rounded-lg border border-slate-300 px-2 text-[14px] outline-none focus:border-brand-500"
                  />
                </label>
                <label className="block min-w-0">
                  <span className="text-[12px] text-slate-500">结束日期</span>
                  <input
                    type="date"
                    data-cy="filter-time-to"
                    value={to}
                    onChange={event => setTo(event.target.value)}
                    className="mt-1 w-full min-w-0 h-10 rounded-lg border border-slate-300 px-2 text-[14px] outline-none focus:border-brand-500"
                  />
                </label>
              </div>
              {rangeError && (
                <p role="alert" className="mt-2 text-[13px] text-rose-600">
                  {rangeError}
                </p>
              )}
              <button
                type="button"
                data-cy="filter-time-apply"
                onClick={() => {
                  if (!from && !to) {
                    setRangeError("请至少选择开始或结束日期");
                    return;
                  }
                  if (from && to && from > to) {
                    setRangeError("开始日期不能晚于结束日期");
                    return;
                  }
                  setRangeError("");
                  onChange({ ...value, time: "custom", from, to });
                  close();
                }}
                className="mt-3 w-full h-10 rounded-full bg-brand-grad text-white text-[14px] font-semibold"
              >
                应用日期范围
              </button>
            </div>
          </div>
        )}
      </Popover>
    </div>
  );
}

export function ActiveFilterChips({
  value,
  onChange,
  statusLabel,
  resultCount,
}: {
  value: EventFilterValue;
  onChange: (next: EventFilterValue) => void;
  statusLabel: (status: string) => string;
  resultCount: number;
}) {
  if (!value.statuses.length && value.time === "all") return null;
  return (
    <div
      data-cy="filter-chips"
      className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center gap-2 bg-brand-50/40"
    >
      <span className="text-[14px] text-slate-600 whitespace-nowrap">
        筛选结果 {resultCount} 场
      </span>
      {value.statuses.map(status => (
        <button
          key={status}
          type="button"
          onClick={() =>
            onChange({
              ...value,
              statuses: value.statuses.filter(item => item !== status),
            })
          }
          className="h-8 pl-3 pr-2 rounded-full bg-white border border-brand-200 text-[13px] font-semibold text-brand-700 inline-flex items-center gap-1 whitespace-nowrap"
        >
          {statusLabel(status)}
          <X className="w-3.5 h-3.5" aria-label="移除" />
        </button>
      ))}
      {value.time !== "all" && (
        <button
          type="button"
          onClick={() => onChange({ ...value, time: "all", from: "", to: "" })}
          className="h-8 pl-3 pr-2 rounded-full bg-white border border-brand-200 text-[13px] font-semibold text-brand-700 inline-flex items-center gap-1 whitespace-nowrap"
        >
          {timeLabel(value)}
          <X className="w-3.5 h-3.5" aria-label="移除" />
        </button>
      )}
      <button
        type="button"
        data-cy="filter-clear"
        onClick={() => onChange(EMPTY_EVENT_FILTER)}
        className="h-8 px-3 rounded-full text-[13px] font-semibold text-slate-600 hover:bg-white whitespace-nowrap"
      >
        清除全部筛选
      </button>
    </div>
  );
}
