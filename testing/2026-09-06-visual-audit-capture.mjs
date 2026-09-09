import fs from "node:fs/promises";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url),{chromium}=require("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const b=await chromium.connectOverCDP("http://127.0.0.1:9338"),p=b.contexts()[0].pages()[0];
await p.setViewportSize({width:1280,height:720});await p.waitForTimeout(500);
const out="visual-approval-previews/2026-09-06-hp-alignment-and-next-visuals/";
await p.screenshot({path:out+"01-surface-current.jpg",quality:65});
await p.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene("PlayScene"),w=s.worldModel;
 for(let ty=102;ty<=105;ty++)for(let tx=37;tx<=43;tx++) w.setTile(tx,ty,0,0);
 w.setTile(44,105,2,w.getTileMaxHp(44,105,2));
 s.playerController.teleportToTile(43,105);
});
await p.waitForTimeout(1600);
const point=await p.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene("PlayScene"),c=s.cameras.main;
 return{x:44.5*s.config.tileSize-c.scrollX,y:105.5*s.config.tileSize-c.scrollY};
});
await p.mouse.move(point.x,point.y);await p.waitForTimeout(350);
const baseline=await p.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene("PlayScene"),h=s.inputHandler.targetVisual.targetHud;
 const bounds=o=>{const r=o?.getBounds?.();return r?{x:r.x,y:r.y,w:r.width,h:r.height,centerY:r.centerY}:null;};
 return {target:{frame:bounds(h.frame),title:bounds(h.title),hp:bounds(h.hp),text:h.hp.text},gp:bounds(s.hudSystem._gemPowerLabelObject),gpText:s.hudSystem._gemPowerLabelObject?.text,
  root:{x:h.root.x,y:h.root.y,scale:h.root.scaleX},core:bounds(s.hudSystem.approvedSkin.playerFrame),player:bounds(s.playerSprite),
  sceneKeys:Object.keys(s).filter(k=>/damage|crack|light|shadow|reward|loot/i.test(k)),
  rendererKeys:Object.keys(s.worldRenderer).filter(k=>/amage|rack|ayer|acade/i.test(k)),saveBlocked:s._saveWritesBlocked,
  width:s.scale.width,height:s.scale.height};
});
await fs.writeFile(out+"hp-before.json",JSON.stringify(baseline,null,2));
console.log(JSON.stringify(baseline,null,2));
await p.screenshot({path:out+"02-mining-current.jpg",quality:65});
await p.screenshot({path:out+"03-hp-before.png",clip:{x:0,y:0,width:750,height:160}});
await p.mouse.down();await p.waitForTimeout(900);await p.mouse.up();
await p.screenshot({path:out+"04-mining-hit.jpg",quality:65});
process.exit(0);
