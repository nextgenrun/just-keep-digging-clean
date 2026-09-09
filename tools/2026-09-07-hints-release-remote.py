"""Validate, back up and atomically publish only the Hints/wiki release allowlist."""
from pathlib import Path
import hashlib,json,os,shutil,sys,tarfile
ROOT=Path('/home/customer/www/nextgen.run/public_html')
GAME=ROOT/'diggame-beta-1'
WIKI=ROOT/'game/undersstar-wiki'
PRIVATE=Path('/home/customer/.local/share/understar-hints-wiki-20260907')
mode=sys.argv[1]
patch=sys.argv[2]
assert patch.startswith('hints-') and len(patch)==18 and all(c in '0123456789abcdef' for c in patch[6:])
RELEASE=PRIVATE/patch
assert ROOT.resolve()==ROOT and GAME.resolve()==GAME and WIKI.resolve()==WIKI
assert RELEASE.resolve().parent==PRIVATE.resolve()
STAGE=RELEASE/'stage'; BACKUP=RELEASE/'backup'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
def child(root,name):
 p=root/name
 assert not p.is_symlink() and p.resolve().is_relative_to(root.resolve()),str(p)
 return p
def tree(root): return {p.relative_to(root).as_posix():sha(p) for p in root.rglob('*') if p.is_file()}
def read_manifest(): return json.loads((STAGE/'release-manifest.json').read_text())
def live_target(name):
 prefix,relative=name.split('/',1)
 return child(GAME if prefix=='game' else WIKI,relative)
def check_live_before(m):
 for p,info in m['gameFiles'].items():
  assert sha(child(GAME,p))==info['before'],'Live game drift: '+p
  assert not child(GAME,p+'.br').exists(),'Unexpected Brotli sidecar: '+p
 assert tree(WIKI)==m['wikiBefore'],'Live wiki drift'
def check_staged(m):
 assert m['patchId']==patch
 expected={**m['files'],'release-manifest.json':sha(STAGE/'release-manifest.json')}
 assert tree(STAGE)==expected,'Stage file list/hash mismatch'
 for name,digest in m['files'].items():
  assert name.startswith(('game/','wiki/')) and sha(child(STAGE,name))==digest,name
 assert len(m['semanticFiles'])==7 and len(m['gameFiles'])==27
 assert b'__DIG_GAME_PRODUCTION__ = true' in (STAGE/'game/index.html').read_bytes()
 assert b'__DIG_GAME_PATCH_ID__' in (STAGE/'game/index.html').read_bytes()
def check_live_after(m):
 for name,digest in m['files'].items(): assert sha(live_target(name))==digest,'Delivery hash mismatch: '+name
 return {'patchId':patch,'verifiedFiles':len(m['files'])}
if mode=='stage':
 assert not STAGE.exists(),'Stage already exists'
 RELEASE.mkdir(parents=True,exist_ok=True)
 STAGE.mkdir()
 with tarfile.open(RELEASE/'release.tar.gz','r:gz') as archive:
  for member in archive.getmembers():
   assert member.isfile(),member.name
   dest=child(STAGE,member.name)
   dest.parent.mkdir(parents=True,exist_ok=True)
   with archive.extractfile(member) as src, dest.open('wb') as out: shutil.copyfileobj(src,out)
   dest.chmod(0o644)
 m=read_manifest(); check_staged(m); check_live_before(m)
 print(json.dumps({'status':'STAGED_AND_VERIFIED','patchId':patch,'files':len(m['files'])}))
elif mode=='promote':
 m=read_manifest(); check_staged(m); check_live_before(m)
 assert not BACKUP.exists(),'Backup already exists'
 BACKUP.mkdir(); backup_hashes={}
 game_names=[name for name in m['files'] if name.startswith('game/')]
 for name in game_names:
  src=live_target(name); backup_hashes[name]=sha(src)
  if src.exists():
   dest=child(BACKUP,name);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dest)
   assert sha(dest)==backup_hashes[name]
 # Preserve the complete old wiki, including its existing media and headers.
 shutil.copytree(WIKI,BACKUP/'wiki')
 assert tree(BACKUP/'wiki')==m['wikiBefore']
 (RELEASE/'backup-hashes.json').write_text(json.dumps(backup_hashes,indent=2))
 ordered=sorted(game_names,key=lambda name: (name in ('game/index.html','game/index.html.gz'),name))
 installed=[]; wiki_moved=False
 try:
  # Stage each game file alongside its destination. Publish index last.
  for name in ordered:
   if name in ('game/index.html','game/index.html.gz') and not wiki_moved:
    os.rename(WIKI,RELEASE/'wiki-before-swap')
    try: os.rename(STAGE/'wiki',WIKI)
    except: os.rename(RELEASE/'wiki-before-swap',WIKI);raise
    wiki_moved=True
   dest=live_target(name);dest.parent.mkdir(parents=True,exist_ok=True)
   temp=child(dest.parent,dest.name+'.'+patch+'.tmp')
   assert not temp.exists()
   shutil.copyfile(child(STAGE,name),temp);temp.chmod(0o644);os.replace(temp,dest);installed.append(name)
  result=check_live_after(m)
 except:
  for name in reversed(installed):
   dest=live_target(name);saved=child(BACKUP,name)
   if saved.exists(): shutil.copy2(saved,dest)
   else: dest.unlink()
  if wiki_moved:
   os.rename(WIKI,RELEASE/'wiki-failed');os.rename(RELEASE/'wiki-before-swap',WIKI)
  raise
 result.update(status='PROMOTED',backup=str(BACKUP))
 (RELEASE/'receipt.json').write_text(json.dumps(result,indent=2))
 print(json.dumps(result))
elif mode=='verify':
 m=read_manifest();print(json.dumps({'status':'LIVE_HASHES_VERIFIED',**check_live_after(m)}))
elif mode=='rollback':
 m=read_manifest();check_live_after(m)
 for name,old_hash in json.loads((RELEASE/'backup-hashes.json').read_text()).items():
  dest=live_target(name);saved=child(BACKUP,name)
  if old_hash is None: dest.unlink()
  else:
   assert sha(saved)==old_hash
   temp=child(dest.parent,dest.name+'.rollback.tmp');shutil.copy2(saved,temp);os.replace(temp,dest)
 os.rename(WIKI,RELEASE/'wiki-rolled-back');os.rename(RELEASE/'wiki-before-swap',WIKI)
 check_live_before(m);print(json.dumps({'status':'ROLLED_BACK','patchId':patch}))
else: raise ValueError(mode)
