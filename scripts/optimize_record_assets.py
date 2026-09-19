from pathlib import Path
from PIL import Image

source_dir = Path('/home/ubuntu/webdev-static-assets')
for name in ['quji-event-poster', 'quji-character-reference', 'quji-costume-reference', 'quji-prop-reference']:
    source = source_dir / f'{name}.jpg'
    target = source_dir / f'{name}.webp'
    with Image.open(source) as image:
        image = image.convert('RGB')
        image.thumbnail((900, 1200), Image.Resampling.LANCZOS)
        image.save(target, 'WEBP', quality=84, method=6)
    print(f'{target.name}: {target.stat().st_size} bytes')
