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

const semantic = read(
  "world/rendering/scenic-world/WorldVisualSemanticAssetLayer.js",
);
assert.match(semantic, /identityLightAtlas/);
assert.match(semantic, /identity\.lightFrameName/);
assert.match(semantic, /worldLightScale/);
assert.match(semantic, /worldLightAlphaScale/);

const popup = read("systems/visual/StarDiscoveryPopupView.js");
assert.match(popup, /identity\.lightFrameName/);
assert.match(popup, /popupLightAlpha/);
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
  + "(core/light separation across world, release, popup, and Atlas)",
);
