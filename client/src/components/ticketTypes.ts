/**
 * 活动创建 · 票种及库存
 * 与 Vue3 工程 src/utils/ticketTypes.ts 保持同一规则，后端接入时以此为字段与校验口径。
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
  remark: string;
}

export type TicketField =
  | "name"
  | "category"
  | "price"
  | "inventory"
  | "saleRange"
  | "entryTimes"
  | "remark";

/** 活动举办日期窗口，单日活动 start 与 end 相同 */
export interface ActivityWindow {
  start: string;
  end: string;
}

export const MAX_TICKET_TYPES = 10;
export const TICKET_CATEGORY_OPTIONS: {
  value: TicketCategory;
  label: string;
  hint: string;
}[] = [
  { value: "presale", label: "预售票", hint: "活动开始前线上销售" },
  { value: "onsite", label: "现场票", hint: "活动当天现场销售" },
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
      return duplicated ? "票种名称不能重复" : "";
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
        return "预售票需在活动开始前开售";
      if (
        ticket.category === "onsite" &&
        window.start &&
        saleStart < window.start
      )
        return "现场票仅在活动举办期间销售";
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

/** 切换类别且尚未选择销售时间时，给出与活动日期一致的建议区间 */
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
