import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {createRequire} from "node:module";
const {chromium}=createRequire(import.meta.url)("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const qa=path.resolve("testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-regenerated");
const result={date:"2026-09-06",views:[],pageErrors:[],failedRequests:[]};
const browser=await chromium.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
const page=await browser.newPage({viewport:{width:1536,height:1100}});
page.on("pageerror",e=>result.pageErrors.push(e.message));
page.on("response",r=>{if(r.status()>=400)result.failedRequests.push({url:r.url(),status:r.status()});});
try{
 await page.goto("http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/?revision=level2-living",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>window.__layeredWorldReview?.snapshot().ready,null,{timeout:90000});
 const child=page.frames().find(f=>f!==page.mainFrame());
 const beforeClock=await page.evaluate(()=>window.__layeredWorldReview.snapshot().renderer.environment.time);
 await page.waitForTimeout(1000);
 const afterClock=await page.evaluate(()=>window.__layeredWorldReview.snapshot().renderer.environment.time);
 assert(afterClock>beforeClock);result.clockProgression={before:beforeClock,after:afterClock};
 for(const [name,x,time,weather,settle]of [
  ["crownfall-day",196,.475,"clear",700],["crownfall-dawn",196,.16,"clear",700],
  ["crownfall-dusk",196,.70,"clear",700],["crownfall-night",196,.95,"clear",700],
  ["moonfall-night",155,.95,"clear",700],["eastern-cascades-night",258,.95,"clear",700],
  ["crownfall-storm",196,.70,"storm",6500],["moonfall-rain",155,.475,"rain",6500],
  ["crownfall-snow",196,.475,"snow",6500]]){
  if(weather==="snow")await child.evaluate(()=>window.__phaserGame.scene.getScene("PlayScene").dayNightCycle.fromJSON({day:22}));
  await page.evaluate(([x,time,weather])=>{window.__layeredWorldReview.seek(x,63);window.__layeredWorldReview.setEnvironment(time,weather);},[x,time,weather]);
  await page.waitForTimeout(settle);
  const snapshot=await page.evaluate(()=>window.__layeredWorldReview.snapshot());
  assert(snapshot.renderer.landmarks.some(item=>item.visible&&item.flowing));
  assert(snapshot.renderer.landmarks.every(item=>item.tileX>=132&&item.tileX<=279));
  const counts=await child.evaluate(()=>{const scene=window.__phaserGame.scene.getScene("PlayScene");
    return {stars:scene.dayNightCycle.stars.length,fireflies:scene.atmosphereSystem.groundEffects.fireflies.length,
      windMotes:scene.atmosphereSystem.groundEffects.windParticles.length,weather:scene.weatherSystem.getLightingSnapshot()};});
  assert.equal(counts.stars,0);assert.equal(counts.fireflies,0);assert.equal(counts.windMotes,0);
  if(weather==="storm")assert(snapshot.renderer.environment.cover>.4);
  if(weather==="rain")assert(snapshot.renderer.environment.rain>.3);
  await page.locator("#game").screenshot({path:path.join(qa,name+".jpg"),type:"jpeg",quality:90});
  result.views.push({name,...snapshot,counts});console.log("Captured",name);
 }
 await page.evaluate(()=>{window.__layeredWorldReview.seek(196,63);window.__layeredWorldReview.setEnvironment(.475,"clear");});
 await page.waitForTimeout(1000);
 result.mattes=await child.evaluate(()=>{
  const owner=window.__phaserGame.scene.getScene("PlayScene").worldRenderer.surfaceStage.layeredSky;
  return [...owner.ownedTextureKeys].filter(key=>/ridge-|escarpment|sanctuary/.test(key)).map(key=>{
   const texture=owner.scene.textures.get(key),source=texture.getSourceImage(),pixels=texture.getContext().getImageData(0,0,source.width,source.height).data;
   let visibleMagenta=0,transparent=0;
   for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]===0)transparent++;
    if(pixels[i+3]>64&&pixels[i]>pixels[i+1]+45&&pixels[i+2]>pixels[i+1]+45)visibleMagenta++;}
   return {key,visibleMagenta,transparentFraction:transparent/(source.width*source.height)};
  });
 });
 assert(result.mattes.every(m=>m.visibleMagenta===0&&m.transparentFraction>.10));
 result.isolation=await child.evaluate(()=>{
  const scene=window.__phaserGame.scene.getScene("PlayScene"),owner=scene.worldRenderer.surfaceStage.layeredSky;
  const item=owner.landmarks.items.find(item=>item.id==="crownfall"),camera=scene.cameras.main;
  scene.scene.pause();
  for(const image of scene.children.list)image.setVisible?.(false);
  item.image.setVisible(true);camera.setBackgroundColor("#102030");
  item.image.pipeline.flowSeconds=0;
  return {x:item.image.x-camera.scrollX*item.image.scrollFactorX,y:item.image.y-camera.scrollY,
   width:item.image.displayWidth,height:item.image.displayHeight,cameraWidth:camera.width,cameraHeight:camera.height};
 });
 await page.waitForTimeout(200);
 await page.locator("#game").screenshot({path:path.join(qa,"water-isolated-t0.png")});
 await child.evaluate(()=>{const scene=window.__phaserGame.scene.getScene("PlayScene");scene.worldRenderer.surfaceStage.layeredSky.landmarks.items.find(item=>item.id==="crownfall").image.pipeline.flowSeconds=.73;});
 await page.waitForTimeout(200);
 await page.locator("#game").screenshot({path:path.join(qa,"water-isolated-t1.png")});
 await child.evaluate(()=>{window.__phaserGame.scene.stop("PlayScene");});
 result.cleanedPipelines=await child.evaluate(()=>["moonfall-escarpment","crownfall-sanctuary"].filter(id=>window.__phaserGame.renderer.pipelines.has("RegeneratedWaterfall:"+id)));
 assert.deepEqual(result.cleanedPipelines,[]);
 assert.deepEqual(result.pageErrors,[]);assert.deepEqual(result.failedRequests,[]);
 result.passed=true;console.log(JSON.stringify({passed:true,views:result.views.length,clock:result.clockProgression,errors:result.pageErrors,requests:result.failedRequests}));
}catch(error){result.failure=error.stack;throw error;}
finally{await fs.writeFile(path.join(qa,"level2-environment-verification.json"),JSON.stringify(result,null,2));await browser.close();}
