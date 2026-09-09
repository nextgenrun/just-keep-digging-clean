// Rollback-safe first-five-minute profile layered over the production tutorial.

export const FIRST_FIVE_MINUTES_CONFIG = Object.freeze({
  enabled: true,
  rollback: Object.freeze({
    queryParam: "firstFive",
    disabledValues: Object.freeze(["0", "off", "false", "legacy"]),
  }),
  digSite: Object.freeze({
    tileX: 12,
    // Embed the starter seam in the authored ground instead of floating one
    // full legacy dirt square in front of the Town Square background.
    surfaceRowOffset: 0,
    tileTypeName: "DIRT",
    useNormalTileHp: true,
  }),
  firstPortal: Object.freeze({
    levelId: 1,
    tileX: 12,
    depthMeters: 15,
    tileTypeName: "TELEPORT_TILE",
  }),
  surfaceSafety: Object.freeze({
    blockedDetailMs: 1800,
    depthGuardTolerancePx: 4,
    recoveryScanRadiusTiles: 12,
    safeReturnTileX: 4,
  }),
  townExitBarrier: Object.freeze({
    // The Money Monster is the final tutorial-facing Town stop at x17.
    // A full Flight-height wall at x18 makes that boundary physical.
    tileX: 18,
    topSurfaceRowOffset: -20,
    heightTiles: 20,
    starterRoute: Object.freeze({
      halfWidthTiles: 2,
      sideStartDepthMeters: 1,
      sideEndDepthMeters: 17,
      floorDepthMeters: 17,
    }),
  }),
  portalGhostGuide: Object.freeze({
    activeStages: Object.freeze(["flight", "portal"]),
    startDepthMeters: -1,
    destinationDepthOffsetMeters: -1,
    approachOffsetTiles: -2.25,
    approachMoveMs: 760,
    moveMsPerTile: 190,
    minimumMoveMs: 240,
    demonstrationHoldMs: 900,
    alpha: 0.48,
    tint: 0x7bdcff,
    depth: 53,
    displayScaleRatio: 0.82,
  }),
  copy: Object.freeze({
    protectedGround: Object.freeze({
      detail: "THE TOWN FLOOR IS PROTECTED  •  START AT THE GLOWING MARKER",
    }),
    surfaceDropBlocked: Object.freeze({
      detail: "HOLD {fly} TO LIFT OFF  •  MOVE OVER THE OPENING, THEN DESCEND",
    }),
  }),
});

export function resolveFirstFiveMinutesEnabled(
  config = FIRST_FIVE_MINUTES_CONFIG,
  search = globalThis.location?.search || "",
) {
  if (config.enabled !== true) return false;
  const value = new URLSearchParams(search)
    .get(config.rollback.queryParam)
    ?.trim()
    .toLowerCase();
  return !value || !config.rollback.disabledValues.includes(value);
}
