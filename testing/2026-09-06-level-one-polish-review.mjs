import assert from "node:assert/strict";
import {createRequire} from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import {WORLD_VISUAL_LAYERED_SKY_REVIEW as C} from "../values/worldVisualLayeredSkyReview.js";
import {LAYERED_ATMOSPHERE_MOTION as M} from "../values/layeredAtmosphereMotion.js";
const {chromium}=createRequire(import.meta.url)("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const qa=path.resolve("testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-level-one");
const shots=path.join(qa,"frames");await fs.mkdir(shots,{recursive:true});
const result={console:[],date:"2026-09-06",errors:[],failedRequests:[],shaderErrors:[],levelTwoRequests:[]};
const browser=await chromium.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
const page=await browser.newPage({viewport:{width:1536,height:1100}});
page.on("pageerror",e=>result.errors.push(e.message));
page.on("response",r=>{if(r.status()>=400)result.failedRequests.push({url:r.url(),status:r.status()});if(/moonfall-escarpment|crownfall-sanctuary/.test(r.url()))result.levelTwoRequests.push(r.url());});
page.on("console",m=>{if(["error","warning"].includes(m.type()))result.console.push(m.text().slice(0,800));if(m.type()==="error"&&/shader|uniform|WebGL|GL_INVALID/i.test(m.text()))result.shaderErrors.push(m.text());});
try{
 await page.goto("http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/?revision=level-one-polish");
 await page.waitForFunction(()=>window.__layeredWorldReview?.snapshot().ready,null,{timeout:90000});
 const child=page.frames().find(f=>f!==page.mainFrame());
 const state=()=>child.evaluate(()=>{
  const game=window.__phaserGame,s=game.scene.getScene("PlayScene"),o=s.worldRenderer.surfaceStage.layeredSky,c=s.cameras.main;
  return {profile:s.gameplayCapabilities.profileId,levelTwo:s.gameplayCapabilities.isLevelEnabled(2),landmarks:!!o.landmarks,
   camera:{x:c.scrollX,y:c.scrollY},seconds:o.clouds.traveledSeconds,windDistance:o.clouds.windDistance,fps:game.loop.actualFps,
   trees:[...o.landscape.cards].filter(([id])=>id.startsWith("forest")).map(([id,i])=>({id,pipeline:i.pipeline.name,u0:i.frame.u0,u1:i.frame.u1})),
   clouds:[...o.clouds.active].map(([id,i])=>({id,x:i.x,y:i.y,alpha:i.alpha})),pool:o.clouds.active.size+o.clouds.pool.length,
   clock:s.dayNightCycle.currentTime,player:{x:s.player.x,y:s.player.y}};
 });
 await page.evaluate(()=>{window.__layeredWorldReview.seek(47,63);window.__layeredWorldReview.setEnvironment(.475,"clear");});
 await page.waitForTimeout(3500);result.before=await state();
 assert.equal(result.before.profile,"demo");assert.equal(result.before.levelTwo,false);assert.equal(result.before.landmarks,false);
 assert(result.before.trees.length>=4);assert(result.before.trees.every(i=>i.pipeline==="RegeneratedAtmosphere:foliage"&&i.u0>0&&i.u1<1));
 assert(C.landscapeJoin.paddingPx>(M.foliage.swayPx+M.foliage.gustGain)*(1+M.foliage.flutterGain));
 await page.locator("#pause").click();const paused=await state();await page.waitForTimeout(500);const held=await state();
 assert.equal(held.seconds,paused.seconds);assert.equal(held.windDistance,paused.windDistance);assert.deepEqual(held.clouds,paused.clouds);
 result.pause=true;await page.locator("#pause").click();
 const cdp=await page.context().newCDPSession(page),frames=[],pending=[];
 cdp.on("Page.screencastFrame",event=>{
  const file="frame-"+String(frames.length).padStart(5,"0")+".jpg";
  frames.push({file,timestamp:event.metadata.timestamp});pending.push(fs.writeFile(path.join(shots,file),Buffer.from(event.data,"base64")));
  void cdp.send("Page.screencastFrameAck",{sessionId:event.sessionId}).catch(()=>{});
 });
 result.crop=await page.locator("#game").boundingBox();
 await cdp.send("Page.startScreencast",{format:"jpeg",quality:92,maxWidth:1536,maxHeight:1100,everyNthFrame:1});
 await page.waitForTimeout(9000);result.stationary=await state();assert.deepEqual(result.stationary.camera,result.before.camera);
 assert(result.stationary.seconds>result.before.seconds+8);assert(result.stationary.clock>result.before.clock);
 await page.locator("#play").click();await page.waitForTimeout(500);const walkingStart=await state();
 await page.keyboard.down("d");await page.waitForTimeout(4200);await page.keyboard.up("d");const walkingEnd=await state();
 assert(walkingEnd.player.x>walkingStart.player.x+100);result.walking={before:walkingStart.player,after:walkingEnd.player};
 await page.keyboard.down("Shift");await page.keyboard.down("w");await page.waitForTimeout(1400);await page.keyboard.up("w");await page.keyboard.up("Shift");
 result.flight=(await state()).player;assert(result.flight.y<walkingEnd.player.y-50);await page.waitForTimeout(1500);
 await cdp.send("Page.stopScreencast");await Promise.all(pending);
 result.recording={frames:frames.length,seconds:frames.at(-1).timestamp-frames[0].timestamp};result.recording.sampleFps=(frames.length-1)/result.recording.seconds;
 assert(frames.length>150);
 await fs.writeFile(path.join(shots,"frames.txt"),frames.map((f,i)=>"file '"+f.file+"'\nduration "+Math.max(.001,(frames[i+1]?.timestamp??f.timestamp+1/60)-f.timestamp).toFixed(6)).join("\n")+"\nfile '"+frames.at(-1).file+"'\n");
 result.weather=[];
 for(const [name,time,weather]of [["dawn",.16,"clear"],["night",.95,"clear"],["storm",.475,"storm"]]){
  await page.evaluate(([time,weather])=>{window.__layeredWorldReview.seek(79,63);window.__layeredWorldReview.setEnvironment(time,weather);},[time,weather]);
  await page.waitForTimeout(weather==="storm"?6500:700);
  const snapshot=await state();assert(snapshot.pool<=C.maxCloudSprites);
  result.weather.push({name,...snapshot});await page.locator("#game").screenshot({path:path.join(qa,"final-"+name+".jpg"),type:"jpeg",quality:90});
 }
 await page.evaluate(()=>{window.__layeredWorldReview.seek(47,63);window.__layeredWorldReview.setEnvironment(.475,"clear");});await page.waitForTimeout(1000);
 result.joins=await child.evaluate(()=>{
  const o=window.__phaserGame.scene.getScene("PlayScene").worldRenderer.surfaceStage.layeredSky;
  return [...o.landscape.sections.values()].filter(s=>s.layer.family==="ridges").flatMap(section=>[...section.keys].map(([phase,{key}])=>{
   const texture=o.scene.textures.get(key),y=section.height-section.maxOffset-section.layer.bottomOffsetPx-1;
   const data=texture.getContext().getImageData(section.pad,y,section.layer.overlapPx,1).data;
   const alphas=Array.from({length:data.length/4},(_,i)=>data[i*4+3]);
   return {layer:section.layer.id,phase,minAlpha:Math.min(...alphas),meanAlpha:alphas.reduce((a,b)=>a+b,0)/alphas.length};
  }));
 });
 assert(result.joins.length>=4);
 assert(result.joins.every(join=>join.minAlpha>=245),"A mountain join exposes the sky through its opaque lower region");
 result.isolation={};
 for(const kind of ["cloud","foliage"]){
  result.isolation[kind]=await child.evaluate(kind=>{
   const s=window.__phaserGame.scene.getScene("PlayScene"),o=s.worldRenderer.surfaceStage.layeredSky,c=s.cameras.main;
   s.scene.pause();for(const image of s.children.list)image.setVisible?.(false);
   const image=kind==="cloud"?[...o.clouds.active.values()].find(i=>i.frame.realWidth>0):[...o.landscape.cards].find(([id])=>id.startsWith("forest:"))[1];
   image.setVisible(true).setAlpha(1).setTint(0xffffff);
   image.setPosition(c.scrollX*image.scrollFactorX+100,c.scrollY*image.scrollFactorY+100+image.displayHeight*image.originY);
   image.pipeline.motionSeconds=0;image.pipeline.windDistance=0;c.setBackgroundColor("#102030");
   return {x:100,y:100,width:image.displayWidth,height:image.displayHeight,cameraWidth:c.width,cameraHeight:c.height};
  },kind);
  await page.waitForTimeout(150);await page.locator("#game").screenshot({path:path.join(qa,kind+"-isolated-t0.png")});
  await child.evaluate(kind=>{const p=window.__phaserGame.renderer.pipelines.get("RegeneratedAtmosphere:"+kind);p.motionSeconds=.85;p.windDistance=.65;},kind);
  await page.waitForTimeout(150);await page.locator("#game").screenshot({path:path.join(qa,kind+"-isolated-t1.png")});
 }
 await child.evaluate(()=>{window.__phaserGame.scene.stop("PlayScene");});
 result.cleanup=await child.evaluate(()=>({inspector:!!window.__jkdLayeredSkyReview,
  pipelines:["cloud","foliage"].filter(id=>window.__phaserGame.renderer.pipelines.has("RegeneratedAtmosphere:"+id)),
  sections:Object.keys(window.__phaserGame.textures.list).filter(key=>key.startsWith("regenerated-landscape-section:"))}));
 assert.deepEqual(result.cleanup,{inspector:false,pipelines:[],sections:[]});
 assert.deepEqual(result.errors,[]);assert.deepEqual(result.shaderErrors,[]);assert.deepEqual(result.failedRequests,[]);assert.deepEqual(result.levelTwoRequests,[]);
 result.passed=true;console.log(JSON.stringify({passed:true,trees:result.before.trees.length,recording:result.recording,walking:result.walking,flight:result.flight,cleanup:result.cleanup}));
}catch(error){
 result.failure=error.stack;
 result.diagnostic=await page.evaluate(()=>{const f=document.getElementById("game"),g=f?.contentWindow.__phaserGame;
  return {status:document.getElementById("status")?.textContent,frameUrl:f?.src,mainText:document.getElementById("loading")?.textContent,
   sceneStates:g?.scene?.getScenes(false)?.map(s=>({key:s.scene.key,active:s.scene.isActive(),renderer:!!s.worldRenderer?.created,layered:!!s.worldRenderer?.surfaceStage?.layeredSky})),
   snapshot:window.__layeredWorldReview?.snapshot()};});
 console.log(JSON.stringify({diagnostic:result.diagnostic,errors:result.errors,console:result.console}));throw error;
}
finally{for(const key of ["d","w","Shift"])await page.keyboard.up(key).catch(()=>{});await fs.writeFile(path.join(qa,"polish-verification.json"),JSON.stringify(result,null,2));await browser.close();}


