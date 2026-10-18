import { useSyncExternalStore } from "react";
import {
  EVENT_SESSIONS,
  type SessionTicket,
  type SessionTicketStatus,
} from "./ticketSamples";
import type { StockSession } from "./ticketStats";
import { assertPrototypeWriteAllowed, isApiDataMode } from "../lib/api";
import {
  normalizeEventId,
  PRIMARY_EVENT_ID,
  storageKeyForEvent,
} from "./eventScope";

/**
 * 票务管理 · 票种配置
 * 与 Vue3 工程 src/stores/ticketConfig.ts 保持同一规则：
 * - 每个场次（日期）的票种单独配置：票价 库存 每个身份证限购 实名 销售状态 开售停售时间
 * - 库存不能少于该场次已售出（已售 - 已退款）的张数
 * - 每人限购 1-10 张，按同一身份证在同一场次同一票种合并计算
 * - 可把票价 库存 限购 实名和销售状态同步到其他场次（开售停售时间按场次各自保留）
 * - 每个活动最多 10 个票种，新增票种默认已售 0
 * - 每次保存写入配置记录（操作人 角色 时间 变更内容）
 */
export const TICKET_CONFIG_KEY = "quji_ticket_config_v1";
export const MAX_TICKET_TYPES = 10;
export const SALE_STATUSES: SessionTicketStatus[] = [
  "售票中",
  "待开售",
  "已停售",
];

export interface TicketConfigLog {
  id: string;
  sessionDate: string;
  ticketName: string;
  action: string;
  detail: string;
  actorName: string;
  actorRole: string;
  occurredAt: string;
}

export interface TicketConfigState {
  sessions: StockSession<SessionTicket>[];
  logs: TicketConfigLog[];
}

export interface TicketConfigInput {
  price: number | string;
  inventory: number | string;
  purchaseLimit: number | string;
  realName: boolean;
  status: SessionTicketStatus;
  /** YYYY-MM-DD HH:mm */
  saleStart: string;
  /** YYYY-MM-DD HH:mm */
  saleEnd: string;
}

export interface TicketActor {
  name: string;
  role: string;
}

export type TicketConfigErrors = Partial<
  Record<
    | "name"
    | "price"
    | "inventory"
    | "purchaseLimit"
    | "saleStart"
    | "saleEnd"
    | "dates",
    string
  >
>;

const pad = (value: number) => String(value).padStart(2, "0");
export function formatNow(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 由样例中的销售说明推导开售与停售时间 */
export function saleWindow(ticket: SessionTicket, date: string) {
  if (ticket.saleStart && ticket.saleEnd)
    return { start: ticket.saleStart, end: ticket.saleEnd };
  const stamp = /(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/.exec(ticket.sales)?.[1];
  if (ticket.sales.includes("场次当天")) {
    const time = /(\d{2}:\d{2})/.exec(ticket.sales)?.[1] ?? "08:30";
    return { start: `${date} ${time}`, end: `${date} 17:00` };
  }
  if (ticket.sales.includes("停售"))
    return { start: "2026-06-01 10:00", end: stamp ?? `${date} 17:00` };
  return { start: stamp ?? "2026-06-01 10:00", end: `${date} 17:00` };
}

export function salesText(
  status: SessionTicketStatus,
  start: string,
  end: string
) {
  return status === "已停售" ? `${end} 停售` : `${start} 开售`;
}

const toNumber = (value: number | string) =>
  typeof value === "number" ? value : Number(String(value).trim());

/** 校验一个场次的票种配置；netSold = 已售 - 已退款 */
export function validateTicketConfig(
  input: TicketConfigInput,
  netSold: number,
  sessionDate: string
): TicketConfigErrors {
  const errors: TicketConfigErrors = {};
  const price = toNumber(input.price);
  if (String(input.price).trim() === "" || !Number.isFinite(price))
    errors.price = "请填写票价";
  else if (price < 0 || price > 9999)
    errors.price = "票价需在 0 至 9999 元之间";
  else if (Math.round(price * 100) !== price * 100)
    errors.price = "票价最多保留两位小数";
  const inventory = toNumber(input.inventory);
  if (String(input.inventory).trim() === "" || !Number.isInteger(inventory))
    errors.inventory = "库存需为整数";
  else if (inventory < 1) errors.inventory = "库存至少 1 张";
  else if (inventory < netSold)
    errors.inventory = `库存不能少于已售出的 ${netSold.toLocaleString("zh-CN")} 张`;
  const limit = toNumber(input.purchaseLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 10)
    errors.purchaseLimit = "每人限购需为 1 至 10 张";
  const timeOk = (value: string) =>
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value);
  if (!timeOk(input.saleStart)) errors.saleStart = "请选择开售时间";
  if (!timeOk(input.saleEnd)) errors.saleEnd = "请选择停售时间";
  else if (timeOk(input.saleStart) && input.saleEnd <= input.saleStart)
    errors.saleEnd = "停售时间需晚于开售时间";
  else if (input.saleEnd > `${sessionDate} 23:59`)
    errors.saleEnd = "停售时间不能晚于场次当天";
  return errors;
}

function describeChanges(before: SessionTicket, after: SessionTicket) {
  const parts: string[] = [];
  if (before.price !== after.price)
    parts.push(`票价 ¥${before.price} → ¥${after.price}`);
  if (before.inventory !== after.inventory)
    parts.push(
      `库存 ${before.inventory.toLocaleString("zh-CN")} → ${after.inventory.toLocaleString("zh-CN")}`
    );
  if (before.purchaseLimit !== after.purchaseLimit)
    parts.push(`限购 ${before.purchaseLimit} → ${after.purchaseLimit} 张`);
  if (before.realName !== after.realName)
    parts.push(after.realName ? "改为需要实名" : "改为无需实名");
  if (before.status !== after.status)
    parts.push(`${before.status} → ${after.status}`);
  if (before.sales !== after.sales) parts.push(after.sales);
  return parts;
}

export function createTicketConfig(
  eventId = PRIMARY_EVENT_ID
): TicketConfigState {
  if (eventId !== PRIMARY_EVENT_ID) return { sessions: [], logs: [] };
  return {
    sessions: EVENT_SESSIONS.map(session => ({
      eventId,
      date: session.date,
      tickets: session.tickets.map(ticket => {
        const window = saleWindow(ticket, session.date);
        return { ...ticket, saleStart: window.start, saleEnd: window.end };
      }),
    })),
    logs: [],
  };
}

const logId = () =>
  `tc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** 保存某场次某票种配置，可同步到其他场次（时间按场次保留） */
export function updateTicketConfig(
  state: TicketConfigState,
  options: {
    sessionDate: string;
    ticketName: string;
    input: TicketConfigInput;
    syncAll: boolean;
    netSold: Record<string, number>;
    actor: TicketActor;
    time?: string;
  }
):
  | { ok: true; state: TicketConfigState; changed: number }
  | { ok: false; errors: TicketConfigErrors } {
  const { sessionDate, ticketName, input, syncAll, netSold, actor } = options;
  const time = options.time ?? formatNow();
  const errors = validateTicketConfig(
    input,
    netSold[sessionDate] ?? 0,
    sessionDate
  );
  if (syncAll && !errors.inventory) {
    const inventory = toNumber(input.inventory);
    const blocked = state.sessions.find(
      session =>
        session.date !== sessionDate &&
        session.tickets.some(item => item.name === ticketName) &&
        inventory < (netSold[session.date] ?? 0)
    );
    if (blocked)
      errors.inventory = `同步失败 ${blocked.date.slice(5).replace("-", "月")}日已售出 ${(netSold[blocked.date] ?? 0).toLocaleString("zh-CN")} 张`;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  const logs: TicketConfigLog[] = [];
  const sessions = state.sessions.map(session => {
    const own = session.date === sessionDate;
    if (!own && !syncAll) return session;
    return {
      ...session,
      tickets: session.tickets.map(ticket => {
        if (ticket.name !== ticketName) return ticket;
        const start = own
          ? input.saleStart
          : (ticket.saleStart ?? saleWindow(ticket, session.date).start);
        const end = own
          ? input.saleEnd
          : (ticket.saleEnd ?? saleWindow(ticket, session.date).end);
        const next: SessionTicket = {
          ...ticket,
          price: toNumber(input.price),
          inventory: toNumber(input.inventory),
          purchaseLimit: toNumber(input.purchaseLimit),
          realName: input.realName,
          status: input.status,
          saleStart: start,
          saleEnd: end,
          sales: salesText(input.status, start, end),
        };
        const changes = describeChanges(ticket, next);
        if (changes.length)
          logs.push({
            id: logId(),
            sessionDate: session.date,
            ticketName,
            action: own ? "更新票种配置" : "同步票种配置",
            detail: changes.join(" · "),
            actorName: actor.name,
            actorRole: actor.role,
            occurredAt: time,
          });
        return next;
      }),
    };
  });
  return {
    ok: true,
    state: { sessions, logs: [...logs, ...state.logs].slice(0, 60) },
    changed: logs.length,
  };
}

export interface NewTicketInput extends TicketConfigInput {
  name: string;
  channel: string;
  dates: string[];
}

/** 新增票种：所选场次各增加一个已售为 0 的票种 */
export function addTicketType(
  state: TicketConfigState,
  input: NewTicketInput,
  actor: TicketActor,
  time = formatNow(),
  eventId = PRIMARY_EVENT_ID
):
  | { ok: true; state: TicketConfigState }
  | { ok: false; errors: TicketConfigErrors } {
  const errors: TicketConfigErrors = {};
  const scope = normalizeEventId(eventId);
  const dates = input.dates.length
    ? input.dates
    : state.sessions.length
      ? []
      : /^\d{4}-\d{2}-\d{2}$/.test(input.saleEnd.slice(0, 10))
        ? [input.saleEnd.slice(0, 10)]
        : [];
  const name = input.name.trim();
  const names = new Set(
    state.sessions.flatMap(session => session.tickets.map(item => item.name))
  );
  if (!name) errors.name = "请填写票种名称";
  else if (name.length > 12) errors.name = "票种名称最多 12 个字";
  else if (names.has(name)) errors.name = "已有同名票种";
  else if (names.size >= MAX_TICKET_TYPES)
    errors.name = `每个活动最多 ${MAX_TICKET_TYPES} 个票种`;
  if (!dates.length) errors.dates = "至少选择一个场次";
  const first = dates[0] ?? state.sessions[0]?.date ?? "";
  Object.assign(errors, validateTicketConfig(input, 0, first));
  if (Object.keys(errors).length) return { ok: false, errors };
  const logs: TicketConfigLog[] = [];
  const ticketFor = (sessionDate: string): SessionTicket => {
    const start = input.saleStart;
    const end = `${sessionDate} ${input.saleEnd.slice(11) || "17:00"}`;
    return {
      name,
      price: toNumber(input.price),
      inventory: toNumber(input.inventory),
      sold: 0,
      purchaseLimit: toNumber(input.purchaseLimit),
      realName: input.realName,
      status: input.status,
      saleStart: start,
      saleEnd: end,
      sales: salesText(input.status, start, end),
      channel: input.channel.trim() || "漫圈用户端",
    };
  };
  const logCreation = (sessionDate: string, ticket: SessionTicket) => {
    logs.push({
      id: logId(),
      sessionDate,
      ticketName: name,
      action: "新增票种",
      detail: `¥${ticket.price} · 库存 ${ticket.inventory.toLocaleString("zh-CN")} · 限购 ${ticket.purchaseLimit} 张 · ${ticket.realName ? "需要实名" : "无需实名"}`,
      actorName: actor.name,
      actorRole: actor.role,
      occurredAt: time,
    });
  };
  const sessions = state.sessions.length
    ? state.sessions.map(session => {
        if (!dates.includes(session.date)) return session;
        const ticket = ticketFor(session.date);
        logCreation(session.date, ticket);
        return { ...session, tickets: [...session.tickets, ticket] };
      })
    : dates.map(date => {
        const ticket = ticketFor(date);
        logCreation(date, ticket);
        return { eventId: scope, date, tickets: [ticket] };
      });
  return {
    ok: true,
    state: { sessions, logs: [...logs, ...state.logs].slice(0, 60) },
  };
}

export function findTicket(
  state: TicketConfigState,
  sessionDate: string,
  ticketName: string
) {
  return state.sessions
    .find(session => session.date === sessionDate)
    ?.tickets.find(ticket => ticket.name === ticketName);
}

export function configuredLimit(
  state: TicketConfigState,
  sessionDate: string,
  ticketName: string
) {
  return findTicket(state, sessionDate, ticketName)?.purchaseLimit ?? 4;
}

/* ---------- 跨组件共享（票种配置 订单 限购校验 活动档案票务页签） ---------- */
export function createEmptyTicketConfig(): TicketConfigState {
  return { sessions: [], logs: [] };
}

const EMPTY_API_CONFIG = createEmptyTicketConfig();
function fallback(eventId?: string) {
  if (isApiDataMode()) return EMPTY_API_CONFIG;
  return normalizeEventId(eventId) === PRIMARY_EVENT_ID
    ? createTicketConfig()
    : createEmptyTicketConfig();
}

function load(eventId?: string): TicketConfigState {
  const scope = normalizeEventId(eventId);
  if (isApiDataMode()) return EMPTY_API_CONFIG;
  if (typeof window === "undefined") return fallback(scope);
  try {
    const raw = window.localStorage.getItem(
      storageKeyForEvent(TICKET_CONFIG_KEY, scope)
    );
    if (!raw) return fallback(scope);
    const parsed = JSON.parse(raw) as TicketConfigState;
    if (!Array.isArray(parsed?.sessions)) return fallback(scope);
    const sessions = parsed.sessions.filter(session =>
      session.eventId ? session.eventId === scope : scope === PRIMARY_EVENT_ID
    );
    return {
      sessions,
      // Unscoped historical records belong only to the known primary activity.
      logs:
        sessions.length || scope === PRIMARY_EVENT_ID
          ? Array.isArray(parsed.logs)
            ? parsed.logs
            : []
          : [],
    };
  } catch {
    return fallback(scope);
  }
}

const states = new Map<string, TicketConfigState>();
const listeners = new Set<() => void>();
const snapshot = (eventId?: string) => {
  const scope = normalizeEventId(eventId);
  if (isApiDataMode()) return EMPTY_API_CONFIG;
  const cached = states.get(scope);
  if (cached) return cached;
  const next = load(scope);
  states.set(scope, next);
  return next;
};

export function getTicketConfig(eventId?: string) {
  return snapshot(eventId);
}

export function commitTicketConfig(next: TicketConfigState, eventId?: string) {
  assertPrototypeWriteAllowed("保存票种配置");
  const scope = normalizeEventId(eventId);
  if (
    next.sessions.some(session => session.eventId && session.eventId !== scope)
  )
    throw new Error("不能把其他活动的票务场次改绑到当前活动");
  const scoped: TicketConfigState = {
    ...next,
    // Every newly saved session receives its selected scope. Old unscoped data
    // is migrated only while saving its known primary owner.
    sessions: next.sessions.map(session => ({ ...session, eventId: scope })),
  };
  states.set(scope, scoped);
  try {
    window.localStorage.setItem(
      storageKeyForEvent(TICKET_CONFIG_KEY, scope),
      JSON.stringify(scoped)
    );
  } catch {
    /* Storage failure does not mean a ticket configuration was accepted server-side. */
  }
  listeners.forEach(listener => listener());
}

export function useTicketConfig(eventId?: string) {
  const scope = normalizeEventId(eventId);
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot(scope),
    () => fallback(scope)
  );
}
