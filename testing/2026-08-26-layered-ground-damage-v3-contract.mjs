import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {
  WORLD_VISUAL_DAMAGE,
  getWorldVisualDamagePreloadAssets,
  resolveWorldVisualDamageAtlas,
  resolveWorldVisualDamageFrame,
  resolveWorldVisualDamageResponseTier,
  resolveWorldVisualDamageVariant,
} from "../values/worldVisualDamage.js";
import { TILE_DESTRUCTION_FX_CONFIG } from "../values/tileDestructionFx.js";
import { TILE_HEALTH_CONFIG } from "../values/tileHealth.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WorldVisualDamageImagePainter } from
  "../world/rendering/scenic-world/WorldVisualDamageImagePainter.js";


const FRACTURE_SHA = "d663b316a970b5de153800bd1d575a1cad64837d3283bada51b6565e5ef03df6";
const RESPONSE_SHA = "99ce5388dce2907c55df89c9d8f6683e0c33516bf3e8a60645411e3b5592d7c1";

function diskPath(path) {
  return new URL(`../${path.split("?")[0]}`, import.meta.url);
}

function sha256(path) {
  return crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex");
}

function pngSize(path) {
  const bytes = fs.readFileSync(path);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

class ImageStub {
  constructor(key) {
    this.key = key;
    this.calls = [];
    this.visible = false;
  }

  call(method, ...args) {
    this.calls.push([method, ...args]);
    return this;
  }

  setDepth(...args) { return this.call("setDepth", ...args); }
  setMask(...args) { return this.call("setMask", ...args); }
  setBlendMode(...args) { return this.call("setBlendMode", ...args); }
  setPosition(...args) { return this.call("setPosition", ...args); }
  setTexture(...args) { return this.call("setTexture", ...args); }
  setDisplaySize(...args) { return this.call("setDisplaySize", ...args); }
  setAlpha(...args) { return this.call("setAlpha", ...args); }
  setTint(...args) { return this.call("setTint", ...args); }
  setVisible(value) { this.visible = value; return this.call("setVisible", value); }
  destroy() { return this.call("destroy"); }
}

function makeScene(assets) {
  const textures = new Map();
  const images = [];
  for (const asset of assets) {
    const frames = [];
    const names = new Set();
    textures.set(asset.key, {
      frames,
      has: name => names.has(name),
      add: (...args) => {
        names.add(args[0]);
        frames.push(args);
      },
    });
  }
  return {
    images,
    textures,
    scene: {
      textures: {
        exists: key => textures.has(key),
        get: key => textures.get(key),
      },
      add: {
        image: (_x, _y, key) => {
          assert.ok(textures.has(key), `unexpected image key ${key}`);
          const image = new ImageStub(key);
          images.push(image);
          return image;
        },
      },
    },
  };
}

const imagegen = WORLD_VISUAL_DAMAGE.imagegen;
const { expanded, layered, polished, legacy } = imagegen.atlases;
const response = imagegen.layered.response;
assert.equal(imagegen.defaultAtlas, "expanded");
assert.equal(imagegen.atlas, expanded);
assert.equal(resolveWorldVisualDamageAtlas(undefined, ""), expanded);
for (const value of imagegen.layeredAtlasValues) {
  assert.equal(resolveWorldVisualDamageAtlas(undefined, `?groundDamageAtlas=${value}`), layered);
}
for (const value of imagegen.polishedAtlasValues) {
  assert.equal(resolveWorldVisualDamageAtlas(undefined, `?groundDamageAtlas=${value}`), polished);
}
for (const value of imagegen.legacyAtlasValues) {
  assert.equal(resolveWorldVisualDamageAtlas(undefined, `?groundDamageAtlas=${value}`), legacy);
}

assert.equal(layered.variants, 16);
assert.equal(layered.columns, 16);
assert.equal(layered.frameCount, 192);
assert.equal(response.familyCount, 17);
assert.equal(response.tiers, 4);
assert.equal(response.atlas.columns, 17);
assert.equal(response.atlas.frameCount, 68);
assert.deepEqual(
  getWorldVisualDamagePreloadAssets(undefined, "?groundDamageAtlas=v3"),
  [layered, response.atlas],
);
assert.deepEqual(getWorldVisualDamagePreloadAssets(undefined, "?groundDamageAtlas=v2"), [polished]);
assert.deepEqual(getWorldVisualDamagePreloadAssets(undefined, "?groundDamageAtlas=legacy"), [legacy]);

assert.equal(sha256(diskPath(layered.path)), FRACTURE_SHA);
assert.equal(sha256(diskPath(response.atlas.path)), RESPONSE_SHA);
assert.deepEqual(pngSize(diskPath(layered.path)), [16 * 188, 12 * 188]);
assert.deepEqual(pngSize(diskPath(response.atlas.path)), [17 * 188, 4 * 188]);

const v3Search = "?groundDamageAtlas=v3";
const v3Variant = resolveWorldVisualDamageVariant(31, 47, undefined, v3Search);
const v2Variant = resolveWorldVisualDamageVariant(31, 47, undefined, "?groundDamageAtlas=v2");
assert.ok(v3Variant >= 0 && v3Variant < 16);
assert.ok(v2Variant >= 0 && v2Variant < 10);
assert.equal(resolveWorldVisualDamageFrame(31, 47, 0.001, undefined, v3Search) % 16, v3Variant);
assert.equal(resolveWorldVisualDamageFrame(31, 47, 1, undefined, v3Search) - v3Variant, 11 * 16);
assert.equal(
  resolveWorldVisualDamageFrame(31, 47, 1, undefined, "?groundDamageAtlas=v2") - v2Variant,
  11 * 10,
);
assert.deepEqual(
  WORLD_VISUAL_DAMAGE.stages.map(stage => (
    resolveWorldVisualDamageResponseTier(stage.minDamage, undefined, v3Search)
  )),
  [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3],
);

const familyNames = Object.keys(TILE_DESTRUCTION_FX_CONFIG.families);
assert.equal(familyNames.length, response.familyCount);
assert.deepEqual(Object.values(TILE_DESTRUCTION_FX_CONFIG.families), [...Array(17).keys()]);
const destructibleTypes = Object.keys(TILE_HEALTH_CONFIG.tileHealth).map(Number);
for (const tileType of destructibleTypes) {
  assert.ok(
    TILE_DESTRUCTION_FX_CONFIG.familyByTile[tileType],
    `tile type ${tileType} lacks an explicit persistent-damage family`,
  );
  assert.ok(
    Number.isFinite(TILE_DESTRUCTION_FX_CONFIG.tintByTile[tileType]),
    `tile type ${tileType} lacks an explicit persistent-damage tint`,
  );
}
for (const tileType of [
  TILE_TYPES.DIRT, TILE_TYPES.COPPER, TILE_TYPES.BRONZE, TILE_TYPES.STEEL,
  TILE_TYPES.IRON, TILE_TYPES.SILVER, TILE_TYPES.GOLD, TILE_TYPES.SKY_TILE,
  TILE_TYPES.LAVA_DIRT, TILE_TYPES.OBSIDIAN, TILE_TYPES.EMBER_ORE,
  TILE_TYPES.MAGMA_CRYSTAL, TILE_TYPES.ANCIENT_RELIC_CACHE,
]) {
  assert.ok(TILE_DESTRUCTION_FX_CONFIG.familyByTile[tileType]);
}

const mask = { id: "terrain-mask" };
const fixture = makeScene([layered, response.atlas]);
const painter = new WorldVisualDamageImagePainter(
  fixture.scene,
  mask,
  2.45,
  WORLD_VISUAL_DAMAGE,
  v3Search,
);
assert.equal(painter.create(), true);
assert.equal(fixture.textures.get(layered.key).frames.length, 192);
assert.equal(fixture.textures.get(response.atlas.key).frames.length, 68);
assert.equal(painter.draw(7, 9, 0.58, 94, 31, 47, TILE_TYPES.GOLD), true);
assert.equal(fixture.images.length, 3, "V3 must mix shadow, rim, and material response");
assert.equal(painter.pool.length, 1);
assert.equal(painter.rimPool.length, 1);
assert.equal(painter.responsePool.length, 1);
assert.deepEqual(
  painter.pool[0].calls.find(([method]) => method === "setPosition"),
  ["setPosition", (7.5) * 94, (9.5) * 94],
);
assert.deepEqual(
  painter.pool[0].calls.find(([method]) => method === "setBlendMode"),
  ["setBlendMode", "MULTIPLY"],
);
assert.deepEqual(
  painter.rimPool[0].calls.find(([method]) => method === "setBlendMode"),
  ["setBlendMode", "SCREEN"],
);
assert.deepEqual(
  painter.responsePool[0].calls.find(([method]) => method === "setTint"),
  ["setTint", TILE_DESTRUCTION_FX_CONFIG.tintByTile[TILE_TYPES.GOLD]],
);
const goldFamily = TILE_DESTRUCTION_FX_CONFIG.families.gold;
const expectedResponseFrame = resolveWorldVisualDamageResponseTier(
  0.58,
  undefined,
  v3Search,
) * 17 + goldFamily;
assert.deepEqual(
  painter.responsePool[0].calls.find(([method]) => method === "setTexture"),
  ["setTexture", response.atlas.key, `${response.atlas.framePrefix}${expectedResponseFrame}`],
);
painter.clear();
assert.ok(fixture.images.every(image => image.visible === false));
painter.destroy();

const v2Fixture = makeScene([polished]);
const v2Painter = new WorldVisualDamageImagePainter(
  v2Fixture.scene,
  mask,
  2.45,
  WORLD_VISUAL_DAMAGE,
  "?groundDamageAtlas=v2",
);
assert.equal(v2Painter.create(), true);
assert.equal(v2Painter.draw(1, 2, 0.7, 94, 4, 5, TILE_TYPES.COPPER), true);
assert.equal(v2Fixture.images.length, 1, "V2 rollback must retain its single-layer painter");
assert.deepEqual(
  v2Fixture.images[0].calls.find(([method]) => method === "setBlendMode"),
  ["setBlendMode", "NORMAL"],
);

const bootSource = fs.readFileSync(diskPath("ui/scenes/BootScene.js"), "utf8");
assert.match(bootSource, /\.\.\.getWorldVisualDamagePreloadAssets\(\)/);
const feedbackSource = fs.readFileSync(
  diskPath("world/rendering/scenic-world/WorldVisualFeedbackLayer.js"),
  "utf8",
);
assert.match(feedbackSource, /_drawDamage\(tx, ty, 1 - hp \/ maxHp, tileSize, tileType\)/);
assert.match(feedbackSource, /draw\(tx, ty, damage, size, tx, ty, tileType\)/);

console.log(
  "Layered ground-damage V3 contract passed: 16x12 structural atlas, "
  + "17x4 dedicated response atlas, explicit destructible-tile coverage, "
  + "three-layer painter mixing, exact 94 px placement, and V2/V1 rollback preload isolation",
);
