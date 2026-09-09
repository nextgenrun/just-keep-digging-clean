"""Export the menu derivative and verify logo dimensions, alpha and provenance."""
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
CFG = json.loads((ROOT/'values/understarLogoHdExport.json').read_text())
master = Image.open(OUT/'understar-rift-monolith-4k.png')
assert master.mode == 'RGBA' and master.size == (CFG['width'],CFG['height'])
a = np.array(master)
assert a[0,:,3].max() == a[-1,:,3].max() == a[:,0,3].max() == a[:,-1,3].max() == 0
magenta = (a[:,:,0].astype(int)-a[:,:,1] > 65) & (a[:,:,2].astype(int)-a[:,:,1] > 65) & (a[:,:,3] > 128)
assert int(magenta.sum()) < 20, f'Chroma spill: {magenta.sum()} pixels'
target = (CFG['runtimeWidth'],round(CFG['runtimeWidth']*master.height/master.width))
runtime = master.resize(target,Image.Resampling.LANCZOS)
runtime.save(OUT/'understar-rift-monolith-runtime.webp','WEBP',quality=94,method=6)
old_path = ROOT/'sprites/branding/understar-logo-v1/understar-rift-monolith-runtime.png'
def info(path):
    result = {'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    if path.suffix.lower() in ('.png','.webp'):
        im = Image.open(path)
        result.update(size=list(im.size),mode=im.mode)
        if im.mode == 'RGBA':
            aa = np.array(im.getchannel('A'))
            result.update(alphaBounds=list(im.getchannel('A').getbbox()),
                          transparentPixels=int((aa==0).sum()),softEdgePixels=int(((aa>0)&(aa<255)).sum()))
    return result
report = {'original':info(old_path),'assets':{name:info(OUT/name) for name in [
    'source-remaster.png','source-chroma.png','understar-source-cutout.png',
    'understar-rift-monolith-4k.png','understar-rift-monolith-runtime.webp','understar-logo-hd-v2.blend']},
    'checks':{'transparentOuterEdges':True,'magentaSpillPixels':int(magenta.sum()),
    'masterWidthGain':round(master.width/Image.open(old_path).width,3),
    'native4kTexture':False,'browser':'pending'}}
(OUT/'verification.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
