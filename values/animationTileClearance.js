const policy = ({
  id,
  targetFamily,
  strikingLimb,
  contactMarker,
  allowedMotion,
  requiredOpen = [],
  reachTiles,
  plantedFoot,
  fallbackPriority,
}) => Object.freeze({
  id,
  targetFamily,
  strikingLimb,
  contactMarker,
  allowedMotion: Object.freeze(allowedMotion),
  requiredOpen: Object.freeze(requiredOpen),
  reachTiles: Object.freeze(reachTiles),
  plantedFoot,
  fallbackPriority,
});

export const ANIMATION_TILE_CLEARANCE_POLICIES = Object.freeze({
  sideCanonical: policy({
    id: "side-canonical-short-reach",
    targetFamily: "side",
    strikingLimb: "hands",
    contactMarker: "hands",
    allowedMotion: ["stationary", "moving", "airborne"],
    reachTiles: { forward: 1, vertical: 0.34 },
    plantedFoot: "both",
    fallbackPriority: 100,
  }),
  sideExpressiveHands: policy({
    id: "side-expressive-hands",
    targetFamily: "side",
    strikingLimb: "hands",
    contactMarker: "hands",
    allowedMotion: ["stationary"],
    requiredOpen: ["head", "target-above"],
    reachTiles: { forward: 1, vertical: 0.48 },
    plantedFoot: "both",
    fallbackPriority: 30,
  }),
  sideWideKick: policy({
    id: "side-wide-kick",
    targetFamily: "side",
    strikingLimb: "feet",
    contactMarker: "feet",
    allowedMotion: ["stationary"],
    requiredOpen: ["head", "rear-head", "target-above"],
    reachTiles: { forward: 1, vertical: 0.72 },
    plantedFoot: "opposite",
    fallbackPriority: 20,
  }),
  upCanonical: policy({
    id: "up-canonical-short-reach",
    targetFamily: "up",
    strikingLimb: "hands",
    contactMarker: "hands",
    allowedMotion: ["stationary", "airborne"],
    reachTiles: { forward: 0.34, vertical: 1 },
    plantedFoot: "both",
    fallbackPriority: 100,
  }),
  upExpressive: policy({
    id: "up-expressive-open-arc",
    targetFamily: "up",
    strikingLimb: "hands",
    contactMarker: "hands",
    allowedMotion: ["stationary"],
    requiredOpen: ["target-left", "target-right"],
    reachTiles: { forward: 0.48, vertical: 1 },
    plantedFoot: "both",
    fallbackPriority: 40,
  }),
  downCanonical: policy({
    id: "down-canonical-ground-strike",
    targetFamily: "down",
    strikingLimb: "hands",
    contactMarker: "hands",
    allowedMotion: ["stationary", "airborne"],
    reachTiles: { forward: 0.4, vertical: 1 },
    plantedFoot: "both",
    fallbackPriority: 100,
  }),
  diagonalCanonical: policy({
    id: "diagonal-canonical-short-reach",
    targetFamily: "diagonal",
    strikingLimb: "hands",
    contactMarker: "hands",
    allowedMotion: ["stationary", "airborne"],
    reachTiles: { forward: 0.7, vertical: 0.7 },
    plantedFoot: "both",
    fallbackPriority: 100,
  }),
});

export const ANIMATION_TILE_CLEARANCE_CONFIG = Object.freeze({
  enabledByDefault: true,
  rollbackQuery: "animationClearance",
  disabledQueryValue: "0",
  runtimeGlobal: "__jkdAnimationClearance",
  movingSpeedThresholdPxPerSecond: 8,
});

export function resolveAnimationTileClearanceEnabled(
  search = globalThis.location?.search || "",
) {
  return ANIMATION_TILE_CLEARANCE_CONFIG.enabledByDefault
    && new URLSearchParams(String(search || ""))
      .get(ANIMATION_TILE_CLEARANCE_CONFIG.rollbackQuery)
      !== ANIMATION_TILE_CLEARANCE_CONFIG.disabledQueryValue;
}
