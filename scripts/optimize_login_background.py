from pathlib import Path
from PIL import Image

source = Path('/home/ubuntu/webdev-static-assets/quji-xinjiang-login-background.png')
target = Path('/home/ubuntu/webdev-static-assets/quji-xinjiang-login-background.webp')

with Image.open(source) as image:
    image.convert('RGB').resize((1920, 1080), Image.Resampling.LANCZOS).save(target, 'WEBP', quality=82, method=6)

print(f'Created {target} ({target.stat().st_size} bytes)')
