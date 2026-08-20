import { TILE_TYPES } from "./tileTypes.js";

export const FIRST_SESSION_SAFETY_CONFIG = Object.freeze({
  localRecovery: Object.freeze({
    maximumDepthBelowTownTiles: 4,
    scanRadiusTiles: 8,
    cooldownMs: 5000,
    successCopy: "LOCAL RECOVERY  •  RETURNED TO SAFE TOWN GROUND  •  NO CARGO LOST",
    unavailableCopy: "LOCAL RECOVERY ONLY WORKS NEAR TOWN  •  USE FLIGHT OR ABANDON WITH A LOSS PREVIEW",
    cooldownCopy: "LOCAL RECOVERY IS RECHARGING",
  }),
  blockers: Object.freeze({
    "permanent-boundary": Object.freeze({
      label: "PERMANENT BOUNDARY",
      detail: "THIS BEDROCK DOES NOT BREAK  •  FIND ANOTHER ROUTE",
    }),
    "tool-gate": Object.freeze({
      label: "TOOL GATE",
      detail: "THIS SHELL NEEDS HEAVY PUNCH  •  RETURN AFTER THE UPGRADE",
    }),
    "protected-structure": Object.freeze({
      label: "PROTECTED STRUCTURE",
      detail: "THIS TILE SUPPORTS TOWN OR A CAVE  •  DIG AROUND IT",
    }),
    "temporary-state": Object.freeze({
      label: "TEMPORARILY LOCKED",
      detail: "FINISH THE CURRENT ROUTE STEP  •  THEN TRY AGAIN",
    }),
  }),
});

export function resolveMiningBlockerReason(tileType) {
  if (tileType === TILE_TYPES.GEODE_WALL) return "tool-gate";
  if (
    tileType === TILE_TYPES.FLOOR_TOWN_1
    || tileType === TILE_TYPES.FLOOR_TOWN_2
    || tileType === TILE_TYPES.CAVE_WALL
    || tileType === TILE_TYPES.CHEST
    || tileType === TILE_TYPES.GLOW_CRYSTAL
  ) {
    return "protected-structure";
  }
  if (tileType === TILE_TYPES.BEDROCK) return "permanent-boundary";
  return "temporary-state";
}

export function getMiningBlockerCopy(reason) {
  return FIRST_SESSION_SAFETY_CONFIG.blockers[reason]
    || FIRST_SESSION_SAFETY_CONFIG.blockers["temporary-state"];
}
