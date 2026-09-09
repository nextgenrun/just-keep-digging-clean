import assert from "node:assert/strict";

import { CelestialActivationBudget } from
  "../systems/celestial/CelestialActivationBudget.js";
import { StellarRageEngine } from
  "../systems/celestial/StellarRageEngine.js";
import { CelestialEngineHudSystem } from
  "../systems/visual/CelestialEngineHudSystem.js";
import { HUDSystem } from "../systems/visual/HUDSystem.js";
import { createStellarLanceHudBuffEntry } from
  "../systems/visual/stellarLanceHudBuffEntry.js";
import {
  CELESTIAL_ENGINE_CONFIG,
  CELESTIAL_ENGINE_IDS,
} from "../values/celestialEngines.js";
import { resolveCelestialTalentEngineDefinition } from
  "../values/celestialTalentEffects.js";
import { CELESTIAL_TALENT_PROGRESSION_CONFIG } from
  "../values/celestialTalentProgression.js";

globalThis.Phaser = { BlendModes: { ADD: "ADD" } };

function fullLanceDefinition() {
  const branch = CELESTIAL_TALENT_PROGRESSION_CONFIG.branches.find(
    candidate => candidate.id === CELESTIAL_ENGINE_IDS.STELLAR_RAGE,
  );
  return resolveCelestialTalentEngineDefinition(
    CELESTIAL_ENGINE_IDS.STELLAR_RAGE,
    branch.nodes.filter(node => node.kind !== "ability").map(node => node.effectId),
  );
}

function makeDisplay(registry, x = 0, y = 0, assetKey = null) {
  const display = {
    x,
    y,
    assetKey,
    angle: 0,
    alpha: 1,
    scaleX: 1,
    scaleY: 1,
    destroyed: false,
    setAlpha(value) { this.alpha = value; return this; },
    setBlendMode() { return this; },
    setCrop(x, y, width, height) { this.crop = { x, y, width, height }; return this; },
    setDepth() { return this; },
    setDisplaySize(width, height) { this.displaySize = { width, height }; return this; },
    setOrigin(x, y) { this.originX = x; this.originY = y; return this; },
    setTint(value) { this.tint = value; return this; },
    destroy() { this.destroyed = true; },
  };
  registry.push(display);
  return display;
}

function makeScene() {
  const displays = [];
  const tweenConfigs = [];
  return {
    displays,
    tweenConfigs,
    add: { image: (x, y, assetKey) => makeDisplay(displays, x, y, assetKey) },
    tweens: {
      add(config) { tweenConfigs.push(config); return config; },
      killTweensOf() {},
    },
  };
}

function makeGraphics(fillCalls = []) {
  return {
    clear() { return this; },
    fillStyle() { return this; },
    lineStyle() { return this; },
    strokeRoundedRect() { return this; },
    fillRoundedRect(...args) { fillCalls.push(args); return this; },
  };
}

const definition = fullLanceDefinition();
const scene = makeScene();
const engine = new StellarRageEngine({
  scene,
  budget: new CelestialActivationBudget(
    CELESTIAL_ENGINE_IDS.STELLAR_RAGE,
    "vfx-hud:lance",
    0,
    definition,
  ),
  definitionOverride: definition,
  projectileAssetKeys: ["lance-blue", "lance-purple", "lance-red"],
  impactAssetKey: "lance-impact",
  tileSize: 16,
  getAnchor: () => ({ x: 10, y: 20 }),
});

assert.equal(scene.displays.length, 0, "Stellar Lance still creates no player icon");
assert.equal(engine.launchProjectile({
  originWorld: { x: 22, y: 20 },
  direction: { x: 1, y: 0 },
  targetTile: { tx: 1, ty: 1 },
  traversedRangeTiles: 8,
  visualPaths: [{
    lane: 0,
    transitions: [
      { tx: 1, ty: 1, distance: 1, projectileStateIndex: 0 },
      { tx: 4, ty: 1, distance: 4, projectileStateIndex: 1 },
      { tx: 8, ty: 1, distance: 8, projectileStateIndex: 2 },
    ],
    endTile: { tx: 8, ty: 1, distance: 8, projectileStateIndex: 2 },
  }],
  hits: [
    { tx: 2, ty: 1, lane: 0, distance: 2, result: { success: true } },
    { tx: 6, ty: 1, lane: 0, distance: 6, result: { success: true } },
  ],
  impactedCount: 2,
  destroyedCount: 0,
}), true);

assert.equal(engine.getBuffSnapshot(1000).launchFlashCount, 0);
assert.equal(engine.getBuffSnapshot(1000).playerVisualCount, 0);
const projectile = [...engine.projectiles][0];
assert.equal(projectile.x, 22);
assert.equal(projectile.y, 20);
assert.deepEqual(projectile.displaySize, { width: 64, height: 28 });
const travel = scene.tweenConfigs.find(t => t.targets === projectile);
assert.ok(Math.abs(travel.x - 73.28) < 1e-9);
assert.equal(travel.y, 20);
assert.ok(Math.abs(travel.duration - 51.28 / 225 * 1000) < 1e-9);
assert.equal(travel.ease, "Linear");
assert.equal("alpha" in travel, false, "the core remains fully opaque during flight");
for (const prop of ["scaleX", "scaleY", "angle"]) assert.equal(prop in travel, false);
travel.onComplete();
assert.equal(projectile.assetKey, "lance-blue");
assert.equal(projectile.destroyed, true);
assert.equal(engine.getBuffSnapshot(1000).stateBurstCount, 0);
assert.equal(engine.getBuffSnapshot(1000).scheduledImpactCount, 2);
assert.equal(engine.getBuffSnapshot(1000).impactMomentCount, 1, "a tile already covered at release impacts immediately");
const impactDisplays = scene.displays.filter(display => display.assetKey === "lance-impact");
assert.equal(impactDisplays.length, 2, "every contacted tile needs its own impact sprite");
assert.ok(impactDisplays[0].alpha > 0);
assert.equal(impactDisplays[1].alpha, 0);
assert.ok(impactDisplays.every(display => display.angle === -90),
  "the authored downward strike axis must rotate into rightward travel");
assert.ok(impactDisplays.every(display => display.originX === 0.493));
assert.ok(impactDisplays.every(display => display.originY === 0.56),
  "the bright impact core, not the canvas center, must own the tile contact");
assert.equal(impactDisplays[0].x, 32);
assert.equal(impactDisplays[0].y, 20,
  "the authored core pivot must land on the projectile contact line");
for (const impact of impactDisplays.slice(1)) {
  const arrival = scene.tweenConfigs.find(
    candidate => candidate.targets === impact && candidate.duration === 1,
  );
  assert.ok(arrival, "impact art must wait for the wave to reach its tile");
  arrival.onComplete();
}
assert.equal(engine.getBuffSnapshot(1000).impactMomentCount, 2);
const leftImpact = engine.vfx.spawnImpact({ tx: 3, ty: 1 }, 0, 0, 180);
assert.equal(leftImpact.angle, 90,
  "leftward shots must mirror the authored strike axis into their impact");
const downImpact = engine.vfx.spawnImpact({ tx: 3, ty: 2 }, 0, 0, 90);
assert.equal(downImpact.angle, 0);
const upImpact = engine.vfx.spawnImpact({ tx: 3, ty: 0 }, 0, 0, -90);
assert.equal(upImpact.angle, -180,
  "vertical shots must retain the same travel-to-contact alignment");

const cycleShot = distance => ({
  direction: { x: 1, y: 0 },
  targetTile: { tx: 1, ty: 1 },
  visualPaths: [{
    lane: 0,
    transitions: [],
    endTile: { tx: distance, ty: 1, lane: 0, distance, projectileStateIndex: 0 },
  }],
  hits: [],
  impactedCount: 0,
  destroyedCount: 0,
});
engine.launchProjectile(cycleShot(2));
assert.equal([...engine.projectiles].at(-1).assetKey, "lance-purple");
engine.launchProjectile(cycleShot(3));
assert.equal([...engine.projectiles].at(-1).assetKey, "lance-red");
assert.deepEqual(engine.getBuffSnapshot(1000).paletteHistory, ["blue", "purple", "red"]);
assert.deepEqual(
  engine.getBuffSnapshot(1000).projectilePaletteCycle,
  ["blue", "purple", "red"],
);

const buffSnapshot = engine.getBuffSnapshot(2500);
const buffEntry = createStellarLanceHudBuffEntry(buffSnapshot);
assert.equal(buffEntry.text, "LANCE 12.5s");
assert.equal(buffEntry.icon, "power");
assert.match(buffEntry.tooltip.body, /7 TILE RANGE/);
assert.match(buffEntry.tooltip.body, /5 LANES/);
assert.match(buffEntry.tooltip.body, /1.35–1.55× DAMAGE/);
assert.equal(buffSnapshot.resonantReady, true);
assert.match(buffEntry.tooltip.body, /FIRST BLOCK/);
assert.match(buffEntry.tooltip.body, /leftover damage/);
assert.match(buffEntry.tooltip.body, /blue, purple, red/);

const passiveSnapshot = { ...buffSnapshot, passiveEcho: true,
  remainingMs: Number.MAX_SAFE_INTEGER, lifetimeMs: Number.MAX_SAFE_INTEGER };
const passiveEntry = createStellarLanceHudBuffEntry(passiveSnapshot);
assert.equal(passiveEntry.text, "ECHO LANCE");
assert.match(passiveEntry.tooltip.title, /ECHO LANCE.*PERMANENT/);
assert.match(passiveEntry.tooltip.body, /ALWAYS ON/);
assert.match(passiveEntry.tooltip.body, /Stellar Lance temporarily replaces/);
assert.doesNotMatch(JSON.stringify(passiveEntry), /9007199|\d+s left|ACTIVE/);
assert.equal(passiveSnapshot.remainingMs, Number.MAX_SAFE_INTEGER, "presentation must not alter passive lifetime");

let approvedEntries = [];
const productionHud = Object.assign(Object.create(HUDSystem.prototype), {
  _systemVisibility: { buff: true },
  specialBlockEffectsManager: null,
  scene: {
    time: { now: 2500 },
    celestialEngineController: { getEmpowerSnapshot: () => buffSnapshot },
  },
  approvedSkin: {
    active: true,
    setBuffEntries(entries) { approvedEntries = entries; },
  },
  buffTimerText: { setVisible() {} },
});
productionHud.updateBuffTimers();
assert.equal(approvedEntries[0].text, "LANCE 12.5s");
productionHud.scene.celestialEngineController.getEmpowerSnapshot = () => passiveSnapshot;
productionHud.updateBuffTimers();
assert.equal(approvedEntries[0].text, "ECHO LANCE");
productionHud.scene.celestialEngineController.getEmpowerSnapshot = () => buffSnapshot;
productionHud.updateBuffTimers();
assert.equal(approvedEntries[0].text, "LANCE 12.5s", "a real activation replaces the passive label");

const barFillCalls = [];
const title = {
  text: "",
  color: "",
  setText(value) { this.text = value; return this; },
  setColor(value) { this.color = value; return this; },
};
const compactHud = Object.assign(Object.create(CelestialEngineHudSystem.prototype), {
  snapshot: { charge: 0, chargeCapacity: 200 },
  title,
  state: { setText() {} },
  bg: makeGraphics(),
  bar: makeGraphics(barFillCalls),
});
compactHud.setActiveSnapshot({
  ...buffSnapshot,
  remainingMs: definition.lifetimeMs / 2,
  lifetimeMs: definition.lifetimeMs,
});
assert.match(title.text, /STELLAR LANCE.*ACTIVE/);
assert.equal(
  barFillCalls.at(-1)[2],
  CELESTIAL_ENGINE_CONFIG.hud.barWidthPx / 2,
  "the compact Star Heart HUD bar must show remaining buff duration",
);

engine.destroy();
assert.equal(engine.vfx.effects.size, 0);
assert.ok(scene.displays.every(display => display.destroyed));

console.log("STELLAR_LANCE_VFX_HUD_CONTRACT_OK");
