import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { RANDOM_EVENT_TYPES, RANDOM_EVENT_TYPE_ORDER,
  RANDOM_WORLD_EVENT_CONFIG, resolveRandomEventFlags } from "../values/randomWorldEvents.js";
import { RandomEventDirector, sanitizeRandomEventData } from "../systems/events/RandomEventDirector.js";
import { RandomEventBridge } from "../world/playScene/RandomEventBridge.js";
import { buildRandomEventPlans } from "../world/playScene/RandomEventPlanner.js";
import { GraveborerWurmSystem } from "../systems/environment/GraveborerWurmSystem.js";
import { resolveGraveborerWurmActivation, recordGraveborerWurmMiningNoise } from "../world/playScene/GraveborerWurmBridge.js";
import { GRAVEBORER_WURM_CONFIG as wurmCfg } from "../values/graveborerWurm.js";
import { ShadowMinerRuntime } from "../world/playScene/ShadowMinerRuntime.js";
import { EarthquakeSystem } from "../systems/environment/EarthquakeSystem.js";
import { EARTHQUAKE_CONFIG } from "../values/earthquakes.js";
import { DYNAMIC_EVENT_REVIEW as cfg } from "../values/dynamicEventReview.js";
import { createReviewWorld, seedReviewTrail } from "./dynamic-event-sandbox/reviewWorld.js";
import { checkRetiredAdmission, createReviewRandom, withReviewRandom } from "./dynamic-event-sandbox/reviewSupport.js";

const retired = [RANDOM_EVENT_TYPES.MONEY_MONSTER_RUSH, RANDOM_EVENT_TYPES.BLACKOUT_BLOOM, "lumenBloom"];
assert.deepEqual(RANDOM_EVENT_TYPE_ORDER, [RANDOM_EVENT_TYPES.CRYSTAL_CHOIR, RANDOM_EVENT_TYPES.SIGNAL]);
assert.ok(checkRetiredAdmission().every(result => result.blocked));
for (const type of retired) {
  const flags = resolveRandomEventFlags(`?${type}=1&jkd_e2e=1&randomEventDebug=1&randomEvent=${type}`);
  assert.notEqual(flags[type], true);
  assert.equal(flags.forcedType, null);
  const director = new RandomEventDirector(cfg.seed, { debug: true, forcedType: type });
  const before = director.getSaveData();
  assert.equal(director.start(type, { targetResource: "gold" }), null);
  assert.deepEqual(director.getSaveData(), before, "rejected direct starts cannot consume state");
  for (let index = 0; index < 200; index++) {
    director.state.serial = index;
    assert.equal(director.chooseNextType([...retired, RANDOM_EVENT_TYPES.CRYSTAL_CHOIR]), RANDOM_EVENT_TYPES.CRYSTAL_CHOIR);
  }
  for (const version of [1, 2, RANDOM_WORLD_EVENT_CONFIG.version]) {
    const legacy = { version, serial: 9, cooldownMs: 0,
      active: { id: "legacy", type, targetResource: "gold", remainingMs: 12000 },
      recentTypes: [type, RANDOM_EVENT_TYPES.CRYSTAL_CHOIR],
      recentResources: ["gold"], completedChoirs: ["saved-choir"],
      stats: { started: 9, completed: 4, interrupted: 2 } };
    const migrated = sanitizeRandomEventData(legacy, cfg.seed);
    assert.equal(migrated.active, null);
    assert.deepEqual(migrated.recentTypes, [RANDOM_EVENT_TYPES.CRYSTAL_CHOIR]);
    assert.deepEqual(migrated.completedChoirs, legacy.completedChoirs);
    assert.deepEqual(migrated.stats, legacy.stats);
    assert.deepEqual(migrated.recentResources, legacy.recentResources);
    assert.equal(migrated.cooldownMs, RANDOM_WORLD_EVENT_CONFIG.scheduler.retryCooldownMs);
    assert.deepEqual(sanitizeRandomEventData(migrated), migrated);
    let saves = 0;
    const bridge = Object.assign(Object.create(RandomEventBridge.prototype), {
      director: new RandomEventDirector(cfg.seed), flags: { master: true, crystalChoir: true },
      scene: { queueDugTilesSave: () => saves++, digSystem: { getResourceTotals: () => ({}) } },
      jackpot: { reconcileAfterLoad() {} },
    });
    bridge.loadSaveData(legacy);
    assert.equal(saves, 1, "retired records queue a cleaned save even at the current version");
  }
}
const world = createReviewWorld(300);
const tile = { tx: cfg.world.centerTx, ty: world.standingTy };
const planningScene = { config: cfg.world, worldModel: world, upgradeSystem: { isGemPowerUnlocked: () => true } };
assert.equal(buildRandomEventPlans(planningScene, tile, new RandomEventDirector()).plans?.blackoutBloom, undefined);
const admissionBridge = Object.assign(Object.create(RandomEventBridge.prototype), {
  flags: { blackoutBloom: true, moneyMonsterRush: true },
});
assert.equal(admissionBridge._featureEnabled(RANDOM_EVENT_TYPES.BLACKOUT_BLOOM), false);
assert.equal(admissionBridge._featureEnabled(RANDOM_EVENT_TYPES.MONEY_MONSTER_RUSH), false);

// Exercise the live Wurm gate/noise bridge, not a parallel eligibility formula.
const gateScene = { config: cfg.world, hardcoreModeData: { mode: "casual", armed: false },
  upgradeSystem: { isGemPowerUnlocked: () => true },
  playerController: { getPlayerTile: () => tile } };
const wurm = new GraveborerWurmSystem();
gateScene.graveborerWurmRuntime = { system: wurm };
assert.equal(resolveGraveborerWurmActivation(gateScene, tile, wurm).productionActive, false);
recordGraveborerWurmMiningNoise(gateScene, "normal", tile);
assert.equal(wurm.noise, 0);
gateScene.hardcoreModeData = { mode: "hardcore", armed: true };
gateScene.upgradeSystem.isGemPowerUnlocked = () => false;
assert.equal(resolveGraveborerWurmActivation(gateScene, tile, wurm).productionActive, false);
gateScene.upgradeSystem.isGemPowerUnlocked = () => true;
assert.equal(resolveGraveborerWurmActivation(gateScene, { ...tile, ty: cfg.world.topAirRows + 118 }, wurm).productionActive, false);
assert.equal(resolveGraveborerWurmActivation(gateScene, tile, wurm).productionActive, true);
const context = { active: true, playerTile: tile, worldWidthTiles: cfg.world.widthTiles, depth: 300 };
for (let ms = 0; ms < wurmCfg.timing.initialCooldownMs; ms += cfg.stepMs) wurm.update(cfg.stepMs, context);
assert.equal(wurm.phase, "dormant", "elapsed cooldown alone cannot start a quiet hunt");
for (let index = 0; index < 20; index++) recordGraveborerWurmMiningNoise(gateScene, "normal", tile);
wurm.update(cfg.stepMs, context);
assert.equal(wurm.phase, "warning", "valid noise and expired cooldown admit the encounter");
assert.equal(resolveGraveborerWurmActivation(gateScene, { ...tile, ty: 65 }, wurm).productionActive, true,
  "a committed hunt continues when the player retreats above its entry depth");
const phases = new Set();
for (let ms = 0; ms < cfg.sequenceTimeoutMs && wurm.phase !== "cooldown"; ms += cfg.stepMs) {
  wurm.update(cfg.stepMs, context);
  phases.add(wurm.phase);
}
assert.ok(phases.has("burrowing"));
assert.equal(wurm.phase, "cooldown");
assert.ok(wurm.drainEvents().some(event => event.type === "encounter-complete"));
const count = wurm.encounterCount;
wurm.forceEncounter(tile);
wurm.update(cfg.stepMs, context);
assert.equal(wurm.encounterCount, count + 1, "the same controller can admit another encounter");

// Shadowminer's failure reasons distinguish a random miss from absent history.
const ts = cfg.world.tileSize;
const player = { x: cfg.world.centerTx * ts, y: (world.standingTy + 1) * ts,
  texture: { key: cfg.assets.idle.key }, frame: { name: 0 }, displayWidth: 109, displayHeight: 109,
  originX: 0.5, originY: 0.89, setPosition(x, y) { this.x = x; this.y = y; return this; } };
const shadowScene = { config: cfg.world, worldModel: world, player, clockMs: cfg.trail.durationMs * 2,
  time: { now: cfg.trail.durationMs * 2 },
  playerController: { physicsBody: { x: player.x, w: cfg.world.bodyWidth } },
  cameras: { main: { worldView: { x: (cfg.world.centerTx - 11) * ts,
    y: player.y - 900, width: 22 * ts, height: 1100 } } } };
const shadow = new ShadowMinerRuntime(shadowScene, { mode: { enabled: true, review: false, dev10x: false },
  random: () => 0, view: { spawn: () => true, update() {}, destroy() {} } });
shadowScene.shadow = shadow;
assert.equal(shadow.forceSpawn(tile, shadowScene.clockMs), false);
assert.equal(shadow.getHealthSnapshot().lastSpawnAttempt.reason, "placement");
shadow.update(shadowScene.clockMs + 45000, 25, { tx: tile.tx, ty: cfg.world.topAirRows + 1 });
assert.equal(shadow.getHealthSnapshot().lastSpawnAttempt.reason, "depth");
shadow.random = () => 1;
shadow.update(shadowScene.clockMs + 90000, 25, tile);
assert.equal(shadow.getHealthSnapshot().lastSpawnAttempt.reason, "chance");
shadow.random = () => 0;
seedReviewTrail(shadowScene);
assert.equal(shadow.forceSpawn(tile, shadowScene.clockMs), true);
assert.equal(shadow.getHealthSnapshot().lastSpawnAttempt.spawned, true);
shadow.destroy();

// Review clock controls real rubble due times without changing production's default.
let now = 1000, restored = 0;
const quake = Object.assign(Object.create(EarthquakeSystem.prototype), {
  config: EARTHQUAKE_CONFIG, clockNow: () => now, _restoreQueue: [], _restoreQueueSorted: true,
  scene: { worldModel: { getTileType: () => 0, setRubbleTile: () => { restored++; return true; } } },
  _getPlayerOccupiedTileKeys: () => new Set(), _isTileNearPlayer: () => false, _emitDust() {},
});
quake._queueRubbleRestore({ tx: 1, ty: 2, type: 1, hp: 10, maxHp: 40, delayMs: 3000 });
now = 3999;
quake._updateRubbleRestoration(25);
assert.equal(restored, 0);
now = 4000;
quake._updateRubbleRestoration(25);
assert.equal(restored, 1);
assert.equal(quake._restoreQueue.length, 0);
const randomBefore = Math.random;
assert.throws(() => withReviewRandom(createReviewRandom(1), () => { throw new Error("fixture"); }));
assert.equal(Math.random, randomBefore, "test randomness never escapes the synchronous simulation");
const a = createReviewRandom(cfg.seed), b = createReviewRandom(cfg.seed);
assert.deepEqual(Array.from({ length: 100 }, a), Array.from({ length: 100 }, b));

// The script runs before imports and replaces storage only in its own document.
const externalStorage = { getItem() { throw new Error("real storage read"); }, setItem() { throw new Error("real storage write"); } };
const isolatedWindow = { localStorage: externalStorage, sessionStorage: externalStorage };
vm.runInNewContext(readFileSync(new URL("./dynamic-event-sandbox/saveIsolation.js", import.meta.url), "utf8"), { window: isolatedWindow });
isolatedWindow.localStorage.setItem("jkd-save-slot", "fixture");
assert.equal(isolatedWindow.localStorage.getItem("jkd-save-slot"), "fixture");
assert.equal(isolatedWindow.sessionStorage.getItem("jkd-save-slot"), null);
assert.equal(isolatedWindow.eventLabStorage.snapshot().persistentWrites, 0);
console.log("dynamic-event admission contract passed: retired migration, real gates, repeated Wurm, Shadowminer reasons, rubble clock, seeded review, isolated storage");

// A forced request survives a failed placement until a real plan becomes available.
{
  const retryWorld = createReviewWorld(300);
  const retryScene = { config: cfg.world, worldModel: retryWorld,
    upgradeSystem: { isGemPowerUnlocked: () => true } };
  const bridge = Object.assign(Object.create(RandomEventBridge.prototype), {
    scene: retryScene, flags: { master: true, crystalChoir: true },
    director: new RandomEventDirector(cfg.seed), jackpot: { update() {} },
    _forcedType: RANDOM_EVENT_TYPES.CRYSTAL_CHOIR,
    _clearPresentation() {}, _trackResourceGains() {}, _announceStart() {}, _syncPresentation() {},
    _isMajorHazardSafe: () => true,
  });
  bridge.director.state.cooldownMs = 0;
  bridge.update(100, cfg.stepMs, tile);
  assert.equal(bridge.director.state.active, null);
  assert.equal(bridge.getSnapshot().pendingType, RANDOM_EVENT_TYPES.CRYSTAL_CHOIR);
  retryWorld.getCaveZoneAtTile = () => ({ id: "retry-cave", cx: tile.tx, cy: tile.ty });
  bridge.update(18100, RANDOM_WORLD_EVENT_CONFIG.scheduler.retryCooldownMs, tile);
  assert.equal(bridge.director.state.active?.type, RANDOM_EVENT_TYPES.CRYSTAL_CHOIR);
  assert.equal(bridge.getSnapshot().pendingType, null);
}
console.log("forced ambient request retries without being dropped or substituted");

// Every personality must fit the seeded fixture, including the longest lurker replay.
for (const behaviorId of ["lurker", "mimic", "stalker"]) {
  for (const roll of [0, 0.5, 0.999999]) {
    for (const depth of [50, 300, 1400]) {
      const sample = new ShadowMinerRuntime(shadowScene, {
        mode: { enabled: true, review: false, dev10x: false, behaviorId, reviewDepthMeters: depth },
        random: () => roll, view: { spawn: () => true, destroy() {} },
      });
      shadowScene.shadow = sample;
      seedReviewTrail(shadowScene);
      assert.equal(sample.forceSpawn(tile, shadowScene.clockMs), true,
        `fixture admits ${behaviorId} roll=${roll} depth=${depth}`);
      sample.destroy();
    }
  }
}
console.log("27 Shadowminer personality/depth fixture combinations passed");