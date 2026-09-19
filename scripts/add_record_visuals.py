from pathlib import Path

path = Path('/home/ubuntu/quji-event-service-prototype/client/src/pages/Home.tsx')
s = path.read_text()

def replace_once(old: str, new: str, label: str):
    global s
    if old not in s:
        raise SystemExit(f'Missing {label}')
    s = s.replace(old, new, 1)

replace_once(
    "type Locale = 'zh' | 'en' | 'ug';",
    """type Locale = 'zh' | 'en' | 'ug';
const RECORD_VISUALS = {
  poster: '/manus-storage/quji-event-poster_ea223b22.webp',
  character: '/manus-storage/quji-character-reference_066e947c.webp',
  costume: '/manus-storage/quji-costume-reference_610f2304.webp',
  prop: '/manus-storage/quji-prop-reference_ca4a00a7.webp'
};""",
    'record visual constants'
)

replace_once(
    '''<p className="semantic-copy mt-3 text-[14px] leading-6 text-slate-600"><span className="block">本场活动主办方。主体档案用于活动资料归集与服务协同。</span><span className="block">不替代相关法定审批或登记程序。</span></p>''',
    '''<p className="semantic-copy mt-3 text-[14px] leading-6 text-slate-600"><span className="block whitespace-nowrap">本场活动主办方</span><span className="block whitespace-nowrap">主体档案用于活动资料归集与服务协同</span><span className="block whitespace-nowrap">不替代相关法定审批或登记程序</span></p>''',
    'organizer semantic lines'
)

old_overview = '''<section className="bg-white border border-slate-200 rounded-lg p-5"><ModuleTitle title="活动概况" description="活动基础信息、当前任务和跨环节服务状态汇总。" actions={<button onClick={() => onTab('materials')} className="text-[14px] font-semibold text-[#255ec8]">查看活动资料</button>} /><div className="mt-5 grid sm:grid-cols-2 gap-4">'''
new_overview = '''<section className="bg-white border border-slate-200 rounded-lg p-5"><div className="flex flex-col min-[640px]:flex-row gap-4"><img src={RECORD_VISUALS.poster} alt="2026 魔都动漫嘉年华活动海报" className="w-full min-[640px]:w-[104px] h-[140px] object-cover rounded-md border border-slate-200 bg-slate-100 shrink-0" /><div className="min-w-0 flex-1"><ModuleTitle title="活动概况" description="活动基础信息、当前任务和跨环节服务状态汇总。" actions={<button onClick={() => onTab('materials')} className="text-[14px] font-semibold text-[#255ec8] whitespace-nowrap">查看活动资料</button>} /></div></div><div className="mt-5 grid sm:grid-cols-2 gap-4">'''
replace_once(old_overview, new_overview, 'activity overview poster')

old_table_media = '''<td className="p-4"><div className="flex gap-2"><div className="w-10 h-12 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500"><Image className="w-4 h-4" /></div><div className="text-[13px] leading-5 text-slate-600">{item.ref}<br />服装全身图已上传</div></div></td>'''
new_table_media = '''<td className="p-4"><div className="flex items-center gap-2"><div className="flex -space-x-2"><img src={RECORD_VISUALS.character} alt={`${item.character}角色参考图`} className="w-10 h-12 object-cover rounded border-2 border-white bg-slate-100" /><img src={RECORD_VISUALS.costume} alt={`${item.character}服装全身图`} className="w-10 h-12 object-cover rounded border-2 border-white bg-slate-100" /></div><div className="text-[13px] leading-5 text-slate-600"><span className="block whitespace-nowrap">角色参考图已上传</span><span className="block whitespace-nowrap">服装全身图已上传</span></div></div></td>'''
replace_once(old_table_media, new_table_media, 'costume table visual cells')

old_drawer_media = '''<section className="border border-slate-200 rounded-lg p-4"><h3 className="text-[16px] font-semibold">参考图与服装图</h3><div className="mt-3 grid grid-cols-2 gap-3"><div className="h-32 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-500"><Image className="w-6 h-6" /><span className="mt-2 text-[13px]">{item.ref}</span></div><div className="h-32 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-500"><Shirt className="w-6 h-6" /><span className="mt-2 text-[13px]">服装全身图</span></div></div></section>'''
new_drawer_media = '''<section className="border border-slate-200 rounded-lg p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-[16px] font-semibold">角色、服装与道具资料</h3><span className="text-[13px] text-slate-500 whitespace-nowrap">3 项已上传</span></div><div className="mt-3 grid grid-cols-1 min-[460px]:grid-cols-3 gap-3"><figure className="min-w-0"><img src={RECORD_VISUALS.character} alt={`${item.character}角色参考图`} className="w-full aspect-[3/4] object-cover rounded-md border border-slate-200 bg-slate-100" /><figcaption className="mt-2 text-[13px] font-medium text-slate-700 whitespace-nowrap">角色参考图</figcaption></figure><figure className="min-w-0"><img src={RECORD_VISUALS.costume} alt={`${item.character}服装全身图`} className="w-full aspect-[3/4] object-cover rounded-md border border-slate-200 bg-slate-100" /><figcaption className="mt-2 text-[13px] font-medium text-slate-700 whitespace-nowrap">服装全身图</figcaption></figure><figure className="min-w-0"><img src={RECORD_VISUALS.prop} alt={`${item.character}道具参考图`} className="w-full aspect-[3/4] object-cover rounded-md border border-slate-200 bg-slate-100" /><figcaption className="mt-2 text-[13px] font-medium text-slate-700 whitespace-nowrap">道具参考图</figcaption></figure></div></section>'''
replace_once(old_drawer_media, new_drawer_media, 'costume detail visual panel')

path.write_text(s)
print('Added activity poster and submission visuals; fixed semantic organizer line breaks')
