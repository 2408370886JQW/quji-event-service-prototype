from pathlib import Path

path = Path('/home/ubuntu/quji-event-service-prototype/client/src/pages/Home.tsx')
s = path.read_text()

def once(old: str, new: str, label: str):
    global s
    if old not in s:
        raise SystemExit(f'Missing target: {label}')
    s = s.replace(old, new, 1)

# 1) Login role names are complete semantic units; only explanatory phrases receive controlled line breaks.
once(
"""  const roleLines: Record<Role, [string, string]> = { platform: ['平台运营', '人员'], organizer: ['主办方', '活动运营人员'], culture: ['文旅业务', '指导人员'], collaborator: ['现场协同', '人员'] };
  const noteLines: Record<Role, [string, string]> = { platform: ['配置活动流程 账号权限', '服务运营'], organizer: ['维护活动资料 票务', '现场与参与人员'], culture: ['查看活动电子档案', '服务进度与汇总数据'], collaborator: ['处理现场核验', '异常记录与处置反馈'] };""",
"""  const noteLines: Record<Role, [string, string]> = { platform: ['配置活动流程', '账号权限 服务运营'], organizer: ['维护活动资料 票务', '现场与参与人员'], culture: ['查看活动电子档案', '服务进度与汇总数据'], collaborator: ['处理现场核验', '异常记录与处置反馈'] };""",
'login role and note data'
)
once(
"""{roles.map(([key, item]) => { const Icon = item.icon; const selected = role === key; const [first, second] = roleLines[key]; const [note1, note2] = noteLines[key]; return <button type="button" key={key} onClick={() => { setRole(key); setError(''); }} className={`text-left rounded-xl border p-4 min-h-[138px] transition-colors ${selected ? 'border-[#255ec8] bg-blue-50 ring-1 ring-[#255ec8]' : 'border-slate-200 bg-white/80 hover:border-slate-400'}`}><div className={`w-9 h-9 rounded-lg ${item.color} text-white flex items-center justify-center`}><Icon className="w-5 h-5" /></div><div className="mt-3 text-[16px] leading-5 font-semibold"><span className="block">{first}</span><span className="block">{second}</span></div><div className="mt-2 text-[13px] leading-5 text-slate-600"><span className="block">{note1}</span><span className="block">{note2}</span></div></button>; })}""",
"""{roles.map(([key, item]) => { const Icon = item.icon; const selected = role === key; const [note1, note2] = noteLines[key]; return <button type="button" key={key} onClick={() => { setRole(key); setError(''); }} className={`role-login-card text-left rounded-xl border p-4 min-h-[138px] transition-colors ${selected ? 'border-[#255ec8] bg-blue-50 ring-1 ring-[#255ec8]' : 'border-slate-200 bg-white/80 hover:border-slate-400'}`}><div className={`w-9 h-9 rounded-lg ${item.color} text-white flex items-center justify-center`}><Icon className="w-5 h-5" /></div><div className="mt-3 text-[16px] leading-5 font-semibold whitespace-nowrap">{item.name}</div><div className="mt-2 text-[13px] leading-5 text-slate-600"><span className="block whitespace-nowrap">{note1}</span><span className="block whitespace-nowrap">{note2}</span></div></button>; })}""",
'login role card markup'
)

# 2) Metric cards retain usable widths. Numbers and core status phrases are never allowed to become vertical text.
once(
"""function TodayStat({ label, value, sub, icon, tone = 'blue', link }: { label: string; value: string; sub: string; icon: ReactNode; tone?: 'blue' | 'amber' | 'rose'; link?: () => void }) { const colors = { blue: 'bg-blue-50 text-[#255ec8]', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700' }[tone]; const inner = <><div className="flex items-center justify-between"><div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors}`}>{icon}</div>{link && <ArrowRight className="w-4 h-4 text-[#255ec8]" />}</div><div className="mt-4 text-[14px] text-slate-600">{label}</div><div className="mt-1 text-[28px] leading-8 font-semibold tracking-[-0.05em]">{value}</div><div className="mt-2 text-[13px] leading-5 text-slate-500">{sub}</div></>; const classes = `bg-white border border-slate-200 rounded-xl p-5 text-left ${link ? 'hover:border-blue-300 hover:bg-blue-50/30' : ''}`; return link ? <button onClick={link} className={classes}>{inner}</button> : <div className={classes}>{inner}</div>; }""",
"""function TodayStat({ label, value, sub, icon, tone = 'blue', link }: { label: string; value: string; sub: string; icon: ReactNode; tone?: 'blue' | 'amber' | 'rose'; link?: () => void }) { const colors = { blue: 'bg-blue-50 text-[#255ec8]', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700' }[tone]; const inner = <><div className="flex items-center justify-between"><div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors}`}>{icon}</div>{link && <ArrowRight className="w-4 h-4 text-[#255ec8]" />}</div><div className="mt-4 text-[14px] leading-5 text-slate-600 [word-break:keep-all]">{label}</div><div className="metric-value mt-1 text-[28px] leading-8 font-semibold tracking-[-0.05em]">{value}</div><div className="metric-sub mt-2 text-[13px] leading-5 text-slate-500">{sub}</div></>; const classes = `metric-card bg-white border border-slate-200 rounded-xl p-5 text-left ${link ? 'hover:border-blue-300 hover:bg-blue-50/30' : ''}`; return link ? <button onClick={link} className={classes}>{inner}</button> : <div className={classes}>{inner}</div>; }""",
'TodayStat semantic layout'
)

# 3) The data center must not nest a four-column analytics module in a two-column parent.
once(
"""<section className="grid lg:grid-cols-2 gap-5"><EventData /><ArchivePage compact /></section>""",
"""<section className="space-y-5"><EventData /><ArchivePage compact /></section>""",
'DataCenter nested two column layout'
)

# 4) All analytics card groups become responsive intrinsic grids rather than screen-width-only column counts.
s = s.replace('className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4"', 'className="metric-grid grid grid-cols-1 min-[560px]:grid-cols-2 xl:grid-cols-4 gap-4"')
s = s.replace('className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4"', 'className="metric-grid grid grid-cols-1 min-[560px]:grid-cols-2 xl:grid-cols-4 gap-4"')
s = s.replace('className="mt-6 grid grid-cols-2 lg:grid-cols-5 gap-3"', 'className="onsite-stat-grid mt-6 grid grid-cols-1 min-[460px]:grid-cols-2 lg:grid-cols-5 gap-3"')
s = s.replace('className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3"', 'className="metric-grid grid grid-cols-1 min-[560px]:grid-cols-2 lg:grid-cols-4 gap-3"')

# 5) Local analytics grid explicitly stacks before enough room is available; it cannot compress the data-definition component.
s = s.replace('className="grid lg:grid-cols-[1.35fr_0.65fr] gap-5"', 'className="grid grid-cols-1 min-[1080px]:grid-cols-[1.35fr_0.65fr] gap-5"')

# 6) Pill labels and archive numeric content should not split character by character.
s = s.replace('function Pill({ children, tone = \'slate\' }: { children: ReactNode; tone?: \'slate\' | \'blue\' | \'green\' | \'amber\' | \'rose\' }) { const colors = { slate: \'bg-slate-100 text-slate-700\', blue: \'bg-blue-50 text-blue-700\', green: \'bg-emerald-50 text-emerald-700\', amber: \'bg-amber-50 text-amber-700\', rose: \'bg-rose-50 text-rose-700\' }; return <span className={`inline-flex px-2 py-1 rounded-md text-[12px] font-semibold ${colors[tone]}`}>{children}</span>; }', "function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'blue' | 'green' | 'amber' | 'rose' }) { const colors = { slate: 'bg-slate-100 text-slate-700', blue: 'bg-blue-50 text-blue-700', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700' }; return <span className={`inline-flex shrink-0 whitespace-nowrap px-2 py-1 rounded-md text-[12px] font-semibold ${colors[tone]}`}>{children}</span>; }")
s = s.replace('function ArchiveCard({ title, value, text, state }: { title: string; value: string; text: string; state: string }) { return <div className="bg-white border border-slate-200 rounded-xl p-5"><div className="text-[14px] text-slate-600">{title}</div><div className="mt-2 text-[28px] leading-8 font-semibold">{value}</div><div className="mt-2 text-[14px] leading-6 text-slate-600">{text}</div><div className="mt-4"><Pill tone={state === \'已完成\' ? \'green\' : \'amber\'}>{state}</Pill></div></div>; }', "function ArchiveCard({ title, value, text, state }: { title: string; value: string; text: string; state: string }) { return <div className=\"metric-card min-w-0 bg-white border border-slate-200 rounded-xl p-5\"><div className=\"text-[14px] text-slate-600 [word-break:keep-all]\">{title}</div><div className=\"metric-value mt-2 text-[28px] leading-8 font-semibold\">{value}</div><div className=\"metric-sub mt-2 text-[14px] leading-6 text-slate-600\">{text}</div><div className=\"mt-4\"><Pill tone={state === '已完成' ? 'green' : 'amber'}>{state}</Pill></div></div>; }")

path.write_text(s)
print('Applied UI system reconstruction')
