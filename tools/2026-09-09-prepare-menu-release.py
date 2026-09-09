"""Build an approved menu-only delta on the exact SSH live baseline."""
from pathlib import Path
import base64,difflib,gzip,hashlib,json,re,runpy,shutil
ROOT=Path(__file__).resolve().parents[1]
E=ROOT/'.tmp/menu-motion-live-20260909';P=E/'payload'
B=json.loads(gzip.decompress((E/'live-baseline.json.gz').read_bytes()))
TOOLS=runpy.run_path(str(ROOT/'tools/2026-07-17-build-production.py'))
TEXT={n:base64.b64decode(v) for n,v in B['texts'].items()}
M=json.loads(TEXT['build-manifest.json']);OLD=M['buildId']
BEFORE=ROOT/'testing/2026-09-09-menu-logo-motion/runtime-before'
SCOPE=sorted(p.relative_to(BEFORE).as_posix() for p in BEFORE.rglob('*.js'))
# Reconstruct the exact approved patch, excluding later edits in the shared checkout.
APPROVED=E/'approved-source'
patch=(ROOT/'testing/2026-09-09-menu-logo-motion/approved-runtime.patch').read_text(encoding='utf-8').splitlines(True)
i=0
while i<len(patch):
 if not patch[i].startswith('--- before/'):
  i+=1;continue
 name=patch[i][len('--- before/'):].strip();i+=2
 old=(BEFORE/name).read_text(encoding='utf-8').splitlines(True);result=[];cursor=0
 while i<len(patch) and not patch[i].startswith('--- before/'):
  match=re.match(r'@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@',patch[i]);assert match,patch[i]
  start=int(match.group(1))-1;result.extend(old[cursor:start]);cursor=start;i+=1
  while i<len(patch) and not patch[i].startswith(('@@','--- before/')):
   line=patch[i];kind=line[0]
   if kind in (' ','-'):
    assert old[cursor]==line[1:],name
    cursor+=1
   if kind in (' ','+'):result.append(line[1:])
   i+=1
 result.extend(old[cursor:]);dest=APPROVED/name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(''.join(result),encoding='utf-8')
ASSETS=sorted(p.relative_to(ROOT).as_posix() for p in (ROOT/'sprites/backgrounds/menu-atmosphere-v6').glob('*.mp4'))+[
 'sprites/branding/understar-motion-v6/understar-logo-loop.webm',
 'sprites/branding/understar-world-within-v4/understar-world-logo-runtime.webp']
def sha(b):return hashlib.sha256(b).hexdigest()
def norm(s):return s.replace('\r\n','\n').replace('\r','')
NEW=sha((OLD+''.join(sha(((APPROVED if n in SCOPE else ROOT)/n).read_bytes()) for n in SCOPE+ASSETS)).encode())[:12]
assert NEW!=OLD
merged={}
for name in SCOPE:
 a=norm(TOOLS['production_module_source'](BEFORE/name,OLD))
 b=norm(TOOLS['production_module_source'](APPROVED/name,OLD))
 live=norm(TEXT[name].decode('utf-8'))
 al,bl=a.splitlines(True),b.splitlines(True)
 for group in reversed(list(difflib.SequenceMatcher(None,al,bl,autojunk=False).get_grouped_opcodes(3))):
  first,last=group[0],group[-1]
  before=''.join(al[first[1]:last[2]]);after=''.join(bl[first[3]:last[4]])
  assert live.count(before)==1, 'Live merge context mismatch: '+name
  live=live.replace(before,after,1)
 merged[name]=live.replace(OLD,NEW).encode()
changes={}
def put(n,data):
 if n in B['files'] and sha(data)==B['files'][n]['sha256']:return
 p=P/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
 changes[n]={'size':len(data),'sha256':sha(data)}
for n,data in TEXT.items():
 if n.endswith(('.js','.mjs')) or n=='index.html':
  data=merged.get(n,data.replace(OLD.encode(),NEW.encode()))
  put(n,data)
  if n in changes:
   assert n+'.br' not in B['files'],'Existing Brotli sidecar needs regeneration'
   put(n+'.gz',gzip.compress(data,compresslevel=9,mtime=0))
for n in ASSETS:put(n,(ROOT/n).read_bytes())
M.update({'buildId':NEW,'moduleCacheKey':NEW,'baseBuildId':OLD,
 'releaseScope':'Approved Quiet sky logo and optimized menu/loading motion',
 'approvedPresentation':'quiet-sky','releaseDate':'2026-09-09'})
M['assetCount']+=sum(n not in B['files'] for n in ASSETS)
M['gzipSidecars']=sum(n.endswith('.gz') for n in set(B['files'])|set(changes)|{'build-manifest.json.gz'})
manifest=(json.dumps(M,indent=2)+'\n').encode();put('build-manifest.json',manifest);put('build-manifest.json.gz',gzip.compress(manifest,compresslevel=9,mtime=0))
expected={n:{k:r[k] for k in ('sha256','size')} for n,r in B['files'].items()};expected.update(changes)
plan={'root':B['root'],'baseBuild':OLD,'buildId':NEW,'changes':changes,'before':B['files'],'expected':expected,'semanticScope':SCOPE,'newAssets':ASSETS}
plan['uploadBytes']=sum(r['size'] for r in changes.values());plan['finalBytes']=sum(r['size'] for r in expected.values())
plan['peakBytes']=sum(r['size'] for r in B['files'].values())+plan['uploadBytes']+sum(B['files'].get(n,{}).get('size',0) for n in changes)
assert plan['peakBytes']<10_000_000_000
assert all(n.endswith(('.js','.mjs','.js.gz','.mjs.gz')) or n in ASSETS or n in ('index.html','index.html.gz','build-manifest.json','build-manifest.json.gz') for n in changes)
(E/'plan.json').write_text(json.dumps(plan,indent=2)+'\n',encoding='utf-8')
summary={k:plan[k] for k in ('baseBuild','buildId','uploadBytes','finalBytes','peakBytes','semanticScope')};summary.update({'changedFiles':len(changes),'removedFiles':0,'newAssets':len(ASSETS)})
(E/'summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
# Preview uses an independently checked copy of the previous deployed package.
base=ROOT/'dist-startup-motion-fixed-20260908'
missing=[]
for n,r in B['files'].items():
 if n=='.htaccess' or n in changes:continue
 p=base/n
 if not p.is_file() or p.stat().st_size!=r['size'] or sha(p.read_bytes())!=r['sha256']:missing.append(n)
assert not missing, 'Fallback package differs from live: '+str(missing[:10])
(E/'base-package-verified.json').write_text(json.dumps({'verified':True,'unmodifiedFiles':len(B['files'])-sum(n in B['files'] for n in changes),'base':str(base)},indent=2)+'\n')
# Module syntax inputs are public sources only, kept outside the deploy payload.
check=E/'module-check';check.mkdir(exist_ok=True)
for n,data in TEXT.items():
 if n.endswith(('.js','.mjs')):
  p=check/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((P/n).read_bytes() if n in changes else data)
print(json.dumps(summary,indent=2))
