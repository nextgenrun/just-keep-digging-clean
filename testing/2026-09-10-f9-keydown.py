from pathlib import Path
import json,hashlib,gzip
R=Path.cwd();E=R/'testing/2026-09-10-live-f9';n='world/playScene/GameInputHandler.js'
method='''  _handleScreenRecordDown(event) {
    if (event?.repeat || this.scene._settingsKeyCaptureActive
      || normalizeKeyboardEvent(event) !== USER_SETTINGS.getKey("screenRecord")) return;
    if (!isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.SCREEN_CAPTURE, this.scene.gameplayCapabilities)) return;
    event.preventDefault?.();
    this.scene.screenRecordSystem?.toggle();
  }

'''
for base in [R,E/'candidate']:
 p=base/n;s=p.read_text(encoding='utf-8')
 s=s.replace('    this._onMapDown = event => this._handleMapDown(event);','    this._onMapDown = event => this._handleMapDown(event);\n    this._onScreenRecordDown = event => this._handleScreenRecordDown(event);',1)
 s=s.replace('    scene.input?.keyboard?.on?.("keydown", this._onMapDown);','    scene.input?.keyboard?.on?.("keydown", this._onMapDown);\n    scene.input?.keyboard?.on?.("keydown", this._onScreenRecordDown);',1)
 s=s.replace('  _handleMapDown(event) {',method+'  _handleMapDown(event) {',1)
 s=s.replace('    this.scene?.input?.keyboard?.off?.("keydown", this._onMapDown);','    this.scene?.input?.keyboard?.off?.("keydown", this._onMapDown);\n    this.scene?.input?.keyboard?.off?.("keydown", this._onScreenRecordDown);',1)
 s=s.replace('    this._onMapDown = null;','    this._onMapDown = null;\n    this._onScreenRecordDown = null;',1)
 start=s.index('    if (\n      justDown(keys.screenRecord)');end=s.index('    if (justDown(keys.map))',start);s=s[:start]+s[end:]
 p.write_text(s,encoding='utf-8',newline='\n')
p=E/'candidate'/n;p.with_name(p.name+'.gz').write_bytes(gzip.compress(p.read_bytes(),mtime=0));plan=json.loads((E/'plan.json').read_text());plan[n]['after']=hashlib.sha256(p.read_bytes()).hexdigest();(E/'plan.json').write_text(json.dumps(plan,indent=2))
