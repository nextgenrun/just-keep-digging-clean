// Development-facing gameplay mode switches. Demo mode is a profile over the
// production game: switching it off restores the full-game feature set.
export const GAMEPLAY_DEV_FLAGS = Object.freeze({
  demoMode: true,
});

export const GAMEPLAY_FEATURE_IDS = Object.freeze({
  LEVEL_TWO: "levelTwo",
  ARC_CORES: "arcCores",
  DEV_CHEATS: "devCheats",
  SCREEN_CAPTURE: "screenCapture",
});

const DEMO_MODE_DISABLED_FEATURES = Object.freeze({
  [GAMEPLAY_FEATURE_IDS.LEVEL_TWO]: true,
  [GAMEPLAY_FEATURE_IDS.ARC_CORES]: true,
  [GAMEPLAY_FEATURE_IDS.DEV_CHEATS]: true,
  [GAMEPLAY_FEATURE_IDS.SCREEN_CAPTURE]: true,
});

// Demo builds keep the two authored Level One showcase interactions available
// from the town square. Their own progression UIs still enforce level, Star
// Point, prerequisite, and purchase requirements.
const DEMO_MODE_SHOWCASE_SYSTEM_FEATURES = Object.freeze({
  campfire: true,
  constellations: true,
});

const UPGRADE_FEATURES = Object.freeze({
  worldTwoTunnelAccess: GAMEPLAY_FEATURE_IDS.LEVEL_TWO,
  arcCoreVehicle: GAMEPLAY_FEATURE_IDS.ARC_CORES,
  omegaArcCoreVehicle: GAMEPLAY_FEATURE_IDS.ARC_CORES,
});

const KEYBIND_FEATURES = Object.freeze({
  arcCoreVehicle: GAMEPLAY_FEATURE_IDS.ARC_CORES,
  screenRecord: GAMEPLAY_FEATURE_IDS.SCREEN_CAPTURE,
});

export function isDemoModeEnabled() {
  return GAMEPLAY_DEV_FLAGS.demoMode === true;
}

export function isGameplayFeatureEnabled(featureId) {
  return !isDemoModeEnabled() || DEMO_MODE_DISABLED_FEATURES[featureId] !== true;
}

export function isDemoShowcaseSystemFeature(featureId) {
  return isDemoModeEnabled()
    && DEMO_MODE_SHOWCASE_SYSTEM_FEATURES[featureId] === true;
}

export function isGameplayUpgradeEnabled(upgradeId) {
  const featureId = UPGRADE_FEATURES[upgradeId];
  return !featureId || isGameplayFeatureEnabled(featureId);
}

export function isGameplayKeybindActionEnabled(actionId) {
  const featureId = KEYBIND_FEATURES[actionId];
  return !featureId || isGameplayFeatureEnabled(featureId);
}

export function isGameplayLevelEnabled(levelId) {
  return Number(levelId) !== 2
    || isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.LEVEL_TWO);
}
