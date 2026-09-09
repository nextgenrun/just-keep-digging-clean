import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const { chromium }=require("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const browser=await chromium.connectOverCDP("http://127.0.0.1:9337");
const page=browser.contexts()[0].pages()[0];
await page.setViewportSize({width:1280,height:720}); await page.waitForTimeout(500);
const out="visual-approval-previews/2026-09-05-most-seen-visuals/";
const evidence={};const errors=[];
page.on("pageerror",err=>errors.push(err.message));
await page.keyboard.press("e");
await page.waitForFunction(()=>window.__phaserGame.scene.getScene("PlayScene").shopOverlay?.isVisible,null,{timeout:20000});
evidence.shop=await page.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene("PlayScene");
 return {visible:s.shopOverlay.isVisible,prompts:s.npcManager._interactPrompts.filter(p=>p.view.root.visible).length,targetVisible:s.inputHandler.targetVisual.targetHud.root.visible};
});
assert.equal(evidence.shop.prompts,0);assert.equal(evidence.shop.targetVisible,false);
await page.keyboard.press("Escape");
await page.waitForTimeout(500);
await page.mouse.click(986,33);
await page.waitForFunction(()=>window.__phaserGame.scene.getScene("PlayScene").worldMapOverlay?.isOpen,null,{timeout:30000});
evidence.mapOpenedByClick=true;
await page.keyboard.press("Escape");await page.waitForTimeout(400);
await page.mouse.click(1139,33);
await page.waitForFunction(()=>window.__phaserGame.scene.getScene("PlayScene").gameState==="paused",null,{timeout:5000});
evidence.menuOpenedByClick=true;
await page.keyboard.press("Escape");await page.waitForTimeout(400);
evidence.stage=await page.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene("PlayScene"),w=s.worldModel;
 const original=[];
 for(let ty=102;ty<=105;ty++) for(let tx=37;tx<=43;tx++){
  original.push({tx,ty,type:w.getType(tx,ty),hp:w.getHp(tx,ty)});w.setTile(tx,ty,0,0);
 }
 // A durable normal stone face proves partial damage and destruction with real input.
 original.push({tx:44,ty:105,type:w.getType(44,105),hp:w.getHp(44,105)});
 w.setTile(44,105,2,w.getTileMaxHp(44,105,2));
 window.__wiredFixtureOriginal=original;
 return {teleported:s.playerController.teleportToTile(43,105),saveBlocked:s._saveWritesBlocked};
});
assert.equal(evidence.stage.teleported,true);assert.equal(evidence.stage.saveBlocked,true);
await page.waitForTimeout(2000);
const target=await page.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene("PlayScene"),c=s.cameras.main;
 return {x:44.5*s.config.tileSize-c.scrollX,y:105.5*s.config.tileSize-c.scrollY,
  max:s.worldModel.getTileMaxHp(44,105),hp:s.worldModel.getHp(44,105),dig:s.inputHandler.keys.mine?.keyCode};
});
console.log("TARGET",JSON.stringify(target));
await page.mouse.move(target.x,target.y);await page.waitForTimeout(350);
evidence.before=await page.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene("PlayScene"),h=s.inputHandler.targetVisual.targetHud;
 return {visible:h.root.visible,title:h.title.text,hp:h.hp.text,target:h.target,current:s.worldModel.getHp(44,105),x:h.root.x,y:h.root.y};
});
console.log("BEFORE",JSON.stringify(evidence.before));
await page.screenshot({path:out+"wired-mining-before.png"});
await page.mouse.down();
await page.waitForTimeout(900);
await page.mouse.up();
await page.waitForTimeout(50);
evidence.after=await page.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene("PlayScene"),h=s.inputHandler.targetVisual.targetHud;
 return {visible:h.root.visible,title:h.title.text,hp:h.hp.text,target:h.target,current:s.worldModel.getHp(44,105),type:s.worldModel.getType(44,105)};
});
console.log("AFTER",JSON.stringify(evidence.after));
await page.screenshot({path:out+"wired-mining-live.png"});
await page.screenshot({path:out+"wired-mining-live.jpg",quality:60});
await fs.writeFile(out+"wired-live-checks.json",JSON.stringify({...evidence,errors},null,2));
process.exit(0);

