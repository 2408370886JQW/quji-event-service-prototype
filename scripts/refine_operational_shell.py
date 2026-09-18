from pathlib import Path

path = Path('/home/ubuntu/quji-event-service-prototype/client/src/pages/Home.tsx')
s = path.read_text()

# Bring the interface from soft consumer cards to compact operational surfaces.
s = s.replace('rounded-xl', 'rounded-lg')
s = s.replace('rounded-2xl', 'rounded-xl')

old = """${active ? 'bg-[#255ec8] text-white font-semibold' : 'text-slate-700 hover:bg-slate-100'}"""
new = """${active ? 'bg-blue-50 text-[#1c4c9e] font-semibold border-l-2 border-[#245fc4]' : 'text-slate-700 hover:bg-slate-100 border-l-2 border-transparent'}"""
if old not in s:
    raise SystemExit('Missing sidebar selected state')
s = s.replace(old, new, 1)

old = """<aside className={`hidden lg:flex ${sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'} shrink-0 bg-white border-r border-slate-200 flex-col sticky top-0 h-screen transition-[width] duration-200`}>"""
new = """<aside className={`hidden lg:flex ${sidebarCollapsed ? 'w-[64px]' : 'w-[232px]'} shrink-0 bg-white border-r border-slate-200 flex-col sticky top-0 h-screen transition-[width] duration-200`}>"""
if old not in s:
    raise SystemExit('Missing sidebar shell')
s = s.replace(old, new, 1)

old = """<div className={`mt-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center ${sidebarCollapsed ? 'p-1.5 justify-center' : 'p-3 gap-2'}`}>"""
new = """<div className={`mt-3 rounded-md bg-slate-50 border border-slate-200 flex items-center ${sidebarCollapsed ? 'p-1.5 justify-center' : 'p-3 gap-2'}`}>"""
if old not in s:
    raise SystemExit('Missing profile shell')
s = s.replace(old, new, 1)

path.write_text(s)
print('Refined operational UI shell')
