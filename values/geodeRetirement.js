import { TILE_TYPES } from "./tileTypes.js";

export const GEODE_RETIREMENT_CONFIG = Object.freeze({
  active: true,
  replacementTileType: TILE_TYPES.STONE,
  legacyTileTypes: Object.freeze([
    TILE_TYPES.GEODE_INTERIOR,
    TILE_TYPES.GEODE_WALL,
  ]),
  saveMigrationId: "retire-geodes-v1",
});

const LEGACY_GEODE_TYPES = new Set(GEODE_RETIREMENT_CONFIG.legacyTileTypes);

export function isLegacyGeodeTileType(tileType) {
  return LEGACY_GEODE_TYPES.has(tileType);
}

export function migrateLegacyGeodeTileType(tileType) {
  return isLegacyGeodeTileType(tileType)
    ? GEODE_RETIREMENT_CONFIG.replacementTileType
    : tileType;
}

export function retireLegacyGeodeTiles(worldModel) {
  let migratedTiles = 0;
  for (let ty = 0; ty < worldModel.depthTiles; ty += 1) {
    for (let tx = 0; tx < worldModel.widthTiles; tx += 1) {
      const index = worldModel.index(tx, ty);
      if (!isLegacyGeodeTileType(worldModel._types[index])) continue;
      const replacement = GEODE_RETIREMENT_CONFIG.replacementTileType;
      worldModel._types[index] = replacement;
      worldModel._hp[index] = worldModel.getTileMaxHp(tx, ty, replacement);
      migratedTiles += 1;
    }
  }
  return Object.freeze({
    migrationId: GEODE_RETIREMENT_CONFIG.saveMigrationId,
    migratedTiles,
  });
}
