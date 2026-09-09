import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
const {chromium}=createRequire(import.meta.url)("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const out=fileURLToPath(new URL("./",import.meta.url)),result={errors:[],jumps:[]};
const browser=await chromium.launch({headless:true,executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
page.on("pageerror",e=>result.errors.push(e.message));
page.on("console",m=>{if(m.type()==="error")console.log("BROWSER_ERROR",m.text().slice(0,260))});
page.on("requestfailed",r=>console.log("REQUEST_FAILED",r.url(),r.failure()?.errorText));
async function recordStart() {await page.evaluate(()=>{
 const stream=__phaserGame.canvas.captureStream(30),chunks=[],recorder=new MediaRecorder(stream,{mimeType:"video/webm;codecs=vp9",videoBitsPerSecond:8000000});
 recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};window.__contactVideo={stream,chunks,recorder};recorder.start();
});}
async function recordStop(name) {const bytes=await page.evaluate(()=>new Promise(resolve=>{
 const v=__contactVideo;v.recorder.onstop=async()=>{v.stream.getTracks().forEach(t=>t.stop());resolve(Array.from(new Uint8Array(await new Blob(v.chunks).arrayBuffer())))};v.recorder.stop();
}));await fs.writeFile(out+name+".webm",Buffer.from(bytes));}
async function settled() {await page.waitForFunction(()=>{const s=__phaserGame.scene.getScene("PlayScene");return s.playerController.isGrounded()&&!s._teleportInAnimating;},null,{timeout:15000});}
try {
 await page.goto("http://127.0.0.1:8197/?jkd_e2e=1&cinematics=0",{waitUntil:"commit",timeout:60000});
 await page.waitForFunction(()=>window.__phaserGame?.scene.isActive("MainMenuScene"),null,{timeout:180000});
 await page.evaluate(()=>__phaserGame.scene.getScene("MainMenuScene").scene.start("WorldLoadScene",{saveSlot:3,worldIdentity:"contact-grounding-20260907",isNewSave:true,tutorialChoice:"no"}));
 await page.waitForFunction(()=>window.__jkdE2E&&__phaserGame.scene.getScene("PlayScene")?.groundFootstepFxSystem,null,{timeout:180000});
 await page.evaluate(()=>__jkdE2E.closeAll());
 result.fixture=await page.evaluate(async()=>{
  const s=__phaserGame.scene.getScene("PlayScene"),p=s.playerController,w=s.worldModel;
  if(s._saveWritesBlocked!==true)throw Error("Save writes must be disabled");
  const {TILE_TYPES:T}=await import("/values/tileTypes.js"),ty=s.config.topAirRows+8;
  const families=[T.DIRT,T.STONE,T.COPPER,T.MAGMA_CRYSTAL];
  for(let x=3;x<=28;x++){
   for(let y=ty-4;y<=ty;y++){w.setTile(x,y,T.AIR,0);s.worldRenderer.applyTileUpdate(x,y);}
   const type=families[Math.max(0,Math.min(3,Math.floor((x-8)/2)))];w.setTile(x,ty+1,type,1000000);s.worldRenderer.applyTileUpdate(x,ty+1);
  }
  s.dayNightCycle.currentTime=.37;s.dayNightCycle.dayDuration=1e12;s.weatherSystem.forceWeather("clear",0,600000);
  p.teleportToTile(12,ty);p.abilities.setGemPowerExact(100);
  const q=window.__groundProof={ty,mode:"setup",frames:[],feet:[],captured:[]};
  s.events.on("postupdate",()=>{
   const b=p.physicsBody,a=s.player.anims,anchor=b.getVisualAnchor();
   q.frames.push({mode:q.mode,t:s.time.now,x:anchor.x,y:anchor.y,vx:b.vx,vy:b.vy,grounded:p.isGrounded(),pose:a.currentAnim?.key,frame:s.player.frame.name,expected:a.currentFrame?.textureFrame,width:s.player.frame.realWidth,
    bodyOverlap:p.collisionSystem.isBodyOverlappingSolid(b),spriteX:s.player.x,spriteY:s.player.y,braking:p.jumpMotion.landingSpeedPxPerSec});
  });
  s.events.on("ground-footstep-presented",e=>{
   const b=p.physicsBody;q.feet.push({...e,mode:q.mode,grounded:p.isGrounded(),floor:b.y+b.h,visible:s.player.frame.name,
    art:[...s.groundFootstepFxSystem.activeObjects].map(i=>({frame:i.frame.name,x:i.x,y:i.y,alpha:i.alpha,width:i.displayWidth,height:i.displayHeight}))});
   if(q.mode==="surfaces"&&!q.captured.includes(e.family)){q.captured.push(e.family);q.pauseFamily=e.family;}
  });
  return {savesBlocked:s._saveWritesBlocked,ty};
 });
 await settled();console.log("TRAVERSAL_GAME_READY");
 await recordStart();
 for(const direction of ["right","left"]) {
  await page.evaluate(direction=>{const s=__phaserGame.scene.getScene("PlayScene");s.playerController.teleportToTile(direction==="right"?12:18,__groundProof.ty);__groundProof.mode="setup";},direction);await settled();
  const key=direction==="right"?"d":"a",sign=direction==="right"?1:-1;
  await page.evaluate(direction=>__groundProof.mode="jump-"+direction,direction);
  await page.keyboard.down(key);await page.keyboard.down("Control");
  await page.waitForFunction(sign=>__phaserGame.scene.getScene("PlayScene").playerController.physicsBody.vx*sign>330,sign);
  await page.keyboard.press("Space");
  await page.waitForFunction(()=>!__phaserGame.scene.getScene("PlayScene").playerController.isGrounded());
  await page.waitForTimeout(150);
  const carried=await page.evaluate(()=>__phaserGame.scene.getScene("PlayScene").playerController.physicsBody.vx);assert.ok(Math.abs(carried)>330,"held airborne movement preserves run speed");
  await page.keyboard.up(key);await page.keyboard.up("Control");
  await page.waitForFunction(()=>__phaserGame.scene.getScene("PlayScene").playerController.isGrounded());
  await page.waitForFunction(()=>__phaserGame.scene.getScene("PlayScene").playerController.physicsBody.vx===0);
  await page.waitForTimeout(250);
  const frames=await page.evaluate(direction=>__groundProof.frames.filter(f=>f.mode==="jump-"+direction),direction);
  const air=frames.filter(f=>!f.grounded),landIndex=frames.findIndex((f,i)=>f.grounded&&i>0&&!frames[i-1].grounded),landing=frames[landIndex];
  const stopped=frames.slice(landIndex).find(f=>f.vx===0);
  assert.ok(air.length>8);assert.ok(Math.abs(landing.vx)>280);assert.ok(Math.abs(stopped.x-landing.x)>20&&Math.abs(stopped.x-landing.x)<48);
  assert.ok(frames.every(f=>!f.bodyOverlap&&f.width===512&&String(f.frame)===String(f.expected)));
  assert.ok(stopped.t-landing.t>190&&stopped.t-landing.t<350);
  result.jumps.push({direction,carried,airFrames:air.length,landingSpeed:landing.vx,slide:Math.abs(stopped.x-landing.x),brakeMs:stopped.t-landing.t,frames});
  console.log("LIVE_JUMP_CARRY_BRAKE_OK",direction,Math.abs(stopped.x-landing.x).toFixed(1),"px");
 }
 await recordStop("jump-momentum-and-braking");
 await page.evaluate(()=>{const s=__phaserGame.scene.getScene("PlayScene");s.playerController.teleportToTile(8,__groundProof.ty);__groundProof.mode="setup";});await settled();
 await page.evaluate(()=>__groundProof.mode="surfaces");await recordStart();await page.keyboard.down("d");
 for(let i=0;i<4;i++){
  await page.waitForFunction(i=>__groundProof.captured.length>i,i,{timeout:12000});
  const family=await page.evaluate(()=>__groundProof.pauseFamily);await page.screenshot({path:out+"surface-"+family+".png"});

 }
 await page.keyboard.up("d");await page.waitForTimeout(400);await recordStop("material-footsteps");
 result.feet=await page.evaluate(()=>__groundProof.feet.filter(f=>f.mode==="surfaces"));
 assert.deepEqual([...new Set(result.feet.map(f=>f.family))],["dirt","hard","copper","magma"]);
 assert.ok(result.feet.every(f=>f.grounded&&Math.abs(f.y-f.floor)<.01&&String(f.frame)===String(f.visible)&&f.liveParticles>0));
 result.status="PASS";assert.deepEqual(result.errors,[]);console.log("LIVE_SURFACE_FOOTSTEPS_OK",result.feet.length);
} catch(e){result.failure=e.stack;process.exitCode=1;await page.screenshot({path:out+"traversal-failure.png"}).catch(()=>{});console.error(e.message);} finally {
 result.trace=await page.evaluate(()=>window.__groundProof).catch(()=>null);await fs.writeFile(out+"traversal-gameplay.json",JSON.stringify(result,null,2));await browser.close();
}
