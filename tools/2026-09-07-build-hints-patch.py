"""Build a scoped hints patch on the verified public game, preserving unrelated code."""
from pathlib import Path
import hashlib,json,posixpath,re,shutil
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'.tmp/hints-wiki-release/remote-before'
OUT=ROOT/'.tmp/hints-wiki-release/candidate'
assert BASE.is_relative_to(ROOT) and OUT.is_relative_to(ROOT)
shutil.copytree(BASE,OUT,dirs_exist_ok=True)
sources={p.relative_to(BASE).as_posix():p.read_text(encoding='utf-8') for p in BASE.rglob('*.js')}
original=dict(sources)
def change(path,old,new):
 assert sources[path].count(old)==1,(path,old[:65],sources[path].count(old))
 sources[path]=sources[path].replace(old,new)
new_files=['values/playerHints.js','systems/onboarding/playerHintContext.js','ui/overlays/HintsPanelContent.js']
for path in new_files+['systems/onboarding/ContextualMechanicTutorialSystem.js']:
 sources[path]=(ROOT/path).read_text(encoding='utf-8')
p='world/playScene/PlaySceneUI.js'
sources[p]='import { PLAYER_HINT_CONFIG } from "../../values/playerHints.js";\n'+sources[p]
change(p,'createCelestialTalentTreeView, createJourneyPanelContent, createModalShell, createPanel,','createCelestialTalentTreeView, createJourneyPanelContent, createHintsPanelContent, createModalShell, createPanel,')
change(p,'      journeyView: null,','      journeyView: null,\n      hintsView: null,')
change(p,'      { key: "saves", label: "SAVES", icon: "journal" },','      { key: "saves", label: "SAVES", icon: "journal" },\n      { key: "hints", label: PLAYER_HINT_CONFIG.copy.tab, skinKey: PLAYER_HINT_CONFIG.skinKey },')
change(p,'      state.journeyView?.destroy?.();','      state.journeyView?.destroy?.();\n      state.hintsView?.destroy?.();')
change(p,'      state.journeyView = null;','      state.journeyView = null;\n      state.hintsView = null;')
local_ui=(ROOT/p).read_text(encoding='utf-8')
hints_builder=local_ui[local_ui.index('    const buildHints = () => {'):local_ui.index('    const buildJourney = () => {')]
change(p,'    const buildJourney = () => {',hints_builder+'    const buildJourney = () => {')
change(p,'      else if (tabKey === "saves") buildSaves();','      else if (tabKey === "saves") buildSaves();\n      else if (tabKey === "hints") buildHints();')
change(p,'    pause.state?.journeyView?.destroy?.();','    pause.state?.journeyView?.destroy?.();\n    pause.state?.hintsView?.destroy?.();')
p='ui/scenes/PlayScenePorts.js'
sources[p]='import { createHintsPanelContent } from "../overlays/HintsPanelContent.js";\n'+sources[p]
change(p,'  createJourneyPanelContent,','  createJourneyPanelContent,\n  createHintsPanelContent,')
p='ui/PhaserUiKit.js'
change(p,'    visibleChrome = true,','    skinKey = null,\n    visibleChrome = !skinKey,')
change(p,'  const accentBar = scene.add.graphics();','  const accentBar = scene.add.graphics();\n  const buttonSkin = skinKey && scene.textures.exists(skinKey)\n    ? scene.add.image(0, 0, skinKey).setDisplaySize(width, height) : null;')
change(p,'    const highlighted = state.selected || state.focused || state.hovered;','    const highlighted = state.selected || state.focused || state.hovered;\n    buttonSkin?.setAlpha(!state.enabled ? 0.42 : highlighted ? 1 : 0.72);')
change(p,'  root.add(hintText ? [bg, accentBar, text, hintText, hit] : [bg, accentBar, text, hit]);','  root.add(hintText ? [bg, accentBar, text, hintText, hit] : [bg, accentBar, text, hit]);\n  if (buttonSkin) root.addAt(buttonSkin, 0);')
change(p,'      label,\n      icon,\n      fontSize,','      label,\n      icon,\n      skinKey: typeof tab === "string" ? null : tab.skinKey,\n      fontSize,')
semantic={p for p,s in sources.items() if original.get(p)!=s}
rx=re.compile(r'''(?:from\s+|import\s*(?:\(\s*)?)["'](\.[^"']+\.js(?:\?[^"']*)?)["']''')
def target(path,spec): return posixpath.normpath(posixpath.join(posixpath.dirname(path),spec.split('?')[0]))
deps={p:{target(p,m[1]) for m in rx.finditer(s)} for p,s in sources.items()}
missing={d for ds in deps.values() for d in ds if d not in sources}
assert not missing,sorted(missing)
affected=set(semantic)
while True:
 parents={p for p,ds in deps.items() if ds&affected}
 if parents<=affected: break
 affected|=parents
patch='hints-'+hashlib.sha256(''.join(sources[p] for p in sorted(semantic)).encode()).hexdigest()[:12]
base_build=json.loads((BASE/'build-manifest.json').read_text())['buildId']
for p in affected:
 def rewrite(m):
  spec=m[1]; dest=target(p,spec)
  if dest in affected: new=spec.split('?')[0]+'?v='+base_build+'&patch='+patch
  elif p in semantic and '?' not in spec: new=spec+'?v='+base_build
  else: new=spec
  return m[0].replace(spec,new)
 path=OUT/p;path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(rx.sub(rewrite,sources[p]),encoding='utf-8')
index=(BASE/'index.html').read_text(encoding='utf-8')
index=index.replace('./main.js?v='+base_build,'./main.js?v='+base_build+'&patch='+patch)
index=index.replace('globalThis.__DIG_GAME_BUILD_ID__ = "'+base_build+'";','globalThis.__DIG_GAME_BUILD_ID__ = "'+base_build+'";\n    globalThis.__DIG_GAME_PATCH_ID__ = "'+patch+'";')
(OUT/'index.html').write_text(index,encoding='utf-8')
manifest=json.loads((BASE/'build-manifest.json').read_text())
manifest['moduleCount']+=len(new_files)
manifest['patches']=[*manifest.get('patches',[]),{'id':patch,'purpose':'Relevant hints and Esc field guide','addedModules':new_files}]
(OUT/'build-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
changed=sorted(affected|{'index.html','build-manifest.json'})
record={'baseBuildId':base_build,'patchId':patch,'semanticFiles':sorted(semantic),'files':{p:{'before':hashlib.sha256((BASE/p).read_bytes()).hexdigest() if (BASE/p).is_file() else None,'after':hashlib.sha256((OUT/p).read_bytes()).hexdigest()} for p in changed}}
(ROOT/'.tmp/hints-wiki-release/patch-manifest.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
print(json.dumps({'patchId':patch,'semanticFiles':len(semantic),'filesWithCacheUpdates':len(changed),'candidate':str(OUT)}))
