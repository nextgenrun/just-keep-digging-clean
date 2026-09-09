"""Stage, hash-guard, publish and verify only the approved live-game delta."""
from pathlib import Path,PurePosixPath
import hashlib,json,os,shutil,sys
ROOT=Path('/home/customer/www/nextgen.run/public_html/diggame-beta-1')
LIMIT=10_000_000_000
MAINT=b'\nErrorDocument 503 "The game is updating. Please reload in a moment."\nRewriteEngine On\nRewriteRule ^ - [R=503,L]\n'
def sha(b):return hashlib.sha256(b).hexdigest()
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def safe(root,name):
 p=PurePosixPath(name)
 assert not p.is_absolute() and '..' not in p.parts and p.parts and str(p)==name
 q=root.joinpath(*p.parts)
 assert q.resolve().is_relative_to(root.resolve())
 for part in [q,*q.parents]:
  if part==root:break
  assert not part.is_symlink()
 return q
assert ROOT.resolve()==ROOT and ROOT.is_dir()
def inventory():
 result={}
 for p in ROOT.rglob('*'):
  assert not p.is_symlink()
  if p.is_file():result[p.relative_to(ROOT).as_posix()]={'size':p.stat().st_size,'sha256':digest(p)}
 return result
def compact(rows):return {n:{k:r[k] for k in ('size','sha256')} for n,r in rows.items()}
def check(expected,maintenance=False):
 current=inventory();expected=compact(expected)
 if maintenance:current.pop('.htaccess',None);expected.pop('.htaccess',None)
 assert current==expected,'Live content differs from expected manifest'
 return sum(r['size'] for r in current.values())
def exact(n):
 data=bytearray()
 while len(data)<n:
  b=sys.stdin.buffer.read(n-len(data));assert b,'Incomplete upload';data.extend(b)
 return bytes(data)
size=int(sys.stdin.buffer.readline());assert 0<size<20_000_000
raw=exact(size);plan=json.loads(raw)
assert plan['root']==str(ROOT) and len(plan['buildId'])==12 and all(c in '0123456789abcdef' for c in plan['buildId'])
assert plan['peakBytes']<LIMIT and plan['finalBytes']<LIMIT
for n in plan['changes']:
 assert n not in ('.htaccess',) and (n.endswith(('.js','.mjs','.js.gz','.mjs.gz')) or n in plan['newAssets'] or n in ('index.html','index.html.gz','build-manifest.json','build-manifest.json.gz'))
 safe(ROOT,n)
TX=ROOT.parent.parent/('.menu-motion-'+plan['buildId']);assert not TX.is_symlink()
STAGE=TX/'stage';BACKUP=TX/'backup';mode=sys.argv[1]
def restore():
 for n in plan['changes']:
  q=safe(ROOT,n);saved=safe(BACKUP,n)
  if n in plan['before']:
   assert saved.is_file() and digest(saved)==plan['before'][n]['sha256']
   shutil.copyfile(saved,q)
  elif q.exists():
   assert digest(q)==plan['changes'][n]['sha256'];q.unlink()
 safe(ROOT,'.htaccess').write_bytes((TX/'original-config').read_bytes())
 check(plan['before'])
if mode=='stage':
 check(plan['before'])
 assert shutil.disk_usage(ROOT).free>plan['uploadBytes']*2+100_000_000
 TX.mkdir(exist_ok=True);STAGE.mkdir(exist_ok=True)
 if (TX/'plan.json').exists():assert (TX/'plan.json').read_bytes()==raw
 (TX/'plan.json').write_bytes(raw)
 for i,(n,record) in enumerate(plan['changes'].items()):
  q=safe(STAGE,n);q.parent.mkdir(parents=True,exist_ok=True);remaining=record['size'];h=hashlib.sha256()
  with q.open('wb') as f:
   while remaining:
    b=exact(min(remaining,1024*1024));f.write(b);h.update(b);remaining-=len(b)
  assert h.hexdigest()==record['sha256'],n
  if (i+1)%300==0:print(json.dumps({'stagedFiles':i+1}),flush=True)
 (TX/'staged').write_text(sha(raw))
 print(json.dumps({'staged':True,'buildId':plan['buildId'],'files':len(plan['changes']),'bytes':plan['uploadBytes']}),flush=True)
elif mode=='apply':
 lock=ROOT/'.compact-deploy-lock';lock.mkdir()
 try:
  assert (TX/'staged').read_text()==sha(raw)
  check(plan['before'])
  for n,r in plan['changes'].items():assert digest(safe(STAGE,n))==r['sha256'],n
  BACKUP.mkdir(exist_ok=True)
  original=safe(ROOT,'.htaccess').read_bytes();(TX/'original-config').write_bytes(original)
  for n in plan['changes']:
   if n in plan['before']:
    q=safe(BACKUP,n);q.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(safe(ROOT,n),q)
  safe(ROOT,'.htaccess').write_bytes(original+MAINT)
  print(json.dumps({'maintenance':True}),flush=True)
  try:
   names=sorted(plan['changes'],key=lambda n:(n in ('index.html','index.html.gz'),n))
   for n in names:
    q=safe(ROOT,n);q.parent.mkdir(parents=True,exist_ok=True);os.replace(safe(STAGE,n),q)
   check(plan['expected'],maintenance=True)
   assert json.loads(safe(ROOT,'build-manifest.json').read_text())['buildId']==plan['buildId']
   safe(ROOT,'.htaccess').write_bytes(original)
   assert digest(safe(ROOT,'.htaccess'))==plan['before']['.htaccess']['sha256']
   (TX/'complete').write_text(plan['buildId'])
   print(json.dumps({'published':True,'buildId':plan['buildId'],'files':len(plan['expected']),'bytes':plan['finalBytes'],'maintenance':False,'deletions':0}),flush=True)
  except BaseException:
   restore();print(json.dumps({'rolledBack':True}),flush=True);raise
 finally:
  lock.rmdir()
elif mode=='verify':
 size=check(plan['expected']);assert json.loads(safe(ROOT,'build-manifest.json').read_text())['buildId']==plan['buildId']
 print(json.dumps({'verified':True,'buildId':plan['buildId'],'files':len(plan['expected']),'bytes':size,'maintenance':False,'configPreserved':True}),flush=True)
elif mode=='rollback':
 check(plan['expected']);restore();print(json.dumps({'rolledBack':True,'buildId':plan['baseBuild']}),flush=True)
else:raise RuntimeError('Unknown mode')
