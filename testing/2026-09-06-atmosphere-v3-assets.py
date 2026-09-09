from pathlib import Path
from PIL import Image
import hashlib,json
root=Path('sprites/backgrounds/world-visual-v2/regenerated-horizon-v2')
assets=[]
for file in ['cloud-cumulus-v3.png','celestial-v3.png']:
    p=root/file
    im=Image.open(p)
    assert im.mode=='RGBA'
    alpha=im.getchannel('A')
    assets.append(dict(file=file,width=im.width,height=im.height,mode=im.mode,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),alphaExtrema=alpha.getextrema(),transparentPixels=alpha.histogram()[0],opaquePixels=alpha.histogram()[255]))
result=dict(date='2026-09-06',method='Built-in ImageGen; source files copied byte-for-byte. Runtime-only frame/edge masks, no source repainting.',assets=assets)
(root/'2026-09-06-atmosphere-v3-manifest.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
