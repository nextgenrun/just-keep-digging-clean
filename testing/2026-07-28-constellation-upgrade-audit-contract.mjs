import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PlayerAbilities } from "../player/PlayerAbilities.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import { buildStarlightTalentStatuses } from "../ui/overlays/starlightTalentStatus.js";
import {
  CONSTELLATION_ABILITY_PREREQUISITES,
  CONSTELLATION_BUFFS,
  CONSTELLATION_MATCHING_STAR_YIELD_BONUS,
  computeAbilityStats,
  getDefaultAbilityStats,
} from "../values/constellationBuffs.js";
import { MINING_CONFIG } from "../values/miningConfig.js";
import { PLAYER_ABILITIES_CONFIG } from "../values/playerAbilities.js";
import {
  STARLIGHT_TALENT_RESOURCE_ORDER,
  STARLIGHT_TALENT_TREE_CONFIG,
} from "../values/starlightTalentTree.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { UPGRADES } from "../values/upgradeDefinitions.js";

const expectedModifiers = Object.freeze({
  dirt: ["quickslashFlatDamage", 5],
  stone: ["thunderstrikeRange", 2],
  copper: ["quickslashCostReduction", 2],
  darkDirtNormal: ["thunderstrikeDamageMult", 0.25],
  steel: ["quickslashBurstSpeed", 300],
  iron: ["thunderstrikeFalloffReduction", 0.20],
  bronze: ["quickslashFreeAbovePct", 0.5],
  darkDirtStrong: ["thunderstrikeDamageMult", 0.10],
  silver: ["quickslashSpeedBonus", 0.20],
  gold: ["thunderstrikeCostReduction", 30],
});

assert.deepEqual(Object.keys(CONSTELLATION_BUFFS).sort(), Object.keys(expectedModifiers).sort());
assert.equal(CONSTELLATION_MATCHING_STAR_YIELD_BONUS, 1);
for (const [resourceType, [stat, value]] of Object.entries(expectedModifiers)) {
  const buff = CONSTELLATION_BUFFS[resourceType];
  assert.deepEqual([buff.modifier.stat, buff.modifier.value], [stat, value]);
  const stats = computeAbilityStats([resourceType]);
  const changedStats = Object.entries(stats).filter(
    ([key, nextValue]) => nextValue !== getDefaultAbilityStats()[key],
  );
  assert.deepEqual(changedStats, [[stat, value]], `${resourceType} must change only ${stat}`);
}
for (const prerequisite of Object.values(CONSTELLATION_ABILITY_PREREQUISITES)) {
  const upgrade = UPGRADES[prerequisite.upgradeId];
  assert.equal(upgrade?.merchant, "boboMerchant");
  assert.equal(upgrade?.oneTimePurchase, true);
}

const fullCounts = Object.fromEntries(STARLIGHT_TALENT_RESOURCE_ORDER.map(id => [id, 5]));
const talentData = {
  thresholds: fullCounts,
  lineColors: Object.fromEntries(STARLIGHT_TALENT_RESOURCE_ORDER.map(id => [id, 0x87ceeb])),
};
const lockedTalents = buildStarlightTalentStatuses({
  data: talentData,
  counts: fullCounts,
  unlockedResources: STARLIGHT_TALENT_RESOURCE_ORDER,
  relicCount: 30,
  abilities: {
    isGodModeActive: () => false,
    isQuickslashUnlocked: () => false,
    isThunderStrikeUnlocked: () => false,
  },
});
assert.equal(lockedTalents.abilityAccess.providerReady, true);
for (const status of Object.values(lockedTalents.statuses)) {
  assert.equal(status.state, "ability-locked");
  assert.equal(status.isUnlocked, true, "mastery remains saved behind the Bobo lock");
  assert.equal(status.progressBanked, true);
  assert.equal(status.shortLabel, STARLIGHT_TALENT_TREE_CONFIG.copy.boboLocked);
}

const mixedTalents = buildStarlightTalentStatuses({
  data: talentData,
  counts: fullCounts,
  unlockedResources: STARLIGHT_TALENT_RESOURCE_ORDER,
  abilities: {
    isGodModeActive: () => false,
    isQuickslashUnlocked: () => true,
    isThunderStrikeUnlocked: () => false,
  },
});
assert.equal(mixedTalents.statuses.dirt.state, "mastered");
assert.equal(mixedTalents.statuses.stone.state, "ability-locked");
const godTalents = buildStarlightTalentStatuses({
  data: talentData,
  counts: fullCounts,
  unlockedResources: STARLIGHT_TALENT_RESOURCE_ORDER,
  abilities: {
    isGodModeActive: () => true,
    isQuickslashUnlocked: () => false,
    isThunderStrikeUnlocked: () => false,
  },
});
assert.ok(Object.values(godTalents.statuses).every(status => status.rewardActive));

function createWorld({ isDiggable = () => true } = {}) {
  const hits = [];
  return {
    hits,
    depth: 64,
    config: { skyTileRarities: [{ multiplier: 2 }], skyTileBonusMultiplier: 2 },
    inBounds: () => true,
    isSolid: () => true,
    isDiggable,
    getTileType: () => TILE_TYPES.DIRT,
    damageTile(tx, ty, damage) {
      hits.push({ tx, ty, damage });
      return {
        success: true,
        destroyed: false,
        typeBeforeDamage: TILE_TYPES.DIRT,
        wasRubble: false,
        hp: 99,
        hpBefore: 100,
        maxHp: 100,
        overkillDamage: 0,
      };
    },
  };
}

function createAbilities(unlockedResources = [], upgradeId = null, worldOptions = {}) {
  const upgrades = new UpgradeSystem();
  if (upgradeId) assert.equal(upgrades.grantUpgrade(upgradeId).success, true);
  const body = {
    x: 16,
    y: 16,
    w: 12,
    h: 12,
    vx: 0,
    vy: 0,
    setFlightActive(value) { this.flightActive = value; },
  };
  const world = createWorld(worldOptions);
  const sprite = {
    scene: {
      time: { now: 1000 },
      floatingTextSystem: { getUnlockedConstellations: () => [...unlockedResources] },
      hudSystem: { flashStatus() {} },
    },
  };
  const abilities = new PlayerAbilities(
    sprite,
    world,
    { tileSize: 16, flightSpeedPxPerSec: 252 },
    upgrades,
    body,
  );
  abilities.gemPower = 1000;
  return { abilities, body, upgrades, world };
}

const quickInput = {
  getFlyInput: () => false,
  getQuickslashInput: () => true,
  isUp: () => false,
};
const lockedQuick = createAbilities();
lockedQuick.abilities.update(0.016, quickInput, true, true);
assert.equal(lockedQuick.abilities.isQuickslashActive(), false);

function quickslashMineDamage(resourceType = null) {
  const env = createAbilities(resourceType ? [resourceType] : [], "quickslashAbility");
  env.abilities.update(0.016, quickInput, true, true);
  const dig = new DigSystem(
    env.world,
    { scene: {}, applyTileUpdate() {} },
    { ...MINING_CONFIG, tileSize: 16, topAirRows: 0, seed: 1 },
    env.upgrades,
  );
  return dig.tryMine(
    { tx: 1, ty: 1 },
    1000,
    "RIGHT",
    env.abilities,
    { ignoreCooldown: true, skipAbilityCost: true, skipHeavyPunch: true },
  ).damage;
}
assert.equal(quickslashMineDamage("dirt"), quickslashMineDamage() + 5);

const copper = createAbilities(["copper"], "quickslashAbility");
assert.equal(copper.abilities.getQuickslashCost(), PLAYER_ABILITIES_CONFIG.quickslashCost - 2);
const steel = createAbilities(["steel"], "quickslashAbility");
steel.abilities.update(0.016, quickInput, true, true);
assert.equal(steel.body.vx, 300);
const bronze = createAbilities(["bronze"], "quickslashAbility");
bronze.abilities.gemPower = bronze.abilities.getGemPowerMax() * 0.5;
assert.equal(bronze.abilities.spendQuickslashCost(), 0);
const cooldownProbe = new DigSystem(
  createWorld(),
  {},
  { ...MINING_CONFIG },
);
const quickActive = stats => ({
  isQuickslashActive: () => true,
  getConstellationStats: () => stats,
});
const baseQuickCooldown = cooldownProbe._getCooldown(quickActive(getDefaultAbilityStats()));
const silverQuickCooldown = cooldownProbe._getCooldown(
  quickActive(computeAbilityStats(["silver"])),
);
assert.equal(baseQuickCooldown, MINING_CONFIG.mineCooldownMs / 4);
assert.equal(silverQuickCooldown, baseQuickCooldown / 1.2);

const yieldProbe = new DigSystem(
  createWorld(),
  {},
  MINING_CONFIG,
  null,
  null,
  { getUnlockedConstellations: () => ["dirt"] },
);
assert.deepEqual(yieldProbe._getSkyTileRewardMultiplier(0, "dirt"), {
  multiplier: 2 + CONSTELLATION_MATCHING_STAR_YIELD_BONUS,
  passiveBonus: true,
});
assert.equal(yieldProbe._getSkyTileRewardMultiplier(0, "stone").multiplier, 2);

function castThunder(resourceType = null, worldOptions = {}) {
  const env = createAbilities(
    resourceType ? [resourceType] : [],
    "thunderStrikeAbility",
    worldOptions,
  );
  const cost = env.abilities.getThunderStrikeCost();
  assert.equal(env.abilities.startThunderStrikeCharge(1000), true);
  const result = env.abilities.executeThunderStrike(0);
  assert.equal(result.success, true);
  return { ...env, result, cost };
}
const baseThunder = castThunder();
const stone = castThunder("stone");
assert.equal(new Set(stone.world.hits.map(hit => hit.ty)).size, 8);
assert.equal(new Set(baseThunder.world.hits.map(hit => hit.ty)).size, 6);
const caveEcho = castThunder("darkDirtNormal");
assert.equal(caveEcho.world.hits[0].damage, Math.round(baseThunder.world.hits[0].damage * 1.25));
const hammer = castThunder("iron");
assert.ok(baseThunder.world.hits[1].damage < baseThunder.world.hits[0].damage);
assert.equal(hammer.world.hits[1].damage, hammer.world.hits[0].damage);
const citadel = castThunder("darkDirtStrong");
assert.equal(new Set(citadel.world.hits.map(hit => hit.tx)).size, 1);
assert.equal(citadel.world.hits.length, baseThunder.world.hits.length);
assert.equal(
  citadel.world.hits[0].damage,
  Math.round(baseThunder.world.hits[0].damage * 1.10),
);
const protectedCitadel = castThunder("darkDirtStrong", {
  isDiggable: tx => tx !== 0,
});
assert.equal(protectedCitadel.world.hits.some(hit => hit.tx === 0), false);
const crown = castThunder("gold");
assert.equal(baseThunder.cost, PLAYER_ABILITIES_CONFIG.thunderStrikeCost * 3);
assert.equal(crown.cost, baseThunder.cost - 30);

const [actionbarRuntimeSource, pillarSource, treeSource, setupSource] = await Promise.all([
  readFile(new URL("../world/playScene/CelestialActionBarRuntime.js", import.meta.url), "utf8"),
  readFile(new URL("../systems/visual/StarPillarSystem.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/overlays/CelestialTalentTreeView.js", import.meta.url), "utf8"),
  readFile(new URL("../world/playScene/PlaySceneSetup.js", import.meta.url), "utf8"),
]);
assert.match(actionbarRuntimeSource, /isQuickslashUnlocked/);
assert.match(actionbarRuntimeSource, /isThunderStrikeUnlocked/);
assert.match(pillarSource, /celestialTalentProgressionSystem/);
assert.match(treeSource, /purchaseNode/);
assert.doesNotMatch(setupSource, /constellation mastered/);
assert.doesNotMatch(setupSource, /STAR HEART FORGED/);

console.log("constellation upgrade audit: ten live modifiers, shared yield, Bobo locks, God Mode, protected tiles, and health wiring passed");
