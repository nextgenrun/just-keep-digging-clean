from pathlib import Path
import json,gzip,hashlib
R=Path.cwd(); E=R/'testing/2026-09-10-live-f9'
patches={
'values/gameplayCapabilities.js': [('  [GAMEPLAY_FEATURE_IDS.SCREEN_CAPTURE]: true,\n','',1)],
'values/screenRecordConfig.js': [('  endpoint: "/screenrecord",','  saveToBrowser: globalThis.__DIG_GAME_PRODUCTION__ === true,\n  downloadRevokeDelayMs: 60000,\n  endpoint: "/screenrecord",',1)],
'world/playScene/PlayerInputHandler.js': [('const screenRecord = GAME_CONFIG.debugMode ? addBoundKey("screenRecord") : null;', 'const screenRecord = addBoundKey("screenRecord");',1)],
'world/playScene/GameInputHandler.js': [('GAME_CONFIG.debugMode && justDown(keys.screenRecord)', 'justDown(keys.screenRecord)',1)],
'world/playScene/PlaySceneSetup.js': [('this.screenRecordSystem = GAME_CONFIG.debugMode ? new ScreenRecordSystem(this) : null;', 'this.screenRecordSystem = isGameplayFeatureEnabled(\n    GAMEPLAY_FEATURE_IDS.SCREEN_CAPTURE, this.gameplayCapabilities,\n  ) ? new ScreenRecordSystem(this) : null;',1)],
'systems/visual/ScreenRecordSystem.js': [('    this.enabled = GAME_CONFIG.debugMode && isGameplayFeatureEnabled(', '    this.enabled = isGameplayFeatureEnabled(',1),('if (!this.enabled || !GAME_CONFIG.debugMode) return false;', 'if (!this.enabled) return false;',1)]}
old='''      const formData = new FormData();
      formData.append(this.config.uploadField, recording, this._fileName(modeId));
      const response = await fetch(this.config.endpoint, { method: "POST", body: formData });
      if (!response.ok) throw new Error(`Upload failed (${response.status})`);
      const result = await response.json();
      if (!result?.ok || !result.file) throw new Error("Upload response was incomplete");
      this._notify(this.config.notices.saved.replace("{file}", result.file), "success");'''
new='''      const fileName = this._fileName(modeId);
      if (this.config.saveToBrowser) {
        const url = URL.createObjectURL(recording);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        (document.fullscreenElement || document.body).appendChild(link);
        try { link.click(); } finally {
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), this.config.downloadRevokeDelayMs);
        }
      } else {
        const formData = new FormData();
        formData.append(this.config.uploadField, recording, fileName);
        const response = await fetch(this.config.endpoint, { method: "POST", body: formData });
        if (!response.ok) throw new Error(`Upload failed (${response.status})`);
        const result = await response.json();
        if (!result?.ok || !result.file) throw new Error("Upload response was incomplete");
        this._notify(this.config.notices.saved.replace("{file}", result.file), "success");
      }'''
patches['systems/visual/ScreenRecordSystem.js'].append((old,new,1))
report={}
for name,edits in patches.items():
 for base in [R,E/'before']:
  content=(base/name).read_text()
  for old,new,count in edits:
   assert content.count(old)>=count,(name,old)
   content=content.replace(old,new,count)
  if name.endswith('ScreenRecordSystem.js'):
   content='\n'.join(line for line in content.split('\n') if not (line.startswith('import { GAME_CONFIG }')))
  dst=R/name if base==R else E/'candidate'/name
  dst.parent.mkdir(parents=True,exist_ok=True);dst.write_text(content,encoding='utf-8',newline='\n')
 # preserve remote originals as the upload basis, excluding unrelated local edits
 report[name]={'before':hashlib.sha256((E/'before'/name).read_bytes()).hexdigest(),'after':hashlib.sha256((E/'candidate'/name).read_bytes()).hexdigest()}
html=(E/'before/index.html').read_text()
import re
build=re.search('__DIG_GAME_BUILD_ID__ = "([^"]+)"',html).group(1)
imports={}
for n in patches:
 imports['./'+n+'?v='+build]='./'+n+'?v='+build+'-f9-20260910'
 imports['./'+n]='./'+n+'?v='+build+'-f9-20260910'
marker='<script type="module" src="./session-logging.js'
assert marker in html
html=html.replace(marker,'<script type="importmap">'+json.dumps({'imports':imports})+'</script>\n  '+marker,1)
(E/'candidate/index.html').write_text(html,encoding='utf-8',newline='\n')
report['index.html']={'before':hashlib.sha256((E/'before/index.html').read_bytes()).hexdigest(),'after':hashlib.sha256((E/'candidate/index.html').read_bytes()).hexdigest()}
for n in report:
 p=E/'candidate'/n
 p.with_name(p.name+'.gz').write_bytes(gzip.compress(p.read_bytes(),mtime=0))
(E/'plan.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'baseBuild':build,'files':list(report)},indent=2))
