from pathlib import Path
from PIL import Image
from concurrent.futures import ThreadPoolExecutor
import json,hashlib
ROOT=Path(__file__).resolve().parents[1];C=json.loads((ROOT/'values/startupCompression.json').read_text(encoding='utf-8-sig'))
r=json.loads((ROOT/'testing/2026-09-08-startup/baseline.json').read_text());paths={f['path'] for f in r['files'] if f['path'].endswith('.png') and f['bytes']>=C['minimumBytes']}
# All six menu posters must share the same compact delivery contract.
paths.update(p.relative_to(ROOT).as_posix() for p in (ROOT/'exports/pallet-v10/dig_game_full_non_tile_runtime_assets_v10_08_07_2026/sprites/backgrounds/background-database').glob('ChatGPT Image Jun 29, 2026*.png'))
def encode(rel):
 src=ROOT/rel;im=Image.open(src);dest=ROOT/'sprites/runtime-startup-v1'/(hashlib.sha256(rel.encode()).hexdigest()[:16]+'.webp')
 im.save(dest,'WEBP',quality=C['uiQuality'] if '/UI/' in rel else C['imageQuality'],method=C['method'],exact=True)
 if dest.stat().st_size>=src.stat().st_size*C['minimumSavingRatio']:return None
 decoded=Image.open(dest);assert decoded.size==im.size
 if 'A' in im.getbands():assert decoded.convert('RGBA').getchannel('A').tobytes()==im.getchannel('A').tobytes()
 return dict(source=rel,path=dest.relative_to(ROOT).as_posix(),before=src.stat().st_size,after=dest.stat().st_size,size=list(im.size))
with ThreadPoolExecutor(max_workers=C['workers']) as pool: rows=[r for r in pool.map(encode,sorted(paths)) if r]
mapping={r['source']:r['path'] for r in rows};(ROOT/'values/startupImageVariants.js').write_text('// Generated compact delivery variants; source dimensions and alpha are unchanged.\nexport const STARTUP_IMAGE_VARIANTS = Object.freeze('+json.dumps(mapping,indent=2)+');\n')
report=dict(images=len(rows),before=sum(r['before'] for r in rows),after=sum(r['after'] for r in rows),assets=rows)
(ROOT/'testing/2026-09-08-startup/image-compression.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:v for k,v in report.items() if k!='assets'}))

