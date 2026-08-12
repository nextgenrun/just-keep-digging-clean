import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  getStarIdentityLightAtlasAssets,
  getStarIdentityPreloadAssets,
  STAR_IDENTITY_LIBRARY_CONFIG,
} from "../values/starIdentityLibrary.js";
import {
  validateStarIdentityLibraryConfig,
} from "../values/starIdentityLibraryMath.js";
import { showWorldVisualSemanticStar } from
  "../world/rendering/scenic-world/WorldVisualSemanticStarPresenter.js";

const read = relativePath => readFileSync(
  new URL(`../${relativePath}`, import.meta.url),
  "utf8",
);

const config = STAR_IDENTITY_LIBRARY_CONFIG;
const health = validateStarIdentityLibraryConfig();
assert.equal(health.ready, true);
assert.equal(health.lightAtlasCount, 6);
assert.equal(health.lightFramesValid, true);
assert.equal(health.lightDecodedBudgetValid, true);
assert.equal(getStarIdentityLightAtlasAssets().length, 6);
assert.equal(getStarIdentityPreloadAssets().length, 13);
assert.equal(config.lightPackageId, "star-identity-lights-v1");
assert.ok(config.lightAtlases.every(atlas => (
  atlas.frameSizePx === 192
  && atlas.columns === 10
  && /star-identity-lights-v1/.test(atlas.path)
)));

for (const identity of config.identities) {
  assert.notEqual(identity.lightAtlasKey, identity.atlasKey);
  assert.notEqual(identity.lightFrameName, identity.frameName);
  assert.equal(
    identity.lightAtlasKey,
    config.lightAtlases[identity.rarityIndex].key,
  );
}

const steady = read("systems/lighting/SkySteadyLightRenderer.js");
assert.match(steady, /STAR_IDENTITY_LIBRARY_CONFIG\.lightAtlases/);
assert.match(steady, /starIdentity\.lightFrameName/);
assert.doesNotMatch(steady, /starIdentity\.frameName/);
assert.doesNotMatch(steady, /setTint|add\.graphics|createCanvas/);

const makeImage = () => ({
  textureKey: null,
  frameName: null,
  setPosition() { return this; },
  setDepth() { return this; },
  setTexture(key, frame) { this.textureKey = key; this.frameName = frame; return this; },
  setDisplaySize() { return this; },
  setAlpha() { return this; },
  setTint() { return this; },
  setVisible() { return this; },
});
const beauty = makeImage();
const emissive = makeImage();
const semanticLayer = {
  identityFramesReady: true,
  worldModel: {
    getSkyTileRarity: () => 0,
    getSkyTileIdentity: () => 0,
  },
  config: {
    skyTile: {
      beautyAtlas: { frameCount: 6, framePrefix: "fallback-beauty-" },
      emissiveAtlas: { framePrefix: "fallback-light-" },
      pulsePeriodMs: 1000,
      pulseAlphaRange: [0.7, 1],
      scale: 1,
      beautyAlpha: 1,
      emissiveAlpha: 1,
      beautyReceivesTerrainTint: false,
    },
    render: {
      starBeautyDepth: 1,
      emissiveBlendMode: "ADD",
      beautyBlendMode: "NORMAL",
      townFloorOccludedEmissiveDepth: 2,
    },
  },
  scene: {
    textures: { exists: () => true },
    runtimeFeatureAssetManager: { enabled: true },
  },
  starBeautyPool: [beauty],
  starEmissivePool: [emissive],
  currentEmissiveDepth: 3,
  townFloorOcclusion: null,
  activeStars: [],
};
assert.equal(showWorldVisualSemanticStar(semanticLayer, 0, 1, 2, 94, {}, 0), true);
assert.equal(beauty.textureKey, config.atlases[0].key);
assert.equal(beauty.frameName, config.identities[0].frameName);
assert.equal(emissive.textureKey, config.lightAtlases[0].key);
assert.equal(emissive.frameName, config.identities[0].lightFrameName);

const release = read("systems/visual/playSkyStarReleaseIdentityLight.js");
assert.match(release, /entry\.lightTextureKey/);
assert.match(release, /entry\.lightTextureFrame/);
assert.doesNotMatch(release, /repeat:\s*-1|loop:\s*true|setTint|add\.graphics/);
const floating = read("systems/visual/FloatingTextSystem.js");
assert.match(floating, /lightTextureKey/);
assert.match(floating, /identity\.lightFrameName/);

const atlas = read("ui/overlays/UIInventoryStarAtlas.js");
const controls = read("ui/overlays/UIInventoryStarAtlasControls.js");
assert.match(atlas, /identity\.lightAtlasKey/);
assert.match(atlas, /identity\.lightFrameName/);
assert.match(controls, /identity\.lightAtlasKey/);
assert.match(controls, /identity\.lightFrameName/);
assert.doesNotMatch(`${atlas}\n${controls}`, /add\.graphics|setTint/);

console.log(
  "star identity dedicated light contract: PASS "
  + "(core/light separation across world, release, and Atlas)",
);
