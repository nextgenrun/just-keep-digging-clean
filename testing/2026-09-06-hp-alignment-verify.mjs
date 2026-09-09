import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url),{chromium}=require("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const b=await chromium.connectOverCDP("http://127.0.0.1:9338"),p=b.contexts()[0].pages()[0];
const out="visual-approval-previews/2026-09-06-hp-alignment-and-next-visuals/";
const errors=[];p.on("pageerror",e=>errors.push(e.message));
await p.reload({waitUntil:"domcontentloaded"});
await p.waitForFunction(()=>window.__phaserGame?.scene.getScenes(true).some(s=>s.sys.settings.key==="MainMenuScene"),null,{timeout:180000});
await p.evaluate(()=>{
 window.__phaserGame.scene.stop("MainMenuScene");
 window.__phaserGame.scene.start("WorldLoadScene",{saveSlot:1,worldIdentity:"hp-alignment-fixed-20260906",isNewSave:true,tutorialChoice:"no"});
});
await p.waitForFunction(()=>window.__jkdE2E && window.__phaserGame.scene.getScene("PlayScene")._sceneSetupReady,null,{timeout:240000});
await p.setViewportSize({width:1280,height:720});await p.waitForTimeout(1200);
await p.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene("PlayScene"),w=s.worldModel;
 for(let ty=102;ty<=105;ty++)for(let tx=37;tx<=43;tx++)w.setTile(tx,ty,0,0);
 w.setTile(44,105,2,w.getTileMaxHp(44,105,2));
 assertSave: if(!s._saveWritesBlocked)throw new Error("Save guard required");
 s.playerController.teleportToTile(43,105);
});
await p.waitForTimeout(1200);
const point=await p.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene("PlayScene"),c=s.cameras.main;
 return{x:44.5*s.config.tileSize-c.scrollX,y:105.5*s.config.tileSize-c.scrollY};
});
await p.mouse.move(point.x,point.y);await p.waitForTimeout(300);
const samples=[];
async function sample(){
 return p.evaluate(()=>{
  const s=window.__phaserGame.scene.getScene("PlayScene"),h=s.inputHandler.targetVisual.targetHud;
  const bounds=o=>{const r=o.getBounds();return{x:r.x,y:r.y,w:r.width,h:r.height,centerY:r.centerY};};
  return {viewport:{w:innerWidth,h:innerHeight},game:{w:s.scale.width,h:s.scale.height},
    hp:bounds(h.hp),title:bounds(h.title),frame:bounds(h.frame),
    gp:bounds(s.hudSystem._gemPowerLabelObject),visible:h.root.visible,text:h.hp.text,material:h.title.text};
 });
}
for(const [width,height] of [[1280,720],[800,450],[1600,1000],[1920,1080]]){
 await p.setViewportSize({width,height});await p.waitForTimeout(400);
 const r=await sample();assert.equal(r.visible,true);
 assert.ok(Math.abs(r.hp.centerY-r.gp.centerY)<.01,JSON.stringify(r));
 for(const t of [r.hp,r.title]){
  assert.ok(t.x>=r.frame.x+8 && t.x+t.w<=r.frame.x+r.frame.w-8);
  assert.ok(t.y>=r.frame.y+8 && t.y+t.h<=r.frame.y+r.frame.h-8);
 }
 samples.push(r);
 if(width===1920) await p.screenshot({path:out+"06-mining-hp-fixed-1080.png"});
}
await p.setViewportSize({width:1280,height:720});await p.waitForTimeout(350);
await p.screenshot({path:out+"05-hp-after.png",clip:{x:0,y:0,width:750,height:170}});
await p.screenshot({path:out+"06-mining-hp-fixed.jpg",quality:66});
const beforeHit=await sample();
await p.mouse.move(point.x,point.y);await p.mouse.down();await p.waitForTimeout(900);await p.mouse.up();await p.waitForTimeout(150);
const afterHit=await sample();
assert.notEqual(afterHit.text,beforeHit.text);
assert.ok(Math.abs(afterHit.hp.centerY-afterHit.gp.centerY)<.01);
await p.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene("PlayScene"),w=s.worldModel,max=w.getTileMaxHp(44,105,35);
 w.setTile(44,105,35,Math.ceil(max*.6));
});
await p.waitForTimeout(350);const longName=await sample();
assert.equal(longName.material,"ANCIENT RELIC CACHE");
assert.ok(longName.title.x>=longName.frame.x+8 && longName.title.x+longName.title.w<=longName.frame.x+longName.frame.w-8);
assert.ok(Math.abs(longName.hp.centerY-longName.gp.centerY)<.01);
await p.screenshot({path:out+"07-hp-long-label.png",clip:{x:0,y:0,width:750,height:170}});
await p.keyboard.press("Escape");await p.waitForTimeout(400);
const hiddenOnPause=!(await sample()).visible;assert.equal(hiddenOnPause,true);
await p.keyboard.press("Escape");await p.waitForTimeout(350);
await fs.writeFile(out+"hp-alignment-verification.json",JSON.stringify({samples,beforeHit,afterHit,longName,hiddenOnPause,errors},null,2));
console.log(JSON.stringify({samples:samples.map(r=>({viewport:r.viewport,gpCenter:r.gp.centerY,hpCenter:r.hp.centerY})),before:beforeHit.text,after:afterHit.text,longName:longName.material,errors}));
process.exit(0);
