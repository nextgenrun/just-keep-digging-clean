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
import { SPECIAL_BLOCKS_CONFIG } from "../../values/specialBlocks.js";
import { WORLD_GEN_CONFIG } from "../../values/worldGen.js";
import { resolveBaseTerrainResourceType } from "./baseTerrainResourceResolver.js";

const LEVEL_ONE_RESOURCE_TYPES = new Set(LEVEL_ONE_RESOURCE_TILE_TYPE_VALUES);
const RESOURCE_TYPES = new Set(RESOURCE_TILE_TYPE_VALUES);

function repairMissingStarIdentityCoverage(
  worldModel,
  identityCounts,
  donorsByRarity,
) {
  const donorCursors = new Uint16Array(donorsByRarity.length);
  let repaired = 0;
  for (const identity of STAR_IDENTITY_LIBRARY_CONFIG.identities) {
    if (identityCounts[identity.index] > 0) continue;
    const donors = donorsByRarity[identity.rarityIndex] || [];
    let donor = null;
    while (donorCursors[identity.rarityIndex] < donors.length) {
      const candidate = donors[donorCursors[identity.rarityIndex]];
      donorCursors[identity.rarityIndex] += 1;
      if (identityCounts[candidate.identityIndex] > 1) {
        donor = candidate;
        break;
      }
    }
    if (!donor) continue;

    identityCounts[donor.identityIndex] -= 1;
    identityCounts[identity.index] = 1;
    worldModel.skyTileIdentity[donor.worldIndex] = identity.index;
    repaired += 1;
  }
  return repaired;
}

/**
 * Tiled owns solid/air geometry and special landmarks, while live values own
 * the ordinary material placed in authored solid cells.
 */
export function resolveAuthoredMaterialType(tileType, tileX, tileY, modelConfig) {
  const isMaterialCell = LEVEL_ONE_RESOURCE_TYPES.has(tileType)
    || tileType === TILE_TYPES.SKY_TILE
    || tileType === TILE_TYPES.RETIRED_RANDOM_BONUS_BLOCK;
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

/**
 * Adds the general Ability Block after authored geometry settles. It replaces
 * only ordinary resources, remains deterministic for saves, and is confined
 * to the early world rather than being placed as a tutorial encounter.
 */
export function applyConfiguredAbilityBlockSpawns(
  worldModel,
  config = SPECIAL_BLOCKS_CONFIG,
) {
  const probability = Math.max(
    0,
    Math.min(1, Number(config.spawnRates?.abilityBlock) || 0),
  );
  const rule = config.worldSpawns?.abilityBlock || {};
  if (probability <= 0) return 0;

  const minDepth = Math.max(1, Math.floor(Number(rule.minimumDepthTiles) || 1));
  const maxDepth = Math.min(
    worldModel.depthTiles - worldModel.topAirRows - 2,
    Math.max(minDepth, Math.floor(Number(rule.maximumDepthTiles) || minDepth)),
  );
  const protectedSeams = new Set(
    (worldModel.caveResourceSeams || []).map(seam => `${seam.tx},${seam.ty}`),
  );
  let applied = 0;
  for (let depth = minDepth; depth <= maxDepth; depth += 1) {
    const ty = worldModel.topAirRows + depth;
    for (let tx = 0; tx < worldModel.widthTiles; tx += 1) {
      if (protectedSeams.has(`${tx},${ty}`)) continue;
      if (!RESOURCE_TYPES.has(worldModel.getTileType(tx, ty))) continue;
      const roll = hash01(
        tx,
        ty,
        worldModel.config.seed,
        rule.occurrenceHashSalt,
      );
      if (roll >= probability) continue;
      worldModel.setTile(
        tx,
        ty,
        TILE_TYPES.ABILITY_BLOCK,
        worldModel.getTileMaxHp(tx, ty, TILE_TYPES.ABILITY_BLOCK),
      );
      applied += 1;
    }
  }
  return applied;
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
  const identityCounts = new Uint32Array(
    STAR_IDENTITY_LIBRARY_CONFIG.identities.length,
  );
  const donorsByRarity = STAR_IDENTITY_LIBRARY_CONFIG.rarityIdentityCounts
    .map(() => []);
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
      const identityIndex = resolveStarIdentityIndex(rarityTier, identityRoll);

      worldModel.skyTileOriginalType[index] = type;
      worldModel.skyTileRarity[index] = rarityTier;
      worldModel.skyTileIdentity[index] = identityIndex;
      identityCounts[identityIndex] += 1;
      const donors = donorsByRarity[rarityTier];
      if (
        identityCounts[identityIndex] > 1
        && donors.length
          < STAR_IDENTITY_LIBRARY_CONFIG.rarityIdentityCounts[rarityTier]
      ) {
        donors.push({ worldIndex: index, identityIndex });
      }
      worldModel.setTile(
        tx,
        ty,
        TILE_TYPES.SKY_TILE,
        worldModel.getTileMaxHp(tx, ty, TILE_TYPES.SKY_TILE),
      );
      applied += 1;
    }
  }
  repairMissingStarIdentityCoverage(worldModel, identityCounts, donorsByRarity);
  return applied;
}
