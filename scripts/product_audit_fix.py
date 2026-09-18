from pathlib import Path

path = Path('/home/ubuntu/quji-event-service-prototype/client/src/pages/Home.tsx')
s = path.read_text()

def one(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'Missing {label}')
    s = s.replace(old, new, 1)

# Data sources are reconciled to the ticket-type totals: 3,548 + 326 + 788 = 4,662.
one("status: 'selling', tickets: 4862, checkedIn: 0", "status: 'selling', tickets: 4662, checkedIn: 0", 'event ticket total')
s = s.replace('value="4,862"', 'value="4,662"')
s = s.replace('value="4,684"', 'value="4,484"')
s = s.replace('value="¥382,964"', 'value="¥380,096"')
s = s.replace('value="0.38%"', 'value="0.39%"')
s = s.replace('value="4,684 人" sub="实名完成率 96.3%"', 'value="4,484 人" sub="实名完成率 96.2%"')
s = s.replace('sub="售票进度 68%"', 'sub="售票进度 56%"')

# Make non-navigation metric cards non-clickable semantics.
one(
    'function TodayStat({ label, value, sub, icon, tone = \'blue\', link }: { label: string; value: string; sub: string; icon: ReactNode; tone?: \'blue\' | \'amber\' | \'rose\'; link?: () => void }) { const colors = { blue: \'bg-blue-50 text-[#255ec8]\', amber: \'bg-amber-50 text-amber-700\', rose: \'bg-rose-50 text-rose-700\' }[tone]; return <button onClick={link} className={`bg-white border border-slate-200 rounded-xl p-5 text-left ${link ? \'hover:border-blue-300 hover:bg-blue-50/30\' : \'\'}`}><div className="flex items-center justify-between"><div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors}`}>{icon}</div>{link && <ArrowRight className="w-4 h-4 text-[#255ec8]" />}</div><div className="mt-4 text-[14px] text-slate-600">{label}</div><div className="mt-1 text-[28px] leading-8 font-semibold tracking-[-0.05em]">{value}</div><div className="mt-2 text-[13px] leading-5 text-slate-500">{sub}</div></button>; }',
    'function TodayStat({ label, value, sub, icon, tone = \'blue\', link }: { label: string; value: string; sub: string; icon: ReactNode; tone?: \'blue\' | \'amber\' | \'rose\'; link?: () => void }) { const colors = { blue: \'bg-blue-50 text-[#255ec8]\', amber: \'bg-amber-50 text-amber-700\', rose: \'bg-rose-50 text-rose-700\' }[tone]; const inner = <><div className="flex items-center justify-between"><div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors}`}>{icon}</div>{link && <ArrowRight className="w-4 h-4 text-[#255ec8]" />}</div><div className="mt-4 text-[14px] text-slate-600">{label}</div><div className="mt-1 text-[28px] leading-8 font-semibold tracking-[-0.05em]">{value}</div><div className="mt-2 text-[13px] leading-5 text-slate-500">{sub}</div></>; const classes = `bg-white border border-slate-200 rounded-xl p-5 text-left ${link ? \'hover:border-blue-300 hover:bg-blue-50/30\' : \'\'}`; return link ? <button onClick={link} className={classes}>{inner}</button> : <div className={classes}>{inner}</div>; }',
    'today statistic semantics'
)

# Generic action button gives every operational action an explicit confirmation/result state.
anchor = 'function Login({ role, setRole, onEnter, locale, setLocale }: { role: Role; setRole: (role: Role) => void; onEnter: () => void; locale: Locale; setLocale: (locale: Locale) => void }) {'
if anchor not in s:
    raise SystemExit('Missing action button anchor')
helper = '''function ActionButton({ label, className, title, description, icon }: { label: string; className: string; title?: string; description?: string; icon?: ReactNode }) { const [state, setState] = useState<'confirm' | 'done' | null>(null); const heading = title || label; return <><button onClick={() => setState('confirm')} className={className}>{icon}{label}</button>{state && <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"><button onClick={() => setState(null)} className="absolute inset-0 bg-black/30" /><section className="relative w-full max-w-[440px] bg-white rounded-xl shadow-2xl p-6"><div className="w-11 h-11 rounded-xl bg-blue-50 text-[#255ec8] flex items-center justify-center">{state === 'done' ? <CheckCircle2 className="w-5 h-5" /> : (icon || <ClipboardCheck className="w-5 h-5" />)}</div><h2 className="mt-4 text-[20px] font-semibold">{state === 'done' ? `${heading}已完成` : heading}</h2><p className="mt-2 text-[14px] leading-6 text-slate-600">{state === 'done' ? '本次操作已登记，并将同步写入当前活动的操作记录。' : (description || '请确认本次操作，系统将记录处理人、处理时间和关联活动。')}</p><div className="mt-6 flex justify-end gap-2"><button onClick={() => setState(null)} className="h-10 px-4 rounded-lg border border-slate-300 text-[14px] font-semibold">{state === 'done' ? '关闭' : '取消'}</button>{state === 'confirm' && <button onClick={() => setState('done')} className="h-10 px-4 rounded-lg bg-[#255ec8] text-white text-[14px] font-semibold">确认</button>}</div></section></div>}</>; }
'''
s = s.replace(anchor, helper + anchor)

# Real empty-state feedback instead of a dormant button.
one(
    'function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action: string }) { return <div className="border border-dashed border-slate-300 bg-slate-50 rounded-xl p-10 text-center"><div className="mx-auto w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center">{icon}</div><h3 className="mt-4 text-[17px] font-semibold">{title}</h3><p className="mt-2 max-w-sm mx-auto text-[14px] leading-6 text-slate-600">{text}</p><button className="mt-5 h-10 px-4 rounded-lg bg-[#255ec8] text-white text-[14px] font-semibold">{action}</button></div>; }',
    'function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action: string }) { return <div className="border border-dashed border-slate-300 bg-slate-50 rounded-xl p-10 text-center"><div className="mx-auto w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center">{icon}</div><h3 className="mt-4 text-[17px] font-semibold">{title}</h3><p className="mt-2 max-w-sm mx-auto text-[14px] leading-6 text-slate-600">{text}</p><div className="mt-5 inline-flex"><ActionButton label={action} className="h-10 px-4 rounded-lg bg-[#255ec8] text-white text-[14px] font-semibold" title={action} description="可在此开始建立新的活动档案并补充基础资料。" /></div></div>; }',
    'empty state action'
)

# Permissions: changing identity cannot leave the prior role on an unauthorized page.
one(
    "{settingOpen && <SettingsPanel role={role} setRole={setRole} onClose={() => setSettingOpen(false)} onLogout={() => { setSettingOpen(false); setSignedIn(false); }} />}",
    "{settingOpen && <SettingsPanel role={role} onRoleChange={next => { setRole(next); if (!ROLE_INFO[next].permissions.includes(page)) setPage('workspace'); }} onClose={() => setSettingOpen(false)} onLogout={() => { setSettingOpen(false); setSignedIn(false); }} />}",
    'settings permission handoff'
)
s = s.replace('function SettingsPanel({ role, setRole, onClose, onLogout }: { role: Role; setRole: (role: Role) => void; onClose: () => void; onLogout: () => void })', 'function SettingsPanel({ role, onRoleChange, onClose, onLogout }: { role: Role; onRoleChange: (role: Role) => void; onClose: () => void; onLogout: () => void })')
s = s.replace('onClick={() => setRole(item)}', 'onClick={() => onRoleChange(item)}')

# Activity sub-page participates in the same live check-in interaction.
one(
    "function ActivityRecord({ event, tab, setTab, onNavigate }: { event: EventItem; tab: ActivityTab; setTab: (tab: ActivityTab) => void; onNavigate: (page: Page, tab?: ActivityTab) => void }) { const tabs:",
    "function ActivityRecord({ event, tab, setTab, onNavigate }: { event: EventItem; tab: ActivityTab; setTab: (tab: ActivityTab) => void; onNavigate: (page: Page, tab?: ActivityTab) => void }) { const [tabCheckins, setTabCheckins] = useState(0); const tabs:",
    'activity check-in state'
)
s = s.replace("<OnsitePage checkins={0} setCheckins={() => {}} issueOpen={false} setIssueOpen={() => {}} compact />", "<OnsitePage checkins={tabCheckins} setCheckins={setTabCheckins} issueOpen={false} setIssueOpen={() => {}} compact />")

# High-visibility static operations become confirmed actions.
replacements = {
'<button className="h-10 px-4 rounded-lg bg-[#255ec8] text-white text-[14px] font-semibold flex items-center gap-1.5"><Plus className="w-4 h-4" />创建活动</button>': '<ActionButton label="创建活动" className="h-10 px-4 rounded-lg bg-[#255ec8] text-white text-[14px] font-semibold flex items-center gap-1.5" icon={<Plus className="w-4 h-4" />} description="将创建活动基础档案，并进入资料准备阶段。" />',
'<button className="h-10 px-3 rounded-lg border border-slate-300 text-[14px] font-medium">状态筛选</button>': '<ActionButton label="状态筛选" className="h-10 px-3 rounded-lg border border-slate-300 text-[14px] font-medium" description="可按活动创建、资料准备、信息核验、售票、进行中、结束和归档状态筛选。" />',
'<button className="h-10 px-3 rounded-lg border border-slate-300 text-[14px] font-medium">时间范围</button>': '<ActionButton label="时间范围" className="h-10 px-3 rounded-lg border border-slate-300 text-[14px] font-medium" description="可按活动时间、创建时间和更新时间筛选。" />',
'<button className="h-10 px-4 rounded-lg border border-slate-300 text-[14px] font-semibold">导出活动摘要</button>': '<ActionButton label="导出活动摘要" className="h-10 px-4 rounded-lg border border-slate-300 text-[14px] font-semibold" description="将汇集活动概况、进度、待办、票务、现场与问题记录。" />',
'<button className="h-10 px-4 rounded-lg bg-[#255ec8] text-white text-[14px] font-semibold flex items-center gap-1.5"><Upload className="w-4 h-4" />上传材料</button>': '<ActionButton label="上传材料" className="h-10 px-4 rounded-lg bg-[#255ec8] text-white text-[14px] font-semibold flex items-center gap-1.5" icon={<Upload className="w-4 h-4" />} description="材料上传后会显示版本、更新时间、操作人和补充状态。" />',
'<button className="h-10 px-4 rounded-lg border border-slate-300 text-[14px] font-semibold">导出脱敏名单</button>': '<ActionButton label="导出脱敏名单" className="h-10 px-4 rounded-lg border border-slate-300 text-[14px] font-semibold" description="将按权限导出参与人员脱敏汇总，不包含原始敏感身份信息。" />',
'<button className="h-10 px-4 rounded-lg bg-[#255ec8] text-white text-[14px] font-semibold flex items-center gap-1.5"><Plus className="w-4 h-4" />新增票种</button>': '<ActionButton label="新增票种" className="h-10 px-4 rounded-lg bg-[#255ec8] text-white text-[14px] font-semibold flex items-center gap-1.5" icon={<Plus className="w-4 h-4" />} description="可配置票种名称、票价、库存、开售时间、停售时间和实名规则。" />',
'<button className="h-10 px-3 rounded-lg border border-slate-300 text-[14px] font-semibold flex items-center gap-1.5"><Download className="w-4 h-4" />导出数据</button>': '<ActionButton label="导出数据" className="h-10 px-3 rounded-lg border border-slate-300 text-[14px] font-semibold flex items-center gap-1.5" icon={<Download className="w-4 h-4" />} description="导出当前票务视图中的票种、订单或退款数据。" />',
'<button className="text-[14px] font-semibold text-[#255ec8]">管理</button>': '<ActionButton label="管理" className="text-[14px] font-semibold text-[#255ec8]" description="可调整库存、开售停售时间、渠道和实名规则。" />',
'<button className="h-10 px-4 rounded-lg border border-slate-300 text-[14px] font-semibold flex items-center gap-1.5"><Download className="w-4 h-4" />导出活动数据</button>': '<ActionButton label="导出活动数据" className="h-10 px-4 rounded-lg border border-slate-300 text-[14px] font-semibold flex items-center gap-1.5" icon={<Download className="w-4 h-4" />} description="导出售票、入场、退款、人员、客流、核验和异常统计。" />',
'<button className="h-10 px-4 rounded-lg bg-rose-600 text-white text-[14px] font-semibold flex items-center gap-1.5"><Plus className="w-4 h-4" />登记问题</button>': '<ActionButton label="登记问题" className="h-10 px-4 rounded-lg bg-rose-600 text-white text-[14px] font-semibold flex items-center gap-1.5" icon={<Plus className="w-4 h-4" />} description="问题将关联活动阶段、处理责任人、时限和处置记录。" />',
'<button className="h-10 px-4 rounded-lg bg-[#255ec8] text-white text-[14px] font-semibold flex items-center gap-1.5"><FileArchive className="w-4 h-4" />生成归档摘要</button>': '<ActionButton label="生成归档摘要" className="h-10 px-4 rounded-lg bg-[#255ec8] text-white text-[14px] font-semibold flex items-center gap-1.5" icon={<FileArchive className="w-4 h-4" />} description="将汇集资料、票务、现场、问题、数据和操作日志形成归档摘要。" />',
'<button className="h-10 px-4 rounded-lg bg-[#255ec8] text-white text-[14px] font-semibold flex items-center gap-1.5"><Upload className="w-4 h-4" />补充主体材料</button>': '<ActionButton label="补充主体材料" className="h-10 px-4 rounded-lg bg-[#255ec8] text-white text-[14px] font-semibold flex items-center gap-1.5" icon={<Upload className="w-4 h-4" />} description="补充材料后将保留版本、更新时间、操作人和补充原因。" />',
'<button className="h-10 px-4 rounded-lg border border-slate-300 text-[14px] font-semibold flex items-center gap-1.5"><Download className="w-4 h-4" />导出活动复盘数据</button>': '<ActionButton label="导出活动复盘数据" className="h-10 px-4 rounded-lg border border-slate-300 text-[14px] font-semibold flex items-center gap-1.5" icon={<Download className="w-4 h-4" />} description="导出各活动的售票、入场、退款、人员、核验与异常数据。" />',
'<button className="min-h-[84px] rounded-lg border border-slate-300 text-[14px] font-semibold hover:bg-slate-50"><QrCode className="mx-auto mb-2 w-5 h-5 text-[#255ec8]" />手动核验电子票</button>': '<ActionButton label="手动核验电子票" className="min-h-[84px] rounded-lg border border-slate-300 text-[14px] font-semibold hover:bg-slate-50 flex flex-col items-center justify-center" icon={<QrCode className="mb-2 w-5 h-5 text-[#255ec8]" />} description="可输入订单号或电子票编号进行人工核验。" />',
'<button className="min-h-[84px] rounded-lg border border-slate-300 text-[14px] font-semibold hover:bg-slate-50"><UserCheck className="mx-auto mb-2 w-5 h-5 text-[#255ec8]" />实名信息核对</button>': '<ActionButton label="实名信息核对" className="min-h-[84px] rounded-lg border border-slate-300 text-[14px] font-semibold hover:bg-slate-50 flex flex-col items-center justify-center" icon={<UserCheck className="mb-2 w-5 h-5 text-[#255ec8]" />} description="按授权范围核对订单关联的实名状态与核验结果。" />',
'<button className="min-h-[84px] rounded-lg border border-slate-300 text-[14px] font-semibold hover:bg-slate-50"><Download className="mx-auto mb-2 w-5 h-5 text-[#255ec8]" />导出现场交接表</button>': '<ActionButton label="导出现场交接表" className="min-h-[84px] rounded-lg border border-slate-300 text-[14px] font-semibold hover:bg-slate-50 flex flex-col items-center justify-center" icon={<Download className="mb-2 w-5 h-5 text-[#255ec8]" />} description="导出入场、异常核验和现场处置的交接汇总。" />'
}
for old, new in replacements.items():
    if old in s:
        s = s.replace(old, new, 1)
    else:
        print('Skipped optional replacement:', old[:36])

# The dialog actions that remain in lists now have a response state rather than being dead links.
s = s.replace('<button className="text-[14px] font-semibold text-[#255ec8]">查看记录</button>', '<ActionButton label="查看记录" className="text-[14px] font-semibold text-[#255ec8]" description="查看该材料的上传版本、处理意见和补充记录。" />')
s = s.replace('<button className="text-[14px] font-semibold text-[#255ec8]">查看</button>', '<ActionButton label="查看" className="text-[14px] font-semibold text-[#255ec8]" description="查看该归档事项关联的活动材料和操作记录。" />')
s = s.replace('<button className="text-[14px] font-semibold text-[#255ec8]">处理记录</button>', '<ActionButton label="处理记录" className="text-[14px] font-semibold text-[#255ec8]" description="查看问题的登记、分派、处理与结项记录。" />')

# Notification entries that are only informational now provide a detail response.
one(
    'function Notice({ icon, tone, title, text, time, unread, action, onClick }: { icon: ReactNode; tone: \'rose\' | \'amber\' | \'blue\'; title: string; text: string; time: string; unread: boolean; action: string; onClick?: () => void }) { const c = { rose: \'bg-rose-50 text-rose-600\', amber: \'bg-amber-50 text-amber-600\', blue: \'bg-blue-50 text-[#255ec8]\' }[tone]; return <div className="p-4 border border-slate-200 rounded-xl">',
    'function Notice({ icon, tone, title, text, time, unread, action, onClick }: { icon: ReactNode; tone: \'rose\' | \'amber\' | \'blue\'; title: string; text: string; time: string; unread: boolean; action: string; onClick?: () => void }) { const [open, setOpen] = useState(false); const c = { rose: \'bg-rose-50 text-rose-600\', amber: \'bg-amber-50 text-amber-600\', blue: \'bg-blue-50 text-[#255ec8]\' }[tone]; return <><div className="p-4 border border-slate-200 rounded-xl">',
    'notice state'
)
one(
    '<button onClick={onClick} className="text-[13px] font-semibold text-[#255ec8]">{action}</button></div></div></div></div>; }',
    '<button onClick={() => onClick ? onClick() : setOpen(true)} className="text-[13px] font-semibold text-[#255ec8]">{action}</button></div></div></div></div>{open && <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"><button onClick={() => setOpen(false)} className="absolute inset-0 bg-black/30" /><section className="relative w-full max-w-[420px] bg-white rounded-xl shadow-2xl p-6"><h2 className="text-[20px] font-semibold">{title}</h2><p className="mt-3 text-[14px] leading-6 text-slate-600">{text}</p><button onClick={() => setOpen(false)} className="mt-6 h-10 px-4 rounded-lg bg-[#255ec8] text-white text-[14px] font-semibold">关闭</button></section></div>}</>; }',
    'notice interaction'
)

path.write_text(s)
print('Applied product audit fixes')
