import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const {chromium}=createRequire(import.meta.url)("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const qa=path.resolve("testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/qa-regenerated");
const result={views:[],pageErrors:[],failedRequests:[]};
const browser=await chromium.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
const page=await browser.newPage({viewport:{width:1536,height:1100}});
page.on("pageerror",e=>result.pageErrors.push(e.message));
page.on("response",r=>{if(r.status()>=400)result.failedRequests.push({url:r.url(),status:r.status()});});
try{
 await page.goto("http://127.0.0.1:8195/testing/animation-sandbox/2026-09-05-continuous-layered-world-v1/?review=regenerated",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>window.__layeredWorldReview?.snapshot().ready,null,{timeout:90000});
 const child=page.frames().find(f=>f!==page.mainFrame());
 await child.waitForFunction(()=>window.__phaserGame.scene.getScene("PlayScene").children.list.filter(image=>image.texture?.key==="regenerated-horizon-v2-island").length===3,null,{timeout:60000});
 for(const y of [8,38,57,12,17,21,30,35,39,47,52,56]){
  await page.evaluate(y=>window.__layeredWorldReview.seek(230,y),y);await page.waitForTimeout(300);
  const state=await child.evaluate(()=>{
   const scene=window.__phaserGame.scene.getScene("PlayScene");
   return {freshIslands:scene.children.list.filter(image=>image.texture?.key==="regenerated-horizon-v2-island").map(image=>({x:image.x,y:image.y,w:image.displayWidth,h:image.displayHeight,depth:image.depth,scaleX:image.scaleX,scaleY:image.scaleY})),
    legacy:scene.children.list.filter(image=>image.visible&&image.alpha>0&&/heavenblocks?.*(facade|backdrop)/i.test(image.texture?.key||"")).map(image=>image.texture.key)};
  });
  assert.equal(state.freshIslands.length,3);assert.deepEqual(state.legacy,[]);
  assert(state.freshIslands.every(image=>image.scaleX<=1&&image.scaleY<=1));
  await page.locator("#game").screenshot({path:path.join(qa,"island-"+y+".png")});
  if([8,38,57].includes(y))await page.locator("#game").screenshot({path:path.join(qa,"sky-230-"+y+".png")}); result.views.push({y,...state});
 }
 await child.evaluate(()=>{window.__phaserGame.scene.getScene("PlayScene").cameras.main.setZoom(.75);});
 await page.evaluate(()=>window.__layeredWorldReview.seek(231.5,34));await page.waitForTimeout(300);
 await page.locator("#game").screenshot({path:path.join(qa,"island-wide.png")});
 await child.evaluate(()=>{window.__phaserGame.scene.stop("PlayScene");});
 result.passed=true;
 console.log(JSON.stringify({passed:true,views:result.views.length,errors:result.pageErrors,failedRequests:result.failedRequests}));
}catch(error){result.failure=error.stack;throw error;}
finally{await fs.writeFile(path.join(qa,"island-verification.json"),JSON.stringify(result,null,2));await browser.close();}
