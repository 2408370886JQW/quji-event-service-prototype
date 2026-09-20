import { useState, type ReactNode } from 'react';
import {
  ArrowLeft, ArrowRight, BadgeCheck, Building2, Check, CheckCircle2,
  ChevronRight, FileCheck2, FileText, FolderPlus, Landmark, LockKeyhole,
  MapPinned, Paperclip, ShieldCheck, Upload, UsersRound, X
} from 'lucide-react';

type MaterialStatus = '待准备' | '待协作方确认' | '已上传' | '已完善' | '待资料核对' | '已补正' | '已归档';

type MaterialItem = {
  name: string;
  group: string;
  status: MaterialStatus;
  update: string;
  owner: string;
  note: string;
  conditional?: boolean;
};

const subjectSeed: MaterialItem[] = [
  { name: '营业执照或主体登记证明', group: '主体证明', status: '已上传', update: '2026-06-10 14:15', owner: '林洁', note: '有效期信息已登记' },
  { name: '法定代表人或经办授权材料', group: '授权材料', status: '待准备', update: '—', owner: '主办方', note: '首次入驻请补充经办授权关系' },
  { name: '主体安全责任人信息', group: '责任人', status: '已完善', update: '2026-06-11 09:40', owner: '林洁', note: '默认脱敏展示 访问全程留痕' },
  { name: '经营性业务相关许可', group: '相关资质', status: '待准备', update: '—', owner: '主办方', note: '仅在活动性质或属地规则要求时上传', conditional: true }
];

const activitySeed: MaterialItem[] = [
  { name: '活动备案信息表', group: '基础信息', status: '已上传', update: '2026-06-12 15:20', owner: '林洁', note: '当前版本已关联活动档案 可继续更新' },
  { name: '活动方案与内容说明', group: '活动方案', status: '已上传', update: '2026-06-12 15:20', owner: '林洁', note: '已关联当前活动档案' },
  { name: '场所管理者同意提供场所证明', group: '场地协作', status: '已补正', update: '2026-06-15 11:05', owner: '场馆协调组', note: '场地使用版本已关联 等待活动前复核' },
  { name: '安全工作方案', group: '现场安全', status: '已上传', update: '2026-06-14 16:20', owner: '林洁', note: '按当前活动版本归集' },
  { name: '现场平面图与疏散示意', group: '现场安全', status: '已上传', update: '2026-06-13 16:30', owner: '场馆协调组', note: '活动前仍需复核' },
  { name: '保安服务与人员配置说明', group: '现场安全', status: '已补正', update: '2026-06-16 10:10', owner: '主办方运营组', note: '已关联当前安保配置版本' },
  { name: '营业性演出相关材料', group: '条件材料', status: '待准备', update: '—', owner: '主办方', note: '如涉及营业性演出 请按属地文旅清单准备', conditional: true },
  { name: '临时搭建与消防疏散材料', group: '条件材料', status: '待准备', update: '—', owner: '主办方', note: '如涉及临时舞台 看台或搭建 请补充', conditional: true }
];

const statusTheme: Record<MaterialStatus, string> = {
  '待准备': 'bg-amber-50 text-amber-800',
  '待协作方确认': 'bg-violet-50 text-violet-800',
  '已上传': 'bg-blue-50 text-blue-800',
  '已完善': 'bg-emerald-50 text-emerald-800',
  '待资料核对': 'bg-amber-50 text-amber-800',
  '已补正': 'bg-sky-50 text-sky-800',
  '已归档': 'bg-slate-100 text-slate-700'
};

function StatusBadge({ status }: { status: MaterialStatus }) {
  return <span className={`inline-flex shrink-0 rounded-md px-2 py-1 text-[12px] font-semibold whitespace-nowrap ${statusTheme[status]}`}>{status}</span>;
}

function ComplianceBoundary() {
  return <section className="rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3">
    <div className="flex gap-3">
      <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-[#245fc4]" />
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold text-slate-900">资料协同与办事导航</h3>
        <p className="mt-1 text-[14px] leading-6 text-slate-700">本平台用于整理材料、协同补正、版本留痕和归档，不提供行政许可或审批，不代替申请、受理、审查、现场查验或行政决定。</p>
      </div>
    </div>
  </section>;
}

function StepRail({ labels, current }: { labels: string[]; current: number }) {
  return <div className="grid grid-cols-3 gap-2 border-b border-slate-200 px-5 py-4 sm:px-6">
    {labels.map((label, index) => <div key={label} className={`rounded-md border px-3 py-2 ${index === current ? 'border-blue-200 bg-blue-50 text-[#1c4c9e]' : index < current ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-transparent text-slate-500'}`}>
      <div className="text-[11px] font-semibold">0{index + 1}</div>
      <div className="mt-1 text-[13px] font-semibold whitespace-nowrap">{label}</div>
    </div>)}
  </div>;
}

function Drawer({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-[70] flex justify-end">
    <button aria-label="关闭材料面板" onClick={onClose} className="absolute inset-0 bg-slate-950/25" />
    <aside dir="ltr" className="relative flex h-full w-full max-w-[640px] flex-col bg-white shadow-2xl">
      <header className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-6">
        <div className="min-w-0"><div className="text-[13px] font-semibold text-slate-500">{eyebrow}</div><h2 className="mt-1 text-[22px] leading-7 font-semibold text-slate-900">{title}</h2></div>
        <button aria-label="关闭" onClick={onClose} className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
      </header>
      {children}
    </aside>
  </div>;
}

function FileChoice({ fileName, setFileName }: { fileName: string; setFileName: (name: string) => void }) {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-[#245fc4] shadow-sm"><Paperclip className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1"><div className="text-[14px] font-semibold text-slate-800">{fileName || '尚未选择文件'}</div><p className="mt-1 text-[13px] leading-5 text-slate-600">支持选择本地文件。也可使用示例文件继续完成资料流程。</p></div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
        选择文件<input type="file" className="sr-only" onChange={event => setFileName(event.target.files?.[0]?.name || '')} />
      </label>
      <button type="button" onClick={() => setFileName('示例材料_2026版.pdf')} className="h-9 rounded-md border border-slate-300 bg-white px-3 text-[13px] font-semibold text-[#245fc4] hover:bg-blue-50">使用示例文件</button>
    </div>
  </div>;
}

function MaterialUploadDrawer({ title, options, onClose, onSave }: { title: string; options: MaterialItem[]; onClose: () => void; onSave: (name: string) => void }) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(options[0]?.name || '');
  const [fileName, setFileName] = useState('');
  const current = options.find(item => item.name === selected);
  const goNext = () => {
    if (step === 0 && !selected) return;
    if (step === 1 && !fileName) { setFileName('示例材料_2026版.pdf'); }
    if (step < 2) setStep(step + 1);
    else { onSave(selected); setStep(3); }
  };
  return <Drawer title={title} eyebrow="材料办理" onClose={onClose}><StepRail labels={['选择材料', '上传文件', '确认提交']} current={Math.min(step, 2)} /><div className="flex-1 overflow-y-auto p-5 sm:p-6">
    {step === 0 && <div className="space-y-5"><p className="text-[14px] leading-6 text-slate-600">请先选择本次要补充的材料 系统会保留材料类型 版本 更新时间和操作人</p><div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_240px]"><div className="space-y-2">{options.map(item => <button key={item.name} data-cy="material-option" type="button" aria-pressed={selected === item.name} onClick={() => setSelected(item.name)} className={`w-full rounded-lg border p-4 text-left ${selected === item.name ? 'border-[#245fc4] bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-[15px] font-semibold text-slate-900">{item.name}</div><div className="mt-1 text-[13px] leading-5 text-slate-600">{item.note}</div></div><StatusBadge status={item.status} /></div></button>)}</div>{current && <MaterialDetails item={current} />}</div></div>}
    {step === 1 && <div className="space-y-5"><div><h3 className="text-[16px] font-semibold">上传 {current?.name}</h3><p className="mt-1 text-[14px] leading-6 text-slate-600">提交前请核对文件内容与有效期。涉及身份证明、授权书等敏感资料，仅在授权范围内查阅并保留操作留痕。</p></div><FileChoice fileName={fileName} setFileName={setFileName} /><label className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-[14px] leading-6 text-slate-700"><input type="checkbox" className="mt-1 h-4 w-4 accent-[#245fc4]" defaultChecked />我确认该材料可用于当前主体或当前活动的资料协同。</label></div>}
    {step === 2 && <div className="space-y-5"><ComplianceBoundary /><section className="rounded-lg border border-slate-200 p-4"><div className="text-[13px] font-semibold text-slate-500">本次提交</div><div className="mt-2 text-[16px] font-semibold text-slate-900">{current?.name}</div><div className="mt-2 text-[14px] text-slate-600">文件：{fileName || '示例材料_2026版.pdf'}</div><div className="mt-3 flex items-center gap-2 text-[13px] text-slate-600"><LockKeyhole className="h-4 w-4 text-[#245fc4]" />提交后进入资料核对，可继续补充或替换版本。</div></section></div>}
    {step === 3 && <div className="py-14 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-6 w-6" /></div><h3 className="mt-4 text-[20px] font-semibold">材料已写入资料清单</h3><p className="mx-auto mt-2 max-w-sm text-[14px] leading-6 text-slate-600">已记录本次版本与操作时间，材料状态更新为待资料核对。</p></div>}
  </div><footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:px-6"><button onClick={step === 3 ? onClose : () => step ? setStep(step - 1) : onClose()} className="h-10 rounded-md border border-slate-300 px-4 text-[14px] font-semibold text-slate-700 hover:bg-slate-50">{step === 0 || step === 3 ? '返回列表' : '上一步'}</button>{step < 3 && <button onClick={goNext} className="flex h-10 items-center gap-2 rounded-md bg-[#245fc4] px-4 text-[14px] font-semibold text-white hover:bg-[#1c4c9e]">{step === 2 ? '保存并写入清单' : '下一步'}<ArrowRight className="h-4 w-4" /></button>}</footer></Drawer>;
}

function MaterialDetails({ item }: { item: MaterialItem }) {
  const hasFile = item.status !== '待准备';
  return <aside data-cy="material-details" className="sticky top-0 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left">
    <div className="text-[12px] font-semibold text-slate-500">材料详情</div>
    <h3 className="mt-1 text-[16px] leading-6 font-semibold text-slate-900">{item.name}</h3>
    <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
      <DetailLine label="材料类型" value={item.group} />
      <DetailLine label="当前状态" value={item.status} />
      <DetailLine label="最近更新" value={item.update === '—' ? '尚未上传' : item.update} />
      <DetailLine label="操作人员" value={item.owner} />
    </div>
    <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
      <div className="text-[12px] font-semibold text-slate-500">当前文件</div>
      <div className="mt-1 break-words text-[13px] leading-5 font-semibold text-slate-800">{hasFile ? `${item.name}_2026版.pdf` : '暂未上传文件'}</div>
      <div className="mt-1 text-[12px] leading-5 text-slate-500">{hasFile ? '版本 v1.2 已关联活动档案' : '选择后进入下一步上传文件'}</div>
    </div>
    <p className="mt-4 text-[13px] leading-5 text-slate-600">{item.note}</p>
  </aside>;
}

export function OrganizerMaterials({ canEdit }: { canEdit: boolean }) {
  const [materials, setMaterials] = useState(subjectSeed);
  const [uploadOpen, setUploadOpen] = useState(false);
  const prepared = materials.filter(item => ['已上传', '已完善', '待资料核对', '已补正'].includes(item.status)).length;
  const updateMaterial = (name: string) => setMaterials(list => list.map(item => item.name === name ? { ...item, status: '待资料核对', update: '刚刚', owner: '林洁', note: '已上传新版本 等待资料核对' } : item));
  const uploadable = materials.filter(item => item.status !== '已完善');
  return <div className="space-y-5"><ModuleTitle eyebrow="主办方主体档案" title="首次入驻与主体材料" description="主办方先建立可复用主体档案，再在每场活动中引用对应材料。营业执照、授权材料、安全责任人信息和相关资质都从这里开始管理。" actions={canEdit ? <button onClick={() => setUploadOpen(true)} className="flex h-10 items-center gap-1.5 rounded-md bg-[#245fc4] px-4 text-[14px] font-semibold text-white hover:bg-[#1c4c9e]"><Upload className="h-4 w-4" />上传主体材料</button> : <span className="inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-[14px] font-semibold text-slate-600">资料查看与补正提示</span>} />
    <ComplianceBoundary />
    <section className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]"><div className="rounded-lg border border-slate-200 bg-white p-5"><div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-[#245fc4]"><Building2 className="h-5 w-5" /></div><h3 className="mt-4 text-[20px] leading-7 font-semibold text-slate-900">新疆星河文化传媒有限公司</h3><p className="mt-3 text-[14px] leading-6 text-slate-600"><span className="block">主体材料可被多场活动引用</span><span className="block">提交后按活动形成独立版本快照</span></p><div className="mt-5 grid grid-cols-2 gap-3"><SummaryBox label="材料准备" value={`${prepared} / ${materials.length}`} /><SummaryBox label="待补充" value={`${materials.length - prepared} 项`} tone="amber" /></div><div className="mt-5 space-y-3 border-t border-slate-200 pt-5"><DetailLine label="统一社会信用代码" value="91650100XXXXXXXXXX" /><DetailLine label="主要联系人" value="林洁 · 138****8821" /><DetailLine label="主体安全责任人" value="已登记 脱敏展示" /></div></div>
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="border-b border-slate-200 px-5 py-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-[18px] font-semibold">主体材料清单</h3><p className="mt-1 text-[14px] leading-6 text-slate-600">根据主体情况与活动性质准备。标注“如适用”的材料不作为所有活动的固定必填项。</p></div><span className="text-[13px] font-semibold text-slate-500">默认脱敏 · 操作留痕</span></div></div><div className="overflow-x-auto"><table className="min-w-[940px] w-full text-left"><thead><tr className="bg-slate-50 text-[13px] text-slate-600"><th className="p-4 font-semibold">材料名称</th><th className="p-4 font-semibold">材料类型</th><th className="p-4 font-semibold">资料状态</th><th className="p-4 font-semibold">更新时间</th><th className="p-4 font-semibold">说明</th><th className="p-4 text-right font-semibold">操作</th></tr></thead><tbody className="divide-y divide-slate-200">{materials.map(item => <tr key={item.name}><td className="p-4"><div className="flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-[#245fc4]" /><span className="text-[15px] font-semibold text-slate-900 whitespace-nowrap">{item.name}</span>{item.conditional && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">如适用</span>}</div></td><td className="p-4 text-[14px] text-slate-700 whitespace-nowrap">{item.group}</td><td className="p-4"><StatusBadge status={item.status} /></td><td className="p-4 text-[14px] text-slate-600 whitespace-nowrap">{item.update}</td><td className="p-4 text-[14px] leading-5 text-slate-700">{item.note}</td><td className="p-4 text-right">{canEdit ? <button onClick={() => setUploadOpen(true)} className="h-9 rounded-md px-3 text-[14px] font-semibold text-[#245fc4] hover:bg-blue-50">{item.status === '待准备' ? '上传材料' : '查看或更新'}</button> : <button className="h-9 rounded-md px-3 text-[14px] font-semibold text-[#245fc4] hover:bg-blue-50">查看记录</button>}</td></tr>)}</tbody></table></div></section></section>
    <section className="grid gap-4 md:grid-cols-3"><InfoCard icon={<BadgeCheck className="h-5 w-5" />} title="首次提交" text="上传主体证明、授权材料和安全责任人信息后形成首个主体版本。" /><InfoCard icon={<UsersRound className="h-5 w-5" />} title="多人协作" text="主体、场所、搭建与保安单位分别维护各自需要确认的材料。" /><InfoCard icon={<LockKeyhole className="h-5 w-5" />} title="隐私保护" text="身份证明和联系方式默认脱敏，查看与导出需要按权限留痕。" /></section>
    {uploadOpen && <MaterialUploadDrawer title="上传主体材料" options={uploadable} onClose={() => setUploadOpen(false)} onSave={updateMaterial} />}
  </div>;
}

export function ActivityMaterials({ canEdit }: { canEdit: boolean }) {
  const [materials, setMaterials] = useState(activitySeed);
  const [drawer, setDrawer] = useState<'filing' | 'upload' | null>(null);
  const ready = materials.filter(item => ['已上传', '已补正', '待资料核对', '已归档'].includes(item.status)).length;
  const updateMaterial = (name: string) => setMaterials(list => list.map(item => item.name === name ? { ...item, status: '待资料核对', update: '刚刚', owner: '林洁', note: '已上传新版本 等待资料核对' } : item));
  const markFiling = () => setMaterials(list => list.map(item => item.name === '活动备案信息表' ? { ...item, status: '待资料核对', update: '刚刚', owner: '林洁', note: '信息已保存至活动档案 待属地清单核对' } : item));
  return <div className="space-y-5"><ModuleTitle eyebrow="单场活动材料" title="活动备案与安全协同材料" description={<><span className="block">以单场活动为单位归集基础信息 场地协作和现场安全材料</span><span className="block">不同活动的受理机关与清单可能不同 请以属地当前要求为准</span></>} actions={canEdit ? <><button onClick={() => setDrawer('filing')} className="flex h-10 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 text-[14px] font-semibold text-slate-800 hover:bg-slate-50"><FileText className="h-4 w-4" />填写或更新备案信息</button><button onClick={() => setDrawer('upload')} className="flex h-10 items-center gap-1.5 rounded-md bg-[#245fc4] px-4 text-[14px] font-semibold text-white hover:bg-[#1c4c9e]"><Upload className="h-4 w-4" />上传活动材料</button></> : <span className="inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-[14px] font-semibold text-slate-600">查看资料进度</span>} />
    <ComplianceBoundary />
    <section className="grid gap-4 lg:grid-cols-3"><ActionCard icon={<FileText className="h-5 w-5" />} title="1 填写或更新备案信息" text="名称 时间 地点 容量 人数 内容与关联责任单位" status={materials[0].status} onClick={() => canEdit && setDrawer('filing')} buttonText={canEdit ? '查看或更新' : '查看信息'} /><ActionCard icon={<MapPinned className="h-5 w-5" />} title="2 完善场地与安全协作" text="场所管理方 临时设施 保安服务与现场平面材料" status="已补正" onClick={() => canEdit && setDrawer('upload')} buttonText={canEdit ? '补充材料' : '查看清单'} /><ActionCard icon={<FolderPlus className="h-5 w-5" />} title="3 留存回执与补正" text="上传受理回执 补正通知或相关决定文书并归档" status={ready >= 6 ? '已上传' : '待准备'} onClick={() => canEdit && setDrawer('upload')} buttonText={canEdit ? '上传文件' : '查看进度'} /></section>
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="border-b border-slate-200 px-5 py-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-[18px] font-semibold">本场材料清单</h3><p className="mt-1 text-[14px] leading-6 text-slate-600">已准备 {ready} 项。条件材料会在活动性质、场地或属地要求触发时由主办方补充。</p></div><span className="text-[13px] font-semibold text-slate-500">活动编号 EVT-2026-0628</span></div></div><div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left"><thead><tr className="bg-slate-50 text-[13px] text-slate-600"><th className="p-4 font-semibold">材料名称</th><th className="p-4 font-semibold">协同模块</th><th className="p-4 font-semibold">资料状态</th><th className="p-4 font-semibold">最近更新</th><th className="p-4 font-semibold">当前说明</th><th className="p-4 text-right font-semibold">操作</th></tr></thead><tbody className="divide-y divide-slate-200">{materials.map(item => <tr key={item.name}><td className="p-4"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-[#245fc4]" /><span className="text-[15px] font-semibold text-slate-900 whitespace-nowrap">{item.name}</span>{item.conditional && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">如适用</span>}</div></td><td className="p-4 text-[14px] text-slate-700 whitespace-nowrap">{item.group}</td><td className="p-4"><StatusBadge status={item.status} /></td><td className="p-4 text-[14px] text-slate-600 whitespace-nowrap">{item.update}</td><td className="p-4 text-[14px] leading-5 text-slate-700">{item.note}</td><td className="p-4 text-right">{canEdit ? <button onClick={() => setDrawer(item.name === '活动备案信息表' ? 'filing' : 'upload')} className="h-9 rounded-md px-3 text-[14px] font-semibold text-[#245fc4] hover:bg-blue-50">{item.status === '待准备' ? '去准备' : '查看或更新'}</button> : <button className="h-9 rounded-md px-3 text-[14px] font-semibold text-[#245fc4] hover:bg-blue-50">查看记录</button>}</td></tr>)}</tbody></table></div></section>
    <section className="rounded-lg border border-slate-200 bg-white p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#245fc4]" /><div><h3 className="text-[16px] font-semibold">条件事项提醒</h3><p className="mt-2 text-[14px] leading-6 text-slate-600"><span className="block">如活动面向社会公众且规模较大 涉及营业性演出 临时舞台看台 临时设施或其他特殊事项</span><span className="block">请在活动所在地有管辖权机关公布的当前清单下补充材料并留存回执</span><span className="block">平台只提供材料协同与提醒</span></p></div></div></section>
    <section className="rounded-lg border border-slate-200 bg-white p-5"><div className="flex items-start gap-3"><Landmark className="mt-0.5 h-5 w-5 shrink-0 text-[#245fc4]" /><div className="min-w-0"><h3 className="text-[16px] font-semibold">属地办事指引</h3><p className="mt-2 text-[14px] leading-6 text-slate-600">当前活动预计面向公众 5,000 人，请在正式办理前结合活动性质、场地和属地当前清单向有管辖权机关核验。以下链接仅作公开办事信息参考，不替代受理意见。</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[14px] font-semibold"><a className="text-[#245fc4] hover:text-[#1c4c9e]" href="https://gat.xinjiang.gov.cn/gat/zcjd/201806/5027986edf9941bd8251cb3f9b4972db.shtml" target="_blank" rel="noreferrer">查看新疆公安活动须知</a><a className="text-[#245fc4] hover:text-[#1c4c9e]" href="https://wlt.xinjiang.gov.cn/wlt/zcjd/202410/8e1e3f4233f34a5e95a4ca9336d92226.shtml" target="_blank" rel="noreferrer">查看营业性演出政策解读</a></div></div></div></section>
    {drawer === 'filing' && <FilingDrawer canEdit={canEdit} onClose={() => setDrawer(null)} onSave={markFiling} />}
    {drawer === 'upload' && <MaterialUploadDrawer title="上传活动材料" options={materials.filter(item => item.name !== '活动备案信息表')} onClose={() => setDrawer(null)} onSave={updateMaterial} />}
  </div>;
}

function FilingDrawer({ canEdit, onClose, onSave }: { canEdit: boolean; onClose: () => void; onSave: () => void }) {
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [fileName, setFileName] = useState('');
  const submit = () => { onSave(); setSaved(true); setStep(3); };
  return <Drawer title="填写活动备案信息" eyebrow="单场活动材料" onClose={onClose}><StepRail labels={['基础信息', '协作单位', '材料检查']} current={Math.min(step, 2)} /><div className="flex-1 overflow-y-auto p-5 sm:p-6">
    {step === 0 && <div className="space-y-5"><p className="text-[14px] leading-6 text-slate-600"><span className="block">以下字段参考已提供的备案表样本组织</span><span className="block">请在活动所在地按当前公开清单确认提交机关和必填范围</span></p><div className="grid gap-4 sm:grid-cols-2"><InputField label="活动名称" value="2026 魔都动漫嘉年华" /><InputField label="申请时间" value="2026-06-08" /><InputField label="起止时间" value="2026-06-28 09:00—18:00" /><InputField label="活动地点" value="新疆国际会展中心 3号馆" /><InputField label="场地额定容量" value="6,000 人" /><InputField label="拟参加活动人数" value="5,000 人" /></div><InputField label="活动内容" value="动漫展览、舞台互动、角色表演、周边展示与现场售票" multiline /></div>}
    {step === 1 && <div className="space-y-4"><p className="text-[14px] leading-6 text-slate-600">将不同责任单位关联到本场活动，后续可分别补充或确认材料，不把它们混为主办方主体档案。</p><CollaboratorRow icon={<Building2 className="h-5 w-5" />} title="承办者" detail="新疆星河文化传媒有限公司 · 主体档案已关联" state="已关联" /><CollaboratorRow icon={<MapPinned className="h-5 w-5" />} title="场所管理者" detail="新疆国际会展中心 · 场地使用证明已关联，活动前复核" state="已关联" /><CollaboratorRow icon={<ShieldCheck className="h-5 w-5" />} title="保安服务与安全协作" detail="当前安保配置已关联，可继续更新人员数量和安全方案版本" state="已关联" /><CollaboratorRow icon={<UsersRound className="h-5 w-5" />} title="临时设施搭建单位" detail="如有临时舞台、看台或搭建时补充" state="如适用" /></div>}
    {step === 2 && <div className="space-y-5"><ComplianceBoundary /><section className="rounded-lg border border-slate-200 p-4"><h3 className="text-[16px] font-semibold">补充备案表附件</h3><p className="mt-1 text-[14px] leading-6 text-slate-600">可上传经确认的备案信息表草稿、场所证明或其他材料版本。完成后将写入活动档案，等待按属地清单继续核对。</p><div className="mt-4"><FileChoice fileName={fileName} setFileName={setFileName} /></div></section><label className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-[14px] leading-6 text-slate-700"><input type="checkbox" className="mt-1 h-4 w-4 accent-[#245fc4]" defaultChecked />我确认已核对基础信息，并理解平台保存的是资料协同记录，不代表已向任何机关提交或取得许可。</label></div>}
    {step === 3 && <div className="py-14 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-6 w-6" /></div><h3 className="mt-4 text-[20px] font-semibold">活动信息已写入材料清单</h3><p className="mx-auto mt-2 max-w-sm text-[14px] leading-6 text-slate-600">已生成活动材料记录。后续可继续补充协作材料、上传回执或记录补正通知。</p></div>}
  </div><footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:px-6"><button onClick={step === 0 || saved ? onClose : () => setStep(step - 1)} className="h-10 rounded-md border border-slate-300 px-4 text-[14px] font-semibold text-slate-700 hover:bg-slate-50">{step === 0 || saved ? '返回活动资料' : '上一步'}</button>{step < 3 && <button disabled={!canEdit} onClick={() => step === 2 ? submit() : setStep(step + 1)} className="flex h-10 items-center gap-2 rounded-md bg-[#245fc4] px-4 text-[14px] font-semibold text-white hover:bg-[#1c4c9e] disabled:cursor-not-allowed disabled:opacity-50">{step === 2 ? '保存至活动档案' : '下一步'}<ArrowRight className="h-4 w-4" /></button>}</footer></Drawer>;
}

function ModuleTitle({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: ReactNode; actions?: ReactNode }) { return <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="text-[12px] font-semibold tracking-wide text-slate-500">{eyebrow}</div><h2 className="mt-1 text-[24px] leading-8 font-semibold tracking-[-0.04em] text-slate-900">{title}</h2><p className="mt-2 max-w-3xl text-[15px] leading-6 text-slate-600">{description}</p></div>{actions && <div className="flex flex-wrap gap-2">{actions}</div>}</div>; }
function SummaryBox({ label, value, tone = 'blue' }: { label: string; value: string; tone?: 'blue' | 'amber' }) { return <div className={`rounded-md p-3 ${tone === 'amber' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-[#245fc4]'}`}><div className="text-[12px] font-semibold">{label}</div><div className="mt-1 text-[21px] leading-6 font-semibold">{value}</div></div>; }
function DetailLine({ label, value }: { label: string; value: string }) { return <div><div className="text-[12px] font-semibold text-slate-500">{label}</div><div className="mt-1 text-[14px] font-semibold text-slate-800">{value}</div></div>; }
function InfoCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <div className="rounded-lg border border-slate-200 bg-white p-5"><div className="text-[#245fc4]">{icon}</div><h3 className="mt-3 text-[16px] font-semibold text-slate-900">{title}</h3><p className="mt-2 text-[14px] leading-6 text-slate-600">{text}</p></div>; }
function ActionCard({ icon, title, text, status, onClick, buttonText }: { icon: ReactNode; title: string; text: string; status: MaterialStatus; onClick: () => void; buttonText: string }) { return <div className="rounded-lg border border-slate-200 bg-white p-5"><div className="flex items-start justify-between gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-[#245fc4]">{icon}</div><StatusBadge status={status} /></div><h3 className="mt-4 text-[17px] font-semibold text-slate-900">{title}</h3><p className="mt-2 text-[14px] leading-6 text-slate-600">{text}</p><button onClick={onClick} className="mt-4 inline-flex h-9 items-center gap-1 text-[14px] font-semibold text-[#245fc4] hover:text-[#1c4c9e]">{buttonText}<ChevronRight className="h-4 w-4" /></button></div>; }
function InputField({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) { return <label className={multiline ? 'block' : ''}><span className="text-[14px] font-semibold text-slate-800">{label}</span>{multiline ? <textarea defaultValue={value} className="mt-2 min-h-24 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-[14px] leading-6 outline-none focus:border-[#245fc4]" /> : <input defaultValue={value} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-[14px] outline-none focus:border-[#245fc4]" />}</label>; }
function CollaboratorRow({ icon, title, detail, state, warn = false }: { icon: ReactNode; title: string; detail: string; state: string; warn?: boolean }) { return <div className="flex gap-3 rounded-lg border border-slate-200 p-4"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${warn ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-[#245fc4]'}`}>{icon}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-[15px] font-semibold text-slate-900">{title}</h3><span className={`rounded px-2 py-0.5 text-[12px] font-semibold ${warn ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{state}</span></div><p className="mt-1 text-[14px] leading-6 text-slate-600">{detail}</p></div></div>; }
