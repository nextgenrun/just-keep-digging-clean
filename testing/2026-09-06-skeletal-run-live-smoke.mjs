import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const { chromium }=require("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const output="testing/2026-09-06-running-proof";
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",headless:true,args:["--autoplay-policy=no-user-gesture-required","--disable-background-timer-throttling"]});
const context=await browser.newContext({viewport:{width:1280,height:720}});
const page=await context.newPage();
const errors=[];
page.on("pageerror",error=>{errors.push(error.message);console.log("PAGEERROR",error.message)});
page.on("console",msg=>{if(msg.type()==="error" || msg.text().includes("SkeletalRun")) console.log(msg.type(),msg.text())});
const read=()=>page.evaluate(()=>{
 const s=window.__phaserGame?.scene?.getScene("PlayScene");
 return {scenes:window.__phaserGame?.scene?.getScenes(true).map(x=>x.scene.key),state:s?.gameState,
 ready:s?.playerSkeletalRun?.ready,meshError:s?.playerSkeletalRun?.error,active:s?.playerSkeletalRun?.active,
 pose:s?.player?.anims?.currentAnim?.key,profile:s?.playerAssetProfile?.characterId,
 x:s?.player?.x,y:s?.player?.y,vx:s?.playerController?.physicsBody?.vx,
 running:s?.playerController?.isRunning(),grounded:s?.playerController?.isGrounded(),
 frames:s?.playerSkeletalRun?.mesh?.framesRendered,dashes:s?.playerRunDashFx?.live?.length,
 gp:s?.playerController?.abilities?.getGemPowerExact?.()};
});
try{
 await page.goto("http://127.0.0.1:8080/?jkd_e2e=1&cinematics=0&character=survivalUal",{waitUntil:"domcontentloaded",timeout:60000});
 await page.waitForFunction(()=>window.__phaserGame?.scene?.isActive("MainMenuScene") || window.__phaserGame?.scene?.isActive("StartMenuScene"),null,{timeout:120000});
 console.log("MENU",JSON.stringify(await read()));
 if(await page.evaluate(()=>window.__phaserGame.scene.isActive("MainMenuScene")))await page.keyboard.press("Enter");
 await page.waitForFunction(()=>window.__phaserGame?.scene?.isActive("StartMenuScene"));
 await page.keyboard.press("1");await page.keyboard.press("Space");
 await page.waitForFunction(()=>window.__phaserGame?.scene.getScene("StartMenuScene")?._newRunSetup?.isVisible);
 await page.waitForTimeout(100);await page.keyboard.press("ArrowLeft");
 await page.keyboard.press("ArrowDown");await page.keyboard.press("ArrowRight");await page.keyboard.type("YES");await page.keyboard.press("Enter");
 await page.waitForFunction(()=>window.__phaserGame?.scene?.isActive("PlayScene") && window.__jkdE2E,null,{timeout:120000});
 await page.waitForFunction(()=>!window.__phaserGame.scene.getScene("PlayScene")._teleportInAnimating,null,{timeout:60000});
 const load=await page.evaluate(async()=>{const s=window.__phaserGame.scene.getScene("PlayScene");return await s.playerSkeletalRun.readyPromise;});
 console.log("SKELETAL_READY",load,JSON.stringify(await read()));
 await page.screenshot({path:output+"/idle.png"});
 await page.keyboard.down("d");await page.waitForTimeout(450);
 console.log("WALK",JSON.stringify(await read()));
 await page.screenshot({path:output+"/walk.png"});
 await page.evaluate(()=>{
 const stream=window.__phaserGame.canvas.captureStream(30);
 const recorder=new MediaRecorder(stream,{mimeType:"video/webm;codecs=vp9",videoBitsPerSecond:3500000});
 const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
 window.__runVideo={recorder,stream,chunks};recorder.start();
 });
 await page.keyboard.down("Control");await page.waitForTimeout(1000);
 const running=await read();console.log("RUN",JSON.stringify(running));
 await page.screenshot({path:output+"/run-right.png"});
 await page.keyboard.up("d");await page.keyboard.down("a");await page.waitForTimeout(600);
 console.log("LEFT",JSON.stringify(await read()));await page.screenshot({path:output+"/run-left.png"});
 await page.keyboard.up("a");await page.keyboard.up("Control");await page.waitForTimeout(300);
 const movie=await page.evaluate(()=>new Promise(resolve=>{
 const capture=window.__runVideo;
 capture.recorder.onstop=async()=>{capture.stream.getTracks().forEach(t=>t.stop());resolve(Array.from(new Uint8Array(await new Blob(capture.chunks,{type:"video/webm"}).arrayBuffer())));};
 capture.recorder.stop();
 }));
 await fs.writeFile(output+"/running.webm",Buffer.from(movie));
 console.log("STOP",JSON.stringify(await read()));
 assert.equal(running.vx,336);assert.ok(running.dashes>0);
 await page.keyboard.down("Control");await page.keyboard.down("d");await page.keyboard.press("Space");await page.waitForTimeout(180);
 const jumping=await read();console.log("JUMP",JSON.stringify(jumping));assert.equal(jumping.active,false);
 await page.keyboard.up("d");await page.keyboard.up("Control");
 await page.waitForFunction(()=>window.__phaserGame.scene.getScene("PlayScene").playerController.isGrounded(),null,{timeout:12000});
 await page.emulateMedia({reducedMotion:"reduce"});
 await page.keyboard.down("Control");await page.keyboard.down("d");await page.waitForTimeout(550);
 const reduced=await read();console.log("REDUCED_MOTION",JSON.stringify(reduced));assert.equal(reduced.dashes,0);assert.ok(reduced.active);
 await page.keyboard.up("d");await page.keyboard.up("Control");await page.emulateMedia({reducedMotion:"no-preference"});
 await page.waitForTimeout(300);
 await page.evaluate(()=>{const s=window.__phaserGame.scene.getScene("PlayScene");s.playerController.abilities.setGemPowerExact(0,{silent:true});});
 await page.keyboard.down("Control");await page.keyboard.down("d");await page.waitForTimeout(350);
 const empty=await read();console.log("EMPTY_GP",JSON.stringify(empty));assert.equal(empty.running,false);assert.equal(empty.active,false);assert.equal(empty.vx,160);
 await page.keyboard.up("d");await page.keyboard.up("Control");await page.waitForTimeout(250);
 await page.evaluate(()=>window.__phaserGame.scene.getScene("PlayScene").playerController.abilities.setGemPowerExact(100,{silent:true}));
 const caveStarted=await page.evaluate(()=>{
   const s=window.__phaserGame.scene.getScene("PlayScene");
   const zone=s.worldModel.caveZones.find(z=>z.entry);
   if(!zone)return false;
   s.caveEntryController.enter(zone,zone.entry);return true;
 });
 console.log("CAVE_START_EXISTING_ZONE_FIXTURE",caveStarted);
 let cave=null;
 if(caveStarted){
   await page.waitForFunction(()=>window.__phaserGame.scene.isActive("CaveScene") && window.__phaserGame.scene.getScene("CaveScene").playerController,null,{timeout:60000});
   await page.evaluate(()=>window.__phaserGame.scene.getScene("CaveScene").playerSkeletalRun.readyPromise);
   await page.waitForFunction(()=>window.__phaserGame.scene.getScene("CaveScene").playerController.isGrounded());
   await page.keyboard.down("d");await page.keyboard.down("Control");
   await page.waitForFunction(()=>window.__phaserGame.scene.getScene("CaveScene").playerSkeletalRun.active,null,{timeout:8000});
   cave=await page.evaluate(()=>{const s=window.__phaserGame.scene.getScene("CaveScene");return {ready:s.playerSkeletalRun.ready,active:s.playerSkeletalRun.active,vx:s.playerController.physicsBody.vx,pose:s.player.anims.currentAnim.key,dashes:s.playerRunDashFx.live.length,frames:s.playerSkeletalRun.mesh.framesRendered};});
   console.log("CAVE_RUN",JSON.stringify(cave));await page.screenshot({path:output+"/cave-run.png"});
   assert.ok(cave.active);assert.equal(cave.vx,336);
   await page.keyboard.up("d");await page.keyboard.up("Control");
   const cleanup=await page.evaluate(()=>{
     const s=window.__phaserGame.scene.getScene("CaveScene");const owner=s.playerSkeletalRun;
     window.__runCleanupProof=owner;s._returnToWorld();return true;
   });
   await page.waitForFunction(()=>window.__phaserGame.scene.isActive("PlayScene"));
   await page.waitForTimeout(200);
   assert.ok(await page.evaluate(()=>window.__runCleanupProof.destroyed));
   console.log("CAVE_CLEANUP",cleanup);
 }
 await fs.writeFile(output+"/result.json",JSON.stringify({running,jumping,reduced,empty,cave,errors},null,2));
 if(!running.active || !running.frames || running.vx<300)throw new Error("Live running did not activate at the requested speed");
}catch(error){
 console.log("FAIL",error.stack,JSON.stringify(await read().catch(()=>null)));
 await page.screenshot({path:output+"/failure.png"}).catch(()=>{});
 process.exitCode=1;
}finally{await browser.close();}

