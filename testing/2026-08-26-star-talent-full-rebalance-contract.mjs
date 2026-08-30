import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PlayerAbilities } from "../player/PlayerAbilities.js";
import {
  CelestialActivationBudget,
  enumerateExpandingPulseTiles,
} from "../systems/celestial/CelestialActivationBudget.js";
import { HollowSunEngine } from "../systems/celestial/HollowSunEngine.js";
import { StarHeartProgressionSystem } from
  "../systems/celestial/StarHeartProgressionSystem.js";
import { StellarRageEngine } from "../systems/celestial/StellarRageEngine.js";
import { WaywardStarEngine } from "../systems/celestial/WaywardStarEngine.js";
import { WaywardStarSwarmEngine } from
  "../systems/celestial/WaywardStarSwarmEngine.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { CELESTIAL_ENGINE_CONFIG } from "../values/celestialEngines.js";
import { CELESTIAL_TALENT_PROGRESSION_CONFIG } from
  "../values/celestialTalentProgression.js";
import { resolveCelestialTalentEngineDefinition } from
  "../values/celestialTalentEffects.js";
import { computeAbilityStats } from "../values/constellationBuffs.js";
import { PLAYER_ABILITIES_CONFIG } from "../values/playerAbilities.js";
import { STAR_RARITY_PROGRESSION_CONFIG } from
  "../values/starRarityProgression.js";
import {
  THUNDER_STRIKE_CHAIN_CONFIG,
  resolveThunderStrikeEffectiveDamageMultiplier,
} from "../values/thunderStrikeChain.js";

function allBranchEffects(engineId) {
  const branch = CELESTIAL_TALENT_PROGRESSION_CONFIG.branches.find(
    candidate => candidate.id === engineId,
  );
  return branch.nodes
    .filter(node => node.kind !== "ability")
    .map(node => node.effectId);
}

const fullWayward = resolveCelestialTalentEngineDefinition(
  "wayward-star",
  allBranchEffects("wayward-star"),
);
assert.equal(fullWayward.maxImpacts, 29);
assert.equal(fullWayward.supernovaMaxImpacts, 24);
assert.equal(fullWayward.simultaneousStars, 5);
assert.equal(
  (fullWayward.maxImpacts + fullWayward.supernovaMaxImpacts)
    * fullWayward.simultaneousStars,
  265,
);
globalThis.Phaser = { BlendModes: { ADD: "ADD" } };
const displayObject = () => ({
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  angle: 0,
  setBlendMode() { return this; },
  setDepth() { return this; },
  setDisplaySize() { return this; },
  setAlpha(alpha) { this.alpha = alpha; return this; },
  setScale() { return this; },
  setStrokeStyle() { return this; },
  setTint() { return this; },
  setPosition(x, y) { this.x = x; this.y = y; return this; },
  destroy() {},
});
const swarm = new WaywardStarSwarmEngine({
  scene: {
    add: { circle: displayObject, image: displayObject },
    tweens: { add() {}, killTweensOf() {} },
    time: { now: 0 },
  },
  budget: new CelestialActivationBudget(
    "wayward-star",
    "rebalance:swarm",
    0,
    fullWayward,
  ),
  definitionOverride: fullWayward,
  direction: { x: 1, y: 0 },
  tileSize: 16,
  startX: 0,
  startY: 0,
  assetKey: "wayward",
  probeTile: () => ({ solid: false, diggable: false }),
  toTile: () => ({ tx: 0, ty: 0 }),
});
assert.equal(swarm.children.length, 5);
assert.equal(new Set(swarm.children.map(child => child.budget.activationId)).size, 5);
assert.equal(swarm.getSnapshot(0).maxRouteImpacts, 145);
assert.equal(swarm.getSnapshot(0).maxSupernovaImpacts, 120);
assert.equal(swarm.getSnapshot(0).maxImpacts, 265);
assert.equal(swarm.getSnapshot(0).maxBounces, 60);
swarm.destroy();

const waywardBudget = new CelestialActivationBudget(
  "wayward-star",
  "rebalance:wayward",
  0,
  fullWayward,
);
for (let index = 0; index < fullWayward.maxImpacts; index += 1) {
  waywardBudget.tryImpact(100 + index, 100);
}
const waywardHits = [];
const wayward = Object.assign(Object.create(WaywardStarEngine.prototype), {
  active: true,
  finishing: false,
  x: 0,
  y: 0,
  tileSize: 16,
  definition: fullWayward,
  budget: waywardBudget,
  supernovaImpacts: 0,
  supernovaTargetKeys: new Set(),
  toTile: () => ({ tx: 0, ty: 0 }),
  probeTile: () => ({ diggable: true }),
  onImpact: (tx, ty, hitId) => waywardHits.push({ tx, ty, hitId }),
  _spawnImpactRing() {},
  scene: { tweens: { add() {}, killTweensOf() {} } },
  glow: {},
  sprite: {},
  spriteBaseScaleX: 1,
  spriteBaseScaleY: 1,
});
wayward._detonate(1000);
assert.equal(waywardHits.length, fullWayward.supernovaMaxImpacts);
assert.ok(waywardHits.every(hit => hit.hitId.includes(":supernova:")));

const expandingTiles = enumerateExpandingPulseTiles({ tx: 0, ty: 0 }, 3, 2);
const firstOldBandIndex = expandingTiles.findIndex(tile => tile.distanceSq <= 4);
assert.ok(firstOldBandIndex > 0);
assert.ok(expandingTiles.slice(0, firstOldBandIndex).every(tile => tile.distanceSq > 4));

const fullHollow = resolveCelestialTalentEngineDefinition(
  "hollow-sun",
  allBranchEffects("hollow-sun"),
);
assert.deepEqual(fullHollow.pulseTimesMs, [738, 1968, 3198, 4428, 5576, 6724]);
assert.deepEqual(fullHollow.pulseRadiiTiles, [4, 5, 6, 7, 9, 10]);
assert.deepEqual(fullHollow.pulseImpactCaps, [9, 10, 11, 12, 12, 13]);
assert.equal(fullHollow.maxImpacts, 67);
assert.equal(fullHollow.lifetimeMs, 11000);
assert.equal(fullHollow.simultaneousHoles, 5);
assert.equal(fullHollow.implosionMaxImpacts, 12);
assert.equal(fullHollow.implosionRadiusTiles, 4);
const hollowBudget = new CelestialActivationBudget(
  "hollow-sun",
  "rebalance:hollow",
  0,
  fullHollow,
);
const hollowHits = [];
const hollow = Object.assign(Object.create(HollowSunEngine.prototype), {
  x: 0,
  y: 0,
  definition: fullHollow,
  budget: hollowBudget,
  pulseImpacts: [],
  toTile: () => ({ tx: 0, ty: 0 }),
  probeTile: () => ({ diggable: true }),
  onImpact: (tx, ty, hitId) => hollowHits.push({ tx, ty, hitId }),
  _spawnGravityRing() {},
});
for (let index = 0; index < fullHollow.pulseTimesMs.length; index += 1) {
  hollow._pulse(index, fullHollow.pulseTimesMs[index]);
}
assert.deepEqual(hollow.pulseImpacts, fullHollow.pulseImpactCaps);
assert.equal(hollowHits.length, fullHollow.maxImpacts);
assert.equal(new Set(hollowHits.map(hit => `${hit.tx},${hit.ty}`)).size, hollowHits.length);
let pullTween = null;
const pullShard = {
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  setDisplaySize() { return this; },
  setTint() { return this; },
  setAlpha() { return this; },
  setDepth() { return this; },
  destroy() {},
};
const pullHarness = Object.assign(Object.create(HollowSunEngine.prototype), {
  x: 8,
  y: 8,
  tileSize: 16,
  pulledFragments: new Set(),
  pulledFragmentCount: 0,
  scene: {
    textures: { exists: () => true },
    add: { image: () => pullShard },
    tweens: { add: config => { pullTween = config; } },
  },
});
pullHarness._spawnPulledFragment(
  { tx: 4, ty: 5 },
  { type: 1 },
  0,
  0,
);
assert.equal(pullHarness.pulledFragmentCount, 1);
assert.equal(pullTween.x, pullHarness.x);
assert.equal(pullTween.y, pullHarness.y);

const fullRage = resolveCelestialTalentEngineDefinition(
  "comet-engine",
  allBranchEffects("comet-engine"),
);
assert.equal(fullRage.name, "STELLAR LANCE");
assert.equal(fullRage.lifetimeMs, 11000);
assert.equal(fullRage.projectileRangeTiles, 12);
assert.equal(fullRage.projectileDamageMultiplier, 2);
assert.equal(fullRage.projectileSideLanes, 1);
assert.equal("damageMultiplier" in fullRage, false);
assert.equal("attackSpeedMultiplier" in fullRage, false);
const rageEngine = new StellarRageEngine({
  scene: {
    add: { circle: displayObject, image: displayObject },
    tweens: { add() {}, killTweensOf() {} },
  },
  budget: new CelestialActivationBudget(
    "comet-engine",
    "rebalance:rage-live",
    0,
    fullRage,
  ),
  definitionOverride: fullRage,
  assetKey: "rage",
  tileSize: 16,
  getAnchor: () => ({ x: 32, y: 48 }),
});
rageEngine.update(1000, 1000);
assert.equal(rageEngine.getBuffSnapshot(1000).projectileEnabled, true);
rageEngine.destroy();
const rageSnapshot = Object.assign(Object.create(StellarRageEngine.prototype), {
  empowered: true,
  definition: fullRage,
  shotsFired: 0,
  projectileImpacts: 0,
  projectileDestroyed: 0,
  budget: {
    engineId: "comet-engine",
    activationId: "rebalance:rage",
    startedAtMs: 1000,
  },
}).getBuffSnapshot(3500);
assert.equal(rageSnapshot.remainingMs, 8500);
assert.equal(rageSnapshot.projectileRangeTiles, 12);
assert.equal(rageSnapshot.projectileDamageMultiplier, 2);

const empowerDig = new DigSystem(null, null, {
  mineCooldownMs: 800,
  firstFiveEnabled: true,
});
empowerDig.setCelestialEmpowerProvider(() => rageSnapshot);
assert.equal(empowerDig._getDamage(10, 1), 10);
assert.equal(empowerDig._getCooldown(), 800);

const controllerSource = await readFile(
  new URL("../world/playScene/CelestialEngineController.js", import.meta.url),
  "utf8",
);
assert.match(controllerSource, /WaywardStarSwarmEngine/);
assert.match(controllerSource, /HollowSunClusterEngine/);
assert.match(controllerSource, /StellarRageEngine/);
assert.doesNotMatch(controllerSource, /new CometEngine/);
assert.doesNotMatch(controllerSource, /WAYWARD REDIRECT/);
assert.doesNotMatch(controllerSource, /clearStress|stressImmune/);
const hardcoreBridgeSource = await readFile(
  new URL("../world/playScene/HardcoreModeBridge.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(hardcoreBridgeSource, /stressImmune|celestialEngineController/);

const rootProgression = new StarHeartProgressionSystem();
rootProgression.syncTalentUnlockedEngines(["wayward-star"]);
assert.equal(rootProgression.getSnapshot().charge, 100);
assert.equal(rootProgression.consumeActivation(1000).ok, true);
assert.equal(rootProgression.consumeActivation(1001).reason, "not-charged");
assert.equal(CELESTIAL_ENGINE_CONFIG.charge.capacity, 200);
assert.equal(CELESTIAL_ENGINE_CONFIG.charge.activationCost, 100);

const quickStats = computeAbilityStats(["copper", "bronze"]);
const quick = Object.assign(Object.create(PlayerAbilities.prototype), {
  _godMode: false,
  gemPower: 75,
  getGemPowerMax: () => 100,
  getConstellationStats: () => quickStats,
  consumeGemPower(amount) {
    this.gemPower -= amount;
    return amount;
  },
});
assert.equal(quick.getQuickslashCost(), 4.5);
assert.equal(quick.spendQuickslashCost(), 4.5);
assert.equal(quick.gemPower, 70.5);
assert.equal(quick.getQuickslashCost(), 9);
assert.equal(PLAYER_ABILITIES_CONFIG.quickslashMinimumCooldownMs, 180);
assert.equal(PLAYER_ABILITIES_CONFIG.quickslashMasteryMinimumCooldownMs, 150);

const finalStage = THUNDER_STRIKE_CHAIN_CONFIG.stages.at(-1);
const finalChainMultiplier = resolveThunderStrikeEffectiveDamageMultiplier(
  finalStage.damageMultiplier,
  9,
);
const fullThunderStats = computeAbilityStats(["darkDirtNormal", "darkDirtStrong"]);
const finalVsMiningDamage = finalChainMultiplier
  * PLAYER_ABILITIES_CONFIG.thunderStrikeNormalDamageMultiplier
  * (1 + fullThunderStats.thunderstrikeDamageMult);
assert.equal(finalChainMultiplier, 16.34);
assert.ok(finalVsMiningDamage > 30 && finalVsMiningDamage < 31);
assert.equal(THUNDER_STRIKE_CHAIN_CONFIG.stages.at(-1).timing.windowMs, 80);

assert.deepEqual(STAR_RARITY_PROGRESSION_CONFIG.signProgression.xpTotals, {
  dirt: 70,
  stone: 70,
  copper: 70,
  darkDirtNormal: 42,
  steel: 42,
  iron: 28,
  bronze: 28,
  darkDirtStrong: 28,
  silver: 28,
  gold: 14,
});

console.log("STAR_TALENT_FULL_REBALANCE_CONTRACT_OK");
