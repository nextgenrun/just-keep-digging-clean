import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import net from "node:net";
const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "testing/2026-09-07-session-awakening-qa");
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
await fs.mkdir(output, { recursive: true });
await fs.writeFile(path.join(output, "readme.md"), "# Session awakening gameplay evidence\n\nThe adjacent live QA script drives the canonical serve.py game in an isolated Chrome context with save writes disabled. Videos capture the actual game canvas and master audio output.\n");
const port = await new Promise(resolve => {
  const probe = net.createServer();
  probe.listen(0, "127.0.0.1", () => { const port = probe.address().port; probe.close(() => resolve(port)); });
});
const origin = "http://127.0.0.1:" + port;
const server = spawn("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe", [
  "-u", "-c", "import sys,runpy,webbrowser; webbrowser.open=lambda *a,**k:False; sys.argv=['serve.py','" + port + "']; runpy.run_path('serve.py',run_name='__main__')",
], { cwd: root, windowsHide: true, stdio: "ignore" });
const evidence = { origin, cases: [], errors: [], consoleErrors: [], failedRequests: [] };
let browser, page;
async function save() { await fs.writeFile(path.join(output, "evidence.json"), JSON.stringify(evidence, null, 2)); }
const snapshot = () => page.evaluate(() => {
  const s = window.__phaserGame.scene.getScene("PlayScene"), a = s.sessionAwakeningController;
  return { ...a?.snapshot(), state: s.gameState, controls: s.playerController?.input.controlsEnabled,
    x: s.playerController?.physicsBody.x, y: s.playerController?.physicsBody.y,
    zoom: s.cameras.main?.zoom, offsetY: s.cameras.main?.followOffset?.y,
    animationRate: s.player?.anims?.timeScale, gameClock: s.time.timeScale,
    tweenClock: s.tweens.timeScale, mix: s.soundSystem?.sessionAwakeningMix ?? null,
    effects: s.cameras.main?.postPipelines?.length ?? null,
    viewPresent: Boolean(a?.view), audioVolume: a?.audio?.voices.map(v => v.sound.volume) || [] };
});
async function launch(variant, options = {}) {
  await page.emulateMedia({ reducedMotion: options.reduced ? "reduce" : "no-preference" });
  await page.evaluate(({ variant, options }) => {
    window.__wakeTrace = [];
    window.__wakeFrames = 0;
    const query = new URLSearchParams({ jkd_e2e: "1", cinematics: "0", awakeningVariant: variant || "" });
    if (options.disabled) query.set("awakening", "0");
    if (options.blur != null) query.set("awakeningBlur", options.blur ? "1" : "0");
    history.replaceState(null, "", "?" + query);
    const game = window.__phaserGame;
    window.__wakePrevious = game.scene.keys.PlayScene?.sessionAwakeningController;
    const current = game.scene.getScenes(true).find(s => ["PlayScene", "MainMenuScene", "StartMenuScene"].includes(s.sys.settings.key));
    current.scene.start("WorldLoadScene", { saveSlot: 3, worldIdentity: "awakening-qa-2026-09-07", isNewSave: true, tutorialChoice: "no" });
  }, { variant, options });
  await page.waitForFunction(() => {
    const s = window.__phaserGame?.scene.getScene("PlayScene");
    return s?.sys.isActive() && s._sceneSetupReady
      && (s.sessionAwakeningController?.started || !s.sessionAwakeningController?.enabled)
      && s.sessionAwakeningController !== window.__wakePrevious;
  }, null, { timeout: 180000 }).catch(async error => {
    if (options.disabled) return;
    throw new Error(error.message + " SNAPSHOT " + JSON.stringify(await snapshot()));
  });
}
async function recordStart() {
  await page.evaluate(() => {
    const game = window.__phaserGame;
    const stream = game.canvas.captureStream(30);
    const manager = game.sound;
    const destination = manager.context.createMediaStreamDestination();
    manager.masterVolumeNode.connect(destination);
    for (const track of destination.stream.getAudioTracks()) stream.addTrack(track);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus", videoBitsPerSecond: 2500000 });
    const chunks = [];
    const done = new Promise(resolve => { recorder.onstop = async () => {
      const bytes = new Uint8Array(await new Blob(chunks, { type: recorder.mimeType }).arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 16384) binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
      resolve(btoa(binary));
    }; });
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    window.__wakeRecording = { recorder, stream, manager, destination, done };
    recorder.start(100);
  });
}
async function recordStop(id) {
  const base64 = await page.evaluate(async () => {
    const r = window.__wakeRecording;
    r.recorder.stop();
    const data = await r.done;
    r.manager.masterVolumeNode.disconnect(r.destination);
    for (const track of r.stream.getTracks()) track.stop();
    window.__wakeRecording = null;
    return data;
  });
  await fs.writeFile(path.join(output, id + ".webm"), Buffer.from(base64, "base64"));
}
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(origin + "/main.js")).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(server.exitCode, null);
  browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true, args: ["--autoplay-policy=no-user-gesture-required"],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  page = await context.newPage();
  page.on("pageerror", error => evidence.errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") evidence.consoleErrors.push(message.text()); });
  page.on("requestfailed", request => { if (!request.failure()?.errorText?.includes("ABORTED")) evidence.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }); });
  await page.addInitScript(() => {
    window.__wakeTrace = []; window.__wakeFrames = 0;
    const poll = () => {
      const s = window.__phaserGame?.scene?.keys?.PlayScene;
      if (s?.sessionAwakeningController?.active) {
        const a = s.sessionAwakeningController;
        window.__wakeTrace.push({ ...a.snapshot(), x: s.playerController?.physicsBody?.x,
          y: s.playerController?.physicsBody?.y, controls: s.playerController?.input?.controlsEnabled,
          zoom: s.cameras.main.zoom, animationRate: s.player?.anims?.timeScale,
          clock: s.time.timeScale, effectCount: s.cameras.main.postPipelines?.length,
          blurApplied: Boolean(a.view?.blur) });
      }
      window.__wakeFrames++;
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  });
  await page.goto(origin + "/?jkd_e2e=1&cinematics=0", { waitUntil: "domcontentloaded", timeout: 60000 });
  console.log("AWAKENING_BROWSER_BOOT", origin);
  await page.waitForFunction(() => window.__phaserGame?.scene.isActive("MainMenuScene"), null, { timeout: 180000 });
  for (const id of ["first-breath", "sleepy-blink", "finding-focus"]) {
    await recordStart();
    await launch(id, { blur: id === "finding-focus" });
    console.log("AWAKENING_STARTED", id, JSON.stringify(await snapshot()));
    await page.waitForFunction(() => window.__phaserGame.scene.getScene("PlayScene").sessionAwakeningController.frame?.progress >= 0.3, null, { timeout: 30000 });
    await page.screenshot({ path: path.join(output, id + "-opening.png") });
    await page.waitForFunction(() => window.__phaserGame.scene.getScene("PlayScene").sessionAwakeningController.frame?.progress >= 0.56, null, { timeout: 30000 });
    await page.screenshot({ path: path.join(output, id + "-reveal.png") });
    await page.waitForFunction(() => !window.__phaserGame.scene.getScene("PlayScene").sessionAwakeningController.active, null, { timeout: 30000 });
    await page.screenshot({ path: path.join(output, id + "-awake.png") });
    await recordStop(id);
    const end = await snapshot();
    const trace = await page.evaluate(() => window.__wakeTrace);
    assert.equal(end.error, null); assert.equal(end.status, "complete");
    assert.equal(end.controls, true); assert(end.animationRate > 0.9 && end.animationRate < 1.5, "normal locomotion cadence resumes");
    assert.equal(end.viewPresent, false); assert.equal(end.mix, null);
    assert.equal(end.effects, 0, "temporary blur pipeline must be removed");
    assert.equal(end.gameClock, 1); assert.equal(end.tweenClock, 1);
    assert.equal(end.variant, id); assert.equal(end.playedAudio.length, 3);
    assert(trace.length > 5);
    const blocked = trace.filter(row => row.blocksGameplay);
    assert(blocked.every(row => row.controls === false && row.clock === 1));
    assert(blocked.some(row => row.animationRate < 0.9), "arrival animation receives its short hold and slowdown");
    assert(Math.max(...blocked.map(row => row.x)) - Math.min(...blocked.map(row => row.x)) < 0.01);
    if (id === "sleepy-blink") assert(trace.some((row, i) => i && row.opening < trace[i - 1].opening - 0.005));
    if (id === "finding-focus") assert(trace.some(row => row.blurApplied && row.blur > 0.3));
    evidence.cases.push({ id, passed: true, end, trace });
    await save();
  }
  await page.evaluate(() => window.__jkdE2E?.closeAll?.());
  const beforeMove = await snapshot();
  await page.keyboard.down("d");
  await page.waitForTimeout(500);
  await page.keyboard.up("d");
  const afterMove = await snapshot();
  assert(afterMove.x > beforeMove.x + 20, "real movement must resume after awakening");
  await page.keyboard.press("Space");
  await page.waitForTimeout(120);
  const jumped = await snapshot();
  assert(jumped.y < afterMove.y - 2, "real jump must work after awakening");
  evidence.cases.push({ id: "real-movement-and-jump", passed: true, beforeMove, afterMove, jumped });
  await launch("sleepy-blink");
  await page.waitForFunction(() => window.__phaserGame.scene.getScene("PlayScene").sessionAwakeningController.elapsedMs >= 380, null, { timeout: 30000 });
  await page.keyboard.press("Space");
  await page.waitForFunction(() => !window.__phaserGame.scene.getScene("PlayScene").sessionAwakeningController.active, null, { timeout: 30000 });
  const skipped = await snapshot(); assert.equal(skipped.status, "skipped"); assert.equal(skipped.controls, true);
  evidence.cases.push({ id: "keyboard-skip", passed: true, end: skipped });
  await launch("finding-focus", { reduced: true, blur: true });
  await page.waitForFunction(() => !window.__phaserGame.scene.getScene("PlayScene").sessionAwakeningController.active, null, { timeout: 30000 });
  const reduced = await snapshot(); assert.equal(reduced.reduced, true); assert.equal(reduced.blurStrength, 0); assert.equal(reduced.durationMs, 750);
  evidence.cases.push({ id: "reduced-motion", passed: true, end: reduced });
  await launch("first-breath");
  await page.evaluate(() => window.__phaserGame.scene.getScene("PlayScene").soundSystem.toggleSfx(false));
  await page.waitForTimeout(100);
  const muted = await snapshot(); assert(muted.audioVolume.every(volume => volume === 0));
  await page.evaluate(() => window.__phaserGame.scene.getScene("PlayScene").soundSystem.toggleSfx(true));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForFunction(() => !window.__phaserGame.scene.getScene("PlayScene").sessionAwakeningController.active, null, { timeout: 30000 });
  const resized = await snapshot(); assert.equal(resized.status, "complete"); assert.equal(resized.controls, true);
  await page.screenshot({ path: path.join(output, "resized-awake.png") });
  evidence.cases.push({ id: "mute-and-resize", passed: true, muted, end: resized });
  await launch("finding-focus", { blur: true });
  await page.evaluate(() => {
    const s = window.__phaserGame.scene.getScene("PlayScene");
    window.__wakeDisposed = s.sessionAwakeningController;
    s.scene.start("MainMenuScene");
  });
  await page.waitForFunction(() => window.__phaserGame.scene.isActive("MainMenuScene"));
  const disposed = await page.evaluate(() => ({ destroyed: window.__wakeDisposed.destroyed, active: window.__wakeDisposed.active,
    view: Boolean(window.__wakeDisposed.view), audio: Boolean(window.__wakeDisposed.audio) }));
  assert.deepEqual(disposed, { destroyed: true, active: false, view: false, audio: false });
  evidence.cases.push({ id: "exit-during-awakening", passed: true, disposed });
  await launch("first-breath", { disabled: true });
  const disabled = await snapshot();
  assert.equal(disabled.active, false); assert.equal(disabled.viewPresent, false); assert.equal(disabled.controls, true);
  evidence.cases.push({ id: "rollback-disabled", passed: true, end: disabled });
  await launch("sleepy-blink", { blur: true });
  await page.waitForFunction(() => window.__phaserGame.scene.getScene("PlayScene").sessionAwakeningController.elapsedMs >= 380);
  await page.mouse.click(720,450);
  await page.waitForFunction(() => !window.__phaserGame.scene.getScene("PlayScene").sessionAwakeningController.active);
  const pointerSkipped = await snapshot(); assert.equal(pointerSkipped.status, "skipped");
  evidence.cases.push({ id: "pointer-skip", passed: true, end: pointerSkipped });
  assert.deepEqual(evidence.errors, []);
  assert.deepEqual(evidence.consoleErrors, []);
  await save();
  console.log("SESSION_AWAKENING_LIVE_QA_OK", evidence.cases.map(item => item.id).join(", "));
} catch (error) {
  evidence.failure = error.stack;
  if (page) { try { evidence.last = await snapshot(); await page.screenshot({ path: path.join(output, "failure.png") }); } catch {} }
  console.error("AWAKENING_LIVE_FAILURE", error.stack);
  process.exitCode = 1;
} finally {
  await save();
  await browser?.close();
  server.kill();
}
