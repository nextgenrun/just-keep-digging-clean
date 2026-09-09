from PIL import Image, ImageChops, ImageStat
from pathlib import Path
import json
qa=Path('testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-level-one')
review=json.loads((qa/'polish-verification.json').read_text(encoding='utf-8-sig'))
result={}
for name,kind,uv in [('cloud_structure','cloud',[.05,.05,.95,.95]),('tree_canopies','foliage',[.05,.10,.90,.75]),('tree_roots','foliage',[.08,.88,.90,.98])]:
 first=Image.open(qa/(kind+'-isolated-t0.png')).convert('RGB');second=Image.open(qa/(kind+'-isolated-t1.png')).convert('RGB')
 p=review['isolation'][kind];sx=first.width/p['cameraWidth'];sy=first.height/p['cameraHeight']
 box=[int((p['x']+p['width']*uv[0])*sx),int((p['y']+p['height']*uv[1])*sy),int((p['x']+p['width']*uv[2])*sx),int((p['y']+p['height']*uv[3])*sy)]
 diff=ImageChops.difference(first.crop(box),second.crop(box))
 result[name]={'bounds':box,'meanRgbDifference':ImageStat.Stat(diff).mean,'changedBounds':diff.getbbox()}
for name in ['cloud_structure','tree_canopies']:
 assert sum(result[name]['meanRgbDifference'])/3>.1, name+' does not animate at a fixed position'
assert result['tree_roots']['changedBounds'] is None,'Tree roots moved'
result['passed']=True;result['method']='Read-only comparisons of actual rendered, fixed-position sprites with the camera and scene paused.'
(qa/'material-motion-verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
