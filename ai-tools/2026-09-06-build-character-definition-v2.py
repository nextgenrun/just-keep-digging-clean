"""Pack V2 native frames and build faithful original / V1 / V2 comparisons."""
import hashlib, json, math, shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops, ImageStat
ROOT=Path(__file__).resolve().parents[1]
C=json.loads((ROOT/'values/characterDefinitionPreviewV2.json').read_text(encoding='utf-8-sig'))
OUT=ROOT/C['outputRoot'];P=C['presentation'];OLD=ROOT/'visual-approval-previews/2026-09-06-character-definition-v1'
font=lambda size,bold=False:ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf' if bold else 'C:/Windows/Fonts/segoeui.ttf',size)
original=Image.open(ROOT/C['beforeSheet']).convert('RGBA')
previous=Image.open(OLD/'after-walk-512.webp').convert('RGBA')
old=json.loads((OLD/'comparison.json').read_text())
paths=sorted((OUT/'after-raw').glob('frame-*.png'));assert paths,'No renders'
indices=[int(path.stem.split('-')[-1]) for path in paths]
cell=C['packedSize'];cols=8
frames=[Image.open(path).convert('RGBA').resize((cell,cell),Image.Resampling.LANCZOS) for path in paths]
def extract(sheet,i,n,columns):
    x=(i%columns)*n;y=(i//columns)*n
    return sheet.crop((x,y,x+n,y+n))
originals=[extract(original,i,C['sourceFrameSize'],C['sourceColumns']) for i in indices]
previouses=[extract(previous,i,old['afterFrameSize'],old['afterColumns']) for i in indices]
occupancy=old['occupancy']
def label(draw,xy,value,size,colour,bold=False):draw.text(xy,value,font=font(size,bold),fill=colour,anchor='mt')
def paste(board,frame,x,ground,height):
    size=round(height/occupancy)
    board.alpha_composite(frame.resize((size,size),Image.Resampling.LANCZOS),(round(x-size*.5),round(ground-size*.890625)))
def board_for(j,reference='previous',detail=False):
    board=Image.new('RGBA',(P['width'],P['height']),tuple(P['background'])+(255,));d=ImageDraw.Draw(board)
    d.line((800,48,800,950),fill=(51,62,73))
    before=previouses[j] if reference=='previous' else originals[j]
    title=P['previousTitle'] if reference=='previous' else 'CURRENT GAME'
    subtitle=P['previousSubtitle'] if reference=='previous' else 'Original sprites · 256px'
    label(d,(P['beforeCenter'],48),title,34,(197,205,213),True)
    label(d,(P['afterCenter'],48),P['afterTitle'],34,(240,207,139),True)
    label(d,(P['beforeCenter'],95),subtitle,19,(138,153,167))
    label(d,(P['afterCenter'],95),P['afterSubtitle'],19,(173,182,190))
    for frame,x in ((before,P['beforeCenter']),(frames[j],P['afterCenter'])):
        d.line((x-290,P['groundY'],x+290,P['groundY']),fill=(47,63,73),width=2)
        if detail:
            n=frame.width;zoom=P['closeup'];cx,cy=zoom['center'];half=zoom['fraction']/2
            crop=frame.crop(tuple(round(v*n) for v in (cx-half,cy-half,cx+half,cy+half)))
            board.alpha_composite(crop.resize((620,620),Image.Resampling.LANCZOS),(round(x-310),140))
        else:paste(board,frame,x,P['groundY'],P['bodyHeight'])
        paste(board,frame,x,950,P['gameplayHeight'])
    d=ImageDraw.Draw(board)
    label(d,(800,814),'SAME SMALL-SCALE VIEW · 75 PX AT 1×',15,(138,153,167),True)
    label(d,(800,978),'Same model, camera and walk poses. Native material and deformation trial; review only.',15,(130,146,158))
    return board.convert('RGB')
board_for(0).save(OUT/'first-vs-second.png')
board_for(0,'original').save(OUT/'before-after.png')
board_for(0,'previous',True).save(OUT/'detail.png')
for reference,name in (('previous','first-vs-second.webp'),('original','before-after.webp')):
    if indices==list(range(24)):
        boards=[board_for(i,reference) for i in range(len(frames))]
        boards[0].save(OUT/name,save_all=True,append_images=boards[1:],duration=round(1000/C['fps']),loop=0,lossless=True,method=4)
sheet=Image.new('RGBA',(cols*cell,math.ceil((max(indices)+1)/cols)*cell))
for i,frame in zip(indices,frames):sheet.alpha_composite(frame,((i%cols)*cell,(i//cols)*cell))
sheet.save(OUT/'after-walk-768.webp',lossless=True,quality=100,method=4)
shutil.copyfile(ROOT/C['beforeSheet'],OUT/'before-walk-256.webp')
shutil.copyfile(OLD/'after-walk-512.webp',OUT/'previous-walk-512.webp')
for folder,description in (('after-raw','Native 1536px transparent Blender renders. Never used by the game.'),('pose-capture','Exact sampled walking poses from the active native export pipeline.')):
    (OUT/folder/'readme.md').write_text(description+'\n',encoding='utf-8')
manifest={'frames':24,'renderedIndices':indices,'afterFrameSize':cell,'afterColumns':cols,'beforeFrameSize':C['sourceFrameSize'],'sourceColumns':C['sourceColumns'],'previousFrameSize':old['afterFrameSize'],'previousColumns':old['afterColumns'],'occupancy':occupancy,'fps':C['fps'],'presentation':P}
(OUT/'comparison.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
differences=[sum(ImageStat.Stat(ImageChops.difference(a,b)).mean)/4 for a,b in zip(frames,frames[1:]+frames[:1])]
report={'renderedIndices':indices,'uniqueFrames':len(set(hashlib.sha256(frame.tobytes()).hexdigest() for frame in frames)),'originalReferenceExact':hashlib.sha256((ROOT/C['beforeSheet']).read_bytes()).hexdigest()==old['sourceSheetSha256']==hashlib.sha256((OUT/'before-walk-256.webp').read_bytes()).hexdigest(),'previousReferenceExact':hashlib.sha256((OLD/'after-walk-512.webp').read_bytes()).hexdigest()==hashlib.sha256((OUT/'previous-walk-512.webp').read_bytes()).hexdigest(),'sourceSheetSha256':hashlib.sha256((ROOT/C['beforeSheet']).read_bytes()).hexdigest(),'alphaEdgeMargins':[],'frameDifferences':differences,'loopSeamVsMaxStep':differences[-1]/max(differences)}
for frame in frames:
    box=frame.getchannel('A').point(lambda a:255 if a>8 else 0).getbbox()
    report['alphaEdgeMargins'].append(min(box[0],box[1],cell-box[2],cell-box[3]))
(OUT/'comparison-validation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print('V2_COMPARISON_READY '+json.dumps({'frames':len(frames),'unique':report['uniqueFrames'],'minAlphaMargin':min(report['alphaEdgeMargins']),'loopSeamVsMaxStep':report['loopSeamVsMaxStep']}))
