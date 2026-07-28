import { TITAN_DISCOVERY_EXPERIENCE } from "../../values/titanDiscoveryExperience.js";

function distanceToAxis(value, minimum, maximumExclusive) {
  if (value < minimum) return minimum - value;
  if (value >= maximumExclusive) return value - maximumExclusive + 1;
  return 0;
}

export function getTitanZoneDistances(playerTile, zone) {
  if (!playerTile || !zone) return null;
  return {
    horizontal: distanceToAxis(
      playerTile.tx,
      zone.left,
      zone.rightExclusive
    ),
    vertical: distanceToAxis(
      playerTile.ty,
      zone.top,
      zone.bottomExclusive
    ),
  };
}

export function describeTitanDirection(
  playerTile,
  zone,
  leadCopy = null,
  config = TITAN_DISCOVERY_EXPERIENCE
) {
  const distances = getTitanZoneDistances(playerTile, zone);
  if (!distances) return null;
  const guidance = config.guidance;
  const distanceTiles = Math.hypot(
    distances.horizontal,
    distances.vertical
  );
  if (distances.horizontal === 0 && distances.vertical === 0) {
    return {
      distances,
      distanceTiles,
      directionText: guidance.nearbyCopy,
      message: guidance.insideCopy,
    };
  }

  const directionParts = [];
  if (distances.horizontal > 0) {
    const direction = playerTile.tx < zone.left
      ? guidance.eastCopy
      : guidance.westCopy;
    directionParts.push(
      `${distances.horizontal} ${guidance.tileUnitCopy} ${direction}`
    );
  }
  if (distances.vertical > 0) {
    const direction = playerTile.ty < zone.top
      ? guidance.belowCopy
      : guidance.aboveCopy;
    directionParts.push(
      `${distances.vertical}${guidance.meterUnitCopy} ${direction}`
    );
  }
  const resolvedLead = leadCopy || (
    distanceTiles <= guidance.nearDistanceTiles
      ? guidance.nearbyCopy
      : guidance.resonanceCopy
  );
  const directionText = directionParts.join(guidance.separatorCopy);
  return {
    distances,
    distanceTiles,
    directionText,
    message: [resolvedLead, directionText].join(guidance.separatorCopy),
  };
}
