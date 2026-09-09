import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.resolve('testing/2026-09-06-level-one-live-v6');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1536,height:864},deviceScaleFactor:1});
const result={entry:'/?jkd_e2e=1&cinematics=0',errors:[],warnings:[],views:[]};
page.on('pageerror',e=>result.errors.push(e.message));
page.on('console',m=>{if(['error','warning'].includes(m.type())&&/frame|shader|WebGL|swallow|layered/i.test(m.text()))result.warnings.push(m.text());});
async function boot(suffix=''){
 await page.goto('http://127.0.0.1:8195'+result.entry+suffix,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__phaserGame?.scene.isActive('MainMenuScene'),null,{timeout:120000});
 await page.evaluate(()=>{window.__phaserGame.scene.getScene('MainMenuScene').scene.start('WorldLoadScene',{
  saveSlot:3,worldIdentity:'level-one-live-v6-qa',isNewSave:true,tutorialChoice:'skip'});});
 await page.waitForFunction(()=>{const s=window.__phaserGame?.scene.getScene('PlayScene');return s?._sceneSetupReady===true&&s.worldRenderer?.created&&s.gameState==='playing';},null,{timeout:120000});
 await page.evaluate(()=>window.__jkdE2E?.closeAll?.());
}
const sample=()=>page.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene('PlayScene'),o=s.worldRenderer.surfaceStage.layeredSky,p=s.playerController.physicsBody;
 return {query:location.search,profile:s.gameplayCapabilities.profileId,levelTwo:s.gameplayCapabilities.isLevelEnabled(2),
  renderer:o?.snapshot()||null,legacyFar:s.worldRenderer.surfaceStage.far.length,oldClouds:s.atmosphereSystem?.clouds?.length??null,
  body:{x:p.x,y:p.y},fps:s.game.loop.actualFps,
  event:o?.ambientEvents.actors.map(a=>({x:a.image.x,y:a.image.y,alpha:a.image.alpha,width:a.image.displayWidth,frame:a.image.frame.name}))||[]};
});
async function view(x,y,time=.4,weather){
 await page.evaluate(([x,y,time,weather])=>{
  const s=window.__phaserGame.scene.getScene('PlayScene');s.playerController.setControlsEnabled(false);s.playerController.update=()=>{};
  s.playerController.teleportToTile(Math.floor(x),y>=61?64:Math.floor(y));s.cameras.main.stopFollow();
  s.cameras.main.setZoom(1).centerOn(x*s.config.tileSize,y*s.config.tileSize);
  s.dayNightCycle.fromJSON({currentTime:time});s.dayNightCycle.update(0);
  if(weather)s.weatherSystem.forceWeather(weather,weather==='clear'?0:.94,120000,true);
 },[x,y,time,weather]);
 await page.waitForTimeout(weather?8500:700);
}
async function capture(label){
 const state=await sample();assert.equal(state.profile,'demo');assert.equal(state.levelTwo,false);
 assert(state.renderer&&!state.renderer.reviewOnly);assert.equal(state.legacyFar,0);
 await page.screenshot({path:path.join(out,label+'.jpg'),type:'jpeg',quality:89});result.views.push({label,...state});console.log(label);
}
try{
 await boot();result.startup=await sample();
 assert(!new URLSearchParams(result.startup.query).has('layeredSky'));assert(result.startup.renderer);assert.equal(result.startup.legacyFar,0);
 await capture('game-entry');
 await page.keyboard.down('d');await page.waitForTimeout(1500);await page.keyboard.up('d');
 result.walk=await sample();assert(result.walk.body.x>result.startup.body.x+40,'Real D input moves the player');await capture('real-walking');
 await page.evaluate(()=>window.__phaserGame.scene.getScene('PlayScene').playerController.fillGemPower());
 const beforeFlight=await sample();await page.keyboard.down('Shift');await page.keyboard.down('w');await page.keyboard.down('d');
 await page.waitForTimeout(1800);await page.keyboard.up('d');await page.keyboard.up('w');await page.keyboard.up('Shift');
 result.flight=await sample();assert(result.flight.body.y<beforeFlight.body.y-40,'Real powered flight raises the player');await capture('real-flight');
 for(const x of [7,19,31,47,63,95,126]){await view(x,63,.4,x===7?'clear':undefined);await capture('day-'+x);}
 await view(47,63,.4,'clear');
 // Wait for the normal schedule, with no event trigger or rate override.
 await page.waitForFunction(()=>window.__phaserGame.scene.getScene('PlayScene').worldRenderer.surfaceStage.layeredSky.ambientEvents.event?.kind==='birds',null,{timeout:55000});
 await page.waitForTimeout(6500);await capture('natural-bird-flock');
 result.naturalBirds=(await sample()).renderer.ambientEvents;
 assert.equal(result.naturalBirds.kind,'birds');assert(result.naturalBirds.visible>=2);
 const pauseBefore=await page.evaluate(()=>{
  const o=window.__phaserGame.scene.getScene('PlayScene').worldRenderer.surfaceStage.layeredSky;o.paused=true;
  return {seconds:o.clouds.traveledSeconds,positions:o.ambientEvents.actors.map(a=>[a.image.x,a.image.y,a.image.frame.name])};
 });
 await page.waitForTimeout(600);
 const pauseAfter=await page.evaluate(()=>{
  const o=window.__phaserGame.scene.getScene('PlayScene').worldRenderer.surfaceStage.layeredSky;
  const value={seconds:o.clouds.traveledSeconds,positions:o.ambientEvents.actors.map(a=>[a.image.x,a.image.y,a.image.frame.name])};o.paused=false;return value;
 });assert.deepEqual(pauseAfter,pauseBefore);result.pause=true;
 // Capture the real canvas. Leaves and dusk glimmers are explicitly staged for coverage after the naturally scheduled flock.
 const recording=await page.evaluate(async()=>{
  const s=window.__phaserGame.scene.getScene('PlayScene'),o=s.worldRenderer.surfaceStage.layeredSky,e=o.ambientEvents;
  const stream=s.game.canvas.captureStream(30),chunks=[],samples=[];
  const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:6500000});
  recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
  const stopped=new Promise(resolve=>recorder.onstop=resolve),wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  recorder.start(1000);samples.push({kind:e.event?.kind,...e.snapshot()});await wait(10000);
  e.clear();e.start('leaves',o.clouds.traveledSeconds,e.bounds('leaves'),o.environment);samples.push({staged:true,...e.snapshot()});await wait(6500);
  s.dayNightCycle.fromJSON({currentTime:.95});s.dayNightCycle.update(0);await wait(500);
  e.clear();e.start('glimmers',o.clouds.traveledSeconds,e.bounds('glimmers'),o.environment);samples.push({staged:true,...e.snapshot()});await wait(8500);
  recorder.stop();await stopped;stream.getTracks().forEach(track=>track.stop());
  const blob=new Blob(chunks,{type:'video/webm'}),reader=new FileReader();reader.readAsDataURL(blob);await new Promise(resolve=>reader.onload=resolve);
  return {data:reader.result,samples,bytes:blob.size};
 });
 await fs.writeFile(path.join(out,'level-one-live-v6.webm'),Buffer.from(recording.data.split(',')[1],'base64'));delete recording.data;result.recording=recording;
 await capture('night-glimmers');
 for(const x of [19,47,95]){await view(x,63,.95);await capture('night-'+x);}
 await view(47,58,.4);await capture('canopy-flight');await view(63,48,.4);await capture('cloud-corridor');
 await view(47,63,.4,'storm');await page.evaluate(()=>{const e=window.__phaserGame.scene.getScene('PlayScene').worldRenderer.surfaceStage.layeredSky.ambientEvents;e.clear();e.nextAt=0;});
 await page.waitForTimeout(700);await capture('storm');assert.equal((await sample()).renderer.ambientEvents.active,0);result.stormSuppression=true;
 await page.evaluate(()=>{const s=window.__phaserGame.scene.getScene('PlayScene');s.cameras.main.centerOn(47*s.config.tileSize,90*s.config.tileSize);});
 await page.waitForTimeout(500);result.underground=await sample();assert.equal(result.underground.renderer.ambientEvents.active,0);assert.equal(result.underground.renderer.cloudSprites,0);
 result.beforeShutdown=await sample();
 await page.evaluate(()=>{
  const s=window.__phaserGame.scene.getScene('PlayScene'),registry=s.lifecycleRegistry;
  window.__v6DisposeFindings=[];
  if(registry){const report=registry._onDisposeError;registry._onDisposeError=finding=>{window.__v6DisposeFindings.push({id:finding.id,message:finding.error?.message});report?.(finding);};}
  window.__phaserGame.scene.stop('PlayScene');
 });await page.waitForTimeout(500);
 result.disposalFindings=await page.evaluate(()=>window.__v6DisposeFindings);
 result.shutdown=await page.evaluate(()=>{
  const g=window.__phaserGame,t=g.textures.get('level-one-swallow-v6');
  return {birdFrames:t.getFrameNames().filter(n=>n.startsWith('level-one-swallow:')),joinedTextures:g.textures.getTextureKeys().filter(k=>k.startsWith('regenerated-landscape-section:'))};
 });assert.equal(result.shutdown.birdFrames.length,0);assert.equal(result.shutdown.joinedTextures.length,0);
 await page.evaluate(()=>{window.__phaserGame.scene.start('WorldLoadScene',{saveSlot:3,worldIdentity:'level-one-live-v6-reentry',isNewSave:true,tutorialChoice:'skip'});});
 await page.waitForFunction(()=>{const s=window.__phaserGame.scene.getScene('PlayScene');return s?._sceneSetupReady===true&&s.worldRenderer?.created&&s.gameState==='playing';},null,{timeout:120000});
 result.reentry=await sample();assert(result.reentry.renderer);assert.equal(result.reentry.legacyFar,0);await capture('scene-reentry');
 await boot('&layeredSky=0');result.rollback=await sample();assert.equal(result.rollback.renderer,null);assert(result.rollback.legacyFar>0);
 await page.screenshot({path:path.join(out,'rollback.jpg'),type:'jpeg',quality:85});
 await page.evaluate(()=>{
  const s=window.__phaserGame.scene.getScene('PlayScene'),registry=s.lifecycleRegistry;window.__v6DisposeFindings=[];
  if(registry){const report=registry._onDisposeError;registry._onDisposeError=finding=>{window.__v6DisposeFindings.push({id:finding.id,message:finding.error?.message});report?.(finding);};}
  window.__phaserGame.scene.stop('PlayScene');
 });await page.waitForTimeout(500);result.rollbackDisposalFindings=await page.evaluate(()=>window.__v6DisposeFindings);
 assert.equal(result.errors.length,0);
 result.driverWarnings=result.warnings.filter(message=>message==='WebGL: INVALID_ENUM: getFramebufferAttachmentParameter: invalid parameter name');
 assert.equal(result.warnings.length-result.driverWarnings.length,0,'No asset, frame or shader warnings');
 result.passed=true;await fs.writeFile(path.join(out,'runtime-verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({passed:true,views:result.views.length,naturalBirds:result.naturalBirds,pause:result.pause,shutdown:result.shutdown,errors:result.errors,warnings:result.warnings}));
}catch(error){
 result.failure=error.stack;await fs.writeFile(path.join(out,'runtime-failure.json'),JSON.stringify(result,null,2));
 await page.screenshot({path:path.join(out,'failure.jpg'),type:'jpeg',quality:85}).catch(()=>{});throw error;
}finally{await browser.close();}
