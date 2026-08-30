import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { StarSanctuarySystem } from
  "../systems/environment/StarSanctuarySystem.js";
import { StarConsumptionAcknowledgementStore } from
  "../systems/save-system/StarConsumptionAcknowledgementStore.js";
import { resolveStarSanctuaryProfile } from
  "../systems/environment/starSanctuaryProfile.js";
import { HardcoreModeSystem } from
  "../systems/hardcore/HardcoreModeSystem.js";
import {
  STAR_SANCTUARY_CONFIG,
  isStarSanctuaryEnabled,
} from "../values/starSanctuary.js";
import { createHardcoreModeData } from "../values/hardcoreMode.js";
import { TILE_TYPES } from "../values/tileTypes.js";

class FakeWorld {
  constructor() {
    this.widthTiles = 30;
    this.depthTiles = 30;
    this.tileSize = 64;
    this.types = new Map();
    this.sources = new Map();
    this.identities = new Map();
    this.rarities = new Map();
  }

  key(tx, ty) { return `${tx},${ty}`; }
  inBounds(tx, ty) {
    return tx >= 0 && ty >= 0 && tx < this.widthTiles && ty < this.depthTiles;
  }
  getTileType(tx, ty) {
    return this.types.get(this.key(tx, ty)) ?? TILE_TYPES.DIRT;
  }
  getDugTileSource(tx, ty) { return this.sources.get(this.key(tx, ty)) || null; }
  getSkyTileIdentity(tx, ty) { return this.identities.get(this.key(tx, ty)) || 0; }
  getSkyTileRarity(tx, ty) { return this.rarities.get(this.key(tx, ty)) || 0; }
}

const world = new FakeWorld();
const starKey = world.key(10, 10);
world.types.set(starKey, TILE_TYPES.SKY_TILE);
world.identities.set(starKey, 37);
world.rarities.set(starKey, 3);

const profile = resolveStarSanctuaryProfile({
  tx: 10,
  ty: 10,
  identityIndex: 37,
  rarityIndex: 3,
});
const otherSiteProfile = resolveStarSanctuaryProfile({
  tx: 18,
  ty: 21,
  identityIndex: 37,
  rarityIndex: 3,
});
assert.notEqual(profile.id, otherSiteProfile.id);
assert.ok(
  profile.gpPerSecond !== otherSiteProfile.gpPerSecond
    || profile.gpCapRatio !== otherSiteProfile.gpCapRatio
    || profile.radiusTiles !== otherSiteProfile.radiusTiles,
  "separate instances of the same visual identity need distinct refuge tuning",
);
assert.ok(STAR_SANCTUARY_CONFIG.temperaments.some(
  entry => entry.id === profile.temperamentId,
));

const system = new StarSanctuarySystem(world, STAR_SANCTUARY_CONFIG, {
  enabled: true,
});
let gp = 0;
const updateRefuge = (delta = 100, speed = 0) => system.update(delta, {
  nowMs: 1000 + delta,
  playerTile: { tx: 10, ty: 10 },
  gameplayActive: true,
  speedTilesPerSecond: speed,
  gpUnlocked: true,
  gpCurrent: gp,
  gpMaximum: 100,
  restoreGemPower(amount) {
    gp += amount;
    return amount;
  },
});

let snapshot = null;
for (let index = 0; index < 12; index += 1) snapshot = updateRefuge();
assert.equal(snapshot.nearIntactStar, true);
assert.equal(snapshot.activeRefuge.identityIndex, 37);
assert.ok(snapshot.gpRestored > 0, "resting at an intact Star must add GP");
assert.ok(snapshot.gpCap > 50 && snapshot.gpCap <= 100);

const gpBeforeMoving = gp;
snapshot = updateRefuge(100, 2);
assert.equal(snapshot.resting, false);
assert.equal(snapshot.gpRestored, 0);
assert.equal(gp, gpBeforeMoving);

const damageContext = {
  tileX: 10,
  tileY: 10,
  type: TILE_TYPES.SKY_TILE,
};
assert.equal(system.shouldBlockDamage({
  ...damageContext,
}, 0), true);
snapshot = system.update(100, {
  nowMs: 100,
  playerTile: { tx: 10, ty: 10 },
  consumptionHeld: false,
  consumptionTarget: null,
});
assert.equal(snapshot.consumptionConfirmationPending, true);
assert.equal(snapshot.pendingConsumption.phase, "acknowledgement");
assert.ok(system.drainEvents().some(
  event => event.type === "star-consumption-acknowledgement-required",
));
assert.equal(system.shouldBlockDamage(damageContext, 5000), true);
assert.equal(system.cancelConsumptionAttempt(), true);
assert.equal(system.shouldBlockDamage(damageContext, 6000), true);
assert.equal(system.acknowledgeConsumptionRisk(), true);

assert.equal(system.shouldBlockDamage(damageContext, 7000), true);
snapshot = system.update(100, {
  nowMs: 7500,
  playerTile: { tx: 10, ty: 10 },
  consumptionHeld: true,
  consumptionTarget: { tx: 10, ty: 10 },
});
assert.equal(snapshot.pendingConsumption.phase, "holding");
assert.equal(snapshot.pendingConsumption.progress, 0.5);
snapshot = system.update(100, {
  nowMs: 7600,
  playerTile: { tx: 10, ty: 10 },
  consumptionHeld: false,
  consumptionTarget: null,
});
assert.equal(snapshot.pendingConsumption, null, "releasing mine must cancel the hold");

assert.equal(system.shouldBlockDamage({
  ...damageContext,
}, 8000), true);
assert.equal(system.shouldBlockDamage({
  ...damageContext,
}, 8500), true);
assert.equal(system.shouldBlockDamage(damageContext, 9100), false);

const acknowledgementRecords = new Map();
const acknowledgementRepository = {
  readJson(key, fallback = null) {
    return acknowledgementRecords.has(key)
      ? acknowledgementRecords.get(key)
      : fallback;
  },
  writeJson(key, value) {
    acknowledgementRecords.set(key, value);
    return true;
  },
};
const acknowledgementStore = new StarConsumptionAcknowledgementStore(
  2,
  acknowledgementRepository,
);
assert.equal(acknowledgementStore.isAcknowledged(), false);
assert.equal(acknowledgementStore.acknowledge(), true);
assert.equal(acknowledgementStore.isAcknowledged(), true);
assert.match(acknowledgementStore.storageKey, /slot-2$/);
assert.equal(
  STAR_SANCTUARY_CONFIG.consumption.acknowledgement.confirmationWord,
  "DESTROY",
);
assert.match(
  STAR_SANCTUARY_CONFIG.consumption.acknowledgement.body,
  /LIGHT.*GP RECOVERY.*PANIC RELIEF/,
);

world.types.set(starKey, TILE_TYPES.AIR);
world.sources.set(starKey, {
  tx: 10,
  ty: 10,
  type: TILE_TYPES.SKY_TILE,
});
snapshot = updateRefuge();
assert.equal(snapshot.nearIntactStar, false);
assert.equal(snapshot.insideConsumedStarScar, true);
assert.equal(snapshot.gpRestored, 0);
assert.equal(
  snapshot.consumedStarStressMultiplier,
  STAR_SANCTUARY_CONFIG.scar.darknessStressMultiplier,
);
assert.ok(system.drainEvents().some(event => event.type === "star-consumed"));

const disabled = new StarSanctuarySystem(world, STAR_SANCTUARY_CONFIG, {
  enabled: false,
});
assert.equal(disabled.update(100, { playerTile: { tx: 10, ty: 10 } }).enabled, false);
assert.equal(disabled.shouldBlockDamage({ type: TILE_TYPES.SKY_TILE }), false);
assert.equal(isStarSanctuaryEnabled("?starSanctuary=0"), false);
assert.equal(isStarSanctuaryEnabled("?starSanctuary=1"), true);

function armedHardcoreSystem() {
  const hardcore = new HardcoreModeSystem(createHardcoreModeData("hardcore", 1));
  hardcore.arm("test", 2);
  return hardcore;
}

const baseStress = armedHardcoreSystem().update(100, {
  gameplayActive: true,
  depth: 100,
  darknessAlpha: 1,
  torchActive: false,
  playerLevel: 1,
});
const scarStress = armedHardcoreSystem().update(100, {
  gameplayActive: true,
  depth: 100,
  darknessAlpha: 1,
  torchActive: false,
  playerLevel: 1,
  insideConsumedStarScar: true,
  consumedStarStressMultiplier: 1.6,
});
assert.ok(scarStress.stressGainPerSecond > baseStress.stressGainPerSecond);
assert.ok(scarStress.stressSources.includes("starless-scar"));

const refugeStress = armedHardcoreSystem().update(100, {
  gameplayActive: true,
  depth: 100,
  darknessAlpha: 1,
  torchActive: false,
  playerLevel: 1,
  nearIntactStarLight: true,
  intactStarRecoveryScale: 1.4,
});
assert.equal(refugeStress.stressGainPerSecond, 0);
assert.equal(refugeStress.stressRecoveryPerSecond, 14);

const setupSource = await readFile(
  new URL("../world/playScene/PlaySceneSetup.js", import.meta.url),
  "utf8",
);
const bridgeSource = await readFile(
  new URL("../world/playScene/StarSanctuaryBridge.js", import.meta.url),
  "utf8",
);
const hardcoreBridgeSource = await readFile(
  new URL("../world/playScene/HardcoreModeBridge.js", import.meta.url),
  "utf8",
);
const scarViewSource = await readFile(
  new URL("../systems/visual/StarlessScarView.js", import.meta.url),
  "utf8",
);
assert.match(setupSource, /createStarSanctuaryRuntime\(this\)/);
assert.match(bridgeSource, /setTileDamageGuard\(runtime\.composedDamageGuard\)/);
assert.match(bridgeSource, /showConfirmation/);
assert.match(bridgeSource, /StarConsumptionHoldView/);
assert.match(bridgeSource, /StarConsumptionAcknowledgementStore/);
assert.match(scarViewSource, /pendingConsumption/);
assert.match(hardcoreBridgeSource, /updateStarSanctuaryRuntime/);
assert.match(hardcoreBridgeSource, /insideConsumedStarScar/);

console.log("star sanctuary consequence contract: ok");
