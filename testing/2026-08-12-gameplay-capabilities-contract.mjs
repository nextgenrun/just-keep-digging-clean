import assert from "node:assert/strict";

import {
  DEVELOPMENT_GAMEPLAY_CAPABILITIES,
  DEFAULT_GAMEPLAY_CAPABILITIES,
  GAMEPLAY_FEATURE_IDS,
  GAMEPLAY_PROFILE_IDS,
  createGameplayCapabilities,
  resolveGameplayCapabilities,
} from "../values/gameplayCapabilities.js";

assert.equal(Object.isFrozen(DEFAULT_GAMEPLAY_CAPABILITIES), true);
assert.equal(DEFAULT_GAMEPLAY_CAPABILITIES.profileId, GAMEPLAY_PROFILE_IDS.DEMO);
assert.equal(DEFAULT_GAMEPLAY_CAPABILITIES.demoMode, true);
for (const featureId of Object.values(GAMEPLAY_FEATURE_IDS)) {
  assert.equal(DEFAULT_GAMEPLAY_CAPABILITIES.isEnabled(featureId), false, featureId);
}
assert.equal(DEFAULT_GAMEPLAY_CAPABILITIES.isShowcaseEnabled("campfire"), true);
assert.equal(DEFAULT_GAMEPLAY_CAPABILITIES.isShowcaseEnabled("constellations"), true);
assert.equal(DEVELOPMENT_GAMEPLAY_CAPABILITIES.profileId, GAMEPLAY_PROFILE_IDS.DEMO);
assert.equal(DEVELOPMENT_GAMEPLAY_CAPABILITIES.demoMode, true);
assert.equal(DEVELOPMENT_GAMEPLAY_CAPABILITIES.developmentTools, true);
assert.equal(DEVELOPMENT_GAMEPLAY_CAPABILITIES.isEnabled(
  GAMEPLAY_FEATURE_IDS.GOD_MODE,
), true);
assert.equal(DEVELOPMENT_GAMEPLAY_CAPABILITIES.isEnabled(
  GAMEPLAY_FEATURE_IDS.DEV_CHEATS,
), false);
assert.equal(DEVELOPMENT_GAMEPLAY_CAPABILITIES.isEnabled(
  GAMEPLAY_FEATURE_IDS.SCREEN_CAPTURE,
), true);
assert.equal(DEVELOPMENT_GAMEPLAY_CAPABILITIES.isEnabled(
  GAMEPLAY_FEATURE_IDS.LEVEL_TWO,
), false);

const fullReview = createGameplayCapabilities(GAMEPLAY_PROFILE_IDS.FULL_REVIEW);
assert.equal(fullReview.profileId, GAMEPLAY_PROFILE_IDS.FULL_REVIEW);
assert.equal(fullReview.demoMode, false);
for (const featureId of Object.values(GAMEPLAY_FEATURE_IDS)) {
  assert.equal(fullReview.isEnabled(featureId), true, featureId);
}
assert.equal(fullReview.isLevelEnabled(2), true);
assert.equal(fullReview.isUpgradeEnabled("arcCoreVehicle"), true);
assert.equal(fullReview.isKeybindEnabled("screenRecord"), true);

const reviewSearch = "?gameplayProfile=full-review";
assert.equal(resolveGameplayCapabilities({
  search: reviewSearch,
  hostname: "dig-game.example",
  allowProfileOverride: true,
}).profileId, GAMEPLAY_PROFILE_IDS.DEMO, "remote hosts cannot select review mode");
assert.equal(resolveGameplayCapabilities({
  search: reviewSearch,
  hostname: "localhost",
  allowProfileOverride: false,
}).profileId, GAMEPLAY_PROFILE_IDS.DEMO, "production disables query overrides");
const localDemo = resolveGameplayCapabilities({
  hostname: "localhost",
  allowProfileOverride: true,
});
assert.equal(localDemo.profileId, GAMEPLAY_PROFILE_IDS.DEMO);
assert.equal(localDemo.isEnabled(GAMEPLAY_FEATURE_IDS.GOD_MODE), true);
assert.equal(localDemo.isEnabled(GAMEPLAY_FEATURE_IDS.DEV_CHEATS), false);
assert.equal(localDemo.isEnabled(GAMEPLAY_FEATURE_IDS.SCREEN_CAPTURE), true);
assert.equal(localDemo.isEnabled(GAMEPLAY_FEATURE_IDS.LEVEL_TWO), false);
assert.equal(resolveGameplayCapabilities({
  search: reviewSearch,
  hostname: "127.0.0.1",
  allowProfileOverride: true,
}).profileId, GAMEPLAY_PROFILE_IDS.FULL_REVIEW);

console.log("GAMEPLAY_CAPABILITIES_CONTRACT_OK");
