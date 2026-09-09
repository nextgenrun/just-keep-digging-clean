import { WORLD_MAP_CONFIG } from "../../../values/worldMapConfig.js";
import { WORLD_MAP_COPY } from "../../../values/playerFacingCopy.js";

/** Formats the compact navigation readout in the authored map side panel. */
export function formatWorldMapStatus(
  stats,
  viewState,
  config = WORLD_MAP_CONFIG,
) {
  const copy = WORLD_MAP_COPY;
  const territory = stats.currentStarTerritory;
  const territoryName = territory
    ? (territory.discovered
      ? territory.identityName.toUpperCase()
      : copy.unidentifiedStar)
    : "";
  const territoryRoute = territory
    ? `${territory.state === "consumed" ? copy.starLostRoute : copy.starRoute} `
      + `${territory.distanceTiles}m ${territory.direction}`
    : "";
  const territoryState = territory
    ? (territory.state === "consumed" ? copy.starRefugeLost : copy.starRefugeDetail)
    : copy.noUndergroundStar;
  const territoryBiome = territory?.discovered && territory.biomeName
    ? `${copy.starAnchorBiome} ${territory.biomeName.toUpperCase()}`
    : "";
  return [
    copy.worldStatus,
    `${copy.currentDepth} ${stats.currentDepth}m / ${stats.maxDepth}m`,
    ...(stats.biomeFieldActive
      ? [`${copy.visualRegion} ${stats.currentBiome.toUpperCase()}`]
      : []),
    ...(territory
      ? [copy.starTerritory, territoryName, ...(territoryBiome ? [territoryBiome] : []), territoryRoute]
      : []),
    territoryState,
    `${copy.knownStarTerritories} ${stats.knownStarTerritoryCount}`
      + ` • ${stats.knownConsumedStarCount} ${copy.lostStarTerritories}`,
    `${copy.zoom} ${viewState.zoom.toFixed(1)}x • ${copy.knownSignals} ${stats.markerCount}`,
  ].join("\n");
}
