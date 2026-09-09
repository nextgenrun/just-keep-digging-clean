// Local visible QA controls. Not imported by the game entry point.
import { startPlayerDeathCinematic } from '../world/playScene/PlayerDeathCinematic.js';
import { RUNTIME_FEATURE_ASSET_GROUP_IDS } from '../values/runtimeAssetLoading.js';
import { SCENE_BASE_PHASES } from '../values/sceneRuntime.js';
if (!['localhost','127.0.0.1'].includes(location.hostname)
  || new URLSearchParams(location.search).get('jkd_e2e') !== '1') throw new Error('Save-free local QA only');
const host = document.createElement('aside');
host.style.cssText='position:fixed;bottom:4px;left:4px;right:4px;z-index:100001;background:#111e;color:white;padding:6px;font:11px monospace';
host.setAttribute('aria-label','Approved polish verification');
const controls=document.createElement('div'); const status=document.createElement('output');
const details=document.createElement('details'); const summary=document.createElement('summary');summary.textContent='Polish diagnostics';
const data=document.createElement('pre');data.style.cssText='max-height:180px;overflow:auto';details.append(summary,data);host.append(controls,status,details);document.body.append(host);
const getScene=()=>window.__phaserGame?.scene.getScenes(true).find(s=>s.npcManager);
let deathStarted=0;let deathRevealed=0;let capture=[];let previewing=false;
function button(label, action) {
  const button=document.createElement('button');button.textContent=label;
  button.onclick=()=>{const scene=getScene();if(!scene?._saveWritesBlocked)return;action(scene);button.blur();};
  controls.append(button);
}
button('Warm death animation',scene=>void scene.playerDeferredAnimationAssetController.ensureForAnimation(scene.playerAssetProfile.deathAnim));
button('Preview collapse then recap',async scene=>{
  if(previewing)return;
  const loaded=await scene.runtimeFeatureAssetManager.ensureGroup(RUNTIME_FEATURE_ASSET_GROUP_IDS.hardcoreMode,{consumer:'local-polish-preview',adoptExisting:true});
  if(!loaded.ready){status.textContent='Hardcore preview artwork failed to load';return;}
  window.__jkdE2E?.closeAll();
  scene.sceneModeController.clearSuspensions();scene.setSceneBasePhase(SCENE_BASE_PHASES.DEAD,{owner:'local-polish-preview'});
  scene.playerController.setControlsEnabled(false);scene.player.anims.stop();
  const modal=scene._hardcoreRuntime.modal;
  deathStarted=performance.now();deathRevealed=0;capture=[];previewing=true;
  const deferReveal=startPlayerDeathCinematic(scene,()=>{if(!previewing)return;deathRevealed=performance.now();modal.revealDeath();});
  modal.showDeath({reason:'Local visual preview',depth:0,pages:[],deferReveal,onReturn:()=>{},onRetry:()=>{}});
  modal.setDeathReady('LOCAL PREVIEW — NO SAVE CHANGES');
});
button('End collapse preview',scene=>{
  if(!previewing)return;previewing=false;scene._hardcoreRuntime.modal._resetAndHide();
  scene.sceneModeController.clearSuspensions();scene.setSceneBasePhase(SCENE_BASE_PHASES.ACTIVE,{owner:'local-polish-preview'});
  scene.playerController.setControlsEnabled(true);
});
button('Show timed buff colors',scene=>{
  scene.specialBlockEffectsManager.applyTimedEffect({effect:'miningSpeedBoost',value:0.5,duration:4000});
  scene.specialBlockEffectsManager.applyTimedEffect({effect:'damageBoost',value:0.5,duration:4000});
});
button('Float dirt / stone / copper',scene=>{
  for(const resourceType of ['dirt','stone','copper'])scene.lootPickupFxSystem.showResourcePickup({worldX:scene.player.x,worldY:scene.player.y-30,resourceType,amount:1});
});
const timer=setInterval(()=>{
  const scene=getScene();if(!scene)return;
  if(previewing && capture.length<140)capture.push({at:Math.round(performance.now()-deathStarted),animation:scene.player.anims.currentAnim?.key,frame:scene.player.frame?.name,recapVisible:scene._hardcoreRuntime.modal.isVisible});
  const snapshot={phase:scene.gameState,fps:Math.round(window.__phaserGame.loop.actualFps),saveBlocked:scene._saveWritesBlocked,
    modes:scene.sceneModeController?.snapshot?.(),
    deathReady:scene.anims.exists(scene.playerAssetProfile.deathAnim),deathRevealMs:deathRevealed?Math.round(deathRevealed-deathStarted):null,
    animation:scene.player.anims.currentAnim?.key,frame:scene.player.frame?.name,origin:[scene.player.originX,scene.player.originY],
    buffs:scene.speedBlockFxSystem?.getSnapshot(),pickup:scene.lootPickupFxSystem?.lastTelemetry,capture};
  status.textContent=`${snapshot.phase} | ${snapshot.fps} fps | saves blocked ${snapshot.saveBlocked} | death ready ${snapshot.deathReady} | recap after ${snapshot.deathRevealMs ?? '—'} ms`;
  data.textContent=JSON.stringify(snapshot,null,2);
},250);
window.addEventListener('pagehide',()=>{clearInterval(timer);host.remove();},{once:true});
