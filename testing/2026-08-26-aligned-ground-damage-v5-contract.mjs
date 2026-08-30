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
import { WORLD_VISUAL_DAMAGE_ALIGNED_REVIEW as REVIEW } from
  "../values/worldVisualDamageAlignedReview.js";
import { WorldVisualDamageImagePainter } from
  "../world/rendering/scenic-world/WorldVisualDamageImagePainter.js";

const FRACTURE_SHA = "7c348216321c02358537f330690b5fd56ce0b4b6932b638965e5b9b6dd059ece";
const RESPONSE_SHA = "d39f41b636329b74c19de7f25f842dcab989fe8d9546808f596e6387317ee6a0";

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
  setTintFill(...args) { return this.call("setTintFill", ...args); }
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
const { dynamic, aligned, expanded, layered, polished, legacy } = imagegen.atlases;
const alignedMix = imagegen.mixProfiles.alignedV5;
const response = alignedMix.response;
const v5Search = "?groundDamageAtlas=v5";

assert.equal(imagegen.defaultAtlas, "polished");
assert.equal(imagegen.atlas, polished);
assert.equal(resolveWorldVisualDamageAtlas(undefined, ""), polished);
assert.equal(resolveWorldVisualDamageAtlas(undefined, "?groundDamageAtlas=unknown"), polished);
for (const value of imagegen.alignedAtlasValues) {
  assert.equal(resolveWorldVisualDamageAtlas(undefined, `?groundDamageAtlas=${value}`), aligned);
}
for (const value of imagegen.expandedAtlasValues) {
  assert.equal(resolveWorldVisualDamageAtlas(undefined, `?groundDamageAtlas=${value}`), expanded);
}
assert.equal(resolveWorldVisualDamageAtlas(undefined, "?groundDamageAtlas=v3"), layered);
assert.equal(resolveWorldVisualDamageAtlas(undefined, "?groundDamageAtlas=v2"), polished);
assert.equal(resolveWorldVisualDamageAtlas(undefined, "?groundDamageAtlas=legacy"), legacy);
assert.equal(resolveWorldVisualDamageMixProfile(undefined, v5Search), alignedMix);
assert.equal(
  resolveWorldVisualDamageMixProfile(undefined, "?groundDamageAtlas=v4"),
  imagegen.mixProfiles.expandedV4,
);

assert.equal(aligned.revision, "aligned-v5");
assert.equal(aligned.variants, 24);
assert.equal(aligned.rasterTiers, 12);
assert.equal(aligned.columns, 16);
assert.equal(aligned.frameCount, 288);
assert.equal(aligned.transformCount, 8);
assert.equal(response.mode, "tile");
assert.equal(response.profileCount, 33);
assert.equal(response.tiers, 6);
assert.equal(response.atlas.columns, 16);
assert.equal(response.atlas.frameCount, 198);
assert.equal(aligned.decodedBytes + response.atlas.decodedBytes, 70122496);
assert.deepEqual(getWorldVisualDamagePreloadAssets(undefined, v5Search), [aligned, response.atlas]);
assert.deepEqual(
  getWorldVisualDamagePreloadAssets(undefined, "?groundDamageAtlas=v4"),
  [expanded, imagegen.expanded.response.atlas],
);
assert.deepEqual(
  getWorldVisualDamagePreloadAssets(undefined, "?groundDamageAtlas=v3"),
  [layered, imagegen.layered.response.atlas],
);
assert.deepEqual(getWorldVisualDamagePreloadAssets(undefined, "?groundDamageAtlas=v2"), [polished]);
assert.deepEqual(getWorldVisualDamagePreloadAssets(undefined, "?groundDamageAtlas=legacy"), [legacy]);

assert.equal(sha256(diskPath(aligned.path)), FRACTURE_SHA);
assert.equal(sha256(diskPath(response.atlas.path)), RESPONSE_SHA);
assert.deepEqual(pngSize(diskPath(aligned.path)), [3008, 3384]);
assert.deepEqual(pngSize(diskPath(response.atlas.path)), [3008, 2444]);

const profileTypes = Object.keys(TILE_DESTRUCTION_FX_CONFIG.familyByTile)
  .map(Number).sort((left, right) => left - right);
assert.deepEqual(TILE_DESTRUCTION_FX_CONFIG.responseProfileTileTypes, profileTypes);
assert.equal(profileTypes.length, 33);
assert.deepEqual(
  profileTypes.map(tileType => resolveTileDestructionResponseProfile(tileType)),
  [...Array(33).keys()],
);

const stages = WORLD_VISUAL_DAMAGE.stages;
assert.deepEqual(
  stages.map(stage => resolveWorldVisualDamageResponseTier(
    stage.minDamage,
    undefined,
    v5Search,
  )),
  [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
);
const variant = resolveWorldVisualDamageVariant(31, 47, undefined, v5Search);
assert.ok(variant >= 0 && variant < 24);
for (const [state, stage] of stages.entries()) {
  assert.equal(
    resolveWorldVisualDamageFrame(31, 47, stage.minDamage, undefined, v5Search),
    state * 24 + variant,
  );
  const presentation = resolveWorldVisualDamagePresentation(
    stage.minDamage,
    undefined,
    v5Search,
  );
  assert.equal(presentation.stateNumber, state + 1);
  assert.equal(presentation.scale, 1);
  if (state > 0) {
    assert.ok(presentation.alpha > resolveWorldVisualDamagePresentation(
      stages[state - 1].minDamage,
      undefined,
      v5Search,
    ).alpha);
  }
}
assert.equal(resolveWorldVisualDamagePresentation(1, undefined, v5Search).alpha, 1);
assert.equal(
  resolveWorldVisualDamageFrame(31, 47, 1, undefined, "?groundDamageAtlas=v4"),
  192 + resolveWorldVisualDamageVariant(31, 47, undefined, "?groundDamageAtlas=v4"),
);

const transforms = new Map();
for (let tx = -12; tx <= 12; tx += 1) {
  for (let ty = -12; ty <= 12; ty += 1) {
    const transform = resolveWorldVisualDamageTransform(tx, ty, undefined, v5Search);
    assert.ok([0, 90, 180, 270].includes(transform.angle));
    transforms.set(transform.index, transform);
  }
}
assert.equal(transforms.size, 8);

const mask = { id: "terrain-mask" };
const fixture = makeScene([aligned, response.atlas]);
const painter = new WorldVisualDamageImagePainter(
  fixture.scene,
  mask,
  2.45,
  WORLD_VISUAL_DAMAGE,
  v5Search,
);
assert.equal(painter.create(), true);
assert.equal(fixture.textures.get(aligned.key).frames.length, 288);
assert.equal(fixture.textures.get(response.atlas.key).frames.length, 198);
assert.equal(painter.draw(7, 9, stages[5].minDamage, 94, 31, 47, TILE_TYPES.GOLD), true);
assert.equal(fixture.images.length, 3);
assert.deepEqual(
  painter.pool[0].calls.find(([method]) => method === "setPosition"),
  ["setPosition", 7.5 * 94, 9.5 * 94],
);
assert.deepEqual(
  painter.pool[0].calls.find(([method]) => method === "setDisplaySize"),
  ["setDisplaySize", 94, 94],
);
assert.deepEqual(
  painter.responsePool[0].calls.find(([method]) => method === "setDisplaySize"),
  ["setDisplaySize", 94, 94],
);
assert.deepEqual(
  painter.pool[0].calls.find(([method]) => method === "setTexture"),
  ["setTexture", aligned.key, `${aligned.framePrefix}${5 * 24 + variant}`],
);
const goldProfile = resolveTileDestructionResponseProfile(TILE_TYPES.GOLD);
assert.deepEqual(
  painter.responsePool[0].calls.find(([method]) => method === "setTexture"),
  ["setTexture", response.atlas.key, `${response.atlas.framePrefix}${2 * 33 + goldProfile}`],
);
assert.deepEqual(
  painter.responsePool[0].calls.find(([method]) => method === "setTint"),
  ["setTint", TILE_DESTRUCTION_FX_CONFIG.tintByTile[TILE_TYPES.GOLD]],
);
assert.deepEqual(
  painter.rimPool[0].calls.find(([method]) => method === "setTintFill"),
  ["setTintFill", alignedMix.fractureRim.tint],
);
assert.ok(fixture.images.every(image => image.calls.some(([method]) => method === "setMask")));
painter.clear();
assert.ok(fixture.images.every(image => image.visible === false));
painter.destroy();

assert.equal(REVIEW.reviewOnly, true);
assert.equal(REVIEW.productionPainter, true);
assert.equal(REVIEW.patchWidth, REVIEW.tileSize * 3);
assert.equal(REVIEW.stateLabels.length, WORLD_VISUAL_DAMAGE.stateCount);
assert.equal(REVIEW.profiles.length, 4);
for (const profile of REVIEW.profiles) {
  assert.ok(fs.existsSync(diskPath(profile.atlas.path)), `missing ${profile.atlas.path}`);
  assert.ok(WORLD_VISUAL_DAMAGE.stages.length === REVIEW.stateLabels.length);
}
const harnessSource = fs.readFileSync(
  diskPath("testing/2026-08-26-aligned-ground-damage-v5-harness.js"),
  "utf8",
);
assert.match(harnessSource, /new WorldVisualDamageImagePainter\(/);
assert.match(harnessSource, /WORLD_VISUAL_DAMAGE\.stages\[state\]\.minDamage/);
assert.match(harnessSource, /setDisplaySize\(REVIEW\.patchWidth, REVIEW\.patchHeight\)/);
assert.match(harnessSource, /fixedDisplaySize/);

console.log(
  "Aligned ground-damage V5 contract passed: 24 authored motifs, 12 fixed-size raster "
  + "states, 6 exact material-response tiers, 8 stable transforms, exact 94 px centers, "
  + "70.1 MB budget, and isolated V4/V3/V2/V1 rollback assets",
);
