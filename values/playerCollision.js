import { WORLD_DEPTH_CONFIG } from "./worldDepthConfig.js";

export const PLAYER_COLLISION_CONFIG = Object.freeze({
  skinPx: 0.001,
  groundProbePx: 1,
  maxStepTiles: 0.45,
  maxVelocityTilesPerSecond: 30,
  maxDeltaSeconds: 0.05,
  recoverOverlaps: true,
  surfaceDropThrough: Object.freeze({
    enabled: true,
    queryParam: "surfaceDrop",
    disabledValues: Object.freeze(["0", "off", "false"]),
    clearRowsBelow: WORLD_DEPTH_CONFIG.surfaceClearanceRowsBelow,
    contactTolerancePx: 1.5,
    minimumDownVelocityTilesPerSecond: 2.4,
    releaseMarginPx: 1,
  }),
});

export function resolveSurfaceDropThroughEnabled(
  config = PLAYER_COLLISION_CONFIG,
  search = globalThis.location?.search || "",
) {
  const feature = config.surfaceDropThrough;
  if (!feature?.enabled) return false;
  const value = new URLSearchParams(search).get(feature.queryParam)?.trim().toLowerCase();
  return !value || !feature.disabledValues.includes(value);
}
