// Rollback-safe first-five-minute profile layered over the production tutorial.

export const FIRST_FIVE_MINUTES_CONFIG = Object.freeze({
  enabled: true,
  rollback: Object.freeze({
    queryParam: "firstFive",
    disabledValues: Object.freeze(["0", "off", "false", "legacy"]),
  }),
  digSite: Object.freeze({
    tileX: 12,
    surfaceRowOffset: -1,
    tileTypeName: "DIRT",
    useNormalTileHp: true,
  }),
  firstPortal: Object.freeze({
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
    // Matches the approved Town Square doorway centered at tile 65.9.
    tileX: 66,
    topSurfaceRowOffset: -3,
    heightTiles: 3,
  }),
  copy: Object.freeze({
    protectedGround: Object.freeze({
      detail: "TOWN GROUND IS PROTECTED  •  USE THE MARKED STARTER ROUTE",
    }),
    surfaceDropBlocked: Object.freeze({
      detail: "HOLD {fly} UNTIL YOU LIFT OFF  •  THEN GO DOWN",
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
