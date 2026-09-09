"""Resize/format conversion and alpha validation for the game texture."""
from pathlib import Path
from PIL import Image
import json, hashlib
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
cfg=json.loads((ROOT/'values/understarWorldLogoExport.json').read_text())
im=Image.open(OUT/'understar-world-logo-4k.png')
assert im.mode=='RGBA' and im.size==(cfg['width'],cfg['height'])
a=im.getchannel('A')
bbox=a.getbbox()
assert bbox[0]>0 and bbox[1]>0 and bbox[2]<im.width and bbox[3]<im.height
runtime=im.resize((cfg['runtimeWidth'],round(cfg['runtimeWidth']*im.height/im.width)),Image.Resampling.LANCZOS)
path=OUT/'understar-world-logo-runtime.webp'
runtime.save(path,'WEBP',quality=95,method=6)
report={'master':list(im.size),'runtime':list(runtime.size),'alphaBounds':list(bbox),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
(OUT/'export-verification.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))

