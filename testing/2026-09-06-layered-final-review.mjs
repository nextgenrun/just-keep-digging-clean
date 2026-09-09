import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
const { chromium } = createRequire(import.meta.url)("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const qa = path.resolve("testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa");
const shotDir = path.join(qa,"motion-frames");
await fs.mkdir(shotDir,{recursive:true});
const results = { date:"2026-09-06", url:"http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/", pageErrors:[], failedRequests:[], views:[] };
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
  for (const [name,x,y] of [["final-handoff",100,57],["final-east-handoff",117,57],["final-mine-handoff",134,57],["final-town",20,63],["final-sky",100,46],["final-heavenblocks",230,30]]) {
    await page.evaluate(([x,y])=>window.__layeredWorldReview.seek(x,y),[x,y]);
    await page.waitForTimeout(350);
    const snapshot = await page.evaluate(()=>window.__layeredWorldReview.snapshot());
    assert(snapshot.renderer.cloudSprites>0);
    assert(snapshot.renderer.cloudSprites+snapshot.renderer.pooledCloudSprites<=180);
    await page.locator("#game").screenshot({path:path.join(qa,name+".png")});
    results.views.push({name,...snapshot}); await save();
  }
  await page.evaluate(()=>window.__layeredWorldReview.seek(100,57));
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
  await page.locator("#tour").click();
  await page.waitForTimeout(10000);
  await page.locator("#tour").click();
  await cdp.send("Page.stopScreencast");
  await Promise.all(pending);
  assert(frames.length>20);
  const concat = frames.map((frame,index)=>"file '"+frame.file+"'\nduration "+Math.max(.001,(frames[index+1]?.timestamp??frame.timestamp+1/15)-frame.timestamp).toFixed(6)).join("\n")+"\nfile '"+frames.at(-1).file+"'\n";
  await fs.writeFile(path.join(shotDir,"frames.txt"),concat);
  results.motionRecording = {frames:frames.length,duration:frames.at(-1).timestamp-frames[0].timestamp};
  results.motionAdvanced = (await page.evaluate(()=>window.__layeredWorldReview.snapshot().renderer.traveledSeconds)) > frozen;
  await page.locator("#game").screenshot({path:path.join(qa,"final-travel.png")});
  await child.evaluate(()=>{window.__phaserGame.scene.stop("PlayScene");});
  results.lifecycle = await child.evaluate(()=>({inspector:!!window.__jkdLayeredSkyReview,owned:Object.keys(window.__phaserGame.textures.list).filter(k=>k.includes(":clean-alpha")||k.includes(":feather:")||k.startsWith("layered-sky-review-mask"))}));
  assert.equal(results.lifecycle.inspector,false);assert.deepEqual(results.lifecycle.owned,[]);
  results.passed=true; await save();
  console.log(JSON.stringify(results,null,2));
} catch(error) { results.failure=error.stack;await save();throw error; }
finally { await browser.close(); }

