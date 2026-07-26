import assert from "node:assert/strict";
import fs from "node:fs";
import { TILE_TYPES } from "../values/tileTypes.js";
import { RESOURCE_ORE_COLOR_INTS } from "../values/resourceTypes.js";
import {
  WORLD_VISUAL_FEEDBACK,
  resolveWorldVisualResourceVeinsEnabled,
} from "../values/worldVisualFeedback.js";
import { WORLD_VISUAL_DAMAGE } from "../values/worldVisualDamage.js";
import { WORLD_VISUAL_RUNTIME } from "../values/worldVisualRuntime.js";
import { WorldVisualFeedbackLayer } from "../world/rendering/scenic-world/WorldVisualFeedbackLayer.js";

class GraphicsStub {
  constructor() {
    this.calls = [];
  }

  _call(method, ...args) {
    this.calls.push([method, ...args]);
    return this;
  }

  setDepth(value) { return this._call("setDepth", value); }
  setMask(value) { return this._call("setMask", value); }
  setBlendMode(value) { return this._call("setBlendMode", value); }
  clear() { return this._call("clear"); }
  lineStyle(...args) { return this._call("lineStyle", ...args); }
  beginPath() { return this._call("beginPath"); }
  moveTo(...args) { return this._call("moveTo", ...args); }
  lineTo(...args) { return this._call("lineTo", ...args); }
  strokePath() { return this._call("strokePath"); }
  fillStyle(...args) { return this._call("fillStyle", ...args); }
  fillCircle(...args) { return this._call("fillCircle", ...args); }
  fillEllipse(...args) { return this._call("fillEllipse", ...args); }
  fillTriangle(...args) { return this._call("fillTriangle", ...args); }
  destroy() { return this._call("destroy"); }
}

class ImageStub {
  constructor() {
    this.visible = true;
  }

  setDepth() { return this; }
  setMask() { return this; }
  setVisible(value) { this.visible = value; return this; }
  setPosition() { return this; }
  setTexture() { return this; }
  setDisplaySize() { return this; }
  setAlpha() { return this; }
  destroy() { this.destroyed = true; }
}

function createHarness(search = "") {
  const originalLocation = globalThis.location;
  globalThis.location = { search };
  const frames = new Set();
  const graphics = [];
  const scene = {
    config: { tileSize: 94 },
    textures: {
      exists: key => key === WORLD_VISUAL_FEEDBACK.atlas.key,
      get: () => ({
        has: name => frames.has(name),
        add: name => frames.add(name),
      }),
    },
    add: {
      graphics: () => {
        const item = new GraphicsStub();
        graphics.push(item);
        return item;
      },
      image: () => new ImageStub(),
    },
  };
  const types = [TILE_TYPES.COPPER, TILE_TYPES.GOLD, TILE_TYPES.GEM_POWER_BLOCK];
  const worldModel = {
    getTileType: tx => types[tx] ?? TILE_TYPES.AIR,
    getSkyTileOriginalType: () => TILE_TYPES.COPPER,
    getTileHp: tx => tx === 1 ? 50 : 100,
    getTileMaxHp: () => 100,
  };
  const layer = new WorldVisualFeedbackLayer(
    scene,
    worldModel,
    { id: "solid-mask" },
    WORLD_VISUAL_RUNTIME,
    WORLD_VISUAL_FEEDBACK
  );
  layer.create();
  layer.sync({ left: 0, right: 3, top: 0, bottom: 1 });
  if (originalLocation === undefined) delete globalThis.location;
  else globalThis.location = originalLocation;
  return { layer, decals: graphics[0], graphics };
}

assert.equal(resolveWorldVisualResourceVeinsEnabled(undefined, ""), true);
assert.equal(resolveWorldVisualResourceVeinsEnabled(undefined, "?resourceVeins=embedded"), true);
assert.equal(resolveWorldVisualResourceVeinsEnabled(undefined, "?resourceVeins=0"), false);
assert.equal(resolveWorldVisualResourceVeinsEnabled(undefined, "?resourceVeins=legacy"), false);
assert.deepEqual(
  Object.keys(WORLD_VISUAL_FEEDBACK.embeddedResourceVeins.profiles).sort(),
  Object.keys(WORLD_VISUAL_FEEDBACK.resourceMarkers).sort(),
  "every scenic resource marker must have an embedded material profile"
);
assert.equal(
  WORLD_VISUAL_FEEDBACK.embeddedResourceVeins.profiles.stone.vein,
  false,
  "ordinary stone should read as embedded nodules, not a bright ore scribble"
);

const embedded = createHarness();
assert.equal(
  embedded.layer.markerPool.length,
  0,
  "generated semantics must suppress both resource markers and generated special-reward markers by default"
);
assert.equal(
  embedded.decals.calls.some(([method]) => ["fillCircle", "fillTriangle"].includes(method)),
  false,
  "generated raster semantics must suppress procedural ore geometry by default"
);
assert.ok(embedded.graphics.some(graphic => graphic.calls.some(([method, _width, color]) => (
  method === "lineStyle" && color === WORLD_VISUAL_DAMAGE.layers.fracture.coreColor
))), "modular damage fractures must remain visible above generated mineral art");

const proceduralRollback = createHarness("?terrainSemantics=0");
assert.equal(proceduralRollback.layer.markerPool.length, 1, "procedural rollback keeps special atlas art separate");
assert.ok(proceduralRollback.decals.calls.some(([method]) => method === "fillCircle"), "rollback restores ore nodules");
assert.ok(proceduralRollback.decals.calls.some(([method]) => method === "lineTo"), "rollback restores vein paths");
assert.ok(proceduralRollback.decals.calls.some(([method, _width, color]) => (
  method === "lineStyle" && color === RESOURCE_ORE_COLOR_INTS.copper
)), "rollback preserves copper color identity");
assert.ok(proceduralRollback.decals.calls.some(([method, _width, color]) => (
  method === "lineStyle" && color === RESOURCE_ORE_COLOR_INTS.gold
)), "rollback preserves gold color identity");

const feedbackSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualFeedbackLayer.js", import.meta.url),
  "utf8"
);
const runtimeSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualRuntime.js", import.meta.url),
  "utf8"
);
assert.doesNotMatch(
  feedbackSource,
  /\.(?:damageTile|setTileType|setTileHp|setDugTile)\s*\(/,
  "the resource facade must not mutate authoritative gameplay state"
);
const emissiveHook = runtimeSource.match(/setEmissiveRenderDepth\(depth\)\s*\{([\s\S]*?)\n  \}/)?.[1] || "";
assert.doesNotMatch(
  emissiveHook,
  /feedbackLayer\?\.setDepth/,
  "the legacy emissive hook must not move terrain feedback above the player or lighting"
);

const atlasRollback = createHarness("?terrainSemantics=0&resourceVeins=0");
assert.equal(atlasRollback.layer.markerPool.length, 3, "rollback must restore both resource atlas markers");
assert.equal(
  atlasRollback.decals.calls.filter(([method]) => method === "fillCircle").length,
  0,
  "rollback must not mix procedural nodules into atlas resources"
);

embedded.layer.destroy();
proceduralRollback.layer.destroy();
atlasRollback.layer.destroy();
console.log("Scenic resource presentation smoke: generated default, damage coexistence, and both procedural rollbacks passed");
