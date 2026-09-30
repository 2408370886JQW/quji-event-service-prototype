/**
 * 示例活动 2026 魔都动漫嘉年华（EVT-2026-0628）票务样例
 * 与 Vue3 工程 src/mock/ticketSamples.ts 保持同一数据：
 * 活动连续两天，每天为一个场次，两天合计已售 4,662 张 · ¥380,096。
 */
import type { PurchaseRecord } from "./purchaseLimit";
import type { StockSession } from "./ticketStats";

export type SessionTicketStatus = "售票中" | "已停售" | "待开售";

export interface SessionTicket {
  name: string;
  price: number;
  inventory: number;
  sold: number;
  /** 同一身份证在本场次本票种最多可购张数 */
  purchaseLimit: number;
  realName: boolean;
  status: SessionTicketStatus;
  sales: string;
  channel: string;
}

const ticket = (
  name: string,
  price: number,
  inventory: number,
  sold: number,
  purchaseLimit: number,
  status: SessionTicketStatus,
  sales: string,
  channel: string
): SessionTicket => ({
  name,
  price,
  inventory,
  sold,
  purchaseLimit,
  realName: true,
  status,
  sales,
  channel,
});

const dayTickets = (sold: [number, number, number]): SessionTicket[] => [
  ticket(
    "普通观众票",
    88,
    3000,
    sold[0],
    4,
    "售票中",
    "2026-06-01 10:00 开售",
    "漫圈用户端 / 现场窗口"
  ),
  ticket(
    "Coser 专属票",
    68,
    250,
    sold[1],
    1,
    "售票中",
    "2026-06-01 10:00 开售",
    "漫圈用户端（实名 + 提报）"
  ),
  ticket(
    "学生早鸟票",
    58,
    400,
    sold[2],
    2,
    "已停售",
    "2026-06-10 23:59 停售",
    "漫圈用户端"
  ),
  ticket(
    "现场当日票",
    98,
    500,
    0,
    2,
    "待开售",
    "场次当天 08:30 开售",
    "现场售票点"
  ),
];

export const EVENT_SESSIONS: StockSession<SessionTicket>[] = [
  { date: "2026-06-28", tickets: dayTickets([1896, 176, 396]) },
  { date: "2026-06-29", tickets: dayTickets([1652, 150, 392]) },
];

export const SESSION_DATES = EVENT_SESSIONS.map(session => session.date);

export function ticketLimit(name: string) {
  return (
    EVENT_SESSIONS[0].tickets.find(item => item.name === name)?.purchaseLimit ??
    4
  );
}

/** 购票记录样例：用于按身份证合并统计 同一人使用多个账号的情况 */
export const PURCHASE_RECORDS: PurchaseRecord[] = [
  {
    orderNo: "ORD1789301120316",
    account: "138****9036",
    buyerName: "马晓彤",
    idCard: "65010219980315002X",
    sessionDate: "2026-06-28",
    ticketName: "普通观众票",
    quantity: 1,
    status: "paid",
    refundId: "refund-20260929-001",
  },
  {
    orderNo: "ORD1789301120588",
    account: "138****9036",
    buyerName: "马晓彤",
    idCard: "65010219980315002X",
    sessionDate: "2026-06-28",
    ticketName: "普通观众票",
    quantity: 1,
    status: "paid",
  },
  {
    orderNo: "ORD1789301131407",
    account: "139****2275",
    buyerName: "马晓彤",
    idCard: "65010219980315002X",
    sessionDate: "2026-06-28",
    ticketName: "普通观众票",
    quantity: 2,
    status: "paid",
  },
  {
    orderNo: "ORD1789301149112",
    account: "186****7731",
    buyerName: "古丽米热·阿布都",
    idCard: "650104200107221312",
    sessionDate: "2026-06-28",
    ticketName: "Coser 专属票",
    quantity: 1,
    status: "paid",
  },
  {
    orderNo: "ORD1789301120762",
    account: "186****5218",
    buyerName: "艾力江·买买提",
    idCard: "652301199902041837",
    sessionDate: "2026-06-29",
    ticketName: "Coser 专属票",
    quantity: 1,
    status: "paid",
    refundId: "refund-20260928-002",
  },
  {
    orderNo: "ORD1789301098175",
    account: "177****1182",
    buyerName: "赵宁",
    idCard: "652203200009084626",
    sessionDate: "2026-06-28",
    ticketName: "学生早鸟票",
    quantity: 1,
    status: "paid",
    refundId: "refund-20260927-003",
  },
  {
    orderNo: "ORD1789301151870",
    account: "135****6608",
    buyerName: "何晓晨",
    idCard: "650106199711263575",
    sessionDate: "2026-06-29",
    ticketName: "普通观众票",
    quantity: 2,
    status: "paid",
  },
];

export interface LimitCheckLog {
  id: string;
  time: string;
  buyerName: string;
  /** 完整证件号仅用于复核 页面只显示脱敏号码 */
  idCard: string;
  account: string;
  sessionDate: string;
  ticketName: string;
  quantity: number;
  held: number;
  accountCount: number;
  limit: number;
  allowed: boolean;
  source: "漫圈 App 下单" | "现场售票" | "后台校验";
}

/** 系统已拦截的多账号超量下单 */
export const DEFAULT_LIMIT_LOGS: LimitCheckLog[] = [
  {
    id: "limit-20260929-002",
    time: "2026-09-29 20:14",
    buyerName: "古丽米热·阿布都",
    idCard: "650104200107221312",
    account: "135****0412",
    sessionDate: "2026-06-28",
    ticketName: "Coser 专属票",
    quantity: 1,
    held: 1,
    accountCount: 1,
    limit: 1,
    allowed: false,
    source: "漫圈 App 下单",
  },
  {
    id: "limit-20260929-001",
    time: "2026-09-29 18:02",
    buyerName: "马晓彤",
    idCard: "65010219980315002X",
    account: "177****6620",
    sessionDate: "2026-06-28",
    ticketName: "普通观众票",
    quantity: 2,
    held: 4,
    accountCount: 2,
    limit: 4,
    allowed: false,
    source: "漫圈 App 下单",
  },
];
