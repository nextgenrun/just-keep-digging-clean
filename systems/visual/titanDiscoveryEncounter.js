import {
  TITAN_DISCOVERY_EXPERIENCE,
} from "../../values/titanDiscoveryExperience.js";

export function getRequiredTitanRevealTiles(
  totalTiles,
  config = TITAN_DISCOVERY_EXPERIENCE
) {
  const total = Math.max(0, Number(totalTiles) || 0);
  const encounter = config.encounter;
  return Math.min(
    total,
    Math.max(
      encounter.minimumRevealTiles,
      Math.ceil(total * encounter.minimumRevealRatio)
    )
  );
}

export function isPlayerInsideTitanZone(
  playerTile,
  zone,
  padding = TITAN_DISCOVERY_EXPERIENCE.encounter.entryPaddingTiles
) {
  if (!playerTile || !zone) return false;
  return playerTile.tx >= zone.left - padding
    && playerTile.tx < zone.rightExclusive + padding
    && playerTile.ty >= zone.top - padding
    && playerTile.ty < zone.bottomExclusive + padding;
}

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
  if (mode === "legacy") {
    return view.remaining === 0
      && isNearLegacyZone(
        playerTile,
        view.zone,
        config.encounter.legacyTriggerRangeTiles
      );
  }
  return view.revealed >= view.requiredReveal
    && isPlayerInsideTitanZone(
      playerTile,
      view.zone,
      config.encounter.entryPaddingTiles
    );
}
