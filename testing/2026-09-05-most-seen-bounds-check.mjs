import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {chromium}=require("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const b=await chromium.connectOverCDP("http://127.0.0.1:9337"),p=b.contexts()[0].pages()[0];
await p.setViewportSize({width:1280,height:720});await p.waitForTimeout(600);
const out="visual-approval-previews/2026-09-05-most-seen-visuals/";
const proof={merchants:[],viewport:[],errors:[]};
p.on("pageerror",e=>proof.errors.push(e.message));
const point=await p.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene("PlayScene"),c=s.cameras.main;
 s.worldModel.setHp(44,105,1);
 return {x:44.5*s.config.tileSize-c.scrollX,y:105.5*s.config.tileSize-c.scrollY};
});
await p.mouse.move(point.x,point.y);
await p.mouse.down();
await p.waitForFunction(()=>window.__phaserGame.scene.getScene("PlayScene").worldModel.getType(44,105)===0,null,{timeout:10000});
await p.mouse.up();await p.waitForTimeout(150);
proof.destruction=await p.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene("PlayScene"),h=s.inputHandler.targetVisual.targetHud;
 return {oneHpFixture:true,type:s.worldModel.getType(44,105),visible:h.root.visible,hp:h.hp.text,target:h.target};
});
assert.equal(proof.destruction.visible,false);
await p.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene("PlayScene");
 s.worldModel.setTile(44,105,3,s.worldModel.getTileMaxHp(44,105,3));
});
await p.waitForTimeout(400);
proof.retarget=await p.evaluate(()=>{
 const h=window.__phaserGame.scene.getScene("PlayScene").inputHandler.targetVisual.targetHud;
 return {visible:h.root.visible,title:h.title.text,hp:h.hp.text};
});
assert.equal(proof.retarget.visible,true);assert.equal(proof.retarget.title,"COPPER");
for(const [width,height] of [[800,450],[1920,1080],[1280,720]]) {
 await p.setViewportSize({width,height});await p.waitForTimeout(400);
 const r=await p.evaluate(()=>{
  const s=window.__phaserGame.scene.getScene("PlayScene"),h=s.inputHandler.targetVisual.targetHud;
  const f=h.frame.getBounds(),a=h.title.getBounds(),b=h.hp.getBounds(),q=s.hudSystem.quickControls;
  return {screen:{w:innerWidth,h:innerHeight},game:{w:s.scale.width,h:s.scale.height},frame:{x:f.x,y:f.y,w:f.width,h:f.height},title:{x:a.x,y:a.y,w:a.width,h:a.height},hp:{x:b.x,y:b.y,w:b.width,h:b.height},coreRight:s.hudSystem.approvedSkin?.playerFrame?.getBounds?.().right,buttons:[q.wikiShortcut.frame,q.mapFrame,q.pauseFrame].map(v=>{const r=v.getBounds();return{x:r.x,y:r.y,w:r.width,h:r.height}})};
 });
 for(const t of [r.title,r.hp]){assert.ok(t.x>=r.frame.x && t.x+t.w<=r.frame.x+r.frame.w);assert.ok(t.y>=r.frame.y && t.y+t.h<=r.frame.y+r.frame.h);}
 for(const t of [r.frame,...r.buttons]) assert.ok(t.x>=0 && t.y>=0 && t.x+t.w<=r.game.w && t.y+t.h<=r.game.h);
 proof.viewport.push(r);
 if(width===1920) await p.screenshot({path:out+"wired-mining-1080.png"});
}
await p.mouse.click(986,33);
await p.waitForFunction(()=>window.__phaserGame.scene.getScene("PlayScene").worldMapOverlay?.isOpen,null,{timeout:20000});
proof.mapHidesTarget=await p.evaluate(()=>!window.__phaserGame.scene.getScene("PlayScene").inputHandler.targetVisual.targetHud.root.visible);
assert.equal(proof.mapHidesTarget,true);
await p.keyboard.press("Escape");await p.waitForTimeout(400);
const merchantIds=await p.evaluate(()=>window.__phaserGame.scene.getScene("PlayScene").npcManager.npcDefs.map(n=>n.merchantId));
for(const id of merchantIds){
 const placed=await p.evaluate(id=>{
  const s=window.__phaserGame.scene.getScene("PlayScene"),n=s.npcManager.npcDefs.find(n=>n.merchantId===id);
  return s.playerController.teleportToTile(Math.round(n.tx),n.ty);
 },id);
 assert.equal(placed,true);await p.waitForTimeout(750);
 const r=await p.evaluate(id=>{
  const s=window.__phaserGame.scene.getScene("PlayScene"),v=s.npcManager._interactPrompts.find(n=>n.npc.merchantId===id).view;
  const bounds=o=>{
   const r=o.getBounds(),c=s.cameras.main;
   const a=c.matrix.transformPoint(r.left-c.scrollX,r.top-c.scrollY,{});
   const b=c.matrix.transformPoint(r.right-c.scrollX,r.bottom-c.scrollY,{});
   return{x:a.x,y:a.y,w:b.x-a.x,h:b.y-a.y};
  };
  return {id,visible:v.root.visible,title:v.title.text,detail:v.detail.text,frame:bounds(v.frame),titleBounds:bounds(v.title),detailBounds:bounds(v.detail),count:s.npcManager._interactPrompts.filter(n=>n.view.root.visible).length};
 },id);
 assert.equal(r.visible,true,id);assert.equal(r.count,1,id);
 assert.ok(Math.abs(r.frame.w-208)<.01,"merchant logical width after resize");
 for(const t of [r.titleBounds,r.detailBounds]) {assert.ok(t.x>=r.frame.x && t.x+t.w<=r.frame.x+r.frame.w);assert.ok(t.y>=r.frame.y && t.y+t.h<=r.frame.y+r.frame.h);}
 assert.ok(r.frame.x>=12 && r.frame.x+r.frame.w<=1268 && r.frame.y>=12 && r.frame.y+r.frame.h<=708);
 proof.merchants.push(r);
 await p.screenshot({path:out+"wired-merchant-"+id+".png"});
}
proof.edges=[];
await p.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene("PlayScene"),c=s.cameras.main;
 window.__wiredFollow={target:c._follow,lerpX:c.lerp.x,lerpY:c.lerp.y,offsetX:c.followOffset.x,offsetY:c.followOffset.y};
 c.stopFollow();
});
for(const [x,y,zoom] of [[2,360,1],[1278,360,1],[640,2,1],[640,718,1],[2,360,1.35],[1278,360,.8]]) {
 await p.evaluate(({x,y,zoom})=>{
  const s=window.__phaserGame.scene.getScene("PlayScene"),c=s.cameras.main;
  const v=s.npcManager._interactPrompts.find(p=>p.npc.merchantId==="moneyMonster").view;
  c.setZoom(zoom);
  c.setScroll(v.worldX-x,v.worldY-y);
 },{x,y,zoom});
 await p.waitForTimeout(400);
 const r=await p.evaluate(()=>{
  const s=window.__phaserGame.scene.getScene("PlayScene"),c=s.cameras.main;
  const v=s.npcManager._interactPrompts.find(p=>p.npc.merchantId==="moneyMonster").view;
  const r=v.frame.getBounds();
  const a=c.matrix.transformPoint(r.left-c.scrollX,r.top-c.scrollY,{});
  const b=c.matrix.transformPoint(r.right-c.scrollX,r.bottom-c.scrollY,{});
  return {zoom:c.zoomX,width:c.width,height:c.height,left:a.x,top:a.y,right:b.x,bottom:b.y,visible:v.root.visible};
 });
 assert.equal(r.visible,true);
 assert.ok(r.left>=11.99 && r.right<=r.width-11.99 && r.top>=11.99 && r.bottom<=r.height-11.99,JSON.stringify(r));
 assert.ok(Math.abs(r.right-r.left-208)<.02,JSON.stringify(r));
 proof.edges.push(r);
}
await p.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene("PlayScene"),c=s.cameras.main,f=window.__wiredFollow;
 c.setZoom(1);c.startFollow(f.target,false,f.lerpX,f.lerpY,f.offsetX,f.offsetY);
 s.playerController.teleportToTile(5,64);
});
await p.waitForTimeout(700);
await p.screenshot({path:out+"wired-surface-final.jpg",quality:60});
await p.setViewportSize({width:1920,height:1080});await p.waitForTimeout(500);
await p.screenshot({path:out+"wired-surface-1080.png"});
await fs.writeFile(out+"wired-bounds-checks.json",JSON.stringify(proof,null,2));
console.log(JSON.stringify(proof,null,2));
process.exit(0);
