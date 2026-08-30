import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {
  WORLD_VISUAL_DAMAGE,
  getWorldVisualDamagePreloadAssets,
  resolveWorldVisualDamageAtlas,
  resolveWorldVisualDamageFrame,
  resolveWorldVisualDamageMixProfile,
  resolveWorldVisualDamagePresentation,
  resolveWorldVisualDamageResponseTier,
  resolveWorldVisualDamageTransform,
  resolveWorldVisualDamageVariant,
} from "../values/worldVisualDamage.js";
import {
  TILE_DESTRUCTION_FX_CONFIG,
  resolveTileDestructionResponseProfile,
} from "../values/tileDestructionFx.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WorldVisualDamageImagePainter } from
  "../world/rendering/scenic-world/WorldVisualDamageImagePainter.js";

const FRACTURE_SHA = "8a6ac0f79a9bba0ccd49ef0c87a5cd82b7f803913f0c546efb93fd9e7d2c7488";
const RESPONSE_SHA = "75f518bc4da81ee905653b85195add3121e635365716bad1ea6f63d24e56756e";

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

  call(method, ...args) { this.calls.push([method, ...args]); return this; }
  setDepth(...args) { return this.call("setDepth", ...args); }
  setMask(...args) { return this.call("setMask", ...args); }
  setBlendMode(...args) { return this.call("setBlendMode", ...args); }
  setPosition(...args) { return this.call("setPosition", ...args); }
  setTexture(...args) { return this.call("setTexture", ...args); }
  setDisplaySize(...args) { return this.call("setDisplaySize", ...args); }
  setAlpha(...args) { return this.call("setAlpha", ...args); }
  setTint(...args) { return this.call("setTint", ...args); }
  setAngle(...args) { return this.call("setAngle", ...args); }
  setFlip(...args) { return this.call("setFlip", ...args); }
  setVisible(value) { this.visible = value; return this.call("setVisible", value); }
  destroy() { return this.call("destroy"); }
}

function makeScene(assets) {
  const textures = new Map();
  const images = [];
  for (const asset of assets) {
    const names = new Set();
    const frames = [];
    textures.set(asset.key, {
      frames,
      has: name => names.has(name),
      add: (...args) => { names.add(args[0]); frames.push(args); },
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
const { dynamic, expanded, layered, polished, legacy } = imagegen.atlases;
const expandedMix = imagegen.mixProfiles.expandedV4;
const response = expandedMix.response;
const v4Search = "?groundDamageAtlas=v4";

assert.equal(imagegen.defaultAtlas, "polished");
assert.equal(imagegen.atlas, polished);
assert.equal(resolveWorldVisualDamageAtlas(undefined, ""), polished);
for (const value of imagegen.expandedAtlasValues) {
  assert.equal(resolveWorldVisualDamageAtlas(undefined, `?groundDamageAtlas=${value}`), expanded);
}
for (const value of imagegen.layeredAtlasValues) {
  assert.equal(resolveWorldVisualDamageAtlas(undefined, `?groundDamageAtlas=${value}`), layered);
}
assert.equal(resolveWorldVisualDamageAtlas(undefined, "?groundDamageAtlas=v2"), polished);
assert.equal(resolveWorldVisualDamageAtlas(undefined, "?groundDamageAtlas=legacy"), legacy);
assert.equal(resolveWorldVisualDamageMixProfile(undefined, v4Search), expandedMix);
assert.equal(
  resolveWorldVisualDamageMixProfile(undefined, "?groundDamageAtlas=v3"),
  imagegen.mixProfiles.layeredV3,
);

assert.equal(expanded.variants, 64);
assert.equal(expanded.rasterTiers, 4);
assert.equal(expanded.columns, 16);
assert.equal(expanded.frameCount, 256);
assert.equal(expanded.transformCount, 8);
assert.equal(response.mode, "tile");
assert.equal(response.profileCount, 33);
assert.equal(response.tiers, 4);
assert.equal(response.atlas.columns, 16);
assert.equal(response.atlas.frameCount, 132);
assert.equal(expanded.decodedBytes + response.atlas.decodedBytes, 56550400);
assert.equal(expanded.variants * WORLD_VISUAL_DAMAGE.stateCount * expanded.transformCount, 6144);
assert.deepEqual(getWorldVisualDamagePreloadAssets(undefined, v4Search), [expanded, response.atlas]);
assert.deepEqual(
  getWorldVisualDamagePreloadAssets(undefined, "?groundDamageAtlas=v3"),
  [layered, imagegen.layered.response.atlas],
);
assert.deepEqual(getWorldVisualDamagePreloadAssets(undefined, "?groundDamageAtlas=v2"), [polished]);
assert.deepEqual(getWorldVisualDamagePreloadAssets(undefined, "?groundDamageAtlas=legacy"), [legacy]);

assert.equal(sha256(diskPath(expanded.path)), FRACTURE_SHA);
assert.equal(sha256(diskPath(response.atlas.path)), RESPONSE_SHA);
assert.deepEqual(pngSize(diskPath(expanded.path)), [3008, 3008]);
assert.deepEqual(pngSize(diskPath(response.atlas.path)), [3008, 1692]);

const profileTypes = Object.keys(TILE_DESTRUCTION_FX_CONFIG.familyByTile)
  .map(Number).sort((left, right) => left - right);
assert.deepEqual(TILE_DESTRUCTION_FX_CONFIG.responseProfileTileTypes, profileTypes);
assert.equal(profileTypes.length, 33);
assert.deepEqual(
  profileTypes.map(tileType => resolveTileDestructionResponseProfile(tileType)),
  [...Array(33).keys()],
);
assert.equal(
  resolveTileDestructionResponseProfile(TILE_TYPES.AIR),
  resolveTileDestructionResponseProfile(TILE_TYPES.STONE),
);

assert.deepEqual(
  WORLD_VISUAL_DAMAGE.stages.map(stage => (
    resolveWorldVisualDamageResponseTier(stage.minDamage, undefined, v4Search)
  )),
  [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3],
);
const variant = resolveWorldVisualDamageVariant(31, 47, undefined, v4Search);
assert.ok(variant >= 0 && variant < 64);
assert.equal(resolveWorldVisualDamageFrame(31, 47, 0.001, undefined, v4Search), variant);
assert.equal(resolveWorldVisualDamageFrame(31, 47, 0.16, undefined, v4Search), variant);
assert.equal(resolveWorldVisualDamageFrame(31, 47, 0.24, undefined, v4Search), 64 + variant);
assert.equal(resolveWorldVisualDamageFrame(31, 47, 1, undefined, v4Search), 192 + variant);
assert.equal(
  resolveWorldVisualDamageFrame(31, 47, 1, undefined, "?groundDamageAtlas=v3"),
  11 * 16 + resolveWorldVisualDamageVariant(31, 47, undefined, "?groundDamageAtlas=v3"),
);

const transforms = new Map();
for (let tx = -12; tx <= 12; tx += 1) {
  for (let ty = -12; ty <= 12; ty += 1) {
    const transform = resolveWorldVisualDamageTransform(tx, ty, undefined, v4Search);
    assert.ok([0, 90, 180, 270].includes(transform.angle));
    transforms.set(transform.index, transform);
  }
}
assert.equal(transforms.size, 8, "representative world coordinates must cover all transforms");
assert.equal(
  resolveWorldVisualDamageTransform(7, 9, undefined, "?groundDamageAtlas=v3").index,
  0,
);
assert.ok(resolveWorldVisualDamagePresentation(0.001, undefined, v4Search).alpha < 1);
assert.deepEqual(
  resolveWorldVisualDamagePresentation(1, undefined, v4Search),
  { stateNumber: 12, scale: 1, alpha: 1 },
);

const mask = { id: "terrain-mask" };
const fixture = makeScene([expanded, response.atlas]);
const painter = new WorldVisualDamageImagePainter(
  fixture.scene,
  mask,
  2.45,
  WORLD_VISUAL_DAMAGE,
  v4Search,
);
assert.equal(painter.create(), true);
assert.equal(fixture.textures.get(expanded.key).frames.length, 256);
assert.equal(fixture.textures.get(response.atlas.key).frames.length, 132);
assert.equal(painter.draw(7, 9, 1, 94, 31, 47, TILE_TYPES.GOLD), true);
assert.equal(fixture.images.length, 3);
assert.equal(painter.pool.length, 1);
assert.equal(painter.rimPool.length, 1);
assert.equal(painter.responsePool.length, 1);
assert.deepEqual(
  painter.pool[0].calls.find(([method]) => method === "setDisplaySize"),
  ["setDisplaySize", 94, 94],
);
const goldProfile = resolveTileDestructionResponseProfile(TILE_TYPES.GOLD);
assert.deepEqual(
  painter.responsePool[0].calls.find(([method]) => method === "setTexture"),
  ["setTexture", response.atlas.key, `${response.atlas.framePrefix}${3 * 33 + goldProfile}`],
);
assert.deepEqual(
  painter.responsePool[0].calls.find(([method]) => method === "setTint"),
  ["setTint", TILE_DESTRUCTION_FX_CONFIG.tintByTile[TILE_TYPES.GOLD]],
);
const expectedTransform = resolveWorldVisualDamageTransform(31, 47, undefined, v4Search);
assert.deepEqual(
  painter.pool[0].calls.find(([method]) => method === "setAngle"),
  ["setAngle", expectedTransform.angle],
);
assert.deepEqual(
  painter.pool[0].calls.find(([method]) => method === "setFlip"),
  ["setFlip", expectedTransform.flipX, expectedTransform.flipY],
);
painter.clear();
assert.ok(fixture.images.every(image => image.visible === false));
painter.destroy();

const feedbackSource = fs.readFileSync(
  diskPath("world/rendering/scenic-world/WorldVisualFeedbackLayer.js"),
  "utf8",
);
assert.match(feedbackSource, /_drawDamage\(tx, ty, 1 - hp \/ maxHp, tileSize, tileType\)/);
assert.match(feedbackSource, /draw\(tx, ty, damage, size, tx, ty, tileType\)/);

console.log(
  "Expanded ground-damage V4 contract passed: 64 authored motifs, 12 logical states over "
  + "4 optimized anchors, 8 stable transforms, 33 exact tile profiles, three-layer mixing, "
  + "56.6 MB decoded atlas budget, and isolated V3/V2/V1 rollback assets",
);
