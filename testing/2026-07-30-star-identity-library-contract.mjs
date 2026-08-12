import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getStarIdentityPreloadAssets,
  STAR_IDENTITY_LIBRARY_CONFIG,
} from "../values/starIdentityLibrary.js";
import {
  getStarIdentitiesForRarity,
  getStarIdentity,
  resolveStarIdentityIndex,
  validateStarIdentityLibraryConfig,
} from "../values/starIdentityLibraryMath.js";
import { STAR_RARITY_PROGRESSION_CONFIG } from "../values/starRarityProgression.js";
import { RUNTIME_FEATURE_ASSET_GROUP_IDS } from "../values/runtimeAssetLoading.js";
import { getRuntimeFeatureAssetGroup } from
  "../world/rendering/runtimeFeatureAssetGroups.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const sha256 = relativePath => crypto
  .createHash("sha256")
  .update(fs.readFileSync(path.join(root, relativePath)))
  .digest("hex");

function pngSize(relativePath) {
  const buffer = fs.readFileSync(path.join(root, relativePath));
  assert.equal(buffer.toString("ascii", 1, 4), "PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

const health = validateStarIdentityLibraryConfig();
assert.equal(health.ready, true);
assert.equal(health.identityCount, 250);
assert.deepEqual(health.rarityIdentityCounts, [60, 50, 50, 40, 30, 20]);
assert.equal(health.distinctColours, 250);
assert.equal(health.distinctLightStyles, 250);
assert.equal(health.storageCapacityValid, true);
assert.equal(health.lightAtlasCount, 6);
assert.equal(health.lightFramesValid, true);
assert.equal(health.lightDecodedBudgetValid, true);

const config = STAR_IDENTITY_LIBRARY_CONFIG;
assert.equal(config.identities.length, 250);
assert.equal(config.atlases.length, 6);
assert.equal(config.lightAtlases.length, 6);
assert.equal(getStarIdentityPreloadAssets().length, 13);
assert.equal(config.inventory.layout.selectorCentersX.length, 4);
assert.equal(config.inventory.layout.selectorCentersY.length, 3);
assert.match(config.inventory.copy.subtitle, /every rarity can hold many colours/i);
assert.equal(config.inventory.layout.selectorsPerPage, 12);
assert.equal(config.identities[0].id, "glacier-blue");
assert.equal(config.identities[49].id, "first-light-prism");
assert.equal(config.identities[50].id, "whispered-crimson-halo");
assert.equal(config.identities[249].id, "prismatic-rose-eternity");
assert.ok(config.lightAtlases.every(entry => /star-identity-lights-v1/.test(entry.path)));
assert.ok(config.atlases.every(entry => /star-identities-v2/.test(entry.path)));

for (let rarity = 0; rarity < config.rarityIdentityCounts.length; rarity += 1) {
  const identities = getStarIdentitiesForRarity(rarity);
  assert.equal(identities.length, config.rarityIdentityCounts[rarity]);
  assert.ok(identities.length >= 4, `rarity ${rarity} needs multiple colours`);
  assert.ok(identities.every(identity => identity.rarityIndex === rarity));
  assert.equal(resolveStarIdentityIndex(rarity, 0), identities[0].index);
  assert.equal(
    resolveStarIdentityIndex(rarity, 0.999999999),
    identities.at(-1).index,
  );
}

for (const identity of config.identities) {
  assert.equal(getStarIdentity(identity.index).id, identity.id);
  assert.ok(identity.flavour.length >= 35);
  assert.ok(identity.light.style.length >= 8);
  assert.match(identity.primary, /^#[0-9A-F]{6}$/);
  assert.match(identity.secondary, /^#[0-9A-F]{6}$/);
  assert.ok(identity.light.pulsePeriodMs > 0);
  assert.ok(identity.light.radiusScale > 0);
  assert.notEqual(identity.lightAtlasKey, identity.atlasKey);
  assert.notEqual(identity.lightFrameName, identity.frameName);
  assert.equal(identity.lightAtlasKey, config.lightAtlases[identity.rarityIndex].key);
  assert.ok(identity.light.opacityScale > 0);
}

const manifestPath = "sprites/environment/star-identities-v2/star-identities-v2.manifest.json";
const manifest = JSON.parse(read(manifestPath));
assert.equal(manifest.schemaVersion, 2);
assert.equal(manifest.identityCount, 250);
assert.equal(manifest.frameSize, 256);
assert.ok(manifest.decodedBytes <= 64 * 1024 * 1024);
assert.equal(manifest.atlases.length, 6);
let expansionSourceCount = 0;
for (const entry of manifest.atlases) {
  let expectedStartFrame = 0;
  for (const source of entry.sources) {
    assert.equal(sha256(source.path), source.sha256);
    assert.equal(source.startFrame, expectedStartFrame);
    expectedStartFrame += source.frameCount;
    if (source.kind === "v2-expansion") expansionSourceCount += 1;
  }
  assert.equal(expectedStartFrame, entry.frameCount);
  assert.equal(sha256(entry.output), entry.outputSha256);
  assert.deepEqual(pngSize(entry.output), {
    width: entry.columns * entry.frameSize,
    height: entry.rows * entry.frameSize,
  });
  assert.equal(entry.coverage.length, entry.frameCount);
  assert.ok(entry.coverage.every(value => value > 0.3 && value < 0.8));
}
assert.equal(expansionSourceCount, 14);
const v1Manifest = JSON.parse(read(
  "sprites/environment/star-identities-v1/star-identities-v1.manifest.json",
));
const foundation = v1Manifest.inventoryFoundation;
assert.equal(
  sha256(foundation.output),
  foundation.outputSha256,
);
assert.deepEqual(foundation.outputSize, [1536, 800]);
assert.deepEqual(foundation.transparentCorners, [0, 0, 0, 0]);

const worldSource = read("world/model/WorldModel.js");
assert.match(worldSource, /skyTileIdentity = new Uint8Array/);
assert.match(worldSource, /identityHashSalt/);
assert.match(worldSource, /resolveStarIdentityIndex\(rarityTier, identityRoll\)/);
assert.match(worldSource, /getSkyTileIdentity\(tileX, tileY\)/);
assert.doesNotMatch(
  worldSource.match(/const identityRoll[\s\S]*?const identityIndex/)?.[0] || "",
  /rng\.next/,
);

const digSource = read("systems/mining/DigSystem.js");
assert.equal(
  (digSource.match(/identityIndex: skyTileIdentity/g) || []).length,
  2,
);
assert.equal(
  (digSource.match(/getSkyTileIdentity\(/g) || []).length,
  2,
);

const floatingSource = read("systems/visual/FloatingTextSystem.js");
assert.match(floatingSource, /identityFlavour: identity\.flavour/);
assert.match(floatingSource, /identityLightStyle: identity\.light\.style/);
assert.match(floatingSource, /validateStarIdentityLibraryConfig/);
assert.match(floatingSource, /textureFrame/);

const semanticSource = read(
  "world/rendering/scenic-world/WorldVisualSemanticStarPresenter.js",
);
assert.match(semanticSource, /getSkyTileIdentity/);
assert.match(semanticSource, /identity\.frameName/);
assert.match(semanticSource, /identity\.lightFrameName/);
assert.match(semanticSource, /identity\.light/);

const steadySource = read("systems/lighting/SkySteadyLightRenderer.js");
assert.match(steadySource, /starIdentity\.lightFrameName/);
assert.doesNotMatch(steadySource, /starIdentity\.frameName/);
assert.match(steadySource, /identityLight\?\.radiusScale/);
assert.match(steadySource, /identityLight\.rotationAmplitudeRadians/);
assert.doesNotMatch(steadySource, /\.setTint\(/);

const inventoryPopupSource = read("ui/overlays/UIInventoryPopup.js");
assert.match(inventoryPopupSource, /starAtlas\.copy\.tabLabel/);
assert.match(inventoryPopupSource, /renderInventoryStarAtlas/);
const inventoryAtlasSource = read("ui/overlays/UIInventoryStarAtlas.js");
assert.match(inventoryAtlasSource, /star-atlas-foundation-v1|inventory\.foundation/);
assert.match(inventoryAtlasSource, /identity\.flavour/);
assert.match(inventoryAtlasSource, /tier\.signXp/);
assert.match(inventoryAtlasSource, /tier\.multiplier/);
assert.match(inventoryAtlasSource, /tier\.engineCharge/);
assert.doesNotMatch(inventoryAtlasSource, /add\.graphics|fillRect|strokeRect/);
const atlasControlsSource = read(
  "ui/overlays/UIInventoryStarAtlasControls.js",
);
assert.match(atlasControlsSource, /notificationControls\.previous/);
assert.match(atlasControlsSource, /notificationControls\.next/);
assert.match(atlasControlsSource, /selectorsPerPage/);
assert.doesNotMatch(atlasControlsSource, /add\.graphics|fillRect|strokeRect/);

const identityAssets = getStarIdentityPreloadAssets();
const starThresholdGroup = getRuntimeFeatureAssetGroup(
  RUNTIME_FEATURE_ASSET_GROUP_IDS.starBlockFx,
);
const starThresholdKeys = new Set(
  starThresholdGroup.assets.map(asset => asset.key),
);
assert.ok(
  identityAssets.every(asset => starThresholdKeys.has(asset.key)),
  "every full-quality Star identity must be owned by the depth-threshold pack",
);

assert.equal(STAR_RARITY_PROGRESSION_CONFIG.rarityTiers.length, 6);
console.log("star identity library contract: PASS (250 identities, 6 rarities)");
