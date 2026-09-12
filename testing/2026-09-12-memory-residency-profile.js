// Local no-save memory and real talent-screen lifecycle validation.
import { TILE_TYPES } from '../values/tileTypes.js';
import { CELESTIAL_TALENT_TREE_EAGER_ASSETS as eager, CELESTIAL_TALENT_TREE_PRELOAD_ASSETS as all } from '../values/celestialTalentTreeUi.js';
const output=document.querySelector('#audit-status');
const results=[],errors=[];
const bootMonitor=setInterval(()=>{
  if(results.length)return clearInterval(bootMonitor);
  output.textContent=JSON.stringify({phase:'boot',hidden:document.hidden,scenes:window.__phaserGame?.scene.scenes.map(s=>({key:s.sys.settings.key,status:s.sys.settings.status,progress:s.load?.progress,inflight:s.load?.inflight?.size,queued:s.load?.list?.size}))});
},2000);
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const until=async fn=>{const deadline=Date.now()+600000;while(!fn()){if(Date.now()>deadline)throw Error('Readiness timeout');await delay(200);}};
try {
  window.addEventListener('error',e=>errors.push(e.message));
  await until(()=>window.__phaserGame?.scene.isActive('MainMenuScene'));
  const game=window.__phaserGame;
  game.scene.getScene('MainMenuScene').scene.start('WorldLoadScene',{saveSlot:3,worldIdentity:'depth-weather-profile-2026-09-12',isNewSave:true,tutorialChoice:'no'});
  await until(()=>game.scene.getScene('PlayScene')?.gameState==='playing');
  const scene=game.scene.getScene('PlayScene');
  window.__jkdE2E?.closeAll?.();
  scene.systemIntroductionSystem.enabled=false;
  const lazy=all.filter(a=>!eager.some(b=>a.key===b.key));
  const capture=phase=>{
    const memory=scene.runtimeAssetLoadCoordinator.textureMemory.sample(true);
    const pending=[...(scene._pausePanel?.state?.tabContent?.list||[])],missing=[];
    while(pending.length){const o=pending.pop();if(o.texture?.key==='__MISSING')missing.push(o.name||o.type);if(o.list)pending.push(...o.list);}
    results.push({phase,estimatedMiB:memory.estimatedMiB,sourceCount:memory.sourceCount,owners:memory.bytesByOwner,
      eagerPresent:eager.every(a=>scene.textures.exists(a.key)),lazyPresent:lazy.filter(a=>scene.textures.exists(a.key)).length,lazyCount:lazy.length,
      talentViewReady:Boolean(scene._pausePanel?.state?.talentTree),missingViewTextures:missing,
      playerPacks:scene.playerDeferredAnimationAssetController.getSnapshot(),
      featureGroups:scene.runtimeFeatureAssetManager.getSnapshot(),
      frame:window.__jkdPerformance?.snapshot()?.frameMs});
    output.textContent=JSON.stringify({phase,results,errors});
  };
  await delay(6000);capture('surface');
  const ty=scene.config.topAirRows+800;
  for(let x=57;x<=63;x++){for(let y=ty-4;y<=ty;y++)scene.worldModel.setTile(x,y,TILE_TYPES.AIR,0);scene.worldModel.setTile(x,ty+1,TILE_TYPES.BEDROCK,0);}
  scene.playerController.teleportToTile(60,ty);scene.worldRenderer.updateRenderWindow({tx:60,ty});scene.cameras.main.centerOn(scene.player.x,scene.player.y);
  await delay(6000);capture('800m');
  for(let cycle=0;cycle<2;cycle++){
    const start=performance.now();scene.showPauseMenu({initialTabKey:'talents'});
    await until(()=>Boolean(scene._pausePanel?.state?.talentTree));
    await delay(600);capture(`talents-open-${cycle+1}`);results.at(-1).openMs=performance.now()-start;
    scene.resumeGame();await delay(7500);capture(`talents-closed-${cycle+1}`);
  }
  // The optional animation must still load, play, remain warm and then release.
  const controller=scene.playerDeferredAnimationAssetController;
  const key=scene.playerAssetProfile.idleFidgets.find(f=>f.profileSheetKey==='mixamoIdleFidgetSheet')?.key;
  if(!key)throw Error('Missing optional fidget animation');
  const ready=await controller.ensureForAnimation(key);if(!ready.ready)throw Error('Optional fidget load failed');
  const wasEnabled=scene.playerMotionPolish?.enabled;
  if(scene.playerMotionPolish)scene.playerMotionPolish.enabled=false;
  scene.showPauseMenu({initialTabKey:'general'});
  scene.player.play(key);await delay(500);capture('optional-animation-ready');
  scene.player.play(scene.playerAssetProfile.idleAnim);
  scene.resumeGame();
  if(scene.playerMotionPolish)scene.playerMotionPolish.enabled=false;
  await delay(65000);capture('optional-animation-cooled');
  if(scene.playerMotionPolish)scene.playerMotionPolish.enabled=wasEnabled;
  output.textContent=JSON.stringify({phase:'complete',results,errors});scene.scene.pause();
}catch(error){output.textContent=JSON.stringify({phase:'failed',error:error.stack,results,errors});}
