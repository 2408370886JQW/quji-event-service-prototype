from pathlib import Path

path = Path('/home/ubuntu/quji-event-service-prototype/client/src/pages/Home.tsx')
s = path.read_text()

replacements = [
    (
        "type RoleId = 'platform' | 'culture' | 'organizer' | 'police';",
        "type RoleId = 'platform' | 'culture' | 'organizer' | 'police';\ntype UtilityPanelType = 'notifications' | 'settings';"
    ),
    (
        "  const [toast, setToast] = useState('');\n  const t = copy[language];",
        "  const [toast, setToast] = useState('');\n  const [utilityPanel, setUtilityPanel] = useState<UtilityPanelType | null>(null);\n  const t = copy[language];"
    ),
    (
        "onClick={() => message(t.notifications)}",
        "onClick={() => setUtilityPanel('notifications')}"
    ),
    (
        "onClick={() => message(t.system)}",
        "onClick={() => setUtilityPanel('settings')}"
    ),
    (
        '<div className="hidden xl:flex items-center gap-2 px-3 h-9 rounded-full bg-white border border-black/[0.06] text-[12px] font-medium text-[#515154] shadow-[0_1px_2px_rgba(0,0,0,0.02)]"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" />{t.testNormal}</div>',
        ''
    ),
    (
        '<h4 className="mt-3 text-[15px] font-semibold leading-6 line-clamp-2">{event.name}</h4>',
        '<EventName name={event.name} className="mt-3 text-[16px] font-semibold leading-6" />'
    ),
    (
        '<div className="text-[14px] font-semibold max-w-[270px] leading-6">{event.name}</div>',
        '<EventName name={event.name} className="text-[15px] font-semibold max-w-[270px] leading-6" />'
    ),
    (
        '<h2 className="relative mt-2 text-[23px] leading-8 font-semibold tracking-[-0.04em]">{event.name}</h2>',
        '<EventName name={event.name} className="relative mt-2 text-[24px] leading-8 font-semibold tracking-[-0.04em]" />'
    ),
    (
        '<div className="mt-1 text-[12px] text-[#6e6e73]">{sub.eventName}</div>',
        '<EventName name={sub.eventName} className="mt-1 text-[13px] leading-5 text-[#626267]" />'
    ),
    (
        '<p className="mt-1.5 text-[13px] leading-5 text-[#68686d]">{t.listSub}</p>',
        '<BreakText text={t.listSub} className="mt-1.5 text-[14px] leading-6 text-[#626267]" />'
    ),
    (
        '<div className="mt-1.5 text-[12px] text-[#6e6e73]">{event.location}</div>',
        '<div className="mt-1.5 text-[14px] leading-5 font-medium text-[#57575d]">{event.location}</div>'
    ),
    (
        '<span key={tag} className="text-[11px] text-[#6e6e73]">#{tag}</span>',
        '<span key={tag} className="text-[13px] font-medium text-[#5f5f65]">#{tag}</span>'
    ),
    (
        '<p className="text-[14px] leading-6">{sub.costumeDesc}</p>',
        '<DetailText text={sub.costumeDesc} />'
    ),
    (
        '    {logoutConfirm && <LogoutModal t={t} onClose={() => setLogoutConfirm(false)} onLogout={logout} />}',
        "    {utilityPanel && <UtilityPanel t={t} panel={utilityPanel} role={role} language={language} onClose={() => setUtilityPanel(null)} onSwitchRole={() => { setUtilityPanel(null); setSignedIn(false); }} />}\n    {logoutConfirm && <LogoutModal t={t} onClose={() => setLogoutConfirm(false)} onLogout={logout} />}"
    ),
]

for old, new in replacements:
    if old not in s:
        raise SystemExit(f'Missing replacement target:\n{old[:160]}')
    s = s.replace(old, new)

anchor = "function HeroMetric({ label, value, suffix, green }: { label: string; value: string; suffix?: string; green?: boolean })"
if anchor not in s:
    raise SystemExit('Missing component insertion anchor')
helpers = '''function EventName({ name, className = '' }: { name: string; className?: string }) {
  const [main, ...rest] = name.split(' · ');
  const sub = rest.join(' · ');
  return <div className={className}><span className="block">{main}</span>{sub && <span className="block mt-0.5 text-[0.92em] font-medium opacity-90">{sub}</span>}</div>;
}
function BreakText({ text, className = '' }: { text: string; className?: string }) {
  const lines = text.split(/ {2,}/).filter(Boolean);
  return <p className={className}>{lines.map((line, index) => <span key={`${line}-${index}`} className="block">{line}</span>)}</p>;
}
function DetailText({ text }: { text: string }) {
  const lines = text.split(/[，。；]/).map(line => line.trim()).filter(Boolean);
  return <p className="text-[15px] leading-7 text-[#343438]">{lines.map((line, index) => <span key={`${line}-${index}`} className="block">{line}{index < lines.length - 1 ? '。' : ''}</span>)}</p>;
}
'''
s = s.replace(anchor, helpers + anchor)

anchor = "function LogoutModal({ t, onClose, onLogout }: { t: Copy; onClose: () => void; onLogout: () => void })"
if anchor not in s:
    raise SystemExit('Missing utility panel insertion anchor')
utility = '''function UtilityPanel({ t, panel, role, language, onClose, onSwitchRole }: { t: Copy; panel: UtilityPanelType; role: RoleId; language: Language; onClose: () => void; onSwitchRole: () => void }) {
  const [readIds, setReadIds] = useState<string[]>([]);
  const [settings, setSettings] = useState({ desktopNotice: true, reviewReminder: true, bilingual: language !== 'zh' });
  const notifications = [
    { id: 'n1', icon: ShieldAlert, tone: 'rose', title: language === 'zh' ? '1 条角色 / 道具提报需协同核验' : language === 'en' ? '1 prop record needs coordinated review' : '1 رول / ئەسۋاب ئۇچۇرى ھەمكارلىق تەكشۈرۈشىگە موھتاج', detail: language === 'zh' ? '机甲重装佣兵 · 拟真道具尺寸待现场复验' : language === 'en' ? 'Mecha mercenary · on-site prop size check required' : 'ماشىنا ساۋۇت رولى · نەق مەيداندا ئەسۋاب چوڭلۇقىنى تەكشۈرۈش كېرەك', time: language === 'zh' ? '12 分钟前' : '12 min ago' },
    { id: 'n2', icon: FileText, tone: 'amber', title: language === 'zh' ? '1 场活动资料待完善' : language === 'en' ? '1 event record needs completion' : '1 پائالىيەت ماتېرىيالى تولۇق ئەمەس', detail: language === 'zh' ? '丝路数字国风文创新潮博览会 · 请补充现场安全服务联系人' : language === 'en' ? 'Silk Road digital culture expo · add safety contact' : 'سىلك يولى رەقەملىك مەدەنىيەت كۆرگەزمىسى · بىخەتەرلىك ئالاقىچىسىنى تولۇقلاڭ', time: language === 'zh' ? '1 小时前' : '1 hr ago' },
    { id: 'n3', icon: CheckCircle2, tone: 'green', title: language === 'zh' ? '活动发布审核已完成' : language === 'en' ? 'Event publishing review completed' : 'پائالىيەت ئېلان تەكشۈرۈشى تاماملاندى', detail: language === 'zh' ? '城市青年音乐与插画周 · 电子档案已归集' : language === 'en' ? 'Urban music and illustration week · digital record is complete' : 'شەھەر ياشلىرى مۇزىكا ۋە سۈرەت ھەپتىلىكى · رەقەملىك ھۆججەت تولۇقلاندى', time: language === 'zh' ? '昨天' : 'Yesterday' }
  ];
  const title = panel === 'notifications' ? t.notifications : t.system;
  return <div className="fixed inset-0 z-50 flex justify-end"><button onClick={onClose} className="absolute inset-0 bg-black/25 backdrop-blur-[1px]" /><section className="relative w-full max-w-[480px] h-full bg-[#fbfbfd] shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"><div className="sticky top-0 z-10 px-6 py-5 bg-white/90 backdrop-blur-xl border-b border-black/[0.06] flex items-center justify-between"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${panel === 'notifications' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-[#0071e3]'}`}>{panel === 'notifications' ? <Bell className="w-5 h-5" /> : <SlidersHorizontal className="w-5 h-5" />}</div><div><h2 className="text-[20px] font-semibold tracking-[-0.04em]">{title}</h2><p className="mt-1 text-[13px] text-[#68686d]">{panel === 'notifications' ? (language === 'zh' ? '待办提醒与业务动态' : language === 'en' ? 'Tasks and business updates' : 'كۈتۈۋاتقان ۋەزىپە ۋە خىزمەت يېڭىلىقى') : (language === 'zh' ? '当前工作台与通知偏好' : language === 'en' ? 'Workspace and notification preferences' : 'نۆۋەتتىكى خىزمەت سۇپىسى ۋە ئۇقتۇرۇش تەڭشىكى')}</p></div></div><button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-black/[0.05] flex items-center justify-center"><X className="w-5 h-5" /></button></div>{panel === 'notifications' ? <div className="p-5"><div className="flex items-center justify-between mb-3"><SmallLabel>{language === 'zh' ? '全部动态' : language === 'en' ? 'All updates' : 'بارلىق يېڭىلىقلار'}</SmallLabel><button onClick={() => setReadIds(notifications.map(item => item.id))} className="text-[13px] font-semibold text-[#0071e3]">{language === 'zh' ? '全部标为已读' : language === 'en' ? 'Mark all read' : 'ھەممىسىنى ئوقۇلدى قىلىش'}</button></div><div className="space-y-3">{notifications.map(item => { const Icon = item.icon; const unread = !readIds.includes(item.id); const colors = { rose: 'bg-rose-50 text-rose-600', amber: 'bg-amber-50 text-amber-600', green: 'bg-emerald-50 text-emerald-600' }[item.tone]; return <button key={item.id} onClick={() => setReadIds([...readIds, item.id])} className={`w-full text-left p-4 rounded-2xl border transition-all ${unread ? 'bg-white border-black/[0.08] hover:border-blue-200 shadow-sm' : 'bg-[#f5f5f7] border-transparent opacity-75'}`}><div className="flex gap-3"><div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${colors}`}><Icon className="w-[18px] h-[18px]" /></div><div className="min-w-0 flex-1"><div className="flex items-start gap-2"><p className="flex-1 text-[14px] leading-5 font-semibold">{item.title}</p>{unread && <span className="mt-1.5 w-2 h-2 rounded-full bg-[#0071e3]" />}</div><p className="mt-1.5 text-[13px] leading-5 text-[#68686d]">{item.detail}</p><p className="mt-2 text-[12px] text-[#86868b]">{item.time}</p></div></div></button>; })}</div></div> : <div className="p-5 space-y-5"><section className="apple-card p-4"><SmallLabel>{t.userLabel}</SmallLabel><div className="mt-3 flex items-center gap-3"><div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleInfo[role].color} text-white flex items-center justify-center`}>{(() => { const Icon = roleInfo[role].icon; return <Icon className="w-5 h-5" />; })()}</div><div className="flex-1"><div className="text-[15px] font-semibold">{getRoleName(t, role)}</div><div className="mt-1 text-[13px] leading-5 text-[#68686d]">{getRoleSub(t, role)}</div></div><button onClick={onSwitchRole} className="h-9 px-3 rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[13px] font-semibold">{t.changeRole}</button></div></section><section className="apple-card overflow-hidden"><div className="p-4 border-b border-black/[0.06]"><h3 className="text-[16px] font-semibold">{language === 'zh' ? '通知与显示偏好' : language === 'en' ? 'Notifications and display' : 'ئۇقتۇرۇش ۋە كۆرسىتىش تەڭشىكى'}</h3><p className="mt-1.5 text-[13px] leading-5 text-[#68686d]">{language === 'zh' ? '以下设置仅影响当前工作台的显示方式' : language === 'en' ? 'These settings affect only this workspace view' : 'تۆۋەندىكى تەڭشەكلەر پەقەت نۆۋەتتىكى خىزمەت سۇپىسىغا تەسىر قىلىدۇ'}</p></div><SettingSwitch label={language === 'zh' ? '审核待办提醒' : language === 'en' ? 'Review task reminders' : 'تەكشۈرۈش ۋەزىپە ئۇقتۇرۇشى'} description={language === 'zh' ? '有新的 Coser 提报时显示待办角标' : language === 'en' ? 'Show a badge for new Coser submissions' : 'يېڭى Coser ئۇچۇرى بولغاندا بەلگە كۆرسىتىدۇ'} value={settings.reviewReminder} onChange={() => setSettings({ ...settings, reviewReminder: !settings.reviewReminder })} /><SettingSwitch label={language === 'zh' ? '桌面通知提示' : language === 'en' ? 'Desktop notifications' : 'ئۈستەل يۈزى ئۇقتۇرۇشى'} description={language === 'zh' ? '收到重要协同事项时进行桌面提示' : language === 'en' ? 'Notify on important coordination items' : 'مۇھىم ھەمكارلىق ئىشلىرىدا ئەسكەرتىش بېرىدۇ'} value={settings.desktopNotice} onChange={() => setSettings({ ...settings, desktopNotice: !settings.desktopNotice })} /><SettingSwitch label={language === 'zh' ? '多语言界面' : language === 'en' ? 'Multilingual interface' : 'كۆپ تىللىق كۆرۈنمە يۈز'} description={language === 'zh' ? '中文、English、ئۇيغۇرچە可随时切换' : language === 'en' ? 'Chinese, English, and Uyghur can be switched at any time' : 'خەنزۇچە، ئىنگلىزچە ۋە ئۇيغۇرچە تىللىرىنى خالىغان ۋاقىتتا ئالماشتۇرغىلى بولىدۇ'} value={settings.bilingual} onChange={() => setSettings({ ...settings, bilingual: !settings.bilingual })} /></section><section className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex gap-3"><LockKeyhole className="w-5 h-5 text-[#0071e3] shrink-0 mt-0.5" /><p className="text-[13px] leading-6 text-[#21557f]">{language === 'zh' ? '账号权限与数据范围由平台管理员统一配置  当前页面仅展示演示交互' : language === 'en' ? 'Account permissions and data scopes are configured by platform administrators' : 'ھېسابات ھوقۇقى ۋە سانلىق مەلۇمات دائىرىسى سۇپا باشقۇرغۇچىسى تەرىپىدىن تەڭشىلىدۇ'}</p></section></div>}</section></div>;
}
function SettingSwitch({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: () => void }) { return <div className="p-4 border-b border-black/[0.06] last:border-b-0 flex gap-4 items-center"><div className="flex-1"><div className="text-[14px] font-semibold">{label}</div><div className="mt-1 text-[12px] leading-5 text-[#68686d]">{description}</div></div><button onClick={onChange} className={`w-11 h-6 rounded-full p-0.5 transition-colors ${value ? 'bg-[#0071e3]' : 'bg-[#c7c7cc]'}`} aria-label={label}><span className={`block w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} /></button></div>; }
'''
s = s.replace(anchor, utility + anchor)
path.write_text(s)
print('Updated Home.tsx')
