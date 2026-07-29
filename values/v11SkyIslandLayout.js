import { HEAVENBLOCKS_WORLD_CONFIG } from "./heavenblocksWorldConfig.js";

function makeCompatibilityLevel(level) {
  const regions = HEAVENBLOCKS_WORLD_CONFIG.regions.filter(
    (region) => level.regionIds.includes(region.id)
  );
  const leftTile = Math.min(...regions.map((region) => region.bounds.left));
  const rightTile = Math.max(...regions.map((region) => region.bounds.right));
  const topTile = Math.min(...regions.map((region) => region.bounds.top));
  const bottomTile = Math.max(...regions.map((region) => region.bounds.bottom));
  return Object.freeze({
    ...level,
    platformKey: null,
    portalKey: null,
    leftTile,
    bottomTile,
    widthTiles: rightTile - leftTile + 1,
    heightTiles: bottomTile - topTile + 1,
  });
}

/**
 * Compatibility view for legacy portal and constellation consumers.
 * Native terrain, collision, and visuals are owned by Heavenblocks v2.
 */
export const V11_SKY_ISLAND_LAYOUT = Object.freeze({
  enabled: HEAVENBLOCKS_WORLD_CONFIG.enabled,
  source: "native-heavenblocks-v2",
  tileSize: HEAVENBLOCKS_WORLD_CONFIG.tileSize,
  dividerTileX: HEAVENBLOCKS_WORLD_CONFIG.dividerTileX,
  groundRow: HEAVENBLOCKS_WORLD_CONFIG.topAirRows,
  platformDepth: 0,
  portalDepth: 2,
  levels: Object.freeze(
    HEAVENBLOCKS_WORLD_CONFIG.levels.map(makeCompatibilityLevel)
  ),
});
