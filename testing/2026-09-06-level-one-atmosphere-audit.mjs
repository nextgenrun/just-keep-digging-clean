import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {WORLD_VISUAL_LAYERED_SKY_REVIEW as C} from '../values/worldVisualLayeredSkyReview.js';
const {chromium}=createRequire(import.meta.url)('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const qa=path.resolve('testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-atmosphere-v3');
const url='http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/';
const result={date:'2026-09-06',errors:[],failedRequests:[],shaderErrors:[],levelTwoRequests:[],views:[],console:[]};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1536,height:1100}});
page.on('pageerror',e=>result.errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)result.failedRequests.push({url:r.url(),status:r.status()});if(/moonfall-escarpment|crownfall-sanctuary/.test(r.url()))result.levelTwoRequests.push(r.url());});
page.on('console',m=>{if(['error','warning'].includes(m.type()))result.console.push(m.text().slice(0,500));if(m.type()==='error'&&/shader|uniform|WebGL|GL_INVALID/i.test(m.text()))result.shaderErrors.push(m.text());});
let child;
const state=()=>child.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene('PlayScene'),o=s.worldRenderer.surfaceStage.layeredSky,c=s.cameras.main;
 return {profile:s.gameplayCapabilities.profileId,levelTwo:s.gameplayCapabilities.isLevelEnabled(2),landmarks:!!o.landmarks,
  renderer:o.snapshot(),camera:{x:c.scrollX,y:c.scrollY,width:c.width,height:c.height,zoom:c.zoom},fps:s.game.loop.actualFps,
  sun:s.dayNightCycle.getSunState(),light:s.lightSystem?.getSunlightSnapshot?.(),
  trees:[...o.landscape.cards].filter(([id])=>id.startsWith('forest')).map(([id,i])=>({id,pipeline:i.pipeline.name,u0:i.frame.u0,u1:i.frame.u1})),
  particles:[...o.details.active].map(([id,i])=>({id,x:i.x,y:i.y,width:i.displayWidth,alpha:i.alpha,rotation:i.rotation})),
  clouds:[...o.clouds.active].map(([id,i])=>({id,x:i.x,y:i.y,alpha:i.alpha,texture:i.texture.key,scale:i.scaleX})),
  player:{x:s.player.x,y:s.player.y}};
});
async function seek(x,y,time,weather,wait=400){
 await page.evaluate(([x,y,time,weather])=>{window.__layeredWorldReview.seek(x,y);window.__layeredWorldReview.setEnvironment(time,weather);},[x,y,time,weather]);
 await page.waitForTimeout(wait);
}
async function capture(label){
 const snapshot=await state(),file=label+'.jpg';
 assert(snapshot.renderer.cloudSprites+snapshot.renderer.pooledCloudSprites<=C.maxCloudSprites);
 assert(snapshot.renderer.floatingDetails.active+snapshot.renderer.floatingDetails.pooled<=C.floatingDetails.maxSprites);
 assert(snapshot.clouds.every(i=>i.scale<=1));
 assert(snapshot.trees.every(i=>i.pipeline==='RegeneratedAtmosphere:foliage'&&i.u0>0&&i.u1<1));
 assert.equal(snapshot.renderer.celestial.sun.x,snapshot.sun.worldPosition.x);
 if(snapshot.light){assert.deepEqual(snapshot.sun.worldPosition,snapshot.light.worldPosition);assert.deepEqual(snapshot.sun.screenPosition,snapshot.light.screenPosition);}
 await page.locator('#game').screenshot({path:path.join(qa,file),type:'jpeg',quality:89});
 result.views.push({label,file,...snapshot});console.log('Audited '+label);
 return snapshot;
}
try{
 await page.goto(url+'?revision=atmosphere-v3');
 await page.waitForFunction(()=>window.__layeredWorldReview?.snapshot().ready,null,{timeout:90000});
 child=page.frames().find(f=>f!==page.mainFrame());
 await seek(47,63,.4,'clear',3500);result.initial=await state();
 assert.equal(result.initial.profile,'demo');assert.equal(result.initial.levelTwo,false);assert.equal(result.initial.landmarks,false);
 const xs=[7,13,19,25,31,43,55,67,79,91,103,117,126];
 for(const [phase,time]of [['day',.4],['night',.95]]){
  await seek(47,63,time,'clear',1000);
  for(const x of xs){await seek(x,63,time);await capture(phase+'-route-'+x);}
 }
 for(const [x,y,zoom]of [[47,60,1],[47,56,1],[63,48,1],[63,24,1],[7,6,.6],[126,24,.6]]){
  await child.evaluate(zoom=>{window.__phaserGame.scene.getScene('PlayScene').cameras.main.setZoom(zoom);},zoom);
  await seek(x,y,.4,'clear');await capture('sky-'+x+'-'+y+'-'+zoom);
 }
 await child.evaluate(()=>{window.__phaserGame.scene.getScene('PlayScene').cameras.main.setZoom(1);});
 for(const [name,x,y,time]of [['sunrise',33,63,.29],['sun',47,63,.4],['noon',66.5,59,.5],['dusk',96,63,.7],['moon',59,61,.95]]){
  await seek(x,y,time,'clear',900);await capture(name);
 }
 for(const weather of ['clear','drizzle','rain','storm','snow']){
  if(weather==='snow')await child.evaluate(()=>{window.__phaserGame.scene.getScene('PlayScene').dayNightCycle.fromJSON({day:22});});
  await seek(47,62,.4,weather,8000);await capture('weather-'+weather);
 }
 const clear=result.views.find(v=>v.label==='weather-clear'),storm=result.views.find(v=>v.label==='weather-storm');
 assert(storm.renderer.environment.cloudThickness>clear.renderer.environment.cloudThickness*2);
 assert(storm.renderer.celestial.sun.alpha<clear.renderer.celestial.sun.alpha*.6);
 assert(storm.renderer.environment.cloudTint!==clear.renderer.environment.cloudTint);
 result.weatherResponse={clear:clear.renderer.environment,storm:storm.renderer.environment};
 for(const width of [1366,1920]){await page.setViewportSize({width,height:1100});await seek(47,63,.4,'clear',1200);await capture('viewport-'+width);}
 await page.setViewportSize({width:1536,height:1100});await seek(47,63,.4,'clear',8500);
 await page.locator('#pause').click();const paused=await state();await page.waitForTimeout(400);const held=await state();
 assert.equal(held.renderer.traveledSeconds,paused.renderer.traveledSeconds);
 assert.deepEqual(held.particles.map(({alpha,...p})=>p),paused.particles.map(({alpha,...p})=>p));
 result.pause=true;await page.locator('#pause').click();
 const shots=path.join(qa,'frames');await fs.mkdir(shots,{recursive:true});
 const cdp=await page.context().newCDPSession(page),frames=[],pending=[];
 cdp.on('Page.screencastFrame',event=>{
  const file='frame-'+String(frames.length).padStart(5,'0')+'.jpg';frames.push({file,timestamp:event.metadata.timestamp});
  pending.push(fs.writeFile(path.join(shots,file),Buffer.from(event.data,'base64')));
  void cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});
 });
 result.crop=await page.locator('#game').boundingBox();
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:92,maxWidth:1536,maxHeight:1100,everyNthFrame:1});
 const stationary=await state();await page.waitForTimeout(6500);const moving=await state();
 assert.deepEqual(moving.camera,stationary.camera);assert(moving.renderer.traveledSeconds>stationary.renderer.traveledSeconds+6);
 result.particleMotion=moving.particles.filter(p=>p.alpha>.03).map(p=>{const old=stationary.particles.find(i=>i.id===p.id);return old?Math.hypot(p.x-old.x,p.y-old.y):null;}).filter(v=>v!==null);
 assert(result.particleMotion.length>2&&result.particleMotion.every(v=>v>3));
 await page.evaluate(()=>{window.__layeredWorldReview.setEnvironment(undefined,'drizzle');});await page.waitForTimeout(4000);
 await page.locator('#play').click();await page.waitForTimeout(400);const start=await state();
 await page.keyboard.down('d');await page.waitForTimeout(3500);await page.keyboard.up('d');const walked=await state();
 assert(walked.player.x>start.player.x+100);result.walk={before:start.player,after:walked.player};
 await page.keyboard.down('Shift');await page.keyboard.down('w');await page.waitForTimeout(1200);await page.keyboard.up('w');await page.keyboard.up('Shift');
 result.flight=(await state()).player;assert(result.flight.y<walked.player.y-50);await page.waitForTimeout(1200);
 await cdp.send('Page.stopScreencast');await Promise.all(pending);
 result.recording={frames:frames.length,seconds:frames.at(-1).timestamp-frames[0].timestamp};
 result.recording.sampleFps=(frames.length-1)/result.recording.seconds;
 await fs.writeFile(path.join(shots,'frames.txt'),frames.map((f,i)=>"file '"+f.file+"'\nduration "+Math.max(.001,(frames[i+1]?.timestamp??f.timestamp+1/60)-f.timestamp).toFixed(6)).join('\n')+"\nfile '"+frames.at(-1).file+"'\n");
 await seek(47,63,.4,'clear',1000);
 result.cloudIsolation=await child.evaluate(()=>{
  const s=window.__phaserGame.scene.getScene('PlayScene'),o=s.worldRenderer.surfaceStage.layeredSky,c=s.cameras.main;
  s.scene.pause();for(const image of s.children.list)image.setVisible?.(false);
  const image=[...o.clouds.active.values()].find(i=>i.pipelineData?.cumulus);
  image.setVisible(true).setAlpha(1).setTint(0xffffff).setScrollFactor(1).setPosition(c.scrollX+150,c.scrollY+150);
  image.pipeline.motionSeconds=0;image.pipeline.windDistance=0;image.pipeline.gust=0;image.pipeline.thickness=1;
  c.setBackgroundColor('#102030');return {x:150,y:150,width:image.displayWidth,height:image.displayHeight};
 });
 for(const [name,time,thickness]of [['thin',0,1],['moved',1,1],['thick',1,3.5]]){
  await child.evaluate(([time,thickness])=>{const p=window.__phaserGame.renderer.pipelines.get('RegeneratedAtmosphere:cloud');p.motionSeconds=time;p.windDistance=time*.7;p.thickness=thickness;},[time,thickness]);
  await page.waitForTimeout(100);await page.locator('#game').screenshot({path:path.join(qa,'cloud-'+name+'.png')});
 }
 await child.evaluate(()=>{window.__phaserGame.scene.stop('PlayScene');});
 result.cleanup=await child.evaluate(()=>({inspector:!!window.__jkdLayeredSkyReview,
  pipelines:['cloud','foliage'].filter(id=>window.__phaserGame.renderer.pipelines.has('RegeneratedAtmosphere:'+id)),
  ownedTextures:Object.keys(window.__phaserGame.textures.list).filter(key=>/^(regenerated-landscape-section:|layered-celestial:)/.test(key))}));
 assert.deepEqual(result.cleanup,{inspector:false,pipelines:[],ownedTextures:[]});
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.shaderErrors,[]);assert.deepEqual(result.failedRequests,[]);assert.deepEqual(result.levelTwoRequests,[]);
 const html='<!doctype html><meta charset="utf-8"><title>Level 1 atmosphere audit</title><style>body{margin:0;padding:14px;background:#111822;color:#e0e8f4;font:14px system-ui}main{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}figure{margin:0}img{width:100%;display:block}figcaption{padding:5px}a{color:inherit}</style><h1>Level 1 atmosphere / full route and conditions</h1><main>'+result.views.map(v=>'<figure><a href="'+v.file+'"><img src="'+v.file+'"></a><figcaption>'+v.label+'</figcaption></figure>').join('')+'</main>';
 await fs.writeFile(path.join(qa,'gallery.html'),html);
 const gallery=await browser.newPage({viewport:{width:1600,height:1100}});await gallery.goto(url+'qa-atmosphere-v3/gallery.html');
 await gallery.screenshot({path:path.join(qa,'audit-sheet.jpg'),type:'jpeg',quality:92,fullPage:true});
 result.passed=true;console.log(JSON.stringify({passed:true,views:result.views.length,recording:result.recording,particleMotion:result.particleMotion,cleanup:result.cleanup}));
}catch(error){result.failure=error.stack;result.diagnostic=await page.evaluate(()=>({status:document.getElementById('status')?.textContent,scenes:document.getElementById('game')?.contentWindow.__phaserGame?.scene?.getScenes(false)?.map(s=>({key:s.scene.key,active:s.scene.isActive(),created:s.worldRenderer?.created,layered:!!s.worldRenderer?.surfaceStage?.layeredSky}))}));console.log(JSON.stringify({failure:result.failure,diagnostic:result.diagnostic,console:result.console,errors:result.errors,failed:result.failedRequests,status:await page.locator('#status').textContent()}));throw error;}
finally{for(const key of ['d','w','Shift'])await page.keyboard.up(key).catch(()=>{});await fs.writeFile(path.join(qa,'verification.json'),JSON.stringify(result,null,2));await browser.close();}
