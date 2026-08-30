import assert from "node:assert/strict";

import { CelestialActivationBudget } from
  "../systems/celestial/CelestialActivationBudget.js";
import { HollowSunClusterEngine } from
  "../systems/celestial/HollowSunClusterEngine.js";
import { DigSystem } from "../systems/mining/DigSystem.js";
import { CELESTIAL_ENGINE_CONFIG } from "../values/celestialEngines.js";
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
assert.equal(fullLance.lifetimeMs, 11000);
assert.equal(fullLance.projectileRangeTiles, 12);
assert.equal(fullLance.projectileDamageMultiplier, 2);
assert.equal(fullLance.projectileSideLanes, 1);
assert.equal("damageMultiplier" in fullLance, false);
assert.equal("attackSpeedMultiplier" in fullLance, false);

const tileMap = new Map([
  ["1,1", { type: TILE_TYPES.DIRT, hp: 1, solid: true, diggable: true }],
  ["2,1", { type: TILE_TYPES.DIRT, hp: 50, solid: true, diggable: true }],
  ["3,1", { type: TILE_TYPES.GEODE_WALL, hp: 999, solid: true, diggable: false }],
  ["4,1", { type: TILE_TYPES.DIRT, hp: 50, solid: true, diggable: true }],
  ["5,1", { type: TILE_TYPES.BEDROCK, hp: 999, solid: true, diggable: false }],
]);
const damageCalls = [];
const worldModel = {
  inBounds: (tx, ty) => tx >= 0 && tx <= 8 && ty >= 0 && ty <= 2,
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
const baseLance = CELESTIAL_ENGINE_CONFIG.engines["comet-engine"];
const projectileEvents = [];
dig.setCelestialEmpowerProvider(() => ({
  active: true,
  engineId: "comet-engine",
  activationId: "lance:test",
  projectileEnabled: true,
  projectileRangeTiles: baseLance.projectileRangeTiles,
  projectileDamageMultiplier: baseLance.projectileDamageMultiplier,
  projectileSideLanes: baseLance.projectileSideLanes,
  projectilePassesGeodeWalls: true,
}));
dig.setCelestialProjectileListener(event => projectileEvents.push(event));

const lanceResult = dig.tryMine({ tx: 1, ty: 1 }, 1000, "RIGHT");
assert.equal(lanceResult.success, true);
assert.deepEqual(
  damageCalls.map(({ tx, damage }) => [tx, damage]),
  [
    [1, MINING_CONFIG.baseDamage],
    [2, MINING_CONFIG.baseDamage],
    [4, MINING_CONFIG.baseDamage],
  ],
  "every pierced tile must receive a fresh full hit after front-tile overkill",
);
assert.equal(tileMap.get("2,1").hp, 50 - MINING_CONFIG.baseDamage);
assert.equal(damageCalls.some(call => call.tx === 5), false);
assert.equal(
  tileMap.get("3,1").hp,
  999,
  "the Lance must pass through protected geode walls without damaging them",
);
assert.equal(lanceResult.celestialProjectile.destroyedCount, 1);
assert.equal(lanceResult.celestialProjectile.blockedTiles[0].tx, 5);
assert.equal(projectileEvents.length, 1);
assert.equal(dig.getDamagePreview(TILE_TYPES.DIRT), MINING_CONFIG.baseDamage);
assert.equal(dig.getEffectiveCooldownMs(), 400);

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
assert.equal(fullHollow.simultaneousHoles, 5);
assert.deepEqual(fullHollow.pulseRadiiTiles, [4, 5, 6, 7, 9, 10]);
assert.deepEqual(fullHollow.pulseImpactCaps, [9, 10, 11, 12, 12, 13]);
assert.equal(fullHollow.maxImpacts, 67);
assert.equal(fullHollow.implosionMaxImpacts, 12);
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
assert.equal(cluster.children.length, 5);
assert.equal(new Set(cluster.children.map(child => child.y)).size, 5);
assert.equal(new Set(cluster.children.map(child => child.budget.activationId)).size, 5);
assert.deepEqual(
  cluster.children.map(child => child.budget.startedAtMs),
  [0, 130, 260, 390, 520],
);
const clusterSnapshot = cluster.getSnapshot(0);
assert.equal(clusterSnapshot.holeCount, 5);
assert.equal(clusterSnapshot.totalPulses, 30);
assert.equal(clusterSnapshot.maxImpacts, 395);
cluster.destroy();

console.log("STARPILLAR_PROJECTILE_BLACK_HOLE_CONTRACT_OK");
