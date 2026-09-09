from PIL import Image
from pathlib import Path
import json, hashlib
p=Path('sprites/backgrounds/world-visual-v2/regenerated-horizon-v2/weather-v4.png')
im=Image.open(p);print(im.size,im.mode)
w,h=im.size;columns=4;split=550
regions=[]
for col in range(columns):
    x0=round(col*w/4);x1=round((col+1)*w/4)
    a=im.crop((x0,0,x1,split)).getchannel('A');box=a.point(lambda v:255 if v>6 else 0).getbbox()
    regions.append(dict(name='rain-'+str(col),rect=[x0+box[0],box[1],box[2]-box[0],box[3]-box[1]]))
for col in range(columns):
    x0=round(col*w/4);x1=round((col+1)*w/4)
    regions.append(dict(name='impact-'+str(col),rect=[x0,560,x1-x0,h-560]))
result=dict(size=im.size,mode=im.mode,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),regions=regions)
p.with_name('2026-09-06-weather-v4-manifest.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
