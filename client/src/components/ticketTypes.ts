/**
 * 活动创建 · 票种及库存
 * 与 Vue3 工程 src/utils/ticketTypes.ts 保持同一规则，后端接入时以此为字段与校验口径。
 * 活动可连续举办多天，每一天为一个场次，每个场次分别配置票种和库存。
 */
export type TicketCategory = "presale" | "onsite";
export type EntryLimit = "limited" | "unlimited";
type NumberLike = number | string | null | undefined;

export interface TicketTypeDraft {
  id: string;
  name: string;
  category: TicketCategory | "";
  price: NumberLike;
  inventory: NumberLike;
  /** YYYY-MM-DD，含当天 00:00 起售 */
  saleStart: string;
  /** YYYY-MM-DD，含当天 23:59 止售 */
  saleEnd: string;
  entryLimit: EntryLimit;
  entryTimes: NumberLike;
  /** 同一身份证在同一场次同一票种最多可购张数 多个账号合并计算 */
  purchaseLimit: NumberLike;
  /** 需要实名时一票一证 入场人证核验 */
  realNameRequired: boolean;
  remark: string;
}

/** 一个场次即活动中的一天 */
export interface TicketSession {
  date: string;
  tickets: TicketTypeDraft[];
}

export type TicketField =
  | "name"
  | "category"
  | "price"
  | "inventory"
  | "saleRange"
  | "entryTimes"
  | "purchaseLimit"
  | "remark";

/** 日期窗口；单个场次时 start 与 end 相同 */
export interface ActivityWindow {
  start: string;
  end: string;
}

export const MAX_TICKET_TYPES = 10;
export const MAX_ACTIVITY_DAYS = 7;
export const MAX_PURCHASE_LIMIT = 10;
export const DEFAULT_PURCHASE_LIMIT = 4;
export const TICKET_CATEGORY_OPTIONS: {
  value: TicketCategory;
  label: string;
  hint: string;
}[] = [
  { value: "presale", label: "预售票", hint: "场次开始前线上销售" },
  { value: "onsite", label: "现场票", hint: "场次当天现场销售" },
];
export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  presale: "预售票",
  onsite: "现场票",
};
export const TICKET_FIELDS: TicketField[] = [
  "name",
  "category",
  "price",
  "inventory",
  "saleRange",
  "entryTimes",
  "purchaseLimit",
  "remark",
];

let seed = 0;
export function createTicketType(): TicketTypeDraft {
  seed += 1;
  return {
    id: `ticket-${Date.now().toString(36)}-${seed}`,
    name: "",
    category: "",
    price: null,
    inventory: null,
    saleStart: "",
    saleEnd: "",
    entryLimit: "limited",
    entryTimes: 1,
    purchaseLimit: DEFAULT_PURCHASE_LIMIT,
    realNameRequired: true,
    remark: "",
  };
}

function toNumber(value: NumberLike): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : Number.NaN;
}

function decimals(value: NumberLike) {
  const text = String(value ?? "");
  return text.includes(".") ? text.split(".")[1].length : 0;
}

export function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

function dayNumber(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
}

/** 单项字段校验，返回空字符串表示通过 */
export function validateTicketField(
  ticket: TicketTypeDraft,
  field: TicketField,
  window: ActivityWindow,
  all: TicketTypeDraft[] = [ticket]
): string {
  switch (field) {
    case "name": {
      const name = ticket.name.trim();
      if (!name) return "请输入票种名称";
      if (name.length > 20) return "票种名称不超过 20 个字";
      const duplicated = all.some(
        other => other.id !== ticket.id && other.name.trim() === name
      );
      return duplicated ? "同一场次票种名称不能重复" : "";
    }
    case "category":
      return ticket.category ? "" : "请选择票种类别";
    case "price": {
      const price = toNumber(ticket.price);
      if (price === null) return "请输入价格";
      if (Number.isNaN(price)) return "价格需为数字";
      if (price < 0) return "价格不能小于 0";
      if (price > 99999) return "价格不能超过 99999 元";
      return decimals(ticket.price) > 2 ? "价格最多保留两位小数" : "";
    }
    case "inventory": {
      const inventory = toNumber(ticket.inventory);
      if (inventory === null) return "请输入单场次总库存";
      if (
        Number.isNaN(inventory) ||
        !Number.isInteger(inventory) ||
        inventory < 1
      )
        return "库存需为不小于 1 的整数";
      return inventory > 1000000 ? "库存不能超过 1000000 张" : "";
    }
    case "saleRange": {
      const { saleStart, saleEnd } = ticket;
      if (!saleStart || !saleEnd) return "请选择销售时间";
      if (saleStart > saleEnd) return "开始日期不能晚于结束日期";
      if (window.end && saleEnd > window.end)
        return `销售截止不能晚于 ${window.end}`;
      if (
        ticket.category === "presale" &&
        window.start &&
        saleStart >= window.start
      )
        return "预售票需在场次开始前开售";
      if (
        ticket.category === "onsite" &&
        window.start &&
        saleStart < window.start
      )
        return "现场票仅在场次当天销售";
      return "";
    }
    case "entryTimes": {
      if (ticket.entryLimit === "unlimited") return "";
      const times = toNumber(ticket.entryTimes);
      if (times === null) return "请输入可入场次数";
      return Number.isNaN(times) ||
        !Number.isInteger(times) ||
        times < 1 ||
        times > 10
        ? "可入场次数为 1 到 10 次"
        : "";
    }
    case "purchaseLimit": {
      const limit = toNumber(ticket.purchaseLimit);
      if (limit === null) return "请输入身份证限购张数";
      if (
        Number.isNaN(limit) ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > MAX_PURCHASE_LIMIT
      )
        return `每个身份证限购 1 到 ${MAX_PURCHASE_LIMIT} 张`;
      const inventory = toNumber(ticket.inventory);
      return inventory && Number.isFinite(inventory) && limit > inventory
        ? "限购张数不能超过库存"
        : "";
    }
    case "remark":
      return ticket.remark.length > 200 ? "备注不超过 200 字" : "";
  }
}

export type TicketErrors = Record<string, Partial<Record<TicketField, string>>>;

/** 全量校验，只返回存在问题的票种 */
export function validateTicketTypes(
  list: TicketTypeDraft[],
  window: ActivityWindow
): TicketErrors {
  const errors: TicketErrors = {};
  list.forEach(ticket => {
    TICKET_FIELDS.forEach(field => {
      const message = validateTicketField(ticket, field, window, list);
      if (message)
        errors[ticket.id] = { ...errors[ticket.id], [field]: message };
    });
  });
  return errors;
}

export function countErrors(errors: TicketErrors) {
  return Object.values(errors).reduce(
    (sum, fields) => sum + Object.keys(fields).length,
    0
  );
}

/** 切换类别且尚未选择销售时间时，给出与场次日期一致的建议区间 */
export function suggestSaleRange(
  category: TicketCategory,
  window: ActivityWindow,
  today: string
): { saleStart: string; saleEnd: string } | null {
  if (!window.start || !window.end) return null;
  if (category === "onsite")
    return { saleStart: window.start, saleEnd: window.end };
  const lastPresaleDay = addDays(window.start, -1);
  return today <= lastPresaleDay
    ? { saleStart: today, saleEnd: lastPresaleDay }
    : null;
}

export function summarizeTicketTypes(list: TicketTypeDraft[]) {
  const totalInventory = list.reduce((sum, ticket) => {
    const inventory = toNumber(ticket.inventory);
    return sum + (inventory && Number.isFinite(inventory) ? inventory : 0);
  }, 0);
  return { count: list.length, totalInventory };
}

export function formatEntryRule(ticket: TicketTypeDraft) {
  return ticket.entryLimit === "unlimited"
    ? "不限入场次数"
    : `每张可入场 ${toNumber(ticket.entryTimes) ?? 1} 次`;
}

export function formatPurchaseLimit(
  ticket: Pick<TicketTypeDraft, "purchaseLimit">
) {
  return `每个身份证限购 ${toNumber(ticket.purchaseLimit) ?? DEFAULT_PURCHASE_LIMIT} 张`;
}

export function formatRealName(
  ticket: Pick<TicketTypeDraft, "realNameRequired">
) {
  return ticket.realNameRequired ? "需要实名" : "无需实名";
}

export function formatPrice(value: NumberLike) {
  const price = toNumber(value);
  if (price === null || Number.isNaN(price)) return "—";
  return price === 0 ? "免费" : `¥${price}`;
}

export function todayYMD(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* ---------- 多日活动与场次 ---------- */

export function sessionWindow(date: string): ActivityWindow {
  return { start: date, end: date };
}

/** 活动日期窗口内的每一天，按先后排列 */
export function listActivityDates(window: ActivityWindow): string[] {
  if (!window.start) return [];
  const end = window.end || window.start;
  if (end < window.start) return [];
  const dates: string[] = [];
  for (
    let date = window.start;
    date <= end && dates.length < MAX_ACTIVITY_DAYS;
    date = addDays(date, 1)
  )
    dates.push(date);
  return dates;
}

export function countActivityDays(window: ActivityWindow) {
  if (!window.start || !window.end || window.end < window.start) return 0;
  return dayNumber(window.end) - dayNumber(window.start) + 1;
}

export function validateActivityWindow(
  window: ActivityWindow,
  today: string
): string {
  if (!window.start || !window.end) return "请选择活动日期";
  if (window.end < window.start) return "结束日期不能早于开始日期";
  if (window.start < today) return "活动日期不能早于今天";
  return countActivityDays(window) > MAX_ACTIVITY_DAYS
    ? `活动最多连续 ${MAX_ACTIVITY_DAYS} 天`
    : "";
}

/** 为尚未选择销售时间的票种按所在场次日期补上建议区间 */
export function withSuggestedSales(
  tickets: TicketTypeDraft[],
  date: string,
  today: string
): TicketTypeDraft[] {
  return tickets.map(ticket => {
    if (ticket.saleStart || !ticket.category) return ticket;
    const suggestion = suggestSaleRange(
      ticket.category,
      sessionWindow(date),
      today
    );
    return suggestion ? { ...ticket, ...suggestion } : ticket;
  });
}

export function defaultSessionTickets(
  date: string,
  today: string
): TicketTypeDraft[] {
  return withSuggestedSales(
    [
      { ...createTicketType(), name: "预售票", category: "presale" },
      { ...createTicketType(), name: "现场票", category: "onsite" },
    ],
    date,
    today
  );
}

/** 活动日期变化后同步场次：保留仍在范围内的日期配置 新增日期使用默认票种 */
export function syncSessions(
  sessions: TicketSession[],
  window: ActivityWindow,
  today: string
): TicketSession[] {
  return listActivityDates(window).map(date => {
    const found = sessions.find(session => session.date === date);
    return {
      date,
      tickets: found
        ? withSuggestedSales(found.tickets, date, today)
        : defaultSessionTickets(date, today),
    };
  });
}

/** 把一个场次的票种复制到另一天 销售时间按目标日期重新生成 */
export function copyTicketsToDate(
  tickets: TicketTypeDraft[],
  date: string,
  today: string
): TicketTypeDraft[] {
  return withSuggestedSales(
    tickets.map(ticket => ({
      ...ticket,
      id: createTicketType().id,
      saleStart: "",
      saleEnd: "",
    })),
    date,
    today
  );
}

export function validateSessions(sessions: TicketSession[]) {
  const errors: TicketErrors = {};
  const countByDate: Record<string, number> = {};
  sessions.forEach(session => {
    const found = validateTicketTypes(
      session.tickets,
      sessionWindow(session.date)
    );
    Object.assign(errors, found);
    const count = countErrors(found);
    if (count) countByDate[session.date] = count;
  });
  const dates = sessions
    .map(session => session.date)
    .filter(date => countByDate[date]);
  return {
    errors,
    countByDate,
    total: countErrors(errors),
    firstDate: dates[0] ?? "",
  };
}

export function summarizeSessions(sessions: TicketSession[]) {
  return sessions.reduce(
    (sum, session) => {
      const one = summarizeTicketTypes(session.tickets);
      return {
        days: sum.days + 1,
        ticketCount: sum.ticketCount + one.count,
        totalInventory: sum.totalInventory + one.totalInventory,
      };
    },
    { days: 0, ticketCount: 0, totalInventory: 0 }
  );
}

const WEEKDAY = "日一二三四五六";
/** 10月18日 周日 */
export function formatSessionDate(date: string) {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${m}月${d}日 周${WEEKDAY[weekday]}`;
}
