from pathlib import Path
import re

home = Path('/home/ubuntu/quji-event-service-prototype/client/src/pages/Home.tsx')
component = Path('/home/ubuntu/quji-event-service-prototype/client/src/components/ComplianceMaterials.tsx')

source = home.read_text()
source, materials_count = re.subn(r'function Materials\(\).*?\nfunction Participants', 'function Participants', source, count=1, flags=re.S)
source, organizer_count = re.subn(r'function OrganizerPage\(\).*?\nfunction DataCenter', 'function DataCenter', source, count=1, flags=re.S)
if materials_count != 1 or organizer_count != 1:
    raise SystemExit(f'Unexpected replacement count: materials={materials_count}, organizer={organizer_count}')
home.write_text(source)

content = component.read_text()
old = '支持选择本地文件。演示环境可使用示例文件继续完成流程。'
new = '支持选择本地文件。也可使用示例文件继续完成资料流程。'
if old not in content:
    raise SystemExit('Expected file-upload helper text was not found')
component.write_text(content.replace(old, new))
