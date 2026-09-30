import { useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TicketTypesEditor } from "./TicketTypesEditor";
import {
  copyTicketsToDate,
  formatSessionDate,
  sessionWindow,
  summarizeSessions,
  summarizeTicketTypes,
  todayYMD,
  type TicketErrors,
  type TicketSession,
  type TicketTypeDraft,
} from "./ticketTypes";

/** 复制当前场次票种到其他日期 目标日期原有配置会被替换 */
function CopySessionButton({
  sessions,
  activeDate,
  onCopy,
}: {
  sessions: TicketSession[];
  activeDate: string;
  onCopy: (dates: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const others = sessions
    .map(session => session.date)
    .filter(date => date !== activeDate);
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (date: string) =>
    setPicked(list =>
      list.includes(date) ? list.filter(item => item !== date) : [...list, date]
    );
  const allPicked = picked.length === others.length;
  return (
    <Popover
      open={open}
      onOpenChange={next => {
        setOpen(next);
        if (next) setPicked(others);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          data-cy="session-copy"
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 text-[14px] font-semibold whitespace-nowrap text-slate-700 hover:border-brand-500 hover:text-brand-600"
        >
          <Copy className="h-4 w-4" />
          复制到其他日期
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[280px] border-slate-200 bg-white p-0 text-slate-900 shadow-[0_18px_48px_rgb(15_23_42/0.14)]"
      >
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="text-[14px] font-semibold">
            复制 {formatSessionDate(activeDate)} 的票种
          </div>
          <div className="mt-1 text-[13px] leading-5 text-slate-500">
            <span className="block">所选日期的现有票种将被替换</span>
            <span className="block">销售时间按目标日期重新生成</span>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          <button
            type="button"
            onClick={() => setPicked(allPicked ? [] : others)}
            className="flex h-10 w-full items-center gap-3 rounded-md px-2 text-left text-[14px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded border ${allPicked ? "border-brand-500 bg-brand-grad text-white" : "border-slate-300 bg-white"}`}
            >
              {allPicked && <Check className="h-3 w-3" />}
            </span>
            全部日期
          </button>
          {others.map(date => {
            const checked = picked.includes(date);
            return (
              <button
                key={date}
                type="button"
                role="checkbox"
                aria-checked={checked}
                data-cy="session-copy-date"
                onClick={() => toggle(date)}
                className="flex h-10 w-full items-center gap-3 rounded-md px-2 text-left text-[14px] text-slate-800 hover:bg-slate-50"
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? "border-brand-500 bg-brand-grad text-white" : "border-slate-300 bg-white"}`}
                >
                  {checked && <Check className="h-3 w-3" />}
                </span>
                <span className="date-token">{formatSessionDate(date)}</span>
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-9 rounded-md px-3 text-[14px] font-semibold text-slate-600 hover:bg-slate-100"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!picked.length}
            data-cy="session-copy-confirm"
            onClick={() => {
              onCopy(picked);
              setOpen(false);
            }}
            className="h-9 rounded-full bg-brand-grad px-4 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            复制到 {picked.length} 天
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TicketSessionsEditor({
  sessions,
  activeDate,
  onActiveDateChange,
  onChange,
  errors,
  errorCountByDate,
}: {
  sessions: TicketSession[];
  activeDate: string;
  onActiveDateChange: (date: string) => void;
  onChange: (next: TicketSession[]) => void;
  errors: TicketErrors;
  errorCountByDate: Record<string, number>;
}) {
  const active =
    sessions.find(session => session.date === activeDate) ?? sessions[0];
  const total = summarizeSessions(sessions);
  const multiDay = sessions.length > 1;
  if (!active) return null;

  const updateTickets = (date: string, tickets: TicketTypeDraft[]) =>
    onChange(
      sessions.map(session =>
        session.date === date ? { ...session, tickets } : session
      )
    );
  const copyTo = (dates: string[]) =>
    onChange(
      sessions.map(session =>
        dates.includes(session.date)
          ? {
              ...session,
              tickets: copyTicketsToDate(
                active.tickets,
                session.date,
                todayYMD()
              ),
            }
          : session
      )
    );

  return (
    <div data-cy="ticket-sessions-editor">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold">票务设置</h2>
          <p className="mt-1 text-[14px] leading-6 text-slate-600">
            {multiDay ? (
              <>
                <span className="block">活动每一天为一个场次</span>
                <span className="block">每个场次分别配置票种和库存</span>
              </>
            ) : (
              <span className="block">单日活动 配置当天的票种和库存</span>
            )}
          </p>
        </div>
        <div
          className="text-[14px] whitespace-nowrap text-slate-600"
          data-cy="sessions-summary"
        >
          共 <strong className="text-slate-900">{total.days}</strong> 个场次
          <span className="mx-2 text-slate-300">|</span>
          <strong className="text-slate-900">{total.ticketCount}</strong> 个票种
          <span className="mx-2 text-slate-300">|</span>
          总库存{" "}
          <strong className="text-slate-900">
            {total.totalInventory.toLocaleString("zh-CN")}
          </strong>{" "}
          张
        </div>
      </div>

      {multiDay && (
        <div
          role="tablist"
          aria-label="活动场次"
          className="mt-5 flex gap-2 overflow-x-auto pb-1"
        >
          {sessions.map(session => {
            const selected = session.date === active.date;
            const summary = summarizeTicketTypes(session.tickets);
            const issues = errorCountByDate[session.date] ?? 0;
            return (
              <button
                key={session.date}
                type="button"
                role="tab"
                aria-selected={selected}
                data-cy="session-tab"
                data-date={session.date}
                onClick={() => onActiveDateChange(session.date)}
                className={`relative min-w-[132px] shrink-0 rounded-md border py-2.5 pl-3 text-left ${issues > 0 ? "pr-9" : "pr-3"} ${selected ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
              >
                <span
                  className={`date-token block text-[14px] font-semibold ${selected ? "text-brand-700" : "text-slate-900"}`}
                >
                  {formatSessionDate(session.date)}
                </span>
                <span className="mt-0.5 block text-[12px] whitespace-nowrap text-slate-500">
                  {summary.count} 个票种 ·{" "}
                  {summary.totalInventory.toLocaleString("zh-CN")} 张
                </span>
                {issues > 0 && (
                  <span
                    className="absolute top-1/2 right-2.5 flex h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-semibold text-white"
                    data-cy="session-tab-errors"
                    aria-label={`${issues} 项需要完善`}
                  >
                    {issues}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div
        className={
          multiDay
            ? "mt-4 rounded-lg border border-slate-200 p-4 sm:p-5"
            : "mt-5"
        }
      >
        <TicketTypesEditor
          key={active.date}
          tickets={active.tickets}
          onChange={next => updateTickets(active.date, next)}
          errors={errors}
          window={sessionWindow(active.date)}
          sessionLabel={formatSessionDate(active.date)}
          headerAction={
            multiDay ? (
              <CopySessionButton
                sessions={sessions}
                activeDate={active.date}
                onCopy={copyTo}
              />
            ) : undefined
          }
        />
      </div>
    </div>
  );
}
