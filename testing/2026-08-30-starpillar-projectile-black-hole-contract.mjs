import assert from "node:assert/strict";

import { CelestialActivationBudget } from
  "../systems/celestial/CelestialActivationBudget.js";
import { HollowSunClusterEngine } from
  "../systems/celestial/HollowSunClusterEngine.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { CELESTIAL_TALENT_PROGRESSION_CONFIG } from
  "../values/celestialTalentProgression.js";
import { resolveCelestialTalentEngineDefinition } from
  "../values/celestialTalentEffects.js";
import { MINING_CONFIG } from "../values/miningConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";

function allEffects(engineId) {
  return CELESTIAL_TALENT_PROGRESSION_CONFIG.branches
    .find(branch => branch.id === engineId)
    .nodes
    .filter(node => node.kind !== "ability")
    .map(node => node.effectId);
}

const fullLance = resolveCelestialTalentEngineDefinition(
  "comet-engine",
  allEffects("comet-engine"),
);
assert.equal(fullLance.name, "STELLAR LANCE");
assert.equal(fullLance.lifetimeMs, 12500);
assert.equal(fullLance.projectileRangeTiles, 8);
assert.equal(fullLance.projectileInfiniteRange, false);
assert.equal(fullLance.projectileDamageMultiplier, 1.5);
assert.equal(fullLance.projectileSideLanes, 1);
assert.deepEqual(
  fullLance.projectileStates.map(state => [
    state.id,
    state.minimumDistanceTiles,
    state.damageMultiplier,
  ]),
  [
    ["violet-edge", 1, 1],
    ["amethyst-surge", 3, 1],
    ["voidpiercer", 5, 1],
  ],
);
assert.equal("damageMultiplier" in fullLance, false);
assert.equal("attackSpeedMultiplier" in fullLance, false);

const tileMap = new Map([
  ["1,1", { type: TILE_TYPES.DIRT, hp: 1, solid: true, diggable: true }],
  ["2,1", { type: TILE_TYPES.DIRT, hp: 50, solid: true, diggable: true }],
  ["3,1", { type: TILE_TYPES.GEODE_WALL, hp: 999, solid: true, diggable: false }],
  ["4,1", { type: TILE_TYPES.DIRT, hp: 80, solid: true, diggable: true }],
  ["8,1", { type: TILE_TYPES.BEDROCK, hp: 999, solid: true, diggable: false }],
]);
const damageCalls = [];
const worldModel = {
  widthTiles: 21,
  depthTiles: 3,
  inBounds: (tx, ty) => tx >= 0 && tx <= 20 && ty >= 0 && ty <= 2,
  isSolid: (tx, ty) => tileMap.get(`${tx},${ty}`)?.solid === true,
  isDiggable: (tx, ty) => tileMap.get(`${tx},${ty}`)?.diggable === true,
  getTileType: (tx, ty) => tileMap.get(`${tx},${ty}`)?.type ?? TILE_TYPES.AIR,
  damageTile(tx, ty, damage) {
    const tile = tileMap.get(`${tx},${ty}`);
    if (!tile?.diggable) return { success: false, reason: "blocked" };
    const hpBefore = tile.hp;
    tile.hp -= damage;
    const destroyed = tile.hp <= 0;
    damageCalls.push({ tx, ty, damage, hpBefore });
    if (destroyed) tile.solid = false;
    return {
      success: true,
      destroyed,
      hp: Math.max(0, tile.hp),
      hpBefore,
      maxHp: hpBefore,
      overkillDamage: destroyed ? Math.max(0, damage - hpBefore) : 0,
      typeBeforeDamage: tile.type,
      wasRubble: true,
    };
  },
};
const dig = new DigSystem(
  worldModel,
  { applyTileUpdate() {} },
  { ...MINING_CONFIG, mineCooldownMs: 400, firstFiveEnabled: true },
);
const projectileEvents = [];
const playerDigEvents = [];
dig.setCelestialEmpowerProvider(() => ({
  active: true,
  engineId: "comet-engine",
  activationId: "lance:test",
  projectileEnabled: true,
  projectileInfiniteRange: fullLance.projectileInfiniteRange,
  projectileRangeTiles: fullLance.projectileRangeTiles,
  projectileSafetyMaxTiles: fullLance.projectileSafetyMaxTiles,
  projectileDamageMultiplier: fullLance.projectileDamageMultiplier,
  projectileStates: fullLance.projectileStates,
  projectileSideLanes: fullLance.projectileSideLanes,
  projectilePassesGeodeWalls: true,
}));
dig.setCelestialProjectileListener(event => projectileEvents.push(event));
dig.setPlayerDigListener(event => playerDigEvents.push(event));

const lanceResult = dig.tryMine({ tx: 1, ty: 1 }, 1000, "RIGHT");
assert.equal(lanceResult.success, true);
const stateDamage = stateMultiplier => Math.floor(
  MINING_CONFIG.baseDamage
    * fullLance.projectileDamageMultiplier
    * stateMultiplier,
);
assert.deepEqual(
  damageCalls.map(({ tx, damage }) => [tx, damage]),
  [
    [1, stateDamage(1)],
    [2, stateDamage(1) - 1],
  ],
  "only exact front-tile overkill may reach the next tile",
);
assert.equal(tileMap.get("2,1").hp, 51 - stateDamage(1));
assert.equal(tileMap.get("4,1").hp, 80);
assert.equal(damageCalls.some(call => call.tx === 8), false);
assert.equal(
  tileMap.get("3,1").hp,
  999,
  "the Lance must pass through protected geode walls without damaging them",
);
assert.equal(lanceResult.celestialProjectile.destroyedCount, 1);
assert.equal(lanceResult.celestialProjectile.impactedCount, 2);
assert.equal(lanceResult.celestialProjectile.infiniteRange, false);
assert.equal(lanceResult.celestialProjectile.rangeTiles, 8);
assert.equal(lanceResult.celestialProjectile.traversedRangeTiles, 8);
assert.equal(lanceResult.celestialProjectile.projectileStateCount, 3);
assert.equal(lanceResult.celestialProjectile.maximumDamageMultiplier, 1.5);
assert.deepEqual(
  lanceResult.celestialProjectile.visualPaths
    .find(path => path.lane === 0)
    .transitions
    .map(point => [point.distance, point.projectileStateId]),
  [
    [1, "violet-edge"],
  ],
);
assert.deepEqual(
  lanceResult.celestialProjectile.hits.map(hit => hit.carriedDamage),
  [0, stateDamage(1) - 1],
);
assert.equal(
  lanceResult.celestialProjectile.visualPaths.find(path => path.lane === 0).endTile.tx,
  2,
);
assert.equal(lanceResult.celestialProjectile.blockedTiles.length, 0);
assert.equal(projectileEvents.length, 1);
assert.equal(playerDigEvents.length, 1);
assert.equal(playerDigEvents[0].aimDirection, "RIGHT");
assert.equal(dig.getDamagePreview(TILE_TYPES.DIRT), MINING_CONFIG.baseDamage);
assert.equal(dig.getEffectiveCooldownMs(), 400);

const baseLance = resolveCelestialTalentEngineDefinition("comet-engine", []);
tileMap.set("2,1", { type: TILE_TYPES.DIRT, hp: 10, solid: true, diggable: true });
tileMap.set("4,1", { type: TILE_TYPES.DIRT, hp: 80, solid: true, diggable: true });
const baseDamageCallStart = damageCalls.length;
dig.setCelestialEmpowerProvider(() => ({
  active: true,
  engineId: "comet-engine",
  activationId: "lance:base-test",
  projectileEnabled: true,
  projectileInfiniteRange: baseLance.projectileInfiniteRange,
  projectileRangeTiles: baseLance.projectileRangeTiles,
  projectileSafetyMaxTiles: baseLance.projectileSafetyMaxTiles,
  projectileDamageMultiplier: baseLance.projectileDamageMultiplier,
  projectileStates: baseLance.projectileStates,
  projectileSideLanes: baseLance.projectileSideLanes,
  projectilePassesGeodeWalls: true,
}));
const baseLanceResult = dig.tryMine({ tx: 2, ty: 1 }, 2000, "RIGHT");
const baseLanceDamage = Math.floor(
  MINING_CONFIG.baseDamage * baseLance.projectileDamageMultiplier,
);
assert.equal(baseLance.projectileDamageMultiplier, 0.75);
assert.equal(baseLanceResult.celestialProjectile.damageMultiplier, 0.75);
assert.deepEqual(
  damageCalls.slice(baseDamageCallStart).map(({ tx, damage }) => [tx, damage]),
  [[2, baseLanceDamage], [4, baseLanceDamage - 10]],
  "the root Lance must pass only its exact overkill through the geode wall",
);
assert.equal(baseLanceResult.celestialProjectile.visualPaths[0].endTile.tx, 4);

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
  setAlpha() { return this; },
  setScale() { return this; },
  setStrokeStyle() { return this; },
  setTint() { return this; },
  setPosition(x, y) { this.x = x; this.y = y; return this; },
  destroy() {},
});
const fullHollow = resolveCelestialTalentEngineDefinition(
  "hollow-sun",
  allEffects("hollow-sun"),
);
assert.equal(fullHollow.simultaneousHoles, 4);
assert.deepEqual(fullHollow.pulseRadiiTiles, [4, 5, 6, 7, 9, 10]);
assert.deepEqual(fullHollow.pulseImpactCaps, [10, 11, 12, 13, 16, 18]);
assert.equal(fullHollow.maxImpacts, 80);
assert.equal(fullHollow.implosionMaxImpacts, 30);
const cluster = new HollowSunClusterEngine({
  scene: {
    add: { circle: displayObject, image: displayObject },
    tweens: { add() {}, killTweensOf() {} },
    time: { now: 0 },
  },
  budget: new CelestialActivationBudget(
    "hollow-sun",
    "cluster:test",
    0,
    fullHollow,
  ),
  definitionOverride: fullHollow,
  direction: { x: 1, y: 0 },
  tileSize: 16,
  assetKey: "hollow",
  x: 160,
  y: 96,
  probeTile: () => ({ diggable: false, type: TILE_TYPES.AIR }),
  toTile: (x, y) => ({ tx: Math.floor(x / 16), ty: Math.floor(y / 16) }),
});
assert.equal(cluster.children.length, 4);
assert.equal(new Set(cluster.children.map(child => child.y)).size, 4);
assert.equal(new Set(cluster.children.map(child => child.budget.activationId)).size, 4);
assert.deepEqual(
  cluster.children.map(child => child.budget.startedAtMs),
  [0, 130, 260, 390],
);
const topToBottom = [...cluster.children].sort((left, right) => left.y - right.y);
const absolutePulseTimes = pulseIndex => topToBottom.map(child => (
  child.budget.startedAtMs + child.definition.pulseTimesMs[pulseIndex]
));
assert.deepEqual(
  absolutePulseTimes(0),
  [...absolutePulseTimes(0)].sort((left, right) => left - right),
  "the first pulse must travel from the top hole to the bottom hole",
);
assert.deepEqual(
  absolutePulseTimes(1),
  [...absolutePulseTimes(1)].sort((left, right) => right - left),
  "the next pulse must return from the bottom hole to the top hole",
);
const beforeDriftX = cluster.children.map(child => child.x);
assert.equal(cluster.nudge({ x: 1, y: 0 }), true);
cluster.update(100, 100);
assert.ok(cluster.children.every((child, index) => child.x > beforeDriftX[index]));
const clusterSnapshot = cluster.getSnapshot(0);
assert.equal(clusterSnapshot.holeCount, 4);
assert.equal(clusterSnapshot.totalPulses, 24);
assert.equal(clusterSnapshot.maxImpacts, 440);
assert.equal(clusterSnapshot.digNudges, 1);
assert.equal(clusterSnapshot.driftTargetTiles.x, fullHollow.digDriftStepTiles);
cluster.destroy();

console.log("STARPILLAR_PROJECTILE_BLACK_HOLE_CONTRACT_OK");
