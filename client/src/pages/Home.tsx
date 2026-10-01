import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Database,
  Download,
  FileArchive,
  FileCheck2,
  FileText,
  FolderOpen,
  Gauge,
  Grid2X2,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  MoreHorizontal,
  PackageCheck,
  PanelLeftClose,
  Plus,
  QrCode,
  ReceiptText,
  RefreshCcw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Ticket,
  TicketCheck,
  Upload,
  UserCheck,
  UserCog,
  Users,
  WalletCards,
  Waypoints,
  X,
  XCircle,
  ScanLine,
  Radio,
  CircleAlert,
  CircleCheckBig,
  SlidersHorizontal,
  Building,
  ChartNoAxesCombined,
  Eye,
  EyeOff,
  UserRound,
  UserPlus,
  Image,
  Shirt,
  ScrollText,
} from "lucide-react";
import {
  ActivityMaterials,
  OrganizerMaterials,
} from "@/components/ComplianceMaterials";
import {
  ActivityCreationWizard,
  ActivityPublished,
  AdmissionReview,
  OrganizerOnboarding,
  OrganizerRegistration,
  OnboardingWorkspaceGate,
  createApprovedAdmission,
  createEmptyAdmission,
  type AdmissionState,
} from "@/components/OnboardingFlow";
import {
  ALL_SESSIONS,
  buildSessionStock,
  formatCount,
  refundSessionDate,
  totalTicketStock,
} from "@/components/ticketStats";
import { EVENT_SESSIONS, type SessionTicket } from "@/components/ticketSamples";
import {
  PurchaseLimitPanel,
  SessionFilter,
  loadTicketSession,
  saveTicketSession,
} from "@/components/TicketLimitViews";
import { formatSessionDate } from "@/components/ticketTypes";
type Role = "platform" | "organizer" | "culture";
type TicketMode = "all" | "orders" | "refunds" | "limits";
type Page =
  | "workspace"
  | "events"
  | "activity"
  | "tickets"
  | "costumes"
  | "onsite"
  | "archive"
  | "organizer"
  | "data"
  | "onboarding"
  | "admissions"
  | "activity-create"
  | "activity-published";
type ActivityTab =
  | "overview"
  | "materials"
  | "participants"
  | "tickets"
  | "costumes"
  | "onsite"
  | "data"
  | "issues"
  | "archive";
type Locale = "zh" | "en" | "ug";
const RECORD_VISUALS = {
  poster: "/manus-storage/quji-event-poster_ea223b22.webp",
  character: "/manus-storage/quji-character-reference_066e947c.webp",
  costume: "/manus-storage/quji-costume-reference_610f2304.webp",
  prop: "/manus-storage/quji-prop-reference_ca4a00a7.webp",
};
/* 漫圈 VI 官方猫耳吉祥物与「趣集」贴纸字标（荆南俊俊体渲染） */
export const MASCOT = {
  avatar: "/manus-storage/quji-mascot-avatar_d3fa95ab.webp",
  logo: "/manus-storage/quji-logo_a6bcc69d.webp",
  wordmark: "/manus-storage/quji-wordmark_b171b79d.webp",
  wink: "/manus-storage/quji-mascot-wink_d015e555.webp",
  surprised: "/manus-storage/quji-mascot-surprised_42519e8c.webp",
  empty: "/manus-storage/quji-mascot-empty_583c36a9.webp",
  success: "/manus-storage/quji-mascot-success_d70c4726.webp",
};

type EventStatus =
  | "created"
  | "preparing"
  | "verifying"
  | "selling"
  | "live"
  | "ended"
  | "archived";

type EventItem = {
  id: string;
  name: string;
  subtitle: string;
  date: string;
  venue: string;
  organizer: string;
  status: EventStatus;
  tickets: number;
  checkedIn: number;
  pending: number;
  updated: string;
};

/** 活动日期：日期段与时间段各自不拆行，宽度不足时只在两段之间换行 */
function EventDate({ date }: { date: string }) {
  const [day, ...rest] = date.split(" ");
  return (
    <span data-cy="event-date">
      <span className="whitespace-nowrap">{day}</span>
      {rest.length > 0 && (
        <>
          {" "}
          <span className="whitespace-nowrap">{rest.join(" ")}</span>
        </>
      )}
    </span>
  );
}

const EVENTS: EventItem[] = [
  {
    id: "EVT-2026-0628",
    name: "2026 魔都动漫嘉年华",
    subtitle: "乌鲁木齐特别巡回展",
    date: "2026-06-28—06-29 09:00—18:00",
    venue: "新疆国际会展中心 3号馆",
    organizer: "新疆星河文化传媒有限公司",
    status: "selling",
    tickets: 4662,
    checkedIn: 0,
    pending: 3,
    updated: "今天 10:36",
  },
  {
    id: "EVT-2026-0720",
    name: "2026 丝路数字国风文创新潮博览会",
    subtitle: "国风文创与青年消费专题活动",
    date: "2026-07-20—07-21 09:00—18:00",
    venue: "乌鲁木齐文化中心 A馆",
    organizer: "丝路文创联合会",
    status: "verifying",
    tickets: 0,
    checkedIn: 0,
    pending: 5,
    updated: "今天 11:05",
  },
  {
    id: "EVT-2026-0731",
    name: "天山青年数字潮玩嘉年华",
    subtitle: "数字互动与潮玩体验活动",
    date: "2026-07-31—08-02 10:00—19:00",
    venue: "新疆国际会展中心 5号馆",
    organizer: "天山青年文化发展中心",
    status: "preparing",
    tickets: 0,
    checkedIn: 0,
    pending: 7,
    updated: "昨天 18:20",
  },
  {
    id: "EVT-2026-0808",
    name: "城市青年音乐与插画周",
    subtitle: "音乐、插画与原创市集",
    date: "2026-08-08—08-10 10:00—18:00",
    venue: "乌鲁木齐文创园",
    organizer: "新声艺术空间",
    status: "ended",
    tickets: 1260,
    checkedIn: 1186,
    pending: 0,
    updated: "9月16日",
  },
];

const STATUS_META: Record<
  EventStatus,
  { label: string; color: string; step: number }
> = {
  created: { label: "活动创建", color: "bg-slate-100 text-slate-700", step: 0 },
  preparing: {
    label: "资料准备",
    color: "bg-brand-100 text-brand-700",
    step: 1,
  },
  verifying: {
    label: "信息核验",
    color: "bg-amber-50 text-amber-700",
    step: 2,
  },
  selling: {
    label: "售票中",
    color: "bg-emerald-50 text-emerald-700",
    step: 3,
  },
  live: { label: "活动进行中", color: "bg-violet-50 text-violet-700", step: 4 },
  ended: { label: "活动结束", color: "bg-slate-100 text-slate-600", step: 5 },
  archived: {
    label: "归档完成",
    color: "bg-brand-50 text-brand-800",
    step: 6,
  },
};

const PROGRESS = [
  "活动创建",
  "资料准备",
  "信息核验",
  "售票中",
  "活动进行中",
  "活动结束",
  "归档完成",
];

const TEXT = {
  zh: {
    app: "趣集",
    sub: "文化活动协同管理平台",
    roleLogin: "选择工作身份",
    enter: "进入协同平台",
    workspace: "工作台",
    events: "活动管理",
    activity: "活动档案",
    tickets: "票务管理",
    costumes: "角色服装道具",
    onsite: "现场管理",
    archive: "数字档案",
    organizer: "主办方主体档案",
    data: "数据中心",
    notification: "通知中心",
    settings: "系统设置",
    switchRole: "切换身份",
    logout: "退出登录",
  },
  en: {
    app: "Quji",
    sub: "Cultural Event Operations",
    roleLogin: "Choose a workspace role",
    enter: "Enter platform",
    workspace: "Workspace",
    events: "Events",
    activity: "Event record",
    tickets: "Ticketing",
    costumes: "Costume & props",
    onsite: "On-site",
    archive: "Digital archive",
    organizer: "Organizer profile",
    data: "Data center",
    notification: "Notifications",
    settings: "Settings",
    switchRole: "Switch role",
    logout: "Log out",
  },
  ug: {
    app: "Quji",
    sub: "مەدەنىيەت پائالىيەت ھەمكارلىق باشقۇرۇش سۇپىسى",
    roleLogin: "خىزمەت سالاھىيىتىنى تاللاڭ",
    enter: "ھەمكارلىق سۇپىسىغا كىرىش",
    workspace: "خىزمەت ئۈستىلى",
    events: "پائالىيەت باشقۇرۇش",
    activity: "پائالىيەت ھۆججىتى",
    tickets: "بېلەت باشقۇرۇش",
    costumes: "رول كىيىم ۋە ئەسۋاب",
    onsite: "نەق مەيدان باشقۇرۇش",
    archive: "رەقەملىك ھۆججەت",
    organizer: "تەشكىللىگۈچى ھۆججىتى",
    data: "سانلىق مەلۇمات مەركىزى",
    notification: "ئۇقتۇرۇش مەركىزى",
    settings: "سىستېما تەڭشىكى",
    switchRole: "سالاھىيەت ئالماشتۇرۇش",
    logout: "چىقىش",
  },
} as const;

const ROLE_INFO: Record<
  Role,
  {
    name: string;
    note: string;
    icon: typeof Building2;
    color: string;
    permissions: Page[];
  }
> = {
  platform: {
    name: "平台运营人员",
    note: "配置活动流程、账号权限与服务运营",
    icon: Settings2,
    color: "bg-brand-600",
    permissions: [
      "workspace",
      "admissions",
      "events",
      "activity",
      "tickets",
      "costumes",
      "onsite",
      "archive",
      "organizer",
      "data",
    ],
  },
  organizer: {
    name: "主办方活动运营人员",
    note: "维护活动资料、票务、现场与参与人员",
    icon: Building2,
    color: "bg-candy-600",
    permissions: [
      "workspace",
      "onboarding",
      "activity-create",
      "activity-published",
      "events",
      "activity",
      "tickets",
      "costumes",
      "onsite",
      "archive",
      "organizer",
      "data",
    ],
  },
  culture: {
    name: "文旅业务指导人员",
    note: "查看活动电子档案、服务进度与汇总数据",
    icon: Building,
    color: "bg-brand-900",
    permissions: [
      "workspace",
      "events",
      "activity",
      "archive",
      "organizer",
      "data",
    ],
  },
};

const COSERS = [
  {
    person: "张三",
    character: "甘雨",
    source: "《原神》",
    ref: "角色原案图",
    costume: "白色长袍 / 渐变蓝发 / 羊角发箍",
    props: "紫色铃铛挂饰，无锐利金属",
    status: "已通过",
    log: "林洁 · 10:35 完成初核",
    risk: "低风险",
  },
  {
    person: "古丽米热·阿布都",
    character: "敦煌伎乐飞天",
    source: "国风原创",
    ref: "飞天服装设计图",
    costume: "石青色长裙 / 朱砂红飘带",
    props: "EVA 泡棉琵琶，非金属材质",
    status: "已通过",
    log: "陈涛 · 11:22 完成初核",
    risk: "低风险",
  },
  {
    person: "李思远",
    character: "机甲重装佣兵",
    source: "原创设定",
    ref: "机甲设定图",
    costume: "黑色仿战术背心 / 外骨骼臂甲",
    props: "仿真重弩模型，长约 1.2 米",
    status: "协同核验",
    log: "已转现场安保复验",
    risk: "高关注",
  },
  {
    person: "何晓晨",
    character: "雷电将军",
    source: "《原神》",
    ref: "角色参考图",
    costume: "紫色印花振袖 / 编发发簪",
    props: "轻质木质长刀，海绵安全鞘",
    status: "待审核",
    log: "用户端 12:05 提交",
    risk: "常规核验",
  },
];

const MATERIALS = [
  {
    name: "活动基本信息表",
    category: "基础资料",
    status: "已提交",
    update: "2026-06-12 15:20",
    operator: "新疆星河文化传媒",
    next: "无需补充",
  },
  {
    name: "活动规则与入场须知",
    category: "规则配置",
    status: "已发布",
    update: "2026-06-14 09:40",
    operator: "主办方运营组",
    next: "已同步用户端",
  },
  {
    name: "现场服务与应急联络表",
    category: "现场保障",
    status: "待补充",
    update: "2026-06-15 11:05",
    operator: "主办方运营组",
    next: "请补充夜间值守联系人",
  },
  {
    name: "场地平面与安检点位图",
    category: "现场保障",
    status: "已提交",
    update: "2026-06-13 16:30",
    operator: "场馆协调组",
    next: "等待活动前复核",
  },
  {
    name: "主办方主体资质材料",
    category: "主体材料",
    status: "已通过",
    update: "2026-06-10 14:15",
    operator: "平台运营组",
    next: "有效期至 2027-06-09",
  },
];

function Brand({ mini = false }: { mini?: boolean }) {
  return (
    <div
      data-cy="brand-mark"
      className="flex items-center gap-2"
      aria-label="趣集 文化活动协同管理平台"
    >
      <img
        src={MASCOT.avatar}
        alt=""
        aria-hidden="true"
        width={40}
        height={42}
        className="h-[42px] w-10 shrink-0 select-none object-contain"
      />
      {!mini && (
        <div className="min-w-0">
          <img
            src={MASCOT.wordmark}
            alt="趣集"
            width={55}
            height={31}
            className="block h-[31px] w-[55px] select-none"
          />
          <div className="mt-0.5 whitespace-nowrap text-[12px] leading-4 text-slate-500">
            文化活动协同管理平台
          </div>
        </div>
      )}
    </div>
  );
}
function Status({ status }: { status: EventStatus }) {
  const s = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-semibold ${s.color}`}
    >
      {s.label}
    </span>
  );
}
function Pill({
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
      className={`inline-flex shrink-0 whitespace-nowrap px-2.5 py-1 rounded-full text-[12px] font-semibold ${colors[tone]}`}
    >
      {children}
    </span>
  );
}
function ModuleTitle({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="text-[12px] font-semibold text-slate-500 tracking-wide">
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
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action: string;
}) {
  return (
    <div
      data-cy="empty-state"
      className="border border-dashed border-brand-200 bg-brand-50/60 rounded-xl p-8 sm:p-10 text-center"
    >
      <div className="relative mx-auto w-[120px]">
        <img
          src={MASCOT.empty}
          alt=""
          aria-hidden="true"
          width={120}
          height={121}
          className="w-[120px] h-auto select-none"
        />
        <span className="absolute -right-1 bottom-1 w-9 h-9 rounded-full bg-white text-brand-600 ring-1 ring-brand-200 flex items-center justify-center [&>svg]:w-[18px] [&>svg]:h-[18px]">
          {icon}
        </span>
      </div>
      <h3 className="mt-4 text-[17px] font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm mx-auto text-[14px] leading-6 text-slate-600">
        {text}
      </p>
      <div className="mt-5 inline-flex">
        <ActionButton
          label={action}
          className="h-10 px-4 rounded-full bg-brand-grad text-white text-[14px] font-semibold"
          title={action}
          description="可在此开始建立新的活动档案并补充基础资料。"
        />
      </div>
    </div>
  );
}

function ActionButton({
  label,
  className,
  title,
  description,
  icon,
}: {
  label: string;
  className: string;
  title?: string;
  description?: string;
  icon?: ReactNode;
}) {
  const [state, setState] = useState<"view" | "edit" | "done" | null>(null);
  const [note, setNote] = useState("");
  const heading = title || label;
  const exporting = label.includes("导出");
  const reviewing = /查看|记录|资料/.test(label);
  const secondStep = exporting
    ? "选择范围"
    : reviewing
      ? "补充或更新"
      : "确认处理";
  const finalStep = exporting ? "生成文件" : "提交并写入记录";
  const close = () => {
    setState(null);
    setNote("");
  };
  const meta = exporting
    ? "当前活动 数据归集范围已加载"
    : "当前活动 关联资料与操作记录已加载";
  return (
    <>
      <button onClick={() => setState("view")} className={className}>
        {icon}
        {label}
      </button>
      {state && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <button
            aria-label="关闭任务面板"
            onClick={close}
            className="absolute inset-0 bg-slate-950/20"
          />
          <aside
            data-cy="task-drawer"
            dir="ltr"
            className="task-drawer relative h-full w-full max-w-[560px] bg-white flex flex-col text-left"
          >
            <header className="relative border-b border-slate-200 px-6 py-5 text-left">
              <div
                data-cy="task-heading"
                className="w-full min-w-0 pr-12 text-left"
              >
                <div className="text-[13px] font-semibold text-slate-500">
                  任务处理
                </div>
                <h2 className="mt-1 text-[22px] leading-7 font-semibold text-slate-900">
                  {heading}
                </h2>
                <p className="mt-1 text-[14px] leading-6 text-slate-600">
                  {meta}
                </p>
              </div>
              <button
                onClick={close}
                aria-label="关闭"
                className="absolute right-5 top-5 w-9 h-9 rounded-md text-slate-500 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </header>
            <div className="px-6 py-4 border-b border-slate-200 grid grid-cols-3 gap-2">
              {[
                ["查看当前资料", "view"],
                [secondStep, "edit"],
                [finalStep, "done"],
              ].map(([step, id], index) => (
                <div
                  key={id as string}
                  data-active={state === id}
                  className="task-step rounded-md border border-transparent px-3 py-2 min-w-0 text-left"
                >
                  <div className="text-[11px] font-semibold text-slate-500">
                    0{index + 1}
                  </div>
                  <div className="mt-1 text-[13px] font-semibold whitespace-nowrap">
                    {step}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {state === "view" && (
                <div className="space-y-5">
                  <section className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                    <TaskField
                      label="当前状态"
                      value={
                        exporting
                          ? "数据已汇总 可按范围生成文件"
                          : "资料已归集 可查看版本与处理记录"
                      }
                    />
                    <TaskField
                      label="关联内容"
                      value={
                        description?.replace(/[，。；、·]/g, " ") ||
                        "当前活动关联材料 处理意见与操作时间"
                      }
                    />
                    <TaskField
                      label="最近更新"
                      value="今天 10:36 主办方运营组"
                    />
                  </section>
                  <section>
                    <h3 className="text-[15px] font-semibold">操作记录</h3>
                    <div className="mt-3 space-y-3">
                      <TimelineRow
                        text="已加载当前版本与关联记录"
                        time="刚刚"
                      />
                      <TimelineRow
                        text="主办方更新活动材料"
                        time="今天 10:36"
                      />
                      <TimelineRow
                        text="平台运营人员完成资料核验"
                        time="昨天 16:30"
                      />
                    </div>
                  </section>
                </div>
              )}
              {state === "edit" && (
                <div className="space-y-5">
                  <section className="border border-slate-200 rounded-lg p-4">
                    <h3 className="text-[15px] font-semibold">
                      {exporting ? "导出范围" : "处理说明"}
                    </h3>
                    <p className="mt-1 text-[14px] leading-6 text-slate-600">
                      {exporting
                        ? "默认包含当前活动的已归集数据与操作记录"
                        : "填写本次补充 修订或处理说明 提交后写入活动记录"}
                    </p>
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder={
                        exporting
                          ? "例如 用于本周运营复盘"
                          : "例如 已补充主体资质文件第 2 版"
                      }
                      className="mt-4 w-full min-h-28 resize-none rounded-md border border-slate-300 px-3 py-2 text-[14px] leading-6 outline-none focus:border-brand-500"
                    />
                  </section>
                  <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-[14px] leading-6 text-slate-700">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mt-1 w-4 h-4 accent-brand-600"
                    />
                    同步写入当前活动操作记录并保留本次处理时间与操作人
                  </label>
                </div>
              )}
              {state === "done" && (
                <div className="py-12 text-center">
                  <div className="mx-auto w-11 h-11 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="mt-4 text-[20px] font-semibold">
                    {exporting ? "活动文件已生成" : "任务已提交并登记"}
                  </h3>
                  <p className="mt-2 max-w-sm mx-auto text-[14px] leading-6 text-slate-600">
                    {exporting
                      ? "文件已按当前活动数据范围生成 可在活动档案中继续查看"
                      : "本次处理已写入当前活动操作记录 可继续处理下一项待办"}
                  </p>
                </div>
              )}
            </div>
            <footer className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={close}
                className="h-10 px-4 rounded-full border border-brand-200 text-[14px] font-semibold text-slate-700 hover:bg-brand-50"
              >
                {state === "done" ? "返回列表" : "暂存并返回"}
              </button>
              {state !== "done" && (
                <button
                  onClick={() => setState(state === "view" ? "edit" : "done")}
                  className="h-10 px-4 rounded-full bg-brand-grad hover:brightness-95 text-white text-[14px] font-semibold flex items-center gap-2"
                >
                  {state === "view" ? `下一步 ${secondStep}` : finalStep}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}
function TaskField({ label, value }: { label: string; value: string }) {
  return (
    <div className="task-field grid gap-1.5 px-4 py-3 text-left">
      <div className="text-[12px] font-semibold text-slate-500">{label}</div>
      <div className="task-field__value text-[14px] leading-6 text-slate-800 semantic-copy">
        {value}
      </div>
    </div>
  );
}
function TimelineRow({ text, time }: { text: string; time: string }) {
  return (
    <div className="timeline-row grid grid-cols-[8px_minmax(0,1fr)] items-start gap-3 text-left">
      <div className="mt-2 w-2 h-2 rounded-full bg-brand-grad" />
      <div className="min-w-0">
        <div className="text-[14px] leading-6 text-slate-800">{text}</div>
        <div className="mt-1 text-[12px] leading-5 tabular-nums text-slate-500">
          {time}
        </div>
      </div>
    </div>
  );
}
const LOGIN_ROLE_LINES: Record<Role, [string, string]> = {
  platform: ["入驻审核", "流程配置与服务运营"],
  organizer: ["活动资料 票务", "参与人员与现场管理"],
  culture: ["活动电子档案", "服务进度与汇总数据"],
};
const LOGIN_CAPABILITIES = [
  {
    icon: FileCheck2,
    title: "主办方入驻",
    text: ["手机号注册", "实名与主体材料审核"],
  },
  {
    icon: TicketCheck,
    title: "票务与现场",
    text: ["多日场次 身份证限购", "扫码入场核验"],
  },
  {
    icon: FileArchive,
    title: "活动归档",
    text: ["活动结束", "形成完整数字档案"],
  },
] as const;
function PhraseLine({ parts }: { parts: readonly string[] }) {
  return (
    <>
      {parts.map((part, index) => (
        <span key={part}>
          {index > 0 && " "}
          <span className="inline-block whitespace-nowrap">{part}</span>
        </span>
      ))}
    </>
  );
}
function Login({
  role,
  setRole,
  onEnter,
  onRegister,
  locale,
  setLocale,
}: {
  role: Role;
  setRole: (role: Role) => void;
  onEnter: () => void;
  onRegister: () => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}) {
  const t = TEXT[locale];
  const [account, setAccount] = useState("linjie@quji.cn");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const roles = Object.entries(ROLE_INFO) as [Role, (typeof ROLE_INFO)[Role]][];
  const submit = () => {
    if (!account.trim() || !password.trim()) {
      setError("请输入账号和密码");
      return;
    }
    if (password !== "123456") {
      setError("密码不正确 请使用预置密码 123456");
      return;
    }
    setError("");
    onEnter();
  };
  const inputClass =
    "h-11 w-full rounded-full border border-slate-200 bg-slate-50 ps-11 text-[14px] text-slate-800 outline-none transition-colors focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100";
  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#f2f2fc]"
      dir={locale === "ug" ? "rtl" : "ltr"}
    >
      <header className="relative z-10 h-20 px-5 sm:px-8 lg:px-12 flex items-center justify-between border-b border-[#e7e6f4] bg-white">
        <Brand />
        <LocaleSwitch locale={locale} setLocale={setLocale} />
      </header>
      <main className="relative z-10 mx-auto grid w-full max-w-[1180px] items-stretch gap-6 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_480px] lg:gap-10 lg:py-12">
        <section
          data-cy="login-intro"
          className="vi-speedlines relative order-2 flex w-full flex-col overflow-hidden rounded-2xl p-6 text-white sm:p-8 lg:order-1"
        >
          <div
            className="vi-halftone pointer-events-none absolute inset-0"
            aria-hidden="true"
          />
          <span
            className="vi-sparkle end-[12%] top-[14%]"
            style={{ "--s": "22px" } as CSSProperties}
            aria-hidden="true"
          />
          <span
            className="vi-sparkle end-[30%] top-[8%]"
            style={{ "--s": "12px", "--d": "1.1s" } as CSSProperties}
            aria-hidden="true"
          />
          <span
            className="vi-sparkle start-[8%] bottom-[34%]"
            style={{ "--s": "14px", "--d": "2s" } as CSSProperties}
            aria-hidden="true"
          />
          <div className="relative flex items-start justify-between gap-4">
            <span className="inline-flex whitespace-nowrap rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-brand-700">
              新疆 · 多元文化活动协同
            </span>
          </div>
          <img
            src={MASCOT.logo}
            alt="趣集"
            width={320}
            height={128}
            data-cy="login-mascot"
            className="relative mt-6 h-auto w-[248px] select-none sm:w-[300px]"
          />
          <h1 className="relative mt-5 text-[32px] sm:text-[40px] leading-[1.15] font-semibold tracking-[-0.04em]">
            一场活动
            <br />
            一套完整数字档案
          </h1>
          <p className="relative mt-4 text-[16px] leading-7 text-white/90">
            <span className="block">
              <PhraseLine parts={["以活动为核心对象", "连接主办方资料"]} />
            </span>
            <span className="block">
              <PhraseLine parts={["参与人员 票务", "角色服装道具与归档"]} />
            </span>
          </p>
          <ul
            className="relative mt-auto grid gap-3 pt-7"
            data-cy="login-capabilities"
          >
            {LOGIN_CAPABILITIES.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-slate-900 shadow-[0_4px_0_0_rgba(67,47,108,0.28)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                  <Icon className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <span className="min-w-0 text-start">
                  <span className="block whitespace-nowrap text-[15px] font-semibold leading-5 text-slate-900">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-5 text-slate-600">
                    <PhraseLine parts={text} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <form
          data-cy="login-form"
          onSubmit={event => {
            event.preventDefault();
            submit();
          }}
          className="order-1 w-full self-center rounded-2xl border border-[#e7e6f4] bg-white p-6 shadow-[0_6px_0_-1px_rgba(67,47,108,0.12)] sm:p-8 lg:order-2"
        >
          <div className="text-start">
            <div className="text-[13px] font-semibold text-brand-600">
              账号登录
            </div>
            <h2 className="mt-1 text-[26px] leading-9 font-semibold tracking-[-0.03em] text-slate-900">
              登录趣集
            </h2>
            <p className="mt-1 text-[14px] leading-6 text-slate-600">
              <PhraseLine parts={["选择工作身份", "进入对应的菜单与数据"]} />
            </p>
          </div>
          <fieldset className="mt-6">
            <legend className="text-[14px] font-semibold text-slate-800">
              {t.roleLogin}
            </legend>
            <div role="radiogroup" className="mt-2 grid gap-2">
              {roles.map(([key, item]) => {
                const Icon = item.icon;
                const selected = role === key;
                return (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    key={key}
                    data-cy={`login-role-${key}`}
                    onClick={() => {
                      setRole(key);
                      setError("");
                    }}
                    className={`role-login-card flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-start transition-colors ${selected ? "border-brand-400 bg-brand-100 ring-1 ring-brand-400" : "border-slate-200 bg-white hover:border-brand-300"}`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.color} text-white`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block whitespace-nowrap text-[15px] font-semibold leading-5 text-slate-900">
                        {item.name}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-5 text-slate-600">
                        <PhraseLine parts={LOGIN_ROLE_LINES[key]} />
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-transparent bg-brand-grad text-white" : "border-slate-300 bg-white"}`}
                    >
                      {selected && (
                        <Check className="h-3 w-3" strokeWidth={3} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className="text-[14px] font-semibold text-slate-800">
                账号
              </span>
              <span className="relative mt-2 block">
                <UserRound className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={account}
                  onChange={e => setAccount(e.target.value)}
                  autoComplete="username"
                  data-cy="login-account"
                  className={`${inputClass} pe-4`}
                />
              </span>
            </label>
            <label className="block min-w-0">
              <span className="text-[14px] font-semibold text-slate-800">
                密码
              </span>
              <span className="relative mt-2 block">
                <LockKeyhole className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  data-cy="login-password"
                  className={`${inputClass} pe-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  data-cy="login-password-toggle"
                  className="absolute end-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </span>
            </label>
          </div>
          <div className="mt-3 text-start text-[13px] leading-5 text-slate-500">
            <PhraseLine
              parts={["预置账号 linjie@quji.cn", "预置密码 123456"]}
            />
          </div>
          {error && (
            <div
              data-cy="login-error"
              className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700"
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            data-cy="login-submit"
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-grad text-[15px] font-semibold text-white hover:brightness-95"
          >
            {t.enter}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </button>
          {role === "organizer" ? (
            <div className="mt-5" data-cy="login-register-block">
              <div className="flex items-center gap-3 text-[12px] text-slate-500">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="whitespace-nowrap">首次使用</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <button
                type="button"
                onClick={onRegister}
                data-cy="organizer-register"
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-brand-400 bg-white text-[14px] font-semibold text-brand-700 hover:bg-brand-50"
              >
                <UserPlus className="h-4 w-4" />
                主办方首次入驻注册
              </button>
              <p className="mt-2 text-center text-[12px] leading-5 text-slate-500">
                <PhraseLine
                  parts={["手机号验证 实名核验", "主体材料审核通过后发布活动"]}
                />
              </p>
            </div>
          ) : (
            <p
              data-cy="login-account-note"
              className="mt-5 text-center text-[12px] leading-5 text-slate-500"
            >
              <PhraseLine
                parts={["账号由平台统一开通", "如需开通请联系平台运营人员"]}
              />
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <label>
      <span className="text-[14px] font-semibold">{label}</span>
      <div className="mt-2 h-11 px-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center text-[14px] text-slate-700">
        {value}
      </div>
    </label>
  );
}
function LocaleSwitch({
  locale,
  setLocale,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}) {
  return (
    <div className="flex rounded-full p-1 bg-white border border-[#e4e3f0]">
      <button
        onClick={() => setLocale("zh")}
        className={`h-7 px-2.5 text-[12px] whitespace-nowrap rounded-full ${locale === "zh" ? "bg-brand-grad text-white font-semibold" : "text-brand-700/80 hover:text-brand-700"}`}
      >
        中文
      </button>
      <button
        onClick={() => setLocale("en")}
        className={`h-7 px-2.5 text-[12px] whitespace-nowrap rounded-full ${locale === "en" ? "bg-brand-grad text-white font-semibold" : "text-brand-700/80 hover:text-brand-700"}`}
      >
        EN
      </button>
      <button
        onClick={() => setLocale("ug")}
        className={`h-7 px-2.5 text-[12px] whitespace-nowrap rounded-full ${locale === "ug" ? "bg-brand-grad text-white font-semibold" : "text-brand-700/80 hover:text-brand-700"}`}
      >
        ئۇيغۇرچە
      </button>
    </div>
  );
}

const WORKSPACE_SESSION_KEY = "quji_workspace_session_v1";
const SCROLL_KEY_PREFIX = "quji_scroll_";
const PAGE_VALUES: Page[] = [
  "workspace",
  "events",
  "activity",
  "tickets",
  "costumes",
  "onsite",
  "archive",
  "organizer",
  "data",
  "onboarding",
  "admissions",
  "activity-create",
  "activity-published",
];
const TAB_VALUES: ActivityTab[] = [
  "overview",
  "materials",
  "participants",
  "tickets",
  "costumes",
  "onsite",
  "data",
  "issues",
  "archive",
];
type WorkspaceSession = {
  signedIn: boolean;
  role: Role;
  locale: Locale;
  page: Page;
  eventId: string;
  activityTab: ActivityTab;
  ticketMode: TicketMode;
  sidebarCollapsed: boolean;
  registrationOpen: boolean;
};
function loadWorkspaceSession(): WorkspaceSession {
  const fallback: WorkspaceSession = {
    signedIn: false,
    role: "organizer",
    locale: "zh",
    page: "workspace",
    eventId: EVENTS[0].id,
    activityTab: "overview",
    ticketMode: "all",
    sidebarCollapsed: false,
    registrationOpen: false,
  };
  try {
    const raw = localStorage.getItem(WORKSPACE_SESSION_KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as Partial<WorkspaceSession>;
    const role =
      saved.role && saved.role in ROLE_INFO ? saved.role : fallback.role;
    const page =
      saved.page &&
      PAGE_VALUES.includes(saved.page) &&
      (saved.page === "activity" ||
        ROLE_INFO[role].permissions.includes(saved.page))
        ? saved.page
        : fallback.page;
    return {
      signedIn: saved.signedIn === true,
      role,
      locale:
        saved.locale === "en" || saved.locale === "ug" ? saved.locale : "zh",
      page,
      eventId: EVENTS.some(item => item.id === saved.eventId)
        ? (saved.eventId as string)
        : fallback.eventId,
      activityTab:
        saved.activityTab && TAB_VALUES.includes(saved.activityTab)
          ? saved.activityTab
          : fallback.activityTab,
      ticketMode:
        saved.ticketMode === "orders" ||
        saved.ticketMode === "refunds" ||
        saved.ticketMode === "limits"
          ? saved.ticketMode
          : "all",
      sidebarCollapsed: saved.sidebarCollapsed === true,
      registrationOpen: saved.registrationOpen === true,
    };
  } catch {
    return fallback;
  }
}

export default function Home() {
  const [restored] = useState(loadWorkspaceSession);
  const [signedIn, setSignedIn] = useState(restored.signedIn);
  const [role, setRole] = useState<Role>(restored.role);
  const [locale, setLocale] = useState<Locale>(restored.locale);
  const [page, setPage] = useState<Page>(restored.page);
  const [selectedEvent, setSelectedEvent] = useState<EventItem>(
    () => EVENTS.find(item => item.id === restored.eventId) || EVENTS[0]
  );
  const [activityTab, setActivityTab] = useState<ActivityTab>(
    restored.activityTab
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    restored.sidebarCollapsed
  );
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [settingOpen, setSettingOpen] = useState(false);
  const [checkins, setCheckins] = useState(0);
  const [issueOpen, setIssueOpen] = useState(false);
  const [ticketMode, setTicketMode] = useState<TicketMode>(restored.ticketMode);
  const [registrationOpen, setRegistrationOpen] = useState(
    restored.registrationOpen
  );
  useEffect(() => {
    const snapshot: WorkspaceSession = {
      signedIn,
      role,
      locale,
      page,
      eventId: selectedEvent.id,
      activityTab,
      ticketMode,
      sidebarCollapsed,
      registrationOpen,
    };
    try {
      localStorage.setItem(WORKSPACE_SESSION_KEY, JSON.stringify(snapshot));
    } catch {
      /* 浏览器禁止本地存储时仅保持当前会话 */
    }
  }, [
    signedIn,
    role,
    locale,
    page,
    selectedEvent.id,
    activityTab,
    ticketMode,
    sidebarCollapsed,
    registrationOpen,
  ]);
  useEffect(() => {
    if (!restored.signedIn) return;
    const saved = Number(
      sessionStorage.getItem(`${SCROLL_KEY_PREFIX}${restored.page}`) || 0
    );
    if (saved <= 0) return;
    let attempts = 0;
    const restore = () => {
      window.scrollTo({ top: saved });
      attempts += 1;
      if (Math.abs(window.scrollY - saved) > 4 && attempts < 20)
        window.setTimeout(restore, 100);
    };
    requestAnimationFrame(restore);
  }, [restored]);
  useEffect(() => {
    if (!signedIn) return;
    const scrollKey = `${SCROLL_KEY_PREFIX}${page}`;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        sessionStorage.setItem(scrollKey, String(Math.round(window.scrollY)))
      );
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [signedIn, page]);
  const signOut = () => {
    setSignedIn(false);
    setPage("workspace");
    setActivityTab("overview");
    try {
      Object.keys(sessionStorage)
        .filter(key => key.startsWith("quji_"))
        .forEach(key => sessionStorage.removeItem(key));
    } catch {
      /* 忽略存储清理失败 */
    }
  };
  const [admission, setAdmission] = useState<AdmissionState>(() => {
    try {
      const saved = localStorage.getItem("quji_admission_state");
      return saved
        ? (JSON.parse(saved) as AdmissionState)
        : createEmptyAdmission();
    } catch {
      return createEmptyAdmission();
    }
  });
  const updateAdmission = (next: AdmissionState) => {
    setAdmission(next);
    localStorage.setItem("quji_admission_state", JSON.stringify(next));
  };
  const t = TEXT[locale];
  const permissions = ROLE_INFO[role].permissions;
  const nav = (
    [
      {
        id: "workspace",
        label: t.workspace,
        icon: LayoutDashboard,
        group: "工作协同",
      },
      {
        id: "onboarding",
        label: "入驻与认证",
        icon: UserCheck,
        group: "账号与主体",
      },
      {
        id: "admissions",
        label: "入驻审核",
        icon: ClipboardCheck,
        group: "账号与主体",
      },
      {
        id: "activity-create",
        label: "创建活动",
        icon: Plus,
        group: "活动运营",
      },
      { id: "events", label: t.events, icon: CalendarDays, group: "工作协同" },
      { id: "tickets", label: t.tickets, icon: Ticket, group: "活动运营" },
      { id: "costumes", label: t.costumes, icon: Shirt, group: "活动运营" },
      { id: "onsite", label: t.onsite, icon: ScanLine, group: "活动运营" },
      {
        id: "archive",
        label: t.archive,
        icon: FileArchive,
        group: "资料与复盘",
      },
      {
        id: "organizer",
        label: t.organizer,
        icon: Building2,
        group: "资料与复盘",
      },
      {
        id: "data",
        label: t.data,
        icon: ChartNoAxesCombined,
        group: "资料与复盘",
      },
    ] as {
      id: Page;
      label: string;
      icon: typeof LayoutDashboard;
      group: string;
    }[]
  ).filter(item => permissions.includes(item.id));
  const currentPageLabel =
    nav.find(item => item.id === page)?.label ||
    (page === "activity-published" ? "发布完成" : t.activity);
  const changePage = (next: Page, tab?: ActivityTab) => {
    if (permissions.includes(next) || next === "activity") {
      setPage(next);
      if (tab) setActivityTab(tab);
    }
  };
  const roleLabel = ROLE_INFO[role].name;
  const displayName =
    role === "organizer"
      ? admission.realName || "林洁"
      : role === "culture"
        ? "王处长"
        : "周可";
  if (registrationOpen)
    return (
      <OrganizerRegistration
        onBack={() => setRegistrationOpen(false)}
        onComplete={next => {
          updateAdmission(next);
          setRegistrationOpen(false);
          setRole("organizer");
          setSignedIn(true);
          setPage("onboarding");
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const target = document.querySelector<HTMLElement>(
                '[data-cy="material-list"]'
              );
              if (!target) return;
              window.scrollTo({
                top: Math.max(
                  0,
                  target.getBoundingClientRect().top + window.scrollY - 88
                ),
                behavior: "smooth",
              });
            });
          });
        }}
      />
    );
  if (!signedIn)
    return (
      <Login
        role={role}
        setRole={setRole}
        onRegister={() => {
          updateAdmission(createEmptyAdmission());
          setRegistrationOpen(true);
        }}
        onEnter={() => {
          if (role === "organizer") updateAdmission(createApprovedAdmission());
          setSignedIn(true);
        }}
        locale={locale}
        setLocale={setLocale}
      />
    );
  return (
    <div
      className="workspace-canvas min-h-screen text-slate-900"
      dir={locale === "ug" ? "rtl" : "ltr"}
    >
      <div className="flex min-h-screen">
        <aside
          data-cy="desktop-sidebar"
          className={`hidden lg:flex ${sidebarCollapsed ? "w-[64px]" : "w-[232px]"} shrink-0 bg-white border-r border-[#e7e6f4] flex-col sticky top-0 h-screen transition-[width] duration-200`}
        >
          <div
            data-cy="sidebar-brand"
            className={`h-16 ${sidebarCollapsed ? "px-3 justify-center" : "px-5"} flex items-center border-b border-[#e7e6f4]`}
          >
            <Brand mini={sidebarCollapsed} />
          </div>
          <nav className="p-3 flex-1 overflow-y-auto">
            {["账号与主体", "工作协同", "活动运营", "资料与复盘"].map(group => {
              const items = nav.filter(item => item.group === group);
              if (!items.length) return null;
              return (
                <div key={group} className="mb-6">
                  <div
                    className={`px-3 mb-2 text-[12px] font-semibold tracking-wide text-slate-500 ${sidebarCollapsed ? "hidden" : ""}`}
                  >
                    {group}
                  </div>
                  {items.map(item => {
                    const Icon = item.icon;
                    const active =
                      page === item.id ||
                      (page === "activity" && item.id === "events");
                    return (
                      <button
                        key={item.id}
                        title={item.label}
                        data-active={active}
                        data-cy="sidebar-nav-item"
                        onClick={() => changePage(item.id)}
                        className={`w-full h-11 mb-1 rounded-full flex items-center text-[14px] transition-colors ${sidebarCollapsed ? "justify-center px-0" : "pl-1.5 pr-3 gap-2.5"} ${active ? (sidebarCollapsed ? "text-brand-700 font-semibold" : "bg-brand-100 text-brand-700 font-semibold") : "text-slate-700 hover:bg-brand-50/70"}`}
                      >
                        <span className="nav-icon-chip">
                          <Icon
                            className="w-[18px] h-[18px]"
                            strokeWidth={1.9}
                          />
                        </span>
                        {!sidebarCollapsed && <span>{item.label}</span>}
                        {!sidebarCollapsed && item.id === "costumes" && (
                          <span className="ml-auto min-w-5 h-5 px-1.5 inline-flex items-center justify-center text-[11px] font-semibold rounded-full bg-candy-600 text-white">
                            2
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
          <div
            className={`sidebar-footer shrink-0 border-t border-[#e7e6f4] ${sidebarCollapsed ? "p-2" : "p-3"}`}
          >
            <div
              className={`flex ${sidebarCollapsed ? "flex-col items-center gap-2" : "flex-col gap-1"}`}
            >
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
                aria-label={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
                className={`sidebar-toggle h-8 rounded-full border border-[#e4e3f0] flex items-center justify-center text-navy-700 hover:text-brand-700 hover:bg-brand-50 ${sidebarCollapsed ? "w-8" : "w-8 mb-1"}`}
              >
                <PanelLeftClose
                  className={`w-4 h-4 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`}
                />
              </button>
              <button
                onClick={() => setNotificationOpen(true)}
                title="通知中心"
                aria-label="通知中心"
                className={`h-9 rounded-full flex items-center text-[14px] text-slate-700 hover:bg-brand-50 ${sidebarCollapsed ? "w-8 justify-center" : "w-full px-3 gap-3"}`}
              >
                <span className="relative flex text-navy-700">
                  <Bell className="w-[18px] h-[18px]" />
                  {sidebarCollapsed && (
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-candy-600" />
                  )}
                </span>
                {!sidebarCollapsed && <span>通知中心</span>}
                {!sidebarCollapsed && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-candy-600" />
                )}
              </button>
              <button
                onClick={() => setSettingOpen(true)}
                title="系统设置"
                aria-label="系统设置"
                className={`h-9 rounded-full flex items-center text-[14px] text-slate-700 hover:bg-brand-50 ${sidebarCollapsed ? "w-8 justify-center" : "w-full px-3 gap-3"}`}
              >
                <Settings2 className="w-[18px] h-[18px] text-navy-700" />
                {!sidebarCollapsed && <span>系统设置</span>}
              </button>
            </div>
            <div
              className={`sidebar-profile mt-2 ${sidebarCollapsed ? "flex justify-center" : "rounded-xl bg-brand-50 border border-brand-100 p-3 flex items-center gap-2"}`}
            >
              <div
                title={sidebarCollapsed ? roleLabel : undefined}
                className={`w-8 h-8 shrink-0 rounded-full ${ROLE_INFO[role].color} text-white flex items-center justify-center text-[13px] font-semibold ring-2 ring-white`}
              >
                {displayName.slice(0, 1)}
              </div>
              {!sidebarCollapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold truncate">
                      {displayName}
                    </div>
                    <div className="text-[12px] text-slate-500 truncate">
                      {roleLabel}
                    </div>
                  </div>
                  <button
                    onClick={signOut}
                    title={t.logout}
                    aria-label={t.logout}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white text-navy-700"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>
        <div className="flex-1 min-w-0">
          <header
            data-cy="workspace-topbar"
            className="h-16 bg-white/90 backdrop-blur-md border-b border-[#e7e6f4] px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-20"
          >
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label={menuOpen ? "关闭菜单" : "打开菜单"}
                aria-expanded={menuOpen}
                className="lg:hidden w-10 h-10 rounded-full text-navy-700 hover:bg-brand-50 flex items-center justify-center"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="hidden sm:flex min-w-0 items-center gap-2 text-[14px] text-slate-500">
                <button
                  onClick={() => changePage("events")}
                  className="shrink-0 whitespace-nowrap hover:text-brand-600"
                >
                  活动管理
                </button>
                <ChevronRight className="w-4 h-4 shrink-0" />
                <button
                  onClick={() => changePage("activity")}
                  className="min-w-0 font-semibold text-slate-800 truncate max-w-[320px]"
                >
                  {selectedEvent.name} · {selectedEvent.subtitle}
                </button>
              </div>
              <div className="sm:hidden text-[15px] font-semibold">
                {currentPageLabel}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => setPage("activity")}
                className="hidden md:flex h-9 shrink-0 px-3.5 rounded-full border border-brand-200 bg-white text-brand-700 text-[13px] font-semibold whitespace-nowrap items-center gap-1.5 hover:bg-brand-50"
              >
                <FolderOpen className="w-4 h-4" />
                当前活动档案
              </button>
              <LocaleSwitch locale={locale} setLocale={setLocale} />
              <button
                onClick={() => setNotificationOpen(true)}
                className="relative w-9 h-9 rounded-full text-navy-700 hover:bg-brand-50 flex items-center justify-center"
              >
                <Bell className="w-[18px] h-[18px]" />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-candy-600" />
              </button>
            </div>
          </header>
          {menuOpen && (
            <MobileMenu
              nav={nav}
              page={page}
              onNavigate={page => {
                setMenuOpen(false);
                changePage(page);
              }}
            />
          )}
          <main className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
            {page === "workspace" && (
              <>
                {role === "organizer" && admission.status !== "approved" && (
                  <OnboardingWorkspaceGate
                    state={admission}
                    onContinue={() => setPage("onboarding")}
                  />
                )}
                <Workspace
                  events={EVENTS}
                  onOpenEvent={event => {
                    setSelectedEvent(event);
                    changePage("activity");
                  }}
                  onNavigate={changePage}
                />
              </>
            )}
            {page === "events" && (
              <EventsPage
                events={EVENTS}
                onOpen={event => {
                  setSelectedEvent(event);
                  changePage("activity");
                }}
              />
            )}
            {page === "activity" && (
              <ActivityRecord
                event={selectedEvent}
                tab={activityTab}
                setTab={setActivityTab}
                onNavigate={changePage}
                role={role}
                canEdit={role === "organizer" || role === "platform"}
              />
            )}
            {page === "tickets" && (
              <TicketPage
                role={role}
                mode={ticketMode}
                setMode={setTicketMode}
              />
            )}
            {page === "costumes" && <CostumePage />}
            {page === "onsite" && (
              <OnsitePage
                checkins={checkins}
                setCheckins={setCheckins}
                issueOpen={issueOpen}
                setIssueOpen={setIssueOpen}
              />
            )}
            {page === "archive" && <ArchivePage />}
            {page === "organizer" && (
              <OrganizerMaterials
                canEdit={role === "organizer" || role === "platform"}
              />
            )}
            {page === "data" && <DataCenter />}
            {page === "onboarding" && (
              <OrganizerOnboarding
                state={admission}
                onChange={updateAdmission}
                onCreateActivity={() => setPage("activity-create")}
              />
            )}
            {page === "admissions" && (
              <AdmissionReview state={admission} onChange={updateAdmission} />
            )}
            {page === "activity-create" && (
              <ActivityCreationWizard
                approved={admission.status === "approved"}
                onBack={() => setPage("onboarding")}
                onFinish={() => setPage("activity-published")}
              />
            )}
            {page === "activity-published" && (
              <ActivityPublished
                onWorkspace={() => setPage("events")}
                onTickets={() => setPage("tickets")}
              />
            )}
          </main>
        </div>
      </div>
      {notificationOpen && (
        <NotificationPanel
          onClose={() => setNotificationOpen(false)}
          onOpenCostume={() => {
            setNotificationOpen(false);
            setPage("costumes");
          }}
        />
      )}
      {settingOpen && (
        <SettingsPanel
          role={role}
          onRoleChange={next => {
            setRole(next);
            if (!ROLE_INFO[next].permissions.includes(page))
              setPage("workspace");
          }}
          onClose={() => setSettingOpen(false)}
          onLogout={() => {
            setSettingOpen(false);
            signOut();
          }}
        />
      )}
    </div>
  );
}

function MobileMenu({
  nav,
  page,
  onNavigate,
}: {
  nav: { id: Page; label: string; icon: typeof LayoutDashboard }[];
  page: Page;
  onNavigate: (page: Page) => void;
}) {
  return (
    <div className="lg:hidden fixed inset-x-0 top-16 z-30 bg-white border-b border-[#e7e6f4] shadow-[0_18px_40px_-24px_rgba(67,47,108,0.45)] p-3 grid grid-cols-2 gap-2">
      {nav.map(item => {
        const Icon = item.icon;
        const active = page === item.id;
        return (
          <button
            key={item.id}
            data-active={active}
            onClick={() => onNavigate(item.id)}
            className={`h-11 rounded-full flex items-center gap-2 pl-1.5 pr-3 text-[14px] ${active ? "bg-brand-100 text-brand-700 font-semibold" : "bg-[#f6f6fb] text-slate-700"}`}
          >
            <span className="nav-icon-chip">
              <Icon className="w-4 h-4" strokeWidth={1.9} />
            </span>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function Workspace({
  events,
  onOpenEvent,
  onNavigate,
}: {
  events: EventItem[];
  onOpenEvent: (event: EventItem) => void;
  onNavigate: (page: Page, tab?: ActivityTab) => void;
}) {
  return (
    <div className="space-y-6">
      <ModuleTitle
        eyebrow="工作台"
        title="近期活动与协同待办"
        description="围绕正在筹备、售票或进行中的活动开展日常协同。"
        actions={
          <>
            <button
              onClick={() => onNavigate("events")}
              className="h-10 px-4 rounded-full border border-brand-200 bg-white text-[14px] font-semibold hover:bg-brand-50 text-brand-700"
            >
              全部活动
            </button>
            <button
              onClick={() => onNavigate("events")}
              className="h-10 px-4 rounded-full bg-brand-grad text-white text-[14px] font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              创建活动
            </button>
          </>
        }
      />
      <section className="grid xl:grid-cols-[1.45fr_0.85fr] gap-5">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-[18px] font-semibold">近期活动</h3>
              <p className="mt-1 text-[14px] text-slate-600">
                <span className="inline-block whitespace-nowrap">
                  每场活动进入独立数字档案
                </span>{" "}
                <span className="inline-block whitespace-nowrap">
                  统一管理资料 票务与现场服务
                </span>
              </p>
            </div>
            <button
              onClick={() => onNavigate("events")}
              className="shrink-0 whitespace-nowrap text-[14px] font-semibold text-brand-600"
            >
              查看列表
            </button>
          </div>
          <div className="divide-y divide-slate-200">
            {events.slice(0, 3).map(event => (
              <button
                key={event.id}
                onClick={() => onOpenEvent(event)}
                className="w-full text-left p-5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-600 ring-1 ring-brand-100 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-5 h-5" strokeWidth={1.9} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2 items-center">
                      <div className="text-[16px] leading-6 font-semibold">
                        {event.name}
                      </div>
                      <Status status={event.status} />
                    </div>
                    <div className="mt-1 text-[14px] leading-5 text-slate-600">
                      {event.subtitle}
                    </div>
                    <div className="mt-3 grid sm:grid-cols-3 gap-y-1 gap-x-4 text-[13px] text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Clock3 className="w-3.5 h-3.5" />
                        <EventDate date={event.date} />
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {event.venue}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ClipboardList className="w-3.5 h-3.5" />
                        待办 {event.pending} 项
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 self-center" />
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <TaskPanel onNavigate={onNavigate} />
          <AlertPanel onNavigate={onNavigate} />
        </div>
      </section>
      <section className="metric-grid grid grid-cols-1 min-[560px]:grid-cols-2 xl:grid-cols-4 gap-4">
        <TodayStat
          label="今日售票"
          value="286"
          sub="普通票 241 · Coser 45"
          icon={<Ticket className="w-5 h-5" />}
        />
        <TodayStat
          label="待处理事项"
          value="08"
          sub="资料补充 3 · 内容初核 5"
          icon={<ListChecks className="w-5 h-5" />}
          tone="amber"
        />
        <TodayStat
          label="异常提醒"
          value="02"
          sub="高关注道具 · 实名复核"
          icon={<CircleAlert className="w-5 h-5" />}
          tone="rose"
        />
        <TodayStat
          label="快捷入口"
          value="现场核验"
          sub="进入现场核验"
          icon={<ScanLine className="w-5 h-5" />}
          tone="blue"
          link={() => onNavigate("onsite")}
        />
      </section>
      <section className="grid lg:grid-cols-3 gap-4">
        <QuickAction
          icon={<Upload className="w-5 h-5" />}
          title="补充活动资料"
          text="主办方材料、规则与现场保障文件"
          action="进入资料管理"
          onClick={() => onNavigate("activity", "materials")}
        />
        <QuickAction
          icon={<QrCode className="w-5 h-5" />}
          title="进入现场核验"
          text="检票、实名、角色服装和异常处置"
          action="进入现场管理"
          onClick={() => onNavigate("onsite")}
        />
        <QuickAction
          icon={<FileArchive className="w-5 h-5" />}
          title="形成活动档案"
          text="活动结束后汇集数据、问题记录与操作日志"
          action="查看归档清单"
          onClick={() => onNavigate("archive")}
        />
      </section>
    </div>
  );
}
function TaskPanel({
  onNavigate,
}: {
  onNavigate: (page: Page, tab?: ActivityTab) => void;
}) {
  const tasks = [
    ["补充夜间值守联系人", "丝路数字国风文创新潮博览会", "资料管理"],
    ["完成 2 条角色道具初核", "魔都动漫嘉年华", "角色服装道具"],
    ["确认现场售票点库存", "魔都动漫嘉年华", "票务管理"],
  ];
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[18px] font-semibold">我的待办</h3>
        <Pill tone="amber">8 项</Pill>
      </div>
      <div className="mt-4 space-y-3">
        {tasks.map(([title, sub, target]) => (
          <button
            key={title}
            onClick={() =>
              onNavigate(
                target === "资料管理"
                  ? "activity"
                  : target === "角色服装道具"
                    ? "costumes"
                    : "tickets",
                target === "资料管理" ? "materials" : undefined
              )
            }
            className="w-full text-left rounded-lg border border-slate-200 p-3 hover:border-brand-300 hover:bg-brand-50"
          >
            <div className="text-[14px] font-semibold">{title}</div>
            <div className="mt-1 text-[13px] text-slate-600">{sub}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
function AlertPanel({
  onNavigate,
}: {
  onNavigate: (page: Page, tab?: ActivityTab) => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-rose-600" />
        <h3 className="text-[18px] font-semibold">异常提醒</h3>
      </div>
      <button
        onClick={() => onNavigate("costumes")}
        className="mt-4 w-full text-left p-3 rounded-lg bg-rose-50 border border-rose-100"
      >
        <div className="text-[14px] font-semibold text-rose-800">
          仿真重弩模型待现场复验
        </div>
        <div className="mt-1 text-[13px] leading-5 text-rose-700">
          机甲重装佣兵 · 需核对道具尺寸与材质
        </div>
      </button>
      <button
        onClick={() => onNavigate("activity", "materials")}
        className="mt-3 w-full text-left p-3 rounded-lg bg-amber-50 border border-amber-100"
      >
        <div className="text-[14px] font-semibold text-amber-800">
          现场服务联系人缺失
        </div>
        <div className="mt-1 text-[13px] text-amber-700">
          请主办方补充夜间值守人员
        </div>
      </button>
    </div>
  );
}
function TodayStat({
  label,
  value,
  sub,
  icon,
  tone = "blue",
  link,
}: {
  label: string;
  value: string;
  sub: string;
  icon: ReactNode;
  tone?: "blue" | "amber" | "rose";
  link?: () => void;
}) {
  const colors = {
    blue: "bg-brand-500 text-white",
    amber: "bg-sun-400 text-brand-900",
    rose: "bg-candy-400 text-candy-700",
  }[tone];
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${colors}`}
        >
          {icon}
        </div>
        {link && <ArrowRight className="w-4 h-4 text-brand-600" />}
      </div>
      <div className="mt-4 text-[14px] leading-5 text-slate-600 [word-break:keep-all]">
        {label}
      </div>
      <div className="metric-value mt-1 text-[28px] leading-8 font-semibold tracking-[-0.05em]">
        {value}
      </div>
      <div className="metric-sub mt-2 text-[14px] leading-6 font-medium text-slate-600">
        {sub}
      </div>
    </>
  );
  const classes = `metric-card bg-white border border-[#e7e6f4] rounded-xl p-5 text-left ${link ? "hover:border-brand-300 hover:bg-brand-50/40" : ""}`;
  return link ? (
    <button onClick={link} className={classes}>
      {inner}
    </button>
  ) : (
    <div className={classes}>{inner}</div>
  );
}
function QuickAction({
  icon,
  title,
  text,
  action,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="bg-white border border-[#e7e6f4] rounded-xl p-5">
      <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-600 ring-1 ring-brand-100 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="mt-4 text-[17px] font-semibold">{title}</h3>
      <p className="mt-2 text-[14px] leading-6 text-slate-600">{text}</p>
      <button
        onClick={onClick}
        className="mt-4 h-9 px-4 rounded-full bg-brand-50 text-[14px] font-semibold text-brand-700 hover:bg-brand-100 inline-flex items-center gap-1.5"
      >
        {action}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function EventsPage({
  events,
  onOpen,
}: {
  events: EventItem[];
  onOpen: (event: EventItem) => void;
}) {
  const [query, setQuery] = useState("");
  const results = events.filter(event =>
    [event.name, event.subtitle, event.organizer]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase())
  );
  return (
    <div className="space-y-6">
      <ModuleTitle
        eyebrow="活动管理"
        title="活动数字档案库"
        description="每场活动对应一套独立数字档案，贯穿创建、准备、核验、售票、现场、结束与归档。"
        actions={
          <ActionButton
            label="创建活动"
            className="h-10 px-4 rounded-full bg-brand-grad text-white text-[14px] font-semibold flex items-center gap-1.5"
            icon={<Plus className="w-4 h-4" />}
            description="将创建活动基础档案，并进入资料准备阶段。"
          />
        }
      />
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative w-full sm:w-[360px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="搜索活动名称、主办方或场地"
              className="w-full h-11 pl-9 pr-3 border border-slate-300 rounded-lg text-[14px] outline-none focus:border-brand-500"
            />
          </div>
          <div className="flex gap-2">
            <ActionButton
              label="状态筛选"
              className="h-10 px-3 rounded-lg border border-slate-300 text-[14px] font-medium"
              description="可按活动创建、资料准备、信息核验、售票、进行中、结束和归档状态筛选。"
            />
            <ActionButton
              label="时间范围"
              className="h-10 px-3 rounded-lg border border-slate-300 text-[14px] font-medium"
              description="可按活动时间、创建时间和更新时间筛选。"
            />
          </div>
        </div>
        {results.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[13px] text-slate-600">
                  <th className="p-4 font-semibold">活动名称</th>
                  <th className="p-4 font-semibold">时间与场地</th>
                  <th className="p-4 font-semibold">主办方</th>
                  <th className="p-4 font-semibold">当前阶段</th>
                  <th className="p-4 font-semibold">待办事项</th>
                  <th className="p-4 font-semibold text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {results.map(event => (
                  <tr key={event.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="text-[15px] font-semibold">
                        {event.name}
                      </div>
                      <div className="mt-1 text-[14px] text-slate-600">
                        {event.subtitle}
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        <Pill tone="blue">电子档案</Pill>
                        <Pill tone="slate">{event.id}</Pill>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-[14px] font-medium">
                        <EventDate date={event.date} />
                      </div>
                      <div className="mt-2 text-[14px] text-slate-600">
                        {event.venue}
                      </div>
                    </td>
                    <td className="p-4 text-[14px] font-medium">
                      {event.organizer}
                    </td>
                    <td className="p-4">
                      <Status status={event.status} />
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[14px] font-semibold ${event.pending ? "text-amber-700" : "text-emerald-700"}`}
                      >
                        {event.pending
                          ? `${event.pending} 项待处理`
                          : "已无待办"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => onOpen(event)}
                        className="h-9 px-3.5 rounded-lg text-[14px] font-semibold text-brand-600 hover:bg-brand-50"
                      >
                        进入档案
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Search className="w-5 h-5" />}
            title="未找到匹配活动"
            text="可调整搜索关键词，或创建一场新的活动并开始建立数字档案。"
            action="创建活动"
          />
        )}
      </div>
    </div>
  );
}

function ActivityRecord({
  event,
  tab,
  setTab,
  onNavigate,
  role,
  canEdit,
}: {
  event: EventItem;
  tab: ActivityTab;
  setTab: (tab: ActivityTab) => void;
  onNavigate: (page: Page, tab?: ActivityTab) => void;
  role: Role;
  canEdit: boolean;
}) {
  const [tabCheckins, setTabCheckins] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const tabs: { id: ActivityTab; label: string; icon: typeof FileText }[] = [
    { id: "overview", label: "活动概况", icon: Grid2X2 },
    { id: "materials", label: "活动资料", icon: FileText },
    { id: "participants", label: "参与人员", icon: Users },
    { id: "tickets", label: "票务管理", icon: Ticket },
    { id: "costumes", label: "角色服装道具", icon: Shirt },
    { id: "onsite", label: "现场核验", icon: ScanLine },
    { id: "data", label: "活动数据", icon: Activity },
    { id: "issues", label: "问题记录", icon: CircleAlert },
    { id: "archive", label: "活动档案", icon: FileArchive },
  ];
  const currentStep = STATUS_META[event.status].step;
  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl">
        <div className="p-5 lg:p-6 border-b border-slate-200">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onNavigate("events")}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <Status status={event.status} />
                <span className="text-[13px] text-slate-500">
                  活动编号 {event.id}
                </span>
              </div>
              <h1 className="mt-4 text-[26px] leading-8 font-semibold tracking-[-0.04em]">
                {event.name}
              </h1>
              <p className="mt-1 text-[17px] text-slate-600">
                {event.subtitle}
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Clock3 className="w-4 h-4" />
                  <EventDate date={event.date} />
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {event.venue}
                </span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {event.organizer}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSummaryOpen(true)}
                className="h-10 px-4 rounded-full border border-brand-200 text-[14px] font-semibold flex items-center gap-1.5 hover:bg-brand-50 text-brand-700"
              >
                <FileText className="w-4 h-4" />
                导出活动摘要
              </button>
              <button
                onClick={() => onNavigate("onsite")}
                className="h-10 px-4 rounded-full bg-brand-grad text-white text-[14px] font-semibold"
              >
                进入现场管理
              </button>
            </div>
          </div>
        </div>
        <ProgressFlow current={currentStep} />
      </section>
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <div className="min-w-[900px] flex p-2 gap-1">
          {tabs.map(item => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`h-10 px-3 rounded-full flex items-center gap-1.5 whitespace-nowrap text-[14px] ${active ? "bg-brand-grad text-white font-semibold" : "text-slate-600 hover:bg-slate-100"}`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      {tab === "overview" && <ActivityOverview event={event} onTab={setTab} />}
      {tab === "materials" && <ActivityMaterials canEdit={canEdit} />}
      {tab === "participants" && <Participants />}
      {tab === "tickets" && <TicketPage compact role={role} />}
      {tab === "costumes" && <CostumePage compact />}
      {tab === "onsite" && (
        <OnsitePage
          checkins={tabCheckins}
          setCheckins={setTabCheckins}
          issueOpen={false}
          setIssueOpen={() => {}}
          compact
        />
      )}
      {tab === "data" && <EventData />}
      {tab === "issues" && <Issues />}
      {tab === "archive" && <ArchivePage compact />}
      {summaryOpen && (
        <ActivitySummaryReport
          event={event}
          onClose={() => setSummaryOpen(false)}
        />
      )}
    </div>
  );
}
function ActivitySummaryReport({
  event,
  onClose,
}: {
  event: EventItem;
  onClose: () => void;
}) {
  const [downloaded, setDownloaded] = useState(false);
  const download = () => {
    const content = `活动摘要
${event.name} ${event.subtitle}
活动编号 ${event.id}
活动阶段 售票中
已售票 4,662 张
实名完成 4,484 人
角色服装道具 326 份申报 2 项协同核验
异常核验 2 项
待处理事项 角色道具初核 现场售票点库存 夜间值守联系人`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.id}_活动摘要.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
      />
      <section className="relative w-full max-w-[900px] max-h-[88vh] overflow-y-auto bg-[#fbfcfe] rounded-xl shadow-2xl">
        <div className="sticky top-0 z-10 p-5 bg-white/95 backdrop-blur border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[13px] text-slate-500">活动数字档案</div>
            <h2 className="mt-1 text-[21px] font-semibold">活动摘要预览</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 sm:p-7 space-y-5">
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Status status={event.status} />
              <span className="text-[13px] text-slate-500">{event.id}</span>
            </div>
            <h3 className="mt-4 text-[24px] font-semibold">{event.name}</h3>
            <p className="mt-1 text-[16px] text-slate-600">{event.subtitle}</p>
            <div className="mt-4 grid sm:grid-cols-3 gap-3 text-[14px] text-slate-700">
              <span className="flex items-center gap-1.5">
                <Clock3 className="w-4 h-4 text-slate-500" />
                <EventDate date={event.date} />
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-500" />
                {event.venue}
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-500" />
                {event.organizer}
              </span>
            </div>
          </section>
          <section className="metric-grid grid grid-cols-1 min-[560px]:grid-cols-2 lg:grid-cols-4 gap-3">
            <ReportMetric label="已售票" value="4,662 张" />
            <ReportMetric label="实名完成" value="4,484 人" />
            <ReportMetric label="现场入场" value="3,218 人" />
            <ReportMetric label="异常核验" value="2 项" tone="rose" />
          </section>
          <section className="grid lg:grid-cols-2 gap-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-[17px] font-semibold">活动生命周期</h3>
              <div className="mt-4 space-y-3">
                <ReportLine
                  label="已完成"
                  text="活动创建 资料准备 信息核验"
                  tone="green"
                />
                <ReportLine
                  label="当前阶段"
                  text="售票中 票种与电子票已开放"
                  tone="blue"
                />
                <ReportLine
                  label="待处理"
                  text="角色道具初核 现场售票点库存 夜间值守联系人"
                  tone="amber"
                />
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-[17px] font-semibold">业务汇总</h3>
              <div className="mt-4 space-y-3 text-[14px] leading-6">
                <ReportList
                  label="票务"
                  text="普通观众票 3,548 张 Coser 专属票 326 张 学生早鸟票 788 张"
                />
                <ReportList
                  label="角色服装道具"
                  text="326 份申报 已通过 318 份 协同核验 2 份"
                />
                <ReportList
                  label="资料与问题"
                  text="活动资料 5 项 已完成 2 项异常核验均已登记"
                />
              </div>
            </div>
          </section>
          {downloaded && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[14px] text-emerald-800">
              活动摘要文件已下载到本地下载目录
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="h-10 px-4 rounded-full border border-brand-200 text-[14px] font-semibold hover:bg-brand-50 text-brand-700"
            >
              关闭
            </button>
            <button
              onClick={download}
              className="h-10 px-4 rounded-full bg-brand-grad text-white text-[14px] font-semibold flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              下载活动摘要
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
function ReportMetric({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: string;
  tone?: "blue" | "rose";
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${tone === "rose" ? "border-rose-200 bg-rose-50" : "border-brand-100 bg-brand-50"}`}
    >
      <div className="text-[13px] text-slate-600">{label}</div>
      <div
        className={`mt-2 text-[22px] font-semibold ${tone === "rose" ? "text-rose-700" : "text-brand-600"}`}
      >
        {value}
      </div>
    </div>
  );
}
function ReportLine({
  label,
  text,
  tone,
}: {
  label: string;
  text: string;
  tone: "green" | "blue" | "amber";
}) {
  const styles = {
    green: "bg-emerald-50 text-emerald-800",
    blue: "bg-brand-50 text-brand-800",
    amber: "bg-amber-50 text-amber-800",
  }[tone];
  return (
    <div className={`rounded-lg p-3 ${styles}`}>
      <div className="text-[13px] font-semibold">{label}</div>
      <div className="mt-1 text-[14px] leading-6">{text}</div>
    </div>
  );
}
function ReportList({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-[13px] font-semibold text-slate-500">{label}</div>
      <div className="mt-1">{text}</div>
    </div>
  );
}
function ProgressFlow({ current }: { current: number }) {
  return (
    <div className="p-5 lg:px-6 overflow-x-auto">
      <div className="min-w-[780px] grid grid-cols-7">
        {PROGRESS.map((label, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <div key={label} className="relative text-center">
              <div
                className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold relative z-10 ${done ? "bg-emerald-600 text-white" : active ? "bg-brand-grad text-white ring-4 ring-brand-100" : "bg-slate-100 text-slate-500"}`}
              >
                {done ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              {index < PROGRESS.length - 1 && (
                <div
                  className={`absolute top-4 left-[calc(50%+16px)] w-[calc(100%-32px)] h-0.5 ${index < current ? "bg-emerald-500" : "bg-slate-200"}`}
                />
              )}
              <div
                className={`mt-2 text-[13px] leading-5 font-medium ${active ? "text-brand-600" : done ? "text-emerald-700" : "text-slate-500"}`}
              >
                {label}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {done ? "已完成" : active ? "当前阶段" : "待进行"}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 grid md:grid-cols-3 gap-3">
        <ProgressInfo
          title="当前阶段"
          text={`${PROGRESS[current]} · 活动资料已完成核验并开放售票`}
          tone="blue"
        />
        <ProgressInfo
          title="已完成事项"
          items={["活动创建", "主体材料", "场地信息", "参与规则", "票种配置"]}
          tone="green"
        />
        <ProgressInfo
          title="待处理事项"
          items={[
            "2 条角色道具初核",
            "现场售票点库存确认",
            "夜间值守联系人补充",
          ]}
          tone="amber"
        />
      </div>
    </div>
  );
}
function ProgressInfo({
  title,
  text,
  items,
  tone,
}: {
  title: string;
  text?: string;
  /** 每一项为不可拆分短语，只在“、”之后换行 */
  items?: string[];
  tone: "blue" | "green" | "amber";
}) {
  const styles = {
    blue: "border-brand-200 bg-brand-50 text-brand-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
  }[tone];
  return (
    <div className={`rounded-lg border p-3 ${styles}`}>
      <div className="text-[13px] font-semibold">{title}</div>
      <div className="mt-1 text-[13px] leading-5 whitespace-pre-line">
        {items
          ? items.map((item, index) => (
              <span key={item} className="whitespace-nowrap">
                {item}
                {index < items.length - 1 ? "、" : ""}
              </span>
            ))
          : text}
      </div>
    </div>
  );
}
function ActivityOverview({
  event,
  onTab,
}: {
  event: EventItem;
  onTab: (tab: ActivityTab) => void;
}) {
  return (
    <div className="grid xl:grid-cols-[1.35fr_0.85fr] gap-5">
      <div className="space-y-5">
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-col min-[640px]:flex-row gap-4">
            <img
              src={RECORD_VISUALS.poster}
              alt="2026 魔都动漫嘉年华活动海报"
              className="w-full min-[640px]:w-[104px] h-[140px] object-cover rounded-md border border-slate-200 bg-slate-100 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <ModuleTitle
                title="活动概况"
                description="活动基础信息、当前任务和跨环节服务状态汇总。"
                actions={
                  <button
                    onClick={() => onTab("materials")}
                    className="text-[14px] font-semibold text-brand-600 whitespace-nowrap"
                  >
                    查看活动资料
                  </button>
                }
              />
            </div>
          </div>
          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            <InfoBlock label="活动类型" value="动漫展览 / 青年文化活动" />
            <InfoBlock label="活动规模" value="预计 6,000 人次" />
            <InfoBlock label="票务状态" value="4 类票种已配置，2 类正在售卖" />
            <InfoBlock
              label="角色服装规则"
              value="326 份提报，2 份待协同核验"
            />
          </div>
        </section>
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-[18px] font-semibold">活动待办</h3>
              <p className="mt-1 text-[14px] text-slate-600">
                按处理时限排序，操作后自动写入活动记录。
              </p>
            </div>
            <button
              onClick={() => onTab("issues")}
              className="w-24 text-center text-[14px] font-semibold text-brand-600"
            >
              问题记录
            </button>
          </div>
          <div className="divide-y divide-slate-200">
            <TaskRow
              icon={<FileText className="w-4 h-4" />}
              title="补充现场服务与应急联络表"
              note="主办方运营组 · 截止时间 6月18日 18:00"
              action="补充资料"
              onClick={() => onTab("materials")}
            />
            <TaskRow
              icon={<Shirt className="w-4 h-4" />}
              title="复核高关注道具申报"
              note="机甲重装佣兵 · 需联合现场安保确认"
              action="查看申报"
              onClick={() => onTab("costumes")}
            />
            <TaskRow
              icon={<Ticket className="w-4 h-4" />}
              title="确认现场售票点库存与票价"
              note="现场当日票 · 预计 1,000 张"
              action="票务设置"
              onClick={() => onTab("tickets")}
            />
          </div>
        </section>
      </div>
      <div className="space-y-5">
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-[18px] font-semibold">当前活动数据</h3>
          <div className="mt-4 space-y-4">
            <MiniMetric
              label="已售票"
              value={`${event.tickets.toLocaleString()} 张`}
              sub="售票进度 56%"
            />
            <MiniMetric
              label="实名完成"
              value="4,484 人"
              sub="实名完成率 96.2%"
            />
            <MiniMetric
              label="角色服装提报"
              value="326 份"
              sub="已通过 318 · 待处理 8"
            />
            <MiniMetric
              label="异常核验"
              value="2 项"
              sub="均已建立处置记录"
              tone="rose"
            />
          </div>
        </section>
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-[18px] font-semibold">活动操作记录</h3>
          <div className="mt-4 space-y-4">
            <LogLine time="今天 10:36" text="主办方更新了活动入场规则" />
            <LogLine time="今天 10:35" text="审核组完成角色服装辅助初核" />
            <LogLine time="昨天 16:30" text="场馆协调组更新安检点位图" />
          </div>
        </section>
      </div>
    </div>
  );
}
function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-md bg-slate-50">
      <div className="text-[13px] text-slate-500 whitespace-nowrap">
        {label}
      </div>
      <div className="data-token mt-2 text-[15px] leading-6 font-semibold">
        {value}
      </div>
    </div>
  );
}
function TaskRow({
  icon,
  title,
  note,
  action,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  note: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="p-4 grid grid-cols-[36px_minmax(0,1fr)_96px] items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold">{title}</div>
        <div className="mt-1 text-[13px] text-slate-600">{note}</div>
      </div>
      <button
        onClick={onClick}
        className="h-9 w-24 rounded-lg text-center text-[13px] font-semibold text-brand-600 hover:bg-brand-50"
      >
        {action}
      </button>
    </div>
  );
}
function MiniMetric({
  label,
  value,
  sub,
  tone = "blue",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "blue" | "rose";
}) {
  return (
    <div className="border-b border-slate-200 pb-4 last:border-0 last:pb-0">
      <div className="text-[13px] text-slate-500">{label}</div>
      <div
        className={`mt-1 text-[22px] font-semibold tracking-[-0.04em] ${tone === "rose" ? "text-rose-700" : ""}`}
      >
        {value}
      </div>
      <div className="mt-1 text-[13px] text-slate-600">{sub}</div>
    </div>
  );
}
function LogLine({ time, text }: { time: string; text: string }) {
  return (
    <div className="relative pl-4">
      <span className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-brand-grad" />
      <div className="text-[14px] leading-5 font-medium">{text}</div>
      <div className="mt-1 text-[12px] text-slate-500">{time}</div>
    </div>
  );
}

function Participants() {
  const people = [
    {
      name: "普通观众",
      total: "4,536",
      status: "实名完成 4,384",
      action: "查看名单",
    },
    {
      name: "Coser 参与者",
      total: "326",
      status: "角色提报 326",
      action: "进入审核",
    },
    {
      name: "参展商与工作人员",
      total: "268",
      status: "资料核验 255",
      action: "查看资料",
    },
  ];
  return (
    <div className="space-y-5">
      <ModuleTitle
        title="参与人员"
        description="统一查看普通观众、Coser、参展商与工作人员的报名、实名与入场状态。"
        actions={
          <ActionButton
            label="导出脱敏名单"
            className="h-10 px-4 rounded-full border border-brand-200 text-[14px] font-semibold hover:bg-brand-50 text-brand-700"
            description="将按权限导出参与人员脱敏汇总，不包含原始敏感身份信息。"
          />
        }
      />
      <div className="grid md:grid-cols-3 gap-4">
        {people.map(item => (
          <div
            key={item.name}
            className="bg-white border border-slate-200 rounded-xl p-5"
          >
            <Users className="w-5 h-5 text-brand-600" />
            <div className="mt-4 text-[16px] font-semibold">{item.name}</div>
            <div className="mt-2 text-[28px] leading-8 font-semibold">
              {item.total}
            </div>
            <div className="mt-2 text-[13px] text-slate-600">{item.status}</div>
            <ActionButton
              label={`${item.action} →`}
              className="mt-5 text-[14px] font-semibold text-brand-600 text-left"
              title={item.action}
              description={`可按权限查阅${item.name}的实名、报名或资料核验明细。`}
            />
          </div>
        ))}
      </div>
      <EmptyState
        icon={<UserPlus className="w-5 h-5" />}
        title="需要新增参与人员吗？"
        text="可由主办方在活动内维护工作人员和参展主体信息，系统自动写入活动档案。"
        action="新增工作人员"
      />
    </div>
  );
}

type RefundStatus = "pending_review" | "refunded" | "rejected";
type RefundRecord = {
  id: string;
  requestNo: string;
  orderNo: string;
  buyerName: string;
  buyerPhone: string;
  ticketName: string;
  ticketCode: string;
  amount: number;
  reason: string;
  detail: string;
  requestedAt: string;
  status: RefundStatus;
  processedBy?: string;
  processedAt?: string;
  comment?: string;
  logs: { action: string; actor: string; time: string; comment?: string }[];
};

const REFUND_STORAGE_KEY = "quji_preview_refund_requests_v2";
const DEFAULT_REFUNDS: RefundRecord[] = [
  {
    id: "refund-20260929-001",
    requestNo: "TK202609290001",
    orderNo: "ORD1789301120316",
    buyerName: "马晓彤",
    buyerPhone: "138****9036",
    ticketName: "普通观众票",
    ticketCode: "QT-20260628-10316",
    amount: 88,
    reason: "重复购票",
    detail:
      "家人已经帮我购买同场次门票，本人购买的这张电子票尚未使用，申请原路退款。",
    requestedAt: "2026-09-29 16:42",
    status: "pending_review",
    logs: [
      {
        action: "用户提交退款申请",
        actor: "马晓彤 · 漫圈 App 用户",
        time: "2026-09-29 16:42",
        comment: "重复购票",
      },
    ],
  },
  {
    id: "refund-20260928-002",
    requestNo: "TK202609280002",
    orderNo: "ORD1789301120762",
    buyerName: "艾力江·买买提",
    buyerPhone: "186****5218",
    ticketName: "Coser 专属票",
    ticketCode: "QT-20260629-20762",
    amount: 68,
    reason: "活动时间冲突",
    detail: "临时有课程安排，无法按时参加活动。",
    requestedAt: "2026-09-28 13:20",
    status: "refunded",
    processedBy: "周可",
    processedAt: "2026-09-28 13:38",
    comment: "符合活动退票规则，同意原路退回",
    logs: [
      {
        action: "用户提交退款申请",
        actor: "艾力江·买买提 · 漫圈 App 用户",
        time: "2026-09-28 13:20",
      },
      {
        action: "平台同意退款",
        actor: "周可 · 平台运营人员",
        time: "2026-09-28 13:38",
        comment: "符合活动退票规则，同意原路退回",
      },
      {
        action: "退款已提交原支付渠道",
        actor: "系统 · 票务系统",
        time: "2026-09-28 13:38",
        comment: "预计 1—3 个工作日到账",
      },
    ],
  },
  {
    id: "refund-20260927-003",
    requestNo: "TK202609270003",
    orderNo: "ORD1789301098175",
    buyerName: "赵宁",
    buyerPhone: "177****1182",
    ticketName: "学生早鸟票",
    ticketCode: "QT-20260628-98175",
    amount: 58,
    reason: "个人原因",
    detail: "临时无法到场。",
    requestedAt: "2026-09-27 19:05",
    status: "rejected",
    processedBy: "周可",
    processedAt: "2026-09-27 19:18",
    comment: "电子票已核验入场，当前订单不符合退款条件",
    logs: [
      {
        action: "用户提交退款申请",
        actor: "赵宁 · 漫圈 App 用户",
        time: "2026-09-27 19:05",
      },
      {
        action: "平台驳回退款申请",
        actor: "周可 · 平台运营人员",
        time: "2026-09-27 19:18",
        comment: "电子票已核验入场，当前订单不符合退款条件",
      },
    ],
  },
];

function loadRefundRecords() {
  if (typeof window === "undefined") return DEFAULT_REFUNDS;
  try {
    const saved = window.localStorage.getItem(REFUND_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as RefundRecord[]) : DEFAULT_REFUNDS;
  } catch {
    return DEFAULT_REFUNDS;
  }
}

function TicketPage({
  compact = false,
  role,
  mode,
  setMode,
}: {
  compact?: boolean;
  role: Role;
  mode?: TicketMode;
  setMode?: (mode: TicketMode) => void;
}) {
  const [localMode, setLocalMode] = useState<TicketMode>("all");
  const selected = mode || localMode;
  const set = setMode || setLocalMode;
  const [session, setSession] = useState(loadTicketSession);
  const changeSession = (value: string) => {
    setSession(value);
    saveTicketSession(value);
  };
  const [refunds, setRefunds] = useState<RefundRecord[]>(loadRefundRecords);
  const pending = refunds.filter(item => item.status === "pending_review");
  const completed = refunds.filter(item => item.status === "refunded");
  const updateRefund = (next: RefundRecord[]) => {
    setRefunds(next);
    window.localStorage.setItem(REFUND_STORAGE_KEY, JSON.stringify(next));
  };
  const refundSteps: {
    icon: typeof Smartphone;
    title: string;
    text: string;
    tone: string;
  }[] = [
    {
      icon: Smartphone,
      title: "用户在 App 申请",
      text: "选择订单并填写退款原因",
      tone: "text-emerald-700 bg-emerald-50",
    },
    {
      icon: ListChecks,
      title: "平台运营处理",
      text: "核对订单规则并作出决定",
      tone: "text-brand-600 bg-brand-50",
    },
    {
      icon: WalletCards,
      title: "原支付渠道退款",
      text: "结果同步用户端与操作记录",
      tone: "text-slate-600 bg-slate-100",
    },
  ];
  return (
    <div className="space-y-5">
      {!compact && (
        <ModuleTitle
          eyebrow="票务管理"
          title="订单、退款与电子票"
          description="用户在漫圈 App 提交退款申请后自动进入这里，平台运营人员核对订单与退款原因后完成同意或驳回。"
          actions={
            <button
              onClick={() => set("refunds")}
              className="h-10 px-4 rounded-full bg-brand-grad text-white text-[14px] font-semibold flex items-center gap-1.5"
            >
              <RefreshCcw className="w-4 h-4" />
              {role === "platform" ? "处理退款申请" : "查看退款申请"}
              {pending.length > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full bg-white/20 text-[12px] flex items-center justify-center">
                  {pending.length}
                </span>
              )}
            </button>
          }
        />
      )}
      <section className="bg-white border border-slate-200 rounded-xl px-4 py-4 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-3 items-center">
        {refundSteps.map(({ icon: Icon, title, text, tone }, index) => (
          <div key={title} className="contents">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tone}`}
              >
                <Icon className="w-4.5 h-4.5" />
              </span>
              <div className="min-w-0">
                <strong className="block text-[14px] text-slate-900">
                  {title}
                </strong>
                <small className="block mt-1 text-[12px] leading-5 text-slate-500">
                  {text}
                </small>
              </div>
            </div>
            {index < 2 && (
              <ArrowRight className="hidden md:block w-4 h-4 text-slate-300" />
            )}
          </div>
        ))}
      </section>
      <section className="metric-grid grid grid-cols-1 min-[560px]:grid-cols-2 xl:grid-cols-4 gap-4">
        <TodayStat
          label="待平台处理"
          value={String(pending.length)}
          sub={`待退金额 ¥${pending.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}`}
          icon={<Clock3 className="w-5 h-5" />}
          tone="amber"
        />
        <TodayStat
          label="已完成退款"
          value={String(completed.length)}
          sub={`累计 ¥${completed.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}`}
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <TodayStat
          label="当前活动已售票"
          value="4,662"
          sub="电子票均已生成"
          icon={<TicketCheck className="w-5 h-5" />}
          tone="blue"
        />
        <TodayStat
          label="实名完成"
          value="4,484"
          sub="实名完成率 96.2%"
          icon={<ShieldCheck className="w-5 h-5" />}
        />
      </section>
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 justify-between">
          <div
            className="grid grid-cols-2 gap-1 bg-white border border-[#e4e3f0] p-1 rounded-2xl sm:rounded-full sm:flex sm:w-fit"
            data-cy="ticket-tabs"
          >
            {(
              [
                ["all", "票种配置"],
                ["orders", "订单管理"],
                [
                  "refunds",
                  `退款申请${pending.length ? ` ${pending.length}` : ""}`,
                ],
                ["limits", "限购校验"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => set(id)}
                data-cy={`ticket-tab-${id}`}
                className={`h-8 px-3 rounded-full text-[13px] font-semibold whitespace-nowrap ${selected === id ? "bg-brand-grad text-white shadow-[0_4px_10px_-5px_rgba(100,97,201,0.7)]" : "text-slate-600"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <ActionButton
            label="导出数据"
            className="h-10 px-3 rounded-full border border-brand-200 text-[14px] font-semibold flex items-center gap-1.5 hover:bg-brand-50 text-brand-700"
            icon={<Download className="w-4 h-4" />}
            description="导出当前票务视图中的票种、订单或退款数据。"
          />
        </div>
        {(selected === "all" || selected === "orders") && (
          <SessionFilter value={session} onChange={changeSession} />
        )}
        {selected === "all" ? (
          <TicketTypes
            refunds={refunds}
            session={session}
            onRefunds={() => set("refunds")}
          />
        ) : selected === "orders" ? (
          <OrderTable session={session} />
        ) : selected === "refunds" ? (
          <RefundTable role={role} requests={refunds} onUpdate={updateRefund} />
        ) : (
          <PurchaseLimitPanel refunds={refunds} />
        )}
      </section>
    </div>
  );
}
function TicketTypes({
  refunds,
  session,
  onRefunds,
}: {
  refunds: RefundRecord[];
  session: string;
  onRefunds: () => void;
}) {
  const rows = buildSessionStock(EVENT_SESSIONS, refunds, session);
  const total = totalTicketStock(rows);
  const scope =
    session === ALL_SESSIONS
      ? `全部 ${EVENT_SESSIONS.length} 个场次合计`
      : `${formatSessionDate(session)} 场次`;
  const statusTone = (status: string) =>
    status === "售票中" ? "green" : status === "待开售" ? "blue" : "slate";
  const rule = (ticket: SessionTicket) =>
    `每个身份证限购 ${ticket.purchaseLimit} 张 · ${ticket.realName ? "需要实名" : "无需实名"}`;
  const Pending = ({ count }: { count: number }) =>
    count ? (
      <button
        onClick={onRefunds}
        className="mt-1 block text-[12px] font-semibold whitespace-nowrap text-amber-700 hover:underline"
      >
        待处理 {count}
      </button>
    ) : null;
  return (
    <div data-cy="ticket-stock-table" data-session={session}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 text-[13px] leading-5 text-slate-500">
        <span>
          <strong
            className="block text-[14px] font-semibold text-slate-900 sm:mr-2 sm:inline"
            data-cy="ticket-stock-scope"
          >
            {scope}
          </strong>
          <span className="block sm:inline">按票种统计已售 已退款和剩余</span>
          <span className="block sm:ml-2 sm:inline">
            退款完成后票回到剩余库存
          </span>
        </span>
        <span className="whitespace-nowrap">剩余 = 库存 - 已售 + 已退款</span>
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] text-left">
          <thead>
            <tr className="bg-slate-50 text-[13px] text-slate-600">
              <th className="p-4 font-semibold">票种</th>
              <th className="p-4 text-right font-semibold">库存</th>
              <th className="p-4 text-right font-semibold">已售</th>
              <th className="p-4 text-right font-semibold">已退款</th>
              <th className="p-4 text-right font-semibold">剩余</th>
              <th className="p-4 font-semibold">销售进度</th>
              <th className="p-4 font-semibold">状态</th>
              <th className="p-4 text-right font-semibold">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map(row => (
              <tr key={row.ticket.name} data-cy="ticket-stock-row">
                <td className="p-4">
                  <div className="text-[15px] font-semibold text-slate-900">
                    {row.ticket.name}
                  </div>
                  <div className="mt-1 text-[13px] whitespace-nowrap text-slate-500">
                    ¥{row.ticket.price} · {rule(row.ticket)}
                  </div>
                </td>
                <td className="data-token p-4 text-right text-[15px] text-slate-700">
                  {formatCount(row.ticket.inventory)}
                </td>
                <td
                  className="data-token p-4 text-right text-[15px] font-semibold text-slate-900"
                  data-cy="stock-sold"
                >
                  {formatCount(row.sold)}
                </td>
                <td className="p-4 text-right" data-cy="stock-refunded">
                  <span
                    className={`data-token text-[15px] font-semibold ${row.refunded ? "text-rose-700" : "text-slate-400"}`}
                  >
                    {formatCount(row.refunded)}
                  </span>
                  <Pending count={row.pending} />
                </td>
                <td
                  className="data-token p-4 text-right text-[15px] font-semibold text-brand-700"
                  data-cy="stock-remaining"
                >
                  {formatCount(row.remaining)}
                </td>
                <td className="p-4">
                  <div className="text-[13px] whitespace-nowrap text-slate-600">
                    净售出 {row.soldPercent}%
                  </div>
                  <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-brand-grad"
                      style={{ width: `${row.soldPercent}%` }}
                    />
                  </div>
                </td>
                <td className="p-4">
                  <Pill tone={statusTone(row.ticket.status)}>
                    {row.ticket.status}
                  </Pill>
                  <div className="mt-1.5 text-[12px] leading-5 whitespace-nowrap text-slate-500">
                    {row.ticket.sales}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <ActionButton
                    label="管理"
                    className="text-[14px] font-semibold text-brand-600"
                    description="可调整库存、开售停售时间、身份证限购和实名规则。"
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr
              className="border-t border-slate-200 bg-slate-50 text-[14px] font-semibold text-slate-900"
              data-cy="ticket-stock-total"
            >
              <td className="p-4">合计 {rows.length} 个票种</td>
              <td className="data-token p-4 text-right">
                {formatCount(total.inventory)}
              </td>
              <td className="data-token p-4 text-right">
                {formatCount(total.sold)}
              </td>
              <td className="p-4 text-right">
                <span className="data-token text-rose-700">
                  {formatCount(total.refunded)}
                </span>
                <span className="block text-[12px] font-normal whitespace-nowrap text-slate-500">
                  退款 ¥{total.refundedAmount.toFixed(2)}
                </span>
              </td>
              <td className="data-token p-4 text-right text-brand-700">
                {formatCount(total.remaining)}
              </td>
              <td className="p-4" colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="divide-y divide-slate-200 md:hidden">
        {rows.map(row => (
          <article
            key={row.ticket.name}
            className="p-4"
            data-cy="ticket-stock-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-slate-900">
                  {row.ticket.name}
                </div>
                <div className="mt-1 text-[13px] leading-5 text-slate-500">
                  <span className="block">¥{row.ticket.price}</span>
                  <span className="block">{rule(row.ticket)}</span>
                </div>
              </div>
              <Pill tone={statusTone(row.ticket.status)}>
                {row.ticket.status}
              </Pill>
            </div>
            <dl className="mt-3 grid grid-cols-3 overflow-hidden rounded-md border border-slate-200 text-center">
              {(
                [
                  ["已售", row.sold, "text-slate-900"],
                  [
                    "已退款",
                    row.refunded,
                    row.refunded ? "text-rose-700" : "text-slate-400",
                  ],
                  ["剩余", row.remaining, "text-brand-700"],
                ] as const
              ).map(([label, value, tone], index) => (
                <div
                  key={label}
                  className={`px-2 py-2.5 ${index ? "border-l border-slate-200" : ""}`}
                >
                  <dt className="text-[12px] text-slate-500">{label}</dt>
                  <dd
                    className={`data-token mt-0.5 text-[17px] font-semibold ${tone}`}
                  >
                    {formatCount(value)}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-2.5 flex items-center justify-between gap-3 text-[13px] text-slate-500">
              <span className="whitespace-nowrap">
                库存 {formatCount(row.ticket.inventory)} · 净售出{" "}
                {row.soldPercent}%
              </span>
              <Pending count={row.pending} />
            </div>
          </article>
        ))}
        <div className="bg-slate-50 p-4 text-[14px]">
          <div className="font-semibold text-slate-900">
            合计 {rows.length} 个票种
          </div>
          <div className="mt-1 text-[13px] leading-5 text-slate-600">
            <span className="block">
              已售 {formatCount(total.sold)} · 已退款{" "}
              {formatCount(total.refunded)} · 剩余{" "}
              {formatCount(total.remaining)}
            </span>
            <span className="block">
              退款金额 ¥{total.refundedAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
const ORDERS: { date: string; row: string[] }[] = [
  {
    date: "2026-06-28",
    row: [
      "ORD1789301148305",
      "张三",
      "Coser 专属票",
      "¥68",
      "实名认证完成",
      "已支付",
      "电子票已生成",
    ],
  },
  {
    date: "2026-06-28",
    row: [
      "ORD1789301149112",
      "古丽米热·阿布都",
      "Coser 专属票",
      "¥68",
      "实名认证完成",
      "已支付",
      "电子票已生成",
    ],
  },
  {
    date: "2026-06-29",
    row: [
      "ORD1789301151870",
      "何晓晨",
      "普通观众票",
      "¥176",
      "实名认证完成",
      "已支付",
      "待入场",
    ],
  },
];
function OrderTable({ session }: { session: string }) {
  const orders = ORDERS.filter(
    order => session === ALL_SESSIONS || order.date === session
  ).map(order => [
    order.row[0],
    order.row[1],
    formatSessionDate(order.date),
    ...order.row.slice(2),
  ]);
  return (
    <SimpleTable
      headers={[
        "订单号",
        "购票人",
        "场次",
        "票种",
        "金额",
        "实名信息",
        "订单状态",
        "电子票",
      ]}
      rows={orders}
    />
  );
}
function RefundTable({
  role,
  requests,
  onUpdate,
}: {
  role: Role;
  requests: RefundRecord[];
  onUpdate: (requests: RefundRecord[]) => void;
}) {
  const [selected, setSelected] = useState<RefundRecord | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [comment, setComment] = useState("");
  const labels: Record<RefundStatus, string> = {
    pending_review: "待平台处理",
    refunded: "已同意并退款",
    rejected: "已驳回",
  };
  const tones: Record<RefundStatus, string> = {
    pending_review: "bg-amber-50 text-amber-700",
    refunded: "bg-emerald-50 text-emerald-700",
    rejected: "bg-rose-50 text-rose-700",
  };
  const decide = () => {
    if (!selected || !decision || role !== "platform") return;
    if (decision === "reject" && !comment.trim()) return;
    const time = new Date().toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const processingComment =
      comment.trim() || "符合活动退票规则，同意原路退回";
    const updated: RefundRecord = {
      ...selected,
      status: decision === "approve" ? "refunded" : "rejected",
      processedBy: "周可",
      processedAt: time,
      comment: processingComment,
      logs: [
        ...selected.logs,
        {
          action: decision === "approve" ? "平台同意退款" : "平台驳回退款申请",
          actor: "周可 · 平台运营人员",
          time,
          comment: processingComment,
        },
        ...(decision === "approve"
          ? [
              {
                action: "退款已提交原支付渠道",
                actor: "系统 · 票务系统",
                time,
                comment: "预计 1—3 个工作日到账",
              },
            ]
          : []),
      ],
    };
    onUpdate(requests.map(item => (item.id === updated.id ? updated : item)));
    setSelected(updated);
    setDecision(null);
    setComment("");
  };

  return (
    <>
      <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[13px]">
        <span className="flex items-center gap-2 font-semibold text-slate-900">
          <Smartphone className="w-4 h-4" />
          来自漫圈 App 的退款申请
        </span>
        <span className="text-slate-500">
          按申请时间排序 待处理记录优先展示
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1040px] w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-[13px] text-slate-600">
              {[
                "申请编号 / 时间",
                "购票人 / 订单",
                "票种 / 金额",
                "退款原因",
                "处理状态",
                "操作",
              ].map(header => (
                <th key={header} className="p-4 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {requests.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 align-top">
                <td className="p-4">
                  <strong className="block text-[14px]">
                    {item.requestNo}
                  </strong>
                  <small className="block mt-1 text-[12px] text-slate-500">
                    {item.requestedAt}
                  </small>
                </td>
                <td className="p-4">
                  <strong className="block text-[14px]">
                    {item.buyerName}
                  </strong>
                  <small className="block mt-1 text-[12px] text-slate-500">
                    {item.orderNo}
                  </small>
                </td>
                <td className="p-4 text-[14px]">
                  {item.ticketName}
                  <small className="block mt-1 text-[12px] whitespace-nowrap text-slate-500">
                    {formatSessionDate(refundSessionDate(item))} 场次
                  </small>
                  <small className="block text-[12px] text-slate-500">
                    ¥{item.amount.toFixed(2)} · 1 张
                  </small>
                </td>
                <td className="p-4 max-w-[260px]">
                  <strong className="block text-[14px]">{item.reason}</strong>
                  <small className="block mt-1 text-[12px] leading-5 text-slate-500">
                    {item.detail}
                  </small>
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex rounded-md px-2 py-1 text-[12px] font-semibold ${tones[item.status]}`}
                  >
                    {labels[item.status]}
                  </span>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => setSelected(item)}
                    className="text-[14px] font-semibold text-brand-600"
                  >
                    查看处理
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/35 flex justify-end"
          onClick={() => setSelected(null)}
        >
          <aside
            className="w-full max-w-[620px] h-full overflow-y-auto bg-white shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-4 flex items-start justify-between">
              <div>
                <div className="text-[13px] text-slate-500">退款申请详情</div>
                <h3 className="mt-1 text-[18px] font-semibold">
                  {selected.requestNo}
                </h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                aria-label="关闭退款申请详情"
              >
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="p-5 space-y-4">
              <div
                className={`rounded-lg p-4 flex items-center gap-3 ${tones[selected.status]}`}
              >
                {selected.status === "refunded" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : selected.status === "rejected" ? (
                  <XCircle className="w-5 h-5" />
                ) : (
                  <Clock3 className="w-5 h-5" />
                )}
                <div>
                  <strong className="block text-[14px]">
                    {labels[selected.status]}
                  </strong>
                  <small className="block mt-1 text-[12px]">
                    {selected.processedBy
                      ? `处理人 ${selected.processedBy} · ${selected.processedAt}`
                      : "等待平台运营人员处理"}
                  </small>
                </div>
              </div>

              <RefundDetailSection
                title="用户退款申请"
                icon={<Smartphone className="w-4 h-4" />}
              >
                <RefundDetailGrid
                  items={[
                    ["来源", "漫圈 App"],
                    ["申请时间", selected.requestedAt],
                    ["购票人", selected.buyerName],
                    ["联系电话", selected.buyerPhone],
                    ["退款原因", `${selected.reason} · ${selected.detail}`],
                  ]}
                />
              </RefundDetailSection>

              <RefundDetailSection
                title="关联订单与退款金额"
                icon={<TicketCheck className="w-4 h-4" />}
              >
                <RefundDetailGrid
                  items={[
                    ["订单号", selected.orderNo],
                    ["电子票号", selected.ticketCode],
                    ["票种", selected.ticketName],
                    ["场次", formatSessionDate(refundSessionDate(selected))],
                    ["退款金额", `¥${selected.amount.toFixed(2)}`],
                    ["支付方式", "微信支付"],
                    ["退款去向", "原支付账户"],
                  ]}
                />
              </RefundDetailSection>

              <RefundDetailSection
                title="退款规则校验"
                icon={<ListChecks className="w-4 h-4" />}
              >
                <div className="grid gap-2">
                  {[
                    "订单已支付 · 支付金额已核对",
                    "电子票未使用 · 无入场核验记录",
                    "在可退时间内 · 距离活动开始超过 24 小时",
                    "票种允许退款 · 支持活动前退款",
                  ].map(text => (
                    <div
                      key={text}
                      className="rounded-lg bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-700 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      {text}
                    </div>
                  ))}
                </div>
              </RefundDetailSection>

              <RefundDetailSection
                title="处理记录"
                icon={<FileText className="w-4 h-4" />}
              >
                <div className="space-y-3">
                  {selected.logs.map((log, index) => (
                    <div
                      key={`${log.action}-${index}`}
                      className="border-l-2 border-brand-200 pl-3"
                    >
                      <strong className="block text-[14px]">
                        {log.action}
                      </strong>
                      <span className="block mt-1 text-[12px] text-slate-500">
                        {log.actor} · {log.time}
                      </span>
                      {log.comment && (
                        <small className="block mt-1 text-[12px] leading-5 text-slate-600">
                          {log.comment}
                        </small>
                      )}
                    </div>
                  ))}
                </div>
              </RefundDetailSection>

              {selected.status === "pending_review" &&
                (role === "platform" ? (
                  <div className="sticky bottom-0 bg-white border-t border-slate-200 pt-4 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setDecision("reject");
                        setComment("");
                      }}
                      className="h-10 px-4 rounded-full border border-brand-200 text-[14px] font-semibold hover:bg-brand-50 text-brand-700"
                    >
                      驳回申请
                    </button>
                    <button
                      onClick={() => {
                        setDecision("approve");
                        setComment("符合活动退票规则，同意原路退回");
                      }}
                      className="h-10 px-4 rounded-full bg-brand-grad text-white text-[14px] font-semibold"
                    >
                      同意退款 ¥{selected.amount.toFixed(2)}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-lg bg-slate-100 p-3 text-[13px] leading-6 text-slate-600 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 mt-1 shrink-0" />
                    主办方可查看申请与订单信息 退款决定由平台运营人员完成
                  </div>
                ))}
            </div>
          </aside>
        </div>
      )}

      {selected && decision && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/45 flex items-center justify-center p-4"
          onClick={() => setDecision(null)}
        >
          <div
            className="w-full max-w-[500px] rounded-xl bg-white shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-[18px] font-semibold">
                {decision === "approve" ? "确认同意退款" : "驳回退款申请"}
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <span className="block text-[14px] text-slate-600">
                  {selected.buyerName} · {selected.ticketName}
                </span>
                <strong className="block mt-1 text-[24px]">
                  ¥{selected.amount.toFixed(2)}
                </strong>
                <small className="block mt-2 text-[13px] leading-5 text-slate-500">
                  {decision === "approve"
                    ? "确认后将退款提交原支付渠道并同步用户端状态"
                    : "驳回原因将同步给用户 请填写清楚具体原因"}
                </small>
              </div>
              <label className="block">
                <span className="block mb-2 text-[14px] font-semibold">
                  {decision === "approve" ? "处理说明" : "驳回原因"}
                </span>
                <textarea
                  value={comment}
                  onChange={event => setComment(event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 p-3 text-[14px] outline-none focus:border-brand-500"
                  placeholder={
                    decision === "approve"
                      ? "可填写退款处理说明"
                      : "请填写不符合退款条件的具体原因"
                  }
                />
              </label>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setDecision(null)}
                className="h-10 px-4 rounded-full border border-brand-200 text-[14px] font-semibold hover:bg-brand-50 text-brand-700"
              >
                取消
              </button>
              <button
                disabled={decision === "reject" && !comment.trim()}
                onClick={decide}
                className="h-10 px-4 rounded-full bg-brand-grad disabled:bg-slate-300 text-white text-[14px] font-semibold"
              >
                {decision === "approve" ? "确认同意退款" : "确认驳回"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RefundDetailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <h4 className="mb-4 flex items-center gap-2 text-[15px] font-semibold">
        {icon}
        {title}
      </h4>
      {children}
    </section>
  );
}

function RefundDetailGrid({ items }: { items: string[][] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map(([label, value], index) => (
        <div
          key={`${label}-${index}`}
          className={label === "退款原因" ? "sm:col-span-2" : ""}
        >
          <dt className="text-[12px] font-semibold text-slate-500">{label}</dt>
          <dd className="mt-1 text-[14px] leading-6 font-semibold text-slate-800 break-words">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[820px] w-full text-left">
        <thead>
          <tr className="bg-slate-50">
            {headers.map(header => (
              <th
                key={header}
                className="p-4 text-[13px] font-semibold text-slate-600"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, idx) => (
                <td
                  key={idx}
                  className={`p-4 text-[14px] ${idx === 0 ? "font-semibold" : "text-slate-700"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CostumePage({ compact = false }: { compact?: boolean }) {
  const [detail, setDetail] = useState<(typeof COSERS)[number] | null>(null);
  const [tool, setTool] = useState<"export" | "batch" | null>(null);
  return (
    <div className="space-y-5">
      {!compact && (
        <ModuleTitle
          eyebrow="角色服装道具"
          title="角色、服装与道具申报管理"
          description="承接用户端 Coser 提交的信息，统一查看参与人、角色名、作品来源、参考图、服装图、道具信息、申报状态与操作记录。"
          actions={
            <>
              <button
                onClick={() => setTool("export")}
                className="h-10 px-4 rounded-full border border-brand-200 text-[14px] font-semibold hover:bg-brand-50 text-brand-700"
              >
                导出清单
              </button>
              <button
                onClick={() => setTool("batch")}
                className="h-10 px-4 rounded-full bg-brand-grad text-white text-[14px] font-semibold"
              >
                批量处理
              </button>
            </>
          }
        />
      )}
      <section className="metric-grid grid grid-cols-1 min-[560px]:grid-cols-2 xl:grid-cols-4 gap-4">
        <TodayStat
          label="申报总数"
          value="326"
          sub="来自已支付 Coser 票订单"
          icon={<ClipboardCheck className="w-5 h-5" />}
        />
        <TodayStat
          label="已通过"
          value="318"
          sub="可进入现场核验"
          icon={<CircleCheckBig className="w-5 h-5" />}
          tone="blue"
        />
        <TodayStat
          label="待审核"
          value="6"
          sub="资料完整性待确认"
          icon={<Clock3 className="w-5 h-5" />}
          tone="amber"
        />
        <TodayStat
          label="协同核验"
          value="2"
          sub="需现场安保复验"
          icon={<ShieldCheck className="w-5 h-5" />}
          tone="rose"
        />
      </section>
      <section className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="min-w-[1260px] w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-[13px] text-slate-600">
              <th className="p-4 font-semibold">参与人 / 角色</th>
              <th className="p-4 font-semibold">作品来源</th>
              <th className="p-4 font-semibold">参考图 / 服装图</th>
              <th className="p-4 font-semibold">服装信息</th>
              <th className="p-4 font-semibold">道具信息</th>
              <th className="p-4 font-semibold">申报状态</th>
              <th className="p-4 font-semibold">操作记录</th>
              <th className="p-4 text-right font-semibold">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {COSERS.map((item, index) => (
              <tr key={item.person}>
                <td className="p-4">
                  <div className="text-[15px] font-semibold">{item.person}</div>
                  <div className="mt-1 text-[14px] text-slate-700">
                    {item.character}
                  </div>
                </td>
                <td className="p-4 text-[14px] font-medium">{item.source}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      <img
                        src={RECORD_VISUALS.character}
                        alt={`${item.character}角色参考图`}
                        className="w-10 h-12 object-cover rounded border-2 border-white bg-slate-100"
                      />
                      <img
                        src={RECORD_VISUALS.costume}
                        alt={`${item.character}服装全身图`}
                        className="w-10 h-12 object-cover rounded border-2 border-white bg-slate-100"
                      />
                    </div>
                    <div className="text-[13px] leading-5 text-slate-600">
                      <span className="block whitespace-nowrap">
                        角色参考图已上传
                      </span>
                      <span className="block whitespace-nowrap">
                        服装全身图已上传
                      </span>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-[14px] leading-5 max-w-[200px]">
                  {item.costume}
                </td>
                <td className="p-4 text-[14px] leading-5 max-w-[210px]">
                  {item.props}
                </td>
                <td className="p-4">
                  <div className="w-[96px] flex flex-col items-center gap-2">
                    <Pill
                      tone={
                        item.status === "已通过"
                          ? "green"
                          : item.status === "协同核验"
                            ? "rose"
                            : "amber"
                      }
                    >
                      {item.status}
                    </Pill>
                    <div className="text-[12px] text-slate-500 text-center">
                      {item.risk}
                    </div>
                  </div>
                </td>
                <td className="p-4 text-[13px] leading-5 text-slate-600">
                  {item.log}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => setDetail(item)}
                    className="text-[14px] font-semibold text-brand-600"
                  >
                    查看详情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {detail && (
        <CostumeDetailDrawer item={detail} onClose={() => setDetail(null)} />
      )}
      {tool && <CostumeToolPanel type={tool} onClose={() => setTool(null)} />}
    </div>
  );
}

function CostumeDetailDrawer({
  item,
  onClose,
}: {
  item: (typeof COSERS)[number];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button onClick={onClose} className="absolute inset-0 bg-black/25" />
      <section className="relative w-full max-w-[560px] h-full bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 p-5 bg-white border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[13px] text-slate-500">
              角色服装道具申报详情
            </div>
            <h2 className="mt-1 text-[21px] font-semibold">{item.character}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <section className="grid grid-cols-2 gap-3">
            <InfoBlock label="参与人" value={item.person} />
            <InfoBlock label="作品来源" value={item.source} />
            <InfoBlock label="申报状态" value={item.status} />
            <InfoBlock label="风险提示" value={item.risk} />
          </section>
          <section className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[16px] font-semibold">
                角色、服装与道具资料
              </h3>
              <span className="text-[13px] text-slate-500 whitespace-nowrap">
                3 项已上传
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 min-[460px]:grid-cols-3 gap-3">
              <figure className="min-w-0">
                <img
                  src={RECORD_VISUALS.character}
                  alt={`${item.character}角色参考图`}
                  className="w-full aspect-[3/4] object-cover rounded-md border border-slate-200 bg-slate-100"
                />
                <figcaption className="mt-2 text-[13px] font-medium text-slate-700 whitespace-nowrap">
                  角色参考图
                </figcaption>
              </figure>
              <figure className="min-w-0">
                <img
                  src={RECORD_VISUALS.costume}
                  alt={`${item.character}服装全身图`}
                  className="w-full aspect-[3/4] object-cover rounded-md border border-slate-200 bg-slate-100"
                />
                <figcaption className="mt-2 text-[13px] font-medium text-slate-700 whitespace-nowrap">
                  服装全身图
                </figcaption>
              </figure>
              <figure className="min-w-0">
                <img
                  src={RECORD_VISUALS.prop}
                  alt={`${item.character}道具参考图`}
                  className="w-full aspect-[3/4] object-cover rounded-md border border-slate-200 bg-slate-100"
                />
                <figcaption className="mt-2 text-[13px] font-medium text-slate-700 whitespace-nowrap">
                  道具参考图
                </figcaption>
              </figure>
            </div>
          </section>
          <section className="border border-slate-200 rounded-lg divide-y divide-slate-200">
            <div className="p-4">
              <div className="text-[13px] font-semibold text-slate-500">
                服装信息
              </div>
              <div className="mt-2 text-[15px] leading-6">{item.costume}</div>
            </div>
            <div className="p-4">
              <div className="text-[13px] font-semibold text-slate-500">
                道具信息
              </div>
              <div className="mt-2 text-[15px] leading-6">{item.props}</div>
            </div>
            <div className="p-4">
              <div className="text-[13px] font-semibold text-slate-500">
                操作记录
              </div>
              <div className="mt-2 text-[15px] leading-6">{item.log}</div>
            </div>
          </section>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 h-11 rounded-full border border-brand-200 text-[14px] font-semibold hover:bg-brand-50 text-brand-700"
            >
              退回补充
            </button>
            <button
              onClick={onClose}
              className="flex-1 h-11 rounded-full bg-brand-grad text-white text-[14px] font-semibold"
            >
              确认通过
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
function CostumeToolPanel({
  type,
  onClose,
}: {
  type: "export" | "batch";
  onClose: () => void;
}) {
  const [done, setDone] = useState(false);
  const exportMode = type === "export";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button onClick={onClose} className="absolute inset-0 bg-black/30" />
      <section className="relative w-full max-w-[460px] bg-white rounded-lg shadow-2xl p-6">
        <div className="w-11 h-11 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
          {exportMode ? (
            <Download className="w-5 h-5" />
          ) : (
            <ClipboardCheck className="w-5 h-5" />
          )}
        </div>
        <h2 className="mt-4 text-[21px] font-semibold">
          {done
            ? exportMode
              ? "清单已生成"
              : "批量处理已提交"
            : exportMode
              ? "导出角色服装道具清单"
              : "批量处理角色道具申报"}
        </h2>
        <p className="mt-2 text-[14px] leading-6 text-slate-600">
          {done
            ? exportMode
              ? "已按当前筛选范围生成清单。"
              : "已将 6 条待审核申报加入统一处理队列。"
            : exportMode
              ? "导出参与人、角色、服装、道具、申报状态与操作记录。"
              : "可统一分配审核人员、发送补充提醒或更新申报状态。"}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-10 px-4 rounded-full border border-brand-200 text-[14px] font-semibold hover:bg-brand-50 text-brand-700"
          >
            {done ? "关闭" : "取消"}
          </button>
          {!done && (
            <button
              onClick={() => setDone(true)}
              className="h-10 px-4 rounded-full bg-brand-grad text-white text-[14px] font-semibold"
            >
              {exportMode ? "生成清单" : "确认处理"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function OnsitePage({
  checkins,
  setCheckins,
  issueOpen,
  setIssueOpen,
  compact = false,
}: {
  checkins: number;
  setCheckins: (count: number) => void;
  issueOpen: boolean;
  setIssueOpen: (open: boolean) => void;
  compact?: boolean;
}) {
  const totalIn = 3218 + checkins;
  return (
    <div className="space-y-5">
      {!compact && (
        <ModuleTitle
          eyebrow="现场管理"
          title="现场核验与入场运行"
          description="统一处理电子票二维码、实名信息、角色服装和异常核验。"
          actions={
            <button
              onClick={() => setIssueOpen(true)}
              className="h-11 px-4 rounded-lg bg-rose-600 text-white text-[15px] font-semibold flex items-center gap-1.5"
            >
              <CircleAlert className="w-5 h-5" />
              登记异常
            </button>
          }
        />
      )}
      <section className="relative overflow-hidden rounded-2xl bg-brand-900 p-5 sm:p-6 text-white">
        <div
          className="vi-halftone pointer-events-none absolute inset-0 opacity-60"
          aria-hidden="true"
        />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="text-[13px] text-brand-100">
              当前场次 · 2026 魔都动漫嘉年华
            </div>
            <h2 className="mt-2 text-[26px] font-semibold">现场核验工作台</h2>
            <p className="mt-2 text-[15px] text-white/85">
              请扫描电子票二维码，系统将核对订单、实名状态与活动规则。
            </p>
          </div>
          <button
            onClick={() => setCheckins(checkins + 1)}
            className="h-16 px-7 rounded-full bg-sun-400 text-brand-900 hover:bg-[#ffd04d] text-[18px] font-semibold flex items-center justify-center gap-3 shadow-[0_4px_0_0_#2b2350] transition-transform active:translate-y-[2px] active:shadow-[0_2px_0_0_#2b2350]"
          >
            <ScanLine className="w-7 h-7" />
            扫码核验
          </button>
        </div>
        <div className="onsite-stat-grid relative mt-6 grid grid-cols-1 min-[460px]:grid-cols-2 lg:grid-cols-5 gap-3">
          <OnsiteStat label="已售票" value="4,662" />
          <OnsiteStat label="已实名" value="4,484" />
          <OnsiteStat label="已入场" value={totalIn.toLocaleString()} />
          <OnsiteStat
            label="当前场内"
            value={(2945 + checkins).toLocaleString()}
          />
          <OnsiteStat label="异常核验" value="02" danger />
        </div>
      </section>
      <section className="grid xl:grid-cols-[1.1fr_0.9fr] gap-5">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-[18px] font-semibold">实时入场记录</h3>
              <p className="mt-1 text-[14px] text-slate-600">
                扫码后即时写入活动档案和现场统计。
              </p>
            </div>
            <Pill tone="green">核验服务正常</Pill>
          </div>
          <div className="divide-y divide-slate-200">
            <CheckinRow
              name="张三"
              ticket="Coser 专属票"
              detail="实名通过 · 甘雨 · 无异常道具"
              time="刚刚"
              status="通过"
            />
            <CheckinRow
              name="王小东"
              ticket="普通观众票"
              detail="实名通过 · 电子票有效"
              time="2 分钟前"
              status="通过"
            />
            <CheckinRow
              name="李思远"
              ticket="Coser 专属票"
              detail="机甲重装佣兵 · 已转安保复验"
              time="5 分钟前"
              status="复验"
            />
          </div>
        </div>
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-[18px] font-semibold">进场速度</h3>
            <div className="mt-4 flex items-end gap-2 h-28">
              {[35, 48, 42, 72, 78, 63, 82, 66, 90, 76, 70, 84].map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-brand-grad"
                  style={{ height: `${v}%` }}
                />
              ))}
            </div>
            <div className="mt-3 flex justify-between text-[13px] text-slate-500">
              <span>08:30</span>
              <span>10:00</span>
              <span>11:30</span>
            </div>
            <div className="mt-3 text-[15px] font-semibold">
              当前 118 人 / 10 分钟
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-[18px] font-semibold">现场操作</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <ActionButton
                label="手动核验电子票"
                className="min-h-[84px] rounded-lg border border-slate-300 text-[14px] font-semibold hover:bg-slate-50 flex flex-col items-center justify-center"
                icon={<QrCode className="mb-2 w-5 h-5 text-brand-600" />}
                description="可输入订单号或电子票编号进行人工核验。"
              />
              <ActionButton
                label="实名信息核对"
                className="min-h-[84px] rounded-lg border border-slate-300 text-[14px] font-semibold hover:bg-slate-50 flex flex-col items-center justify-center"
                icon={<UserCheck className="mb-2 w-5 h-5 text-brand-600" />}
                description="按授权范围核对订单关联的实名状态与核验结果。"
              />
              <button
                onClick={() => setIssueOpen(true)}
                className="min-h-[84px] rounded-lg border border-amber-200 bg-amber-50 text-[14px] font-semibold text-amber-800"
              >
                <CircleAlert className="mx-auto mb-2 w-5 h-5" />
                异常核验登记
              </button>
              <ActionButton
                label="导出现场交接表"
                className="min-h-[84px] rounded-lg border border-slate-300 text-[14px] font-semibold hover:bg-slate-50 flex flex-col items-center justify-center"
                icon={<Download className="mb-2 w-5 h-5 text-brand-600" />}
                description="导出入场、异常核验和现场处置的交接汇总。"
              />
            </div>
          </div>
        </div>
      </section>
      {issueOpen && <IssueModal onClose={() => setIssueOpen(false)} />}
    </div>
  );
}
function OnsiteStat({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="bg-white/10 border border-white/20 rounded-xl p-3">
      <div className="text-[12px] text-brand-100">{label}</div>
      <div
        className={`mt-1 text-[24px] leading-7 font-semibold ${danger ? "text-rose-300" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
function CheckinRow({
  name,
  ticket,
  detail,
  time,
  status,
}: {
  name: string;
  ticket: string;
  detail: string;
  time: string;
  status: string;
}) {
  return (
    <div className="p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
        <UserRound className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold">
          {name}
          <span className="ml-2 text-[13px] font-normal text-slate-600">
            {ticket}
          </span>
        </div>
        <div className="mt-1 text-[13px] text-slate-600">{detail}</div>
      </div>
      <div className="text-right">
        <Pill tone={status === "通过" ? "green" : "amber"}>{status}</Pill>
        <div className="mt-1 text-[12px] text-slate-500">{time}</div>
      </div>
    </div>
  );
}
function IssueModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4">
      <div className="w-full max-w-[520px] bg-white rounded-lg shadow-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[21px] font-semibold">登记现场异常</h2>
            <p className="mt-1 text-[14px] text-slate-600">
              异常记录将自动写入本场活动数字档案。
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-5 grid gap-4">
          <Field
            label="异常类型"
            value="请选择：电子票异常 / 实名不一致 / 道具复验"
          />
          <Field
            label="关联订单或参与人"
            value="请输入订单号、姓名或扫码凭证"
          />
          <Field label="现场处置记录" value="请记录核验结果与处置方式" />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-10 px-4 rounded-full border border-brand-200 text-[14px] font-semibold hover:bg-brand-50 text-brand-700"
          >
            取消
          </button>
          <button
            onClick={onClose}
            className="h-10 px-4 rounded-lg bg-rose-600 text-white text-[14px] font-semibold"
          >
            保存异常记录
          </button>
        </div>
      </div>
    </div>
  );
}

function EventData() {
  return (
    <div className="space-y-5">
      <ModuleTitle
        title="活动数据"
        description="围绕售票、入场、退款、人员、客流、核验和异常数据提供活动运行分析。"
        actions={
          <ActionButton
            label="导出活动数据"
            className="h-10 px-4 rounded-full border border-brand-200 text-[14px] font-semibold flex items-center gap-1.5 hover:bg-brand-50 text-brand-700"
            icon={<Download className="w-4 h-4" />}
            description="导出售票、入场、退款、人员、客流、核验和异常统计。"
          />
        }
      />
      <div className="metric-grid grid grid-cols-1 min-[560px]:grid-cols-2 xl:grid-cols-4 gap-4">
        <TodayStat
          label="售票金额"
          value="¥380,096"
          sub="较昨日增长 12.4%"
          icon={<WalletCards className="w-5 h-5" />}
        />
        <TodayStat
          label="退款率"
          value="0.39%"
          sub="18 笔退款申请"
          icon={<RefreshCcw className="w-5 h-5" />}
          tone="amber"
        />
        <TodayStat
          label="入场率"
          value="96.8%"
          sub="电子票核验通过率"
          icon={<TicketCheck className="w-5 h-5" />}
        />
        <TodayStat
          label="异常率"
          value="0.04%"
          sub="2 项异常核验"
          icon={<CircleAlert className="w-5 h-5" />}
          tone="rose"
        />
      </div>
      <div className="grid grid-cols-1 min-[1080px]:grid-cols-[1.35fr_0.65fr] gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-[18px] font-semibold">售票与入场趋势</h3>
          <p className="mt-1 text-[14px] text-slate-600">
            按活动日与时段汇总的票务、客流与核验数据。
          </p>
          <div className="mt-7 h-56 flex items-end gap-4 border-b border-slate-200 pb-6">
            {[44, 62, 55, 74, 68, 88, 94, 82, 72, 64].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full max-w-[42px] bg-brand-grad rounded-t"
                  style={{ height: `${v}%` }}
                />
                <span className="text-[12px] text-slate-500">{i + 8}:00</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-[18px] font-semibold">数据口径</h3>
          <div className="mt-4 space-y-4">
            <MiniMetric
              label="售票"
              value="订单支付成功"
              sub="普通票、Coser票、学生票、现场票"
            />
            <MiniMetric
              label="入场"
              value="二维码核验通过"
              sub="与订单、实名和现场记录关联"
            />
            <MiniMetric
              label="异常"
              value="已登记并处置"
              sub="支持按活动形成问题与操作记录"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
function Issues() {
  return (
    <div className="space-y-5">
      <ModuleTitle
        title="问题记录"
        description="记录活动准备、售票、现场服务与核验过程中发现的问题及处置过程。"
        actions={
          <ActionButton
            label="登记问题"
            className="h-10 px-4 rounded-lg bg-rose-600 text-white text-[14px] font-semibold flex items-center gap-1.5"
            icon={<Plus className="w-4 h-4" />}
            description="问题将关联活动阶段、处理责任人、时限和处置记录。"
          />
        }
      />
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
        <IssueRow
          level="高"
          title="仿真道具尺寸待复验"
          detail="机甲重装佣兵 · 现场安保须在入场前核验重弩模型尺寸与材质"
          status="处理中"
          time="今天 11:50"
        />
        <IssueRow
          level="中"
          title="夜间值守联系人尚未补充"
          detail="现场服务与应急联络表缺少 20:00 后场馆协调联系人"
          status="待主办方处理"
          time="今天 10:05"
        />
        <IssueRow
          level="低"
          title="学生早鸟票库存接近售罄"
          detail="已售 788 / 800，建议在停售后同步更新活动首页说明"
          status="已完成"
          time="昨天 16:20"
        />
      </div>
    </div>
  );
}
function IssueRow({
  level,
  title,
  detail,
  status,
  time,
}: {
  level: string;
  title: string;
  detail: string;
  status: string;
  time: string;
}) {
  return (
    <div className="p-5 flex flex-col md:flex-row gap-4 md:items-center">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${level === "高" ? "bg-rose-50 text-rose-600" : level === "中" ? "bg-amber-50 text-amber-600" : "bg-brand-50 text-brand-600"}`}
      >
        <CircleAlert className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <div className="text-[16px] font-semibold">{title}</div>
        <div className="mt-1 text-[14px] leading-6 text-slate-600">
          {detail}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Pill
          tone={
            status === "已完成" ? "green" : level === "高" ? "rose" : "amber"
          }
        >
          {status}
        </Pill>
        <div className="text-[13px] text-slate-500 whitespace-nowrap">
          {time}
        </div>
        <ActionButton
          label="处理记录"
          className="text-[14px] font-semibold text-brand-600"
          description="查看问题的登记、分派、处理与结项记录。"
        />
      </div>
    </div>
  );
}

function ArchivePage({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-5">
      {!compact && (
        <ModuleTitle
          eyebrow="数字档案"
          title="活动结束与归档管理"
          description="活动结束后汇集活动资料、票务、参与人员、现场核验、问题记录、数据汇总与操作日志，形成完整数字档案。"
          actions={
            <ActionButton
              label="生成归档摘要"
              className="h-10 px-4 rounded-full bg-brand-grad text-white text-[14px] font-semibold flex items-center gap-1.5"
              icon={<FileArchive className="w-4 h-4" />}
              description="将汇集资料、票务、现场、问题、数据和操作日志形成归档摘要。"
            />
          }
        />
      )}
      <section className="grid md:grid-cols-3 gap-4">
        <ArchiveCard
          title="资料归集"
          value="5 / 5"
          text="活动基础资料、规则和现场保障材料"
          state="已完成"
        />
        <ArchiveCard
          title="运行数据"
          value="8 / 8"
          text="售票、退款、入场、客流、核验与异常数据"
          state="已完成"
        />
        <ArchiveCard
          title="结项归档"
          value="待活动结束"
          text="活动结束后自动生成归档清单与复盘摘要"
          state="待进行"
        />
      </section>
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-[18px] font-semibold">本场活动归档清单</h3>
          <p className="mt-1 text-[14px] text-slate-600">
            归档动作全程留痕，适用于活动运营复盘与服务资料整理。
          </p>
        </div>
        <div className="divide-y divide-slate-200">
          <ArchiveLine
            icon={<FileText className="w-5 h-5" />}
            title="活动资料与材料版本"
            status="已归集"
          />
          <ArchiveLine
            icon={<Ticket className="w-5 h-5" />}
            title="票务、订单、退款与电子票核验汇总"
            status="已归集"
          />
          <ArchiveLine
            icon={<Users className="w-5 h-5" />}
            title="参与人员脱敏汇总与现场入场记录"
            status="已归集"
          />
          <ArchiveLine
            icon={<CircleAlert className="w-5 h-5" />}
            title="问题记录、异常核验与处置过程"
            status="持续更新"
          />
          <ArchiveLine
            icon={<ScrollText className="w-5 h-5" />}
            title="活动复盘摘要与操作日志"
            status="待生成"
          />
        </div>
      </section>
    </div>
  );
}
function ArchiveCard({
  title,
  value,
  text,
  state,
}: {
  title: string;
  value: string;
  text: string;
  state: string;
}) {
  return (
    <div className="metric-card min-w-0 bg-white border border-slate-200 rounded-xl p-5">
      <div className="text-[14px] text-slate-600 [word-break:keep-all]">
        {title}
      </div>
      <div className="metric-value mt-2 text-[28px] leading-8 font-semibold">
        {value}
      </div>
      <div className="metric-sub mt-2 text-[14px] leading-6 text-slate-600">
        {text}
      </div>
      <div className="mt-4">
        <Pill tone={state === "已完成" ? "green" : "amber"}>{state}</Pill>
      </div>
    </div>
  );
}
function ArchiveLine({
  icon,
  title,
  status,
}: {
  icon: ReactNode;
  title: string;
  status: string;
}) {
  return (
    <div className="p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 text-[15px] font-semibold">{title}</div>
      <Pill
        tone={
          status === "已归集"
            ? "green"
            : status === "持续更新"
              ? "blue"
              : "amber"
        }
      >
        {status}
      </Pill>
      <ActionButton
        label="查看"
        className="text-[14px] font-semibold text-brand-600"
        description="查看该归档事项关联的活动材料和操作记录。"
      />
    </div>
  );
}

function DataCenter() {
  return (
    <div className="space-y-5">
      <ModuleTitle
        eyebrow="数据中心"
        title="活动真实业务数据"
        description="围绕售票、入场、退款、人员、客流、核验和异常数据形成运营复盘，不使用装饰性数据卡片替代业务内容。"
        actions={
          <ActionButton
            label="导出活动复盘数据"
            className="h-10 px-4 rounded-full border border-brand-200 text-[14px] font-semibold flex items-center gap-1.5 hover:bg-brand-50 text-brand-700"
            icon={<Download className="w-4 h-4" />}
            description="导出各活动的售票、入场、退款、人员、核验与异常数据。"
          />
        }
      />
      <section className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="min-w-[940px] w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-[13px] text-slate-600">
              <th className="p-4 font-semibold">业务主题</th>
              <th className="p-4 font-semibold">当前值</th>
              <th className="p-4 font-semibold">统计口径</th>
              <th className="p-4 font-semibold">关联模块</th>
              <th className="p-4 font-semibold">更新频率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <DataRow
              title="票务销售"
              value="4,662 张 / ¥380,096"
              definition="支付成功订单，按票种、渠道与时段统计"
              module="票务管理"
              update="实时"
            />
            <DataRow
              title="人员与实名"
              value="4,484 人完成实名认证"
              definition="活动参与人员的实名状态汇总，不展示原始敏感身份影像"
              module="参与人员"
              update="实时"
            />
            <DataRow
              title="入场与客流"
              value="3,218 人已入场"
              definition="电子票二维码核验通过与现场手工核验记录"
              module="现场管理"
              update="实时"
            />
            <DataRow
              title="退款情况"
              value="18 笔 / 0.38%"
              definition="退款申请、处理状态与金额汇总"
              module="票务管理"
              update="每 10 分钟"
            />
            <DataRow
              title="角色服装道具"
              value="326 份申报 / 2 项协同核验"
              definition="Coser 提交的角色、服装、道具信息和操作记录"
              module="角色服装道具"
              update="实时"
            />
            <DataRow
              title="异常与问题"
              value="2 项异常核验"
              definition="活动准备与现场过程中登记的问题、处置过程和结果"
              module="问题记录"
              update="实时"
            />
          </tbody>
        </table>
      </section>
      <section className="space-y-5">
        <EventData />
        <ArchivePage compact />
      </section>
    </div>
  );
}
function DataRow({
  title,
  value,
  definition,
  module,
  update,
}: {
  title: string;
  value: string;
  definition: string;
  module: string;
  update: string;
}) {
  return (
    <tr>
      <td className="p-4 text-[15px] font-semibold">{title}</td>
      <td className="p-4 text-[15px] font-semibold text-brand-600">{value}</td>
      <td className="p-4 text-[14px] leading-6 text-slate-600">{definition}</td>
      <td className="p-4">
        <Pill tone="blue">{module}</Pill>
      </td>
      <td className="p-4 text-[14px] text-slate-600">{update}</td>
    </tr>
  );
}

function NotificationPanel({
  onClose,
  onOpenCostume,
}: {
  onClose: () => void;
  onOpenCostume: () => void;
}) {
  const [read, setRead] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button onClick={onClose} className="absolute inset-0 bg-black/25" />
      <aside className="relative w-full task-drawer max-w-[460px] h-full bg-white overflow-y-auto">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-semibold">通知中心</h2>
            <p className="mt-1 text-[14px] text-slate-600">
              活动待办、异常提醒与协同动态
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <button
            onClick={() => setRead(true)}
            className="w-full h-10 rounded-full border border-brand-200 text-[14px] font-semibold hover:bg-brand-50 text-brand-700"
          >
            {read ? "已全部标记为已读" : "全部标记为已读"}
          </button>
          <div className="mt-4 space-y-3">
            <Notice
              icon={<ShieldCheck className="w-5 h-5" />}
              tone="rose"
              title="高关注道具需现场复验"
              text="机甲重装佣兵 · 仿真重弩模型待核对尺寸与材质"
              time="12 分钟前"
              unread={!read}
              action="进入角色管理"
              onClick={onOpenCostume}
            />
            <Notice
              icon={<FileText className="w-5 h-5" />}
              tone="amber"
              title="活动资料待补充"
              text="现场服务与应急联络表缺少夜间值守联系人"
              time="1 小时前"
              unread={!read}
              action="查看活动资料"
            />
            <Notice
              icon={<TicketCheck className="w-5 h-5" />}
              tone="blue"
              title="票务库存提示"
              text="学生早鸟票剩余 12 张，建议准备停售说明"
              time="今天 09:20"
              unread={false}
              action="进入票务管理"
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
function Notice({
  icon,
  tone,
  title,
  text,
  time,
  unread,
  action,
  onClick,
}: {
  icon: ReactNode;
  tone: "rose" | "amber" | "blue";
  title: string;
  text: string;
  time: string;
  unread: boolean;
  action: string;
  onClick?: () => void;
}) {
  const c = {
    rose: "bg-rose-50 text-rose-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-brand-50 text-brand-600",
  }[tone];
  return (
    <div className="p-4 border border-slate-200 rounded-lg">
      <div className="flex gap-3">
        <div
          className={`w-9 h-9 rounded-md shrink-0 flex items-center justify-center ${c}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex gap-2">
            <div className="text-[15px] font-semibold flex-1">{title}</div>
            {unread && (
              <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-grad" />
            )}
          </div>
          <p className="semantic-copy mt-1 text-[14px] leading-6 text-slate-600">
            {text}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[12px] text-slate-500">{time}</span>
            {onClick ? (
              <button
                onClick={onClick}
                className="text-[13px] font-semibold text-brand-600 hover:text-brand-700"
              >
                {action}
              </button>
            ) : (
              <ActionButton
                label={action}
                title={title}
                description={text}
                className="text-[13px] font-semibold text-brand-600 hover:text-brand-700"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
function SettingsPanel({
  role,
  onRoleChange,
  onClose,
  onLogout,
}: {
  role: Role;
  onRoleChange: (role: Role) => void;
  onClose: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button onClick={onClose} className="absolute inset-0 bg-black/25" />
      <aside className="relative w-full task-drawer max-w-[460px] h-full bg-white overflow-y-auto">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-semibold">系统设置</h2>
            <p className="mt-1 text-[14px] text-slate-600">
              当前工作身份与显示偏好
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <section className="border border-slate-200 rounded-lg p-4">
            <div className="text-[13px] font-semibold text-slate-500">
              当前工作身份
            </div>
            <div className="mt-3 text-[17px] font-semibold">
              {ROLE_INFO[role].name}
            </div>
            <div className="mt-1 text-[14px] text-slate-600">
              {ROLE_INFO[role].note}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2">
              {(Object.keys(ROLE_INFO) as Role[]).map(item => (
                <button
                  key={item}
                  onClick={() => onRoleChange(item)}
                  className={`h-10 px-3 text-left rounded-full border text-[13px] font-semibold whitespace-nowrap ${item === role ? "border-brand-500 bg-brand-50 text-brand-700" : "border-brand-200 hover:bg-brand-50"}`}
                >
                  {ROLE_INFO[item].name}
                </button>
              ))}
            </div>
          </section>
          <section className="border border-slate-200 rounded-lg divide-y divide-slate-200">
            <SettingRow
              title="审核待办提醒"
              text="有新的角色服装道具申报时显示待办角标"
              active
            />
            <SettingRow
              title="现场异常提醒"
              text="发生实名、电子票或道具异常时显示高优先级提醒"
              active
            />
            <SettingRow
              title="多语言界面"
              text="中文、English、ئۇيغۇرچە可在顶部随时切换"
              active
            />
          </section>
          <section className="p-4 rounded-lg bg-brand-50 border border-brand-100 text-[14px] leading-6 text-brand-900">
            账号权限和可见数据范围由平台管理员统一配置。系统用于活动服务协同与资料归集，不替代相关行政审批、监管执法或其他已有业务系统。
          </section>
          <button
            onClick={onLogout}
            className="w-full h-11 rounded-lg border border-rose-200 text-rose-700 bg-rose-50 text-[14px] font-semibold"
          >
            退出登录
          </button>
        </div>
      </aside>
    </div>
  );
}
function SettingRow({
  title,
  text,
  active,
}: {
  title: string;
  text: string;
  active?: boolean;
}) {
  const [on, setOn] = useState(active);
  return (
    <div className="p-4 flex items-center gap-3">
      <div className="flex-1">
        <div className="text-[15px] font-semibold">{title}</div>
        <div className="mt-1 text-[13px] leading-5 text-slate-600">{text}</div>
      </div>
      <button
        onClick={() => setOn(!on)}
        className={`w-11 h-6 rounded-full p-0.5 ${on ? "bg-brand-grad" : "bg-slate-300"}`}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`}
        />
      </button>
    </div>
  );
}
