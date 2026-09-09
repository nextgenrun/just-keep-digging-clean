// Immutable gameplay profiles. Production defaults to the bounded demo while
// local review tools can explicitly request the complete compatibility world.
export const GAMEPLAY_PROFILE_IDS = Object.freeze({
  DEMO: "demo",
  FULL_REVIEW: "full-review",
});

export const GAMEPLAY_FEATURE_IDS = Object.freeze({
  LEVEL_TWO: "levelTwo",
  ARC_CORES: "arcCores",
  HEAVENBLOCKS: "heavenblocks",
  DEV_CHEATS: "devCheats",
  GOD_MODE: "godMode",
  SCREEN_CAPTURE: "screenCapture",
  DEEP_TITAN_CATALOG: "deepTitanCatalog",
  NPC_ACTIVITIES: "npcActivities",
});

export const GAMEPLAY_CAPABILITY_CONFIG = Object.freeze({
  productionProfileId: GAMEPLAY_PROFILE_IDS.DEMO,
  reviewProfileId: GAMEPLAY_PROFILE_IDS.FULL_REVIEW,
  queryParam: "gameplayProfile",
  localHostnames: Object.freeze(["localhost", "127.0.0.1", "::1"]),
});

const DEMO_DISABLED_FEATURES = Object.freeze({
  [GAMEPLAY_FEATURE_IDS.LEVEL_TWO]: true,
  [GAMEPLAY_FEATURE_IDS.ARC_CORES]: true,
  [GAMEPLAY_FEATURE_IDS.HEAVENBLOCKS]: true,
  [GAMEPLAY_FEATURE_IDS.DEV_CHEATS]: true,
  [GAMEPLAY_FEATURE_IDS.GOD_MODE]: true,
  [GAMEPLAY_FEATURE_IDS.DEEP_TITAN_CATALOG]: true,
  [GAMEPLAY_FEATURE_IDS.NPC_ACTIVITIES]: true,
});

const DEVELOPMENT_FEATURES = Object.freeze({
  [GAMEPLAY_FEATURE_IDS.GOD_MODE]: true,
  [GAMEPLAY_FEATURE_IDS.SCREEN_CAPTURE]: true,
});

const DEMO_SHOWCASE_SYSTEM_FEATURES = Object.freeze({
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

function normalizeProfileId(profileId) {
  return profileId === GAMEPLAY_PROFILE_IDS.FULL_REVIEW
    ? GAMEPLAY_PROFILE_IDS.FULL_REVIEW
    : GAMEPLAY_PROFILE_IDS.DEMO;
}

export function createGameplayCapabilities(
  profileId = GAMEPLAY_CAPABILITY_CONFIG.productionProfileId,
  { enableDevelopmentTools = false } = {},
) {
  const resolvedProfileId = normalizeProfileId(profileId);
  const demoMode = resolvedProfileId === GAMEPLAY_PROFILE_IDS.DEMO;
  const isEnabled = featureId => (
    !demoMode
    || DEMO_DISABLED_FEATURES[featureId] !== true
    || (enableDevelopmentTools && DEVELOPMENT_FEATURES[featureId] === true)
  );

  return Object.freeze({
    profileId: resolvedProfileId,
    demoMode,
    developmentTools: enableDevelopmentTools === true,
    isEnabled,
    isShowcaseEnabled: featureId => (
      demoMode && DEMO_SHOWCASE_SYSTEM_FEATURES[featureId] === true
    ),
    isUpgradeEnabled: upgradeId => {
      const featureId = UPGRADE_FEATURES[upgradeId];
      return !featureId || isEnabled(featureId);
    },
    isKeybindEnabled: actionId => {
      const featureId = KEYBIND_FEATURES[actionId];
      return !featureId || isEnabled(featureId);
    },
    isLevelEnabled: levelId => (
      Number(levelId) !== 2 || isEnabled(GAMEPLAY_FEATURE_IDS.LEVEL_TWO)
    ),
  });
}

export const DEFAULT_GAMEPLAY_CAPABILITIES = createGameplayCapabilities();

export const DEVELOPMENT_GAMEPLAY_CAPABILITIES = createGameplayCapabilities(
  GAMEPLAY_PROFILE_IDS.DEMO,
  { enableDevelopmentTools: true },
);

export const RUNTIME_GAMEPLAY_CAPABILITIES = globalThis.__DIG_GAME_PRODUCTION__ === true
  ? DEFAULT_GAMEPLAY_CAPABILITIES
  : DEVELOPMENT_GAMEPLAY_CAPABILITIES;

export function isLocalGameplayProfileHost(hostname = "") {
  return GAMEPLAY_CAPABILITY_CONFIG.localHostnames.includes(
    String(hostname || "").trim().toLowerCase(),
  );
}

export function resolveGameplayCapabilities({
  search = "",
  hostname = "",
  allowProfileOverride = false,
} = {}) {
  if (!allowProfileOverride || !isLocalGameplayProfileHost(hostname)) {
    return DEFAULT_GAMEPLAY_CAPABILITIES;
  }
  const requested = new URLSearchParams(String(search || ""))
    .get(GAMEPLAY_CAPABILITY_CONFIG.queryParam);
  return createGameplayCapabilities(requested, { enableDevelopmentTools: true });
}
