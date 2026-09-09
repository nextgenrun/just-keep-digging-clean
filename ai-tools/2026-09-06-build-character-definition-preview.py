"""Pack native preview renders and make an equal-scale before/after review."""
import hashlib, json, math, shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]
C=json.loads((ROOT/"values/characterDefinitionPreviewV1.json").read_text(encoding="utf-8-sig"))
OUT=ROOT/C["outputRoot"]; P=C["presentation"]
font=lambda size,bold=False:ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",size)
before_sheet=Image.open(ROOT/C["beforeSheet"]).convert("RGBA")
paths=sorted((OUT/"after-raw").glob("frame-*.png"))
assert paths,"No native renders"
frames=[]; before_frames=[]
for path in paths:
    i=int(path.stem.split("-")[-1]); n=C["sourceFrameSize"]; cols=C["sourceColumns"]
    before_frames.append(before_sheet.crop(((i%cols)*n,(i//cols)*n,(i%cols+1)*n,(i//cols+1)*n)))
    image=Image.open(path).convert("RGBA")
    frames.append(image.resize((C["packedSize"],C["packedSize"]),Image.Resampling.LANCZOS))
bbox=before_frames[0].getchannel("A").point(lambda a:255 if a>8 else 0).getbbox()
occupancy=(bbox[3]-bbox[1])/C["sourceFrameSize"]
def label(draw,xy,text,size,color,bold=False,anchor=None):
    draw.text(xy,text,font=font(size,bold),fill=color,anchor=anchor)
def paste_frame(board,frame,cx,ground,body_height):
    size=round(body_height/occupancy)
    scaled=frame.resize((size,size),Image.Resampling.LANCZOS)
    board.alpha_composite(scaled,(round(cx-size*.5),round(ground-size*.890625)))
def board_for(index):
    board=Image.new("RGBA",(P["width"],P["height"]),tuple(P["background"])+(255,))
    draw=ImageDraw.Draw(board)
    draw.line((800,48,800,950),fill=(51,62,73),width=1)
    label(draw,(P["beforeCenter"],48),"BEFORE",34,(197,205,213),True,"mt")
    label(draw,(P["afterCenter"],48),"AFTER — NATIVE RENDER TRIAL",34,(240,207,139),True,"mt")
    label(draw,(P["beforeCenter"],95),"Current game sprites · 256px frames",19,(138,153,167),anchor="mt")
    label(draw,(P["afterCenter"],95),"512px frames · materials · lighting · follow-through",19,(173,182,190),anchor="mt")
    for cx in (P["beforeCenter"],P["afterCenter"]):
        draw.line((cx-290,P["groundY"],cx+290,P["groundY"]),fill=(47,63,73),width=2)
    paste_frame(board,before_frames[index],P["beforeCenter"],P["groundY"],P["bodyHeight"])
    paste_frame(board,frames[index],P["afterCenter"],P["groundY"],P["bodyHeight"])
    draw=ImageDraw.Draw(board)
    label(draw,(800,790),"SAME GAMEPLAY SIZE",15,(138,153,167),True,"mt")
    paste_frame(board,before_frames[index],P["beforeCenter"],950,P["gameplayHeight"])
    paste_frame(board,frames[index],P["afterCenter"],950,P["gameplayHeight"])
    draw=ImageDraw.Draw(board)
    label(draw,(800,978),"Same source model, body pose and camera. Baked spring motion; no cloth collision simulation. Review only.",15,(130,146,158),anchor="mt")
    return board.convert("RGB")
boards=[board_for(i) for i in range(len(frames))]
boards[0].save(OUT/"before-after.png")
cols=8; n=C["packedSize"]
sheet=Image.new("RGBA",(cols*n,math.ceil(len(frames)/cols)*n))
for i,frame in enumerate(frames):sheet.alpha_composite(frame,((i%cols)*n,(i//cols)*n))
sheet.save(OUT/"after-walk-512.webp",lossless=True,quality=100,method=4)
shutil.copyfile(ROOT/C["beforeSheet"],OUT/"before-walk-256.webp")
if len(frames)==24:
    boards[0].save(OUT/"before-after.webp",save_all=True,append_images=boards[1:],duration=round(1000/C["fps"]),loop=0,lossless=True,method=4)
for folder,text in (("after-raw","Native transparent Blender renders. Source model is unchanged; review only."),("pose-capture","Pose sampling reports from the existing unified character export pipeline. Review only.")):
    (OUT/folder/"readme.md").write_text(text+"\n")
manifest={"frames":len(frames),"sourceSheetSha256":hashlib.sha256((ROOT/C["beforeSheet"]).read_bytes()).hexdigest(),"afterFrameSize":C["packedSize"],"beforeFrameSize":C["sourceFrameSize"],"occupancy":occupancy,"sourceColumns":C["sourceColumns"],"afterColumns":cols,"fps":C["fps"],"presentation":P}
(OUT/"comparison.json").write_text(json.dumps(manifest,indent=2))
print("CHARACTER_COMPARISON_OK "+json.dumps({"frames":len(frames),"poster":str(OUT/"before-after.png"),"animated":len(frames)==24}))

