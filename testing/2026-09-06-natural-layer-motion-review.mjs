import assert from "node:assert/strict";
import {createRequire} from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
const {chromium}=createRequire(import.meta.url)("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const qa=path.resolve("testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-natural-motion");
const shots=path.join(qa,"frames");await fs.mkdir(shots,{recursive:true});
const result={date:"2026-09-06",pageErrors:[],failedRequests:[],shaderErrors:[]};
const browser=await chromium.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
const page=await browser.newPage({viewport:{width:1536,height:1100}});
page.on("pageerror",e=>result.pageErrors.push(e.message));
page.on("response",r=>{if(r.status()>=400)result.failedRequests.push({url:r.url(),status:r.status()});});
page.on("console",m=>{if(m.type()==="error"&&/shader|uniform|WebGL|GL_INVALID/i.test(m.text()))result.shaderErrors.push(m.text());});
try{
 await page.goto("http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/?revision=natural-motion-v2",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>window.__layeredWorldReview?.snapshot().ready,null,{timeout:90000});
 const child=page.frames().find(f=>f!==page.mainFrame());
 const state=()=>child.evaluate(()=>{
  const game=window.__phaserGame,scene=game.scene.getScene("PlayScene"),o=scene.worldRenderer.surfaceStage.layeredSky,camera=scene.cameras.main;
  return {seconds:o.clouds.traveledSeconds,wind:o.clouds.wind,camera:{x:camera.scrollX,y:camera.scrollY},fps:game.loop.actualFps,
   cloudTime:o.clouds.motion.pipeline.motionSeconds,foliageTime:o.landscape.motion.pipeline.motionSeconds,
   clouds:[...o.clouds.active].map(([id,image])=>({id,x:image.x,y:image.y,scale:image.scaleX,pipeline:image.pipeline.name})),
   spray:o.landmarks.items.flatMap(item=>item.spray.map(puff=>({id:puff.sprite.name,x:puff.sprite.x,y:puff.sprite.y,alpha:puff.sprite.alpha,scale:puff.sprite.scaleX}))),
   landmarks:o.landmarks.snapshot()};
 });
 await page.evaluate(()=>{window.__layeredWorldReview.seek(196,63);window.__layeredWorldReview.setEnvironment(.475,"clear");});
 await page.waitForTimeout(3500);
 result.before=await state();
 assert(result.before.clouds.every(item=>item.pipeline==="RegeneratedAtmosphere:cloud"));
 assert(result.before.spray.length===35);
 const cdp=await page.context().newCDPSession(page),frames=[],pending=[];
 cdp.on("Page.screencastFrame",event=>{
  const file="frame-"+String(frames.length).padStart(5,"0")+".jpg";
  frames.push({file,timestamp:event.metadata.timestamp});
  pending.push(fs.writeFile(path.join(shots,file),Buffer.from(event.data,"base64")));
  void cdp.send("Page.screencastFrameAck",{sessionId:event.sessionId}).catch(()=>{});
 });
 result.crop=await page.locator("#game").boundingBox();
 await page.locator("#game").screenshot({path:path.join(qa,"crownfall-day.jpg"),type:"jpeg",quality:92});
 await cdp.send("Page.startScreencast",{format:"jpeg",quality:92,maxWidth:1536,maxHeight:1100,everyNthFrame:1});
 await page.waitForTimeout(12000);
 await cdp.send("Page.stopScreencast");await Promise.all(pending);
 result.after=await state();assert.deepEqual(result.after.camera,result.before.camera);
 result.travel=result.after.clouds.flatMap(item=>{
  const before=result.before.clouds.find(other=>other.id===item.id);return before?[{id:item.id,pixels:item.x-before.x}]:[];
 });
 assert(result.travel.some(item=>item.id.startsWith("near-haze")&&Math.abs(item.pixels)>200));
 assert(result.travel.some(item=>item.id.startsWith("valley-mist")&&Math.abs(item.pixels)>150));
 result.recording={frames:frames.length,seconds:frames.at(-1).timestamp-frames[0].timestamp};
 result.recording.sampleFps=(frames.length-1)/result.recording.seconds;
 assert(frames.length>100);
 await fs.writeFile(path.join(shots,"frames.txt"),frames.map((f,i)=>"file '"+f.file+"'\nduration "+Math.max(.001,(frames[i+1]?.timestamp??f.timestamp+1/30)-f.timestamp).toFixed(6)).join("\n")+"\nfile '"+frames.at(-1).file+"'\n");
 await page.locator("#pause").click();const held=await state();await page.waitForTimeout(700);const still=await state();
 assert.equal(still.seconds,held.seconds);assert.equal(still.cloudTime,held.cloudTime);assert.equal(still.foliageTime,held.foliageTime);
 assert.deepEqual(still.spray,held.spray);result.pause=true;await page.locator("#pause").click();
 for(const [name,x,time,weather]of [["moonfall-dusk",155,.70,"clear"],["crownfall-night",196,.95,"clear"],["crownfall-storm",196,.475,"storm"]]){
  await page.evaluate(([x,time,weather])=>{window.__layeredWorldReview.seek(x,63);window.__layeredWorldReview.setEnvironment(time,weather);},[x,time,weather]);
  await page.waitForTimeout(weather==="storm"?6000:600);
  await page.locator("#game").screenshot({path:path.join(qa,name+".jpg"),type:"jpeg",quality:92});
 }
 await page.evaluate(()=>{window.__layeredWorldReview.seek(196,63);window.__layeredWorldReview.setEnvironment(.475,"clear");});
 await page.waitForTimeout(1000);
 result.isolation={};
 for(const kind of ["water","cloud","foliage"]){
  result.isolation[kind]=await child.evaluate(kind=>{
   const scene=window.__phaserGame.scene.getScene("PlayScene"),o=scene.worldRenderer.surfaceStage.layeredSky,c=scene.cameras.main;
   scene.scene.pause();for(const image of scene.children.list)image.setVisible?.(false);
   const image=kind==="water"?o.landmarks.items.find(i=>i.id==="crownfall").image:kind==="cloud"?[...o.clouds.active.values()][0]:[...o.landscape.cards.values()].find(i=>i.pipeline.name==="RegeneratedAtmosphere:foliage");
   image.setVisible(true).setAlpha(1).setTint(0xffffff);
   const top=kind==="water"?20:100;
   image.setPosition(c.scrollX*image.scrollFactorX+100,c.scrollY*image.scrollFactorY+top+image.displayHeight*image.originY);
   image.pipeline.motionSeconds=0;image.pipeline.windDistance=0;image.pipeline.flowSeconds=0;c.setBackgroundColor("#102030");
   return {x:100,y:top,width:image.displayWidth,height:image.displayHeight,cameraWidth:c.width,cameraHeight:c.height};
  },kind);
  await page.waitForTimeout(120);await page.locator("#game").screenshot({path:path.join(qa,kind+"-isolated-t0.png")});
  await child.evaluate(kind=>{const pipeline=window.__phaserGame.renderer.pipelines.get(kind==="water"?"RegeneratedWaterfall:crownfall-sanctuary":"RegeneratedAtmosphere:"+kind);pipeline.motionSeconds=.85;pipeline.windDistance=.65;pipeline.flowSeconds=.73;},kind);
  await page.waitForTimeout(120);await page.locator("#game").screenshot({path:path.join(qa,kind+"-isolated-t1.png")});
 }
 await child.evaluate(()=>{window.__phaserGame.scene.stop("PlayScene");});
 result.remainingPipelines=await child.evaluate(()=>["RegeneratedWaterfall:moonfall-escarpment","RegeneratedWaterfall:crownfall-sanctuary","RegeneratedAtmosphere:cloud","RegeneratedAtmosphere:foliage"].filter(key=>window.__phaserGame.renderer.pipelines.has(key)));
 assert.deepEqual(result.remainingPipelines,[]);assert.deepEqual(result.pageErrors,[]);assert.deepEqual(result.failedRequests,[]);assert.deepEqual(result.shaderErrors,[]);
 result.passed=true;console.log(JSON.stringify({passed:true,recording:result.recording,fps:result.before.fps,travel:result.travel,pause:true,cleanup:result.remainingPipelines}));
}catch(error){result.failure=error.stack;throw error;}
finally{await fs.writeFile(path.join(qa,"motion-verification.json"),JSON.stringify(result,null,2));await browser.close();}

