from pathlib import Path
import subprocess,shlex,json,hashlib
ROOT=Path.cwd(); OUT=ROOT/'testing/2026-09-10-live-f9'; OUT.mkdir(exist_ok=True)
NAMES=['values/keybindActions.js','index.html','.htaccess','values/gameplayCapabilities.js','values/gameConfig.js','values/screenRecordConfig.js','world/playScene/PlayerInputHandler.js','world/playScene/GameInputHandler.js','world/playScene/PlaySceneSetup.js','systems/visual/ScreenRecordSystem.js','systems/visual/ScreenRecordUiVisibility.js','ui/overlays/SettingsPanelContent.js']
SSH=['ssh','-F',r'C:\Users\Mila\.ssh\config','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=15','cline-local']
remote="import pathlib,json,base64; r=pathlib.Path('/home/customer/www/nextgen.run/public_html/diggame-beta-1'); names="+repr(NAMES)+"; print(json.dumps({n:base64.b64encode((r/n).read_bytes()).decode() if (r/n).is_file() else None for n in names}))"
import base64
files=json.loads(subprocess.check_output(SSH+['python3 -c '+shlex.quote(remote)],text=True))
for n,content in files.items():
 if content is not None:
  p=OUT/'before'/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(base64.b64decode(content))
(OUT/'readme.md').write_text('# Live F9 recording release\n\nScoped production sources and validation evidence.\n')
print(json.dumps({n:hashlib.sha256(base64.b64decode(c)).hexdigest() if c else None for n,c in files.items()},indent=2))
