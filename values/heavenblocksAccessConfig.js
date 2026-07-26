import { HEAVENBLOCKS_WORLD_CONFIG } from "./heavenblocksWorldConfig.js";

const freeze = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(freeze);
  return value;
};

const accessRegion = (entry) => ({
  id: entry.id,
  label: entry.label,
  levelId: entry.levelId,
  color: entry.color,
  arrival: entry.arrival,
  entryShaft: entry.entryShaft,
  entryDirection: entry.entryDirection,
  returnAltar: entry.returnAltar,
  arcVault: entry.arcVault,
  core: entry.core,
  surfaceReturn: entry.surfaceReturn,
  surfaceGate: entry.surfaceGate,
  requiredUpgradeId: entry.requiredUpgradeId,
  partId: entry.partId,
  partLabel: entry.partLabel,
  vaultId: entry.vaultId,
  componentAssetKey: entry.componentAssetKey,
  heartAssetKey: entry.heartAssetKey,
  portalAssetKey: entry.portalAssetKey,
});

export const HEAVENBLOCKS_ACCESS_CONFIG = freeze({
  enabled: true,
  queryParam: "heavenblocksGameplay",
  worldConfigVersion: HEAVENBLOCKS_WORLD_CONFIG.version,
  requiredRelics: 3,
  interactionRadiusTiles: 1.45,
  safeLandingRadiusTiles: 5,
  surfaceGates: HEAVENBLOCKS_WORLD_CONFIG.regions.map((entry) => ({
    regionId: entry.id,
    tx: entry.surfaceGate.tx,
    ty: entry.surfaceGate.ty,
    label: entry.label,
    levelId: entry.levelId,
    color: entry.color,
    portalAssetKey: entry.portalAssetKey,
  })),
  regions: HEAVENBLOCKS_WORLD_CONFIG.regions.map(accessRegion),
  presentation: {
    depth: HEAVENBLOCKS_WORLD_CONFIG.visual.portalDepth,
    promptOffsetPx: 112,
    lockedAlpha: HEAVENBLOCKS_WORLD_CONFIG.visual.lockedPortalAlpha,
    unlockedAlpha: HEAVENBLOCKS_WORLD_CONFIG.visual.unlockedPortalAlpha,
    pulsePeriodMs: HEAVENBLOCKS_WORLD_CONFIG.visual.pulseDurationMs,
    firstUnlockDelayMs: 1900,
    revisitDelayMs: 320,
    reducedMotionDelayMs: 80,
    relicProjectionRadiusPx: 76,
    relicProjectionScale: 0.72,
    transitFlashDurationMs: 220,
    componentClaimDurationMs: 1800,
    portalEchoScale: 2.6,
    shaftBeaconDisplayTiles: 0.58,
    shaftBeaconAlpha: 0.92,
    shaftBeaconBobPx: 12,
    shaftBeaconBobDurationMs: 820,
    objectiveX: 640,
    objectiveY: 116,
    objectiveIconX: 438,
    objectiveIconSizePx: 38,
    objectiveFontFamily: "Arial, sans-serif",
    objectiveFontSizePx: 17,
    objectiveTextColor: "#f8f3de",
    objectiveStrokeColor: "#07111b",
    objectiveStrokeThicknessPx: 6,
  },
  copy: {
    locked: "Requires {count}/{required} Ancient Relics",
    activate: "Awaken the Sky Altar",
    ascend: "Ascend to {label}",
    return: "Return to the surface",
    mineHeart: "Mine the buried {part} heart",
    openVault: "Open the Arc Vault",
    vaultLocked: "Arc Core resonance required",
    levelLocked: "Level {level} access required",
    arrival: "{label}  •  OPEN SHAFT {direction}  •  Mine the {part} heart",
    coreSignal: "{part} HEART  •  {distance} tiles {direction}",
    directionLeft: "LEFT",
    directionRight: "RIGHT",
    directionUp: "UP",
    directionDown: "DOWN",
  },
});

export function resolveHeavenblocksGameplayEnabled(
  config = HEAVENBLOCKS_ACCESS_CONFIG,
  search = globalThis.location?.search || "",
) {
  const raw = new URLSearchParams(search).get(config.queryParam);
  if (raw === null) return config.enabled;
  const normalized = raw.trim().toLowerCase();
  if (["0", "false", "off", "no"].includes(normalized)) return false;
  if (["1", "true", "on", "yes"].includes(normalized)) return true;
  return config.enabled;
}

export function getHeavenblockAccessRegion(regionId) {
  return HEAVENBLOCKS_ACCESS_CONFIG.regions.find((entry) => entry.id === regionId) || null;
}
