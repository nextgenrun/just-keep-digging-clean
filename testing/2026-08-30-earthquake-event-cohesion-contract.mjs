import assert from "node:assert/strict";

import { EarthquakeSystem } from "../systems/environment/EarthquakeSystem.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { EARTHQUAKE_CONFIG } from "../values/earthquakes.js";
import { EARTHQUAKE_FEEDBACK_CONFIG } from "../values/earthquakeFeedback.js";
import { EarthquakeHazardOverlay } from
  "../systems/visual/EarthquakeHazardOverlay.js";
import {
  resolveEarthquakeFeedbackMode,
  resolveEarthquakeFeedbackPresentation,
} from "../systems/visual/earthquakeFeedbackPresentation.js";

function withRandom(value, callback) {
  const original = Math.random;
  Math.random = () => value;
  try {
    return callback();
  } finally {
    Math.random = original;
  }
}

assert.deepEqual(EARTHQUAKE_CONFIG.firstEventIntervalMs, [120000, 180000]);
assert.deepEqual(EARTHQUAKE_CONFIG.baseIntervalMs, [360000, 600000]);
assert.ok(
  EARTHQUAKE_CONFIG.firstEventIntervalMs[1]
    < EARTHQUAKE_CONFIG.baseIntervalMs[0],
  "the first eligible quake should arrive sooner without increasing repeat spam",
);
assert.ok(EARTHQUAKE_CONFIG.chainDelayMs[1] <= 10000);
for (const intensity of Object.values(EARTHQUAKE_CONFIG.intensities)) {
  assert.equal(
    "shake" in intensity,
    false,
    "cameraShake.js remains the only earthquake shake authority",
  );
}

{
  const system = Object.assign(Object.assign(Object.create(EarthquakeSystem.prototype), { heartbeat: 0, _eventFallZonesQueued: 0, health: { started: 0, completed: 0, queued: 0, rocks: 0, hits: 0, cancelledCeilings: 0, emptySearches: 0 } }), {
    config: EARTHQUAKE_CONFIG,
    paused: false,
    suppressed: false,
    state: "idle",
    nextEventMs: 999999,
    nextEventSchedule: "repeat",
    _firstEligibleScheduleApplied: false,
    scene: {
      retentionProgressSystem: {
        getJournalSnapshot: () => ({ stats: { earthquakesSurvived: 0 } }),
      },
    },
    _getDepth: () => 250,
    _debugEnabled: () => false,
    _log() {},
  });

  withRandom(0, () => system.setPaused(false));
  assert.equal(system.nextEventSchedule, "first");
  assert.equal(
    system.nextEventMs,
    EARTHQUAKE_CONFIG.firstEventIntervalMs[0] * 0.9,
    "first eligibility should use the short discovery window and live depth band",
  );

  system.nextEventMs = 4242;
  system.setPaused(false);
  assert.equal(
    system.nextEventMs,
    4242,
    "repeated availability sync must not reset the first-event timer",
  );

  system.setPaused(true);
  system.setPaused(false);
  assert.equal(
    system.nextEventMs,
    4242,
    "later pause/resume cycles must not keep resetting the first-event timer",
  );
}

{
  const system = Object.assign(Object.assign(Object.create(EarthquakeSystem.prototype), { heartbeat: 0, _eventFallZonesQueued: 0, health: { started: 0, completed: 0, queued: 0, rocks: 0, hits: 0, cancelledCeilings: 0, emptySearches: 0 } }), {
    config: EARTHQUAKE_CONFIG,
    state: "idle",
    epicenter: null,
    intensity: null,
    stateRemaining: 0,
    stateTotalMs: 0,
    caveIns: [],
    fallingRocks: [],
    chainPending: false,
    chainTimer: 0,
    nextEventMs: 4242,
    nextEventSchedule: "first",
    suppressed: false,
    _restoreQueue: [],
    stressFx: { clear() {} },
    scene: {
      soundSystem: { stopSeismicWarning() {} },
      cameras: { main: {} },
      shakeSystem: { stop() {} },
      earthquakeFeedbackUI: { reset() {} },
      earthquakeHazardOverlay: { clear() {} },
    },
    _log() {},
  });
  system.cancelActiveHazards();
  assert.equal(
    system.nextEventMs,
    4242,
    "an idle safety cancellation must preserve the already-earned countdown",
  );
  assert.equal(system.nextEventSchedule, "first");
}

{
  let finishes = 0;
  const system = Object.assign(Object.assign(Object.create(EarthquakeSystem.prototype), { heartbeat: 0, _eventFallZonesQueued: 0, health: { started: 0, completed: 0, queued: 0, rocks: 0, hits: 0, cancelledCeilings: 0, emptySearches: 0 } }), {
    config: EARTHQUAKE_CONFIG,
    state: "aftermath",
    stateRemaining: -1,
    stateTotalMs: 5000,
    caveIns: [{ id: 1 }],
    fallingRocks: [],
    chainPending: false,
    chainTimer: 0,
    impactCooldown: 0,
    paused: false,
    _stressTimer: 1000,
    syncSuppression: () => false,
    _updateFallingRocks() {},
    _updateCaveIns() {},
    _updateRubbleRestoration() {},
    _finishEvent() { finishes += 1; },
  });
  system.update(16);
  assert.equal(finishes, 0, "aftermath must wait for its warned cave-in");
  system.caveIns.length = 0;
  system.chainPending = true;
  system.chainTimer = 5000;
  system.update(16);
  assert.equal(finishes, 0, "aftermath must retain intensity while an aftershock is pending");
  system.chainPending = false;
  system.update(16);
  assert.equal(finishes, 1, "the event may finish once every fall-zone hazard settles");
}

{
  const grid = {
    getTileType(_tx, ty) {
      if (ty === 5) return TILE_TYPES.STONE;
      if (ty === 6 || ty === 7) return TILE_TYPES.AIR;
      return TILE_TYPES.DIRT;
    },
    getTileHp: () => 10,
  };
  const system = Object.assign(Object.assign(Object.create(EarthquakeSystem.prototype), { heartbeat: 0, _eventFallZonesQueued: 0, health: { started: 0, completed: 0, queued: 0, rocks: 0, hits: 0, cancelledCeilings: 0, emptySearches: 0 } }), {
    config: EARTHQUAKE_CONFIG,
    intensity: "major",
    caveIns: [],
    fallingRocks: [],
    _nextFallZoneId: 0,
    scene: { worldModel: grid },
    _log() {},
  });
  const queued = system._queueCaveInGroup({ tx: 10, ty: 5 }, true);
  assert.equal(queued, 2, "a major aftershock keeps its two-column intensity");
  assert.equal(system.caveIns.every(zone => zone.chain === true), true);
}

{
  const source = {
    state: "aftermath",
    intensity: "major",
    stateRemaining: 0,
    isPlayerAware: () => true,
  };
  const mode = resolveEarthquakeFeedbackMode({
    escapeActive: false,
    aftershockActive: true,
    state: source.state,
    suppressedSourceState: source.state,
    source,
  });
  assert.equal(mode, "aftershock");
  const presentation = resolveEarthquakeFeedbackPresentation({
    mode,
    source,
    escapeExpiresAt: 0,
    now: 0,
    scene: {},
    config: EARTHQUAKE_FEEDBACK_CONFIG,
  });
  assert.equal(presentation.title, "AFTERSHOCK");
  assert.equal(presentation.detail, "LEAVE MARKED GROUND");
}

{
  let reactions = 0;
  const body = { x: 485, y: 450, w: 31, h: 75 };
  const system = Object.assign(Object.assign(Object.create(EarthquakeSystem.prototype), { heartbeat: 0, _eventFallZonesQueued: 0, health: { started: 0, completed: 0, queued: 0, rocks: 0, hits: 0, cancelledCeilings: 0, emptySearches: 0 } }), {
    config: EARTHQUAKE_CONFIG,
    fallingRocks: [{
      id: 1,
      tx: 5, ty: 3, landingTy: 7,
      x: 500,
      y: 440,
      previousY: 430,
      endY: 600,
      vy: 200,
      angle: 0,
      hit: false,
    }],
    impactCooldown: 0,
    scene: {
      config: { tileSize: 94 },
      gameState: "playing",
      playerController: {
        physicsBody: body,
        drainAllGemPower: () => 50,
        applyExternalKnockback() {},
      },
      playPlayerImpactReaction: () => { reactions += 1; },
      shakeSystem: { shake() {} },
    },
    _log() {},
    _emitDust() {},
  });
  system._updateFallingRocks(100);
  assert.equal(reactions, 1, "a real boulder hit should trigger the authored player reaction");
}

{
  const overlay = Object.assign(Object.create(EarthquakeHazardOverlay.prototype), {
    config: EARTHQUAKE_FEEDBACK_CONFIG,
    scene: { config: { tileSize: 32 } },
    source: {
      caveIns: [
        { tx: 20, landingTy: 4, remaining: 120 },
        { tx: 15, landingTy: 4, remaining: 900 },
      ],
      fallingRocks: [{ x: 700, endY: 160 }],
    },
  });
  const ranked = overlay._offscreenHazards({
    x: 0,
    y: 0,
    width: 320,
    height: 240,
  });
  assert.equal(ranked[0].phasePriority, 0, "an already-falling rock owns the edge warning");
  assert.equal(ranked[1].urgencyMs, 120, "warned zones then rank by time to collapse");
}

console.log("earthquake event cohesion contract passed");
