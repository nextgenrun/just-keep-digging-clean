// Compatibility facade for existing consumers. New constructors receive the
// immutable capabilities object; these helpers keep untouched modules on the
// production demo profile while that injection migrates incrementally.
import {
  DEFAULT_GAMEPLAY_CAPABILITIES,
  GAMEPLAY_FEATURE_IDS,
} from "./gameplayCapabilities.js";

export { GAMEPLAY_FEATURE_IDS } from "./gameplayCapabilities.js";

export const GAMEPLAY_DEV_FLAGS = Object.freeze({
  demoMode: DEFAULT_GAMEPLAY_CAPABILITIES.demoMode,
  profileId: DEFAULT_GAMEPLAY_CAPABILITIES.profileId,
});

export function isDemoModeEnabled(capabilities = DEFAULT_GAMEPLAY_CAPABILITIES) {
  return capabilities.demoMode === true;
}

export function isGameplayFeatureEnabled(featureId, capabilities = DEFAULT_GAMEPLAY_CAPABILITIES) {
  return capabilities.isEnabled(featureId);
}

export function isDemoShowcaseSystemFeature(featureId, capabilities = DEFAULT_GAMEPLAY_CAPABILITIES) {
  return capabilities.isShowcaseEnabled(featureId);
}

export function isGameplayUpgradeEnabled(upgradeId, capabilities = DEFAULT_GAMEPLAY_CAPABILITIES) {
  return capabilities.isUpgradeEnabled(upgradeId);
}

export function isGameplayKeybindActionEnabled(actionId, capabilities = DEFAULT_GAMEPLAY_CAPABILITIES) {
  return capabilities.isKeybindEnabled(actionId);
}

export function isGameplayLevelEnabled(levelId, capabilities = DEFAULT_GAMEPLAY_CAPABILITIES) {
  return capabilities.isLevelEnabled(levelId);
}
