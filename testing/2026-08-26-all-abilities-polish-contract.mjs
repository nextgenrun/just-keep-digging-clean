import assert from "node:assert/strict";

import { CelestialActivationBudget } from
  "../systems/celestial/CelestialActivationBudget.js";
import { HollowSunClusterEngine } from
  "../systems/celestial/HollowSunClusterEngine.js";
import { StellarRageEngine } from "../systems/celestial/StellarRageEngine.js";
import { WaywardStarSwarmEngine } from
  "../systems/celestial/WaywardStarSwarmEngine.js";
import { CelestialEngineHudSystem } from
  "../systems/visual/CelestialEngineHudSystem.js";
import { CELESTIAL_TALENT_PROGRESSION_CONFIG } from
  "../values/celestialTalentProgression.js";
import { resolveCelestialTalentEngineDefinition } from
  "../values/celestialTalentEffects.js";
import { TILE_TYPES } from "../values/tileTypes.js";

globalThis.Phaser = { BlendModes: { ADD: "ADD" } };

function fullDefinition(engineId) {
  const branch = CELESTIAL_TALENT_PROGRESSION_CONFIG.branches.find(
    candidate => candidate.id === engineId,
  );
  const effects = branch.nodes
    .filter(node => node.kind !== "ability")
    .map(node => node.effectId);
  return resolveCelestialTalentEngineDefinition(engineId, effects);
}

function makeDisplay(registry = []) {
  const display = {
    x: 0,
    y: 0,
    angle: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    destroyed: false,
    setAlpha(value) { this.alpha = value; return this; },
    setBlendMode() { return this; },
    setDepth() { return this; },
    setDisplaySize() { return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
    setStrokeStyle() { return this; },
    setTint() { return this; },
    destroy() { this.destroyed = true; },
  };
  registry.push(display);
  return display;
}

function makeScene() {
  const displays = [];
  const tweens = [];
  const killed = [];
  return {
    displays,
    tweenConfigs: tweens,
    killed,
    time: { now: 0 },
    textures: { exists: () => false },
    add: {
      circle: () => makeDisplay(displays),
      image: () => makeDisplay(displays),
    },
    tweensApi: null,
    installTweens() {
      this.tweensApi = {
        add: config => { tweens.push(config); return config; },
        killTweensOf: target => { killed.push(target); },
      };
      this.tweens = this.tweensApi;
      return this;
    },
  }.installTweens();
}

// A five-star activation reports route + supernova capacity and true union targets.
const waywardDefinition = fullDefinition("wayward-star");
const waywardScene = makeScene();
const swarm = new WaywardStarSwarmEngine({
  scene: waywardScene,
  budget: new CelestialActivationBudget("wayward-star", "polish:swarm", 0, waywardDefinition),
  definitionOverride: waywardDefinition,
  direction: { x: 1, y: 0 },
  tileSize: 16,
  startX: 0,
  startY: 0,
  assetKey: "wayward",
  probeTile: () => ({ solid: false, diggable: false }),
  toTile: () => ({ tx: 0, ty: 0 }),
});
swarm.children[0].budget.tryImpact(4, 5);
swarm.children[1].budget.tryImpact(4, 5);
for (const child of swarm.children.slice(0, 2)) {
  child.supernovaImpacts = 1;
  child.supernovaTargetKeys.add("4,5");
}
const swarmHealth = swarm.getSnapshot(500);
assert.deepEqual(
  [swarmHealth.routeImpacts, swarmHealth.supernovaImpacts, swarmHealth.impacts],
  [2, 2, 4],
);
assert.deepEqual(
  [swarmHealth.maxRouteImpacts, swarmHealth.maxSupernovaImpacts, swarmHealth.maxImpacts],
  [145, 120, 265],
);
assert.equal(swarmHealth.uniqueTargets, 1);
swarm.destroy();
assert.ok(waywardScene.displays.every(display => display.destroyed));

// Partial swarm construction rolls back every already-created child visual.
const rollbackDisplays = [];
let imageAttempts = 0;
const rollbackScene = {
  time: { now: 0 },
  add: {
    circle: () => makeDisplay(rollbackDisplays),
    image: () => {
      imageAttempts += 1;
      if (imageAttempts === 3) throw new Error("authored star texture unavailable");
      return makeDisplay(rollbackDisplays);
    },
  },
  tweens: { add() {}, killTweensOf() {} },
};
assert.throws(() => new WaywardStarSwarmEngine({
  scene: rollbackScene,
  budget: new CelestialActivationBudget("wayward-star", "polish:rollback", 0, waywardDefinition),
  definitionOverride: waywardDefinition,
  direction: { x: 1, y: 0 },
  tileSize: 16,
  startX: 0,
  startY: 0,
  assetKey: "wayward",
  probeTile: () => ({ solid: false, diggable: false }),
  toTile: () => ({ tx: 0, ty: 0 }),
}), /texture unavailable/);
assert.ok(rollbackDisplays.every(display => display.destroyed));

// Hollow Sun completes five independently budgeted black holes.
const hollowDefinition = fullDefinition("hollow-sun");
const hollowScene = makeScene();
let hollowCompletion = null;
const hollow = new HollowSunClusterEngine({
  scene: hollowScene,
  budget: new CelestialActivationBudget("hollow-sun", "polish:hollow", 0, hollowDefinition),
  definitionOverride: hollowDefinition,
  direction: { x: 1, y: 0 },
  x: 0,
  y: 0,
  tileSize: 16,
  assetKey: "hollow",
  toTile: () => ({ tx: 0, ty: 0 }),
  probeTile: () => ({ diggable: true, type: TILE_TYPES.DIRT }),
  onComplete: (_reason, health) => { hollowCompletion = health; },
});
hollow.update(11520, 16);
assert.deepEqual(
  [hollow.getSnapshot(11520).holeCount, hollow.getSnapshot(11520).impacts],
  [5, 395],
);
assert.equal(hollow.getSnapshot(11520).maxImpacts, 395);
for (const child of hollow.children) {
  hollowScene.tweenConfigs.find(
    tween => tween.targets === child.sprite && typeof tween.onComplete === "function",
  ).onComplete();
}
assert.equal(hollowCompletion.impacts, 395);
assert.equal(hollowCompletion.holeCount, 5);
assert.equal(hollow.active, false);
assert.doesNotThrow(() => hollow.destroy());

// Stellar Lance expires by budget time, reports projectile output, and tears down safely.
const rageDefinition = fullDefinition("comet-engine");
const rageScene = makeScene();
let rageCompletion = null;
const rage = new StellarRageEngine({
  scene: rageScene,
  budget: new CelestialActivationBudget("comet-engine", "polish:rage", 0, rageDefinition),
  definitionOverride: rageDefinition,
  assetKey: "rage",
  tileSize: 16,
  getAnchor: () => ({ x: 10, y: 20 }),
  onComplete: (_reason, health) => { rageCompletion = health; },
});
assert.equal(rage.getBuffSnapshot(10999).active, true);
assert.equal(rage.getBuffSnapshot(11000).active, false);
assert.equal(rage.launchProjectile({
  direction: { x: 1, y: 0 },
  targetTile: { tx: 1, ty: 1 },
  rangeTiles: 3,
  endTiles: [{ tx: 3, ty: 1, distance: 3 }],
  hits: [{ tx: 1, ty: 1, distance: 1 }, { tx: 3, ty: 1, distance: 3 }],
  impactedCount: 2,
  destroyedCount: 1,
}), true);
assert.equal(rage.getBuffSnapshot(1000).shotsFired, 1);
assert.equal(rage.getBuffSnapshot(1000).projectileImpacts, 2);
rage.update(11000, 1000);
rageScene.tweenConfigs.find(tween => (
  Array.isArray(tween.targets) && typeof tween.onComplete === "function"
)).onComplete();
assert.equal(rageCompletion.active, false);
assert.equal(rageCompletion.projectileDestroyed, 1);
assert.doesNotThrow(() => rage.destroy());
assert.ok(rageScene.displays.every(display => display.destroyed));

const failedRageDisplays = [];
let failedImageAttempts = 0;
assert.throws(() => new StellarRageEngine({
  scene: {
    add: { image: () => {
      failedImageAttempts += 1;
      if (failedImageAttempts === 2) throw new Error("rage visual failed");
      return makeDisplay(failedRageDisplays);
    } },
    tweens: { add() {}, killTweensOf() {} },
  },
  budget: new CelestialActivationBudget("comet-engine", "polish:rage-fail", 0, rageDefinition),
  definitionOverride: rageDefinition,
  assetKey: "rage",
  getAnchor: () => ({ x: 0, y: 0 }),
}), /visual failed/);
assert.ok(failedRageDisplays.every(display => display.destroyed));

// Compact HUD copy exposes live projectile, star, and multi-hole budgets.
const hudLines = [];
const hud = Object.assign(Object.create(CelestialEngineHudSystem.prototype), {
  snapshot: {},
  state: { setText: text => hudLines.push(text) },
});
hud.setActiveSnapshot({
  projectileEnabled: true,
  remainingMs: 9000,
  projectileRangeTiles: 12,
  projectileSideLanes: 1,
  projectileDamageMultiplier: 2,
});
hud.setActiveSnapshot({ starCount: 5, activeStars: 5, impacts: 0, maxImpacts: 265 });
hud.setActiveSnapshot({ holeCount: 5, activeHoles: 5, impacts: 0, maxImpacts: 395 });
assert.match(hudLines[0], /12 TILE.*3× 2 DMG/);
assert.match(hudLines[1], /STARS 5\/5.*0\/265/);
assert.match(hudLines[2], /HOLES 5\/5.*0\/395/);

console.log("ALL_ABILITIES_POLISH_CONTRACT_OK");
