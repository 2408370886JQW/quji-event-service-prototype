/**
 * 活动运营核心逻辑（React 与 Vue3 工程共用同一份规则）
 * 现场核验 · 现场异常 · 问题记录 · 参展商与工作人员 · 活动资料版本 · 通知已读 · 归档摘要
 * 只包含纯函数与数据，不依赖任何框架；状态持久化由各端 store 负责。
 */

export const ACTIVITY_OPS_KEY = "quji_activity_ops_v1";
export const PRIMARY_EVENT_ID = "EVT-2026-0628";
export const OPS_SESSIONS = ["2026-06-28", "2026-06-29"] as const;

/** 现场基线：按场次统计的已入场 当前场内与已实名人数（不含本次登录后新增核验） */
export const ONSITE_BASE: Record<
  string,
  { entered: number; inVenue: number; realName: number }
> = {
  "2026-06-28": { entered: 2186, inVenue: 1964, realName: 2386 },
  "2026-06-29": { entered: 0, inVenue: 0, realName: 2098 },
};

export interface OpsActor {
  name: string;
  role: string;
}

export function opsNow(date = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}`;
}
const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
export const sessionLabel = (date: string) => {
  const [, m, d] = date.split("-");
  return `${Number(m)}月${Number(d)}日`;
};

/* ---------------- 电子票与现场核验 ---------------- */

export interface ETicket {
  code: string;
  orderNo: string;
  holder: string;
  idTail: string;
  ticketName: string;
  sessionDate: string;
  realName: boolean;
  role?: string;
  securityReview?: boolean;
  refundId?: string;
}

export const E_TICKETS: ETicket[] = [
  {
    code: "QT-20260628-48305",
    orderNo: "ORD1789301148305",
    holder: "张三",
    idTail: "0034",
    ticketName: "Coser 专属票",
    sessionDate: "2026-06-28",
    realName: true,
    role: "甘雨",
  },
  {
    code: "QT-20260628-49112",
    orderNo: "ORD1789301149112",
    holder: "古丽米热·阿布都",
    idTail: "1312",
    ticketName: "Coser 专属票",
    sessionDate: "2026-06-28",
    realName: true,
    role: "敦煌伎乐飞天",
  },
  {
    code: "QT-20260628-47720",
    orderNo: "ORD1789301147720",
    holder: "李思远",
    idTail: "2618",
    ticketName: "Coser 专属票",
    sessionDate: "2026-06-28",
    realName: true,
    role: "机甲重装佣兵",
    securityReview: true,
  },
  {
    code: "QT-20260628-52044",
    orderNo: "ORD1789301152044",
    holder: "王小东",
    idTail: "4417",
    ticketName: "普通观众票",
    sessionDate: "2026-06-28",
    realName: true,
  },
  {
    code: "QT-20260628-10316",
    orderNo: "ORD1789301120316",
    holder: "马晓彤",
    idTail: "002X",
    ticketName: "普通观众票",
    sessionDate: "2026-06-28",
    realName: true,
    refundId: "refund-20260929-001",
  },
  {
    code: "QT-20260628-20588",
    orderNo: "ORD1789301120588",
    holder: "马晓彤",
    idTail: "002X",
    ticketName: "普通观众票",
    sessionDate: "2026-06-28",
    realName: true,
  },
  {
    code: "QT-20260628-98175",
    orderNo: "ORD1789301098175",
    holder: "赵宁",
    idTail: "4626",
    ticketName: "学生早鸟票",
    sessionDate: "2026-06-28",
    realName: true,
    refundId: "refund-20260927-003",
  },
  {
    code: "QT-20260628-60218",
    orderNo: "ORD1789301160218",
    holder: "王雨桐",
    idTail: "3329",
    ticketName: "Coser 专属票",
    sessionDate: "2026-06-28",
    realName: false,
    role: "刻晴",
  },
  {
    code: "QT-20260629-51870",
    orderNo: "ORD1789301151870",
    holder: "何晓晨",
    idTail: "3575",
    ticketName: "普通观众票",
    sessionDate: "2026-06-29",
    realName: true,
  },
  {
    code: "QT-20260629-20762",
    orderNo: "ORD1789301120762",
    holder: "艾力江·买买提",
    idTail: "1837",
    ticketName: "Coser 专属票",
    sessionDate: "2026-06-29",
    realName: true,
    refundId: "refund-20260928-002",
  },
  {
    code: "QT-20260629-21958",
    orderNo: "ORD1789301121958",
    holder: "帕提古丽·吐尔逊",
    idTail: "2207",
    ticketName: "学生早鸟票",
    sessionDate: "2026-06-29",
    realName: true,
    refundId: "refund-20260929-004",
  },
];

export type CheckinResult = "通过" | "复验" | "拦截";
export type CheckinMethod = "扫码核验" | "手动核验" | "实名核对";
export interface CheckinRecord {
  id: string;
  code: string;
  holder: string;
  ticketName: string;
  sessionDate: string;
  result: CheckinResult;
  reason: string;
  method: CheckinMethod;
  gate: string;
  operator: string;
  time: string;
}

export type RefundStateMap = Record<
  string,
  "pending_review" | "refunded" | "rejected"
>;

export function findTicket(input: string) {
  const key = input.trim().toUpperCase();
  if (!key) return undefined;
  return E_TICKETS.find(
    item => item.code.toUpperCase() === key || item.orderNo === key
  );
}

/** 按姓名 票码 订单号查找本场电子票 */
export function searchTickets(keyword: string, limit = 6) {
  const key = keyword.trim().toUpperCase();
  if (!key) return [];
  return E_TICKETS.filter(
    item =>
      item.holder.toUpperCase().includes(key) ||
      item.code.toUpperCase().includes(key) ||
      item.orderNo.includes(key)
  ).slice(0, limit);
}

export interface VerifyOutcome {
  result: CheckinResult;
  reason: string;
  ticket?: ETicket;
  record: CheckinRecord;
}

/** 电子票核验规则：票码存在 → 场次一致 → 退款状态 → 重复入场 → 实名 → 安保复验 */
export function verifyTicket(
  state: ActivityOpsState,
  input: string,
  options: {
    session: string;
    refunds: RefundStateMap;
    method: Exclude<CheckinMethod, "实名核对">;
    operator: string;
    gate?: string;
    now?: string;
  }
): VerifyOutcome {
  const ticket = findTicket(input);
  const time = options.now ?? opsNow();
  let result: CheckinResult = "拦截";
  let reason = "";
  if (!ticket) {
    reason = "未查询到该电子票 请核对票码或订单号";
  } else if (ticket.sessionDate !== options.session) {
    reason = `该票为 ${sessionLabel(ticket.sessionDate)} 场次 当前核验场次为 ${sessionLabel(options.session)}`;
  } else if (
    ticket.refundId &&
    options.refunds[ticket.refundId] === "refunded"
  ) {
    reason = "该票已退款 电子票已作废";
  } else if (
    ticket.refundId &&
    options.refunds[ticket.refundId] === "pending_review"
  ) {
    reason = "该票有待审批的退款申请 请联系平台运营人员处理后再入场";
  } else {
    const entered = state.checkins.find(
      item => item.code === ticket.code && item.result !== "拦截"
    );
    if (entered) {
      reason = `该票已于 ${entered.time.slice(11)} 入场 请勿重复核验`;
    } else if (!ticket.realName) {
      reason = "实名认证未完成 请引导购票人在漫圈 App 完成实名";
    } else if (ticket.securityReview) {
      result = "复验";
      reason = `实名通过 ${ticket.role ?? "角色"}道具需安保复验 请引导至复验区`;
    } else {
      result = "通过";
      reason = ticket.role
        ? `实名通过 ${ticket.role} 角色申报已通过`
        : "实名通过 电子票有效";
    }
  }
  const record: CheckinRecord = {
    id: uid("ck"),
    code: ticket?.code ?? input.trim().toUpperCase(),
    holder: ticket?.holder ?? "未识别",
    ticketName: ticket?.ticketName ?? "—",
    sessionDate: options.session,
    result,
    reason,
    method: options.method,
    gate: options.gate ?? "1号入口",
    operator: options.operator,
    time,
  };
  return { result, reason, ticket, record };
}

export interface RealNameOutcome {
  match: boolean;
  reason: string;
  ticket?: ETicket;
  record?: CheckinRecord;
}
/** 实名核对：票码或订单号 + 姓名 + 证件号后 4 位 */
export function checkRealName(
  input: { code: string; name: string; idTail: string },
  options: { session: string; operator: string; now?: string }
): RealNameOutcome {
  const ticket = findTicket(input.code);
  if (!ticket)
    return { match: false, reason: "未查询到该电子票 请核对票码或订单号" };
  const nameOk = ticket.holder === input.name.trim();
  const tailOk = ticket.idTail === input.idTail.trim().toUpperCase();
  const match = nameOk && tailOk && ticket.realName;
  const reason = !ticket.realName
    ? "购票人尚未完成实名认证"
    : match
      ? "姓名与证件号后 4 位均与实名信息一致"
      : !nameOk && !tailOk
        ? "姓名与证件号后 4 位均不一致"
        : !nameOk
          ? "姓名与实名信息不一致"
          : "证件号后 4 位与实名信息不一致";
  const record: CheckinRecord = {
    id: uid("rn"),
    code: ticket.code,
    holder: ticket.holder,
    ticketName: ticket.ticketName,
    sessionDate: options.session,
    result: match ? "通过" : "拦截",
    reason,
    method: "实名核对",
    gate: "实名核对台",
    operator: options.operator,
    time: options.now ?? opsNow(),
  };
  return { match, reason, ticket, record };
}

export function onsiteStats(state: ActivityOpsState, session: string) {
  const fresh = state.checkins.filter(
    item =>
      !item.seeded && item.sessionDate === session && item.method !== "实名核对"
  );
  const passed = fresh.filter(item => item.result !== "拦截").length;
  const base = ONSITE_BASE[session] ?? { entered: 0, inVenue: 0, realName: 0 };
  const exceptions = state.issues.filter(
    item => item.source === "现场异常" && item.status !== "已完成"
  ).length;
  return {
    entered: base.entered + passed,
    inVenue: base.inVenue + passed,
    realName: base.realName,
    blocked: state.checkins.filter(
      item => item.sessionDate === session && item.result === "拦截"
    ).length,
    exceptions,
  };
}

/** 入场时段分布（6月28日），合计与 ONSITE_BASE 6月28日已入场一致 */
export const HOURLY_ENTRIES = [
  { hour: "09:00", entered: 330 },
  { hour: "10:00", entered: 504 },
  { hour: "11:00", entered: 420 },
  { hour: "12:00", entered: 253 },
  { hour: "13:00", entered: 272 },
  { hour: "14:00", entered: 216 },
  { hour: "15:00", entered: 120 },
  { hour: "16:00", entered: 71 },
];
export const DAILY_SALES = [
  { day: "6月1日—6月7日", sold: 1286 },
  { day: "6月8日—6月14日", sold: 1124 },
  { day: "6月15日—6月21日", sold: 958 },
  { day: "6月22日—6月27日", sold: 1024 },
  { day: "现场 6月28日—29日", sold: 270 },
];

/* ---------------- 问题记录与现场异常 ---------------- */

export type IssueLevel = "高" | "中" | "低";
export type IssueStatus = "待处理" | "处理中" | "已完成";
export type IssueSource = "登记问题" | "现场异常";
export const ISSUE_CATEGORIES = [
  "活动资料",
  "票务",
  "现场服务",
  "角色服装道具",
  "安全保障",
  "其他",
] as const;
export const EXCEPTION_TYPES = [
  "电子票异常",
  "实名不一致",
  "道具复验",
  "人员滞留",
  "其他现场异常",
] as const;
export const ISSUE_OWNERS = [
  "主办方运营组",
  "平台运营组",
  "场馆协调组",
  "安保单位",
] as const;
export interface IssueLog {
  action: string;
  actor: string;
  time: string;
  comment?: string;
}
export interface IssueRecord {
  id: string;
  no: string;
  level: IssueLevel;
  title: string;
  detail: string;
  category: string;
  source: IssueSource;
  owner: string;
  deadline: string;
  status: IssueStatus;
  related?: string;
  createdAt: string;
  createdBy: string;
  logs: IssueLog[];
}

export interface IssueInput {
  title: string;
  detail: string;
  category: string;
  level: IssueLevel;
  owner: string;
  deadline: string;
  related?: string;
}
export type IssueErrors = Partial<Record<keyof IssueInput, string>>;
export function validateIssue(input: IssueInput): IssueErrors {
  const errors: IssueErrors = {};
  if (!input.title.trim()) errors.title = "请填写问题标题";
  else if (input.title.trim().length > 30) errors.title = "标题不超过 30 字";
  if (!input.category) errors.category = "请选择问题类型";
  if (!input.owner) errors.owner = "请选择责任方";
  if (!input.detail.trim()) errors.detail = "请描述问题情况";
  if (!input.deadline) errors.deadline = "请选择处理时限";
  return errors;
}

export interface ExceptionInput {
  type: string;
  related: string;
  session: string;
  level: IssueLevel;
  action: string;
}
export type ExceptionErrors = Partial<Record<keyof ExceptionInput, string>>;
export function validateException(input: ExceptionInput): ExceptionErrors {
  const errors: ExceptionErrors = {};
  if (!input.type) errors.type = "请选择异常类型";
  if (!input.related.trim()) errors.related = "请填写关联电子票 订单号或参与人";
  if (!input.action.trim()) errors.action = "请记录核验结果与现场处置方式";
  return errors;
}

/* ---------------- 参展商与工作人员 ---------------- */

export interface StaffUnit {
  name: string;
  type: string;
  count: number;
  verified: number;
}
export interface StaffRecord {
  id: string;
  name: string;
  unit: string;
  post: string;
  phone: string;
  idTail: string;
  area: string;
  status: "资料已核验" | "待资料核验";
  addedAt: string;
  addedBy: string;
}
export interface StaffInput {
  name: string;
  unit: string;
  post: string;
  phone: string;
  idTail: string;
  area: string;
}
export type StaffErrors = Partial<Record<keyof StaffInput, string>>;
export function validateStaff(input: StaffInput): StaffErrors {
  const errors: StaffErrors = {};
  if (!input.name.trim()) errors.name = "请填写姓名";
  if (!input.unit) errors.unit = "请选择所属单位";
  if (!input.post.trim()) errors.post = "请填写岗位";
  if (!/^1[3-9]\d{9}$/.test(input.phone.replace(/\s/g, "")))
    errors.phone = "请输入 11 位手机号";
  if (!/^\d{3}[\dXx]$/.test(input.idTail.trim()))
    errors.idTail = "请输入证件号后 4 位";
  if (!input.area) errors.area = "请选择工作区域";
  return errors;
}
export const STAFF_AREAS = [
  "1号入口",
  "2号入口",
  "主舞台",
  "Coser 复验区",
  "售票点",
  "展区巡场",
] as const;
export const maskPhone = (phone: string) => {
  const p = phone.replace(/\s/g, "");
  return p.length === 11 ? `${p.slice(0, 3)}****${p.slice(7)}` : p;
};

/* ---------------- 活动资料与版本 ---------------- */

export type ActivityMaterialStatus =
  | "待准备"
  | "已上传"
  | "待资料核对"
  | "已补正"
  | "已归档";
export interface MaterialVersion {
  version: string;
  fileName: string;
  size: string;
  uploadedAt: string;
  uploadedBy: string;
  note: string;
}
export interface MaterialLog {
  action: string;
  actor: string;
  time: string;
  comment?: string;
}
export interface ActivityMaterial {
  name: string;
  group: string;
  status: ActivityMaterialStatus;
  update: string;
  owner: string;
  note: string;
  conditional?: boolean;
  versions: MaterialVersion[];
  logs: MaterialLog[];
}

const v = (
  version: string,
  fileName: string,
  size: string,
  uploadedAt: string,
  uploadedBy: string,
  note: string
): MaterialVersion => ({
  version,
  fileName,
  size,
  uploadedAt,
  uploadedBy,
  note,
});

export const createActivityMaterials = (): ActivityMaterial[] => [
  {
    name: "活动备案信息表",
    group: "基础信息",
    status: "已上传",
    update: "2026-06-12 15:20",
    owner: "林洁",
    note: "当前版本已关联活动档案 可继续更新",
    versions: [
      v(
        "v1.1",
        "活动备案信息表_魔都动漫嘉年华_v1.1.pdf",
        "286 KB",
        "2026-06-12 15:20",
        "林洁",
        "补充拟参加人数与场地容量"
      ),
      v(
        "v1.0",
        "活动备案信息表_魔都动漫嘉年华_v1.0.pdf",
        "274 KB",
        "2026-06-08 10:05",
        "林洁",
        "首次填写"
      ),
    ],
    logs: [
      {
        action: "更新备案信息",
        actor: "林洁 · 主办方活动运营人员",
        time: "2026-06-12 15:20",
        comment: "拟参加人数调整为 5,000 人",
      },
      {
        action: "填写备案信息",
        actor: "林洁 · 主办方活动运营人员",
        time: "2026-06-08 10:05",
      },
    ],
  },
  {
    name: "活动方案与内容说明",
    group: "活动方案",
    status: "已上传",
    update: "2026-06-12 15:20",
    owner: "林洁",
    note: "已关联当前活动档案",
    versions: [
      v(
        "v2.0",
        "活动方案与内容说明_v2.0.pdf",
        "1.8 MB",
        "2026-06-12 15:20",
        "林洁",
        "补充舞台互动流程与时间表"
      ),
      v(
        "v1.0",
        "活动方案与内容说明_v1.0.pdf",
        "1.2 MB",
        "2026-06-05 17:40",
        "林洁",
        "首次上传"
      ),
    ],
    logs: [
      {
        action: "上传新版本 v2.0",
        actor: "林洁 · 主办方活动运营人员",
        time: "2026-06-12 15:20",
      },
      {
        action: "上传材料 v1.0",
        actor: "林洁 · 主办方活动运营人员",
        time: "2026-06-05 17:40",
      },
    ],
  },
  {
    name: "场所管理者同意提供场所证明",
    group: "场地协作",
    status: "已补正",
    update: "2026-06-15 11:05",
    owner: "场馆协调组",
    note: "场地使用版本已关联 等待活动前复核",
    versions: [
      v(
        "v1.1",
        "场所使用证明_新疆国际会展中心_盖章版.pdf",
        "642 KB",
        "2026-06-15 11:05",
        "场馆协调组",
        "补充场馆盖章页"
      ),
      v(
        "v1.0",
        "场所使用证明_新疆国际会展中心.pdf",
        "598 KB",
        "2026-06-11 09:30",
        "场馆协调组",
        "首次上传"
      ),
    ],
    logs: [
      {
        action: "补正材料 v1.1",
        actor: "场馆协调组 · 场所管理方",
        time: "2026-06-15 11:05",
        comment: "补充场馆盖章页",
      },
      {
        action: "平台提示补正",
        actor: "周可 · 平台运营人员",
        time: "2026-06-13 14:10",
        comment: "证明缺少场馆盖章页",
      },
      {
        action: "上传材料 v1.0",
        actor: "场馆协调组 · 场所管理方",
        time: "2026-06-11 09:30",
      },
    ],
  },
  {
    name: "安全工作方案",
    group: "现场安全",
    status: "已上传",
    update: "2026-06-14 16:20",
    owner: "林洁",
    note: "按当前活动版本归集",
    versions: [
      v(
        "v1.0",
        "安全工作方案_魔都动漫嘉年华.pdf",
        "2.4 MB",
        "2026-06-14 16:20",
        "林洁",
        "首次上传"
      ),
    ],
    logs: [
      {
        action: "上传材料 v1.0",
        actor: "林洁 · 主办方活动运营人员",
        time: "2026-06-14 16:20",
      },
    ],
  },
  {
    name: "现场平面图与疏散示意",
    group: "现场安全",
    status: "已上传",
    update: "2026-06-13 16:30",
    owner: "场馆协调组",
    note: "活动前仍需复核",
    versions: [
      v(
        "v1.0",
        "3号馆平面图与疏散示意.pdf",
        "3.1 MB",
        "2026-06-13 16:30",
        "场馆协调组",
        "首次上传"
      ),
    ],
    logs: [
      {
        action: "上传材料 v1.0",
        actor: "场馆协调组 · 场所管理方",
        time: "2026-06-13 16:30",
      },
    ],
  },
  {
    name: "保安服务与人员配置说明",
    group: "现场安全",
    status: "已补正",
    update: "2026-06-16 10:10",
    owner: "主办方运营组",
    note: "已关联当前安保配置版本",
    versions: [
      v(
        "v1.1",
        "保安服务与人员配置说明_v1.1.pdf",
        "520 KB",
        "2026-06-16 10:10",
        "主办方运营组",
        "安保人员由 100 人调整为 120 人"
      ),
      v(
        "v1.0",
        "保安服务与人员配置说明_v1.0.pdf",
        "498 KB",
        "2026-06-12 18:00",
        "主办方运营组",
        "首次上传"
      ),
    ],
    logs: [
      {
        action: "补正材料 v1.1",
        actor: "主办方运营组",
        time: "2026-06-16 10:10",
        comment: "安保人员调整为 120 人",
      },
      {
        action: "上传材料 v1.0",
        actor: "主办方运营组",
        time: "2026-06-12 18:00",
      },
    ],
  },
  {
    name: "营业性演出相关材料",
    group: "条件材料",
    status: "待准备",
    update: "—",
    owner: "主办方",
    note: "如涉及营业性演出 请按属地文旅清单准备",
    conditional: true,
    versions: [],
    logs: [],
  },
  {
    name: "临时搭建与消防疏散材料",
    group: "条件材料",
    status: "待准备",
    update: "—",
    owner: "主办方",
    note: "如涉及临时舞台 看台或搭建 请补充",
    conditional: true,
    versions: [],
    logs: [],
  },
  {
    name: "受理回执与补正文书",
    group: "回执补正",
    status: "待准备",
    update: "—",
    owner: "主办方",
    note: "向属地机关办理后上传回执 补正通知或决定文书",
    versions: [],
    logs: [],
  },
];

export const MATERIAL_READY: ActivityMaterialStatus[] = [
  "已上传",
  "待资料核对",
  "已补正",
  "已归档",
];

export interface FilingInfo {
  name: string;
  appliedAt: string;
  period: string;
  venue: string;
  capacity: string;
  expected: string;
  content: string;
  organizer: string;
  venueManager: string;
  security: string;
  builder: string;
  contact: string;
  updatedAt: string;
  updatedBy: string;
}
export const createFiling = (): FilingInfo => ({
  name: "2026 魔都动漫嘉年华",
  appliedAt: "2026-06-08",
  period: "2026-06-28—06-29 每日 09:00—18:00",
  venue: "新疆国际会展中心 3号馆",
  capacity: "6000",
  expected: "5000",
  content: "动漫展览 舞台互动 角色表演 周边展示与现场售票",
  organizer: "新疆星河文化传媒有限公司",
  venueManager: "新疆国际会展中心",
  security: "天山安保服务有限公司 120 人",
  builder: "",
  contact: "林洁 138****8821",
  updatedAt: "2026-06-12 15:20",
  updatedBy: "林洁",
});
export type FilingErrors = Partial<Record<keyof FilingInfo, string>>;
export function validateFiling(input: FilingInfo): FilingErrors {
  const errors: FilingErrors = {};
  if (!input.name.trim()) errors.name = "请填写活动名称";
  if (!input.period.trim()) errors.period = "请填写起止时间";
  if (!input.venue.trim()) errors.venue = "请填写活动地点";
  const capacity = Number(input.capacity);
  const expected = Number(input.expected);
  if (!Number.isInteger(capacity) || capacity <= 0)
    errors.capacity = "请填写场地额定容量（人）";
  if (!Number.isInteger(expected) || expected <= 0)
    errors.expected = "请填写拟参加活动人数（人）";
  else if (!errors.capacity && expected > capacity)
    errors.expected = "拟参加人数不能超过场地额定容量";
  if (!input.content.trim()) errors.content = "请填写活动内容";
  if (!input.organizer.trim()) errors.organizer = "请填写承办者";
  if (!input.venueManager.trim()) errors.venueManager = "请填写场所管理者";
  if (!input.contact.trim()) errors.contact = "请填写联系人与电话";
  return errors;
}

/* ---------------- 全量状态 ---------------- */

export interface OpsLog {
  id: string;
  action: string;
  detail: string;
  actor: string;
  time: string;
}
export interface ActivityOpsState {
  version: 1;
  checkins: (CheckinRecord & { seeded?: boolean })[];
  issues: IssueRecord[];
  units: StaffUnit[];
  staff: StaffRecord[];
  materials: ActivityMaterial[];
  filing: FilingInfo;
  noticeRead: Record<string, string[]>;
  archive: { summaryAt?: string; summaryBy?: string };
  logs: OpsLog[];
}

export const createActivityOps = (): ActivityOpsState => ({
  version: 1,
  checkins: [
    {
      id: "ck-seed-3",
      code: "QT-20260628-52044",
      holder: "王小东",
      ticketName: "普通观众票",
      sessionDate: "2026-06-28",
      result: "通过",
      reason: "实名通过 电子票有效",
      method: "扫码核验",
      gate: "1号入口",
      operator: "林洁",
      time: "2026-06-28 10:18",
      seeded: true,
    },
    {
      id: "ck-seed-2",
      code: "QT-20260628-98175",
      holder: "赵宁",
      ticketName: "学生早鸟票",
      sessionDate: "2026-06-28",
      result: "通过",
      reason: "实名通过 电子票有效",
      method: "扫码核验",
      gate: "2号入口",
      operator: "林洁",
      time: "2026-06-28 09:12",
      seeded: true,
    },
  ],
  issues: [
    {
      id: "issue-001",
      no: "WT-0628-001",
      level: "高",
      title: "仿真道具尺寸待复验",
      detail: "机甲重装佣兵 现场安保须在入场前核验重弩模型尺寸与材质",
      category: "角色服装道具",
      source: "现场异常",
      owner: "安保单位",
      deadline: "2026-06-28",
      status: "处理中",
      related: "李思远 QT-20260628-47720",
      createdAt: "2026-06-28 11:50",
      createdBy: "林洁",
      logs: [
        {
          action: "登记现场异常",
          actor: "林洁 · 主办方活动运营人员",
          time: "2026-06-28 11:50",
          comment: "道具复验 重弩模型长度约 1.4 米",
        },
        {
          action: "分派给 安保单位",
          actor: "林洁 · 主办方活动运营人员",
          time: "2026-06-28 11:52",
        },
      ],
    },
    {
      id: "issue-002",
      no: "WT-0628-002",
      level: "中",
      title: "电子票重复核验",
      detail:
        "学生早鸟票 QT-20260628-98175 已于 09:12 入场 10:40 在 2号入口再次出示",
      category: "票务",
      source: "现场异常",
      owner: "主办方运营组",
      deadline: "2026-06-28",
      status: "处理中",
      related: "赵宁 QT-20260628-98175",
      createdAt: "2026-06-28 10:40",
      createdBy: "林洁",
      logs: [
        {
          action: "登记现场异常",
          actor: "林洁 · 主办方活动运营人员",
          time: "2026-06-28 10:40",
          comment: "电子票异常 已拦截并核对入场记录",
        },
      ],
    },
    {
      id: "issue-003",
      no: "WT-0627-003",
      level: "中",
      title: "夜间值守联系人尚未补充",
      detail: "现场服务与应急联络表缺少 20:00 后场馆协调联系人",
      category: "活动资料",
      source: "登记问题",
      owner: "主办方运营组",
      deadline: "2026-06-27",
      status: "待处理",
      createdAt: "2026-06-26 10:05",
      createdBy: "周可",
      logs: [
        {
          action: "登记问题",
          actor: "周可 · 平台运营人员",
          time: "2026-06-26 10:05",
        },
        {
          action: "分派给 主办方运营组",
          actor: "周可 · 平台运营人员",
          time: "2026-06-26 10:06",
        },
      ],
    },
    {
      id: "issue-004",
      no: "WT-0625-004",
      level: "低",
      title: "学生早鸟票库存接近售罄",
      detail: "已售 788 / 800 停售后同步更新活动首页说明",
      category: "票务",
      source: "登记问题",
      owner: "主办方运营组",
      deadline: "2026-06-25",
      status: "已完成",
      createdAt: "2026-06-24 16:20",
      createdBy: "林洁",
      logs: [
        {
          action: "登记问题",
          actor: "林洁 · 主办方活动运营人员",
          time: "2026-06-24 16:20",
        },
        {
          action: "处置完成",
          actor: "林洁 · 主办方活动运营人员",
          time: "2026-06-25 09:30",
          comment: "已停售并更新活动首页说明",
        },
      ],
    },
  ],
  units: [
    {
      name: "新疆星河文化传媒有限公司",
      type: "主办方工作人员",
      count: 46,
      verified: 46,
    },
    {
      name: "天山安保服务有限公司",
      type: "安保人员",
      count: 120,
      verified: 120,
    },
    { name: "新疆国际会展中心", type: "场馆工作人员", count: 38, verified: 38 },
    { name: "参展商（32 家）", type: "参展商人员", count: 64, verified: 51 },
  ],
  staff: [
    {
      id: "st-1",
      name: "阿迪力·热合曼",
      unit: "天山安保服务有限公司",
      post: "安保队长",
      phone: "139****6610",
      idTail: "2215",
      area: "1号入口",
      status: "资料已核验",
      addedAt: "2026-06-20 10:00",
      addedBy: "林洁",
    },
    {
      id: "st-2",
      name: "陈思雨",
      unit: "新疆星河文化传媒有限公司",
      post: "现场执行",
      phone: "136****1029",
      idTail: "0428",
      area: "主舞台",
      status: "资料已核验",
      addedAt: "2026-06-20 10:05",
      addedBy: "林洁",
    },
    {
      id: "st-3",
      name: "马俊",
      unit: "新疆国际会展中心",
      post: "场馆协调",
      phone: "151****7302",
      idTail: "6631",
      area: "展区巡场",
      status: "资料已核验",
      addedAt: "2026-06-21 14:20",
      addedBy: "林洁",
    },
    {
      id: "st-4",
      name: "努尔古丽·艾山",
      unit: "参展商（32 家）",
      post: "展位负责人",
      phone: "188****4476",
      idTail: "1840",
      area: "展区巡场",
      status: "待资料核验",
      addedAt: "2026-06-25 16:40",
      addedBy: "林洁",
    },
  ],
  materials: createActivityMaterials(),
  filing: createFiling(),
  noticeRead: {},
  archive: {},
  logs: [],
});

/* ---------------- 状态更新（纯函数） ---------------- */

const actorText = (actor: OpsActor) => `${actor.name} · ${actor.role}`;
const withLog = (
  state: ActivityOpsState,
  actor: OpsActor,
  action: string,
  detail: string
): OpsLog[] => [
  { id: uid("log"), action, detail, actor: actorText(actor), time: opsNow() },
  ...state.logs,
];

export function addCheckin(state: ActivityOpsState, record: CheckinRecord) {
  return { ...state, checkins: [record, ...state.checkins] };
}

const nextIssueNo = (state: ActivityOpsState) => {
  const n = state.issues.length + 1;
  const d = new Date();
  return `WT-${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(n).padStart(3, "0")}`;
};

export function addIssue(
  state: ActivityOpsState,
  input: IssueInput,
  actor: OpsActor,
  source: IssueSource = "登记问题"
): ActivityOpsState {
  const time = opsNow();
  const issue: IssueRecord = {
    id: uid("issue"),
    no: nextIssueNo(state),
    level: input.level,
    title: input.title.trim(),
    detail: input.detail.trim(),
    category: input.category,
    source,
    owner: input.owner,
    deadline: input.deadline,
    status: "待处理",
    related: input.related?.trim() || undefined,
    createdAt: time,
    createdBy: actor.name,
    logs: [
      {
        action: source === "现场异常" ? "登记现场异常" : "登记问题",
        actor: actorText(actor),
        time,
        comment: input.detail.trim(),
      },
      { action: `分派给 ${input.owner}`, actor: actorText(actor), time },
    ],
  };
  return { ...state, issues: [issue, ...state.issues] };
}

export function addException(
  state: ActivityOpsState,
  input: ExceptionInput,
  actor: OpsActor
) {
  return addIssue(
    state,
    {
      title: input.type,
      detail: input.action,
      category: input.type === "道具复验" ? "角色服装道具" : "现场服务",
      level: input.level,
      owner: input.type === "道具复验" ? "安保单位" : "主办方运营组",
      deadline: input.session,
      related: input.related,
    },
    actor,
    "现场异常"
  );
}

export type IssueAction = "progress" | "assign" | "complete" | "reopen";
export function updateIssue(
  state: ActivityOpsState,
  id: string,
  action: IssueAction,
  payload: { comment?: string; owner?: string },
  actor: OpsActor
): ActivityOpsState {
  const time = opsNow();
  return {
    ...state,
    issues: state.issues.map(issue => {
      if (issue.id !== id) return issue;
      if (action === "assign" && payload.owner) {
        return {
          ...issue,
          owner: payload.owner,
          logs: [
            ...issue.logs,
            {
              action: `改派给 ${payload.owner}`,
              actor: actorText(actor),
              time,
              comment: payload.comment?.trim() || undefined,
            },
          ],
        };
      }
      if (action === "progress") {
        return {
          ...issue,
          status: "处理中",
          logs: [
            ...issue.logs,
            {
              action: "记录处理进展",
              actor: actorText(actor),
              time,
              comment: payload.comment?.trim(),
            },
          ],
        };
      }
      if (action === "complete") {
        return {
          ...issue,
          status: "已完成",
          logs: [
            ...issue.logs,
            {
              action: "处置完成",
              actor: actorText(actor),
              time,
              comment: payload.comment?.trim(),
            },
          ],
        };
      }
      return {
        ...issue,
        status: "处理中",
        logs: [
          ...issue.logs,
          {
            action: "重新打开",
            actor: actorText(actor),
            time,
            comment: payload.comment?.trim(),
          },
        ],
      };
    }),
  };
}

export function addStaff(
  state: ActivityOpsState,
  input: StaffInput,
  actor: OpsActor
): ActivityOpsState {
  const record: StaffRecord = {
    id: uid("st"),
    name: input.name.trim(),
    unit: input.unit,
    post: input.post.trim(),
    phone: maskPhone(input.phone),
    idTail: input.idTail.trim().toUpperCase(),
    area: input.area,
    status: "待资料核验",
    addedAt: opsNow(),
    addedBy: actor.name,
  };
  return {
    ...state,
    staff: [record, ...state.staff],
    units: state.units.map(unit =>
      unit.name === input.unit ? { ...unit, count: unit.count + 1 } : unit
    ),
    logs: withLog(
      state,
      actor,
      "新增工作人员",
      `${record.name} ${record.unit} ${record.post}`
    ),
  };
}

export function verifyStaff(
  state: ActivityOpsState,
  id: string,
  actor: OpsActor
): ActivityOpsState {
  const target = state.staff.find(item => item.id === id);
  if (!target || target.status === "资料已核验") return state;
  return {
    ...state,
    staff: state.staff.map(item =>
      item.id === id ? { ...item, status: "资料已核验" } : item
    ),
    units: state.units.map(unit =>
      unit.name === target.unit
        ? { ...unit, verified: Math.min(unit.verified + 1, unit.count) }
        : unit
    ),
    logs: withLog(
      state,
      actor,
      "工作人员资料核验",
      `${target.name} ${target.unit}`
    ),
  };
}

const nextVersion = (versions: MaterialVersion[]) => {
  if (!versions.length) return "v1.0";
  const [major, minor] = versions[0].version.slice(1).split(".").map(Number);
  return `v${major}.${(minor || 0) + 1}`;
};
export const fileSize = (bytes?: number) =>
  !bytes
    ? "—"
    : bytes > 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function uploadMaterial(
  state: ActivityOpsState,
  name: string,
  file: { fileName: string; size?: number; note?: string },
  actor: OpsActor
): ActivityOpsState {
  const time = opsNow();
  return {
    ...state,
    materials: state.materials.map(item => {
      if (item.name !== name) return item;
      const version = nextVersion(item.versions);
      return {
        ...item,
        status: "待资料核对",
        update: time,
        owner: actor.name,
        note: `已上传 ${version} 等待资料核对`,
        versions: [
          {
            version,
            fileName: file.fileName,
            size: fileSize(file.size),
            uploadedAt: time,
            uploadedBy: actor.name,
            note:
              file.note?.trim() ||
              (item.versions.length ? "更新版本" : "首次上传"),
          },
          ...item.versions,
        ],
        logs: [
          {
            action: item.versions.length
              ? `上传新版本 ${version}`
              : `上传材料 ${version}`,
            actor: actorText(actor),
            time,
            comment: file.note?.trim() || undefined,
          },
          ...item.logs,
        ],
      };
    }),
  };
}

export function saveFiling(
  state: ActivityOpsState,
  filing: FilingInfo,
  actor: OpsActor,
  attachment?: { fileName: string; size?: number }
): ActivityOpsState {
  const time = opsNow();
  const saved = {
    ...filing,
    updatedAt: time,
    updatedBy: actor.name,
  };
  let next: ActivityOpsState = { ...state, filing: saved };
  const fileName =
    attachment?.fileName ||
    `活动备案信息表_${saved.name.replace(/\s/g, "")}_${time.slice(0, 10)}.pdf`;
  next = uploadMaterial(
    next,
    "活动备案信息表",
    { fileName, size: attachment?.size ?? 280 * 1024, note: "更新备案信息" },
    actor
  );
  next = {
    ...next,
    materials: next.materials.map(item =>
      item.name === "活动备案信息表"
        ? { ...item, note: "信息已保存至活动档案 待属地清单核对" }
        : item
    ),
  };
  return next;
}

export function markNoticeRead(
  state: ActivityOpsState,
  role: string,
  ids: string[]
): ActivityOpsState {
  const current = new Set(state.noticeRead[role] ?? []);
  ids.forEach(id => current.add(id));
  return {
    ...state,
    noticeRead: { ...state.noticeRead, [role]: Array.from(current) },
  };
}

export function markArchiveSummary(
  state: ActivityOpsState,
  actor: OpsActor
): ActivityOpsState {
  const time = opsNow();
  return {
    ...state,
    archive: { summaryAt: time, summaryBy: actor.name },
    logs: withLog(state, actor, "生成归档摘要", "活动复盘摘要已生成并下载"),
  };
}

export function recordExport(
  state: ActivityOpsState,
  actor: OpsActor,
  action: string,
  detail: string
): ActivityOpsState {
  return { ...state, logs: withLog(state, actor, action, detail) };
}

/** 读取本地保存的状态，字段缺失时以初始数据补齐 */
export function restoreActivityOps(raw: string | null): ActivityOpsState {
  const base = createActivityOps();
  if (!raw) return base;
  try {
    const saved = JSON.parse(raw) as Partial<ActivityOpsState>;
    if (saved.version !== 1) return base;
    return { ...base, ...saved, version: 1 };
  } catch {
    return base;
  }
}

/* ---------------- 通知中心 ---------------- */

export interface NoticeItem {
  id: string;
  tone: "rose" | "amber" | "blue";
  title: string;
  text: string;
  time: string;
  /** 跳转目标页面与活动详情页签 */
  page: string;
  tab?: string;
  action: string;
}
export function buildNotices(input: {
  role: string;
  permissions: string[];
  state: ActivityOpsState;
  pendingRefunds: number;
  myReviews: number;
}): NoticeItem[] {
  const { role, state } = input;
  const list: NoticeItem[] = [];
  const canOpen = (page: string) =>
    page === "activity" || input.permissions.includes(page);
  const openExceptions = state.issues.filter(
    item => item.source === "现场异常" && item.status !== "已完成"
  );
  if (input.myReviews > 0 && canOpen("costumes"))
    list.push({
      id: `review-${input.myReviews}`,
      tone: "rose",
      title: `${input.myReviews} 份角色服装道具申报待你审核`,
      text: "含高关注道具 需安保复验后再提交平台复核",
      time: "12 分钟前",
      page: "costumes",
      action: "去审核",
    });
  if (role === "platform" && input.pendingRefunds > 0)
    list.push({
      id: `refund-${input.pendingRefunds}`,
      tone: "amber",
      title: `${input.pendingRefunds} 笔退款申请待审批`,
      text: "漫圈 App 用户提交的退款申请 需平台审批后原路退款",
      time: "今天 09:30",
      page: "tickets",
      action: "去审批",
    });
  if (openExceptions.length)
    list.push({
      id: `exception-${openExceptions.map(item => item.id).join("-")}`,
      tone: "rose",
      title: `${openExceptions.length} 项现场异常处理中`,
      text: openExceptions.map(item => item.title).join(" "),
      time: openExceptions[0].createdAt.slice(5),
      page: "activity",
      tab: "issues",
      action: "查看问题记录",
    });
  const pendingMaterial = state.materials.filter(
    item => item.status === "待准备" && !item.conditional
  );
  const nightIssue = state.issues.find(
    item => item.id === "issue-003" && item.status !== "已完成"
  );
  if (nightIssue || pendingMaterial.length)
    list.push({
      id: `material-${pendingMaterial.length}-${nightIssue ? 1 : 0}`,
      tone: "amber",
      title: "活动资料待补充",
      text: nightIssue
        ? "现场服务与应急联络表缺少夜间值守联系人"
        : `${pendingMaterial.map(item => item.name).join(" ")} 尚未上传`,
      time: "1 小时前",
      page: "activity",
      tab: "materials",
      action: "查看活动资料",
    });
  if (canOpen("tickets"))
    list.push({
      id: "stock-student",
      tone: "blue",
      title: "票务库存提示",
      text: "学生早鸟票两场次合计剩余 12 张 已按计划停售",
      time: "今天 09:20",
      page: "tickets",
      action: "进入票务管理",
    });
  if (role === "culture")
    list.push({
      id: "archive-ready",
      tone: "blue",
      title: "活动数字档案已更新",
      text: "2026 魔都动漫嘉年华 票务 入场与问题记录已同步",
      time: "今天 10:36",
      page: "activity",
      tab: "archive",
      action: "查看活动档案",
    });
  return list;
}
export function unreadNotices(
  notices: NoticeItem[],
  state: ActivityOpsState,
  role: string
) {
  const read = new Set(state.noticeRead[role] ?? []);
  return notices.filter(item => !read.has(item.id));
}
