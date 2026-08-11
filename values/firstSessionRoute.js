// Deterministic first-session route invariants. Runtime mutation belongs to
// systems/onboarding; this module only owns coordinates and release rules.

export const FIRST_SESSION_ROUTE_CONFIG = Object.freeze({
  version: 1,
  starterPortal: Object.freeze({
    tileX: 12,
    depthMeters: 15,
    tileTypeName: "TELEPORT_TILE",
    protectIntervalMs: 750,
  }),
  townExitBarrier: Object.freeze({
    tileX: 66,
    topSurfaceRowOffset: -3,
    heightTiles: 3,
    tileTypeName: "BEDROCK",
    releaseFlag: "surfaceReturnCelebrated",
  }),
});
