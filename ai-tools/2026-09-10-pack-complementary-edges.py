"""Pack approved alpha edge artwork; core terrain is never an input or output."""
from pathlib import Path
from PIL import Image
import json, hashlib
root = Path(__file__).resolve().parents[1]
folder = root / 'sprites/environment/complementary-terrain-edges-v1'
cfg = json.loads((root / 'values/complementaryTerrainEdgeBuild.json').read_text())
manifest = []
for source in sorted(folder.glob('*-source.png')):
    image = Image.open(source).convert('RGBA')
    alpha = image.getchannel('A')
    assert alpha.getextrema()[0] == 0, f'{source.name}: transparent alpha required'
    box = alpha.point(lambda a: 255 if a >= cfg['boundsAlpha'] else 0).getbbox()
    assert box
    # Only trim empty margins and resize; preserve the authored alpha within the crop.
    packed = image.crop(box)
    slug = source.stem.removesuffix('-source')
    if 'corner' in slug:
        packed.thumbnail((cfg['cornerMax'],cfg['cornerMax']), Image.Resampling.LANCZOS)
    else:
        width = cfg['shadowWidth'] if 'shadow' in slug else cfg['rimWidth']
        packed = packed.resize((width,round(packed.height*width/packed.width)), Image.Resampling.LANCZOS)
    target = folder / (slug+'.png');packed.save(target)
    manifest.append({'id':slug,'source':source.name,'runtime':target.name,'crop':box,'size':packed.size,
      'alpha':packed.getchannel('A').getextrema(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
(folder/'manifest.json').write_text(json.dumps({'generator':'built-in ImageGen','coreTilesChanged':False,'assets':manifest},indent=2)+'\n')
print(json.dumps(manifest,indent=2))
