"""Pack trimmed V2 frames while retaining each original full-frame coordinate system."""
from pathlib import Path
from PIL import Image
import argparse, hashlib, json, math
ROOT=Path(__file__).resolve().parents[1]
C=json.loads((ROOT/'values/characterDefinitionRuntimeV2.json').read_text())
OUT=ROOT/C['workRoot']; DEST=ROOT/C['runtimeRoot']; DEST.mkdir(parents=True,exist_ok=True)
for folder in (DEST.parent,DEST):
    readme=folder/'readme.md'
    if not readme.exists():readme.write_text('# Approved character definition V2\n\nNative animation poses with approved V2 surfaces. No secondary cloth deformation. Atlas trim offsets preserve a fixed full-frame coordinate system.\n')
INV=json.loads((OUT/'inventory.json').read_text())
SIZE=C['packedSizePx']; PAGE=C['atlasPageSizePx']; PAD=C['atlasPaddingPx']
MANIFEST=DEST/'manifest.json'
manifest=json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {'version':C['version'],'frameSizePx':SIZE,'clothEnabled':False,'sheets':{}}
def bounds(image):
    return image.getchannel('A').point(lambda a:255 if a>8 else 0).getbbox()
def pack(entry):
    key=entry['key'];root=OUT/f'raw-{C["sourceSizePx"]}'/key
    old=Image.open(ROOT/entry['path'].split('?')[0]).convert('RGBA');oldsize=entry['frameConfig']['frameWidth'];columns=old.width//oldsize
    tiles=[];aliases={};unique={};differences=[]
    for i in entry['frames']:
        with Image.open(root/f'frame-{i:04d}.png') as raw:
            im=raw.convert('RGBA')
        if im.size!=(SIZE,SIZE):im=im.resize((SIZE,SIZE),Image.Resampling.LANCZOS)
        before=old.crop(((i%columns)*oldsize,(i//columns)*oldsize,(i%columns+1)*oldsize,(i//columns+1)*oldsize))
        a,b=bounds(before),bounds(im)
        if not b:raise ValueError(f'Blank {key}:{i}')
        if a:differences.append({'frame':i,'boundsDeltaNormalized':[round(b[j]/SIZE-a[j]/oldsize,6) for j in range(4)]})
        box=im.getchannel('A').getbbox();digest=hashlib.sha256(im.tobytes()).hexdigest()
        if digest in unique:aliases[i]=unique[digest];continue
        tile={'index':i,'box':box,'image':im.crop(box),'w':box[2]-box[0]+PAD*2,'h':box[3]-box[1]+PAD*2}
        tiles.append(tile);unique[digest]=i
    pages=[];positions={}
    for tile in sorted(tiles,key=lambda t:(-t['h'],-t['w'])):
        location=None
        for pageIndex,page in enumerate(pages):
            for shelf in page['shelves']:
                if tile['h']<=shelf['h'] and shelf['x']+tile['w']<=PAGE:
                    location=(pageIndex,shelf['x'],shelf['y']);shelf['x']+=tile['w'];break
            if location:break
            if page['height']+tile['h']<=PAGE:
                shelf={'x':tile['w'],'y':page['height'],'h':tile['h']};page['shelves'].append(shelf);page['height']+=tile['h'];location=(pageIndex,0,shelf['y']);break
        if location is None:
            pages.append({'height':tile['h'],'shelves':[{'x':tile['w'],'y':0,'h':tile['h']}],'tiles':[]});location=(len(pages)-1,0,0)
        p,x,y=location;pages[p]['tiles'].append((tile,x,y));positions[tile['index']]=(p,x+PAD,y+PAD,tile['box'])
    for alias,original in aliases.items():positions[alias]=positions[original]
    textures=[];bytesRGBA=0;files=[]
    for p,page in enumerate(pages):
        width=max(s['x'] for s in page['shelves']);height=page['height'];atlas=Image.new('RGBA',(width,height))
        for tile,x,y in page['tiles']:atlas.paste(tile['image'],(x+PAD,y+PAD))
        filename=f'{key}-{p}.webp';target=DEST/filename;atlas.save(target,format='WEBP',lossless=True,method=2)
        files.append({'file':filename,'width':width,'height':height,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()});bytesRGBA+=width*height*4
        frames=[]
        for i,(pageIndex,x,y,box) in sorted(positions.items()):
            if pageIndex!=p:continue
            w,h=box[2]-box[0],box[3]-box[1]
            frames.append({'filename':str(i),'frame':{'x':x,'y':y,'w':w,'h':h},'rotated':False,'trimmed':True,'spriteSourceSize':{'x':box[0],'y':box[1],'w':w,'h':h},'sourceSize':{'w':SIZE,'h':SIZE}})
        textures.append({'image':filename+'?v='+C['version'],'format':'RGBA8888','size':{'w':width,'h':height},'scale':1,'frames':frames})
    (DEST/f'{key}.json').write_text(json.dumps({'textures':textures,'meta':{'version':C['version'],'clothEnabled':False}},separators=(',',':')))
    maxDelta=max((abs(v) for d in differences for v in d['boundsDeltaNormalized']),default=0)
    result={'frames':len(positions),'uniqueFrames':len(tiles),'pages':files,'gpuBytes':bytesRGBA,'oldGpuBytes':old.width*old.height*4,'maximumBoundsDeltaNormalized':maxDelta,'alignment':differences}
    print(f'DEFINITION_ATLAS_OK {key} frames={len(positions)} pages={len(pages)} gpuMiB={bytesRGBA/1048576:.1f} boundsDelta={maxDelta:.4f}',flush=True)
    return result
parser=argparse.ArgumentParser();parser.add_argument('--ready',action='store_true');args=parser.parse_args()
missing=[]
for entry in INV['sheets']:
    key=entry['key']
    if key in manifest['sheets']:continue
    root=OUT/f'raw-{C["sourceSizePx"]}'/key
    if not all((root/f'frame-{i:04d}.png').is_file() for i in entry['frames']):missing.append(key);continue
    manifest['sheets'][key]=pack(entry);MANIFEST.write_text(json.dumps(manifest,indent=2))
manifest['complete']=not missing
manifest['summary']={'sheets':len(manifest['sheets']),'frames':sum(s['frames'] for s in manifest['sheets'].values()),'gpuBytes':sum(s['gpuBytes'] for s in manifest['sheets'].values()),'oldGpuBytes':sum(s['oldGpuBytes'] for s in manifest['sheets'].values())}
MANIFEST.write_text(json.dumps(manifest,indent=2))
print('DEFINITION_PACK_STATUS '+json.dumps({'missing':missing,**manifest['summary']}),flush=True)
if missing and not args.ready:raise SystemExit(1)
