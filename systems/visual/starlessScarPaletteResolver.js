import {
  resolveLevelOneBiomeFieldAtTile,
} from "../../values/levelOneBiomeField.js";
import {
  resolveLevelOneBiomeVisualFamily,
} from "../../values/levelOneBiomeVisualFamilies.js";
import {
  STARLESS_SCAR_BIOME_PALETTES,
  getStarlessScarBiomePalette,
  resolveStarlessScarBiomeLibraryEnabled,
  resolveStarlessScarRegionPalette,
} from "../../values/starlessScarBiomePalettes.js";
import { WORLD_VISUAL_UNDERGROUND_DETAILS } from
  "../../values/worldVisualUndergroundDetails.js";

function resolveDepthRegionId(tileY) {
  return WORLD_VISUAL_UNDERGROUND_DETAILS.regions.find(region => (
    tileY >= region.topTile && tileY < region.bottomTileExclusive
  ))?.id || "surface-entry";
}

function resolveRetainedFamilyPalette(profileOrId) {
  const family = resolveLevelOneBiomeVisualFamily(profileOrId);
  return getStarlessScarBiomePalette(family?.retainedPartitionId);
}

export function resolveStarlessScarPaletteAtTile(
  tileX,
  tileY,
  {
    site = null,
    starProfile = null,
    search = globalThis.location?.search || "",
    config = STARLESS_SCAR_BIOME_PALETTES,
  } = {},
) {
  if (!resolveStarlessScarBiomeLibraryEnabled(config, search)) return null;
  const biomeProfile = resolveLevelOneBiomeFieldAtTile(tileX, tileY);
  const exactPalette = resolveRetainedFamilyPalette(biomeProfile)
    || resolveRetainedFamilyPalette(site?.biomeId);
  if (exactPalette) return exactPalette;
  const regionId = biomeProfile?.sourceRegionId
    || site?.sourceRegionId
    || resolveDepthRegionId(tileY);
  const stableSeed = Number(starProfile?.seed)
    || Number(site?.identityIndex)
    || (Math.trunc(tileY / 96) * 131 + Math.trunc(tileX / 48) * 17);
  return resolveStarlessScarRegionPalette(regionId, stableSeed, config);
}

export function resolveStarlessScarPropFrame(
  tileX,
  tileY,
  scarSeed = 0,
  frameCount = STARLESS_SCAR_BIOME_PALETTES.propAtlas.frameCount,
) {
  const hash = Math.imul(tileX + 101, 73856093)
    ^ Math.imul(tileY + 211, 19349663)
    ^ Math.imul(Math.trunc(Number(scarSeed) || 0) + 307, 83492791);
  return Math.abs(hash | 0) % Math.max(1, frameCount);
}

export function shouldPlaceStarlessScarProp(tileX, tileY, scarSeed = 0) {
  const hash = Math.imul(tileX + 401, 1597334677)
    ^ Math.imul(tileY + 503, 3812015801)
    ^ Math.imul(Math.trunc(Number(scarSeed) || 0) + 601, 95828223);
  return (Math.abs(hash | 0) % 47) === 0;
}
