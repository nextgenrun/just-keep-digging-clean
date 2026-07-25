import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { TILE_TYPES } from "../values/tileTypes.js";
import {
  WORLD_VISUAL_MATERIALS,
  resolveWorldVisualMaterialBands,
} from "../values/worldVisualMaterials.js";
import { WORLD_VISUAL_RUNTIME } from "../values/worldVisualRuntime.js";
import { WorldVisualMaterialField } from "../world/rendering/scenic-world/WorldVisualMaterialField.js";

class FakeLoader extends EventEmitter {
  isLoading() { return false; }
  image() {}
  start() {}
}

class FakeImage {
  constructor(x, y, key) {
    this.x = x;
    this.y = y;
    this.key = key;
    this.destroyed = false;
  }

  setOrigin() { return this; }
  setDepth(value) { this.depth = value; return this; }
  setMask(value) { this.mask = value; return this; }
  setAlpha(value) { this.alpha = value; return this; }
  setTint(value) { this.tint = value; return this; }
  setCrop(x, y, width, height) {
    this.crop = { x, y, width, height };
    return this;
  }
  destroy() { this.destroyed = true; }
}

function fakeGraphics() {
  return {
    fills: [],
    clear() { this.fills = []; return this; },
    fillStyle() { return this; },
    fillRect(x, y, width, height) { this.fills.push({ x, y, width, height }); return this; },
    lineStyle() { return this; },
    beginPath() { return this; },
    moveTo() { return this; },
    lineTo() { return this; },
    strokePath() { return this; },
    setDepth() { return this; },
    createGeometryMask() { return { destroy() {} }; },
    destroy() {},
  };
}

const images = [];
const removedKeys = [];
const materialKeys = new Set(Object.values(WORLD_VISUAL_MATERIALS).map(material => material.key));
const scene = {
  config: { tileSize: 94 },
  load: new FakeLoader(),
  textures: {
    exists: key => materialKeys.has(key),
    get: () => ({ getSourceImage: () => ({ width: 2508, height: 2508 }) }),
    remove(key) { removedKeys.push(key); },
  },
  make: { graphics: fakeGraphics },
  add: {
    graphics: fakeGraphics,
    image(x, y, key) {
      const image = new FakeImage(x, y, key);
      images.push(image);
      return image;
    },
  },
};
const worldModel = { getTileType: () => TILE_TYPES.DIRT };
const lighting = { terrainTint: 0xc8d8e8, fog: 0.25 };
const field = new WorldVisualMaterialField(scene, worldModel, WORLD_VISUAL_RUNTIME);
field.create();

assert.deepEqual(
  resolveWorldVisualMaterialBands(156, 164).map(band => band.id),
  ["surface-earth", "level1-shallow"]
);
field.sync({ left: 0, right: 3, top: 156, bottom: 164 }, lighting, true);
assert.deepEqual([...field.activeBandIds], ["surface-earth", "level1-shallow"]);
assert.equal(field.bandViews.size, 2, "both sides of the row-160 boundary must stay resident");

let liveMaterials = images.filter(image => (
  image.name?.startsWith("world-visual-material-")
  && !image.name.includes("-backdrop-")
  && !image.destroyed
));
const surfaceEdge = liveMaterials.find(image => image.name.includes("surface-earth"));
const shallowStart = liveMaterials.find(image => image.name.includes("level1-shallow"));
assert.ok(surfaceEdge && shallowStart, "both boundary materials must have a terrain plane");
assert.equal(surfaceEdge.y + surfaceEdge.crop.height, 160 * 94, "surface material must stop at row 160");
assert.equal(shallowStart.y, 160 * 94, "shallow material must begin at row 160");
assert.ok(field.maskGraphics.fills.some(fill => fill.y === 159 * 94));
assert.ok(field.maskGraphics.fills.some(fill => fill.y === 160 * 94));

field.sync({ left: 0, right: 3, top: 516, bottom: 524 }, lighting, true);
assert.deepEqual([...field.activeBandIds], ["level1-shallow", "level1-amber"]);
assert.equal(field.bandViews.size, 2, "only the two intersecting row-520 bands may remain");
liveMaterials = images.filter(image => (
  image.name?.startsWith("world-visual-material-")
  && !image.name.includes("-backdrop-")
  && !image.destroyed
));
const shallowEdge = liveMaterials.find(image => image.name.includes("level1-shallow"));
const amberStart = liveMaterials.find(image => image.name.includes("level1-amber"));
assert.ok(shallowEdge && amberStart, "later boundaries must receive the same adjacent-plane treatment");
assert.equal(shallowEdge.y + shallowEdge.crop.height, 520 * 94);
assert.equal(amberStart.y, 520 * 94);
assert.ok(liveMaterials.every(image => !image.name.includes("surface-earth")));

field.sync({ left: 0, right: 3, top: 1036, bottom: 1044 }, lighting, true);
assert.deepEqual([...field.activeBandIds], ["level1-amber", "level1-silver"]);
assert.ok(removedKeys.includes(WORLD_VISUAL_MATERIALS.shallowBlue.key));
assert.ok(!removedKeys.includes(WORLD_VISUAL_MATERIALS.townEarth.key), "startup fallback must stay retained");

field.destroy();
assert.ok(images.every(image => image.destroyed));

console.log("Scenic material band boundary smoke passed");
