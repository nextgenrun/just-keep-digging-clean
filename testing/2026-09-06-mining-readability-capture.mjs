import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url),{chromium}=require("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const b=await chromium.connectOverCDP("http://127.0.0.1:9338"),p=b.contexts()[0].pages()[0];
const out="visual-approval-previews/2026-09-06-torch-and-mining-mockups/";
await p.setViewportSize({width:1280,height:720});await p.waitForTimeout(300);
await p.evaluate(async()=>{
 const review=await import("/testing/2026-09-06-mining-readability-review.js?v=3");
 const s=window.__phaserGame.scene.getScene("PlayScene");
 review.restoreMiningReadabilityReview(s);s.scene.resume();
});
await p.mouse.move(289,62);
if(!await p.evaluate(()=>window.__phaserGame.scene.getScene("PlayScene").hudSystem.torchActive))await p.keyboard.press("t");
await p.waitForTimeout(500);
await p.screenshot({path:out+"torch-tooltip-on.png",clip:{x:0,y:0,width:580,height:250}});
await p.mouse.move(798,378);await p.waitForTimeout(500);
await p.setViewportSize({width:1920,height:1080});await p.waitForTimeout(350);
const baseline=await p.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene("PlayScene");
 s.scene.pause();
 const target={type:s.worldModel.getTileType(44,105),hp:s.worldModel.getHp(44,105)};
 return {target,player:{x:s.player.x,y:s.player.y,frame:s.player.frame.name,key:s.player.texture.key},camera:{x:s.cameras.main.scrollX,y:s.cameras.main.scrollY,zoom:s.cameras.main.zoom},torch:s.hudSystem.getTorchIntensitySnapshot(),saveBlocked:s._saveWritesBlocked,caps:s.textures.getTextureKeys().filter(x=>x.startsWith("world-visual-terrain-caps")&&x.includes("weathered-roots"))};
});
console.log("FROZEN",JSON.stringify(baseline));
await p.screenshot({path:out+"mining-before-1080.png"});
await p.screenshot({path:out+"mining-before.jpg",quality:55});
const reports=[];
for(const mode of ["terrain","player"]){
 const report=await p.evaluate(async mode=>{
  const review=await import("/testing/2026-09-06-mining-readability-review.js?v=3");
  return review.applyMiningReadabilityReview(window.__phaserGame.scene.getScene("PlayScene"),mode);
 },mode);
 await p.waitForTimeout(250);
 await p.screenshot({path:out+"mining-"+mode+"-1080.png"});
 await p.screenshot({path:out+"mining-"+mode+".jpg",quality:55});
 const state=await p.evaluate(()=>{
  const s=window.__phaserGame.scene.getScene("PlayScene");
  return{target:{type:s.worldModel.getTileType(44,105),hp:s.worldModel.getHp(44,105)},player:{x:s.player.x,y:s.player.y,frame:s.player.frame.name,key:s.player.texture.key},camera:{x:s.cameras.main.scrollX,y:s.cameras.main.scrollY,zoom:s.cameras.main.zoom}};
 });
 assert.deepEqual(state.target,baseline.target);assert.deepEqual(state.player,baseline.player);assert.deepEqual(state.camera,baseline.camera);
 reports.push({...report,state});
}
await fs.writeFile(out+"mining-review-verification.json",JSON.stringify({baseline,reports},null,2));
console.log(JSON.stringify(reports.map(({state,...rest})=>rest)));
process.exit(0);