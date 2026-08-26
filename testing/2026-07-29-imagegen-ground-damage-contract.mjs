import assert from "node:assert/strict";
import fs from "node:fs";
import {
  WORLD_VISUAL_DAMAGE,
  WORLD_VISUAL_DAMAGE_MODES,
  getWorldVisualDamagePreloadAssets,
  resolveWorldVisualDamageAtlas,
  resolveWorldVisualDamageFrame,
  resolveWorldVisualDamageMode,
  resolveWorldVisualDamageStateNumber,
  resolveWorldVisualDamageVariant,
} from "../values/worldVisualDamage.js";
import { WorldVisualDamageImagePainter } from
  "../world/rendering/scenic-world/WorldVisualDamageImagePainter.js";


class ImageStub {
  constructor(key) {
    this.key = key;
    this.calls = [];
    this.visible = true;
    this.destroyed = false;
  }

  call(method, ...args) {
    this.calls.push([method, ...args]);
    return this;
  }

  setDepth(...args) { return this.call("setDepth", ...args); }
  setMask(...args) { return this.call("setMask", ...args); }
  setBlendMode(...args) { return this.call("setBlendMode", ...args); }
  setVisible(value) { this.visible = value; return this.call("setVisible", value); }
  setPosition(...args) { return this.call("setPosition", ...args); }
  setTexture(...args) { return this.call("setTexture", ...args); }
  setDisplaySize(...args) { return this.call("setDisplaySize", ...args); }
  setAlpha(...args) { return this.call("setAlpha", ...args); }
  destroy() { this.destroyed = true; return this.call("destroy"); }
}


const rollbackSearch = "?groundDamageAtlas=legacy";
const atlas = resolveWorldVisualDamageAtlas(undefined, rollbackSearch);
assert.equal(resolveWorldVisualDamageMode(undefined, ""), WORLD_VISUAL_DAMAGE_MODES.imagegen);
assert.equal(resolveWorldVisualDamageMode(undefined, "?groundDamage=procedural"), WORLD_VISUAL_DAMAGE_MODES.modular);
assert.equal(resolveWorldVisualDamageMode(undefined, "?groundDamage=legacy"), WORLD_VISUAL_DAMAGE_MODES.legacy);
assert.equal(atlas.variants, 10);
assert.equal(atlas.layered, false);
assert.equal(WORLD_VISUAL_DAMAGE.stateCount, 12);
assert.equal(atlas.frameCount, 120);
assert.equal(atlas.frameCount, atlas.variants * WORLD_VISUAL_DAMAGE.stateCount);
assert.deepEqual(getWorldVisualDamagePreloadAssets(undefined, rollbackSearch), [atlas]);

const atlasPath = new URL(`../${atlas.path.split("?")[0]}`, import.meta.url);
const png = fs.readFileSync(atlasPath);
assert.equal(png.toString("ascii", 1, 4), "PNG");
assert.equal(png.readUInt32BE(16), atlas.columns * atlas.frameSizePx);
assert.equal(png.readUInt32BE(20), WORLD_VISUAL_DAMAGE.stateCount * atlas.frameSizePx);

const manifest = JSON.parse(fs.readFileSync(
  new URL(
    "../sprites/backgrounds/world-visual-v2/semantic-decals-v1/imagegen-ground-damage-v1/manifest.json",
    import.meta.url
  ),
  "utf8"
));
assert.equal(manifest.variants, 10);
assert.equal(manifest.statesPerVariant, 12);
assert.equal(manifest.frameCount, 120);
assert.equal(manifest.families.length, 10);
assert.equal(Object.keys(manifest.coverageByVariantAndState).length, 10);
for (const coverage of Object.values(manifest.coverageByVariantAndState)) {
  assert.equal(coverage.length, 12);
  assert.ok(coverage.at(-1) > coverage[0], "each authored family must expand from first to final state");
}
assert.equal(new Set(Object.values(manifest.sha256)).size, Object.values(manifest.sha256).length);

const firstVariant = resolveWorldVisualDamageVariant(31, 47, undefined, rollbackSearch);
assert.equal(firstVariant, resolveWorldVisualDamageVariant(31, 47, undefined, rollbackSearch));
assert.ok(firstVariant >= 0 && firstVariant < atlas.variants);
const firstFrame = resolveWorldVisualDamageFrame(31, 47, 0.001, undefined, rollbackSearch);
const finalFrame = resolveWorldVisualDamageFrame(31, 47, 1, undefined, rollbackSearch);
assert.equal(firstFrame % atlas.variants, firstVariant);
assert.equal(finalFrame % atlas.variants, firstVariant);
assert.equal(finalFrame - firstFrame, 11 * atlas.variants);
assert.equal(resolveWorldVisualDamageFrame(31, 47, 0, undefined, rollbackSearch), null);

const toughHp = 1_000_000_000;
assert.equal(resolveWorldVisualDamageStateNumber(1 - (toughHp - 1) / toughHp), 1);
assert.equal(resolveWorldVisualDamageStateNumber(1 - 50_000_000 / toughHp), 12);

const registeredFrames = new Set();
const texture = {
  has: name => registeredFrames.has(name),
  add: (name) => registeredFrames.add(name),
};
const images = [];
const geometryMask = { id: "solid-terrain" };
const scene = {
  textures: {
    exists: key => key === atlas.key,
    get: key => {
      assert.equal(key, atlas.key);
      return texture;
    },
  },
  add: {
    image: (_x, _y, key) => {
      const image = new ImageStub(key);
      images.push(image);
      return image;
    },
  },
};
const painter = new WorldVisualDamageImagePainter(
  scene,
  geometryMask,
  2.45,
  WORLD_VISUAL_DAMAGE,
  rollbackSearch,
);
assert.equal(painter.create(), true);
assert.equal(registeredFrames.size, 120);
assert.equal(painter.draw(31, 47, 0.001, 94), true);
assert.equal(painter.draw(31, 47, 1, 94), true);
assert.equal(images.length, 2);
assert.ok(images.every(image => (
  image.calls.some(([method, mask]) => method === "setMask" && mask === geometryMask)
)));
const usedFrames = images.map(image => (
  image.calls.find(([method]) => method === "setTexture")?.[2]
));
assert.equal(
  Number(usedFrames[0].replace(atlas.framePrefix, "")) % atlas.variants,
  Number(usedFrames[1].replace(atlas.framePrefix, "")) % atlas.variants,
  "the same tile must retain its authored family while HP changes"
);
painter.clear();
assert.ok(images.every(image => image.visible === false));
assert.equal(painter.draw(-999, 8_888, 0.58, 94), true, "future ground coordinates need no registration");
assert.equal(images.length, 2, "clearing must reuse the fixed image pool");
painter.setDepth(7);
assert.ok(images.every(image => (
  image.calls.some(([method, depth]) => (
    method === "setDepth" && depth === 7 + WORLD_VISUAL_DAMAGE.imagegen.depthOffset
  ))
)));

const painterSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualDamageImagePainter.js", import.meta.url),
  "utf8"
);
assert.doesNotMatch(
  painterSource,
  /add\.graphics|fillCircle|fillEllipse|lineStyle|beginPath|strokePath/,
  "default ImageGen damage must not redraw authored art with Phaser primitives"
);
assert.doesNotMatch(
  painterSource,
  /worldVisualMaterials|TILE_TYPES|getTileType|materialId|textureKey/,
  "damage art must remain independent of current and future material identities"
);
assert.doesNotMatch(
  painterSource,
  /erase|DESTINATION_OUT|createGeometryMask/,
  "pre-break damage must never cut geometry or own collision"
);

const feedbackSource = fs.readFileSync(
  new URL("../world/rendering/scenic-world/WorldVisualFeedbackLayer.js", import.meta.url),
  "utf8"
);
assert.match(feedbackSource, /WORLD_VISUAL_DAMAGE_MODES\.imagegen/);
assert.match(feedbackSource, /WorldVisualDamageImagePainter/);
const bootSource = fs.readFileSync(new URL("../ui/scenes/BootScene.js", import.meta.url), "utf8");
assert.match(bootSource, /getWorldVisualDamagePreloadAssets/);

painter.destroy();
assert.ok(images.every(image => image.destroyed));

console.log(
  "ImageGen V1 rollback damage contract passed: 10 families x 12 states, proportional HP, pooled masked sprites, and intact legacy selection"
);
