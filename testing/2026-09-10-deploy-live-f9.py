from pathlib import Path
import json,subprocess,shlex,base64,hashlib
E=Path.cwd()/'testing/2026-09-10-live-f9';plan=json.loads((E/'plan.json').read_text());payload={'plan':plan,'files':{}}
for n in plan:
 for name in [n,n+'.gz']:
  data=(E/'candidate'/name).read_bytes();payload['files'][name]=base64.b64encode(data).decode()
REMOTE=r'''
import pathlib,json,sys,base64,hashlib,os,gzip
r=pathlib.Path('/home/customer/www/nextgen.run/public_html/diggame-beta-1').resolve()
p=json.load(sys.stdin)
allow={'index.html','values/gameplayCapabilities.js','values/screenRecordConfig.js','values/keybindActions.js','world/playScene/PlayerInputHandler.js','world/playScene/GameInputHandler.js','world/playScene/PlaySceneSetup.js','systems/visual/ScreenRecordSystem.js'}
assert set(p['plan'])==allow
assert set(p['files'])==allow|{n+'.gz' for n in allow}
h=lambda b:hashlib.sha256(b).hexdigest()
for n,m in p['plan'].items():
 assert h((r/n).read_bytes())==m['before'],'Live file changed: '+n
 assert h(base64.b64decode(p['files'][n]))==m['after']
 assert gzip.decompress(base64.b64decode(p['files'][n+'.gz']))==base64.b64decode(p['files'][n])
originals={n:(r/n).read_bytes() if (r/n).exists() else None for n in p['files']}
order=sorted(p['files'],key=lambda n:(n.startswith('index.html'),n))
try:
 for n in order:
  target=(r/n).resolve();assert r in target.parents
  temp=target.with_name(target.name+'.f9-20260910.tmp')
  with temp.open('xb') as f:f.write(base64.b64decode(p['files'][n]))
  os.chmod(temp,0o644);os.replace(temp,target)
 for n,m in p['plan'].items():assert h((r/n).read_bytes())==m['after']
except BaseException:
 for n,b in originals.items():
  if b is None:
   if (r/n).exists():(r/n).unlink()
  else:(r/n).write_bytes(b)
 raise
print(json.dumps({'status':'F9_LIVE_DEPLOYED','files':{n:h((r/n).read_bytes()) for n in order}},indent=2))
'''
ssh=['ssh','-F',r'C:\Users\Mila\.ssh\config','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=15','cline-local']
response=subprocess.check_output(ssh+['python3 -c '+shlex.quote(REMOTE)],input=json.dumps(payload).encode())
(E/'deployed.json').write_bytes(response);print(response.decode())
