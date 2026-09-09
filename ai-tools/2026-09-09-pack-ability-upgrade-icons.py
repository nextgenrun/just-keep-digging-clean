"""Pack ImageGen ability cutouts using the established UI icon size preset."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'sprites/UI/ability-upgrade-icons-v1'
CFG = json.loads((ROOT/'values/abilityUpgradeIconBuild.json').read_text(encoding='utf-8-sig'))
SIZES = json.loads((ROOT/'values/resourceIconArtBuild.json').read_text(encoding='utf-8-sig'))
review = Image.new('RGB', (CFG['reviewWidth'],CFG['reviewHeight']), CFG['backgrounds'][0])
draw = ImageDraw.Draw(review)
manifest = {}
for column, name in enumerate(CFG['icons']):
    source = PACK/f'{name}-source-v1.png'
    master = Image.open(source)
    assert master.mode=='RGBA', f'{name} requires real transparency'
    assert master.getchannel('A').getextrema()==(0,255)
    bounds = master.getchannel('A').point(lambda a: 255 if a>SIZES['alphaThreshold'] else 0).getbbox()
    subject = master.crop(bounds)
    subject.thumbnail((SIZES['subjectSize'],SIZES['subjectSize']), Image.Resampling.LANCZOS)
    runtime = Image.new('RGBA',(SIZES['runtimeSize'],SIZES['runtimeSize']))
    runtime.alpha_composite(subject,((runtime.width-subject.width)//2,(runtime.height-subject.height)//2))
    spill = sum(1 for r,g,b,a in runtime.getdata() if a>CFG['keySpillAlpha'] and g-max(r,b)>CFG['keySpillThreshold'])
    assert spill==0, f'{name} has green spill'
    output=PACK/f'{name}-v1.png'; runtime.save(output,optimize=True)
    manifest[name] = dict(source=source.name,runtime=output.name,sha256=hashlib.sha256(output.read_bytes()).hexdigest(),sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),size=list(runtime.size),sourceBounds=list(bounds),alphaExtrema=list(runtime.getchannel('A').getextrema()),greenSpillPixels=spill)
    draw.text((column*CFG['columnWidth']+CFG['labelInset'],CFG['labelTop']),name.upper(),fill='white')
    for row,color in enumerate(CFG['backgrounds']):
        y=CFG['rowTop']+row*CFG['rowHeight']; left=column*CFG['columnWidth']
        draw.rectangle((left,y,left+CFG['columnWidth']-1,y+CFG['rowHeight']-1),fill=color)
        x=left+CFG['iconInset']
        for size in CFG['displaySizes']:
            small=runtime.resize((size,size),Image.Resampling.LANCZOS)
            review.paste(small,(x,y+CFG['iconInset']),small)
            draw.text((x,y+CFG['sizeLabelTop']),f'{size}px',fill='#967b58')
            x+=size+CFG['iconInset']
review.save(PACK/'readability-review.png')
(PACK/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
