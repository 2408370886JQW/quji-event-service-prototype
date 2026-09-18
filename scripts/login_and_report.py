from pathlib import Path
import re

p = Path('/home/ubuntu/quji-event-service-prototype/client/src/pages/Home.tsx')
s = p.read_text()

login_pattern = r'''function Login\(\{ role, setRole, onEnter, locale, setLocale \}: \{ role: Role; setRole: \(role: Role\) => void; onEnter: \(\) => void; locale: Locale; setLocale: \(locale: Locale\) => void \}\) \{.*?\n\}\nfunction LoginMetric'''
login_replacement = '''function Login({ role, setRole, onEnter, locale, setLocale }: { role: Role; setRole: (role: Role) => void; onEnter: () => void; locale: Locale; setLocale: (locale: Locale) => void }) {
  const t = TEXT[locale];
  const [account, setAccount] = useState('linjie@quji.cn');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const roles = Object.entries(ROLE_INFO) as [Role, typeof ROLE_INFO[Role]][];
  const roleLines: Record<Role, [string, string]> = { platform: ['平台运营', '人员'], organizer: ['主办方', '活动运营人员'], culture: ['文旅业务', '指导人员'], collaborator: ['现场协同', '人员'] };
  const noteLines: Record<Role, [string, string]> = { platform: ['配置活动流程 账号权限', '服务运营'], organizer: ['维护活动资料 票务', '现场与参与人员'], culture: ['查看活动电子档案', '服务进度与汇总数据'], collaborator: ['处理现场核验', '异常记录与处置反馈'] };
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!account.trim() || !password.trim()) { setError('请输入账号和密码'); return; } if (password !== '123456') { setError('密码不正确 请使用预置密码 123456'); return; } setError(''); onEnter(); };
  return <div className="relative min-h-screen overflow-hidden bg-[#eef3f3]" dir={locale === 'ug' ? 'rtl' : 'ltr'}>
    <div className="absolute inset-0 overflow-hidden"><div className="login-scenic-background absolute -inset-6" /><div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/52 to-white/26" /><div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_26%,rgba(255,255,255,0.78),transparent_28%)]" /></div>
    <header className="relative z-10 h-20 px-5 sm:px-8 lg:px-12 flex items-center justify-between border-b border-white/60 bg-white/70 backdrop-blur-xl"><Brand /><LocaleSwitch locale={locale} setLocale={setLocale} /></header>
    <main className="relative z-10 max-w-[1220px] w-full mx-auto px-5 py-8 lg:py-12 grid lg:grid-cols-[0.9fr_1.05fr] gap-8 lg:gap-14 items-center"><section className="max-w-[510px] rounded-2xl bg-white/60 backdrop-blur-md border border-white/70 p-6 sm:p-8 shadow-[0_16px_50px_rgba(35,69,87,0.10)]"><Pill tone="blue">新疆 · 多元文化活动协同</Pill><h1 className="mt-5 text-[38px] sm:text-[48px] leading-[1.12] font-semibold tracking-[-0.06em]">一场活动<br />一套完整数字档案</h1><p className="mt-5 text-[17px] leading-7 text-slate-700">以活动为核心对象 连接主办方资料、参与人员、票务、角色服装道具、现场核验与活动归档</p><div className="mt-8 grid grid-cols-3 gap-3"><LoginMetric value="01" label="统一工作台" /><LoginMetric value="09" label="活动档案模块" /><LoginMetric value="全程" label="操作留痕" /></div></section>
      <form onSubmit={submit} className="bg-white/94 border border-white rounded-2xl p-6 lg:p-8 shadow-[0_22px_70px_rgba(35,69,87,0.18)] backdrop-blur-xl"><ModuleTitle eyebrow="角色登录" title={t.roleLogin} description="同一套后台按角色展示可用菜单与业务数据" /><div className="mt-6 grid sm:grid-cols-2 gap-3">{roles.map(([key, item]) => { const Icon = item.icon; const selected = role === key; const [first, second] = roleLines[key]; const [note1, note2] = noteLines[key]; return <button type="button" key={key} onClick={() => { setRole(key); setError(''); }} className={`text-left rounded-xl border p-4 min-h-[138px] transition-colors ${selected ? 'border-[#255ec8] bg-blue-50 ring-1 ring-[#255ec8]' : 'border-slate-200 bg-white/80 hover:border-slate-400'}`}><div className={`w-9 h-9 rounded-lg ${item.color} text-white flex items-center justify-center`}><Icon className="w-5 h-5" /></div><div className="mt-3 text-[16px] leading-5 font-semibold"><span className="block">{first}</span><span className="block">{second}</span></div><div className="mt-2 text-[13px] leading-5 text-slate-600"><span className="block">{note1}</span><span className="block">{note2}</span></div></button>; })}</div><div className="mt-6 grid sm:grid-cols-2 gap-4"><label><span className="text-[14px] font-semibold">账号</span><input value={account} onChange={e => setAccount(e.target.value)} autoComplete="username" className="mt-2 h-11 w-full px-3 rounded-lg bg-slate-50 border border-slate-200 text-[14px] text-slate-800 outline-none focus:border-[#255ec8] focus:bg-white" /></label><label><span className="text-[14px] font-semibold">密码</span><input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete="current-password" className="mt-2 h-11 w-full px-3 rounded-lg bg-slate-50 border border-slate-200 text-[14px] text-slate-800 outline-none focus:border-[#255ec8] focus:bg-white" /></label></div><div className="mt-3 text-[13px] leading-5 text-slate-500">预置账号 linjie@quji.cn<br />预置密码 123456</div>{error && <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</div>}<button type="submit" className="mt-5 w-full h-12 rounded-lg bg-[#255ec8] hover:bg-[#1d4fae] text-white text-[15px] font-semibold flex items-center justify-center gap-2">{t.enter}<ArrowRight className="w-4 h-4" /></button></form></main></div>;
}
function LoginMetric'''
s, count = re.subn(login_pattern, login_replacement, s, flags=re.S)
if count != 1:
    raise SystemExit(f'Login replacement count {count}')

# Move collapse control from the brand header to the lower navigation area.
old_header = '''        <div className={`h-20 ${sidebarCollapsed ? 'px-3 justify-center relative' : 'px-5'} flex items-center border-b border-slate-200`}>
          <Brand mini={sidebarCollapsed} />
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'} className={`${sidebarCollapsed ? 'absolute -right-4 top-6 bg-white border border-slate-200 shadow-sm' : 'ml-auto'} w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600`}>
            <PanelLeftClose className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>'''
new_header = '''        <div className={`h-20 ${sidebarCollapsed ? 'px-3 justify-center' : 'px-5'} flex items-center border-b border-slate-200`}><Brand mini={sidebarCollapsed} /></div>'''
if old_header not in s:
    raise SystemExit('Missing sidebar header')
s = s.replace(old_header, new_header, 1)
needle = '''        <div className="p-3 border-t border-slate-200"><button onClick={() => setNotificationOpen(true)}'''
replace = '''        <div className="p-3 border-t border-slate-200"><button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'} className={`mb-2 w-full h-9 rounded-lg border border-slate-200 flex items-center text-[13px] font-semibold text-slate-600 hover:bg-slate-50 ${sidebarCollapsed ? 'justify-center px-2' : 'px-3 gap-2'}`}><PanelLeftClose className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />{!sidebarCollapsed && <span>收起菜单</span>}</button><button onClick={() => setNotificationOpen(true)}'''
if needle not in s:
    raise SystemExit('Missing sidebar footer')
s = s.replace(needle, replace, 1)

# Replace generic summary action with a visual report preview.
old_activity_start = "function ActivityRecord({ event, tab, setTab, onNavigate }: { event: EventItem; tab: ActivityTab; setTab: (tab: ActivityTab) => void; onNavigate: (page: Page, tab?: ActivityTab) => void }) { const [tabCheckins, setTabCheckins] = useState(0);"
new_activity_start = "function ActivityRecord({ event, tab, setTab, onNavigate }: { event: EventItem; tab: ActivityTab; setTab: (tab: ActivityTab) => void; onNavigate: (page: Page, tab?: ActivityTab) => void }) { const [tabCheckins, setTabCheckins] = useState(0); const [summaryOpen, setSummaryOpen] = useState(false);"
if old_activity_start not in s:
    raise SystemExit('Missing activity state')
s = s.replace(old_activity_start, new_activity_start, 1)
old_button = '<ActionButton label="导出活动摘要" className="h-10 px-4 rounded-lg border border-slate-300 text-[14px] font-semibold" description="将汇集活动概况、进度、待办、票务、现场与问题记录。" />'
new_button = '<button onClick={() => setSummaryOpen(true)} className="h-10 px-4 rounded-lg border border-slate-300 text-[14px] font-semibold flex items-center gap-1.5"><FileText className="w-4 h-4" />导出活动摘要</button>'
if old_button not in s:
    raise SystemExit('Missing summary action')
s = s.replace(old_button, new_button, 1)
needle = "{tab === 'archive' && <ArchivePage compact />}</div>; }"
repl = "{tab === 'archive' && <ArchivePage compact />}{summaryOpen && <ActivitySummaryReport event={event} onClose={() => setSummaryOpen(false)} />}</div>; }"
if needle not in s:
    raise SystemExit('Missing activity tabs ending')
s = s.replace(needle, repl, 1)

insert_anchor = 'function ProgressFlow({ current }: { current: number }) {'
report = '''function ActivitySummaryReport({ event, onClose }: { event: EventItem; onClose: () => void }) { const [downloaded, setDownloaded] = useState(false); const download = () => { const content = `活动摘要\n${event.name} ${event.subtitle}\n活动编号 ${event.id}\n活动阶段 售票中\n已售票 4,662 张\n实名完成 4,484 人\n角色服装道具 326 份申报 2 项协同核验\n异常核验 2 项\n待处理事项 角色道具初核 现场售票点库存 夜间值守联系人`; const blob = new Blob([content], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${event.id}_活动摘要.txt`; a.click(); URL.revokeObjectURL(url); setDownloaded(true); }; return <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"><button onClick={onClose} className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]" /><section className="relative w-full max-w-[900px] max-h-[88vh] overflow-y-auto bg-[#fbfcfe] rounded-2xl shadow-2xl"><div className="sticky top-0 z-10 p-5 bg-white/95 backdrop-blur border-b border-slate-200 flex items-center justify-between"><div><div className="text-[13px] text-slate-500">活动数字档案</div><h2 className="mt-1 text-[21px] font-semibold">活动摘要预览</h2></div><button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="w-5 h-5" /></button></div><div className="p-5 sm:p-7 space-y-5"><section className="bg-white border border-slate-200 rounded-xl p-5"><div className="flex flex-wrap items-center gap-2"><Status status={event.status} /><span className="text-[13px] text-slate-500">{event.id}</span></div><h3 className="mt-4 text-[24px] font-semibold">{event.name}</h3><p className="mt-1 text-[16px] text-slate-600">{event.subtitle}</p><div className="mt-4 grid sm:grid-cols-3 gap-3 text-[14px] text-slate-700"><span className="flex items-center gap-1.5"><Clock3 className="w-4 h-4 text-slate-500" />{event.date}</span><span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-500" />{event.venue}</span><span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-slate-500" />{event.organizer}</span></div></section><section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"><ReportMetric label="已售票" value="4,662 张" /><ReportMetric label="实名完成" value="4,484 人" /><ReportMetric label="现场入场" value="3,218 人" /><ReportMetric label="异常核验" value="2 项" tone="rose" /></section><section className="grid lg:grid-cols-2 gap-5"><div className="bg-white border border-slate-200 rounded-xl p-5"><h3 className="text-[17px] font-semibold">活动生命周期</h3><div className="mt-4 space-y-3"><ReportLine label="已完成" text="活动创建 资料准备 信息核验" tone="green" /><ReportLine label="当前阶段" text="售票中 票种与电子票已开放" tone="blue" /><ReportLine label="待处理" text="角色道具初核 现场售票点库存 夜间值守联系人" tone="amber" /></div></div><div className="bg-white border border-slate-200 rounded-xl p-5"><h3 className="text-[17px] font-semibold">业务汇总</h3><div className="mt-4 space-y-3 text-[14px] leading-6"><ReportList label="票务" text="普通观众票 3,548 张 Coser 专属票 326 张 学生早鸟票 788 张" /><ReportList label="角色服装道具" text="326 份申报 已通过 318 份 协同核验 2 份" /><ReportList label="资料与问题" text="活动资料 5 项 已完成 2 项异常核验均已登记" /></div></div></section>{downloaded && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[14px] text-emerald-800">活动摘要文件已下载到本地下载目录</div>}<div className="flex justify-end gap-2"><button onClick={onClose} className="h-10 px-4 rounded-lg border border-slate-300 text-[14px] font-semibold">关闭</button><button onClick={download} className="h-10 px-4 rounded-lg bg-[#255ec8] text-white text-[14px] font-semibold flex items-center gap-1.5"><Download className="w-4 h-4" />下载活动摘要</button></div></div></section></div>; }
function ReportMetric({ label, value, tone = 'blue' }: { label: string; value: string; tone?: 'blue' | 'rose' }) { return <div className={`rounded-xl border p-4 ${tone === 'rose' ? 'border-rose-200 bg-rose-50' : 'border-blue-100 bg-blue-50'}`}><div className="text-[13px] text-slate-600">{label}</div><div className={`mt-2 text-[22px] font-semibold ${tone === 'rose' ? 'text-rose-700' : 'text-[#255ec8]'}`}>{value}</div></div>; }
function ReportLine({ label, text, tone }: { label: string; text: string; tone: 'green' | 'blue' | 'amber' }) { const styles = { green: 'bg-emerald-50 text-emerald-800', blue: 'bg-blue-50 text-blue-800', amber: 'bg-amber-50 text-amber-800' }[tone]; return <div className={`rounded-lg p-3 ${styles}`}><div className="text-[13px] font-semibold">{label}</div><div className="mt-1 text-[14px] leading-6">{text}</div></div>; }
function ReportList({ label, text }: { label: string; text: string }) { return <div><div className="text-[13px] font-semibold text-slate-500">{label}</div><div className="mt-1">{text}</div></div>; }
'''
if insert_anchor not in s:
    raise SystemExit('Missing report insertion anchor')
s = s.replace(insert_anchor, report + insert_anchor, 1)

p.write_text(s)
print('Updated login, sidebar, and activity summary')
