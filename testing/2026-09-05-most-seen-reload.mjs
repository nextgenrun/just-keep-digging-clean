import fs from "node:fs/promises";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const { chromium }=require("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const browser=await chromium.connectOverCDP("http://127.0.0.1:9337");
const page=browser.contexts()[0].pages()[0];
page.on("pageerror",err=>console.log("ERROR",err.message));
await page.reload({waitUntil:"domcontentloaded"});
await page.waitForFunction(()=>window.__phaserGame?.scene.getScenes(true).some(s=>s.sys.settings.key==="MainMenuScene"),null,{timeout:180000});
await page.evaluate(()=>{
 window.__phaserGame.scene.stop("MainMenuScene");
 window.__phaserGame.scene.start("WorldLoadScene",{saveSlot:1,worldIdentity:"wired-verification-final-20260905",isNewSave:true,tutorialChoice:"no"});
});
await page.waitForFunction(()=>window.__jkdE2E && window.__phaserGame.scene.getScene("PlayScene")._sceneSetupReady,null,{timeout:240000});
await page.waitForTimeout(3500);
console.log("FRESH_READY");
process.exit(0);
