import { STAR_IDENTITY_LIBRARY_CONFIG } from "./starIdentityLibrary.js";

export function getStarIdentityRarityAssets(
  rarity,
  config = STAR_IDENTITY_LIBRARY_CONFIG,
) {
  const maximum = Math.max(0, config.atlases.length - 1);
  const index = Math.max(0, Math.min(maximum, Math.floor(Number(rarity) || 0)));
  return Object.freeze([
    config.atlases[index],
    config.lightAtlases[index],
  ].filter(Boolean));
}
