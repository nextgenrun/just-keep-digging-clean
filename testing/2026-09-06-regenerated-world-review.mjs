import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
const { chromium } = createRequire(import.meta.url)("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const qa = path.resolve("testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-regenerated");
const shotDir = path.join(qa,"motion-frames");
await fs.mkdir(shotDir,{recursive:true});
const results = { generation:"regenerated-horizon-v2", date:"2026-09-06", url:"http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/", pageErrors:[], failedRequests:[], views:[] };
const browser = await chromium.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
const page = await browser.newPage({viewport:{width:1536,height:1100}});
page.on("pageerror",e=>results.pageErrors.push(e.message));
page.on("requestfailed",r=>{if(!r.failure()?.errorText.includes("ABORTED"))results.failedRequests.push({url:r.url(),error:r.failure()?.errorText});});
page.on("response",r=>{if(r.status()>=400)results.failedRequests.push({url:r.url(),status:r.status()});});
async function save() { await fs.writeFile(path.join(qa,"final-verification.json"),JSON.stringify(results,null,2)); }
try {
  await page.goto(results.url,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.__layeredWorldReview?.snapshot().ready,null,{timeout:90000});
  const child = page.frames().find(f=>f!==page.mainFrame());
  const positions=[];
  for(let x=7;x<=271;x+=12)positions.push(["surface-"+x,x,63]);
  for(const x of [7,100,230,270])for(const y of [8,38,57])positions.push(["sky-"+x+"-"+y,x,y]);
  for (const [name,x,y] of positions) {
    await page.evaluate(([x,y])=>window.__layeredWorldReview.seek(x,y),[x,y]);
    await page.waitForTimeout(350);
    const snapshot = await page.evaluate(()=>window.__layeredWorldReview.snapshot());
    assert.equal(snapshot.renderer.generation,"regenerated-horizon-v2");
    assert(snapshot.renderer.backgroundAssets.every(key=>key.startsWith("regenerated-horizon-v2-")));
    const owners=await child.evaluate(()=>{
      const scene=window.__phaserGame.scene.getScene("PlayScene"),renderer=scene.worldRenderer;
      return {far:renderer.surfaceStage.far.length,oldSky:renderer.skyCohesionLayer.enabled,
        legacyImages:scene.children.list.filter(image=>image.visible&&image.alpha>0&&/world-visual-v2-far|sky-cohesion|sky-foundation|layered-sky-review/.test(image.texture?.key||"")).map(image=>image.texture.key)};
    });
    assert.equal(owners.far,0);assert.equal(owners.oldSky,false);assert.deepEqual(owners.legacyImages,[]);
    snapshot.owners=owners;
    assert(snapshot.renderer.cloudSprites+snapshot.renderer.pooledCloudSprites<=96);
    await page.locator("#game").screenshot({path:path.join(qa,name+".png")});
    results.views.push({name,...snapshot}); await save(); console.log("Captured",name);
  }
  await page.evaluate(()=>window.__layeredWorldReview.seek(196,63));
  await page.evaluate(()=>window.__layeredWorldReview.setEnvironment(.95,"clear"));
  await page.locator("#pause").click();
  const frozen = await page.evaluate(()=>window.__layeredWorldReview.snapshot().renderer.traveledSeconds);
  await page.waitForTimeout(1000);
  assert.equal(await page.evaluate(()=>window.__layeredWorldReview.snapshot().renderer.traveledSeconds),frozen);
  results.pausePassed = true;
  await page.locator("#pause").click();
  const cdp = await page.context().newCDPSession(page);
  const frames = [], pending = [];
  cdp.on("Page.screencastFrame",event=>{
    const file = "frame-"+String(frames.length).padStart(5,"0")+".jpg";
    frames.push({file,timestamp:event.metadata.timestamp});
    pending.push(fs.writeFile(path.join(shotDir,file),Buffer.from(event.data,"base64")));
    void cdp.send("Page.screencastFrameAck",{sessionId:event.sessionId}).catch(()=>{});
  });
  results.crop = await page.locator("#game").boundingBox();
  await cdp.send("Page.startScreencast",{format:"jpeg",quality:88,maxWidth:1536,maxHeight:1100,everyNthFrame:4});
  await page.waitForTimeout(4000);
  await page.locator("#play").click();
  await page.waitForTimeout(700);
  const getPosition=()=>child.evaluate(()=>{const p=window.__phaserGame.scene.getScene("PlayScene").player;return {x:p.x,y:p.y};});
  const before=await getPosition();
  await page.keyboard.down("d");await page.waitForTimeout(6500);await page.keyboard.up("d");
  const after=await getPosition();assert(after.x>before.x+20);results.walking={before,after};
  await page.keyboard.down("Shift");await page.keyboard.down("w");await page.waitForTimeout(1000);
  await page.keyboard.up("w");await page.keyboard.up("Shift");
  const flight=await getPosition();assert(flight.y<after.y-20);results.flight=flight;
  await page.waitForTimeout(1000);
  await cdp.send("Page.stopScreencast");
  await Promise.all(pending);
  assert(frames.length>20);
  const concat = frames.map((frame,index)=>"file '"+frame.file+"'\nduration "+Math.max(.001,(frames[index+1]?.timestamp??frame.timestamp+1/15)-frame.timestamp).toFixed(6)).join("\n")+"\nfile '"+frames.at(-1).file+"'\n";
  await fs.writeFile(path.join(shotDir,"frames.txt"),concat);
  results.motionRecording = {frames:frames.length,duration:frames.at(-1).timestamp-frames[0].timestamp};
  results.motionAdvanced = (await page.evaluate(()=>window.__layeredWorldReview.snapshot().renderer.traveledSeconds)) > frozen;
  await page.locator("#game").screenshot({path:path.join(qa,"final-travel.png")});
  await child.evaluate(()=>{window.__phaserGame.scene.stop("PlayScene");});
  results.lifecycle = await child.evaluate(()=>({inspector:!!window.__jkdLayeredSkyReview,pipelines:["moonfall-escarpment","crownfall-sanctuary"].filter(id=>window.__phaserGame.renderer.pipelines.has("RegeneratedWaterfall:"+id)),owned:Object.keys(window.__phaserGame.textures.list).filter(k=>k.includes(":clean-alpha")||k.includes(":feather:")||k.startsWith("layered-sky-review-mask")||(k.startsWith("regenerated-horizon-v2-")&&k.includes(":edge:")))}));
  assert.equal(results.lifecycle.inspector,false);assert.deepEqual(results.lifecycle.owned,[]);assert.deepEqual(results.lifecycle.pipelines,[]);
  results.passed=true; await save();
  console.log(JSON.stringify({passed:results.passed,views:results.views.length,pageErrors:results.pageErrors,failedRequests:results.failedRequests,pause:results.pausePassed,motion:results.motionAdvanced,walking:results.walking,flight:results.flight,lifecycle:results.lifecycle},null,2));
} catch(error) { results.failure=error.stack;await save();throw error; }
finally { for(const key of ["d","w","Shift"])await page.keyboard.up(key).catch(()=>{});await browser.close(); }

