// Compatibility facade for existing consumers. New constructors receive the
// immutable capabilities object; these helpers select the marker-gated runtime
// demo profile while that injection migrates incrementally.
import {
  GAMEPLAY_FEATURE_IDS,
  RUNTIME_GAMEPLAY_CAPABILITIES,
} from "./gameplayCapabilities.js";

export { GAMEPLAY_FEATURE_IDS } from "./gameplayCapabilities.js";

export const GAMEPLAY_DEV_FLAGS = Object.freeze({
  demoMode: RUNTIME_GAMEPLAY_CAPABILITIES.demoMode,
  profileId: RUNTIME_GAMEPLAY_CAPABILITIES.profileId,
});

export function isDemoModeEnabled(capabilities = RUNTIME_GAMEPLAY_CAPABILITIES) {
  return capabilities.demoMode === true;
}

export function isGameplayFeatureEnabled(featureId, capabilities = RUNTIME_GAMEPLAY_CAPABILITIES) {
  return capabilities.isEnabled(featureId);
}

export function isDemoShowcaseSystemFeature(featureId, capabilities = RUNTIME_GAMEPLAY_CAPABILITIES) {
  return capabilities.isShowcaseEnabled(featureId);
}

export function isGameplayUpgradeEnabled(upgradeId, capabilities = RUNTIME_GAMEPLAY_CAPABILITIES) {
  return capabilities.isUpgradeEnabled(upgradeId);
}

export function isGameplayKeybindActionEnabled(actionId, capabilities = RUNTIME_GAMEPLAY_CAPABILITIES) {
  return capabilities.isKeybindEnabled(actionId);
}

export function isGameplayLevelEnabled(levelId, capabilities = RUNTIME_GAMEPLAY_CAPABILITIES) {
  return capabilities.isLevelEnabled(levelId);
}
