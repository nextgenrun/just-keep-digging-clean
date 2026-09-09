"""Validate contact dots against decoded current atlas pixels and draw a QA figure."""
from pathlib import Path
import json
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent
entries=json.loads((OUT/"contact-assets-updated.json").read_text(encoding="utf-8"));cells=[];stats=[]
for e in entries:
 p=ROOT/e["path"];atlas=json.loads(p.read_text(encoding="utf-8"));images={}
 rows={r[0]:r for r in e["contacts"].values()}
 for n,row in enumerate(rows.values()):
  tex,f=next((t,f) for t in atlas["textures"] for f in t["frames"] if int(f["filename"])==row[0]);ip=tex["image"].split("?")[0]
  if ip not in images:images[ip]=Image.open(p.parent/ip).convert("RGBA")
  r=f["frame"];s=f["spriteSourceSize"];size=f["sourceSize"]["w"];ratio=size/e["size"]
  im=Image.new("RGBA",(size,size));im.paste(images[ip].crop((r["x"],r["y"],r["x"]+r["w"],r["y"]+r["h"])),(s["x"],s["y"]))
  mx,my=round(row[1]*ratio),round(row[2]*ratio);a=im.getchannel("A")
  dist=min((((x-mx)**2+(y-my)**2)**.5 for y in range(max(0,my-15),min(size,my+16)) for x in range(max(0,mx-15),min(size,mx+16)) if a.getpixel((x,y))>80),default=999)
  stats.append({"sheet":e["key"],"frame":row[0],"nearestOpaquePx":round(dist,2)})
  if n==0 or "atlasSha256" in e:
   small=im.resize((256,256),Image.Resampling.LANCZOS);cell=Image.new("RGB",(256,286),(28,33,44));cell.paste(small,(0,24),small)
   d=ImageDraw.Draw(cell);xx,yy=mx/size*256,my/size*256+24;d.ellipse((xx-4,yy-4,xx+4,yy+4),outline="#00ff9d",width=2)
   d.text((6,4),e["key"].replace("survival-","").replace("-sheet","")[:37],fill="white");d.text((6,272),f"contact frame {row[0]} | limb {dist:.1f}px",fill="white");cells.append(cell)
 for im in images.values():im.close()
result=Image.new("RGB",(1024,((len(cells)+3)//4)*286),(20,24,33))
for i,cell in enumerate(cells):result.paste(cell,((i%4)*256,(i//4)*286))
result.save(OUT/"contact-markers-restored.jpg",quality=93);(OUT/"contact-marker-validation.json").write_text(json.dumps(stats,indent=2),encoding="utf-8")
assert all(s["nearestOpaquePx"]<=2 for s in stats),stats
print(json.dumps({"contacts":len(stats),"sheets":len(entries),"maximumDistancePx":max(s["nearestOpaquePx"] for s in stats)}))
