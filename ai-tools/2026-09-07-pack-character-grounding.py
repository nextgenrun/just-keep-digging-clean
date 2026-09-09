"""Pack supersampled gait art into padded mip-safe atlases and publish native sole data."""
from pathlib import Path
from PIL import Image
import hashlib,json,math
ROOT=Path(__file__).resolve().parents[1];C=json.loads((ROOT/'values/characterGroundingPolish.json').read_text())
OUT=ROOT/C['workRoot'];DEST=ROOT/C['runtimeRoot'];SIZE=C['frameSizePx'];PAD=8;PAGE=2048
DEST.mkdir(parents=True,exist_ok=True)
for folder in [DEST.parent,DEST]:
 (folder/'readme.md').write_text('# Grounded character V3\n\nApproved V2 materials supersampled at 1024px into 512px frames. Native Standard Walk and Standard Run with shoe-sole grounding and authored handoffs. No cloth or outlines. Eight-pixel gutters and power-of-two pages support trilinear minification.\n')
def pow2(v):return 1<<(v-1).bit_length()
report={'version':C['version'],'sourceSizePx':1024,'frameSizePx':512,'clothEnabled':False,'sheets':{}}
contacts={}
for group in ['body','torch']:
 source=OUT/f'export-{group}.json'
 if not source.exists():continue
 data=json.loads(source.read_text())
 assert data['sourceUnchanged'] and data['maximumClothValue']==0
 for key,feet in data['sheets'].items():
  spec=C['sheets'][key];pages=[]
  for f in feet:
   i=f['frame'];p=OUT/'raw-1024'/key/f'frame-{i:04d}.png'
   with Image.open(p) as raw:im=raw.convert('RGBa').resize((SIZE,SIZE),Image.Resampling.LANCZOS).convert('RGBA')
   box=im.getchannel('A').getbbox();assert box
   tile=im.crop(box);w,h=tile.width+2*PAD,tile.height+2*PAD;location=None
   for pi,page in enumerate(pages):
    for shelf in page['shelves']:
     if h<=shelf['h'] and shelf['x']+w<=PAGE:location=(pi,shelf['x'],shelf['y']);shelf['x']+=w;break
    if location:break
    if page['height']+h<=PAGE:
     location=(pi,0,page['height']);page['shelves'].append({'x':w,'y':page['height'],'h':h});page['height']+=h;break
   if location is None:
    pages.append({'height':h,'shelves':[{'x':w,'y':0,'h':h}],'tiles':[]});location=(len(pages)-1,0,0)
   pi,x,y=location;pages[pi]['tiles'].append((i,tile,box,x+PAD,y+PAD))
  textures=[];pageInfo=[]
  for pi,page in enumerate(pages):
   width=pow2(max(s['x'] for s in page['shelves']));height=pow2(page['height']);atlas=Image.new('RGBA',(width,height));frames=[]
   for i,tile,box,x,y in page['tiles']:
    atlas.paste(tile,(x,y))
    frames.append({'filename':str(i),'frame':{'x':x,'y':y,'w':tile.width,'h':tile.height},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':box[0],'y':box[1],'w':tile.width,'h':tile.height},'sourceSize':{'w':SIZE,'h':SIZE}})
   filename=f'{key}-{pi}.webp';path=DEST/filename;atlas.save(path,format='WEBP',lossless=True,method=3)
   textures.append({'image':filename+'?v='+C['version'],'format':'RGBA8888','size':{'w':width,'h':height},'scale':1,'frames':frames})
   pageInfo.append({'file':filename,'width':width,'height':height,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
  (DEST/f'{key}.json').write_text(json.dumps({'textures':textures,'meta':{'version':C['version'],'sourceSizePx':1024,'clothEnabled':False,'mipmaps':True,'gutterPx':PAD}},separators=(',',':')))
  report['sheets'][key]={'frames':len(feet),'pages':pageInfo,'gpuBytesIncludingMips':sum(p['width']*p['height']*4*4//3 for p in pageInfo)}
  isRun=key in ['survival-mixamo-v1-walk-loop-sheet','survival-held-torch-v2-run-sheet']
  isWalk=key in ['survival-blender-v2-walk-sheet','survival-held-torch-v1-walkLoop-sheet']
  markers={}
  if isRun:markers={5:[feet[5]['l']['x'],feet[5]['l']['bottom']],18:[feet[18]['r']['x'],feet[18]['r']['bottom']]}
  if isWalk:markers={7:[feet[7]['l']['x'],feet[7]['l']['bottom']],20:[feet[20]['r']['x'],feet[20]['r']['bottom']]}
  entry={'size':512,'contacts':markers,'feet':{f['frame']:{s:{k:round(f[s][k],3) for k in ['x','y','bottom']} for s in ['l','r']} for f in feet}}
  if isRun or isWalk:
   windows=[('l',8,14),('r',20,27)] if isRun else [('l',8,17),('r',21,29)]
   slopes=[]
   for side,a,b in windows:
    xs=list(range(a,b+1));ys=[feet[i%24][side]['x'] for i in xs];mx=sum(xs)/len(xs);my=sum(ys)/len(ys)
    slopes.append(-sum((x-mx)*(y-my) for x,y in zip(xs,ys))/sum((x-mx)**2 for x in xs))
   entry['stridePx']=round(sum(slopes)/len(slopes)*24*101/512,4)
  contacts[key]=entry
  print('GROUNDED_PACKED',key,len(feet),entry.get('stridePx'),flush=True)
(DEST/'manifest.json').write_text(json.dumps(report,indent=2))
walk=contacts.get('survival-blender-v2-walk-sheet');run=contacts.get('survival-mixamo-v1-walk-loop-sheet')
def transfers(a,b):
 def cost(x,y):return sum((x[s]['x']-y[s]['x'])**2+1.5*(x[s]['y']-y[s]['y'])**2 for s in ['l','r'])
 return [min(range(24),key=lambda j:cost(a['feet'][i],b['feet'][j])) for i in range(24)]
t={ 'walkToRun':transfers(walk,run),'runToWalk':transfers(run,walk)} if walk and run else {}
(ROOT/'values/characterGroundingContacts.generated.js').write_text('/** Native shoe measurements in full 512px frame coordinates. Regenerate with the dated grounding packer. */\nexport const CHARACTER_GROUNDING_CONTACTS = Object.freeze('+json.dumps(contacts,separators=(',',':'))+');\nexport const CHARACTER_GAIT_TRANSFERS = Object.freeze('+json.dumps(t,separators=(',',':'))+');\n')
print('GROUNDED_PACK_OK',len(contacts),'sheets',flush=True)
