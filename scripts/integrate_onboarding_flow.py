from pathlib import Path

path = Path('/home/ubuntu/quji-event-service-prototype/client/src/pages/Home.tsx')
s = path.read_text()

def replace_once(old: str, new: str):
    global s
    count = s.count(old)
    if count != 1:
        raise RuntimeError(f'expected one match, found {count}: {old[:100]}')
    s = s.replace(old, new, 1)

replace_once(
    '<button type="button" onClick={submit} className="mt-5 w-full h-12 rounded-lg bg-[#255ec8] hover:bg-[#1d4fae] text-white text-[15px] font-semibold flex items-center justify-center gap-2">{t.enter}<ArrowRight className="w-4 h-4" /></button></form>',
    '<button type="button" onClick={submit} className="mt-5 w-full h-12 rounded-lg bg-[#255ec8] hover:bg-[#1d4fae] text-white text-[15px] font-semibold flex items-center justify-center gap-2">{t.enter}<ArrowRight className="w-4 h-4" /></button>{role === \'organizer\' && <button type="button" onClick={onRegister} data-cy="organizer-register" className="mt-3 w-full h-11 rounded-lg border border-[#255ec8] bg-white text-[#1c4c9e] text-[14px] font-semibold flex items-center justify-center gap-2"><UserPlus className="w-4 h-4" />首次入驻注册</button>}<p className="mt-3 text-center text-[12px] leading-5 text-slate-500">新主办方先完成手机号注册 实名核验与主体材料审核</p></form>'
)
replace_once(
    "  const [ticketMode, setTicketMode] = useState<'all' | 'orders' | 'refunds'>('all');",
    "  const [ticketMode, setTicketMode] = useState<'all' | 'orders' | 'refunds'>('all');\n  const [registrationOpen, setRegistrationOpen] = useState(false);\n  const [admission, setAdmission] = useState<AdmissionState>(() => {\n    try {\n      const saved = localStorage.getItem('quji_admission_state');\n      return saved ? JSON.parse(saved) as AdmissionState : createEmptyAdmission();\n    } catch {\n      return createEmptyAdmission();\n    }\n  });\n  const updateAdmission = (next: AdmissionState) => { setAdmission(next); localStorage.setItem('quji_admission_state', JSON.stringify(next)); };"
)
replace_once(
    "  const nav = ([\n    { id: 'workspace', label: t.workspace, icon: LayoutDashboard, group: '工作协同' },",
    "  const nav = ([\n    { id: 'workspace', label: t.workspace, icon: LayoutDashboard, group: '工作协同' },\n    { id: 'onboarding', label: '入驻与认证', icon: UserCheck, group: '账号与主体' },\n    { id: 'admissions', label: '入驻审核', icon: ClipboardCheck, group: '账号与主体' },\n    { id: 'activity-create', label: '创建活动', icon: Plus, group: '活动运营' },"
)
replace_once(
    "] as { id: Page; label: string; icon: typeof LayoutDashboard; group: string }[]).filter(item => permissions.includes(item.id));",
    "] as { id: Page; label: string; icon: typeof LayoutDashboard; group: string }[]).filter(item => permissions.includes(item.id));\n  const currentPageLabel = nav.find(item => item.id === page)?.label || (page === 'activity-published' ? '发布完成' : t.activity);"
)
replace_once(
    "  if (!signedIn) return <Login role={role} setRole={setRole} onEnter={() => setSignedIn(true)} locale={locale} setLocale={setLocale} />;",
    "  if (registrationOpen) return <OrganizerRegistration onBack={() => setRegistrationOpen(false)} onComplete={next => { updateAdmission(next); setRegistrationOpen(false); setRole('organizer'); setSignedIn(true); setPage('onboarding'); }} />;\n  if (!signedIn) return <Login role={role} setRole={setRole} onRegister={() => { updateAdmission(createEmptyAdmission()); setRegistrationOpen(true); }} onEnter={() => { if (role === 'organizer' && admission.status === 'not_started') updateAdmission(createApprovedAdmission()); setSignedIn(true); }} locale={locale} setLocale={setLocale} />;"
)
replace_once(
    "{['工作协同', '活动运营', '资料与复盘'].map(group =>",
    "{['账号与主体', '工作协同', '活动运营', '资料与复盘'].map(group =>"
)
replace_once(
    "<div className=\"sm:hidden text-[15px] font-semibold\">{page === 'workspace' ? '工作台' : t[page === 'activity' ? 'activity' : page]}</div>",
    "<div className=\"sm:hidden text-[15px] font-semibold\">{currentPageLabel}</div>"
)
replace_once(
    "{page === 'workspace' && <Workspace events={EVENTS} onOpenEvent={event => { setSelectedEvent(event); changePage('activity'); }} onNavigate={changePage} />}",
    "{page === 'workspace' && <>{role === 'organizer' && admission.status !== 'approved' && <OnboardingWorkspaceGate state={admission} onContinue={() => setPage('onboarding')} />}<Workspace events={EVENTS} onOpenEvent={event => { setSelectedEvent(event); changePage('activity'); }} onNavigate={changePage} /></>}"
)
replace_once(
    "{page === 'data' && <DataCenter />}</main>",
    "{page === 'data' && <DataCenter />}{page === 'onboarding' && <OrganizerOnboarding state={admission} onChange={updateAdmission} onCreateActivity={() => setPage('activity-create')} />}{page === 'admissions' && <AdmissionReview state={admission} onChange={updateAdmission} />}{page === 'activity-create' && <ActivityCreationWizard approved={admission.status === 'approved'} onBack={() => setPage('onboarding')} onFinish={() => setPage('activity-published')} />}{page === 'activity-published' && <ActivityPublished onWorkspace={() => setPage('events')} onTickets={() => setPage('tickets')} />}</main>"
)
path.write_text(s)
print('integrated onboarding flow')
