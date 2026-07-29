import {
  TITAN_DISCOVERY_EXPERIENCE,
} from "../../values/titanDiscoveryExperience.js";
import { isTitanCoverageReady } from "./titanCoverageThreshold.js";

function isNearLegacyZone(playerTile, zone, rangeTiles) {
  if (!playerTile || !zone) return false;
  return Math.abs(playerTile.tx - zone.centerXTile) <= rangeTiles
    && Math.abs(playerTile.ty - zone.centerYTile) <= rangeTiles;
}

export function isTitanEncounterReady(
  view,
  playerTile,
  mode,
  config = TITAN_DISCOVERY_EXPERIENCE
) {
  if (!view || view.discovered) return false;
  const encounter = config.encounter;
  if (mode === encounter.legacyModeId) {
    return view.zoneRemaining === 0
      && isNearLegacyZone(
        playerTile,
        view.zone,
        encounter.legacyTriggerRangeTiles
      );
  }
  return isTitanCoverageReady(view, encounter);
}
