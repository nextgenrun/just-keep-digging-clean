import assert from "node:assert/strict";
import fs from "node:fs";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_VISUAL_FEEDBACK } from "../values/worldVisualFeedback.js";
import { WORLD_VISUAL_GAMEPLAY_EFFECTS } from "../values/worldVisualGameplayEffects.js";
import { resolveWorldVisualSemanticAssetsEnabled } from "../values/worldVisualSemanticAssets.js";
import { WorldVisualFeedbackLayer } from "../world/rendering/scenic-world/WorldVisualFeedbackLayer.js";
import { WorldVisualGameplayEffectLayer } from "../world/rendering/scenic-world/WorldVisualGameplayEffectLayer.js";
import { WorldVisualRuntime } from "../world/rendering/scenic-world/WorldVisualRuntime.js";

class GraphicsStub {
  constructor() { this.calls = []; }
  call(method, ...args) { this.calls.push([method, ...args]); return this; }
  setDepth(value) { return this.call("setDepth", value); }
  setMask(value) { return this.call("setMask", value); }
  setBlendMode(value) { return this.call("setBlendMode", value); }
  clear() { return this.call("clear"); }
  fillStyle(...args) { return this.call("fillStyle", ...args); }
  fillCircle(...args) { return this.call("fillCircle", ...args); }
  fillTriangle(...args) { return this.call("fillTriangle", ...args); }
  fillEllipse(...args) { return this.call("fillEllipse", ...args); }
  lineStyle(...args) { return this.call("lineStyle", ...args); }
  beginPath() { return this.call("beginPath"); }
  moveTo(...args) { return this.call("moveTo", ...args); }
  lineTo(...args) { return this.call("lineTo", ...args); }
  strokePath() { return this.call("strokePath"); }
  strokeCircle(...args) { return this.call("strokeCircle", ...args); }
  destroy() { return this.call("destroy"); }
}

const key = (tx, ty) => `${tx}:${ty}`;
const types = new Map([
  [key(0, 0), TILE_TYPES.SKY_TILE],
  [key(1, 0), TILE_TYPES.CHEST],
  [key(2, 0), TILE_TYPES.GLOW_CRYSTAL],
  [key(3, 0), TILE_TYPES.DIRT],
  [key(2, 1), TILE_TYPES.STONE],
]);
const worldModel = {
  treasureRoomZones: [{ chestTx: 1, chestTy: 0 }],
  hiddenCaveZones: [{ cx: 1, cy: 0, hasTreasureRoom: true }],
  glowCrystalZones: [{ cx: 2, cy: 1, rx: 1, ry: 1, color: 0x44ddff, phase: 0.3 }],
  getTileType: (tx, ty) => types.get(key(tx, ty)) ?? TILE_TYPES.AIR,
  getSkyTileRarity: () => 2,
  getSkyTileOriginalType: () => TILE_TYPES.COPPER,
  getGlowCrystalActiveRatio: () => 0.8,
};
const graphics = [];
const scene = {
  config: { tileSize: 94 },
  time: { now: 2200 },
  add: {
    graphics: () => {
      const item = new GraphicsStub();
      graphics.push(item);
      return item;
    },
  },
};
const layer = new WorldVisualGameplayEffectLayer(scene, worldModel, { id: "solid-mask" });
layer.create();
layer.sync({ left: 0, right: 4, top: 0, bottom: 2 });

assert.equal(graphics.length, 4, "semantic effects should own bounded pooled Graphics layers");
assert.ok(graphics.every(item => item.calls.some(([method]) => method === "setMask")), "all cues must share the solid geometry mask");
assert.equal(layer.skyTiles.length, 1);
assert.equal(layer.chestTiles.length, 1, "zone metadata must deduplicate the real chest tile");
assert.equal(layer.crystalTiles.length, 1);
assert.equal(layer.crystalZones.length, 1);
assert.equal(layer.updateSkyTileGlow({ tx: 1, ty: 0 }, 20), true);
assert.equal(layer.updateChestGlow({ tx: 1, ty: 0 }, 25), true);
assert.equal(layer.updateGlowCrystals({ tx: 2, ty: 0 }, 25), true);
assert.equal(resolveWorldVisualSemanticAssetsEnabled(undefined, ""), true);
assert.equal(
  graphics[1].calls.some(([method]) => ["fillTriangle", "lineTo", "strokePath"].includes(method)),
  false,
  "generated star artwork must replace the primitive faceted cue"
);
assert.ok(graphics[2].calls.some(([method]) => method === "fillCircle"), "chests need a restrained golden pulse");
assert.ok(graphics[3].calls.some(([method]) => method === "fillEllipse"), "crystal zones need a soft authored halo");
assert.ok(graphics[0].calls.some(([method]) => method === "fillTriangle"), "crystal zones need physical shards below darkness");
assert.equal(layer.updateSpecialBlockGlow(), false);
assert.equal(WORLD_VISUAL_GAMEPLAY_EFFECTS.compatibility.specialBlockGlow.disposition, "visual-only-no-op");
assert.equal(WORLD_VISUAL_GAMEPLAY_EFFECTS.compatibility.specialBlockGlow.owner, "WorldVisualFeedbackLayer");

layer.setEmissiveDepth(777);
assert.ok(graphics[1].calls.some(call => call[0] === "setDepth" && call[1] === 777));
assert.ok(graphics[2].calls.some(call => call[0] === "setDepth" && call[1] === 777));
assert.ok(graphics[3].calls.some(call => call[0] === "setDepth" && call[1] === 777));
assert.ok(!graphics[0].calls.some(call => call[0] === "setDepth" && call[1] === 777), "physical shards must remain terrain-level");

types.set(key(0, 0), TILE_TYPES.AIR);
layer.invalidateCell(0, 0);
assert.equal(layer.skyTiles.length, 0, "tile invalidation must remove stale semantic cues");

const priorityDraws = [];
let resourceDraws = 0;
const priorityLayer = Object.assign(Object.create(WorldVisualFeedbackLayer.prototype), {
  scene: { config: { tileSize: 94 } },
  worldModel: {
    getTileType: tx => tx === 4 ? TILE_TYPES.TELEPORT_TILE : TILE_TYPES.STONE,
    getSkyTileOriginalType: () => TILE_TYPES.STONE,
    getTileHp: () => 10,
    getTileMaxHp: () => 10,
  },
  config: { streaming: { maxVisibleResourceVeins: 1, maxVisibleDamageCells: 1 } },
  feedbackConfig: WORLD_VISUAL_FEEDBACK,
  resourceVeinsEnabled: true,
  decals: { clear() {} },
  markerPool: [],
  _showMarker: (_index, tx, ty, type) => priorityDraws.push({ tx, ty, type }),
  _drawEmbeddedResource: () => { resourceDraws += 1; },
});
priorityLayer.sync({ left: 0, right: 5, top: 0, bottom: 1 });
assert.equal(resourceDraws, 1, "dense resources must still honor their bounded visual budget");
assert.deepEqual(
  priorityDraws,
  [{ tx: 4, ty: 0, type: TILE_TYPES.TELEPORT_TILE }],
  "a later gameplay marker must render even after the resource budget is exhausted",
);

const runtimeMethods = new Set(Object.getOwnPropertyNames(WorldVisualRuntime.prototype));
const callSiteFiles = [
  "../world/playScene/PlaySceneSetup.js",
  "../world/playScene/PlaySceneUpdate.js",
  "../world/playScene/PlaySceneGameplay.js",
  "../world/playScene/PlaySceneUI.js",
  "../systems/mining/DigSystem.js",
  "../systems/environment/EarthquakeSystem.js",
  "../systems/environment/SurfaceTunnelDoorSystem.js",
];
const invokedMethods = new Set();
for (const file of callSiteFiles) {
  const source = fs.readFileSync(new URL(file, import.meta.url), "utf8");
  for (const match of source.matchAll(/worldRenderer(?:\?\.|\.)([A-Za-z_$][\w$]*)(?:\?\.)?\s*\(/g)) {
    invokedMethods.add(match[1]);
  }
}
for (const required of ["create", "applyTileUpdate", "updateRenderWindow", "update", "updateSkyTileGlow", "updateChestGlow", "updateGlowCrystals", "setEmissiveRenderDepth", "destroy"]) {
  assert.ok(invokedMethods.has(required), `call-site audit should find ${required}`);
}
for (const method of invokedMethods) {
  assert.ok(runtimeMethods.has(method), `scenic runtime is missing invoked renderer API: ${method}`);
}
for (const method of ["refreshAllTiles", "playerTileToPixel", "updateSpecialBlockGlow", "resize"]) {
  assert.ok(runtimeMethods.has(method), `scenic compatibility surface is missing ${method}`);
}

const caveSource = fs.readFileSync(new URL("../ui/scenes/CaveScene.js", import.meta.url), "utf8");
assert.match(caveSource, /new WorldRenderer\(/, "compact caves must remain explicitly on their direct renderer");
for (const member of ["createLayer", "paintInitialWorld", "layer"]) {
  assert.ok(WORLD_VISUAL_GAMEPLAY_EFFECTS.compatibility.legacyDirectOnly.includes(member));
}

const runtimeSource = fs.readFileSync(new URL("../world/rendering/scenic-world/WorldVisualRuntime.js", import.meta.url), "utf8");
const effectSource = fs.readFileSync(new URL("../world/rendering/scenic-world/WorldVisualGameplayEffectLayer.js", import.meta.url), "utf8");
const targetSource = fs.readFileSync(new URL("../world/rendering/scenic-world/collectWorldVisualGameplayEffectTargets.js", import.meta.url), "utf8");
assert.doesNotMatch(runtimeSource, /update(?:SkyTileGlow|ChestGlow|GlowCrystals|SpecialBlockGlow)\([^)]*\)\s*\{\s*\}/);
assert.match(runtimeSource, /scale\?\.on\?\.\("resize"/);
assert.match(runtimeSource, /scale\?\.off\?\.\("resize"/);
assert.doesNotMatch(effectSource, /fillRect|fillRoundedRect|strokeRoundedRect/, "restored cues must not resurrect square overlays");
assert.doesNotMatch(`${effectSource}\n${targetSource}`, /\.(?:setTile|setType|setHp|damageTile|applyDugTileKeys)\s*\(/, "visual parity may only read WorldModel");

layer.destroy();
assert.ok(graphics.every(item => item.calls.some(([method]) => method === "destroy")), "all effect pools need destroy lifecycle coverage");
console.log("Scenic renderer functionality parity passed: live APIs, semantic cues, streaming, masks, depths, resize, and read-only authority");
