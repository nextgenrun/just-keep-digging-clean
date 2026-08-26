import { hash01 } from "../../values/deterministicMath.js";
import {
  LEVEL_ONE_RESOURCE_TILE_TYPE_VALUES,
  RESOURCE_TILE_TYPE_VALUES,
} from "../../values/resourceTypes.js";
import { STAR_IDENTITY_LIBRARY_CONFIG } from "../../values/starIdentityLibrary.js";
import { resolveStarIdentityIndex } from "../../values/starIdentityLibraryMath.js";
import { STAR_RARITY_PROGRESSION_CONFIG } from "../../values/starRarityProgression.js";
import { resolveStarRarityIndex } from "../../values/starRarityProgressionMath.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { WORLD_GEN_CONFIG } from "../../values/worldGen.js";
import { resolveBaseTerrainResourceType } from "./baseTerrainResourceResolver.js";

const LEVEL_ONE_RESOURCE_TYPES = new Set(LEVEL_ONE_RESOURCE_TILE_TYPE_VALUES);
const RESOURCE_TYPES = new Set(RESOURCE_TILE_TYPE_VALUES);

/**
 * Tiled owns solid/air geometry and special landmarks, while live values own
 * the ordinary material placed in authored solid cells.
 */
export function resolveAuthoredMaterialType(tileType, tileX, tileY, modelConfig) {
  const isMaterialCell = LEVEL_ONE_RESOURCE_TYPES.has(tileType)
    || tileType === TILE_TYPES.SKY_TILE;
  if (!isMaterialCell) return tileType;

  const depth = Math.max(0, tileY - modelConfig.topAirRows);
  const roll = hash01(
    tileX,
    tileY,
    modelConfig.seed,
    WORLD_GEN_CONFIG.terrain.authoredResourceHashSalt,
  );
  return resolveBaseTerrainResourceType(
    depth,
    roll,
    WORLD_GEN_CONFIG.terrain,
    modelConfig.resourceEconomyEnabled !== false,
  );
}

/** Apply Stars only after every geometry and material authority has settled. */
export function applyConfiguredStarSpawns(
  worldModel,
  progression = STAR_RARITY_PROGRESSION_CONFIG,
) {
  const probability = Math.max(
    0,
    Math.min(1, Number(worldModel.config.skyTileProbability) || 0),
  );
  if (probability <= 0) return 0;

  const protectedSeams = new Set(
    (worldModel.caveResourceSeams || []).map(seam => `${seam.tx},${seam.ty}`),
  );
  let applied = 0;
  for (let ty = worldModel.topAirRows + 1; ty < worldModel.depthTiles - 1; ty += 1) {
    for (let tx = 0; tx < worldModel.widthTiles; tx += 1) {
      if (protectedSeams.has(`${tx},${ty}`)) continue;
      const type = worldModel.getTileType(tx, ty);
      if (!RESOURCE_TYPES.has(type)) continue;
      const occurrenceRoll = hash01(
        tx,
        ty,
        worldModel.config.seed,
        progression.spawn.occurrenceHashSalt,
      );
      if (occurrenceRoll >= probability) continue;

      const index = worldModel.index(tx, ty);
      const depth = ty - worldModel.topAirRows;
      const rarityRoll = hash01(
        tx,
        ty,
        worldModel.config.seed,
        progression.spawn.rarityHashSalt,
      );
      const rarityTier = resolveStarRarityIndex(depth, rarityRoll);
      const identityRoll = hash01(
        tx,
        ty,
        worldModel.config.seed,
        STAR_IDENTITY_LIBRARY_CONFIG.identityHashSalt,
      );

      worldModel.skyTileOriginalType[index] = type;
      worldModel.skyTileRarity[index] = rarityTier;
      worldModel.skyTileIdentity[index] = resolveStarIdentityIndex(rarityTier, identityRoll);
      worldModel.setTile(
        tx,
        ty,
        TILE_TYPES.SKY_TILE,
        worldModel.getTileMaxHp(tx, ty, TILE_TYPES.SKY_TILE),
      );
      applied += 1;
    }
  }
  return applied;
}
