import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import { SESSION_AWAKENING as C } from "../values/sessionAwakening.js";
import { chooseAwakening, sampleAwakening } from "../world/playScene/sessionAwakeningPresentation.js";
import { SessionAwakeningController } from "../world/playScene/SessionAwakeningController.js";
import { SceneModeController } from "../systems/runtime/SceneModeController.js";

const variants = C.variants.map(v => v.id);
let seed = 1234567, last = null;
const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
const counts = new Map(variants.map(id => [id, 0]));
let blurred = 0;
for (let i = 0; i < 300; i++) {
  const selection = chooseAwakening(last, { random });
  assert.notEqual(selection.id, last, "consecutive entries must differ");
  assert(selection.durationMs > 2100 && selection.durationMs < 2700);
  counts.set(selection.id, counts.get(selection.id) + 1);
  blurred += selection.blurStrength > 0 ? 1 : 0;
  last = selection.id;
  const end = sampleAwakening(selection, selection.durationMs);
  assert.equal(end.opening, 1); assert.equal(end.lidAlpha, 0);
  assert.equal(end.blur, 0); assert.equal(end.cameraY, 0); assert.equal(end.cameraZoom, 0);
}
assert([...counts.values()].every(count => count > 50));
assert(blurred > 60 && blurred < 260, "blur should be occasional");
const blink = chooseAwakening(null, { forced: "sleepy-blink", random: () => 0.5 });
assert(sampleAwakening(blink, blink.durationMs * 0.3).opening > sampleAwakening(blink, blink.durationMs * 0.4).opening);
const reduced = chooseAwakening(null, { reduced: true, random: () => 0 });
assert.equal(reduced.blurStrength, 0); assert.equal(reduced.cameraScale, 0);
assert.equal(reduced.durationMs, 750);
for (const asset of [C.audio.breath, C.audio.heartbeat]) {
  assert.equal(asset.approved, true); assert(fs.existsSync(asset.path));
}
assert(fs.existsSync(C.art.path));

function fixture({ muted = false, unavailable = false, renderFailure = false } = {}) {
  const sounds = [];
  const scene = {
    events: new EventEmitter(), input: { keyboard: new EventEmitter() }, registry: new Map(),
    sceneModeController: new SceneModeController({ basePhase: "active" }),
    player: { anims: { timeScale: 1 } }, playerController: { controls: true,
      setControlsEnabled(value) { this.controls = value; } },
    soundSystem: { sfxEnabled: !muted, sfxVolume: 0.5, musicVolume: 0.25, refreshMixVolumes() {} },
    sound: { locked: false, add(key) { const voice = { key, volume: 0, destroyed: false,
      addMarker(marker) { this.marker = marker; }, play() { return true; },
      setVolume(value) { this.volume = value; }, stop() {}, destroy() { this.destroyed = true; } };
      sounds.push(voice); return voice; } },
    cache: { audio: { exists: () => true } },
    setSceneBasePhase(phase) { this.sceneModeController.setBasePhase(phase); },
    playTeleportInAnimation() { this._teleportInAnimating = true; },
    updatePlayerVisualState() {},
  };
  const view = { zone: new EventEmitter(), destroyed: false, renders: 0,
    begin() {}, render() { if (renderFailure && ++this.renders > 2) throw new Error("test visual failure"); },
    restoreCamera() { this.cameraRestored = true; },
    release() { this.released = true; }, destroy() { this.destroyed = true; } };
  const controller = new SessionAwakeningController(scene, () => unavailable ? null : view);
  const tick = n => { for (let i = 0; i < n; i++) scene.events.emit("postupdate", i * 16, 16); };
  return { scene, view, controller, sounds, tick };
}
{
  const f = fixture();
  assert(f.controller.begin()); assert(!f.controller.begin());
  assert.equal(f.scene.playerController.controls, false);
  assert.equal(f.scene.player.anims.timeScale, 0);
  f.tick(30);
  assert(f.controller.blocksGameplay);
  f.scene.soundSystem.sfxVolume = 0.17;
  f.tick(170);
  assert.equal(f.controller.status, "complete");
  assert.equal(f.scene.playerController.controls, true);
  assert.equal(f.scene.player.anims.timeScale, 1);
  assert.equal(f.scene.soundSystem.sfxVolume, 0.17, "saved mix changes must survive");
  assert.equal(f.scene.soundSystem.sessionAwakeningMix, undefined);
  assert(f.sounds.length === 3 && f.sounds.every(sound => sound.destroyed));
  assert(f.view.destroyed); assert.equal(f.scene.events.listenerCount("postupdate"), 0);
  assert.equal(f.scene.input.keyboard.listenerCount("keydown"), 0);
}
{
  const f = fixture(); f.controller.begin();
  assert(!f.controller.skip());
  f.tick(25); const voices = f.sounds.length;
  f.scene.input.keyboard.emit("keydown", { repeat: false });
  f.tick(20);
  assert.equal(f.controller.status, "skipped");
  assert.equal(f.sounds.length, voices, "skip must not start late heartbeats");
  assert.equal(f.scene.playerController.controls, true);
}
{
  const f = fixture({ muted: true }); f.controller.begin(); f.tick(200);
  assert.equal(f.sounds.length, 0);
}
{
  const f = fixture(); f.controller.begin(); f.tick(25);
  f.scene.sceneModeController.enterSafePause(); f.tick(1);
  assert.equal(f.controller.status, "interrupted");
  assert.equal(f.scene.playerController.controls, false, "never undo a recovery pause");
}
{
  const f = fixture(); f.controller.begin(); f.tick(25);
  f.scene.player.anims = null; // Phaser destroys scene objects before system disposal.
  f.scene._isShuttingDown = true;
  f.controller.destroy();
  assert.equal(f.controller.view, null); assert.equal(f.controller.audio, null);
  assert(f.view.destroyed); assert(f.sounds.every(sound => sound.destroyed));
  assert.equal(f.scene.playerController.controls, false, "teardown must not reactivate controls");
}
{
  const f = fixture({ renderFailure: true }); f.controller.begin(); f.tick(5);
  assert.equal(f.controller.status, "unavailable");
  assert.equal(f.scene.playerController.controls, true);
}
{
  const f = fixture({ unavailable: true });
  assert.equal(f.controller.begin(), false);
  assert.equal(f.scene.playerController.controls, true);
}

{
  // Regression: offscreen atmospheric shaders must preserve a camera FX target.
  const { ShaderSystem } = await import("../systems/lighting/ShaderSystem.js");
  const previousPhaser = globalThis.Phaser;
  let fail = false;
  const shader = { renderWebGL(renderer) {
    renderer.currentFramebuffer = null; // The bundled Phaser Shader flush.
    if (fail) throw new Error("shader-render-failure");
  } };
  const image = {};
  for (const method of ["setOrigin", "setScrollFactor", "setVisible", "setRenderToTexture"]) shader[method] = () => shader;
  for (const method of ["setOrigin", "setScrollFactor", "setVisible", "setDepth", "setDisplaySize", "setBlendMode"]) image[method] = () => image;
  try {
    globalThis.Phaser = { Display: { BaseShader: class {} }, BlendModes: { ADD: 1 } };
    const system = new ShaderSystem({ cameras: { main: { width: 1280, height: 720 } },
      textures: { exists: () => false }, add: { shader: () => shader, image: () => image } });
    system._createLayer("awakening-test", "test", "", { enabled: true, depth: 0 });
    const target = {};
    const renderer = { currentFramebuffer: target, setFramebuffer(value) { this.currentFramebuffer = value; } };
    shader.renderWebGL(renderer);
    assert.equal(renderer.currentFramebuffer, target, "foreground must stay inside the camera focus pass");
    fail = true;
    assert.throws(() => shader.renderWebGL(renderer), /shader-render-failure/);
    assert.equal(renderer.currentFramebuffer, target, "render failures must also restore the camera target");
  } finally { globalThis.Phaser = previousPhaser; }
}


{
  const f = fixture();
  f.controller.createView = () => ({ ...f.view, zone: new EventEmitter(), destroyed: false, renders: 0 });
  f.controller.begin(); f.tick(200);
  let previous = f.controller.selection.id;
  for (let cycle = 0; cycle < 3; cycle++) {
    const bed = f.scene.sceneModeController.acquire("shop", "town-rest-test");
    f.scene.playerController.setControlsEnabled(false);
    assert(f.controller.beginDozing(4200));
    f.tick(30);
    assert.equal(f.controller.elapsedMs, 0, "the bed clock drives dozing, not a second timer");
    f.controller.updateDozing(2100);
    assert.equal(f.controller.audio.played.length, 1, "dozing adds one restrained breath");
    f.controller.updateDozing(4200);
    assert.equal(f.controller.frame.coverAlpha, 1, "sleep ends fully covered");
    assert.equal(f.scene.registry.get(C.historyKey), previous, "dozing must not overwrite wake history");
    assert(f.controller.beginSleepTimelapse(4200, 320));
    assert.equal(f.controller.frame.coverAlpha, 1, "the camera changes under full cover");
    assert(f.controller.view.cameraRestored, "remove focus before revealing the outdoor shot");
    f.tick(30);
    assert.equal(f.controller.elapsedMs, 0, "the bed also owns the time-lapse clock");
    f.controller.updateDozing(2100);
    assert.equal(f.controller.frame.coverAlpha, 0);
    assert.equal(f.controller.frame.lidAlpha, 0);
    assert.equal(f.controller.frame.blur, 0);
    assert.equal(f.controller.frame.hudAlpha, 0);
    assert.equal(f.controller.audio.played.length, 1, "the outdoor shot does not replay body sounds");
    f.controller.updateDozing(4200);
    assert.equal(f.controller.frame.coverAlpha, 1, "the return to the player stays covered");
    assert.equal(f.scene.registry.get(C.historyKey), previous);
    assert(f.controller.awakenFromSleep());
    assert.notEqual(f.controller.selection.id, previous);
    previous = f.controller.selection.id;
    assert.equal(f.scene.sceneModeController.basePhase, "active", "rest keeps its existing phase authority");
    assert.equal(f.scene._teleportInAnimating, false, "waking in bed must not replay teleport");
    f.tick(200);
    assert.equal(f.controller.status, "complete");
    assert.equal(f.controller.view, null);
    assert.equal(f.scene.playerController.controls, false, "blessing choice still owns input");
    assert.equal(f.scene.sceneModeController.isSuspended, true);
    assert.equal(f.scene.soundSystem.sessionAwakeningMix, undefined);
    bed.release();
  }
  assert(!f.controller.begin(), "ordinary session entry still runs only once");
}
for (const timelapse of [false, true]) {
  const f = fixture(); f.controller.beginDozing(1600); f.controller.updateDozing(800);
  if (timelapse) { f.controller.beginSleepTimelapse(4200, 320); f.controller.updateDozing(2100); }
  f.controller.destroy();
  assert.equal(f.controller.view, null); assert.equal(f.controller.audio, null);
  assert.equal(f.scene.events.listenerCount("postupdate"), 0);
  assert.equal(f.scene.input.keyboard.listenerCount("keydown"), 0);
}

console.log("SESSION_AWAKENING_CONTRACT_OK", JSON.stringify({ selections: 300, counts: Object.fromEntries(counts), blurred }));
