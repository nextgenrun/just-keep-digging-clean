import { SHADOW_MINER_WORK } from "../values/shadowMinerWork.js";
import assert from "node:assert/strict";

import {
  SHADOW_MINER_BEHAVIORS,
  SHADOW_MINER_CONFIG,
  SHADOW_MINER_ENCOUNTER_BANDS,
  SHADOW_MINER_STATES,
  resolveShadowMinerMode,
} from "../values/shadowMiner.js";
import { ShadowMinerPoseHistory } from
  "../world/playScene/ShadowMinerPoseHistory.js";
import { ShadowMinerRuntime } from
  "../world/playScene/ShadowMinerRuntime.js";
import {
  createShadowMinerBehaviorPlan,
  pickShadowMinerPersonality,
  pickShadowMinerRange,
} from "../world/playScene/shadowMinerBehaviorPlan.js";
import { selectShadowMinerAdmissionPose } from
  "../world/playScene/shadowMinerAdmission.js";

const AMBIENT = SHADOW_MINER_ENCOUNTER_BANDS.AMBIENT;
const CRITICAL = SHADOW_MINER_ENCOUNTER_BANDS.CRITICAL;
const personalities = SHADOW_MINER_CONFIG.behavior.personalities;

function randomSequence(values, fallback = 0.5) {
  let index = 0;
  return () => values[index++] ?? fallback;
}

function makePose(time, x, action = false) {
  return {
    time,
    x,
    y: 512,
    tileX: x / 64,
    tileY: 70,
    textureKey: action ? "player-dig-sheet" : "player-walk-sheet",
    frameName: Math.floor(time / 100) % 8,
    animationKey: action ? "player-dig-down" : "player-walk-loop",
    frameIndex: Math.floor(time / 100) % 8,
    flipX: false,
    originX: 0.5,
    originY: 1,
    displayWidth: 101,
    displayHeight: 101,
    action,
  };
}

function createHistory() {
  const history = new ShadowMinerPoseHistory(64);
  const samples = [];
  for (let time = 0; time <= 8_000; time += 50) {
    const action = time >= 3_500 && time <= 5_000;
    samples.push(makePose(time, 100 + (time / 8_000) * 512, action));
  }
  history.replaceSamples(samples);
  return history;
}

function createRuntime(behaviorId, random = () => 0.5) {
  const mutations = { damage: 0, save: 0 };
  const soundCalls = [];
  const view = {
    poses: [],
    spawn(detail) { this.spawnDetail = detail; return true; },
    applyPose(pose) { this.poses.push(pose); return true; },
    applyFleePose(pose) { this.poses.push(pose); return true; },
    beginObserve() {},
    beginFlee() {},
    setLightExposure() {},
    facePlayer() {},
    update() {},
    vanish() {},
    hide() {},
    getSnapshot() { return { visible: true }; },
    destroy() {},
  };
  const scene = {
    time: { now: 0 },
    config: { tileSize: 64, topAirRows: 10 },
    player: { x: 612, y: 512 },
    cameras: {
      main: { worldView: { x: 0, y: 320, width: 900, height: 420 } },
    },
    lightSystem: {
      active: false,
      isTorchActive() { return this.active; },
      getTorchIntensity() { return 1; },
    },
    worldModel: { damageTile() { mutations.damage += 1; } },
    queueDugTilesSave() { mutations.save += 1; },
    soundSystem: {
      playApprovedSfxFamily(...args) { soundCalls.push(args); },
    },
  };
  const mode = {
    enabled: true,
    review: false,
    dev10x: false,
    ...(behaviorId ? { behaviorId } : {}),
  };
  const runtime = new ShadowMinerRuntime(scene, {
    mode,
    random,
    history: createHistory(),
    view,
  });
  return { runtime, scene, view, mutations, soundCalls };
}

assert.deepEqual(
  resolveShadowMinerMode(
    "?shadowMiner=review&shadowMinerBehavior=stalker",
    "localhost",
  ),
  {
    enabled: true,
    review: true,
    dev10x: false,
    behaviorId: SHADOW_MINER_BEHAVIORS.STALKER,
  },
);
assert.deepEqual(
  resolveShadowMinerMode(
    "?shadowMiner=review&shadowMinerBehavior=stalker",
    "understar.example",
  ),
  { enabled: true, review: false, dev10x: false },
  "remote hosts cannot force a personality",
);
assert.equal(personalities.length, 3);
assert.equal(pickShadowMinerRange([10, 20], () => 0.25), 12.5);
assert.ok(pickShadowMinerRange([10, 20], () => 1) < 20);

const lurkerProfile = personalities.find(
  profile => profile.id === SHADOW_MINER_BEHAVIORS.LURKER,
);
const stalkerProfile = personalities.find(
  profile => profile.id === SHADOW_MINER_BEHAVIORS.STALKER,
);
assert.ok(lurkerProfile.weights[AMBIENT] > lurkerProfile.weights[CRITICAL]);
assert.ok(stalkerProfile.weights[CRITICAL] > stalkerProfile.weights[AMBIENT]);
assert.equal(
  pickShadowMinerPersonality(personalities, AMBIENT, () => 0.05).id,
  SHADOW_MINER_BEHAVIORS.LURKER,
);
assert.equal(
  pickShadowMinerPersonality(personalities, AMBIENT, () => 0.55).id,
  SHADOW_MINER_BEHAVIORS.MIMIC,
);
assert.equal(
  pickShadowMinerPersonality(personalities, AMBIENT, () => 0.95).id,
  SHADOW_MINER_BEHAVIORS.STALKER,
);

const ambientProfile = SHADOW_MINER_CONFIG.panic.profiles[AMBIENT];
const makePlan = behaviorId => createShadowMinerBehaviorPlan(
  SHADOW_MINER_CONFIG,
  AMBIENT,
  ambientProfile,
  { random: () => 0.5, forcedBehaviorId: behaviorId },
);
const lurkerPlan = makePlan(SHADOW_MINER_BEHAVIORS.LURKER);
const mimicPlan = makePlan(SHADOW_MINER_BEHAVIORS.MIMIC);
const stalkerPlan = makePlan(SHADOW_MINER_BEHAVIORS.STALKER);
assert.ok(Object.isFrozen(lurkerPlan));
assert.ok(lurkerPlan.targetDistanceTiles > stalkerPlan.targetDistanceTiles);
assert.ok(lurkerPlan.approachPlaybackRate < stalkerPlan.approachPlaybackRate);
assert.ok(lurkerPlan.nearPlayerDistanceTiles > stalkerPlan.nearPlayerDistanceTiles);
assert.ok(lurkerPlan.observeMs > stalkerPlan.observeMs);
assert.ok(lurkerPlan.audioRateMultiplier < stalkerPlan.audioRateMultiplier);
assert.equal(lurkerPlan.preferActionPose, false);
assert.equal(mimicPlan.preferActionPose, true);
assert.equal(lurkerPlan.performObserveDig, false);
assert.equal(mimicPlan.performObserveDig, true);
assert.equal(stalkerPlan.performObserveDig, true);

const shallowBand = SHADOW_MINER_CONFIG.depthIntensity.bands.find(
  band => band.id === "shallow",
);
const abyssBand = SHADOW_MINER_CONFIG.depthIntensity.bands.find(
  band => band.id === "abyss",
);
const makeDepthPlan = depthProfile => createShadowMinerBehaviorPlan(
  SHADOW_MINER_CONFIG,
  AMBIENT,
  ambientProfile,
  {
    random: () => 0.5,
    forcedBehaviorId: SHADOW_MINER_BEHAVIORS.MIMIC,
    depthProfile,
    depthMeters: depthProfile.minimumDepthMeters,
  },
);
const shallowPlan = makeDepthPlan(shallowBand);
const abyssPlan = makeDepthPlan(abyssBand);
assert.equal(shallowPlan.depthBandId, "shallow");
assert.equal(abyssPlan.depthBandId, "abyss");
assert.ok(shallowPlan.visualIntensity < abyssPlan.visualIntensity);
assert.ok(shallowPlan.approachPlaybackRate < abyssPlan.approachPlaybackRate);
assert.ok(shallowPlan.observeMs > abyssPlan.observeMs);
assert.ok(shallowPlan.fleePlaybackRate < abyssPlan.fleePlaybackRate);
assert.ok(
  shallowPlan.lightResistanceMultiplier < abyssPlan.lightResistanceMultiplier,
);

const admissionScene = {
  config: { tileSize: 64 },
  player: { x: 612, y: 512 },
  cameras: {
    main: { worldView: { x: 0, y: 320, width: 900, height: 420 } },
  },
};
const mimicAdmission = selectShadowMinerAdmissionPose(
  createHistory(),
  admissionScene,
  SHADOW_MINER_CONFIG,
  2_500,
  7_500,
  { targetDistanceTiles: 3.45, preferActionPose: true },
);
assert.equal(mimicAdmission.action, true, "mimic favors a recorded dig pose");

const criticalContext = {
  stressSnapshot: { armed: true, stressBand: "critical", stressRatio: 1 },
  torchActive: false,
  torchIntensity: 0,
  nearIntactStarLight: false,
};
for (const behaviorId of Object.values(SHADOW_MINER_BEHAVIORS)) {
  const fixture = createRuntime(behaviorId);
  let now = 8_000;
  assert.equal(
    fixture.runtime.forceSpawn({ tx: 9, ty: 70 }, now, criticalContext),
    true,
  );
  let snapshot = fixture.runtime.getHealthSnapshot();
  assert.equal(snapshot.state, SHADOW_MINER_STATES.SPAWNING);
  assert.equal(snapshot.behavior.id, behaviorId);
  assert.equal(fixture.view.spawnDetail.visualIntensity, snapshot.behavior.visualIntensity);

  now += SHADOW_MINER_CONFIG.timing.spawnMs + snapshot.behavior.approachHoldMs;
  fixture.runtime.update(now, 16, { tx: 9, ty: 70 }, criticalContext);
  assert.equal(fixture.runtime.getHealthSnapshot().state, SHADOW_MINER_STATES.APPROACHING);
  const playbackBefore = fixture.runtime.playbackTimeMs;
  now += 400;
  fixture.runtime.update(now, 400, { tx: 9, ty: 70 }, criticalContext);
  const playbackAdvance = fixture.runtime.playbackTimeMs - playbackBefore;
  assert.ok(Math.abs(
    playbackAdvance - 400 * snapshot.behavior.approachPlaybackRate,
  ) < 0.001);

  // Let the readable arrival grace finish with normal-sized frames.
  while (now < 8000 + SHADOW_MINER_WORK.torchArrivalGraceMs) {
    now += 100;
    fixture.runtime.update(now, 100, { tx: 9, ty: 70 }, criticalContext);
  }
  fixture.view.anchor = { ...fixture.runtime.history.sampleAt(fixture.runtime.playbackTimeMs) };
  fixture.scene.player.x = fixture.view.anchor.x + fixture.scene.config.tileSize * 2;
  fixture.scene.lightSystem.active = true;
  now += 40;
  fixture.runtime.update(now, 40, { tx: 9, ty: 70 }, {
    stressSnapshot: criticalContext.stressSnapshot,
  });
  snapshot = fixture.runtime.getHealthSnapshot();
  assert.ok(snapshot.lightInteraction.exposureProgress > 0);
  assert.ok(snapshot.lightInteraction.exposureProgress < 1);
  for (let step = 0; step < 30 && fixture.runtime.state !== SHADOW_MINER_STATES.FLEEING; step++) {
    now += 100;
    fixture.runtime.update(now, 100, { tx: 9, ty: 70 }, {
      stressSnapshot: criticalContext.stressSnapshot,
    });
  }
  snapshot = fixture.runtime.getHealthSnapshot();
  assert.equal(snapshot.state, SHADOW_MINER_STATES.FLEEING);
  assert.equal(
    fixture.soundCalls[1][2].rate,
    SHADOW_MINER_CONFIG.audio.torchRepelRate
      * snapshot.behavior.audioRateMultiplier,
  );
  assert.deepEqual(fixture.mutations, { damage: 0, save: 0 });
  fixture.runtime.destroy();
}

for (const [roll, behaviorId] of [
  [0.05, SHADOW_MINER_BEHAVIORS.LURKER],
  [0.55, SHADOW_MINER_BEHAVIORS.MIMIC],
  [0.95, SHADOW_MINER_BEHAVIORS.STALKER],
]) {
  const fixture = createRuntime(null, randomSequence([roll]));
  assert.equal(
    fixture.runtime.forceSpawn({ tx: 9, ty: 70 }, 8_000, {
      stressSnapshot: { armed: false, stressBand: "calm", stressRatio: 0 },
    }),
    true,
  );
  assert.equal(fixture.runtime.getHealthSnapshot().behavior.id, behaviorId);
  fixture.runtime.destroy();
}

console.log(
  "shadow miner dynamic behavior contract: weighted personalities, bounded numeric rolls, action-biased admission, coherent depth plans, light hesitation, local overrides, and no mutation without mining assets passed",
);
