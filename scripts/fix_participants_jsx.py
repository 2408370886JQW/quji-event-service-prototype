from pathlib import Path

p = Path('/home/ubuntu/quji-event-service-prototype/client/src/pages/Home.tsx')
s = p.read_text()
s = s.replace(
    'label={} className="mt-5 text-[14px] font-semibold text-[#255ec8] text-left" title={item.action} description={}',
    'label={`${item.action} →`} className="mt-5 text-[14px] font-semibold text-[#255ec8] text-left" title={item.action} description={`可按权限查阅${item.name}的实名、报名或资料核验明细。`}'
)
p.write_text(s)
print('Fixed JSX attributes in Participants')
