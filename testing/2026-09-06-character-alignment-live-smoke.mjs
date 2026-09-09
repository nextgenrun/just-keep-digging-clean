import fs from "node:fs/promises";
import { openSync, closeSync } from "node:fs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const output = process.env.CHARACTER_ALIGNMENT_OUTPUT || "testing/character-definition-v2-export/live-final";
await fs.mkdir(output,{recursive:true});
const serverLog = openSync(output+"/server.log","w");
const server = spawn("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe",
  ["-u","-c","import runpy,sys,webbrowser; webbrowser.open=lambda *a,**k: False; sys.argv=['serve.py','8098']; runpy.run_path('serve.py',run_name='__main__')"],
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
  const s=window.__phaserGame.scene.getScene(sceneKey),p=s.playerController,b=p.physicsBody,c=s.player;
  return {scene:sceneKey,overlay:!!s.playerSkeletalRun,x:c.x,y:c.y,vx:b.vx,vy:b.vy,
    running:p.isRunning(),grounded:p.isGrounded(),pose:c.anims.currentAnim?.key,
    sheet:c.texture.key,frame:c.frame.name,width:c.frame.realWidth,height:c.frame.realHeight,
    displayWidth:c.displayWidth,displayHeight:c.displayHeight,originX:c.originX,originY:c.originY,
    offsetX:c.x-b.x-b.w/2,offsetY:c.y-b.y-b.h,dashes:s.playerRunDashFx.live.length,flip:c.flipX};
},key);
async function waitForGait(key,speed) {
  await page.waitForFunction(({key,speed})=>{
    const s=window.__phaserGame.scene.getScene(key);
    return Math.abs(s.playerController.physicsBody.vx-speed)<0.01;
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
  await page.waitForFunction(key=>window.__phaserGame.scene.getScene(key).playerController.isGrounded(),key);
  await page.evaluate(key=>{
    const s=window.__phaserGame.scene.getScene(key);s.__alignmentSamples=[];
    s.events.on('postupdate',()=>{
      const c=s.player,b=s.playerController.physicsBody;
      if(s.__alignmentSamples.length<3000)s.__alignmentSamples.push({pose:c.anims.currentAnim?.key,
        frame:String(c.frame.name),expected:String(c.anims.currentFrame?.textureFrame),sheet:c.texture.key,sourceSize:c.frame.realWidth,
        displayWidth:c.displayWidth,displayHeight:c.displayHeight,originX:c.originX,originY:c.originY,
        offsetX:c.x-b.x-b.w/2,offsetY:c.y-b.y-b.h,overlay:!!s.playerSkeletalRun});
    });
  },key);
  await recordStart();
  const idle=await read(key);
  await page.keyboard.down('d');await waitForGait(key,160);await page.waitForTimeout(650);
  const right=await read(key);assert.equal(right.overlay,false);assert.equal(right.dashes,0);
  await page.screenshot({path:output+'/'+name+'-walk.png'});
  await page.keyboard.down('Control');await waitForGait(key,336);await page.waitForTimeout(550);
  const run=await read(key);assert.equal(run.running,true);assert.ok(run.dashes>0);
  await page.screenshot({path:output+'/'+name+'-run.png'});
  await page.keyboard.up('Control');await page.keyboard.up('d');await page.waitForTimeout(500);
  await page.keyboard.down('a');await waitForGait(key,-160);await page.waitForTimeout(350);
  const left=await read(key);assert.equal(left.flip,true);
  await page.keyboard.down('Control');await waitForGait(key,-336);await page.waitForTimeout(400);
  await page.keyboard.up('Control');await page.keyboard.up('a');await page.waitForTimeout(600);
  const stop=await read(key);assert.equal(stop.overlay,false);assert.equal(stop.vx,0);
  assert.equal(stop.pose,idle.pose);
  const samples=await page.evaluate(key=>window.__phaserGame.scene.getScene(key).__alignmentSamples,key);
  assert.ok(samples.length>30,'Capture actual rendered traversal frames');
  assert.ok(samples.every(s=>!s.overlay && s.frame===s.expected),'No renderer swap or missing texture frame');
  assert.ok(samples.every(s=>Math.abs(s.offsetX)<0.01 && Math.abs(s.offsetY)<0.01),'Sprite stays attached to its collision body');
  for(const pose of new Set(samples.map(s=>s.pose))){
    const sizes=new Set(samples.filter(s=>s.pose===pose).map(s=>[s.displayWidth.toFixed(3),s.displayHeight.toFixed(3),s.originX,s.originY].join(':')));
    assert.equal(sizes.size,1,'Fixed frame size and origin for '+pose);
  }
  await recordStop(name);results.cases.push({name,idle,right,run,left,stop,samples});
  console.log('ALIGNMENT',JSON.stringify({name,frames:samples.length,idle,right,run,left,stop}));
}

try {
  await page.goto("http://127.0.0.1:8098/?jkd_e2e=1&cinematics=0&character=survivalUal",{waitUntil:"domcontentloaded",timeout:60000});
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
  assert.equal(jump.grounded,false);assert.equal(jump.overlay,false);
  results.jump=jump;await page.keyboard.up("d");
  await page.waitForFunction(()=>window.__phaserGame.scene.getScene("PlayScene").playerController.isGrounded());
  await page.keyboard.down('Shift');await page.keyboard.down('w');await page.waitForTimeout(350);
  const flight=await read('PlayScene');
  assert.ok(flight.pose.includes('fly') || flight.pose.includes('flight'));
  assert.equal(flight.overlay,false);assert.ok(flight.vy<0);
  results.flight=flight;
  await page.screenshot({path:output+'/main-flight.png'});
  await page.keyboard.up('w');await page.keyboard.up('Shift');
  await page.waitForFunction(()=>window.__phaserGame.scene.getScene('PlayScene').playerController.isGrounded(),null,{timeout:15000});
  await page.keyboard.down('s');await page.waitForTimeout(450);
  results.crouch=await read('PlayScene');
  assert.ok(results.crouch.pose.includes('duck') || results.crouch.pose.includes('crouch'));
  await page.keyboard.up('s');await page.waitForTimeout(600);
  await page.screenshot({path:output+'/main-restored-idle.png'});
  results.returnIdle=await read('PlayScene');
  const allSamples=await page.evaluate(()=>window.__phaserGame.scene.getScene('PlayScene').__alignmentSamples);
  assert.ok(allSamples.every(s=>!s.overlay && s.frame===s.expected && s.sourceSize===512),'Every movement, landing and crouch frame uses the new appearance');
  results.allSamples=allSamples;
  assert.equal(errors.length,0);
}catch(error){
  console.error(error.stack);process.exitCode=1;
  await page.screenshot({path:output+"/failure.png"}).catch(()=>{});
}finally{
  await fs.writeFile(output+"/result.json",JSON.stringify(results,null,2));
  await browser.close();server.kill();closeSync(serverLog);
}
