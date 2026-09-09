from PIL import Image, ImageChops, ImageStat
from pathlib import Path
import json
qa=Path('testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-regenerated')
review=json.loads((qa/'level2-environment-verification.json').read_text())
first=Image.open(qa/'water-isolated-t0.png').convert('RGB')
second=Image.open(qa/'water-isolated-t1.png').convert('RGB')
pose=review['isolation']
sx=first.width/pose['cameraWidth'];sy=first.height/pose['cameraHeight']
result={}
for name,uv in [('water',[.477,.36,.501,.49]),('rock',[.22,.43,.30,.57])]:
 bounds=(int((pose['x']+pose['width']*uv[0])*sx),int((pose['y']+pose['height']*uv[1])*sy),int((pose['x']+pose['width']*uv[2])*sx),int((pose['y']+pose['height']*uv[3])*sy))
 diff=ImageChops.difference(first.crop(bounds),second.crop(bounds))
 result[name]={'bounds':bounds,'meanRgbDifference':ImageStat.Stat(diff).mean,'changedBounds':diff.getbbox()}
assert sum(result['water']['meanRgbDifference'])/3>2,'Water pixels did not move'
assert result['rock']['changedBounds'] is None,'Rock pixels moved'
result['passed']=True
result['method']='Two isolated captures at shader time 0 and 0.73 seconds; camera and scene simulation paused.'
(qa/'water-motion-verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
