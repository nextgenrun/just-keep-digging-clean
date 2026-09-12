"""Read-only production-graph/Boot inventory; writes dated audit evidence only."""
import importlib.util, json, gzip, hashlib
from pathlib import Path
from collections import Counter, defaultdict
from PIL import Image

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('production_builder',root/'tools/2026-07-17-build-production.py')
builder=importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
modules=builder.module_graph(root/'main.js')
assets,unresolved=builder.discover_assets(modules)
def relative(path): return path.relative_to(root).as_posix()
def size(path): return path.stat().st_size
rows=[{'path':relative(p),'bytes':size(p)} for p in assets]
groups=defaultdict(lambda:{'count':0,'bytes':0})
for row in rows:
    key='/'.join(row['path'].split('/')[:2])
    groups[key]['count']+=1; groups[key]['bytes']+=row['bytes']
module_rows=[]
for p in modules:
    raw=p.read_bytes()
    module_rows.append({'path':relative(p),'bytes':len(raw),'gzipBytes':len(gzip.compress(raw)),
                        'sha256':hashlib.sha256(raw).hexdigest()})
boot=json.loads((root/'testing/2026-09-12-audit-boot.json').read_text())
boot_rows=[]
for row in boot['queued']:
    physical_path=row['path'].split('?',1)[0].split('#',1)[0]
    p=root/physical_path; info={**row,'physicalPath':physical_path,'exists':p.is_file()}
    if p.is_file():
        info['bytes']=size(p)
        if row['type'] in ('image','spritesheet','atlas'):
            try:
                with Image.open(p) as im: info.update(width=im.width,height=im.height,rgbaBytes=im.width*im.height*4)
            except Exception as e: info['imageError']=str(e)
    boot_rows.append(info)
unique={r['physicalPath']:r for r in boot_rows}
result={'moduleCount':len(modules),'moduleBytes':sum(r['bytes'] for r in module_rows),
        'moduleGzipBytes':sum(r['gzipBytes'] for r in module_rows),'assetCount':len(rows),
        'assetBytes':sum(r['bytes'] for r in rows),'unresolved':unresolved,
        'groups':dict(sorted(groups.items(),key=lambda p:p[1]['bytes'],reverse=True)),
        'largestAssets':sorted(rows,key=lambda r:r['bytes'],reverse=True)[:30],
        'modules':module_rows,'bootEntries':len(boot_rows),'bootUniquePaths':len(unique),
        'bootEncodedBytes':sum(r.get('bytes',0) for r in unique.values()),
        'bootUniqueRgbaBytes':sum(r.get('rgbaBytes',0) for r in unique.values()),
        'bootTextureKeyRgbaBytes':sum(r.get('rgbaBytes',0) for r in {r['key']:r for r in boot_rows}.values()),
        'bootTypes':dict(Counter(r['type'] for r in boot_rows)),
        'bootMissing':[r for r in boot_rows if not r['exists']],
        'bootLargestDecoded':sorted(boot_rows,key=lambda r:r.get('rgbaBytes',0),reverse=True)[:35],
        'bootAssets':boot_rows}
(root/'testing/2026-09-12-audit-inventory.json').write_text(json.dumps(result,indent=2))
print(json.dumps({k:v for k,v in result.items() if k not in ('modules','bootAssets','bootLargestDecoded','largestAssets','unresolved','bootMissing')},indent=2))
print('Missing Boot paths:',len(result['bootMissing']),'Unresolved scanner strings:',len(unresolved))
