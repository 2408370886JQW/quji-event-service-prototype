from pathlib import Path
from PIL import Image

source_dir = Path('/home/ubuntu/webdev-static-assets')
files = [
    'quji-business-license-demo',
    'quji-authorization-demo',
    'quji-business-permit-demo',
]

for stem in files:
    source = source_dir / f'{stem}.jpg'
    target = source_dir / f'{stem}.webp'
    with Image.open(source) as image:
        image = image.convert('RGB')
        image.thumbnail((960, 720), Image.Resampling.LANCZOS)
        image.save(target, 'WEBP', quality=82, method=6)
        print(f'{target}: {target.stat().st_size} bytes, {image.size[0]}x{image.size[1]}')
