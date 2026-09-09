import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { StarSanctuarySystem } from
  "../systems/environment/StarSanctuarySystem.js";
import { StarConsumptionAcknowledgementStore } from
  "../systems/save-system/StarConsumptionAcknowledgementStore.js";
import { resolveStarSanctuaryProfile } from
  "../systems/environment/starSanctuaryProfile.js";
import { WorldMapStarTerritorySystem } from
  "../systems/map/WorldMapStarTerritorySystem.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
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
    this.topAirRows = 0;
    this.types = new Map();
    this.sources = new Map();
    this.identities = new Map();
    this.rarities = new Map();
    this.originals = new Map();
    this.config = {
      skyTileRarities: [{ multiplier: 2 }],
      skyTileBonusMultiplier: 2,
    };
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
  getSkyTileOriginalType(tx, ty) {
    return this.originals.get(this.key(tx, ty)) || TILE_TYPES.DIRT;
  }
}

const world = new FakeWorld();
const starKey = world.key(10, 10);
world.types.set(starKey, TILE_TYPES.SKY_TILE);
world.identities.set(starKey, 37);
world.rarities.set(starKey, 3);
world.originals.set(starKey, TILE_TYPES.IRON);
const boundaryStarKey = world.key(22, 10);
world.types.set(boundaryStarKey, TILE_TYPES.SKY_TILE);
world.identities.set(boundaryStarKey, 91);
world.rarities.set(boundaryStarKey, 2);
world.originals.set(boundaryStarKey, TILE_TYPES.COPPER);

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
assert.equal(STAR_SANCTUARY_CONFIG.scar.radiusTiles, 14);
assert.equal(STAR_SANCTUARY_CONFIG.scar.territoryBound, true);
assert.equal(STAR_SANCTUARY_CONFIG.scar.coversEntireTerritory, true);
assert.equal(STAR_SANCTUARY_CONFIG.scar.resourceDepletion.enabled, true);
assert.equal(STAR_SANCTUARY_CONFIG.scar.panicStressMultiplier, 4);
assert.equal(
  Object.keys(STAR_SANCTUARY_CONFIG.scar.visual.assets).length,
  4,
);
assert.ok(
  STAR_SANCTUARY_CONFIG.scar.spread.postBreakEndRadiusTiles
    > STAR_SANCTUARY_CONFIG.scar.spread.holdEndRadiusTiles,
);

const territorySystem = new WorldMapStarTerritorySystem(world);
const system = new StarSanctuarySystem(world, STAR_SANCTUARY_CONFIG, {
  enabled: true,
  territorySystem,
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
snapshot = system.update(0, {
  nowMs: 9100,
  playerTile: { tx: 10, ty: 10 },
  consumptionHeld: true,
  consumptionTarget: { tx: 10, ty: 10 },
});
assert.equal(snapshot.pendingConsumption.phase, "authorized");
assert.equal(snapshot.pendingConsumption.progress, 1);

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
acknowledgementRecords.set("dig-game-star-consumption-ack-v1-slot-2", {
  version: 1,
  acknowledged: true,
});
assert.equal(acknowledgementStore.isAcknowledged(), false);
assert.equal(acknowledgementStore.acknowledge(), true);
assert.equal(acknowledgementStore.isAcknowledged(), true);
assert.match(acknowledgementStore.storageKey, /ack-v2-slot-2$/);
assert.equal(
  STAR_SANCTUARY_CONFIG.consumption.acknowledgement.storageVersion,
  2,
);
assert.equal(
  STAR_SANCTUARY_CONFIG.consumption.acknowledgement.confirmationWord,
  "DESTROY",
);
assert.match(
  STAR_SANCTUARY_CONFIG.consumption.acknowledgement.body,
  /LIGHT.*GP RECOVERY.*PANIC RELIEF/,
);
assert.match(
  STAR_SANCTUARY_CONFIG.consumption.acknowledgement.body,
  /MATERIAL YIELD.*LAST STAR.*WHOLE UNDERGROUND/s,
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
assert.equal(snapshot.resourcesDepleted, true);
assert.equal(snapshot.activeScar.territoryBound, true);
assert.equal(snapshot.gpRestored, 0);
assert.equal(
  snapshot.consumedStarStressMultiplier,
  STAR_SANCTUARY_CONFIG.scar.panicStressMultiplier,
);
assert.ok(system.drainEvents().some(event => event.type === "star-consumed"));

const distantScar = system.update(100, {
  playerTile: { tx: 3, ty: 29 },
  gameplayActive: true,
});
assert.equal(
  distantScar.insideConsumedStarScar,
  true,
  "the consumed territory must extend beyond the fallback radius",
);
assert.ok(Math.hypot(10 - 3, 10 - 29) > STAR_SANCTUARY_CONFIG.scar.radiusTiles);
assert.equal(system.isResourceDepletedAt(3, 29), true);
const intactTerritory = system.update(100, {
  playerTile: { tx: 18, ty: 10 },
  gameplayActive: true,
});
assert.equal(
  intactTerritory.insideConsumedStarScar,
  false,
  "the scar must stop at a nearer intact Star's territory",
);
assert.equal(system.isResourceDepletedAt(18, 10), false);

const digSystem = new DigSystem(
  world,
  { applyTileUpdate() {}, scene: null },
  {
    tileSize: 64,
    topAirRows: 0,
    seed: 7,
    resourceEconomyEnabled: false,
  },
);
digSystem.setResourceDepletionProvider(({ tileX, tileY }) => (
  system.isResourceDepletedAt(tileX, tileY)
));
const depletedReward = digSystem.processDestroyedTile(
  3,
  29,
  TILE_TYPES.COPPER,
  0,
);
assert.equal(depletedReward.resourceDepleted, true);
assert.equal(depletedReward.depletedResourceType, "copper");
assert.equal(depletedReward.resourceType, null);
assert.equal(depletedReward.resourceAmount, 0);
assert.equal(digSystem.getResourceTotals().copper, 0);

const healthyReward = digSystem.processDestroyedTile(
  18,
  10,
  TILE_TYPES.COPPER,
  0,
);
assert.equal(healthyReward.resourceDepleted, false);
assert.equal(healthyReward.resourceType, "copper");
assert.ok(healthyReward.resourceAmount > 0);

const starReward = digSystem.processDestroyedTile(
  22,
  10,
  TILE_TYPES.SKY_TILE,
  0,
);
assert.equal(starReward.resourceDepleted, false);
assert.equal(starReward.resourceType, "copper");
assert.ok(starReward.resourceAmount > 0, "the sacrificed Star keeps its own reward");

world.types.set(boundaryStarKey, TILE_TYPES.AIR);
world.sources.set(boundaryStarKey, {
  tx: 22,
  ty: 10,
  type: TILE_TYPES.SKY_TILE,
});
const totalCollapse = system.update(100, {
  playerTile: { tx: 29, ty: 29 },
  gameplayActive: true,
});
assert.equal(territorySystem.getStateSummary().allConsumed, true);
assert.equal(totalCollapse.insideConsumedStarScar, true);
assert.equal(totalCollapse.resourcesDepleted, true);
assert.equal(system.isResourceDepletedAt(29, 29), true);

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
  panicResistanceMeters: 0,
});
const scarStress = armedHardcoreSystem().update(100, {
  gameplayActive: true,
  depth: 100,
  darknessAlpha: 1,
  torchActive: false,
  panicResistanceMeters: 0,
  insideConsumedStarScar: true,
  consumedStarStressMultiplier: STAR_SANCTUARY_CONFIG.scar.panicStressMultiplier,
});
assert.equal(
  scarStress.stressGainPerSecond,
  baseStress.stressGainPerSecond * STAR_SANCTUARY_CONFIG.scar.panicStressMultiplier,
);
assert.ok(scarStress.stressSources.includes("starless-scar"));

const litScarStress = armedHardcoreSystem().update(100, {
  gameplayActive: true,
  depth: 100,
  darknessAlpha: 1,
  torchActive: true,
  torchIntensity: 1,
  panicResistanceMeters: 0,
  insideConsumedStarScar: true,
  consumedStarStressMultiplier: STAR_SANCTUARY_CONFIG.scar.panicStressMultiplier,
});
assert.equal(litScarStress.stressGainPerSecond, 0);
assert.ok(litScarStress.stressRecoveryPerSecond > 0);

const refugeStress = armedHardcoreSystem().update(100, {
  gameplayActive: true,
  depth: 100,
  darknessAlpha: 1,
  torchActive: false,
  panicResistanceMeters: 0,
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
const scarTerritorySource = await readFile(
  new URL("../systems/environment/starScarTerritory.js", import.meta.url),
  "utf8",
);
assert.match(setupSource, /createStarSanctuaryRuntime\(this\)/);
assert.match(bridgeSource, /setTileDamageGuard\(runtime\.composedDamageGuard\)/);
assert.match(bridgeSource, /showConfirmation/);
assert.match(bridgeSource, /StarConsumptionHoldView/);
assert.match(bridgeSource, /StarConsumptionAcknowledgementStore/);
assert.match(bridgeSource, /setResourceDepletionProvider/);
assert.match(bridgeSource, /runtime\.view\.startSpread/);
assert.match(scarViewSource, /pendingConsumption/);
assert.match(scarViewSource, /collectStarScarTerritoryCells/);
assert.match(scarViewSource, /StarlessScarAssetLayer/);
assert.match(scarTerritorySource, /getNearestSite/);
assert.match(hardcoreBridgeSource, /updateStarSanctuaryRuntime/);
assert.match(hardcoreBridgeSource, /insideConsumedStarScar/);

territorySystem.destroy();

console.log("star sanctuary consequence contract: ok");
