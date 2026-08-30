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
  resolveWorldVisualDamageResponseFrame,
  resolveWorldVisualDamageResponseTier,
  resolveWorldVisualDamageResponseVariant,
  resolveWorldVisualDamageTransform,
  resolveWorldVisualDamageVariant,
} from "../values/worldVisualDamage.js";
import {
  TILE_DESTRUCTION_FX_CONFIG,
  resolveTileDestructionResponseProfile,
} from "../values/tileDestructionFx.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { WORLD_VISUAL_DAMAGE_DYNAMIC_REVIEW as REVIEW } from
  "../values/worldVisualDamageDynamicReview.js";
import { WorldVisualDamageImagePainter } from
  "../world/rendering/scenic-world/WorldVisualDamageImagePainter.js";

const FRACTURE_SHA = "7c348216321c02358537f330690b5fd56ce0b4b6932b638965e5b9b6dd059ece";
const RESPONSE_SHA = "409eb913fb48089cd964e4162dc0fc5793ed89c338b6ada2db9ecb60bf724cff";

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
const dynamicMix = imagegen.mixProfiles.dynamicV6;
const alignedMix = imagegen.mixProfiles.alignedV5;
const response = dynamicMix.response;
const stoneProfile = resolveTileDestructionResponseProfile(TILE_TYPES.STONE);
const goldProfile = resolveTileDestructionResponseProfile(TILE_TYPES.GOLD);
const v6Search = "?groundDamageAtlas=v6";

assert.equal(imagegen.defaultAtlas, "polished");
assert.equal(imagegen.atlas, polished);
assert.equal(resolveWorldVisualDamageAtlas(undefined, ""), polished);
assert.equal(resolveWorldVisualDamageAtlas(undefined, "?groundDamageAtlas=unknown"), polished);
for (const value of imagegen.dynamicAtlasValues) {
  assert.equal(resolveWorldVisualDamageAtlas(undefined, `?groundDamageAtlas=${value}`), dynamic);
}
assert.equal(resolveWorldVisualDamageAtlas(undefined, "?groundDamageAtlas=v5"), aligned);
assert.equal(resolveWorldVisualDamageAtlas(undefined, "?groundDamageAtlas=v4"), expanded);
assert.equal(resolveWorldVisualDamageAtlas(undefined, "?groundDamageAtlas=v3"), layered);
assert.equal(resolveWorldVisualDamageAtlas(undefined, "?groundDamageAtlas=v2"), polished);
assert.equal(resolveWorldVisualDamageAtlas(undefined, "?groundDamageAtlas=legacy"), legacy);
assert.equal(resolveWorldVisualDamageMixProfile(undefined, v6Search), dynamicMix);
assert.equal(
  resolveWorldVisualDamageMixProfile(undefined, "?groundDamageAtlas=v5"),
  alignedMix,
);

assert.equal(dynamic.revision, "dynamic-response-v6");
assert.equal(dynamic.path, aligned.path);
assert.notEqual(dynamic.key, aligned.key);
assert.equal(dynamic.variants, 24);
assert.equal(dynamic.rasterTiers, 12);
assert.equal(dynamic.transformCount, 8);
assert.equal(response.frameLayout, "profile-major-variants");
assert.equal(response.profileCount, 33);
assert.equal(response.tiers, 6);
assert.equal(response.atlas.columns, 18);
assert.equal(response.atlas.frameCount, 252);
assert.equal(response.variantSalt, 2909);
assert.equal(response.variantCountByProfile[stoneProfile], 10);
assert.equal(response.profileFrameOffsets[stoneProfile], 6);
assert.equal(response.variantCountByProfile[goldProfile], 1);
assert.deepEqual(response.profileOverrides[stoneProfile], {
  alpha: 0.88,
  tint: 0xc1d7e9,
  blendMode: "SCREEN",
});
assert.equal(dynamic.decodedBytes + response.atlas.decodedBytes, 76343040);
assert.equal(imagegen.decodedBytes, 16965120);
assert.equal(imagegen.decodedBudgetBytes, 17825792);
assert.ok(imagegen.decodedBytes <= imagegen.decodedBudgetBytes);
assert.equal(response.variantCountByProfile[stoneProfile] * dynamic.transformCount, 80);
assert.deepEqual(getWorldVisualDamagePreloadAssets(), [polished]);
assert.deepEqual(
  getWorldVisualDamagePreloadAssets(undefined, v6Search),
  [dynamic, response.atlas],
);
assert.deepEqual(
  getWorldVisualDamagePreloadAssets(undefined, "?groundDamageAtlas=v5"),
  [aligned, alignedMix.response.atlas],
);

assert.equal(sha256(diskPath(dynamic.path)), FRACTURE_SHA);
assert.equal(sha256(diskPath(response.atlas.path)), RESPONSE_SHA);
assert.deepEqual(pngSize(diskPath(dynamic.path)), [3008, 3384]);
assert.deepEqual(pngSize(diskPath(response.atlas.path)), [3384, 2632]);

const responseVariants = new Set();
for (let tx = -32; tx <= 32; tx += 1) {
  for (let ty = -32; ty <= 32; ty += 1) {
    responseVariants.add(resolveWorldVisualDamageResponseVariant(
      tx, ty, stoneProfile, undefined, v6Search,
    ));
    assert.equal(resolveWorldVisualDamageResponseVariant(
      tx, ty, goldProfile, undefined, v6Search,
    ), 0);
  }
}
assert.deepEqual([...responseVariants].sort((left, right) => left - right), [...Array(10).keys()]);

const stages = WORLD_VISUAL_DAMAGE.stages;
assert.deepEqual(
  stages.map(stage => resolveWorldVisualDamageResponseTier(
    stage.minDamage, undefined, v6Search,
  )),
  [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
);
const variationTx = 31;
const variationTy = 47;
const stoneVariant = resolveWorldVisualDamageResponseVariant(
  variationTx,
  variationTy,
  stoneProfile,
  undefined,
  v6Search,
);
assert.equal(
  resolveWorldVisualDamageResponseFrame(
    variationTx, variationTy, 4, stoneProfile, undefined, v6Search,
  ),
  6 + 4 * 10 + stoneVariant,
);
assert.equal(
  resolveWorldVisualDamageResponseFrame(
    variationTx, variationTy, 4, goldProfile, undefined, v6Search,
  ),
  response.profileFrameOffsets[goldProfile] + 4,
);
assert.equal(
  resolveWorldVisualDamageResponseFrame(
    variationTx,
    variationTy,
    4,
    stoneProfile,
    undefined,
    "?groundDamageAtlas=v5",
  ),
  4 * 33 + stoneProfile,
);

const structuralVariant = resolveWorldVisualDamageVariant(
  variationTx, variationTy, undefined, v6Search,
);
for (const [state, stage] of stages.entries()) {
  assert.equal(
    resolveWorldVisualDamageFrame(
      variationTx, variationTy, stage.minDamage, undefined, v6Search,
    ),
    state * 24 + structuralVariant,
  );
  const presentation = resolveWorldVisualDamagePresentation(
    stage.minDamage, undefined, v6Search,
  );
  assert.equal(presentation.scale, 1);
}
assert.equal(resolveWorldVisualDamagePresentation(1, undefined, v6Search).alpha, 1);
assert.equal(new Set(
  [...Array(65).keys()].flatMap(tx => [...Array(65).keys()].map(ty => (
    resolveWorldVisualDamageTransform(tx - 32, ty - 32, undefined, v6Search).index
  ))),
).size, 8);

const mask = { id: "terrain-mask" };
const fixture = makeScene([dynamic, response.atlas]);
const painter = new WorldVisualDamageImagePainter(
  fixture.scene,
  mask,
  2.45,
  WORLD_VISUAL_DAMAGE,
  v6Search,
);
assert.equal(painter.create(), true);
assert.equal(fixture.textures.get(dynamic.key).frames.length, 288);
assert.equal(fixture.textures.get(response.atlas.key).frames.length, 252);
assert.equal(
  painter.draw(7, 9, stages[9].minDamage, 94, variationTx, variationTy, TILE_TYPES.STONE),
  true,
);
assert.deepEqual(
  painter.pool[0].calls.find(([method]) => method === "setDisplaySize"),
  ["setDisplaySize", 94, 94],
);
assert.deepEqual(
  painter.responsePool[0].calls.find(([method]) => method === "setDisplaySize"),
  ["setDisplaySize", 94, 94],
);
const responseFrame = resolveWorldVisualDamageResponseFrame(
  variationTx,
  variationTy,
  4,
  stoneProfile,
  undefined,
  v6Search,
);
assert.deepEqual(
  painter.responsePool[0].calls.find(([method]) => method === "setTexture"),
  ["setTexture", response.atlas.key, `${response.atlas.framePrefix}${responseFrame}`],
);
assert.deepEqual(
  painter.responsePool[0].calls.find(([method]) => method === "setTint"),
  ["setTint", response.profileOverrides[stoneProfile].tint],
);
assert.deepEqual(
  painter.responsePool[0].calls.filter(([method]) => method === "setBlendMode").at(-1),
  ["setBlendMode", response.profileOverrides[stoneProfile].blendMode],
);
assert.deepEqual(
  painter.rimPool[0].calls.find(([method]) => method === "setTintFill"),
  ["setTintFill", dynamicMix.fractureRim.tint],
);
assert.ok(fixture.images.every(image => image.calls.some(([method]) => method === "setMask")));
painter.clear();
assert.ok(fixture.images.every(image => image.visible === false));
painter.destroy();

assert.equal(REVIEW.reviewOnly, true);
assert.equal(REVIEW.productionPainter, true);
assert.equal(REVIEW.tileSize, 94);
assert.equal(REVIEW.columns, 10);
assert.equal(REVIEW.rows, 6);
assert.deepEqual(REVIEW.damageStateIndexes, [1, 3, 5, 7, 9, 11]);
assert.ok(fs.existsSync(diskPath(REVIEW.foregroundAtlas.path)));
const harnessSource = fs.readFileSync(
  diskPath("testing/2026-08-26-dynamic-ground-damage-v6-harness.js"),
  "utf8",
);
assert.match(harnessSource, /findStoneResponseCoordinates/);
assert.match(harnessSource, /resolveWorldVisualDamageResponseVariant/);
assert.match(harnessSource, /targetStructuralVariant/);
assert.match(harnessSource, /dynamicGroundDamageV6Ready/);

console.log(
  "Dynamic ground-damage V6 contract passed: 10 deterministic Stone response layouts, "
  + "80 Stone layout/transform combinations, 60 cumulative Stone frames, exact 94 px "
  + "placement, a 72.8 MiB package, and isolated V5/V4/V3/V2/V1 rollback routing",
);
