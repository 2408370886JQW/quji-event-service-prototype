import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import {
  Activity, AlertTriangle, Archive, ArrowUpRight, Bell, Building2, CalendarDays,
  Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  ClipboardCheck, Clock3, Download, Eye, FileCheck2, FileText, Filter,
  FolderOpen, Grid2X2, Landmark, LockKeyhole, LogOut, MapPin, Menu, MoreHorizontal,
  PanelLeftClose, Plus, QrCode, Search, ShieldAlert, ShieldCheck, Sparkles,
  Ticket, Users, X, XCircle, Zap, ClipboardList, UserRoundCheck, ScanFace,
  Camera, Network, BadgeCheck, ExternalLink, ListFilter, Send, Info, Layers3
} from 'lucide-react';
import { CoserSubmission, INITIAL_LOGS, INITIAL_SUBMISSIONS, AccessLog } from '../mockData';

type View = 'overview' | 'events' | 'submissions' | 'access' | 'analytics';
type AuditFilter = 'all' | 'pending' | 'flagged' | 'approved' | 'rejected';

interface EventRecord {
  id: string;
  name: string;
  type: string;
  date: string;
  location: string;
  organizer: string;
  status: 'draft' | 'pending' | 'published' | 'ended';
  attendeeCount: number;
  coserCount: number;
  submissionCount: number;
  reviewer: string;
  tags: string[];
  updated: string;
}

const INITIAL_EVENTS: EventRecord[] = [
  {
    id: 'EVT-2026-0628',
    name: '2026 魔都动漫嘉年华 · 乌鲁木齐特别巡回展',
    type: '动漫展览 / 青年文化',
    date: '2026-06-28 09:00—18:00',
    location: '新疆国际会展中心 3号馆',
    organizer: '新疆星河文化传媒有限公司',
    status: 'published',
    attendeeCount: 4862,
    coserCount: 326,
    submissionCount: 326,
    reviewer: '陈涛 · 运营审核',
    tags: ['大型活动', '角色服装登记', '现场核验'],
    updated: '今天 10:36'
  },
  {
    id: 'EVT-2026-0720',
    name: '2026 丝路数字国风文创新潮博览会',
    type: '数字文创 / 国风体验',
    date: '2026-07-20—07-21',
    location: '乌鲁木齐文化中心 A馆',
    organizer: '丝路文创联合会',
    status: 'pending',
    attendeeCount: 0,
    coserCount: 0,
    submissionCount: 0,
    reviewer: '待文旅业务指导审核',
    tags: ['国风文化', '原创市集', '需补充安全预案'],
    updated: '今天 11:05'
  },
  {
    id: 'EVT-2026-0731',
    name: '天山青年数字潮玩嘉年华',
    type: '潮玩 / 数字互动',
    date: '2026-07-31—08-02',
    location: '新疆国际会展中心 5号馆',
    organizer: '天山青年文化发展中心',
    status: 'draft',
    attendeeCount: 0,
    coserCount: 0,
    submissionCount: 0,
    reviewer: '主办方草稿',
    tags: ['潮玩', '舞台互动'],
    updated: '昨天 18:20'
  },
  {
    id: 'EVT-2026-0808',
    name: '城市青年音乐与插画周',
    type: '音乐 / 插画 / 市集',
    date: '2026-08-08—08-10',
    location: '乌鲁木齐文创园',
    organizer: '新声艺术空间',
    status: 'published',
    attendeeCount: 1260,
    coserCount: 0,
    submissionCount: 0,
    reviewer: '林洁 · 运营审核',
    tags: ['文化市集', '原创艺术'],
    updated: '9月16日'
  }
];

const viewMetadata: Record<View, { title: string; subtitle: string; tag: string }> = {
  overview: { title: '工作总览', subtitle: '实时掌握试点活动运行、内容审核与合规调阅状态。', tag: '文旅主视角' },
  events: { title: '活动管理', subtitle: '活动发布、资料归集、规则配置与组织过程跟踪。', tag: '运营与指导' },
  submissions: { title: '角色服装审核', subtitle: '对用户端提交的角色、服装、道具与实名核验结果进行辅助初核。', tag: '主办方确认' },
  access: { title: '合规调阅', subtitle: '按最小必要原则受理授权调阅，完整留痕可审计。', tag: '受控权限' },
  analytics: { title: '数据分析', subtitle: '活动运行的脱敏汇总数据，仅用于试点复盘与服务优化。', tag: '聚合脱敏' }
};

const statusInfo = {
  pending: { label: '待审核', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: '已通过', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  flagged: { label: '需协同', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  rejected: { label: '已退回', className: 'bg-gray-100 text-gray-600 border-gray-200' }
};

const eventStatusInfo = {
  draft: { label: '草稿', className: 'bg-gray-100 text-gray-600' },
  pending: { label: '待审核', className: 'bg-amber-50 text-amber-700' },
  published: { label: '已发布', className: 'bg-emerald-50 text-emerald-700' },
  ended: { label: '已结束', className: 'bg-slate-100 text-slate-600' }
};

function AppLogo() {
  return (
    <div className="relative w-8 h-8 rounded-[11px] bg-gradient-to-br from-[#0071e3] to-[#6e5ce6] shadow-[0_6px_14px_rgba(0,113,227,0.25)] flex items-center justify-center overflow-hidden">
      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white/20" />
      <Sparkles className="relative w-4 h-4 text-white" strokeWidth={2.5} />
    </div>
  );
}

function StatusBadge({ status }: { status: CoserSubmission['auditStatus'] }) {
  const meta = statusInfo[status];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] leading-4 font-medium ${meta.className}`}>{meta.label}</span>;
}

function EventBadge({ status }: { status: EventRecord['status'] }) {
  const meta = eventStatusInfo[status];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${meta.className}`}>{meta.label}</span>;
}

function SmallLabel({ children }: { children: ReactNode }) {
  return <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">{children}</span>;
}

export default function Home() {
  const [view, setView] = useState<View>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [submissions, setSubmissions] = useState<CoserSubmission[]>(INITIAL_SUBMISSIONS);
  const [events, setEvents] = useState<EventRecord[]>(INITIAL_EVENTS);
  const [logs, setLogs] = useState<AccessLog[]>(INITIAL_LOGS);
  const [filter, setFilter] = useState<AuditFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<CoserSubmission | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [auditNote, setAuditNote] = useState('');
  const [accessPanel, setAccessPanel] = useState(false);
  const [accessReason, setAccessReason] = useState('');
  const [accessScope, setAccessScope] = useState('活动档案与脱敏统计');
  const [toast, setToast] = useState('');

  const selectedMeta = viewMetadata[view];
  const pendingCount = submissions.filter(item => item.auditStatus === 'pending').length;
  const flaggedCount = submissions.filter(item => item.auditStatus === 'flagged').length;
  const reviewedCount = submissions.filter(item => ['approved', 'rejected'].includes(item.auditStatus)).length;
  const verifiedRate = submissions.length ? Math.round((submissions.filter(item => item.auditStatus !== 'pending').length / submissions.length) * 100) : 0;

  const displayedSubmissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return submissions.filter(item => {
      const matchStatus = filter === 'all' || item.auditStatus === filter;
      const matchSearch = !q || [item.realName, item.characterName, item.orderNo, item.eventName].some(value => value.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [filter, search, submissions]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const updateSubmissionStatus = (status: CoserSubmission['auditStatus']) => {
    if (!selectedSubmission) return;
    const detail = auditNote.trim() || (status === 'approved' ? '服装与道具描述符合本场活动入场规则，可进入现场核验环节。' : status === 'rejected' ? '提报资料不完整，请补充服装全身参考图与道具材质说明。' : '建议转交现场安保联动核验。');
    const updated = submissions.map(item => item.id === selectedSubmission.id ? {
      ...item,
      auditStatus: status,
      auditReason: detail,
      auditor: '林洁 · 主办方审核组',
      auditTime: '刚刚'
    } : item);
    setSubmissions(updated);
    setSelectedSubmission(updated.find(item => item.id === selectedSubmission.id) || null);
    setAuditNote('');
    showToast(status === 'approved' ? '已完成辅助初核，并通知主办方现场核验。' : status === 'rejected' ? '已退回用户端补充资料。' : '已标记协同核验并生成受控任务。');
  };

  const updateEventStatus = (status: EventRecord['status']) => {
    if (!selectedEvent) return;
    const updated = events.map(item => item.id === selectedEvent.id ? { ...item, status, reviewer: '陈涛 · 文旅业务指导', updated: '刚刚' } : item);
    setEvents(updated);
    setSelectedEvent(updated.find(item => item.id === selectedEvent.id) || null);
    showToast(status === 'published' ? '活动已进入发布准备状态。' : '活动已退回主办方补充材料。');
  };

  const submitAccessRequest = () => {
    if (!accessReason.trim()) {
      showToast('请填写本次调阅的业务事由。');
      return;
    }
    const newLog: AccessLog = {
      id: `LOG-${String(logs.length + 1).padStart(3, '0')}`,
      operator: '王处长 (文旅市场处)',
      department: '乌鲁木齐文旅局',
      action: `授权调阅：${accessScope}`,
      targetId: '乌鲁木齐试点活动数据集',
      timestamp: '刚刚',
      ip: '218.31.18.92',
      reason: accessReason
    };
    setLogs([newLog, ...logs]);
    setAccessReason('');
    setAccessPanel(false);
    showToast('已按最小范围生成临时调阅会话，操作已全量留痕。');
  };

  const navItems: { id: View; label: string; icon: ComponentType<{ className?: string; strokeWidth?: number }>; badge?: number }[] = [
    { id: 'overview', label: '工作总览', icon: Grid2X2 },
    { id: 'events', label: '活动管理', icon: CalendarDays },
    { id: 'submissions', label: '角色服装审核', icon: ClipboardCheck, badge: pendingCount + flaggedCount },
    { id: 'access', label: '合规调阅', icon: ShieldCheck },
    { id: 'analytics', label: '数据分析', icon: Activity }
  ];

  return (
    <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f] selection:bg-blue-100">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-48 right-[-10%] w-[560px] h-[560px] rounded-full bg-[radial-gradient(circle,rgba(101,93,231,0.11)_0%,rgba(101,93,231,0)_70%)]" />
        <div className="absolute bottom-[-30%] left-[10%] w-[620px] h-[620px] rounded-full bg-[radial-gradient(circle,rgba(0,113,227,0.08)_0%,rgba(0,113,227,0)_70%)]" />
      </div>

      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-[248px]' : 'w-[78px]'} sticky top-0 h-screen shrink-0 transition-all duration-300 ease-out px-3 py-4 border-r border-black/[0.06] bg-white/65 backdrop-blur-xl z-30 flex flex-col`}>
          <div className={`flex items-center ${sidebarOpen ? 'justify-between px-2' : 'justify-center'} h-10 mb-7`}>
            <div className="flex items-center min-w-0 gap-2.5">
              <AppLogo />
              {sidebarOpen && <div className="leading-tight whitespace-nowrap"><div className="font-semibold tracking-[-0.03em]">趣集</div><div className="text-[10px] text-[#86868b] mt-0.5">文化活动协同平台</div></div>}
            </div>
            {sidebarOpen && <button onClick={() => setSidebarOpen(false)} aria-label="收起侧栏" className="w-7 h-7 rounded-full hover:bg-black/[0.05] text-[#86868b] flex items-center justify-center"><PanelLeftClose className="w-4 h-4" /></button>}
          </div>

          {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} aria-label="展开侧栏" className="absolute top-5 -right-3 w-6 h-6 rounded-full bg-white border border-black/[0.08] shadow-sm flex items-center justify-center text-[#86868b]"><ChevronRight className="w-3.5 h-3.5" /></button>}

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button key={item.id} onClick={() => setView(item.id)} className={`w-full h-11 flex items-center rounded-xl text-sm transition-all duration-200 group ${sidebarOpen ? 'px-3 gap-3' : 'justify-center'} ${active ? 'bg-[#1d1d1f] text-white shadow-[0_4px_10px_rgba(0,0,0,0.10)]' : 'text-[#515154] hover:bg-black/[0.045] hover:text-[#1d1d1f]'}`}>
                  <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                  {sidebarOpen && <span className="font-medium flex-1 text-left">{item.label}</span>}
                  {sidebarOpen && item.badge ? <span className={`min-w-5 h-5 px-1 flex items-center justify-center rounded-full text-[10px] font-semibold ${active ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-600'}`}>{item.badge}</span> : null}
                </button>
              );
            })}
          </nav>

          <div className="mt-7 px-2">
            {sidebarOpen && <SmallLabel>管理工具</SmallLabel>}
            <div className={`${sidebarOpen ? 'mt-2' : 'mt-1'} space-y-1`}>
              <button onClick={() => showToast('演示环境：通知中心暂不接入真实消息。')} className={`w-full h-10 flex items-center rounded-xl text-sm text-[#515154] hover:bg-black/[0.045] ${sidebarOpen ? 'px-3 gap-3' : 'justify-center'}`}><Bell className="w-[18px] h-[18px]" strokeWidth={1.8} />{sidebarOpen && <span>通知中心</span>}</button>
              <button onClick={() => showToast('演示环境：系统设置由技术团队后续接入。')} className={`w-full h-10 flex items-center rounded-xl text-sm text-[#515154] hover:bg-black/[0.045] ${sidebarOpen ? 'px-3 gap-3' : 'justify-center'}`}><Layers3 className="w-[18px] h-[18px]" strokeWidth={1.8} />{sidebarOpen && <span>系统设置</span>}</button>
            </div>
          </div>

          <div className={`mt-auto apple-card bg-white/80 p-2.5 ${!sidebarOpen && 'p-1.5 bg-transparent border-0 shadow-none'}`}>
            <div className={`flex items-center ${sidebarOpen ? 'gap-2.5' : 'justify-center'}`}>
              <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-[#c9a889] to-[#715e4d] text-white text-xs font-semibold flex items-center justify-center">王</div>
              {sidebarOpen && <div className="min-w-0 flex-1"><div className="text-xs font-semibold truncate">王处长</div><div className="text-[10px] text-[#86868b] truncate">乌鲁木齐文旅局</div></div>}
              {sidebarOpen && <button onClick={() => showToast('演示环境：登录状态保持不变。')} className="text-[#86868b] hover:text-[#1d1d1f]"><LogOut className="w-4 h-4" /></button>}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 px-5 lg:px-9 py-5 lg:py-7 overflow-hidden">
          {/* Header */}
          <header className="h-12 flex items-center justify-between mb-7">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden w-9 h-9 rounded-full hover:bg-black/[0.05] flex items-center justify-center"><Menu className="w-5 h-5" /></button>
              <div>
                <div className="flex items-center gap-2"><h1 className="text-[22px] leading-6 font-semibold tracking-[-0.04em]">{selectedMeta.title}</h1><span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-blue-50 text-[#0071e3] text-[10px] font-semibold border border-blue-100">{selectedMeta.tag}</span></div>
                <p className="hidden sm:block mt-1 text-xs text-[#86868b]">{selectedMeta.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-full bg-white border border-black/[0.06] p-0.5 text-[11px] text-[#515154]">
                <span className="px-2 py-0.5 rounded-full bg-[#1d1d1f] text-white font-medium">中文</span>
                <button onClick={() => showToast('已预留维吾尔语界面规范与词条映射。')} className="px-2 py-0.5 hover:text-[#1d1d1f] transition-colors">ئۇيغۇرچە</button>
              </div>
              <div className="hidden md:flex items-center gap-2 px-3 h-9 rounded-full bg-white border border-black/[0.06] text-xs text-[#515154] shadow-[0_1px_2px_rgba(0,0,0,0.02)]"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" />试点环境运行正常</div>
              <button onClick={() => showToast('通知中心：暂无待处理系统预警。')} aria-label="通知" className="relative w-9 h-9 rounded-full bg-white border border-black/[0.06] hover:bg-[#f5f5f7] flex items-center justify-center"><Bell className="w-4 h-4" /><span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-rose-500" /></button>
            </div>
          </header>

          {view === 'overview' && <OverviewView events={events} submissions={submissions} pendingCount={pendingCount} flaggedCount={flaggedCount} reviewedCount={reviewedCount} verifiedRate={verifiedRate} logs={logs} onNavigate={setView} onOpenSubmission={setSelectedSubmission} onOpenEvent={setSelectedEvent} />}
          {view === 'events' && <EventsView events={events} onOpenEvent={setSelectedEvent} onCreate={() => showToast('已打开演示创建流程；正式版将由主办方账号提交。')} />}
          {view === 'submissions' && <SubmissionsView filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} displayed={displayedSubmissions} onOpen={setSelectedSubmission} />}
          {view === 'access' && <AccessView logs={logs} onOpenRequest={() => setAccessPanel(true)} onExport={() => showToast('演示版：已生成不含个人敏感信息的审计日志导出任务。')} />}
          {view === 'analytics' && <AnalyticsView events={events} submissions={submissions} onExport={() => showToast('已生成试点复盘脱敏汇总表。')} />}
        </main>
      </div>

      {/* Submission Detail Drawer */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button aria-label="关闭审核详情" onClick={() => setSelectedSubmission(null)} className="absolute inset-0 bg-black/25 backdrop-blur-[1px]" />
          <section className="relative w-full max-w-[620px] h-full bg-[#fbfbfd] shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 z-10 px-6 py-4 bg-white/85 backdrop-blur-xl border-b border-black/[0.06] flex justify-between items-center">
              <div className="flex items-center gap-2"><button onClick={() => setSelectedSubmission(null)} className="w-8 h-8 rounded-full hover:bg-black/[0.05] flex items-center justify-center"><X className="w-4 h-4" /></button><div><div className="text-sm font-semibold">提报审核详情</div><div className="text-[10px] text-[#86868b] font-mono">{selectedSubmission.id}</div></div></div>
              <StatusBadge status={selectedSubmission.auditStatus} />
            </div>
            <div className="p-6 space-y-5">
              <div className="apple-card p-4 bg-gradient-to-br from-white to-[#f5f7ff]">
                <div className="flex items-start gap-4">
                  <img src={selectedSubmission.referenceImage} alt={`${selectedSubmission.characterName}参考图`} className="w-[124px] h-[156px] object-cover rounded-xl shadow-sm border border-black/[0.06]" />
                  <div className="flex-1 min-w-0"><SmallLabel>用户端 Coser 信息提报</SmallLabel><h2 className="mt-1 text-xl font-semibold tracking-[-0.04em]">{selectedSubmission.characterName}</h2><p className="mt-1 text-xs text-[#86868b]">{selectedSubmission.eventName}</p><div className="flex flex-wrap gap-1.5 mt-3">{selectedSubmission.tags.map(tag => <span key={tag} className="px-2 py-1 bg-white text-[10px] text-[#515154] rounded-full border border-black/[0.06]">{tag}</span>)}</div></div>
                </div>
              </div>

              <section className="apple-card p-4">
                <div className="flex items-center gap-2 mb-3"><FileCheck2 className="w-4 h-4 text-[#0071e3]" /><h3 className="font-semibold text-sm">提报内容</h3><span className="ml-auto text-[10px] text-[#86868b]">来自用户端已支付订单</span></div>
                <div className="text-xs"><div className="flex justify-between pb-3 border-b border-black/[0.06]"><span className="text-[#86868b]">订单编号</span><span className="font-mono text-[#515154]">{selectedSubmission.orderNo}</span></div><div className="py-3 border-b border-black/[0.06]"><div className="text-[#86868b] mb-1">服装及道具描述</div><p className="text-[#1d1d1f] leading-6">{selectedSubmission.costumeDesc}</p></div><div className="flex justify-between pt-3"><span className="text-[#86868b]">提报时间</span><span>{selectedSubmission.submittedAt}</span></div></div>
              </section>

              <section className="apple-card p-4">
                <div className="flex items-center gap-2 mb-3"><LockKeyhole className="w-4 h-4 text-[#0071e3]" /><h3 className="font-semibold text-sm">实名认证与隐私保护</h3></div>
                <div className="grid grid-cols-2 gap-3 text-xs"><div className="p-3 rounded-xl bg-[#f5f5f7]"><div className="text-[#86868b] text-[10px] mb-1">实名状态</div><div className="font-semibold flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />实名认证通过</div></div><div className="p-3 rounded-xl bg-[#f5f5f7]"><div className="text-[#86868b] text-[10px] mb-1">人脸核验</div><div className="font-semibold flex items-center gap-1.5"><ScanFace className="w-3.5 h-3.5 text-emerald-600" />活体比对完成</div></div><div className="p-3 rounded-xl bg-[#f5f5f7]"><div className="text-[#86868b] text-[10px] mb-1">实名姓名</div><div className="font-medium">{selectedSubmission.realName}</div></div><div className="p-3 rounded-xl bg-[#f5f5f7]"><div className="text-[#86868b] text-[10px] mb-1">证件号码</div><div className="font-mono text-[11px]">{selectedSubmission.idCardMasked}</div></div></div>
                <p className="mt-3 text-[10px] text-[#86868b] leading-4">平台仅展示脱敏认证结果。原始身份证影像与人脸生物特征不在该业务界面保留；个人信息调阅须通过“合规调阅”独立流程。</p>
              </section>

              <section className="apple-card p-4">
                <div className="flex items-center gap-2 mb-3"><ShieldAlert className="w-4 h-4 text-[#0071e3]" /><h3 className="font-semibold text-sm">审核处置</h3><span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full ${selectedSubmission.riskLevel === 'high' ? 'bg-rose-50 text-rose-700' : selectedSubmission.riskLevel === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{selectedSubmission.riskLevel === 'high' ? '高关注' : selectedSubmission.riskLevel === 'medium' ? '常规核验' : '低风险'}</span></div>
                {selectedSubmission.auditReason && <div className="p-3 rounded-xl bg-amber-50 text-amber-900 text-xs leading-5 mb-3"><strong>当前意见：</strong>{selectedSubmission.auditReason}</div>}
                <textarea value={auditNote} onChange={(e) => setAuditNote(e.target.value)} placeholder="填写审核意见（可选；将随状态同步至主办方与用户端）" rows={3} className="w-full p-3 rounded-xl bg-[#f5f5f7] border border-transparent focus:border-[#0071e3] focus:bg-white outline-none text-xs resize-none" />
                <div className="flex gap-2 mt-3"><button onClick={() => updateSubmissionStatus('approved')} className="flex-1 h-10 apple-button-primary text-xs flex items-center justify-center gap-1.5"><Check className="w-3.5 h-3.5" />通过初核</button><button onClick={() => updateSubmissionStatus('flagged')} className="px-3 h-10 rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 text-xs font-medium">协同核验</button><button onClick={() => updateSubmissionStatus('rejected')} className="px-3 h-10 rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#515154] text-xs font-medium">退回</button></div>
              </section>
              <p className="text-[10px] text-[#86868b] leading-4 text-center">本处置为活动组织辅助初核。主办方仍需依据本场活动规则进行最终确认，并于入场时完成现场核验。</p>
            </div>
          </section>
        </div>
      )}

      {/* Event Detail Drawer */}
      {selectedEvent && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button aria-label="关闭活动详情" onClick={() => setSelectedEvent(null)} className="absolute inset-0 bg-black/25 backdrop-blur-[1px]" />
          <section className="relative w-full max-w-[620px] h-full bg-[#fbfbfd] shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 z-10 px-6 py-4 bg-white/85 backdrop-blur-xl border-b border-black/[0.06] flex justify-between items-center"><div className="flex items-center gap-2"><button onClick={() => setSelectedEvent(null)} className="w-8 h-8 rounded-full hover:bg-black/[0.05] flex items-center justify-center"><X className="w-4 h-4" /></button><div><div className="text-sm font-semibold">活动电子档案</div><div className="text-[10px] text-[#86868b] font-mono">{selectedEvent.id}</div></div></div><EventBadge status={selectedEvent.status} /></div>
            <div className="p-6 space-y-5">
              <div className="rounded-2xl bg-gradient-to-br from-[#2525a0] via-[#4e4bb6] to-[#076dce] p-5 text-white relative overflow-hidden"><div className="absolute -right-8 -bottom-12 w-44 h-44 rounded-full bg-white/10" /><SmallLabel><span className="text-white/60">活动信息归集</span></SmallLabel><h2 className="relative mt-2 text-xl leading-7 font-semibold tracking-[-0.04em]">{selectedEvent.name}</h2><div className="relative mt-4 flex flex-wrap gap-1.5">{selectedEvent.tags.map(tag => <span key={tag} className="px-2 py-1 bg-white/15 backdrop-blur rounded-full text-[10px]">{tag}</span>)}</div></div>
              <section className="apple-card p-4 text-xs space-y-3"><div className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-[#0071e3]" /><h3 className="font-semibold text-sm">主办方提交信息</h3></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="p-3 bg-[#f5f5f7] rounded-xl"><div className="text-[10px] text-[#86868b] mb-1">活动时间</div><div className="font-medium">{selectedEvent.date}</div></div><div className="p-3 bg-[#f5f5f7] rounded-xl"><div className="text-[10px] text-[#86868b] mb-1">活动地点</div><div className="font-medium">{selectedEvent.location}</div></div><div className="p-3 bg-[#f5f5f7] rounded-xl"><div className="text-[10px] text-[#86868b] mb-1">主办单位</div><div className="font-medium">{selectedEvent.organizer}</div></div><div className="p-3 bg-[#f5f5f7] rounded-xl"><div className="text-[10px] text-[#86868b] mb-1">活动类别</div><div className="font-medium">{selectedEvent.type}</div></div></div></section>
              <section className="apple-card p-4 text-xs"><div className="flex items-center gap-2 mb-3"><ClipboardList className="w-4 h-4 text-[#0071e3]" /><h3 className="font-semibold text-sm">组织规则与材料清单</h3></div><div className="space-y-2"><div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f5f5f7]"><span>入场参与规则与禁止事项</span><span className="text-emerald-700 font-medium flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />已提交</span></div><div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f5f5f7]"><span>现场安全服务与应急联络方案</span><span className={selectedEvent.status === 'pending' ? 'text-amber-700 font-medium' : 'text-emerald-700 font-medium'}>{selectedEvent.status === 'pending' ? '待补充联系人' : '已归档'}</span></div><div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f5f5f7]"><span>角色服装 / 道具登记规则</span><span className="text-emerald-700 font-medium flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />已配置</span></div></div></section>
              {selectedEvent.status === 'pending' && <section className="apple-card p-4"><div className="flex items-center gap-2 mb-2"><Info className="w-4 h-4 text-amber-600" /><h3 className="font-semibold text-sm">审核操作</h3></div><p className="text-xs text-[#515154] leading-5 mb-3">说明：该工作流用于平台服务与资料协同，不替代政府行政审批。建议核对活动基础资料、规则与安全服务安排是否完整。</p><div className="flex gap-2"><button onClick={() => updateEventStatus('published')} className="flex-1 h-10 apple-button-primary text-xs flex items-center justify-center gap-1"><Check className="w-3.5 h-3.5" />完成材料审核</button><button onClick={() => updateEventStatus('draft')} className="px-4 h-10 apple-button-secondary text-xs">退回补充</button></div></section>}
            </div>
          </section>
        </div>
      )}

      {/* Access request dialog */}
      {accessPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><button aria-label="关闭调阅申请" onClick={() => setAccessPanel(false)} className="absolute inset-0 bg-black/30 backdrop-blur-sm" /><section className="relative w-full max-w-[520px] bg-white rounded-[22px] shadow-2xl p-6 animate-in zoom-in-95 duration-200"><div className="flex items-start justify-between"><div><div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0071e3] flex items-center justify-center mb-3"><ShieldCheck className="w-5 h-5" /></div><h2 className="text-lg font-semibold tracking-[-0.03em]">发起受控调阅</h2><p className="mt-1 text-xs text-[#86868b] leading-5">将按“最小必要、用途限定、全程留痕”原则生成临时查看会话，不支持批量下载原始个人信息。</p></div><button onClick={() => setAccessPanel(false)} className="w-8 h-8 rounded-full hover:bg-black/[0.05] flex items-center justify-center"><X className="w-4 h-4" /></button></div><div className="mt-5 space-y-4"><div><label className="text-xs font-medium">调阅范围</label><div className="mt-2 grid grid-cols-1 gap-2">{['活动档案与脱敏统计', '角色服装道具提报（脱敏）', '高关注协同核验清单'].map(scope => <button key={scope} onClick={() => setAccessScope(scope)} className={`w-full p-3 rounded-xl text-left text-xs border transition-all ${accessScope === scope ? 'border-[#0071e3] bg-blue-50 text-[#005bb8]' : 'border-black/[0.08] hover:bg-[#f5f5f7]'}`}><span className="flex items-center gap-2"><span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${accessScope === scope ? 'border-[#0071e3] bg-[#0071e3]' : 'border-[#b0b0b5]'}`}>{accessScope === scope && <Check className="w-2.5 h-2.5 text-white" />}</span>{scope}</span></button>)}</div></div><div><label className="text-xs font-medium">业务事由 <span className="text-rose-500">*</span></label><textarea value={accessReason} onChange={(e) => setAccessReason(e.target.value)} placeholder="例如：节前试点活动运行情况例行指导检查" rows={3} className="mt-2 w-full p-3 rounded-xl bg-[#f5f5f7] focus:bg-white border border-transparent focus:border-[#0071e3] outline-none text-xs resize-none" /></div><div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-[11px] text-amber-900"><LockKeyhole className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span>该操作将生成审计日志，记录操作人、范围、事由、时间与IP。请勿以调阅功能替代其他法定业务系统。</span></div><button onClick={submitAccessRequest} className="w-full h-11 apple-button-primary text-xs flex items-center justify-center gap-1.5"><ShieldCheck className="w-4 h-4" />确认并生成临时调阅会话</button></div></section></div>
      )}

      {toast && <div className="fixed z-[60] bottom-5 left-1/2 -translate-x-1/2 px-4 py-3 rounded-2xl apple-glass-dark text-white text-xs shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200"><CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}</div>}
    </div>
  );
}

function OverviewView({ events, submissions, pendingCount, flaggedCount, reviewedCount, verifiedRate, logs, onNavigate, onOpenSubmission, onOpenEvent }: { events: EventRecord[]; submissions: CoserSubmission[]; pendingCount: number; flaggedCount: number; reviewedCount: number; verifiedRate: number; logs: AccessLog[]; onNavigate: (view: View) => void; onOpenSubmission: (sub: CoserSubmission) => void; onOpenEvent: (event: EventRecord) => void }) {
  const focusSubmissions = submissions.filter(item => item.auditStatus === 'pending' || item.auditStatus === 'flagged').slice(0, 4);
  return <div className="max-w-[1440px] mx-auto space-y-6">
    <section className="grid grid-cols-1 xl:grid-cols-[1.45fr_1fr] gap-5">
      <div className="relative overflow-hidden rounded-[24px] bg-[#1d1d1f] text-white p-6 lg:p-7 min-h-[238px] shadow-[0_20px_50px_rgba(0,0,0,0.13)]">
        <div className="absolute -right-12 -top-16 w-[280px] h-[280px] rounded-full bg-[radial-gradient(circle,rgba(85,162,255,0.38),rgba(85,162,255,0)_67%)]" />
        <div className="absolute right-20 bottom-[-90px] w-[220px] h-[220px] rounded-full border-[30px] border-white/[0.05]" />
        <div className="relative flex flex-col h-full"><div className="flex items-center gap-2 text-[11px] text-blue-200"><span className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse" />乌鲁木齐 · 试点运行态势</div><div className="mt-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4"><div><h2 className="text-[30px] leading-9 lg:text-[35px] lg:leading-[42px] font-semibold tracking-[-0.055em]">活动组织更顺畅，<br /><span className="text-blue-300">服务协同更清晰。</span></h2><p className="mt-3 text-xs leading-5 text-white/55 max-w-[430px]">以活动服务为主线，连接主办方资料归集、角色服装辅助初核、现场核验与受控合规调阅。</p></div><button onClick={() => onNavigate('events')} className="shrink-0 h-9 px-4 rounded-full bg-white text-[#1d1d1f] hover:bg-blue-50 text-xs font-medium flex items-center gap-1.5">进入活动管理 <ArrowUpRight className="w-3.5 h-3.5" /></button></div><div className="mt-auto pt-5 flex gap-6 border-t border-white/[0.1] text-xs"><div><div className="text-white/50">试点活动</div><div className="mt-1 text-lg font-semibold">{events.length}<span className="text-xs font-normal text-white/50 ml-1">场</span></div></div><div><div className="text-white/50">参与人次</div><div className="mt-1 text-lg font-semibold">6,122<span className="text-xs font-normal text-white/50 ml-1">人</span></div></div><div><div className="text-white/50">运行状态</div><div className="mt-1 text-lg font-semibold text-emerald-300">正常</div></div></div></div>
      </div>
      <div className="apple-card p-5 lg:p-6 flex flex-col">
        <div className="flex justify-between items-center"><div><SmallLabel>文旅工作提示</SmallLabel><h3 className="mt-1 text-lg font-semibold tracking-[-0.035em]">本周需关注</h3></div><div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Bell className="w-4.5 h-4.5" /></div></div><div className="mt-4 divide-y divide-black/[0.06]"><div className="py-3 flex gap-3"><div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 shrink-0 flex items-center justify-center"><ShieldAlert className="w-3.5 h-3.5" /></div><div className="min-w-0"><p className="text-xs font-medium">{flaggedCount || 1} 条角色/道具提报需协同核验</p><p className="mt-1 text-[11px] text-[#86868b]">涉及拟真装备或道具尺寸描述异常</p></div><button onClick={() => onNavigate('submissions')} className="ml-auto text-[11px] text-[#0071e3] whitespace-nowrap">去处理</button></div><div className="py-3 flex gap-3"><div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 shrink-0 flex items-center justify-center"><FileText className="w-3.5 h-3.5" /></div><div className="min-w-0"><p className="text-xs font-medium">1 场活动资料待完善</p><p className="mt-1 text-[11px] text-[#86868b]">需补充现场安全服务联络人</p></div><button onClick={() => onNavigate('events')} className="ml-auto text-[11px] text-[#0071e3] whitespace-nowrap">查看</button></div></div><p className="mt-auto pt-3 text-[10px] text-[#86868b]">提示仅用于服务协同与运营指导；不替代行政审批、监管执法职责。</p>
      </div>
    </section>

    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard label="待初核提报" value={pendingCount.toString().padStart(2, '0')} unit="项" detail="来自用户端的已支付 Coser 订单" icon={<ClipboardCheck className="w-4 h-4" />} tint="blue" />
      <MetricCard label="协同核验" value={flaggedCount.toString().padStart(2, '0')} unit="项" detail="需现场安保联动确认" icon={<ShieldAlert className="w-4 h-4" />} tint="rose" />
      <MetricCard label="已完成处置" value={reviewedCount.toString().padStart(2, '0')} unit="项" detail="本日审核工作量" icon={<CheckCircle2 className="w-4 h-4" />} tint="green" />
      <MetricCard label="认证闭环率" value={verifiedRate.toString()} unit="%" detail="实名+活体比对+订单关联" icon={<UserRoundCheck className="w-4 h-4" />} tint="purple" />
    </section>

    <section className="grid grid-cols-1 xl:grid-cols-[1.38fr_0.9fr] gap-5">
      <div className="apple-card overflow-hidden"><div className="px-5 pt-5 flex items-start justify-between"><div><SmallLabel>审核工作台</SmallLabel><h3 className="mt-1 text-lg font-semibold tracking-[-0.035em]">待处理角色与服装提报</h3><p className="mt-1 text-xs text-[#86868b]">用户端字段、实名状态与参考图已统一归集。</p></div><button onClick={() => onNavigate('submissions')} className="h-8 px-3 apple-button-secondary text-xs">查看全部</button></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead><tr className="bg-[#f5f5f7] text-[10px] text-[#86868b] uppercase tracking-[0.08em]"><th className="font-medium px-5 py-3">提报对象</th><th className="font-medium py-3">风险提示</th><th className="font-medium py-3">实名 / 活体</th><th className="font-medium py-3">状态</th><th className="font-medium pr-6 py-3 text-right">操作</th></tr></thead><tbody className="divide-y divide-black/[0.06]">{focusSubmissions.map(sub => <tr key={sub.id} className="hover:bg-[#f7f9ff] transition-colors"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><img src={sub.referenceImage} alt="参考图" className="w-9 h-9 rounded-lg object-cover" /><div><div className="text-xs font-semibold">{sub.characterName}</div><div className="mt-0.5 text-[10px] text-[#86868b]">{sub.realName} · {sub.orderNo.slice(-6)}</div></div></div></td><td className="py-3.5"><span className={`text-[10px] ${sub.riskLevel === 'high' ? 'text-rose-600' : sub.riskLevel === 'medium' ? 'text-amber-700' : 'text-emerald-700'}`}>{sub.riskLevel === 'high' ? '● 高关注道具' : sub.riskLevel === 'medium' ? '● 常规现场核验' : '● 低风险'}</span></td><td className="py-3.5"><span className="inline-flex items-center gap-1 text-[10px] text-emerald-700"><CheckCircle2 className="w-3 h-3" />已通过</span></td><td className="py-3.5"><StatusBadge status={sub.auditStatus} /></td><td className="pr-6 py-3.5 text-right"><button onClick={() => onOpenSubmission(sub)} className="text-[#0071e3] text-xs font-medium hover:underline whitespace-nowrap">去审核</button></td></tr>)}</tbody></table></div></div>
      <div className="apple-card p-5 flex flex-col"><div className="flex items-center justify-between"><div><SmallLabel>合规服务</SmallLabel><h3 className="mt-1 text-lg font-semibold tracking-[-0.035em]">受控调阅动态</h3></div><button onClick={() => onNavigate('access')} className="text-[#0071e3] text-xs font-medium">完整日志</button></div><div className="mt-4 space-y-3">{logs.slice(0, 3).map((log, index) => <div key={log.id} className="relative pl-5"><span className={`absolute left-0 top-1.5 w-2 h-2 rounded-full ${index === 0 ? 'bg-[#0071e3]' : 'bg-[#d2d2d7]'}`} /><div className="text-xs font-medium leading-5">{log.action}</div><p className="mt-0.5 text-[10px] leading-4 text-[#86868b]">{log.department} · {log.timestamp}</p></div>)}</div><div className="mt-auto pt-4 border-t border-black/[0.06]"><div className="flex items-start gap-2 text-[10px] leading-4 text-[#86868b]"><LockKeyhole className="w-3.5 h-3.5 shrink-0 text-[#0071e3]" />个人信息类数据调阅须经独立授权并留痕，默认仅可见脱敏与汇总信息。</div></div></div>
    </section>

    <section className="apple-card overflow-hidden"><div className="px-5 pt-5 flex justify-between items-start"><div><SmallLabel>活动电子档案</SmallLabel><h3 className="mt-1 text-lg font-semibold tracking-[-0.035em]">试点活动进度</h3></div><button onClick={() => onNavigate('events')} className="text-[#0071e3] text-xs font-medium">全部活动 <ArrowUpRight className="w-3 h-3 inline ml-0.5" /></button></div><div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-black/[0.06]">{events.map(event => <button key={event.id} onClick={() => onOpenEvent(event)} className="text-left p-5 hover:bg-[#f7f9ff] transition-colors"><div className="flex justify-between gap-3"><EventBadge status={event.status} /><span className="text-[10px] text-[#86868b]">{event.updated}</span></div><h4 className="mt-3 text-sm font-semibold leading-5 line-clamp-2">{event.name}</h4><p className="mt-2 text-[11px] text-[#86868b] truncate">{event.date}</p><div className="mt-4 flex items-center gap-3 text-[10px] text-[#515154]"><span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{event.attendeeCount || '待发布'}</span><span className="flex items-center gap-1"><ClipboardCheck className="w-3.5 h-3.5" />{event.coserCount || '—'}</span></div></button>)}</div></section>
  </div>;
}

function MetricCard({ label, value, unit, detail, icon, tint }: { label: string; value: string; unit: string; detail: string; icon: React.ReactNode; tint: 'blue' | 'rose' | 'green' | 'purple' }) {
  const tintClass = { blue: 'bg-blue-50 text-[#0071e3]', rose: 'bg-rose-50 text-rose-600', green: 'bg-emerald-50 text-emerald-600', purple: 'bg-violet-50 text-violet-600' }[tint];
  return <div className="apple-card p-4 lg:p-5"><div className="flex justify-between items-start"><SmallLabel>{label}</SmallLabel><div className={`w-8 h-8 rounded-xl flex items-center justify-center ${tintClass}`}>{icon}</div></div><div className="mt-4"><span className="text-[28px] leading-7 font-semibold tracking-[-0.05em]">{value}</span><span className="ml-1 text-xs text-[#86868b]">{unit}</span></div><p className="mt-2 text-[10px] leading-4 text-[#86868b]">{detail}</p></div>;
}

function EventsView({ events, onOpenEvent, onCreate }: { events: EventRecord[]; onOpenEvent: (event: EventRecord) => void; onCreate: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = events.filter(event => !search || [event.name, event.organizer, event.type].some(v => v.toLowerCase().includes(search.toLowerCase())));
  return <div className="max-w-[1440px] mx-auto space-y-5"><section className="apple-card p-4 flex flex-col lg:flex-row gap-3 lg:items-center justify-between"><div className="flex flex-col sm:flex-row gap-2"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索活动名称、主办方或类别" className="w-full sm:w-[280px] h-10 pl-9 pr-3 rounded-xl bg-[#f5f5f7] border border-transparent focus:bg-white focus:border-[#0071e3] outline-none text-xs" /></div><button className="h-10 px-3 rounded-xl bg-[#f5f5f7] hover:bg-[#e8e8ed] text-xs text-[#515154] flex items-center justify-center gap-1.5"><ListFilter className="w-3.5 h-3.5" />状态筛选<ChevronDown className="w-3.5 h-3.5" /></button></div><button onClick={onCreate} className="h-10 px-4 apple-button-primary text-xs flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" />新建活动档案</button></section><section className="apple-card overflow-hidden"><div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between"><div><h2 className="text-sm font-semibold">活动档案库</h2><p className="mt-1 text-[11px] text-[#86868b]">主办方线上填报，平台提供资料归集、规则配置和流程协同。</p></div><span className="text-[11px] text-[#86868b]">共 {filtered.length} 条</span></div><div className="overflow-x-auto"><table className="min-w-[970px] w-full text-left"><thead><tr className="bg-[#f5f5f7] text-[10px] text-[#86868b] uppercase tracking-[0.08em]"><th className="px-5 py-3 font-medium">活动名称</th><th className="py-3 font-medium">时间与地点</th><th className="py-3 font-medium">主办单位</th><th className="py-3 font-medium">参与与提报</th><th className="py-3 font-medium">状态</th><th className="px-5 py-3 text-right font-medium">操作</th></tr></thead><tbody className="divide-y divide-black/[0.06]">{filtered.map(event => <tr key={event.id} className="hover:bg-[#f7f9ff] transition-colors"><td className="px-5 py-4"><div className="text-xs font-semibold max-w-[260px] leading-5">{event.name}</div><div className="mt-1 flex gap-1 flex-wrap">{event.tags.slice(0, 2).map(tag => <span key={tag} className="text-[10px] text-[#86868b]">#{tag}</span>)}</div></td><td className="py-4"><div className="text-xs">{event.date}</div><div className="mt-1 text-[10px] text-[#86868b]">{event.location}</div></td><td className="py-4 text-xs">{event.organizer}</td><td className="py-4"><div className="text-xs font-medium">{event.attendeeCount ? `${event.attendeeCount.toLocaleString()} 人` : '尚未开放'}</div><div className="mt-1 text-[10px] text-[#86868b]">Coser 提报 {event.submissionCount || 0} 份</div></td><td className="py-4"><EventBadge status={event.status} /></td><td className="px-5 py-4 text-right"><button onClick={() => onOpenEvent(event)} className="h-8 px-3 rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] text-xs text-[#515154]">查看档案</button></td></tr>)}</tbody></table></div></section><section className="grid grid-cols-1 md:grid-cols-3 gap-4"><InfoStrip icon={<Building2 className="w-4 h-4" />} title="主办方工作台" content="提供活动基本信息、资料上传、现场组织计划与规则维护入口。" /><InfoStrip icon={<ClipboardCheck className="w-4 h-4" />} title="活动服务审核" content="对资料完整性、入场规则和服务流程提供辅助审核与协同提示。" /><InfoStrip icon={<Archive className="w-4 h-4" />} title="电子档案归集" content="按活动形成可回溯档案，为试点复盘与运营优化提供依据。" /></section></div>;
}

function SubmissionsView({ filter, setFilter, search, setSearch, displayed, onOpen }: { filter: AuditFilter; setFilter: (filter: AuditFilter) => void; search: string; setSearch: (search: string) => void; displayed: CoserSubmission[]; onOpen: (sub: CoserSubmission) => void }) {
  const filters: { id: AuditFilter; label: string }[] = [{ id: 'all', label: '全部' }, { id: 'pending', label: '待审核' }, { id: 'flagged', label: '协同核验' }, { id: 'approved', label: '已通过' }, { id: 'rejected', label: '已退回' }];
  return <div className="max-w-[1440px] mx-auto space-y-5"><section className="grid grid-cols-1 xl:grid-cols-[1.7fr_0.8fr] gap-5"><div className="apple-card p-5"><div className="flex items-center gap-2"><div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0071e3] flex items-center justify-center"><Network className="w-4 h-4" /></div><div><SmallLabel>用户端 → 后台字段映射</SmallLabel><h2 className="mt-0.5 text-sm font-semibold">Coser 提报审核闭环</h2></div></div><div className="mt-5 grid grid-cols-4 gap-2 text-center"><ProcessStep icon={<Ticket className="w-4 h-4" />} title="购票下单" label="订单关联" /><ProcessArrow /><ProcessStep icon={<ScanFace className="w-4 h-4" />} title="实名核验" label="脱敏结果" /><ProcessArrow /><ProcessStep icon={<Camera className="w-4 h-4" />} title="角色提报" label="图文材料" /><ProcessArrow /><ProcessStep icon={<ClipboardCheck className="w-4 h-4" />} title="辅助初核" label="主办方确认" /></div><p className="mt-5 text-[11px] leading-5 text-[#86868b]">用户端的票务、实名认证、人脸核验、角色名称、服装道具描述和参考图均以事件化数据进入后台；后台仅展示业务必要的脱敏字段，审核意见会同步回主办方和用户端状态。</p></div><div className="apple-card p-5 bg-gradient-to-br from-[#f5f7ff] to-white"><div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#0071e3]" /><h3 className="text-sm font-semibold">审核边界提示</h3></div><p className="mt-3 text-[11px] text-[#515154] leading-5">此处仅进行活动组织辅助初核：核对服装、道具与活动规则是否匹配。最终入场以主办方现场核验为准；不在平台内替代任何行政审批或执法流程。</p></div></section><section className="apple-card overflow-hidden"><div className="p-4 border-b border-black/[0.06] flex flex-col lg:flex-row gap-3 lg:items-center justify-between"><div className="flex gap-1.5 overflow-x-auto pb-1 lg:pb-0">{filters.map(item => <button key={item.id} onClick={() => setFilter(item.id)} className={`h-8 px-3 rounded-full text-xs whitespace-nowrap transition-colors ${filter === item.id ? 'bg-[#1d1d1f] text-white' : 'bg-[#f5f5f7] text-[#515154] hover:bg-[#e8e8ed]'}`}>{item.label}</button>)}</div><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索姓名、角色、订单号、活动" className="w-full lg:w-[280px] h-9 pl-9 pr-3 rounded-xl bg-[#f5f5f7] border border-transparent focus:bg-white focus:border-[#0071e3] outline-none text-xs" /></div></div><div className="overflow-x-auto"><table className="min-w-[1000px] w-full text-left"><thead><tr className="bg-[#f5f5f7] text-[10px] text-[#86868b] uppercase tracking-[0.08em]"><th className="px-5 py-3 font-medium">角色 / 参考图</th><th className="py-3 font-medium">实名核验</th><th className="py-3 font-medium">服装及道具</th><th className="py-3 font-medium">风险等级</th><th className="py-3 font-medium">状态</th><th className="px-5 py-3 text-right font-medium">操作</th></tr></thead><tbody className="divide-y divide-black/[0.06]">{displayed.map(sub => <tr key={sub.id} className="hover:bg-[#f7f9ff] transition-colors"><td className="px-5 py-3.5"><div className="flex gap-3"><img src={sub.referenceImage} alt="参考图" className="w-10 h-12 rounded-lg object-cover border border-black/[0.06]" /><div><div className="text-xs font-semibold">{sub.characterName}</div><div className="mt-1 text-[10px] text-[#86868b]">{sub.eventName}</div><div className="mt-1 text-[10px] font-mono text-[#86868b]">{sub.id}</div></div></div></td><td className="py-3.5"><div className="text-xs">{sub.realName}</div><div className="mt-1 text-[10px] text-[#86868b] font-mono">{sub.idCardMasked}</div><div className="mt-1 text-[10px] text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />活体比对通过</div></td><td className="py-3.5"><p className="text-[11px] leading-5 text-[#515154] max-w-[280px] line-clamp-2">{sub.costumeDesc}</p><div className="mt-1.5 flex gap-1 flex-wrap">{sub.tags.slice(0, 2).map(tag => <span key={tag} className="px-1.5 py-0.5 rounded bg-[#f5f5f7] text-[9px] text-[#515154]">{tag}</span>)}</div></td><td className="py-3.5"><span className={`inline-flex items-center gap-1 text-[10px] ${sub.riskLevel === 'high' ? 'text-rose-600' : sub.riskLevel === 'medium' ? 'text-amber-700' : 'text-emerald-700'}`}><span className="w-1.5 h-1.5 rounded-full bg-current" />{sub.riskLevel === 'high' ? '高关注' : sub.riskLevel === 'medium' ? '常规核验' : '低风险'}</span></td><td className="py-3.5"><StatusBadge status={sub.auditStatus} /></td><td className="px-5 py-3.5 text-right"><button onClick={() => onOpen(sub)} className="text-[#0071e3] text-xs font-medium hover:underline">查看审核</button></td></tr>)}</tbody></table></div>{displayed.length === 0 && <div className="py-16 text-center"><FolderOpen className="mx-auto w-7 h-7 text-[#d2d2d7]" /><p className="mt-3 text-xs text-[#86868b]">没有匹配的提报记录</p></div>}</section></div>;
}

function ProcessStep({ icon, title, label }: { icon: React.ReactNode; title: string; label: string }) { return <div className="min-w-0"><div className="mx-auto w-8 h-8 rounded-xl bg-blue-50 text-[#0071e3] flex items-center justify-center">{icon}</div><div className="mt-2 text-[10px] font-semibold whitespace-nowrap">{title}</div><div className="mt-0.5 text-[9px] text-[#86868b] whitespace-nowrap">{label}</div></div>; }
function ProcessArrow() { return <div className="flex items-start justify-center pt-3 text-[#d2d2d7]"><ChevronRight className="w-4 h-4" /></div>; }

function AccessView({ logs, onOpenRequest, onExport }: { logs: AccessLog[]; onOpenRequest: () => void; onExport: () => void }) {
  return <div className="max-w-[1440px] mx-auto space-y-5"><section className="rounded-[24px] bg-[#102334] text-white p-6 lg:p-7 relative overflow-hidden"><div className="absolute right-[-50px] top-[-80px] w-[280px] h-[280px] rounded-full border-[42px] border-cyan-300/[0.08]" /><div className="relative flex flex-col md:flex-row gap-6 justify-between md:items-end"><div><div className="flex items-center gap-2 text-[11px] text-cyan-200"><LockKeyhole className="w-3.5 h-3.5" />数据分类分级保护</div><h2 className="mt-3 text-[28px] leading-8 font-semibold tracking-[-0.05em]">必要、受控、可追溯的<br /><span className="text-cyan-300">合规调阅服务。</span></h2><p className="mt-3 max-w-[560px] text-xs leading-5 text-white/60">为文旅业务指导提供活动电子档案、脱敏统计与高关注事项的受控查看入口。公安协同仅在依法依规、确有必要时，以最小范围受理。</p></div><button onClick={onOpenRequest} className="shrink-0 h-10 px-4 rounded-full bg-white text-[#102334] hover:bg-cyan-50 text-xs font-medium flex items-center justify-center gap-1.5"><ShieldCheck className="w-4 h-4" />发起受控调阅</button></div></section><section className="grid grid-cols-1 lg:grid-cols-3 gap-4"><InfoStrip icon={<Landmark className="w-4 h-4" />} title="文旅指导（主入口）" content="查看活动档案、运行情况、脱敏参与统计和试点服务复盘材料。" emphasis="常规授权" /><InfoStrip icon={<ShieldAlert className="w-4 h-4" />} title="公安协同（次级入口）" content="仅高关注安全协同事项，按事由、范围和期限发起独立受控申请。" emphasis="最小必要" /><InfoStrip icon={<FileCheck2 className="w-4 h-4" />} title="审计留痕" content="记录操作人、岗位、时间、IP、数据范围、业务事由与导出行为。" emphasis="全量留痕" /></section><section className="apple-card overflow-hidden"><div className="px-5 py-4 border-b border-black/[0.06] flex flex-col sm:flex-row gap-3 sm:items-center justify-between"><div><h2 className="text-sm font-semibold">调阅与审计日志</h2><p className="mt-1 text-[11px] text-[#86868b]">日志不可修改；导出默认剔除原始身份影像、人脸生物特征等敏感原始数据。</p></div><button onClick={onExport} className="h-9 px-3 apple-button-secondary text-xs flex items-center gap-1.5"><Download className="w-3.5 h-3.5" />导出脱敏审计清单</button></div><div className="overflow-x-auto"><table className="min-w-[920px] w-full text-left"><thead><tr className="bg-[#f5f5f7] text-[10px] text-[#86868b] uppercase tracking-[0.08em]"><th className="px-5 py-3 font-medium">时间</th><th className="py-3 font-medium">操作人 / 部门</th><th className="py-3 font-medium">调阅内容</th><th className="py-3 font-medium">业务事由</th><th className="py-3 font-medium">访问来源</th><th className="px-5 py-3 text-right font-medium">状态</th></tr></thead><tbody className="divide-y divide-black/[0.06]">{logs.map(log => <tr key={log.id} className="hover:bg-[#f7f9ff]"><td className="px-5 py-3.5 text-xs whitespace-nowrap">{log.timestamp}</td><td className="py-3.5"><div className="text-xs font-medium">{log.operator}</div><div className="mt-1 text-[10px] text-[#86868b]">{log.department}</div></td><td className="py-3.5"><div className="text-xs max-w-[220px]">{log.action}</div><div className="mt-1 text-[10px] text-[#86868b] font-mono">{log.targetId}</div></td><td className="py-3.5"><p className="text-[11px] max-w-[250px] leading-5 text-[#515154]">{log.reason}</p></td><td className="py-3.5 font-mono text-[10px] text-[#86868b]">{log.ip}</td><td className="px-5 py-3.5 text-right"><span className="inline-flex items-center gap-1 text-[10px] text-emerald-700"><CheckCircle2 className="w-3 h-3" />已留痕</span></td></tr>)}</tbody></table></div></section><section className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex gap-3 text-xs text-amber-900"><Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" /><p className="leading-5">平台定位为活动组织与数字化服务支撑工具。各部门依法履行自身职责，平台不承接、不替代行政审批、监管执法或其他现有政务系统功能。</p></section></div>;
}

function AnalyticsView({ events, submissions, onExport }: { events: EventRecord[]; submissions: CoserSubmission[]; onExport: () => void }) {
  const approved = submissions.filter(item => item.auditStatus === 'approved').length;
  const flagged = submissions.filter(item => item.auditStatus === 'flagged').length;
  const pending = submissions.filter(item => item.auditStatus === 'pending').length;
  const totalAttendees = events.reduce((sum, event) => sum + event.attendeeCount, 0);
  return <div className="max-w-[1440px] mx-auto space-y-5"><section className="apple-card p-5 flex flex-col md:flex-row gap-4 md:items-center justify-between"><div><SmallLabel>试点复盘数据</SmallLabel><h2 className="mt-1 text-lg font-semibold tracking-[-0.035em]">活动服务运行分析</h2><p className="mt-1 text-xs text-[#86868b]">仅展示活动组织服务产生的聚合脱敏数据，用于试点运行复盘。</p></div><button onClick={onExport} className="h-10 px-4 apple-button-primary text-xs flex items-center justify-center gap-1.5"><Download className="w-3.5 h-3.5" />导出脱敏汇总表</button></section><section className="grid grid-cols-1 lg:grid-cols-3 gap-5"><div className="lg:col-span-2 apple-card p-5"><div className="flex justify-between"><div><SmallLabel>活动参与情况</SmallLabel><h3 className="mt-1 text-sm font-semibold">试点活动参与人次趋势</h3></div><span className="text-[11px] text-[#86868b]">2026 Q3</span></div><div className="mt-8 h-[230px] flex items-end gap-5 px-2 border-b border-black/[0.08]">{[38, 58, 46, 75, 65, 88, 78, 100].map((height, index) => <div key={index} className="flex-1 h-full flex flex-col justify-end items-center gap-2"><div className={`w-full max-w-[44px] rounded-t-lg bg-gradient-to-t ${index === 7 ? 'from-[#0071e3] to-[#67b3ff]' : 'from-[#bcdcff] to-[#e7f2ff]'} transition-all hover:opacity-80`} style={{ height: `${height}%` }} /><span className="text-[10px] text-[#86868b]">{index + 1}周</span></div>)}</div><p className="mt-3 text-[10px] text-[#86868b]">数据为演示用模拟汇总，不包含个人身份、联系方式、人脸或支付敏感信息。</p></div><div className="apple-card p-5"><SmallLabel>参与结构</SmallLabel><h3 className="mt-1 text-sm font-semibold">活动用户类型</h3><div className="mt-6 relative w-36 h-36 mx-auto rounded-full" style={{ background: 'conic-gradient(#0071e3 0 62%, #7c6ce7 62% 79%, #31b979 79% 100%)' }}><div className="absolute inset-[18px] rounded-full bg-white flex flex-col items-center justify-center"><span className="text-xl font-semibold tracking-[-0.05em]">6,122</span><span className="text-[9px] text-[#86868b]">参与人次</span></div></div><div className="mt-6 space-y-2 text-[11px]"><LegendDot color="bg-[#0071e3]" label="普通观众" value="62%" /><LegendDot color="bg-[#7c6ce7]" label="角色扮演参与者" value="17%" /><LegendDot color="bg-[#31b979]" label="参展与工作人员" value="21%" /></div></div></section><section className="grid grid-cols-1 lg:grid-cols-3 gap-5"><div className="apple-card p-5"><SmallLabel>角色服装初核</SmallLabel><div className="mt-5 flex items-end gap-2"><span className="text-[34px] leading-8 font-semibold tracking-[-0.06em]">{approved}</span><span className="text-xs text-[#86868b] pb-0.5">项已通过</span></div><div className="mt-5 h-2 rounded-full bg-[#f5f5f7] overflow-hidden flex"><span className="bg-emerald-500" style={{ width: `${Math.max(approved / submissions.length * 100, 8)}%` }} /><span className="bg-amber-400" style={{ width: `${Math.max(pending / submissions.length * 100, 8)}%` }} /><span className="bg-rose-500" style={{ width: `${Math.max(flagged / submissions.length * 100, 8)}%` }} /></div><div className="mt-3 flex gap-3 text-[10px] text-[#86868b]"><span>通过 {approved}</span><span>待审 {pending}</span><span>协同 {flagged}</span></div></div><div className="apple-card p-5"><SmallLabel>活动服务效率</SmallLabel><div className="mt-5 text-[34px] leading-8 font-semibold tracking-[-0.06em]">11<span className="text-sm text-[#86868b] ml-1">min</span></div><p className="mt-3 text-[11px] leading-5 text-[#86868b]">模拟平均：从资料完整提交到主办方首次处理的响应时长。</p></div><div className="apple-card p-5"><SmallLabel>活动资料完整度</SmallLabel><div className="mt-5 text-[34px] leading-8 font-semibold tracking-[-0.06em]">92<span className="text-sm text-[#86868b] ml-1">%</span></div><p className="mt-3 text-[11px] leading-5 text-[#86868b]">活动基本信息、规则清单、人员与现场服务资料的平均归集完整度。</p></div></section></div>;
}

function LegendDot({ color, label, value }: { color: string; label: string; value: string }) { return <div className="flex items-center justify-between"><span className="flex items-center gap-2"><i className={`w-2 h-2 rounded-full ${color}`} />{label}</span><span className="font-medium text-[#515154]">{value}</span></div>; }
function InfoStrip({ icon, title, content, emphasis }: { icon: React.ReactNode; title: string; content: string; emphasis?: string }) { return <div className="apple-card p-4"><div className="flex items-center gap-2 text-[#0071e3]">{icon}<span className="text-xs font-semibold text-[#1d1d1f]">{title}</span>{emphasis && <span className="ml-auto text-[10px] text-[#0071e3] bg-blue-50 px-2 py-0.5 rounded-full">{emphasis}</span>}</div><p className="mt-3 text-[11px] leading-5 text-[#86868b]">{content}</p></div>; }
