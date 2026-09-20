from pathlib import Path
from PIL import Image

source_dir = Path('/home/ubuntu/webdev-static-assets')
outputs = {
    'sourced-license-sample1.jpg': 'quji-public-license-sample.webp',
    'sourced-identity-sample2.png': 'quji-public-identity-sample.webp',
    'sourced-permit-sample3.jpg': 'quji-public-permit-sample.webp',
}
for source_name, output_name in outputs.items():
    source = source_dir / source_name
    output = source_dir / output_name
    with Image.open(source) as image:
        image = image.convert('RGB')
        image.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
        image.save(output, 'WEBP', quality=84, method=6)
    print(f'{output}: {output.stat().st_size} bytes')
