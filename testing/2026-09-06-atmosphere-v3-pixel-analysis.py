from PIL import Image, ImageChops, ImageStat
from pathlib import Path
import json, math
qa=Path('testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-atmosphere-v3')
result=json.loads((qa/'verification.json').read_text(encoding='utf-8-sig'))
r=result['cloudIsolation'];box=(r['x'],r['y'],r['x']+math.floor(r['width']),r['y']+math.floor(r['height']))
images={name:Image.open(qa/f'cloud-{name}.png').convert('RGB').crop(box) for name in ['thin','moved','thick']}
motion=ImageChops.difference(images['thin'],images['moved'])
weather=ImageChops.difference(images['moved'],images['thick'])
mean=lambda im:sum(ImageStat.Stat(im).mean)/3
changed=lambda im:sum(max(rgb)>3 for rgb in im.getdata())/(im.width*im.height)
metrics=dict(cloudMotionMeanRGB=mean(motion),cloudMotionChangedFraction=changed(motion),thicknessMeanRGB=mean(weather),thicknessChangedFraction=changed(weather),clearBrightness=mean(images['moved']),thickBrightness=mean(images['thick']))
assert metrics['cloudMotionMeanRGB']>.15
assert metrics['thicknessMeanRGB']>1
assert metrics['thickBrightness']>metrics['clearBrightness']
metrics['runtimeViews']=len(result['views'])
metrics['runtimeFps']={key:round(fn(v['fps'] for v in result['views']),2) for key,fn in [('min',min),('max',max)]}
metrics['townVideoSha256']='1650f7a88e2445ef9ab1be954680e4a8d5ffb51b2ccd8e7def5bec19726132d6'
(qa/'pixel-analysis.json').write_text(json.dumps(metrics,indent=2)+'\n')
print(json.dumps(metrics))
