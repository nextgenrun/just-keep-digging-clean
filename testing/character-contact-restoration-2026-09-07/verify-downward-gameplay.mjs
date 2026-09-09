import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const baseline = process.argv.includes("--baseline");
const output = "testing/character-contact-restoration-2026-09-07/live-downward";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => { errors.push(error.message); console.log("PAGEERROR", error.message); });
page.on("console", msg => { if (["error","warning"].includes(msg.type())) console.log("BROWSER", msg.type(), msg.text()); });
page.on("requestfailed", req => console.log("REQUEST_FAILED",req.url(),req.failure()?.errorText));
const results = { baseline, errors, cases: [] };
async function stage(sceneKey) {
  return await page.evaluate(async key => {
    const s = window.__phaserGame.scene.getScene(key);
    const p = s.playerController;
    const world = s.worldModel || s.controller?.worldModel;
    if (window.__phaserGame.scene.getScene("PlayScene")._saveWritesBlocked !== true) throw new Error("Requires saves off");
    const { TILE_TYPES } = await import("/values/tileTypes.js");
    const tx = key === "PlayScene" ? Math.floor(p.physicsBody.x / s.config.tileSize) : 5;
    const ty = key === "PlayScene" ? s.config.topAirRows + 10 : 5;
    for (let x = tx - 2; x <= tx + 2; x++) {
      for (let y = ty - 3; y <= ty; y++) {
        world.setTile(x, y, TILE_TYPES.AIR, 0);
        s.worldRenderer?.applyTileUpdate(x, y);
      }
      world.setTile(x, ty + 1, TILE_TYPES.STONE, 100000);
      s.worldRenderer?.applyTileUpdate(x, ty + 1);
    }
    p.teleportToTile(tx, ty);
    s.worldRenderer?.invalidate?.();
    const loader = s.playerDeferredAnimationAssetController
      || window.__phaserGame.scene.getScene("PlayScene").playerDeferredAnimationAssetController;
    await loader.ensureForAnimation(s.playerAssetProfile.downwardDigPrewarmAnimationKey);
    return { tx, ty, cooldown: s.digSystem?.getEffectiveCooldownMs(p.abilities),
      variants: s.playerAssetProfile.digDownHitAnims, body: { x:p.physicsBody.x,y:p.physicsBody.y } };
  }, sceneKey);
}
async function capture(sceneKey, name, seconds = 7) {
  await page.evaluate(key => {
    const s = window.__phaserGame.scene.getScene(key);
    const trace = { frames: [], contacts: [] };
    const sample = () => {
      const p = s.playerController, a = s.player.anims;
      trace.frames.push({ t: s.time.now, key: a.currentAnim?.key, frame: a.currentFrame?.textureFrame,
        playing: a.isPlaying, down: p.getVerticalAim().down, aim: p.getAimLabel(),
        crouch: p.requiresCrouchVisual(), grounded: p.isGrounded(), vx:p.physicsBody.vx,
        lastMine: s.digSystem?.lastMineTime, hp: s.worldModel?.getTile?.(window.__downFixture.tx,window.__downFixture.ty+1)?.hp });
    };
    const contact = e => trace.contacts.push({ t:s.time.now, key:e.animationKey,
      frame:e.contactFrame,visibleFrame:e.visibleFrame, authored:e.authored, index:e.contactIndex });
    s.events.on("postupdate", sample); s.events.on("dig-impact-presented", contact);
    const stream = window.__phaserGame.canvas.captureStream(30);
    const recorder = new MediaRecorder(stream,{mimeType:"video/webm;codecs=vp9",videoBitsPerSecond:3000000});
    const chunks=[]; recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)}; recorder.start();
    window.__downTrace = {s,sample,contact,trace,recorder,stream,chunks};
  }, sceneKey);
  await page.keyboard.down("s"); await page.keyboard.down("f");
  await page.waitForTimeout(seconds * 1000);
  await page.screenshot({ path: output + "/" + name + ".png" });
  await page.keyboard.up("f");
  await page.waitForTimeout(1800);
  const afterMining = await page.evaluate(key => {
    const s=window.__phaserGame.scene.getScene(key);
    return {key:s.player.anims.currentAnim?.key, playing:s.player.anims.isPlaying};
  },sceneKey);
  await page.keyboard.up("s"); await page.waitForTimeout(450);
  const stopped = await page.evaluate(key => {
    const s=window.__phaserGame.scene.getScene(key);
    return {key:s.player.anims.currentAnim?.key, crouch:s.playerController.requiresCrouchVisual()};
  },sceneKey);
  const data = await page.evaluate(() => new Promise(resolve => {
    const c=window.__downTrace;
    c.s.events.off("postupdate",c.sample); c.s.events.off("dig-impact-presented",c.contact);
    c.recorder.onstop=async()=>{
      c.stream.getTracks().forEach(t=>t.stop());
      resolve({trace:c.trace,movie:Array.from(new Uint8Array(await new Blob(c.chunks,{type:"video/webm"}).arrayBuffer()))});
    }; c.recorder.stop();
  }));
  await fs.writeFile(output+"/"+name+".webm",Buffer.from(data.movie));
  const contacts = data.trace.contacts;
  const first = contacts[0]?.t, last=contacts.at(-1)?.t;
  const between = data.trace.frames.filter(f=>f.t>=first && f.t<=last);
  const crouches = between.filter(f=>/crouch/.test(f.key));
  const holds = between.filter(f=>!f.playing && !/crouch/.test(f.key));
  const transitions = between.filter((f,i)=>!i||f.key!==between[i-1].key).map(f=>({t:f.t,key:f.key}));
  const result = {name,contacts,crouchFrames:crouches.length,holdFrames:holds.length,transitions,afterMining,stopped};
  console.log("CASE",JSON.stringify(result));
  results.cases.push(result);
  await fs.writeFile(output+"/"+name+"-trace.json",JSON.stringify(data.trace,null,2));
  if (!baseline) {
    assert.ok(contacts.every(c=>c.authored), "All downward impacts use the rendered extremity");
    assert.ok(contacts.length>=4,"Repeated real input must produce at least four contacts");
    assert.equal(crouches.length,0,"No crouch may interrupt the cooldown pose between hits");
    assert.ok(holds.length>8,"Slow mining must visibly hold the finished action");
    assert.ok(contacts.every(c=>!c.key.includes("leg-sweep")),"Rejected step must never play");
    assert.ok(contacts.some(c=>c.key.includes("body-low")),"Accepted low downward punch must play");
    assert.match(afterMining.key,/crouch/,"Holding only S returns to crouch");
    assert.equal(stopped.crouch,false,"Releasing S clears crouch");
  }
}
try {
  await page.goto("http://127.0.0.1:8197/?jkd_e2e=1&cinematics=0&character=survivalUal",{waitUntil:"commit",timeout:60000});
  await page.waitForFunction(()=>window.__phaserGame?.scene?.isActive("MainMenuScene")||window.__phaserGame?.scene?.isActive("StartMenuScene"),null,{timeout:180000});
  if(await page.evaluate(()=>window.__phaserGame.scene.isActive("MainMenuScene")))await page.keyboard.press("Enter");
  await page.waitForFunction(()=>window.__phaserGame?.scene?.isActive("StartMenuScene"));
  await page.keyboard.press("1"); await page.keyboard.press("Space");
  await page.waitForFunction(()=>window.__phaserGame.scene.getScene("StartMenuScene")?._newRunSetup?.isVisible);
  await page.waitForTimeout(100); await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowRight");
  await page.keyboard.type("YES"); await page.keyboard.press("Enter");
  console.log("STARTING_WORLD");
  await page.waitForFunction(()=>window.__phaserGame.scene.isActive("PlayScene")&&window.__jkdE2E,null,{timeout:60000});
  console.log("PLAY_READY");
  await page.waitForFunction(()=>!window.__phaserGame.scene.getScene("PlayScene")._teleportInAnimating,null,{timeout:60000});
  const fixture = await stage("PlayScene");
  await page.waitForFunction(()=>!window.__phaserGame.scene.getScene("PlayScene")._teleportInAnimating,null,{timeout:15000});
  await page.evaluate(f=>{window.__downFixture=f},fixture);
  console.log("FIXTURE",JSON.stringify(fixture));
  await page.waitForFunction(()=>window.__phaserGame.scene.getScene("PlayScene").playerController.isGrounded());
  assert.equal(fixture.cooldown,1500,"Exercise level-one mining without speed buffs");
  await capture("PlayScene",baseline?"before-main-down":"main-down");
  assert.equal(errors.length,0);
} catch(error) {
  console.error(error.stack);
  await page.screenshot({path:output+"/failure.png"}).catch(()=>{});
  process.exitCode=1;
} finally {
  await fs.writeFile(output+"/"+(baseline?"before-result":"result")+".json",JSON.stringify(results,null,2));
  await browser.close();

}
