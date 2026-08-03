export const PLAYER_GROUND_FOOTSTEP_FX_CONFIG = Object.freeze({
  enabled: true,
  rollback: Object.freeze({
    queryParam: "groundFootFx",
    disabledValues: Object.freeze(["0", "false", "off", "legacy"]),
  }),
  reducedMotionMediaQuery: "(prefers-reduced-motion: reduce)",
  rig: Object.freeze({
    sourceAction: "run",
    markerGroup: "feet",
    floorProbeTiles: 0.04,
  }),
  speed: Object.freeze({
    minimumPxPerSec: 55,
    minimumRatio: 0.25,
    maximumIntensityRatio: 1.2,
    minimumVisualScale: 0.72,
  }),
  particles: Object.freeze({
    count: 3,
    reducedMotionCount: 1,
    maxLive: 12,
    displayMinTiles: 0.045,
    displayMaxTiles: 0.09,
    spawnJitterXTiles: 0.035,
    spawnJitterYTiles: 0.012,
    backwardMinTiles: 0.08,
    backwardMaxTiles: 0.18,
    liftMinTiles: 0.035,
    liftMaxTiles: 0.085,
    settleDownTiles: 0.04,
    launchMinMs: 70,
    launchMaxMs: 95,
    settleMinMs: 110,
    settleMaxMs: 150,
    rotationMin: 0.35,
    rotationMax: 1.1,
    startAlpha: 0.78,
    startScale: 0.55,
    peakScale: 0.95,
    endScale: 0.7,
    depthOffset: -1.25,
  }),
});

export function resolvePlayerGroundFootstepFxEnabled(
  search = globalThis.location?.search || "",
  config = PLAYER_GROUND_FOOTSTEP_FX_CONFIG,
) {
  if (config.enabled !== true) return false;
  const value = new URLSearchParams(search)
    .get(config.rollback.queryParam)
    ?.trim()
    .toLowerCase();
  return !value || !config.rollback.disabledValues.includes(value);
}
