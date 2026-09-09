import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url),{chromium}=require("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const b=await chromium.connectOverCDP("http://127.0.0.1:9338"),p=b.contexts()[0].pages()[0];
const out="visual-approval-previews/2026-09-06-torch-and-mining-mockups/";
const errors=[];p.on("pageerror",e=>{errors.push(e.message);console.log("PAGEERROR",e.message)});
p.on("console",m=>{if(m.type()==="error")console.log("CONSOLEERROR",m.text())});
await p.reload({waitUntil:"domcontentloaded"});
await p.waitForFunction(()=>window.__phaserGame?.scene.getScenes(true).some(s=>s.sys.settings.key==="MainMenuScene"),null,{timeout:180000});
await p.evaluate(()=>{
 window.__phaserGame.scene.stop("MainMenuScene");
 window.__phaserGame.scene.start("WorldLoadScene",{saveSlot:1,worldIdentity:"torch-review-20260906",isNewSave:true,tutorialChoice:"no"});
});
await p.waitForFunction(()=>window.__jkdE2E && window.__phaserGame.scene.getScene("PlayScene")._sceneSetupReady,null,{timeout:240000});
await p.setViewportSize({width:1280,height:720});await p.waitForTimeout(500);
await p.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene("PlayScene"),w=s.worldModel;
 if(!s._saveWritesBlocked)throw new Error("Save guard required");
 for(let ty=102;ty<=105;ty++)for(let tx=37;tx<=43;tx++)w.setTile(tx,ty,0,0);
 w.setTile(44,105,2,w.getTileMaxHp(44,105,2));
 s.playerController.teleportToTile(43,105);
});
await p.waitForTimeout(900);
const samples=[];
async function sample(){
 return p.evaluate(()=>{
  const s=window.__phaserGame.scene.getScene("PlayScene"),h=s.hudSystem,c=h.torchIntensityControl;
  const bounds=o=>{const r=o.getBounds();return{x:r.x,y:r.y,w:r.width,h:r.height,cx:r.centerX,cy:r.centerY};};
  return {viewport:{w:innerWidth,h:innerHeight},logical:{w:s.scale.width,h:s.scale.height},...c.getSnapshot(),
   title:bounds(c.title),value:bounds(c.text),status:bounds(c.status),icon:bounds(h.approvedSkin.torchBaseFrame),
   core:bounds(h.approvedSkin.playerFrame),hit:bounds(c.hit),
   tooltip:{visible:c.tooltip.root.visible,frame:bounds(c.tooltip.frame),title:bounds(c.tooltip.title),body:bounds(c.tooltip.body),text:c.tooltip.body.text},
   legacyVisible:h.torchIcon.visible||h.torchStatusText.visible,saveBlocked:s._saveWritesBlocked};
 });
}
for(const percent of [1,100,200]){
 await p.evaluate(percent=>window.__phaserGame.scene.getScene("PlayScene").lightSystem.setTorchIntensityPercent(percent),percent);
 await p.waitForTimeout(150);
 const r=await sample(); assert.equal(r.percent,percent);assert.equal(r.displayText,percent+"%");
 assert.equal(r.legacyVisible,false);
 assert.ok(r.value.x>=270 && r.value.x+r.value.w<=308,JSON.stringify(r.value));
 assert.equal(r.value.cx,r.title.cx);assert.equal(r.status.cx,r.title.cx);
 assert.ok(r.value.y>r.title.y+r.title.h && r.status.y>r.value.y+r.value.h);
 assert.ok(r.icon.x>=314 && r.icon.x+r.icon.w<=338);
 samples.push(r);
}
await p.evaluate(()=>window.__phaserGame.scene.getScene("PlayScene").lightSystem.setTorchIntensityPercent(100));
await p.mouse.move(289,62);await p.waitForTimeout(150);
const hover=await sample();assert.equal(hover.tooltipVisible,true);
assert.ok(hover.tooltip.text.includes("Scroll mouse wheel"));
await p.screenshot({path:out+"torch-tooltip.png",clip:{x:0,y:0,width:580,height:250}});
await p.mouse.wheel(0,-100);await p.waitForTimeout(150);assert.equal((await sample()).percent,101);
await p.mouse.wheel(0,100);await p.waitForTimeout(150);assert.equal((await sample()).percent,100);
await p.mouse.click(289,62);await p.waitForTimeout(150);assert.equal((await sample()).percent,110);
await p.mouse.move(700,450);await p.waitForTimeout(100);assert.equal((await sample()).tooltipVisible,false);
await p.keyboard.press("t");await p.waitForTimeout(150);const toggleA=await sample();
await p.keyboard.press("t");await p.waitForTimeout(150);const toggleB=await sample();
assert.notEqual(toggleA.active,toggleB.active);assert.notEqual(toggleA.statusText,toggleB.statusText);
for(const [width,height] of [[800,450],[1600,1000],[1920,1080]]){
 await p.setViewportSize({width,height});await p.waitForTimeout(300);
 const r=await sample();assert.equal(r.value.cx,r.title.cx);assert.equal(r.status.cx,r.title.cx);
 assert.ok(r.value.x>=r.core.x && r.value.x+r.value.w<=r.core.x+r.core.w);
 samples.push(r);
}
await p.setViewportSize({width:1280,height:720});await p.waitForTimeout(300);
await p.mouse.move(289,62);await p.waitForTimeout(100);
await p.keyboard.press("Escape");await p.waitForTimeout(200);assert.equal((await sample()).tooltipVisible,false);
await p.keyboard.press("Escape");await p.waitForTimeout(200);
await p.evaluate(()=>window.__phaserGame.scene.getScene("PlayScene").lightSystem.setTorchIntensityPercent(100));
await p.mouse.move(798,378);await p.waitForTimeout(200);
await p.screenshot({path:out+"torch-after.png",clip:{x:0,y:0,width:550,height:170}});
await p.screenshot({path:out+"mining-current.jpg",quality:72});
await p.setViewportSize({width:1920,height:1080});await p.waitForTimeout(350);
await p.screenshot({path:out+"mining-current-1080.png"});
await fs.writeFile(out+"torch-runtime-verification.json",JSON.stringify({samples,hover,toggleA,toggleB,errors},null,2));
assert.deepEqual(errors,[]);
console.log(JSON.stringify({passed:true,percentages:[1,100,200],wheel:"100 -> 101 -> 100",click:"100 -> 110",toggle:[toggleA.statusText,toggleB.statusText],viewports:samples.map(r=>r.viewport),errors}));
process.exit(0);