"""Preserve built-in ImageGen sources and pack approved transparent runtime artwork."""
from pathlib import Path
import json, shutil, hashlib, math
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
CFG=json.loads((ROOT/'values/approvedAssetPolishBuild.json').read_text())
pack=ROOT/'sprites/UI/approved-polish-2026-09-09'
pack.mkdir(exist_ok=True)
input_file=ROOT/'.git-safety/generated-polish-inputs.json'
inputs=json.loads(input_file.read_text()) if input_file.exists() else [
    {'id':slug,'path':str(pack/item['source']),'prompt':item['prompt']}
    for slug,item in json.loads((pack/'manifest.json').read_text()).items()]
manifest={}
for entry in inputs:
    slug=entry['id']; source=pack/f'{slug}-source.png'
    if Path(entry['path']).resolve()!=source.resolve(): shutil.copy2(entry['path'],source)
    art=Image.open(source)
    assert art.mode=='RGBA' and art.getchannel('A').getextrema()==(0,255),slug
    bounds=art.getchannel('A').point(lambda a: 255 if a>CFG['alphaThreshold'] else 0).getbbox()
    subject=art.crop(bounds)
    if slug.endswith('-edge') or slug=='cave-roots':
        subject.thumbnail((CFG['edgeWidth'],CFG['edgeWidth']),Image.Resampling.LANCZOS)
        runtime=subject
    else:
        subject.thumbnail((CFG['iconSubjectSize'],CFG['iconSubjectSize']),Image.Resampling.LANCZOS)
        runtime=Image.new('RGBA',(CFG['iconSize'],CFG['iconSize']))
        runtime.alpha_composite(subject,((runtime.width-subject.width)//2,(runtime.height-subject.height)//2))
    dest=pack/f'{slug}.png';runtime.save(dest,optimize=True)
    manifest[slug]={'source':source.name,'runtime':dest.name,'prompt':entry['prompt'],'generator':'built-in image_gen','alphaExtrema':list(runtime.getchannel('A').getextrema()),'size':list(runtime.size),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()}
cols=CFG['reviewColumns'];cw=CFG['reviewCellWidth'];ch=CFG['reviewCellHeight']
sheet=Image.new('RGB',(cols*cw,math.ceil(len(inputs)/cols)*ch),CFG['backgrounds'][0]);draw=ImageDraw.Draw(sheet)
for i,entry in enumerate(inputs):
    slug=entry['id'];art=Image.open(pack/f'{slug}.png');x=(i%cols)*cw;y=(i//cols)*ch
    draw.text((x+8,y+5),slug,fill='white')
    for row,bg in enumerate(CFG['backgrounds']):
        sy=y+22+row*112;draw.rectangle((x,sy,x+cw-1,sy+111),fill=bg)
        for n,size in enumerate(CFG['displaySizes']):
            icon=art.copy();icon.thumbnail((size,size),Image.Resampling.LANCZOS)
            sheet.paste(icon,(x+8+sum(CFG['displaySizes'][:n])+n*8,sy+4),icon)
sheet.save(pack/'readability-review.png')
(pack/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(pack/'readme.md').write_text('# Approved asset polish — 2026-09-09\n\nBuilt-in ImageGen originals are retained as source PNGs. Runtime PNGs preserve real alpha and are normalized by ai-tools/2026-09-09-pack-approved-polish.py. Prompts and hashes are in manifest.json. The two cave composition mockups are separate and are not runtime assets.\n')
print(f'Packed {len(manifest)} assets with verified alpha.')
