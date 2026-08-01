import assert from "node:assert/strict";

import { GAME_CONFIG } from "../values/gameConfig.js";
import {
  RESOURCE_ECONOMY_CONFIG,
  getDepthEconomyYieldMultiplier,
  getResourceEconomyConfigHealth,
  resolveDepthEconomyEnabled,
} from "../values/resourceEconomy.js";
import {
  RESOURCE_RARITIES,
  getResourceHpMultiplier,
  getResourceRarityIndex,
  getResourceYieldMultiplier,
} from "../values/dynamicSoil.js";
import {
  RESOURCE_PRICES_CONFIG,
  getAdjustedResourceUnitPrice,
  roundResourceCurrency,
} from "../values/resourcePrices.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { tileTypeToResource } from "../values/resourceTypes.js";
import { RUNTIME_CANARY_CONFIG } from "../values/runtimeCanaryConfig.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { evaluateRuntimeCanaries } from "../systems/health/runtimeCanaryChecks.js";
import { buildRuntimeHealthWorkerSource } from "../systems/health/RuntimeHealthWorkerSource.js";
import {
  capFinalResourceYield,
  resolveDepthAdjustedResourceYield,
} from "../systems/mining/resourceDepthYield.js";
import { resolveDepthMilestoneEconomyBonuses } from "../systems/mining/depthEconomyBonuses.js";
import { WorldModel } from "../world/model/WorldModel.js";

assert.equal(resolveDepthEconomyEnabled(), true);
assert.equal(
  resolveDepthEconomyEnabled(RESOURCE_ECONOMY_CONFIG, "?depthEconomy=legacy"),
  false,
);
assert.equal(
  resolveDepthEconomyEnabled(RESOURCE_ECONOMY_CONFIG, "?depthEconomy=0"),
  false,
);
assert.equal(getResourceEconomyConfigHealth().ready, true);
assert.equal(getDepthEconomyYieldMultiplier(0, false), 1);
assert.equal(getDepthEconomyYieldMultiplier(1500, false), 5);
assert.equal(getDepthEconomyYieldMultiplier(4000, true), 10);
assert.ok(getDepthEconomyYieldMultiplier(750, false) > 2);
assert.ok(getDepthEconomyYieldMultiplier(2500, true) > 3.5);

function findRarityCoordinate(targetIndex) {
  for (let ty = 65; ty < 2000; ty += 1) {
    for (let tx = 0; tx < 280; tx += 1) {
      if (getResourceRarityIndex(TILE_TYPES.GOLD, tx, ty, ty - 65, 133742) === targetIndex) {
        return { tx, ty };
      }
    }
  }
  throw new Error(`No deterministic coordinate found for rarity ${targetIndex}`);
}

const modernYield = [1, 3, 8, 25];
const modernHp = [1, 1.5, 2.5, 5];
const legacyMultipliers = [1, 2, 5, 12];
RESOURCE_RARITIES.forEach((rarity, index) => {
  const { tx, ty } = findRarityCoordinate(index);
  const depth = ty - 65;
  assert.equal(
    getResourceYieldMultiplier(TILE_TYPES.GOLD, tx, ty, depth, 133742, true),
    modernYield[index],
  );
  assert.equal(
    getResourceHpMultiplier(TILE_TYPES.GOLD, tx, ty, depth, 133742, true),
    modernHp[index],
  );
  assert.equal(
    getResourceYieldMultiplier(TILE_TYPES.GOLD, tx, ty, depth, 133742, false),
    legacyMultipliers[index],
  );
  assert.equal(
    getResourceHpMultiplier(TILE_TYPES.GOLD, tx, ty, depth, 133742, false),
    legacyMultipliers[index],
  );
  assert.equal(rarity.multiplier, modernYield[index]);
});

const deterministicYield = resolveDepthAdjustedResourceYield({
  nativeYield: 3,
  depthTiles: 750,
  secondWorld: false,
  tileX: 18,
  tileY: 815,
  seed: 133742,
});
assert.equal(
  deterministicYield,
  resolveDepthAdjustedResourceYield({
    nativeYield: 3,
    depthTiles: 750,
    secondWorld: false,
    tileX: 18,
    tileY: 815,
    seed: 133742,
  }),
);
assert.equal(
  resolveDepthAdjustedResourceYield({
    nativeYield: 12,
    depthTiles: 4000,
    secondWorld: true,
    enabled: false,
  }),
  12,
);
assert.equal(capFinalResourceYield(999999), 7500);
assert.equal(capFinalResourceYield(999999, false), 999999);

assert.equal(
  getAdjustedResourceUnitPrice("dirt", {
    startResourceBonus: 0.1,
    depthEconomyEnabled: true,
  }),
  1.1,
);
assert.equal(
  getAdjustedResourceUnitPrice("dirt", {
    startResourceBonus: 0.1,
    depthEconomyEnabled: false,
  }),
  1,
);
assert.equal(
  getAdjustedResourceUnitPrice("obsidian", {
    deepResourceBonus: 0.15,
    depthEconomyEnabled: true,
  }),
  1380,
);
assert.equal(roundResourceCurrency(1.005), 1.01);

const modernUpgrades = new UpgradeSystem(null, null, {
  depthEconomyEnabled: true,
});
modernUpgrades.setMoney(999999);
assert.equal(
  modernUpgrades.canPurchaseUpgrade("deepResourcePrices").reason,
  "requires_upgrade",
);
modernUpgrades.setUpgradeLevels({
  worldTwoTunnelAccess: 1,
  deepResourcePrices: 1,
});
assert.equal(modernUpgrades.getUpgradeEffects().deepResourceBonus, 0.15);
const legacyUpgrades = new UpgradeSystem(null, null, {
  depthEconomyEnabled: false,
});
legacyUpgrades.setUpgradeLevels({
  worldTwoTunnelAccess: 1,
  deepResourcePrices: 10,
});
assert.equal(legacyUpgrades.getUpgradeEffects().deepResourceBonus, 0);
assert.equal(
  legacyUpgrades.canPurchaseUpgrade("deepResourcePrices").reason,
  "feature_disabled",
);

const milestoneBonuses = resolveDepthMilestoneEconomyBonuses({
  miningSpeedPct: 999,
  critChancePct: 999,
});
assert.equal(milestoneBonuses.miningSpeedReduction, 0.32);
assert.equal(milestoneBonuses.critChance, 0.12);
assert.deepEqual(
  resolveDepthMilestoneEconomyBonuses({
    miningSpeedPct: 32,
    critChancePct: 12,
  }, false),
  {
    miningSpeedPct: 0,
    miningSpeedReduction: 0,
    critChancePct: 0,
    critChance: 0,
  },
);

const cooldownProbe = new DigSystem(null, null, {
  mineCooldownMs: 200,
  topAirRows: 65,
  seed: 133742,
  levelTwoLeftTile: 132,
  resourceEconomyEnabled: true,
});
assert.equal(cooldownProbe.getDepthEconomyHealthSnapshot().ready, false);
cooldownProbe.setDepthMilestoneBonusProvider(() => ({
  miningSpeedPct: 32,
  critChancePct: 12,
}));
assert.equal(cooldownProbe._getCooldown(), 136);
assert.equal(cooldownProbe.getDepthEconomyHealthSnapshot().ready, true);

function evaluateEconomyCanary(digSystem) {
  const scene = {
    sys: { settings: { key: "PlayScene" }, isActive: () => true },
    scene: { isActive: () => true },
  };
  for (const path of RUNTIME_CANARY_CONFIG.scenes.PlayScene.requiredPaths) {
    scene[path] = {};
  }
  scene.digSystem = digSystem;
  const nowMs = RUNTIME_CANARY_CONFIG.scenes.PlayScene.settleMs + 10;
  return evaluateRuntimeCanaries(
    {
      canvas: { isConnected: true },
      loop: {
        frame: 2,
        actualFps: 60,
        running: true,
        inFocus: true,
      },
      scene: {
        scenes: [scene],
        getScenes: () => [scene],
      },
    },
    {
      noActiveSinceMs: null,
      lastFrame: 1,
      lastFrameChangedAtMs: 0,
      activeSinceByScene: new Map([["PlayScene", 0]]),
    },
    nowMs,
    false,
  ).findings;
}

const brokenEconomyProbe = new DigSystem(null, null, {
  mineCooldownMs: 200,
  topAirRows: 65,
  seed: 133742,
  levelTwoLeftTile: 132,
  resourceEconomyEnabled: true,
});
assert.ok(evaluateEconomyCanary(brokenEconomyProbe).some(
  finding => finding.code === RUNTIME_CANARY_CONFIG.events.resourceEconomyInvariant,
));
assert.ok(!evaluateEconomyCanary(cooldownProbe).some(
  finding => finding.code === RUNTIME_CANARY_CONFIG.events.resourceEconomyInvariant,
));
assert.match(buildRuntimeHealthWorkerSource(), /system-findings/);

const economyBands = Object.freeze([
  Object.freeze({ id: "l1-upper", secondWorld: false, minDepth: 120, maxDepth: 299 }),
  Object.freeze({ id: "l1-mid", secondWorld: false, minDepth: 600, maxDepth: 999 }),
  Object.freeze({ id: "l1-deep", secondWorld: false, minDepth: 1000, maxDepth: 1499 }),
  Object.freeze({ id: "l1-bottom", secondWorld: false, minDepth: 1500, maxDepth: 1999 }),
  Object.freeze({ id: "l2-entry", secondWorld: true, minDepth: 100, maxDepth: 499 }),
  Object.freeze({ id: "l2-mid-a", secondWorld: true, minDepth: 1000, maxDepth: 1999 }),
  Object.freeze({ id: "l2-mid-b", secondWorld: true, minDepth: 2000, maxDepth: 2999 }),
  Object.freeze({ id: "l2-deep", secondWorld: true, minDepth: 3000, maxDepth: 3999 }),
  Object.freeze({ id: "l2-bottom", secondWorld: true, minDepth: 4000, maxDepth: 4999 }),
]);

function sampleBand(world, dig, band) {
  const minX = band.secondWorld ? world.config.levelTwoLeftTile : 0;
  const maxX = band.secondWorld
    ? world.config.levelTwoRightTile
    : world.config.levelTwoLeftTile - 1;
  let hp = 0;
  let coins = 0;
  let tiles = 0;
  const counts = {};

  for (let depth = band.minDepth; depth <= band.maxDepth; depth += 1) {
    const ty = world.config.topAirRows + depth;
    for (let tx = minX; tx <= maxX; tx += 1) {
      const tileType = world.getTileType(tx, ty);
      const resource = tileTypeToResource(tileType);
      if (!resource) continue;
      const tileHp = world.getTileMaxHp(tx, ty, tileType);
      const amount = dig._getNativeYield(tileType, tx, ty);
      hp += tileHp;
      coins += amount * (RESOURCE_PRICES_CONFIG.basePrices[resource] || 0);
      tiles += 1;
      counts[resource] = (counts[resource] || 0) + 1;
    }
  }
  return {
    id: band.id,
    tiles,
    coinsPer100Hp: roundResourceCurrency((coins / Math.max(1, hp)) * 100),
    counts,
  };
}

function buildEconomySnapshot(enabled) {
  const config = Object.freeze({
    ...GAME_CONFIG,
    resourceEconomyEnabled: enabled,
  });
  const world = new WorldModel(config);
  const dig = new DigSystem(world, null, config);
  return economyBands.map(band => sampleBand(world, dig, band));
}

const originalLog = console.log;
let modernSnapshot;
let legacySnapshot;
try {
  console.log = () => {};
  modernSnapshot = buildEconomySnapshot(true);
  legacySnapshot = buildEconomySnapshot(false);
} finally {
  console.log = originalLog;
}

const modernById = Object.fromEntries(modernSnapshot.map(entry => [entry.id, entry]));
const legacyById = Object.fromEntries(legacySnapshot.map(entry => [entry.id, entry]));
assert.ok(modernById["l1-bottom"].coinsPer100Hp > modernById["l1-upper"].coinsPer100Hp * 2);
assert.ok(modernById["l2-bottom"].coinsPer100Hp > modernById["l2-entry"].coinsPer100Hp * 5);
assert.ok(modernById["l2-bottom"].coinsPer100Hp > legacyById["l2-bottom"].coinsPer100Hp * 6);
assert.ok(
  modernById["l1-bottom"].coinsPer100Hp
    >= modernById["l2-entry"].coinsPer100Hp * 0.7,
);
assert.ok(
  modernById["l1-bottom"].coinsPer100Hp
    <= modernById["l2-entry"].coinsPer100Hp * 1.4,
);
assert.ok(
  (modernById["l2-bottom"].counts.lavaDirt || 0) / modernById["l2-bottom"].tiles
    < (legacyById["l2-bottom"].counts.lavaDirt || 0) / legacyById["l2-bottom"].tiles,
);

console.log(JSON.stringify({
  modern: modernSnapshot.map(({ id, coinsPer100Hp }) => ({ id, coinsPer100Hp })),
  legacy: legacySnapshot.map(({ id, coinsPer100Hp }) => ({ id, coinsPer100Hp })),
}, null, 2));
console.log("Depth resource economy contract passed.");
