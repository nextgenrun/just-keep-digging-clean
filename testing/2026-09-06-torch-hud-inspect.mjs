import fs from "node:fs/promises";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url),{chromium}=require("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const b=await chromium.connectOverCDP("http://127.0.0.1:9338"),p=b.contexts()[0].pages()[0];
const out="visual-approval-previews/2026-09-06-torch-and-mining-mockups/";
await p.setViewportSize({width:1280,height:720});
await p.waitForTimeout(300);
await p.screenshot({path:out+"torch-before.png",clip:{x:0,y:0,width:550,height:170}});
console.log(JSON.stringify(await p.evaluate(()=>{
 const s=window.__phaserGame.scene.getScene("PlayScene"),h=s.hudSystem,c=h.torchIntensityControl;
 return {saveBlocked:s._saveWritesBlocked,torch:c.getSnapshot(),objects:[c.hit,c.text,c.title,h.approvedSkin.torchBaseFrame,h.approvedSkin.playerFrame].map(o=>({text:o.text,x:o.x,y:o.y,frame:o.frame?.name,texture:o.texture?.key,bounds:o.getBounds()}))};
})));
await p.evaluate(()=>{
 const h=window.__phaserGame.scene.getScene("PlayScene").hudSystem;
 for(const o of [h.torchIntensityControl.text,h.torchIntensityControl.title,h.approvedSkin.torchBaseFrame,h.approvedSkin.torchBurnFrame])o.setVisible(false);
});
await p.screenshot({path:out+"torch-shell-inspection.png",clip:{x:0,y:0,width:550,height:170}});
process.exit(0);