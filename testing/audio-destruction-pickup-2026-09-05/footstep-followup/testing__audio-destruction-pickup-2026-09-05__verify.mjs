import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFileSync, writeFileSync } from "node:fs";
import { createRuntime } from "../audio-review-2026-09-03/runtime-fixture.mjs";
import { createSfxWindow, applySfxWindow } from "../../sound/coreSfxWindow.js";
import { CORE_SFX_WINDOWS } from "../../values/coreSfxWindows.js";
import { UalActionContactTimeline } from "../../player/UalActionContactTimeline.js";
import { setupGameplayMethods } from "../../world/playScene/PlaySceneGameplay.js";
import { LootPickupFlightView } from "../../systems/visual/LootPickupFlightView.js";
import { LootPickupFxSystem } from "../../systems/visual/LootPickupFxSystem.js";
import { XPGatheringFlightView } from "../../systems/visual/XPGatheringFlightView.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
const checks = [], check = (name, run) => { run(); checks.push(name); };
const context = { createBuffer(channels, length, sampleRate) {
 const arrays = Array.from({ length: channels }, () => new Float32Array(length));
 return { numberOfChannels: channels, length, sampleRate, duration: length / sampleRate, getChannelData: c => arrays[c] };
} };
check("Playback windows preserve source PCM, stereo, rate and zero-ended fades; edited buffers are reused", () => {
 for (const sampleRate of [44100, 48000]) for (const window of Object.values(CORE_SFX_WINDOWS)) {
  const source = context.createBuffer(2, sampleRate * 2, sampleRate);
  source.getChannelData(0).fill(0.8); source.getChannelData(1).fill(-0.4);
  const copy = source.getChannelData(0).slice(), buffer = createSfxWindow(context, source, window);
  assert.equal(buffer.numberOfChannels, 2); assert.equal(buffer.sampleRate, sampleRate);
  assert.ok(Math.abs(buffer.duration - window.duration) <= 1 / sampleRate);
  assert.equal(buffer.getChannelData(0)[0], 0); assert.equal(buffer.getChannelData(0).at(-1), 0);
  for (let i = 0; i < buffer.length; i++) assert.ok(Math.abs(buffer.getChannelData(0)[i] + 2 * buffer.getChannelData(1)[i]) < 1e-7);
  assert.deepEqual(source.getChannelData(0), copy); assert.equal(source.duration, 2);
  assert.equal(createSfxWindow(context, source, window), buffer);
 }
});
check("Phaser HTMLAudio fallback marker retains live mixer config and crops the same source interval", () => {
 let marker; const sound = { config: { volume: 0.012, rate: 0.9, pan: -0.2 }, addMarker: value => { marker = value; return true; } };
 assert.equal(applySfxWindow(sound, null, CORE_SFX_WINDOWS.libStoneBreak), "core-action-window");
 assert.equal(marker.start, 0.215); assert.equal(marker.duration, 0.3); assert.deepEqual(marker.config, sound.config);
});
check("Real contact timeline dispatches exactly one final destruction at the crossed frame, with no late cancelled hit", () => {
 const f = createRuntime(), methods = {}; setupGameplayMethods(methods);
 const sprite = new EventEmitter(), timeline = new UalActionContactTimeline(sprite);
 const contact = () => methods.playMineFeedbackAudio.call({ soundSystem: f.system }, { success: true, destroyed: true }, TILE_TYPES.STONE);
 timeline.begin({ animationKey: "mining", contactFrame: 4, onContact: contact });
 f.tick(50); sprite.emit("animationupdate", { key: "mining" }, { textureFrame: 2 }); assert.equal(f.played.length, 0);
 f.tick(80); sprite.emit("animationupdate", { key: "mining" }, { textureFrame: 6 });
 assert.equal(f.played.length, 1); assert.equal(f.played[0].at, 130); assert.equal(f.played[0].key, "approved-review-libStoneBreak");
 sprite.emit("animationupdate", { key: "mining" }, { textureFrame: 7 }); sprite.emit("animationcomplete", { key: "mining" }, { textureFrame: 8 });
 assert.equal(f.played.length, 1);
 const cancelledId = timeline.begin({ animationKey: "mining", contactFrame: 4, onContact: contact }); timeline.cancel(); f.tick(1000);
 sprite.emit("animationupdate", { key: "mining" }, { textureFrame: 8 }); timeline.fireContactFallback(cancelledId);
 assert.equal(f.played.length, 1); timeline.destroy(); f.system.destroy();
});
check("Pickup belongs to resource arrival even when special XP arrives beyond the previous cooldown", () => {
 const f = createRuntime(); assert.ok(f.system.playResourcePickup({ special: true }));
 for (const delay of [100, 900, 3000]) { f.tick(delay); assert.equal(f.system.playXpGather({ special: true }), null); }
 assert.equal(f.played.length, 1); assert.ok(f.system.playResourcePickup()); assert.equal(f.played.length, 2); f.system.destroy();
});
check("Loot completion does not fire before arrival and ignores a removed visual", () => {
 let tween, arrivals = 0; const view = new LootPickupFlightView({ tweens: { add: value => { tween = value; } } }, { removeFlight() {} });
 view._playSourceMoment = () => {}; view._playArrival = () => {};
 const root = { active: true }, flight = { root };
 assert.ok(view.animate({ flight, motionPlan: { durationMs: 800, target: { x: 20, y: 20 } }, moment: { holdMs: 200 }, onArrival: () => arrivals++ }));
 assert.equal(arrivals, 0); assert.equal(tween.duration, 800); assert.equal(tween.delay, 200);
 view._playArrival = () => { root.active = false; };
 tween.onComplete(); assert.equal(arrivals, 1, "A valid arrival survives visual echo cleanup");
 root.active = false; tween.onComplete(); assert.equal(arrivals, 1);
});
check("Cancelled XP flight cannot run its final arrival callback", () => {
 let tween, arrivals = 0; const view = new XPGatheringFlightView({ tweens: { add: value => { tween = value; } } }, { addImage() {}, removeSprite() {} });
 view._spawnArrivalEchoes = () => {};
 const sprite = { active: true, rotation: 0 };
 view.animate({ sprite, motionPlan: { durationMs: 600 }, profile: { flight: "routine" }, index: 0, target: {}, baseScaleX: 1, baseScaleY: 1, isFinalPickup: true, onFinalArrival: () => arrivals++ });
 sprite.active = false; tween.onComplete(); assert.equal(arrivals, 0);
});
check("Current review keeps source IDs and gains, with exact matching trimmed preview metadata", () => {
 const before = JSON.parse(readFileSync(new URL("before/testing__audio-runtime-reaudit-2026-09-04__catalog.json", import.meta.url)));
 const current = JSON.parse(readFileSync(new URL("../audio-runtime-reaudit-2026-09-04/catalog.json", import.meta.url)));
 assert.deepEqual(current.items.map(i => [i.id, i.path, i.runtimeGain]), before.items.map(i => [i.id, i.path, i.runtimeGain]));
 const changed = current.items.filter(i => i.metadata.playbackWindow); assert.equal(changed.length, 5);
 const measurements = JSON.parse(readFileSync(new URL("window-measurements.json", import.meta.url)));
 for (const row of changed) {
  const m = measurements.find(m => m.source === row.path); assert.deepEqual(row.metadata.playbackWindow, m.window);
  assert.equal(row.metadata.runtimePreviewPath, m.previewPath); assert.ok(m.dominantAttackMs <= 8);
  assert.ok(m.peak * row.runtimeGain < 1, "Runtime output remains below clipping");
 }
});
writeFileSync(new URL("verification.json", import.meta.url), JSON.stringify({ passed: true, checks, manualPlaythrough: false, listeningApproved: false }, null, 2));
console.log(JSON.stringify({ passed: true, checks }));
