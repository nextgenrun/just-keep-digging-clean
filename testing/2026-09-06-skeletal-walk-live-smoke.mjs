import fs from "node:fs/promises";
import { openSync, closeSync } from "node:fs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const output = "testing/2026-09-06-skeletal-walking-proof";
await fs.mkdir(output,{recursive:true});
const serverLog = openSync(output+"/server.log","w");
const server = spawn("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe",
  ["-u","-c","import runpy,sys,webbrowser; webbrowser.open=lambda *a,**k: False; sys.argv=['serve.py','8097']; runpy.run_path('serve.py',run_name='__main__')"],
  {windowsHide:true,stdio:["ignore",serverLog,serverLog]});
const browser = await chromium.launch({
  executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless:true,args:["--autoplay-policy=no-user-gesture-required","--disable-background-timer-throttling"],
});
const context = await browser.newContext({viewport:{width:1280,height:720}});
const page = await context.newPage();
const errors = [];
const results = {errors,cases:[]};
page.on("pageerror",error=>{errors.push(error.message);console.error("PAGEERROR",error.message)});
page.on("console",msg=>{if(msg.type()==="error")console.error("BROWSER",msg.text())});
const read = key => page.evaluate(sceneKey=>{
  const s=window.__phaserGame.scene.getScene(sceneKey),p=s.playerController,m=s.playerSkeletalRun;
  return {scene:sceneKey,active:m.active,ready:m.ready,runPresentation:m.isAnimatingRun(),
    clip:m.mesh.action.getClip().name,rate:m.mesh.action.timeScale,phase:m.mesh.action.time,
    frames:m.mesh.framesRendered,x:s.player.x,y:s.player.y,vx:p.physicsBody.vx,vy:p.physicsBody.vy,
    running:p.isRunning(),grounded:p.isGrounded(),pose:s.player.anims.currentAnim?.key,
    dashes:s.playerRunDashFx.live.length,flip:s.player.flipX};
},key);
async function waitForGait(key,speed) {
  await page.waitForFunction(({key,speed})=>{
    const s=window.__phaserGame.scene.getScene(key);
    return s.playerSkeletalRun.active && Math.abs(s.playerController.physicsBody.vx-speed)<0.01;
  },{key,speed},{timeout:15000});
}
async function recordStart() {
  await page.evaluate(()=>{
    const stream=window.__phaserGame.canvas.captureStream(30);
    const recorder=new MediaRecorder(stream,{mimeType:"video/webm;codecs=vp9",videoBitsPerSecond:3000000});
    const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    window.__walkVideo={stream,recorder,chunks};recorder.start();
  });
}
async function recordStop(name) {
  const data=await page.evaluate(()=>new Promise(resolve=>{
    const c=window.__walkVideo;
    c.recorder.onstop=async()=>{
      c.stream.getTracks().forEach(t=>t.stop());
      resolve(Array.from(new Uint8Array(await new Blob(c.chunks,{type:"video/webm"}).arrayBuffer())));
    };c.recorder.stop();
  }));
  await fs.writeFile(output+"/"+name+".webm",Buffer.from(data));
}
async function exercise(key,name) {
  await page.evaluate(key=>window.__phaserGame.scene.getScene(key).playerSkeletalRun.readyPromise,key);
  await page.waitForFunction(key=>window.__phaserGame.scene.getScene(key).playerController.isGrounded(),key);
  await recordStart();
  await page.keyboard.down("d");await waitForGait(key,160);await page.waitForTimeout(1000);
  const right=await read(key);
  await page.screenshot({path:output+"/"+name+"-right.png"});
  assert.equal(right.active,true);assert.equal(right.vx,160);assert.equal(right.running,false);
  assert.equal(right.dashes,0);assert.equal(right.runPresentation,false);
  assert.equal(right.clip,"Original_Run_Standard_Walk","Walking must use the run motion from the beginning of the task");
  await page.keyboard.up("d");await page.keyboard.down("a");await waitForGait(key,-160);
  await page.waitForTimeout(1000);
  const left=await read(key);
  assert.equal(left.active,true);assert.equal(left.flip,true);
  assert.equal(left.clip,right.clip);assert.ok(left.frames>right.frames);
  await page.screenshot({path:output+"/"+name+"-left.png"});
  await page.keyboard.down("Control");await waitForGait(key,-336);await page.waitForTimeout(400);
  const run=await read(key);
  assert.equal(run.running,true);assert.equal(run.runPresentation,true);assert.ok(run.dashes>0);
  assert.equal(run.clip,"Legacy_Jog_Run","Ctrl running keeps the newer jog");
  assert.notEqual(right.clip,run.clip,"Walking must not replay the legacy jog");
  await page.keyboard.up("Control");await waitForGait(key,-160);await page.waitForTimeout(300);
  const returnWalk=await read(key);
  assert.equal(returnWalk.active,true);assert.equal(returnWalk.running,false);assert.equal(returnWalk.dashes,0);
  assert.equal(returnWalk.clip,"Original_Run_Standard_Walk");
  await page.keyboard.up("a");await page.waitForTimeout(500);
  const stop=await read(key);
  assert.equal(stop.active,false);assert.equal(stop.vx,0);
  await recordStop(name);
  const result={name,right,left,run,returnWalk,stop};results.cases.push(result);
  console.log("GAIT",JSON.stringify(result));
}
try {
  await page.goto("http://127.0.0.1:8097/?jkd_e2e=1&cinematics=0&character=survivalUal",{waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.__phaserGame?.scene?.isActive("MainMenuScene")||window.__phaserGame?.scene?.isActive("StartMenuScene"),null,{timeout:120000});
  if(await page.evaluate(()=>window.__phaserGame.scene.isActive("MainMenuScene")))await page.keyboard.press("Enter");
  await page.waitForFunction(()=>window.__phaserGame.scene.isActive("StartMenuScene"));
  await page.keyboard.press("1");await page.keyboard.press("Space");
  await page.waitForFunction(()=>window.__phaserGame.scene.getScene("StartMenuScene")?._newRunSetup?.isVisible);
  await page.waitForTimeout(100);await page.keyboard.press("ArrowLeft");await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");await page.keyboard.type("YES");await page.keyboard.press("Enter");
  console.log("STARTING_WORLD");
  await page.waitForFunction(()=>window.__phaserGame.scene.isActive("PlayScene")&&window.__jkdE2E,null,{timeout:90000});
  await page.waitForFunction(()=>!window.__phaserGame.scene.getScene("PlayScene")._teleportInAnimating,null,{timeout:60000});
  assert.equal(await page.evaluate(()=>window.__phaserGame.scene.getScene("PlayScene")._saveWritesBlocked),true);
  // Start in the middle of the natural town road for the left/right movement check.
  await page.evaluate(()=>window.__phaserGame.scene.getScene("PlayScene").playerController.teleportToTile(12,64));
  await page.waitForFunction(()=>!window.__phaserGame.scene.getScene("PlayScene")._teleportInAnimating,null,{timeout:15000});
  await exercise("PlayScene","main-walking");
  await page.keyboard.down("d");await waitForGait("PlayScene",160);
  await page.keyboard.press("Space");await page.waitForTimeout(180);
  const jump=await read("PlayScene");
  assert.equal(jump.grounded,false);assert.equal(jump.active,false);
  results.jump=jump;await page.keyboard.up("d");
  await page.waitForFunction(()=>window.__phaserGame.scene.getScene("PlayScene").playerController.isGrounded());
  await page.evaluate(()=>{
    const s=window.__phaserGame.scene.getScene("PlayScene"),zone=s.worldModel.caveZones.find(z=>z.entry);
    if(!zone)throw new Error("No existing cave fixture");
    s.caveEntryController.enter(zone,zone.entry);
  });
  await page.waitForFunction(()=>window.__phaserGame.scene.isActive("CaveScene")&&window.__phaserGame.scene.getScene("CaveScene").playerController,null,{timeout:60000});
  // A save-disabled flat cave pocket gives both directions equal clearance.
  await page.evaluate(async()=>{
    const s=window.__phaserGame.scene.getScene("CaveScene");
    const {TILE_TYPES}=await import("/values/tileTypes.js");
    for(let x=2;x<=12;x++){
      for(let y=2;y<=5;y++){s.worldModel.setTile(x,y,TILE_TYPES.AIR,0);s.worldRenderer.applyTileUpdate(x,y);}
      s.worldModel.setTile(x,6,TILE_TYPES.STONE,1000);s.worldRenderer.applyTileUpdate(x,6);
    }
    s.playerController.teleportToTile(8,5);s.worldRenderer.invalidate?.();
  });
  await exercise("CaveScene","cave-walking");
  assert.equal(errors.length,0);
}catch(error){
  console.error(error.stack);process.exitCode=1;
  await page.screenshot({path:output+"/failure.png"}).catch(()=>{});
}finally{
  await fs.writeFile(output+"/result.json",JSON.stringify(results,null,2));
  await browser.close();server.kill();closeSync(serverLog);
}
