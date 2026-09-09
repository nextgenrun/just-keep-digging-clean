"""Pack approved resource cutouts and verify their runtime alpha and readability."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'sprites/UI/resource-icons-imagegen-2026-09-09'
CONFIG = json.loads((ROOT / 'values/resourceIconArtBuild.json').read_text(encoding='utf-8-sig'))
manifest = {}
review = Image.new('RGB', (660, 320), '#10141c')
draw = ImageDraw.Draw(review)
for column, resource in enumerate(('dirt', 'stone', 'copper')):
    source = PACK / f'{resource}-v2.png'
    master = Image.open(source).convert('RGBA')
    alpha = master.getchannel('A')
    assert alpha.getextrema() == (0, 255), f'{resource}: no complete alpha range'
    bounds = alpha.point(lambda value: 255 if value > CONFIG['alphaThreshold'] else 0).getbbox()
    subject = master.crop(bounds)
    subject.thumbnail((CONFIG['subjectSize'], CONFIG['subjectSize']), Image.Resampling.LANCZOS)
    runtime = Image.new('RGBA', (CONFIG['runtimeSize'], CONFIG['runtimeSize']))
    runtime.alpha_composite(subject, ((runtime.width-subject.width)//2, (runtime.height-subject.height)//2))
    output = PACK / f'{resource}-runtime-v2.png'
    runtime.save(output, optimize=True)
    visible = [p for p in runtime.getdata() if p[3] > 32]
    magenta = sum(1 for r,g,b,a in visible if min(r,b)-g > 40)
    assert magenta == 0, f'{resource}: magenta contamination: {magenta}'
    assert all(runtime.getpixel(p)[3] == 0 for p in [(0,0),(255,0),(0,255),(255,255)])
    manifest[resource] = dict(source=source.name, path=output.name,
        sha256=hashlib.sha256(output.read_bytes()).hexdigest(),
        size=list(runtime.size), sourceBounds=list(bounds),
        alphaExtrema=list(runtime.getchannel('A').getextrema()), magentaPixels=magenta)
    draw.text((column*220+12, 10), resource.upper(), fill='white')
    for row, color in enumerate(CONFIG['previewBackgrounds']):
        y = 38 + row*136
        draw.rectangle((column*220, y, (column+1)*220-1, y+129), fill=color)
        x = column*220+10
        for size in CONFIG['previewSizes']:
            small = runtime.resize((size,size), Image.Resampling.LANCZOS)
            review.paste(small, (x,y+12), small)
            draw.text((x,y+112), str(size)+'px', fill='#967b58')
            x += size+9
review.save(PACK / 'runtime-readability-review.png')
(PACK / 'runtime-manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
print(json.dumps(manifest, indent=2))
