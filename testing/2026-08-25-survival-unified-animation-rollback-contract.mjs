import assert from "node:assert/strict";

globalThis.window = { location: { search: "?unifiedAnimation=0" } };

const { SURVIVAL_UAL_PLAYER_ASSET_PROFILE: profile } = await import(
  "../values/survivalUalPlayerAssetProfile.js?contract=unified-animation-rollback"
);

assert.equal(
  profile.renderPipeline,
  "survival-blender-v2-piskel-polish-v2-mixamo-complex-dig-moving-v1",
);
assert.equal(profile.basePath, "sprites/character/survival-ual-player-v1/runtime");
assert.equal(profile.movingComplexDigFrames.length, 528);
assert.equal(profile.frameSizePxBySheet, undefined);
assert.ok(new Set(Object.values(profile.displaySizePxByAnimation)).size > 1);
assert.ok(profile.rigManifestKey);

console.log("SURVIVAL_UNIFIED_ANIMATION_ROLLBACK_CONTRACT_OK", {
  query: "?unifiedAnimation=0",
  movingFrames: profile.movingComplexDigFrames.length,
  pipeline: profile.renderPipeline,
});
