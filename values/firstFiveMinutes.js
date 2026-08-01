// Rollback-safe first-five-minute profile layered over the production tutorial.

export const FIRST_FIVE_MINUTES_CONFIG = Object.freeze({
  enabled: true,
  rollback: Object.freeze({
    queryParam: "firstFive",
    disabledValues: Object.freeze(["0", "off", "false", "legacy"]),
  }),
  digSite: Object.freeze({
    tileX: 11,
    surfaceRowOffset: -1,
    tileTypeName: "DIRT",
    useNormalTileHp: true,
  }),
  payoffSite: Object.freeze({
    tileX: 12,
    surfaceRowOffset: -1,
    tileTypeName: "DIRT",
    useNormalTileHp: true,
  }),
  surfaceSafety: Object.freeze({
    blockedDetailMs: 1800,
    depthGuardTolerancePx: 4,
    recoveryScanRadiusTiles: 12,
    safeReturnTileX: 4,
  }),
  expectedPayoff: Object.freeze({
    materialLabel: "Dirt",
    beforeHits: 3,
    afterHits: 2,
  }),
  copy: Object.freeze({
    move: Object.freeze({
      promise: "STEP 1  •  WALK TO THE MARKED DIRT",
      detail: "{left}/{right} MOVE  •  NEXT: HOLD {mine} TO MINE",
    }),
    dig: Object.freeze({
      promise: "STEP 2  •  MINE THE MARKED DIRT",
      detail: "FACE THE BLOCK  •  HOLD {mine}  •  NEXT: SELL THE DIRT",
    }),
    sell: Object.freeze({
      promise: "STEP 3  •  SELL DIRT TO THE MONEY MONSTER",
      detail: "FOLLOW THE MARKER RIGHT  •  {interact} OPENS SELL  •  SELL 1+ DIRT",
    }),
    upgrade: Object.freeze({
      promise: "STEP 4  •  BUY {upgrade}",
      detail: "FOLLOW THE MARKER LEFT  •  {interact}  •  DIRT: 3 HITS → 2",
    }),
    flight: Object.freeze({
      promise: "SAFETY CHECK  •  HOLD {fly} TO FLY",
      detail: "HOLD {fly} NOW  •  KEEP HOLDING UNTIL YOU LIFT OFF",
    }),
    payoff: Object.freeze({
      promise: "FEEL THE UPGRADE  •  BREAK THE MARKED DIRT",
      detail: "{upgrade}: DIRT 3 HITS → 2  •  THEN GO DEEPER",
    }),
    protectedGround: Object.freeze({
      detail: "TOWN GROUND IS PROTECTED  •  MINE THE MARKED DIRT BLOCK",
    }),
    trainingDropBlocked: Object.freeze({
      detail: "STAY UP HERE  •  FINISH ALL 4 STEPS FIRST",
    }),
    surfaceDropBlocked: Object.freeze({
      detail: "HOLD {fly} UNTIL YOU LIFT OFF  •  THEN GO DOWN",
    }),
    complete: Object.freeze({
      phase: "CORE LOOP LEARNED",
      title: "MINE  →  SELL  →  UPGRADE  →  FLY  →  GO DEEPER",
      body: "{upgrade} proved itself: Dirt now breaks in 2 hits.",
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
