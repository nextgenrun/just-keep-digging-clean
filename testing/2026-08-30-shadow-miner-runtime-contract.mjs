import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  SHADOW_MINER_CONFIG,
  SHADOW_MINER_ENCOUNTER_BANDS,
  SHADOW_MINER_REPELLENTS,
  SHADOW_MINER_STATES,
  resolveShadowMinerMode,
} from "../values/shadowMiner.js";
import {
  resolveShadowMinerEncounterBand,
  resolveShadowMinerRepellent,
} from "../world/playScene/ShadowMinerEncounterContext.js";
import { ShadowMinerPoseHistory } from
  "../world/playScene/ShadowMinerPoseHistory.js";
import { ShadowMinerRuntime } from
  "../world/playScene/ShadowMinerRuntime.js";

function makePose(time, x, action = false) {
  return {
    time,
    x,
    y: 512,
    tileX: x / 64,
    tileY: 70,
    textureKey: action ? "current-player-dig-sheet" : "current-player-walk-sheet",
    frameName: Math.floor(time / 100) % 8,
    animationKey: action ? "current-player-dig-down" : "current-player-walk-loop",
    frameIndex: Math.floor(time / 100) % 8,
    flipX: false,
    originX: 0.5,
    originY: 1,
    displayWidth: 101,
    displayHeight: 101,
    action,
  };
}

function createReplaySamples() {
  const samples = [];
  for (let time = 0; time <= 8_000; time += 50) {
    samples.push(makePose(time, 100 + (time / 8_000) * 512, time >= 6_500));
  }
  return samples;
}

function createViewFixture() {
  return {
    spawnCalls: [],
    applied: [],
    faceCalls: [],
    fleeing: false,
    vanishCount: 0,
    hideCount: 0,
    spawn(detail) {
      this.spawnCalls.push(detail);
      this.currentPose = detail.pose;
      return true;
    },
    applyPose(pose) {
      this.currentPose = pose;
      this.applied.push(pose);
      return true;
    },
    facePlayer(x) { this.faceCalls.push(x); },
    setFleeing(value) { this.fleeing = value; },
    update() {},
    vanish() { this.vanishCount += 1; },
    hide() { this.hideCount += 1; },
    getSnapshot() {
      return {
        visible: this.spawnCalls.length > this.hideCount,
        animationKey: this.currentPose?.animationKey || null,
        frameName: this.currentPose?.frameName ?? null,
      };
    },
    destroy() { this.destroyed = true; },
  };
}

function createRuntimeFixture(mode = { enabled: true, review: false, dev10x: false }) {
  const mutations = { damage: 0, save: 0 };
  const sprite = {
    x: 612,
    y: 512,
    texture: { key: "current-player-walk-sheet" },
    frame: { name: 0 },
    anims: {
      currentAnim: { key: "current-player-idle" },
      currentFrame: { index: 0 },
    },
    flipX: false,
    originX: 0.5,
    originY: 1,
    displayWidth: 101,
    displayHeight: 101,
  };
  const scene = {
    time: { now: 0 },
    config: { tileSize: 64, topAirRows: 10, playerDisplaySizePx: 101 },
    player: sprite,
    lightSystem: {
      active: false,
      intensity: 1,
      isTorchActive() { return this.active; },
      getTorchIntensity() { return this.intensity; },
    },
    starSanctuarySnapshot: { nearIntactStar: false },
    worldModel: { damageTile() { mutations.damage += 1; } },
    queueDugTilesSave() { mutations.save += 1; },
    soundSystem: { playApprovedSfxFamily() {} },
  };
  const history = new ShadowMinerPoseHistory(scene.config.tileSize);
  history.replaceSamples(createReplaySamples());
  const view = createViewFixture();
  const runtime = new ShadowMinerRuntime(scene, {
    mode,
    random: () => 0,
    history,
    view,
  });
  return { runtime, scene, view, mutations };
}

assert.deepEqual(
  resolveShadowMinerMode("?shadowMiner=review&shadowMiner10x=1", "localhost"),
  { enabled: true, review: true, dev10x: true },
);
assert.deepEqual(
  resolveShadowMinerMode("?shadowMiner=review&shadowMiner10x=1", "understar.example"),
  { enabled: true, review: false, dev10x: false },
);
assert.deepEqual(
  resolveShadowMinerMode("?shadowMiner=0&shadowMiner10x=1", "localhost"),
  { enabled: false, review: false, dev10x: false },
);

const profiles = SHADOW_MINER_CONFIG.panic.profiles;
const ambient = profiles[SHADOW_MINER_ENCOUNTER_BANDS.AMBIENT];
const warning = profiles[SHADOW_MINER_ENCOUNTER_BANDS.WARNING];
const critical = profiles[SHADOW_MINER_ENCOUNTER_BANDS.CRITICAL];
assert.ok(ambient.spawnChanceMultiplier < warning.spawnChanceMultiplier);
assert.ok(warning.spawnChanceMultiplier < critical.spawnChanceMultiplier);
assert.ok(ambient.replayDelayMs > warning.replayDelayMs);
assert.ok(warning.replayDelayMs > critical.replayDelayMs);
assert.ok(ambient.approachPlaybackRate < warning.approachPlaybackRate);
assert.ok(warning.approachPlaybackRate < critical.approachPlaybackRate);
assert.equal(SHADOW_MINER_CONFIG.dev.rateMultiplier, 10);
assert.equal(SHADOW_MINER_CONFIG.visual.renderMode, "solid-purple-silhouette");

assert.equal(
  resolveShadowMinerEncounterBand({ hardcoreArmed: false, stressBand: "critical" }),
  SHADOW_MINER_ENCOUNTER_BANDS.AMBIENT,
  "Casual receives the low-frequency ambience profile",
);
assert.equal(
  resolveShadowMinerEncounterBand({ hardcoreArmed: true, stressBand: "warning" }),
  SHADOW_MINER_ENCOUNTER_BANDS.WARNING,
);
assert.equal(
  resolveShadowMinerEncounterBand({ hardcoreArmed: true, stressBand: "critical" }),
  SHADOW_MINER_ENCOUNTER_BANDS.CRITICAL,
);
assert.equal(resolveShadowMinerRepellent({
  nearIntactStarLight: true,
  torchActive: true,
  torchIntensity: 1,
}), SHADOW_MINER_REPELLENTS.STAR, "intact Star refuge has priority");
assert.equal(resolveShadowMinerRepellent({
  nearIntactStarLight: false,
  torchActive: true,
  torchIntensity: 1,
}), SHADOW_MINER_REPELLENTS.TORCH);
assert.equal(resolveShadowMinerRepellent({
  nearIntactStarLight: false,
  torchActive: false,
  torchIntensity: 1,
}), null);

const captureHistory = new ShadowMinerPoseHistory(64);
const captureSprite = {
  x: 100,
  y: 512,
  texture: { key: "live-player-sheet" },
  frame: { name: 0 },
  anims: {
    currentAnim: { key: "live-player-walk-loop" },
    currentFrame: { index: 0 },
  },
  flipX: false,
  originX: 0.5,
  originY: 1,
  displayWidth: 101,
  displayHeight: 101,
};
for (let time = 0; time <= 1_800; time += 45) {
  captureSprite.x = 100 + (time / 1_800) * 128;
  captureSprite.frame.name = Math.floor(time / 90) % 6;
  captureSprite.anims.currentFrame.index = captureSprite.frame.name;
  if (time >= 1_350) captureSprite.anims.currentAnim.key = "live-player-dig-down";
  captureHistory.record(time, captureSprite, { tx: captureSprite.x / 64, ty: 70 });
}
const capturedWindow = captureHistory.getWindowSummary(0, 1_800);
assert.equal(capturedWindow.ready, true);
assert.ok(capturedWindow.travelTiles >= 1.9);
assert.ok(capturedWindow.actionSamples > 0, "real dig poses are retained");
assert.equal(captureHistory.sampleAt(1_500).animationKey, "live-player-dig-down");
captureSprite.x += 512;
captureHistory.record(1_845, captureSprite, { tx: 20, ty: 70 });
assert.equal(captureHistory.getSnapshot().samples, 1, "teleports reset stale trails");

const accelerated = createRuntimeFixture({ enabled: true, review: false, dev10x: true });
assert.equal(
  accelerated.runtime.getHealthSnapshot().nextCheckAtMs,
  SHADOW_MINER_CONFIG.production.firstCheckDelayMs / 10,
  "local dev admission timing is exactly ten times faster",
);
accelerated.runtime.destroy();

const approach = createRuntimeFixture();
const criticalContext = {
  stressSnapshot: { armed: true, stressBand: "critical", stressRatio: 1 },
  torchActive: false,
  torchIntensity: 0,
  nearIntactStarLight: false,
};
let now = 8_000;
assert.equal(approach.runtime.forceSpawn({ tx: 9, ty: 70 }, now, criticalContext), true);
let snapshot = approach.runtime.getHealthSnapshot();
assert.equal(snapshot.state, SHADOW_MINER_STATES.SPAWNING);
assert.equal(snapshot.encounterBand, SHADOW_MINER_ENCOUNTER_BANDS.CRITICAL);
assert.equal(approach.view.spawnCalls[0].visualIntensity, critical.visualIntensity);
const initialDistance = snapshot.distanceToPlayerTiles;

now += SHADOW_MINER_CONFIG.timing.spawnMs;
approach.runtime.update(now, 16, { tx: 9, ty: 70 }, criticalContext);
assert.equal(approach.runtime.getHealthSnapshot().state, SHADOW_MINER_STATES.APPROACHING);
const initialDelay = approach.runtime.getHealthSnapshot().playbackDelayMs;
now += 400;
approach.runtime.update(now, 400, { tx: 9, ty: 70 }, criticalContext);
snapshot = approach.runtime.getHealthSnapshot();
assert.equal(snapshot.state, SHADOW_MINER_STATES.APPROACHING);
assert.ok(snapshot.playbackDelayMs < initialDelay, "replay delay shrinks toward player");
assert.ok(snapshot.distanceToPlayerTiles < initialDistance, "silhouette closes distance");
const beforeFleePlayback = approach.runtime.playbackTimeMs;

approach.scene.lightSystem.active = true;
now += 40;
approach.runtime.update(now, 40, { tx: 9, ty: 70 });
snapshot = approach.runtime.getHealthSnapshot();
assert.equal(snapshot.state, SHADOW_MINER_STATES.FLEEING);
assert.equal(snapshot.lastRepelledBy, SHADOW_MINER_REPELLENTS.TORCH);
assert.ok(approach.runtime.playbackTimeMs < beforeFleePlayback, "flee reverses trail");
assert.equal(approach.view.fleeing, true);

now += SHADOW_MINER_CONFIG.interaction.fleeDurationMs + 1;
approach.runtime.update(now, SHADOW_MINER_CONFIG.interaction.fleeDurationMs + 1, {
  tx: 9,
  ty: 70,
});
assert.equal(approach.runtime.getHealthSnapshot().state, SHADOW_MINER_STATES.VANISHING);
now += SHADOW_MINER_CONFIG.timing.vanishMs;
approach.runtime.update(now, SHADOW_MINER_CONFIG.timing.vanishMs, { tx: 9, ty: 70 });
assert.equal(approach.runtime.getHealthSnapshot().state, SHADOW_MINER_STATES.DORMANT);
assert.deepEqual(approach.mutations, { damage: 0, save: 0 });

const casual = createRuntimeFixture();
now = 8_000;
assert.equal(casual.runtime.forceSpawn({ tx: 9, ty: 70 }, now, {
  stressSnapshot: { armed: false, stressBand: "calm", stressRatio: 0 },
  torchActive: false,
  nearIntactStarLight: false,
}), true);
assert.equal(
  casual.runtime.getHealthSnapshot().encounterBand,
  SHADOW_MINER_ENCOUNTER_BANDS.AMBIENT,
);
now += SHADOW_MINER_CONFIG.timing.spawnMs;
casual.runtime.update(now, 16, { tx: 9, ty: 70 });
const casualStartDistance = casual.runtime.getHealthSnapshot().distanceToPlayerTiles;
for (let index = 0; index < 14; index += 1) {
  now += 500;
  casual.runtime.update(now, 500, { tx: 9, ty: 70 });
  if (casual.runtime.getHealthSnapshot().state === SHADOW_MINER_STATES.OBSERVING) break;
}
assert.equal(casual.runtime.getHealthSnapshot().state, SHADOW_MINER_STATES.OBSERVING);
assert.ok(casual.runtime.getHealthSnapshot().distanceToPlayerTiles < casualStartDistance);

const star = createRuntimeFixture();
now = 8_000;
assert.equal(star.runtime.forceSpawn({ tx: 9, ty: 70 }, now, criticalContext), true);
now += 16;
star.runtime.update(now, 16, { tx: 9, ty: 70 }, {
  stressSnapshot: criticalContext.stressSnapshot,
  nearIntactStarLight: true,
  torchActive: false,
});
assert.equal(star.runtime.getHealthSnapshot().state, SHADOW_MINER_STATES.FLEEING);
assert.equal(star.runtime.getHealthSnapshot().lastRepelledBy, SHADOW_MINER_REPELLENTS.STAR);

const sources = {};
for (const [key, path] of Object.entries({
  setup: "../world/playScene/PlaySceneSetup.js",
  update: "../world/playScene/PlaySceneUpdate.js",
  lifecycle: "../world/playScene/PlaySceneLifecycle.js",
  runtime: "../world/playScene/ShadowMinerRuntime.js",
  view: "../world/playScene/ShadowMinerView.js",
  preview: "../testing/JkdE2EShadowMinerPreview.js",
  boot: "../ui/scenes/BootScene.js",
  readme: "../world/playScene/readme.md",
})) {
  sources[key] = await readFile(new URL(path, import.meta.url), "utf8");
}
assert.match(sources.setup, /this\.shadowMinerSystem = new ShadowMinerRuntime\(this\)/);
assert.match(sources.update, /shadowMinerStressSnapshot = updateHardcoreModeRuntime/);
assert.match(sources.update, /stressSnapshot: shadowMinerStressSnapshot/);
assert.match(sources.update, /starSnapshot: this\.starSanctuarySnapshot/);
assert.match(sources.lifecycle, /"shadowMinerSystem"/);
assert.match(sources.view, /setTintFill\(this\.config\.visual\.tint\)/);
assert.match(sources.view, /setTintFill\(this\.config\.visual\.echoTint\)/);
assert.match(sources.view, /applyPose\(pose\)/);
assert.doesNotMatch(sources.runtime, /damageTile|queueDugTilesSave|setTile\(/);
assert.match(sources.preview, /system\.history\.replaceSamples\(samples\)/);
assert.match(sources.preview, /setTorchActive\(scene, true/);
assert.match(sources.preview, /setGemPowerExact\?\.\(originalGp/);
assert.doesNotMatch(sources.preview, /queueDugTilesSave|damageTile/);
assert.doesNotMatch(sources.view, /ASSET_KEYS\.shadowMiner|shadow-miner-idle-sheet/);
assert.doesNotMatch(sources.boot, /load\.spritesheet\(ASSET_KEYS\.shadowMiner\.idleSheet/);
assert.match(sources.readme, /shadowMiner10x=1/);

approach.runtime.destroy();
casual.runtime.destroy();
star.runtime.destroy();
assert.equal(approach.view.destroyed, true);

console.log(
  "shadow miner stress echo contract: player pose replay, Casual/panic profiles, approach, torch/Star flee, local 10x timing, zero terrain/save authority, and lifecycle passed",
);
