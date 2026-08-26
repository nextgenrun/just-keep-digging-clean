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

// Conservative pose envelopes for the unified Survival render. These are not
// full per-limb hitboxes: hands, tools and coat tails remain visual-only so a
// wide strike cannot snag on terrain. The profiles only protect the character's
// core silhouette and keep the sprite's bottom-center anchor stable while the
// authoritative body changes shape.
export const PLAYER_COLLISION_POLISH_V2 = Object.freeze({
  enabled: true,
  queryParam: "colliderV2",
  disabledValues: Object.freeze(["0", "off", "false"]),
  requiredRenderPipeline: "survival-unified-animation-runtime-v1",
  defaultProfileId: "upright",
  locomotionMinHorizontalSpeedPxPerSec: 10,
  movingSideDigStandOff: Object.freeze({
    preserveVisualCenterToFace: true,
    referenceBodyWidthPx: 31,
    minimumDistancePx: 8,
  }),
  profiles: Object.freeze({
    upright: Object.freeze({ widthPx: 31, heightPx: 75, visualAnchorOffsetYPx: 0 }),
    locomotion: Object.freeze({ widthPx: 48, heightPx: 75, visualAnchorOffsetYPx: 0 }),
    crouch: Object.freeze({ widthPx: 44, heightPx: 57, visualAnchorOffsetYPx: 0 }),
    airborne: Object.freeze({ widthPx: 40, heightPx: 75, visualAnchorOffsetYPx: 0 }),
    flight: Object.freeze({ widthPx: 66, heightPx: 34, visualAnchorOffsetYPx: 22 }),
  }),
});

export function resolvePlayerCollisionPolishV2Enabled(
  profile,
  search = globalThis.location?.search || "",
  config = PLAYER_COLLISION_POLISH_V2,
) {
  if (config.enabled !== true || profile?.renderPipeline !== config.requiredRenderPipeline) {
    return false;
  }
  const value = new URLSearchParams(search).get(config.queryParam)?.trim().toLowerCase();
  return !value || !config.disabledValues.includes(value);
}

export function resolveSurfaceDropThroughEnabled(
  config = PLAYER_COLLISION_CONFIG,
  search = globalThis.location?.search || "",
) {
  const feature = config.surfaceDropThrough;
  if (!feature?.enabled) return false;
  const value = new URLSearchParams(search).get(feature.queryParam)?.trim().toLowerCase();
  return !value || !feature.disabledValues.includes(value);
}
