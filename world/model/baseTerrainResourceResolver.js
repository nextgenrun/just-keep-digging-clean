import { TILE_TYPES } from "../../values/tileTypes.js";

function resolveLegacyTerrainType(depth, roll, terrain) {
  if (depth < terrain.band1MaxDepth) {
    return roll < terrain.band1StoneChance ? TILE_TYPES.STONE : TILE_TYPES.DIRT;
  }
  if (depth < terrain.band2MaxDepth) {
    if (roll < terrain.band2CopperChance) return TILE_TYPES.COPPER;
    if (roll < terrain.band2StoneChance) return TILE_TYPES.STONE;
    return TILE_TYPES.DIRT;
  }
  if (depth < terrain.band3MaxDepth) {
    if (roll < terrain.band3IronChance) return TILE_TYPES.IRON;
    if (roll < terrain.band3DarkDirtNormalChance) return TILE_TYPES.DARK_DIRT_NORMAL;
    if (roll < terrain.band3CopperChance) return TILE_TYPES.COPPER;
    if (roll < terrain.band3StoneChance) return TILE_TYPES.STONE;
    return TILE_TYPES.DIRT;
  }
  if (depth < terrain.band4MaxDepth) {
    if (roll < terrain.band4GoldChance) return TILE_TYPES.GOLD;
    if (roll < terrain.band4SilverChance) return TILE_TYPES.SILVER;
    if (roll < terrain.band4DarkDirtStrongChance) return TILE_TYPES.DARK_DIRT_STRONG;
    if (roll < terrain.band4DarkDirtNormalChance) return TILE_TYPES.DARK_DIRT_NORMAL;
    if (roll < terrain.band4SteelChance) return TILE_TYPES.STEEL;
    if (roll < terrain.band4IronChance) return TILE_TYPES.IRON;
    if (roll < terrain.band4CopperChance) return TILE_TYPES.COPPER;
    if (roll < terrain.band4StoneChance) return TILE_TYPES.STONE;
    return TILE_TYPES.DIRT;
  }
  if (roll < terrain.deepGoldChance) return TILE_TYPES.GOLD;
  if (roll < terrain.deepSilverChance) return TILE_TYPES.SILVER;
  if (roll < terrain.deepDarkDirtStrongChance) return TILE_TYPES.DARK_DIRT_STRONG;
  if (roll < terrain.deepDarkDirtNormalChance) return TILE_TYPES.DARK_DIRT_NORMAL;
  if (roll < terrain.deepBronzeChance) return TILE_TYPES.BRONZE;
  if (roll < terrain.deepSteelChance) return TILE_TYPES.STEEL;
  if (roll < terrain.deepIronChance) return TILE_TYPES.IRON;
  if (roll < terrain.deepCopperChance) return TILE_TYPES.COPPER;
  if (roll < terrain.deepStoneChance) return TILE_TYPES.STONE;
  return TILE_TYPES.DIRT;
}

function enforceResourceDepthGates(depth, tileType, terrain) {
  if (tileType === TILE_TYPES.GOLD && depth < terrain.goldMinDepth) {
    return TILE_TYPES.DIRT;
  }
  return tileType;
}

export function resolveBaseTerrainResourceType(
  depth,
  roll,
  terrain,
  depthEconomyEnabled = true,
) {
  if (!depthEconomyEnabled || depth < terrain.band4MaxDepth) {
    return enforceResourceDepthGates(
      depth,
      resolveLegacyTerrainType(depth, roll, terrain),
      terrain,
    );
  }
  const band = terrain.depthEconomyBands?.find(entry => (
    depth >= entry.minDepth
    && (entry.maxDepth === null || depth <= entry.maxDepth)
  ));
  const tileType = band
    ? band.thresholds.find(entry => roll < entry.chance)?.type || TILE_TYPES.DIRT
    : resolveLegacyTerrainType(depth, roll, terrain);
  return enforceResourceDepthGates(depth, tileType, terrain);
}
