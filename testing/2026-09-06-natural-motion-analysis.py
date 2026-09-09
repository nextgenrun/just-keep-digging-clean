from PIL import Image, ImageChops, ImageStat
from pathlib import Path
import json
qa=Path('testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-natural-motion')
review=json.loads((qa/'motion-verification.json').read_text(encoding='utf-8-sig'))
result={}
regions=[('water','water',[.477,.36,.501,.49]),('rock','water',[.22,.43,.30,.57]),
 ('rolling_cloud','cloud',[.05,.05,.95,.95]),('treetops','foliage',[.05,.05,.95,.65]),('tree_roots','foliage',[.10,.84,.90,.97])]
for name,kind,uv in regions:
 first=Image.open(qa/(kind+'-isolated-t0.png')).convert('RGB')
 second=Image.open(qa/(kind+'-isolated-t1.png')).convert('RGB')
 pose=review['isolation'][kind];sx=first.width/pose['cameraWidth'];sy=first.height/pose['cameraHeight']
 bounds=[int((pose['x']+pose['width']*uv[0])*sx),int((pose['y']+pose['height']*uv[1])*sy),
         int((pose['x']+pose['width']*uv[2])*sx),int((pose['y']+pose['height']*uv[3])*sy)]
 diff=ImageChops.difference(first.crop(bounds),second.crop(bounds))
 result[name]={'bounds':bounds,'meanRgbDifference':ImageStat.Stat(diff).mean,'changedBounds':diff.getbbox()}
for name in ['water','rolling_cloud','treetops']:
 assert sum(result[name]['meanRgbDifference'])/3>.08, name+' texture did not animate'
for name in ['rock','tree_roots']:
 assert result[name]['changedBounds'] is None, name+' moved'
result['passed']=True
result['method']='Read-only pixel comparison of rendered sprites at fixed positions, with simulation and camera paused.'
(qa/'material-motion-verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
