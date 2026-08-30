import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {
  WORLD_VISUAL_DAMAGE,
  WORLD_VISUAL_DAMAGE_MODES,
  getWorldVisualDamagePreloadAssets,
  resolveWorldVisualDamageAtlas,
  resolveWorldVisualDamageFrame,
  resolveWorldVisualDamageMode,
  resolveWorldVisualDamageVariant,
} from "../values/worldVisualDamage.js";
import { WorldVisualDamageImagePainter } from
  "../world/rendering/scenic-world/WorldVisualDamageImagePainter.js";


const POLISHED_PATH =
  "sprites/backgrounds/world-visual-v2/semantic-decals-v1/"
  + "ground-damage-piskel-anchor-v2.png?v=20260730a";
const LEGACY_PATH =
  "sprites/backgrounds/world-visual-v2/semantic-decals-v1/"
  + "ground-damage-imagegen-v1.png?v=20260729a";
const REVIEW_PATH =
  "exports/piskel/ground-damage-anchor-v2-review/"
  + "ground-damage-anchor-v2-candidate-atlas.png";
const POLISHED_SHA256 =
  "c550a33b8bca2e32f3a5945d8173272cfc1d90ea415e79ac7b2ab5e1ff883d19";
const LEGACY_SHA256 =
  "2f424648dc9727723e19d73de2662d3ba3f948bab32f20bd8f91c284807096f4";

function diskPath(relativePath) {
  return new URL(`../${relativePath.split("?")[0]}`, import.meta.url);
}

function sha256(path) {
  return crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex");
}

function pngSize(path) {
  const bytes = fs.readFileSync(path);
  assert.equal(bytes.toString("ascii", 1, 4), "PNG");
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

class ImageStub {
  constructor(key) {
    this.key = key;
    this.calls = [];
    this.visible = true;
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
  destroy() { return this.call("destroy"); }
}

function makeScene(expectedKey) {
  const frameAdds = [];
  const registered = new Set();
  const images = [];
  const texture = {
    has: name => registered.has(name),
    add: (...args) => {
      registered.add(args[0]);
      frameAdds.push(args);
    },
  };
  return {
    frameAdds,
    images,
    scene: {
      textures: {
        exists: key => key === expectedKey,
        get: key => {
          assert.equal(key, expectedKey);
          return texture;
        },
      },
      add: {
        image: (_x, _y, key) => {
          assert.equal(key, expectedKey);
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
assert.deepEqual(
  Object.keys(imagegen.atlases).sort(),
  ["aligned", "dynamic", "expanded", "layered", "legacy", "polished"],
);
assert.equal(imagegen.defaultAtlas, "polished");
assert.equal(imagegen.atlasQueryParam, "groundDamageAtlas");
assert.deepEqual(imagegen.legacyAtlasValues, ["legacy", "v1", "old"]);
assert.equal(imagegen.atlas, polished, "the compatibility atlas alias must be the universal V2 default");
assert.equal(polished.mixProfile, null, "the production default must not bind damage to a resource profile");
assert.equal(imagegen.decodedBytes, 16965120);
assert.equal(imagegen.decodedBudgetBytes, 17825792);
assert.deepEqual(getWorldVisualDamagePreloadAssets(), [polished]);

assert.equal(polished.path, POLISHED_PATH);
assert.equal(legacy.path, LEGACY_PATH);
assert.equal(resolveWorldVisualDamageAtlas(undefined, ""), polished);
assert.equal(resolveWorldVisualDamageAtlas(undefined, "?groundDamageAtlas=polished"), polished);
assert.equal(resolveWorldVisualDamageAtlas(undefined, "?groundDamageAtlas=v3"), layered);
assert.equal(resolveWorldVisualDamageAtlas(undefined, "?groundDamageAtlas=unknown"), polished);
for (const value of imagegen.legacyAtlasValues) {
  assert.equal(
    resolveWorldVisualDamageAtlas(undefined, `?groundDamageAtlas=${value}`),
    legacy,
    `${value} must select the intact V1 atlas`
  );
  assert.deepEqual(
    getWorldVisualDamagePreloadAssets(undefined, `?groundDamageAtlas=${value}`),
    [legacy],
    "Boot must queue only the selected rollback atlas"
  );
}
assert.deepEqual(getWorldVisualDamagePreloadAssets(undefined, "?groundDamageAtlas=v2"), [polished]);

for (const field of ["key", "columns", "frameSizePx", "frameCount", "framePrefix"]) {
  assert.equal(
    polished[field],
    legacy[field],
    `polished and legacy atlases must share ${field}`
  );
}
assert.equal(polished.columns, 10);
assert.equal(polished.frameSizePx, 188);
assert.equal(polished.frameCount, 120);
assert.equal(polished.frameCount, polished.variants * WORLD_VISUAL_DAMAGE.stateCount);
assert.equal(polished.framePrefix, "world-visual-v2-ground-damage-");
assert.ok(!polished.path.startsWith("exports/"), "production must not load review exports");

const polishedDiskPath = diskPath(polished.path);
const legacyDiskPath = diskPath(legacy.path);
const reviewDiskPath = diskPath(REVIEW_PATH);
assert.ok(fs.existsSync(polishedDiskPath), "missing promoted Piskel atlas");
assert.ok(fs.existsSync(legacyDiskPath), "missing intact V1 rollback atlas");
assert.ok(fs.existsSync(reviewDiskPath), "missing approved review authority");
assert.equal(sha256(polishedDiskPath), POLISHED_SHA256);
assert.equal(sha256(reviewDiskPath), POLISHED_SHA256);
assert.equal(sha256(legacyDiskPath), LEGACY_SHA256);
assert.notEqual(POLISHED_SHA256, LEGACY_SHA256);
for (const path of [polishedDiskPath, legacyDiskPath]) {
  assert.deepEqual(
    pngSize(path),
    [polished.columns * polished.frameSizePx,
      WORLD_VISUAL_DAMAGE.stateCount * polished.frameSizePx]
  );
}

const rollbackSearch = "?groundDamageAtlas=v2";
const variant = resolveWorldVisualDamageVariant(31, 47, undefined, rollbackSearch);
const firstFrame = resolveWorldVisualDamageFrame(31, 47, 0.001, undefined, rollbackSearch);
const finalFrame = resolveWorldVisualDamageFrame(31, 47, 1, undefined, rollbackSearch);
assert.equal(firstFrame % polished.variants, variant);
assert.equal(finalFrame % polished.variants, variant);
assert.equal(finalFrame - firstFrame, 11 * polished.variants);
assert.equal(resolveWorldVisualDamageFrame(31, 47, 0), null);

const syntheticPolished = Object.freeze({ ...polished, key: "damage-polished-test" });
const syntheticLegacy = Object.freeze({ ...legacy, key: "damage-legacy-test" });
const syntheticConfig = Object.freeze({
  ...WORLD_VISUAL_DAMAGE,
  imagegen: Object.freeze({
    ...imagegen,
    atlas: syntheticPolished,
    atlases: Object.freeze({
      polished: syntheticPolished,
      legacy: syntheticLegacy,
    }),
  }),
});
const geometryMask = { id: "terrain-mask" };
const defaultFixture = makeScene(syntheticPolished.key);
const defaultPainter = new WorldVisualDamageImagePainter(
  defaultFixture.scene,
  geometryMask,
  2.45,
  syntheticConfig,
);
assert.equal(defaultPainter.create(), true);
assert.equal(defaultPainter.draw(7, 9, 0.58, 94, 31, 47, 2), true);
defaultPainter.clear();
assert.equal(defaultPainter.draw(7, 9, 0.58, 94, 31, 47, 11), true);
assert.equal(defaultFixture.images.length, 1, "resource types must share the universal V2 painter");
assert.equal(defaultPainter.rimPool.length, 0);
assert.equal(defaultPainter.responsePool.length, 0);
const universalTextureCalls = defaultFixture.images[0].calls.filter(
  ([method]) => method === "setTexture",
);
assert.equal(universalTextureCalls.length, 2);
assert.deepEqual(universalTextureCalls[0], universalTextureCalls[1]);
defaultPainter.destroy();

const legacyFixture = makeScene(syntheticLegacy.key);
const painter = new WorldVisualDamageImagePainter(
  legacyFixture.scene,
  geometryMask,
  2.45,
  syntheticConfig,
  "?groundDamageAtlas=legacy"
);
assert.equal(painter.create(), true);
assert.equal(legacyFixture.frameAdds.length, 120);
for (let index = 0; index < legacyFixture.frameAdds.length; index += 1) {
  const [name, sourceIndex, x, y, width, height] = legacyFixture.frameAdds[index];
  assert.deepEqual(
    [name, sourceIndex, x, y, width, height],
    [
      `${syntheticLegacy.framePrefix}${index}`,
      0,
      (index % syntheticLegacy.columns) * syntheticLegacy.frameSizePx,
      Math.floor(index / syntheticLegacy.columns) * syntheticLegacy.frameSizePx,
      syntheticLegacy.frameSizePx,
      syntheticLegacy.frameSizePx,
    ]
  );
}

assert.equal(painter.draw(7, 9, 0.58, 94, 31, 47), true);
assert.equal(legacyFixture.images.length, 1);
const image = legacyFixture.images[0];
assert.equal(image.key, syntheticLegacy.key);
assert.deepEqual(
  image.calls.find(([method]) => method === "setPosition"),
  ["setPosition", (7 + 0.5) * 94, (9 + 0.5) * 94],
  "the fixed 94,94 Piskel seed must land at the exact tile center"
);
assert.deepEqual(
  image.calls.find(([method]) => method === "setDisplaySize"),
  ["setDisplaySize", 94 * imagegen.scale, 94 * imagegen.scale]
);
assert.deepEqual(
  image.calls.find(([method]) => method === "setMask"),
  ["setMask", geometryMask]
);
const expectedFrame = resolveWorldVisualDamageFrame(31, 47, 0.58, syntheticConfig);
assert.deepEqual(
  image.calls.find(([method]) => method === "setTexture"),
  ["setTexture", syntheticLegacy.key, `${syntheticLegacy.framePrefix}${expectedFrame}`]
);

assert.equal(resolveWorldVisualDamageMode(undefined, ""), WORLD_VISUAL_DAMAGE_MODES.imagegen);
assert.equal(
  resolveWorldVisualDamageMode(undefined, "?groundDamage=legacy"),
  WORLD_VISUAL_DAMAGE_MODES.legacy,
  "the original radial renderer remains the emergency code-path rollback"
);

const bootSource = fs.readFileSync(diskPath("ui/scenes/BootScene.js"), "utf8");
assert.match(bootSource, /import\s*\{\s*getWorldVisualDamagePreloadAssets\s*\}/);
assert.match(bootSource, /\.\.\.getWorldVisualDamagePreloadAssets\(\)/);
assert.match(
  bootSource,
  /for\s*\(const asset of assets\)[\s\S]*?else\s*\{\s*this\.queueImage\(asset\.key,\s*asset\.path\)/,
);

const feedbackSource = fs.readFileSync(
  diskPath("world/rendering/scenic-world/WorldVisualFeedbackLayer.js"),
  "utf8"
);
assert.match(feedbackSource, /damageMode === WORLD_VISUAL_DAMAGE_MODES\.imagegen/);
assert.match(feedbackSource, /:\s*WorldVisualDamagePainter/);

const reviewManifest = JSON.parse(fs.readFileSync(
  diskPath("exports/piskel/ground-damage-anchor-v2-review/manifest.json"),
  "utf8"
));
assert.equal(reviewManifest.rollbackProjects.length, 10);
assert.equal(
  reviewManifest.rollbackCommand,
  "python ai-tools/2026-07-30-refresh-ground-damage-piskel-polish.py --rollback"
);
assert.ok(fs.existsSync(diskPath("ai-tools/2026-07-30-refresh-ground-damage-piskel-polish.py")));

console.log(
  "Ground-damage universal V2 production contract passed: default single-atlas preload, "
  + "no resource response mix, unchanged 10x12 frame geometry, centered painter placement, "
  + "V1 atlas query rollback, and radial emergency rollback"
);
