import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getStarIdentity } from "../values/starIdentityLibraryMath.js";
import { STAR_IDENTITY_LIBRARY_CONFIG } from "../values/starIdentityLibrary.js";
import {
  getWorldVisualSemanticPreloadAssets,
  resolveWorldVisualSemanticStarIdleEnabled,
  WORLD_VISUAL_SEMANTIC_ASSETS,
} from "../values/worldVisualSemanticAssets.js";
import {
  WorldVisualSemanticAssetLayer,
} from "../world/rendering/scenic-world/WorldVisualSemanticAssetLayer.js";


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const readJson = relativePath => JSON.parse(read(relativePath));
const sha256 = relativePath => crypto
  .createHash("sha256")
  .update(fs.readFileSync(path.join(root, relativePath)))
  .digest("hex");

const motion = WORLD_VISUAL_SEMANTIC_ASSETS.skyTile.idleMotion;
const atlasPath = motion.atlas.path.split(/[?#]/, 1)[0];
const atlasBytes = fs.readFileSync(path.join(root, atlasPath));
const assetManifest = readJson(
  "sprites/environment/star-block-idle-v1/star-block-idle-v1.manifest.json",
);
const generation = readJson(
  "sprites/environment/star-block-idle-v1/source/generation-manifest.json",
);
const requestPlan = readJson(
  "sprites/environment/star-block-idle-v1/source/request-plan.json",
);

assert.equal(motion.enabled, true);
assert.match(motion.artSource, /OpenRouter.*veo-3\.1-lite/i);
assert.equal(motion.atlas.variantCount, 3);
assert.equal(motion.atlas.framesPerVariant, 24);
assert.equal(motion.atlas.frameCount, 72);
assert.equal(motion.atlas.columns, 12);
assert.equal(motion.atlas.frameSizePx, 128);
assert.equal(STAR_IDENTITY_LIBRARY_CONFIG.identities.length, 250);
for (const star of STAR_IDENTITY_LIBRARY_CONFIG.identities) {
  const variant = star.index % motion.atlas.variantCount;
  assert.ok(variant >= 0 && variant < motion.atlas.variantCount);
}
assert.equal(motion.framePeriodMs > 150 && motion.framePeriodMs < 180, true);
assert.equal(motion.alpha > 0 && motion.alpha <= 0.35, true);
assert.equal(motion.transformPolicy, "fixed-anchor-frame-content-only");
for (const forbidden of [
  "bobAmplitudeTiles",
  "bobPeriodMs",
  "breathScaleRange",
  "breathPeriodMs",
  "emissiveBreathScale",
  "pulseAlphaFloor",
]) assert.equal(Object.hasOwn(motion, forbidden), false);
assert.equal(resolveWorldVisualSemanticStarIdleEnabled(undefined, ""), true);
assert.equal(resolveWorldVisualSemanticStarIdleEnabled(undefined, "?starIdle=0"), false);
assert.equal(resolveWorldVisualSemanticStarIdleEnabled(undefined, "?starIdle=legacy"), false);
assert.equal(resolveWorldVisualSemanticStarIdleEnabled(undefined, "?starIdle=openrouter"), true);
assert.ok(getWorldVisualSemanticPreloadAssets(undefined, "").some(asset => asset.key === motion.atlas.key));
assert.equal(
  getWorldVisualSemanticPreloadAssets(undefined, "?starIdle=0")
    .some(asset => asset.key === motion.atlas.key),
  false,
);

assert.equal(atlasBytes.subarray(1, 4).toString("ascii"), "PNG");
assert.equal(atlasBytes.readUInt32BE(16), 1536);
assert.equal(atlasBytes.readUInt32BE(20), 768);
assert.equal(assetManifest.runtimeAtlasSha256, sha256(atlasPath));
assert.equal(assetManifest.frameCount, motion.atlas.frameCount);
assert.equal(assetManifest.decodedBytes, 4_718_592);
assert.ok(assetManifest.decodedBytes <= 5 * 1024 * 1024);
assert.equal(assetManifest.variants.length, motion.atlas.variantCount);
assert.ok(assetManifest.variants.every(item => (
  item.uniqueFrameHashes === motion.atlas.framesPerVariant
  && item.seamMeanAbsoluteDelta < 1
  && item.energyCoefficientOfVariation < 0.025
  && item.innerEnergyFraction > 0.08
  && item.coronaEnergyFraction > 0.08
  && item.meanEnergy > 1
)));

assert.equal(requestPlan.generateAudio, false);
assert.equal(requestPlan.estimatedVideoCostUsd, 0.36);
assert.equal(generation.knownVideoCostUsd, 0.36);
assert.ok(generation.knownVideoCostUsd <= generation.hardBudgetUsd);
assert.equal(generation.model, "google/veo-3.1-lite");
assert.equal(generation.apiKeyStored, false);
assert.equal(generation.results.length, 3);
assert.ok(generation.results.every(result => result.status === "completed"));
for (const relativePath of [
  "sprites/environment/star-block-idle-v1/source/request-plan.json",
  "sprites/environment/star-block-idle-v1/source/openrouter-jobs.json",
  "sprites/environment/star-block-idle-v1/source/generation-manifest.json",
  "sprites/environment/star-block-idle-v1/star-block-idle-v1.manifest.json",
]) {
  assert.doesNotMatch(read(relativePath), /sk-or-v1-[A-Za-z0-9_-]{12,}/);
}

const images = [];
function makeImage(key) {
  const image = {
    key,
    visible: false,
    setDepth(value) { this.depth = value; return this; },
    setMask(value) { this.mask = value; return this; },
    setVisible(value) { this.visible = value; return this; },
    setBlendMode(value) { this.blendMode = value; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setTexture(nextKey, frame) { this.key = nextKey; this.frame = frame; return this; },
    setDisplaySize(width, height) { this.width = width; this.height = height; return this; },
    setRotation(value) { this.rotation = value; return this; },
    setAlpha(value) { this.alpha = value; return this; },
    setTint(value) { this.tint = value; return this; },
    destroy() { this.destroyed = true; },
  };
  images.push(image);
  return image;
}

const identity = getStarIdentity(17);
const scene = {
  config: { tileSize: 94, topAirRows: 0 },
  textures: { exists: () => true },
  add: { image: (x, y, key) => makeImage(key).setPosition(x, y) },
};
const world = {
  getSkyTileRarity: () => identity.rarityIndex,
  getSkyTileIdentity: () => identity.index,
};
const layer = new WorldVisualSemanticAssetLayer(
  scene,
  world,
  { id: "solid-mask" },
  WORLD_VISUAL_SEMANTIC_ASSETS,
);
layer.starIdleEnabled = true;
layer.identityFramesReady = true;
layer.townFloorOcclusion = null;
assert.equal(layer._showStar(0, 4, 7, 94, { terrainTint: 0xffffff }), true);
assert.equal(images.length, 3);
const [beauty, emissive, idle] = images;
assert.equal(beauty.key, identity.atlasKey);
assert.equal(emissive.key, identity.lightAtlasKey);
assert.equal(idle.key, motion.atlas.key);
assert.equal(idle.blendMode, motion.blendMode);
assert.equal(Object.hasOwn(idle, "tint"), false);
const initialFrame = idle.frame;
const fixedPresentation = images.map(image => ({
  x: image.x,
  y: image.y,
  width: image.width,
  height: image.height,
  rotation: image.rotation,
  alpha: image.alpha,
}));
layer.update(730);
assert.notEqual(idle.frame, initialFrame);
assert.deepEqual(images.map(image => ({
  x: image.x,
  y: image.y,
  width: image.width,
  height: image.height,
  rotation: image.rotation,
  alpha: image.alpha,
})), fixedPresentation, "frame content may move; Star transforms and alpha may not");
layer.setEmissiveDepth(901);
assert.equal(emissive.depth, 901);
assert.equal(idle.depth, 901);
layer.destroy();
assert.ok(images.every(image => image.destroyed));
assert.equal(layer.starIdlePool.length, 0);

const presenterSource = read(
  "world/rendering/scenic-world/WorldVisualSemanticStarPresenter.js",
);
assert.match(presenterSource, /idleMotion\.atlas\.framesPerVariant/);
assert.match(presenterSource, /identity\.index : fallbackFrame\) % idleMotion\.atlas\.variantCount/);
assert.match(presenterSource, /star\.idle\.setTexture/);
assert.doesNotMatch(presenterSource, /star\.idle[\s\S]{0,180}setTint/);
const updateSource = presenterSource.slice(
  presenterSource.indexOf("export function updateWorldVisualSemanticStars"),
);
assert.doesNotMatch(updateSource, /setPosition|setDisplaySize|setRotation|setAlpha/);

console.log(
  "Star Block idle animation contract passed: 72 OpenRouter-derived frames, "
  + "three anchored energy loops, exact identity cores, fixed transforms, and rollback",
);
