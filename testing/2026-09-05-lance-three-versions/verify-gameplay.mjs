import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { STELLAR_LANCE_PRESENTATION as C } from "../../values/stellarLancePresentation.js";
const {chromium}=createRequire(import.meta.url)("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const out=path.dirname(fileURLToPath(import.meta.url)),errors=[],logs=[];
const browser=await chromium.launch({headless:true,executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",args:["--enable-webgl","--enable-unsafe-swiftshader","--use-angle=swiftshader"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
page.on("pageerror",e=>{errors.push(e.stack||e.message);console.log("PAGE ERROR: "+e.message);});
page.on("console",m=>{if(m.type()==="error")logs.push(m.text());});
const result={errors,consoleErrors:logs};
try {
 await page.goto("http://127.0.0.1:8080/testing/2026-09-05-celestial-presentation/gameplay.html?jkd_e2e=1&collisionReview=1&cinematics=0",{waitUntil:"commit",timeout:30000});
 await page.waitForFunction(()=>window.__phaserGame?.scene?.getScenes(true).some(s=>["MainMenuScene","StartMenuScene"].includes(s.scene.key)),null,{timeout:120000});
 await page.evaluate(()=>{ const menu=__phaserGame.scene.getScenes(true).find(s=>["MainMenuScene","StartMenuScene"].includes(s.scene.key)); menu.scene.start("WorldLoadScene",{saveSlot:1,worldIdentity:"lance-contact-2026-09-05",isNewSave:true,tutorialChoice:"no"}); });
 await page.waitForFunction(()=>window.__jkdE2E&&__phaserGame.scene.isActive("PlayScene")&&__phaserGame.scene.getScene("PlayScene").celestialEngineController,null,{timeout:180000});
 console.log("Live PlayScene ready");
 await page.keyboard.press("F1");
 await page.evaluate(()=>__jkdE2E.closeAll());
 await page.evaluate(async()=>{
  const {captureDigImpactPose,resolveDigImpactContact}=await import("/systems/visual/digImpactContact.js");
  const scene=__phaserGame.scene.getScene("PlayScene");
  window.__lanceContactProof={shots:[],samples:[],pauseNext:true};
  let seen=0;
  scene.events.on("postupdate",()=>{
   const effect=scene.celestialEngineController.activeEffect;
   if(!effect?.launchHistory)return;
   const proof=window.__lanceContactProof,latest=effect.launchHistory.at(-1);
   if(latest&&latest.shot!==seen){
    seen=latest.shot;
    const pose=captureDigImpactPose(scene.player,latest.contactEvent);
    const projectile=[...effect.projectiles].at(-1);
    const contact=resolveDigImpactContact({pose,body:scene.playerController.physicsBody,
      targetTile:scene.inputHandler.resolveMiningInputState().targetTile||{tx:0,ty:0},tileSize:scene.config.tileSize});
    proof.shots.push({launch:latest,frame:scene.game.loop.frame,pose,
      rawPoint:contact?.rawPoint,authored:contact?.authored,
      body:projectile?{x:projectile.x,y:projectile.y,w:projectile.displayWidth,h:projectile.displayHeight,
        originX:projectile.originX,bounds:projectile.getBounds(),alpha:projectile.alpha}:null});
    if(proof.pauseNext){proof.pauseNext=false;scene.scene.pause();}
   }
   for(const p of effect.projectiles)proof.samples.push({at:scene.time.now,shot:seen,x:p.x,y:p.y,w:p.displayWidth,h:p.displayHeight,alpha:p.alpha});
  });
 });
 await page.evaluate(async()=>{
  const scene=__phaserGame.scene.getScene("PlayScene");
  await scene.playerDeferredAnimationAssetController?.ensureForAnimation?.("survival-mixamo-v3-complex-dig-jab-anim");
 });
 result.activation=await page.evaluate(()=>{
  const scene=__phaserGame.scene.getScene("PlayScene");
  const activation=scene.celestialEngineController._activateTemporaryEngine("comet-engine",scene.time.now);
  return {activation,fixture:"existing temporary-ability activation",saveWritesBlocked:scene._saveWritesBlocked,
   god:scene.upgradeSystem.godModeActive,player:{x:scene.player.x,y:scene.player.y}};
 });
 assert.equal(result.activation.saveWritesBlocked,true);
 assert.equal(result.activation.activation.ok,true);
 await page.keyboard.down("f");
 await page.waitForFunction(()=>__lanceContactProof.shots.length>0,null,{timeout:30000});
 await page.keyboard.up("f");
 await page.screenshot({path:path.join(out,"lance-gameplay-first-contact.png")});
 console.log("Live attack released; first contact captured");
 await page.evaluate(()=>{__phaserGame.scene.getScene("PlayScene").scene.resume();});
 await page.keyboard.down("f");
 await page.waitForTimeout(6500);
 await page.keyboard.up("f");
 result.proof=await page.evaluate(()=>__lanceContactProof);
 assert.ok(result.proof.shots.length>=1,"at least one real keyboard strike must launch");
 for(const shot of result.proof.shots){
  assert.equal(shot.launch.originSource,"authored-hand-foot");
  assert.equal(shot.authored,true);
  assert.equal(shot.frame,shot.launch.releaseFrame);
  const lift=shot.pose.height*shot.pose.scaleY*C.contactTopLiftFraction;
  const x=shot.rawPoint.x+Math.sin(shot.pose.rotation)*lift;
  const y=shot.rawPoint.y-Math.cos(shot.pose.rotation)*lift;
  assert.ok(Math.hypot(shot.launch.origin.x-x,shot.launch.origin.y-y)<1e-6);
  assert.equal(shot.body?.originX,.02,"the rendered flame begins at the fist and extends outward");
  assert.equal(shot.launch.contactPose.contactFrame,shot.pose.contactFrame);
  assert.equal(shot.pose.visibleFrame,shot.pose.contactFrame,"launch must use the visible impact frame");
 }
 assert.ok(result.proof.samples.every(p=>p.w===64&&p.h===28&&p.alpha===1));
 await page.screenshot({path:path.join(out,"lance-gameplay-after-attacks.png")});
 result.status="PASS";
 console.log("LANCE_GAMEPLAY_CONTACT_PASS: "+result.proof.shots.length+" real keyboard contact releases");
} catch(e) {
 result.failure=e.stack;process.exitCode=1;
 result.state=await page.evaluate(()=>({scenes:window.__phaserGame?.scene?.getScenes(true).map(s=>s.scene.key),proof:window.__lanceContactProof,player:(()=>{const s=window.__phaserGame?.scene?.getScene("PlayScene");return {frame:s?.player?.frame?.name,animation:s?.player?.anims?.currentAnim?.key,pending:s?.celestialEngineController?.lanceContactPresenter?.pending?.length,isDigAnimating:s?.isDigAnimating};})()})).catch(()=>null);
 await page.screenshot({path:path.join(out,"lance-gameplay-failure.png")}).catch(()=>{});
 console.error(JSON.stringify({failure:e.message,errors,activation:result.activation,state:result.state?.scenes}));
} finally {
 fs.writeFileSync(path.join(out,"gameplay-contact-proof.json"),JSON.stringify(result,null,2));
 await browser.close();
}

