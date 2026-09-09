import { SHADOW_MINER_WORK } from "../values/shadowMinerWork.js";
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
  resolveShadowMinerDepthProfile,
  resolveShadowMinerEncounterBand,
  resolveShadowMinerLightResponse,
  resolveShadowMinerRepellent,
} from "../world/playScene/ShadowMinerEncounterContext.js";
import { ShadowMinerPoseHistory } from
  "../world/playScene/ShadowMinerPoseHistory.js";
import { ShadowMinerRuntime } from
  "../world/playScene/ShadowMinerRuntime.js";
import {
  mixShadowMinerColor,
  resolveShadowMinerEchoPresentation,
} from "../world/playScene/shadowMinerViewPresentation.js";

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
    observeCalls: [],
    beginFleeCalls: [],
    fleeApplied: [],
    anchoredActions: [],
    lightExposureCalls: [],
    hideOptions: [],
    fleeing: false,
    vanishCount: 0,
    hideCount: 0,
    spawn(detail) {
      this.spawnCalls.push(detail);
      this.currentPose = detail.pose;
      this.anchor = { x: detail.pose.x, y: detail.pose.y };
      return true;
    },
    applyPose(pose) {
      this.currentPose = pose;
      this.anchor = { x: pose.x, y: pose.y };
      this.applied.push(pose);
      return true;
    },
    applyFleePose(pose, time, playerWorldX) {
      this.fleeApplied.push({ pose, time, playerWorldX });
      return this.applyPose(pose);
    },
    applyAnchoredActionPose(pose) {
      this.anchoredActions.push(pose);
      return this.applyPose({
        ...pose,
        x: this.currentPose?.x ?? pose.x,
        y: this.currentPose?.y ?? pose.y,
      });
    },
    facePlayer(x) { this.faceCalls.push(x); },
    beginObserve(time, x) {
      this.observeCalls.push({ time, x });
      this.facePlayer(x);
    },
    beginFlee(detail) {
      this.beginFleeCalls.push(detail);
      this.fleeing = true;
    },
    setLightExposure(detail) { this.lightExposureCalls.push(detail); },
    setFleeing(value) { this.fleeing = value; },
    update() {},
    vanish() { this.vanishCount += 1; },
    hide(options = {}) {
      this.hideCount += 1;
      this.hideOptions.push(options);
    },
    getSnapshot() {
      return {
        visible: this.spawnCalls.length > this.hideCount,
        animationKey: this.currentPose?.animationKey || null,
        frameName: this.currentPose?.frameName ?? null,
        observing: this.observeCalls.length > 0 && !this.fleeing,
        recoilActive: this.fleeing,
        lightReacting: this.lightExposureCalls.at(-1)?.pressure > 0,
        residue: { activeSprites: Math.min(3, this.fleeApplied.length) },
      };
    },
    destroy() { this.destroyed = true; },
  };
}

function createRuntimeFixture(mode = { enabled: true, review: false, dev10x: false }) {
  const mutations = { damage: 0, save: 0 };
  const soundCalls = [];
  const flashCalls = [];
  const statusCalls = [];
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
    cameras: {
      main: {
        worldView: { x: 0, y: 320, width: 900, height: 420 },
      },
    },
    lightSystem: {
      active: false,
      intensity: 1,
      isTorchActive() { return this.active; },
      getTorchIntensity() { return this.intensity; },
    },
    starSanctuarySnapshot: { nearIntactStar: false },
    worldModel: { damageTile() { mutations.damage += 1; } },
    queueDugTilesSave() { mutations.save += 1; },
    soundSystem: {
      playApprovedSfxFamily(...args) { soundCalls.push(args); },
    },
    screenFlashSystem: {
      flashCustom(...args) { flashCalls.push(args); },
    },
    hudSystem: {
      flashStatus(...args) { statusCalls.push(args); },
    },
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
  return {
    runtime,
    scene,
    view,
    mutations,
    soundCalls,
    flashCalls,
    statusCalls,
  };
}

assert.deepEqual(
  resolveShadowMinerMode("?shadowMiner=review&shadowMiner10x=1", "localhost"),
  { enabled: true, review: true, dev10x: true },
);
assert.deepEqual(
  resolveShadowMinerMode(
    "?shadowMiner=review&shadowMinerDepth=1400",
    "localhost",
  ),
  {
    enabled: true,
    review: true,
    dev10x: false,
    reviewDepthMeters: 1_400,
  },
);
assert.deepEqual(
  resolveShadowMinerMode(
    "?shadowMiner=review&shadowMinerDepth=1400",
    "understar.example",
  ),
  { enabled: true, review: false, dev10x: false },
  "remote hosts cannot simulate a depth band",
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
assert.ok(
  SHADOW_MINER_CONFIG.admission.minimumDistanceTiles
    > SHADOW_MINER_CONFIG.interaction.nearPlayerDistanceTiles,
);
assert.equal(SHADOW_MINER_CONFIG.visual.residue.maximumSprites, 3);
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

const shallowDepth = resolveShadowMinerDepthProfile(40);
const lowerDepth = resolveShadowMinerDepthProfile(400);
const deepDepth = resolveShadowMinerDepthProfile(800);
const abyssDepth = resolveShadowMinerDepthProfile(1_500);
assert.equal(shallowDepth.id, "shallow");
assert.equal(lowerDepth.id, "lower");
assert.equal(deepDepth.id, "deep");
assert.equal(abyssDepth.id, "abyss");
assert.ok(shallowDepth.visualIntensityMultiplier < abyssDepth.visualIntensityMultiplier);
assert.ok(shallowDepth.approachRateMultiplier < abyssDepth.approachRateMultiplier);
assert.ok(shallowDepth.lightResistanceMultiplier < abyssDepth.lightResistanceMultiplier);

const torchResponse = intensity => resolveShadowMinerLightResponse({
  nearIntactStarLight: false,
  torchActive: true,
  torchIntensity: intensity,
}, shallowDepth);
const dimTorch = torchResponse(0.25);
const normalTorch = torchResponse(1);
const overdriveTorch = torchResponse(1.75);
const abyssTorch = resolveShadowMinerLightResponse({
  nearIntactStarLight: false,
  torchActive: true,
  torchIntensity: 1,
}, abyssDepth);
const starLight = resolveShadowMinerLightResponse({
  nearIntactStarLight: true,
  torchActive: true,
  torchIntensity: 0.25,
}, abyssDepth);
assert.ok(dimTorch.repelDelayMs > normalTorch.repelDelayMs);
assert.ok(normalTorch.repelDelayMs > overdriveTorch.repelDelayMs);
assert.ok(normalTorch.repelDelayMs < abyssTorch.repelDelayMs);
assert.ok(dimTorch.visualPressure >= SHADOW_MINER_CONFIG
  .interaction.lightResponse.torch.minimumVisualPressure);
assert.equal(starLight.source, SHADOW_MINER_REPELLENTS.STAR);
assert.ok(starLight.repelDelayMs < abyssTorch.repelDelayMs);

const unlitEcho = resolveShadowMinerEchoPresentation({
  config: SHADOW_MINER_CONFIG,
  time: 2_000,
  arrivalStartedAtMs: -10_000,
  observeStartedAtMs: 0,
  recoilStartedAtMs: 0,
  observing: false,
  fleeing: false,
  lightPressure: 0,
});
const exposedEcho = resolveShadowMinerEchoPresentation({
  config: SHADOW_MINER_CONFIG,
  time: 2_000,
  arrivalStartedAtMs: -10_000,
  observeStartedAtMs: 0,
  recoilStartedAtMs: 0,
  observing: false,
  fleeing: false,
  lightPressure: 0.75,
});
assert.ok(exposedEcho.scale > unlitEcho.scale);
assert.ok(exposedEcho.alpha > unlitEcho.alpha);
assert.equal(
  mixShadowMinerColor(
    SHADOW_MINER_CONFIG.visual.tint,
    SHADOW_MINER_CONFIG.visual.lightRecoilTint,
    1,
  ),
  SHADOW_MINER_CONFIG.visual.lightRecoilTint,
);

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
  const playerTile = { tx: captureSprite.x / 64, ty: 70 };
  captureHistory.record(
    time,
    captureSprite,
    playerTile,
    time >= 1_350 ? {
      targetTile: { tx: playerTile.tx, ty: 71 },
      direction: { x: 0, y: 1 },
      tileType: 2,
    } : null,
  );
}
const capturedWindow = captureHistory.getWindowSummary(0, 1_800);
assert.equal(capturedWindow.ready, true);
assert.ok(capturedWindow.travelTiles >= 1.9);
assert.ok(capturedWindow.actionSamples > 0, "real dig poses are retained");
assert.equal(captureHistory.sampleAt(1_500).animationKey, "live-player-dig-down");
assert.equal(captureHistory.sampleAt(1_500).actionTargetOffsetY, 1);
assert.equal(captureHistory.sampleAt(1_500).actionDirectionY, 1);
assert.deepEqual(captureHistory.getNearestActionWindow(1_000), {
  startTime: 1_350,
  endTime: 1_800,
  samples: 11,
});
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

const acceleratedChanceMiss = createRuntimeFixture({
  enabled: true,
  review: false,
  dev10x: true,
});
acceleratedChanceMiss.runtime.random = () => 1;
acceleratedChanceMiss.runtime.update(8_000, 16, { tx: 9, ty: 70 }, {
  stressSnapshot: { armed: false, stressBand: "calm", stressRatio: 0 },
});
assert.equal(
  acceleratedChanceMiss.runtime.getHealthSnapshot().nextCheckAtMs,
  8_000 + SHADOW_MINER_CONFIG.production.checkIntervalMs / 10,
  "10x mode runs recurring admission checks exactly ten times more often",
);
acceleratedChanceMiss.runtime.destroy();

const abyssReview = createRuntimeFixture({
  enabled: true,
  review: true,
  dev10x: false,
  reviewDepthMeters: 1_400,
});
assert.equal(
  abyssReview.runtime.forceSpawn({ tx: 9, ty: 70 }, 8_000, {
    stressSnapshot: { armed: false, stressBand: "calm", stressRatio: 0 },
  }),
  true,
);
assert.equal(abyssReview.runtime.getHealthSnapshot().depthProfile.id, "abyss");
assert.equal(abyssReview.runtime.getHealthSnapshot().behavior.depthMeters, 1_400);
abyssReview.runtime.destroy();

const visibleAdmission = createRuntimeFixture();
visibleAdmission.scene.cameras.main.worldView = {
  x: 320,
  y: 320,
  width: 500,
  height: 420,
};
visibleAdmission.runtime.update(8_000, 16, { tx: 9, ty: 70 }, {
  stressSnapshot: { armed: false, stressBand: "calm", stressRatio: 0 },
});
let admissionSnapshot = visibleAdmission.runtime.getHealthSnapshot();
assert.equal(admissionSnapshot.state, SHADOW_MINER_STATES.SPAWNING);
assert.equal(admissionSnapshot.lastEntryVisible, true);
assert.ok(
  admissionSnapshot.lastEntryDistanceTiles
    >= SHADOW_MINER_CONFIG.admission.minimumDistanceTiles,
);
assert.ok(
  admissionSnapshot.lastEntryDistanceTiles
    <= SHADOW_MINER_CONFIG.admission.maximumDistanceTiles,
);
assert.ok(
  admissionSnapshot.replayWindow.selectedStartOffsetMs > 0,
  "admission advances to the first camera-safe recorded pose",
);
visibleAdmission.runtime.destroy();

const offscreenAdmission = createRuntimeFixture({
  enabled: true,
  review: false,
  dev10x: true,
});
offscreenAdmission.scene.cameras.main.worldView = {
  x: 1_000,
  y: 320,
  width: 500,
  height: 420,
};
offscreenAdmission.runtime.update(8_000, 16, { tx: 9, ty: 70 }, {
  stressSnapshot: { armed: false, stressBand: "calm", stressRatio: 0 },
});
admissionSnapshot = offscreenAdmission.runtime.getHealthSnapshot();
assert.equal(admissionSnapshot.state, SHADOW_MINER_STATES.DORMANT);
assert.equal(
  admissionSnapshot.nextCheckAtMs,
  8_000 + SHADOW_MINER_CONFIG.production.placementRetryMs / 10,
  "10x mode retries rejected offscreen admission exactly ten times faster",
);
offscreenAdmission.runtime.destroy();

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
assert.equal(snapshot.depthProfile.id, "shallow");
assert.equal(snapshot.behavior.depthMeters, 61);
assert.equal(approach.view.spawnCalls[0].visualIntensity, snapshot.behavior.visualIntensity);
assert.equal(approach.flashCalls.length, 1, "one purple awareness flash per admission");
assert.ok(approach.flashCalls[0][1] >= 0.27, "arrival flash is intentionally visible");
assert.equal(approach.statusCalls.length, 1, "arrival direction uses the shared status lane");
assert.match(approach.statusCalls[0][0], /SHADOW MINER NEARBY/);
const initialDistance = snapshot.distanceToPlayerTiles;

now += SHADOW_MINER_CONFIG.timing.spawnMs;
approach.runtime.update(now, 16, { tx: 9, ty: 70 }, criticalContext);
assert.equal(approach.runtime.getHealthSnapshot().state, SHADOW_MINER_STATES.APPROACHING);
const initialDelay = approach.runtime.getHealthSnapshot().playbackDelayMs;
now += 400;
approach.runtime.update(now, 400, { tx: 9, ty: 70 }, criticalContext);
snapshot = approach.runtime.getHealthSnapshot();
assert.equal(snapshot.state, SHADOW_MINER_STATES.APPROACHING);
assert.ok(snapshot.approachPlaybackRate < 1, "the ambient echo replays more slowly than the player");
assert.ok(snapshot.distanceToPlayerTiles < initialDistance, "silhouette closes distance");
for (let step = 0; step < 18; step += 1) {
  now += 100;
  approach.runtime.update(now, 100, { tx: 9, ty: 70 }, criticalContext);
  snapshot = approach.runtime.getHealthSnapshot();
  if (snapshot.state === SHADOW_MINER_STATES.OBSERVING) break;
}
assert.equal(snapshot.state, SHADOW_MINER_STATES.OBSERVING);
assert.ok(approach.runtime.stateDeadlineMs - now >= SHADOW_MINER_WORK.minimumObserveMs,
  "observation leaves enough time to read the independent mining loop");
assert.ok(
  snapshot.distanceToPlayerTiles > snapshot.behavior.nearPlayerDistanceTiles,
  "the last safe pose is retained instead of rendering an overshoot",
);
assert.ok(
  snapshot.distanceToPlayerTiles >= SHADOW_MINER_CONFIG.behavior.minimumPersonalSpaceTiles,
  "the silhouette never renders inside the hard personal-space radius",
);
const beforeFleePlayback = approach.runtime.playbackTimeMs;

approach.scene.lightSystem.active = true;
approach.scene.player.x = approach.view.anchor.x + 2 * approach.scene.config.tileSize;
now += 40;
approach.runtime.update(now, 40, { tx: 9, ty: 70 });
snapshot = approach.runtime.getHealthSnapshot();
assert.equal(snapshot.state, SHADOW_MINER_STATES.OBSERVING);
assert.equal(snapshot.lightInteraction.source, SHADOW_MINER_REPELLENTS.TORCH);
assert.ok(snapshot.lightInteraction.exposureProgress > 0);
assert.ok(snapshot.lightInteraction.exposureProgress < 1);
assert.equal(snapshot.view.lightReacting, true);
assert.ok(approach.view.lightExposureCalls.length > 0);
for (let step = 0; step < 30 && approach.runtime.state !== SHADOW_MINER_STATES.FLEEING; step++) {
  now += 100;
  approach.runtime.update(now, 100, { tx: 9, ty: 70 });
}
snapshot = approach.runtime.getHealthSnapshot();
assert.equal(snapshot.state, SHADOW_MINER_STATES.FLEEING);
assert.equal(snapshot.lastRepelledBy, SHADOW_MINER_REPELLENTS.TORCH);
assert.ok(approach.runtime.playbackTimeMs < beforeFleePlayback, "flee reverses trail");
assert.equal(approach.view.fleeing, true);
assert.equal(approach.view.beginFleeCalls.length, 1);
assert.ok(approach.view.fleeApplied.length > 0);
assert.deepEqual(approach.soundCalls[1], [
  SHADOW_MINER_CONFIG.audio.repelFamily,
  SHADOW_MINER_CONFIG.audio.torchRepelVolume,
  {
    rate: SHADOW_MINER_CONFIG.audio.torchRepelRate
      * snapshot.behavior.audioRateMultiplier,
  },
]);

now += SHADOW_MINER_CONFIG.interaction.fleeDurationMs + 1;
approach.runtime.update(now, SHADOW_MINER_CONFIG.interaction.fleeDurationMs + 1, {
  tx: 9,
  ty: 70,
});
assert.equal(approach.runtime.getHealthSnapshot().state, SHADOW_MINER_STATES.VANISHING);
now += SHADOW_MINER_CONFIG.timing.vanishMs;
approach.runtime.update(now, SHADOW_MINER_CONFIG.timing.vanishMs, { tx: 9, ty: 70 });
assert.equal(approach.runtime.getHealthSnapshot().state, SHADOW_MINER_STATES.DORMANT);
assert.equal(approach.view.hideOptions.at(-1).preserveResidue, true);
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
assert.equal(casual.view.observeCalls.length, 1);
assert.ok(casual.runtime.getHealthSnapshot().distanceToPlayerTiles < casualStartDistance);

const star = createRuntimeFixture();
now = 8_000;
assert.equal(star.runtime.forceSpawn({ tx: 9, ty: 70 }, now, criticalContext), true);
now += 80;
star.runtime.update(now, 80, { tx: 9, ty: 70 }, {
  stressSnapshot: criticalContext.stressSnapshot,
  nearIntactStarLight: true,
  torchActive: false,
});
assert.equal(star.runtime.getHealthSnapshot().state, SHADOW_MINER_STATES.FLEEING);
assert.equal(star.runtime.getHealthSnapshot().lastRepelledBy, SHADOW_MINER_REPELLENTS.STAR);
assert.deepEqual(star.soundCalls[1], [
  SHADOW_MINER_CONFIG.audio.repelFamily,
  SHADOW_MINER_CONFIG.audio.starRepelVolume,
  {
    rate: SHADOW_MINER_CONFIG.audio.starRepelRate
      * star.runtime.getHealthSnapshot().behavior.audioRateMultiplier,
  },
]);

const sources = {};
for (const [key, path] of Object.entries({
  setup: "../world/playScene/PlaySceneSetup.js",
  update: "../world/playScene/PlaySceneUpdate.js",
  lifecycle: "../world/playScene/PlaySceneLifecycle.js",
  runtime: "../world/playScene/ShadowMinerRuntime.js",
  view: "../world/playScene/ShadowMinerView.js",
  phantomDig: "../world/playScene/ShadowMinerPhantomDigView.js",
  awareness: "../world/playScene/shadowMinerArrivalAwareness.js",
  residue: "../world/playScene/ShadowMinerResidueTrail.js",
  admission: "../world/playScene/shadowMinerAdmission.js",
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
assert.match(sources.view, /mixShadowMinerColor/);
assert.match(sources.view, /setTintFill\(this\.config\.visual\.echoTint\)/);
assert.match(sources.view, /applyPose\(pose\)/);
assert.match(sources.view, /applyFleePose\(pose, time, playerWorldX\)/);
assert.match(sources.view, /faceAwayFromPlayer\(playerWorldX\)/);
assert.match(sources.view, /residueTrail\.stamp/);
assert.match(sources.view, /phantomDig\.applyPose/);
assert.match(sources.view, /phantomDig\.cancelAction/);
assert.match(sources.phantomDig, /stageTileTypes/);
assert.match(sources.phantomDig, /breakCoreTextureKey/);
assert.match(sources.awareness, /flashCustom/);
assert.match(sources.residue, /entries\.length >= residueConfig\.maximumSprites/);
assert.match(sources.runtime, /selectShadowMinerAdmissionPose\(/);
assert.match(sources.runtime, /resolveShadowMinerLightResponse\(/);
assert.match(sources.runtime, /resolveShadowMinerDepthProfile\(/);
assert.match(sources.admission, /history\.findFirstPose/);
assert.match(sources.runtime, /preserveResidue: true/);
assert.doesNotMatch(sources.runtime, /damageTile|queueDugTilesSave|setTile\(/);
assert.doesNotMatch(sources.phantomDig, /damageTile|queueDugTilesSave|setTile\(/);
assert.match(sources.preview, /system\.history\.replaceSamples\(samples\)/);
assert.match(sources.preview, /setTorchActive\(scene, true/);
assert.match(sources.preview, /setGemPowerExact\?\.\(originalGp/);
assert.match(sources.preview, /const originalPlayerTile =/);
assert.match(sources.preview, /tutorialSafety\.isBlocked = \(\) => false/);
assert.match(sources.preview, /tutorialSafety\.isBlocked = originalSafetyPolicy/);
assert.doesNotMatch(sources.preview, /queueDugTilesSave|damageTile/);
assert.doesNotMatch(sources.view, /ASSET_KEYS\.shadowMiner|shadow-miner-idle-sheet/);
assert.doesNotMatch(sources.boot, /load\.spritesheet\(ASSET_KEYS\.shadowMiner\.idleSheet/);
assert.match(sources.readme, /shadowMiner10x=1/);

approach.runtime.destroy();
casual.runtime.destroy();
star.runtime.destroy();
assert.equal(approach.view.destroyed, true);

console.log(
  "shadow miner signature echo contract: visible entry, depth bands, continuous light hesitation/echo, player pose replay, directed torch/Star flee, bounded residue, exact local 10x cadence, no mutation without mining assets, and lifecycle passed",
);
