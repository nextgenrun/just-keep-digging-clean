import { STAR_IDENTITY_LIBRARY_CONFIG } from "./starIdentityLibrary.js";

function clampIndex(value, maximum) {
  return Math.max(0, Math.min(maximum, Math.floor(Number(value) || 0)));
}

export function getStarIdentity(
  identityIndex,
  config = STAR_IDENTITY_LIBRARY_CONFIG,
) {
  const index = clampIndex(identityIndex, config.identities.length - 1);
  return config.identities[index];
}

export function getStarIdentitiesForRarity(
  rarityIndex,
  config = STAR_IDENTITY_LIBRARY_CONFIG,
) {
  const rarity = clampIndex(rarityIndex, config.rarityIdentityCounts.length - 1);
  return Object.freeze(
    config.identities.filter(identity => identity.rarityIndex === rarity),
  );
}

export function resolveStarIdentityIndex(
  rarityIndex,
  roll,
  config = STAR_IDENTITY_LIBRARY_CONFIG,
) {
  const identities = getStarIdentitiesForRarity(rarityIndex, config);
  if (identities.length === 0) return 0;
  const safeRoll = Math.max(0, Math.min(0.999999999, Number(roll) || 0));
  return identities[Math.floor(safeRoll * identities.length)].index;
}

export function validateStarIdentityLibraryConfig(
  config = STAR_IDENTITY_LIBRARY_CONFIG,
) {
  const expected = config.health;
  const ids = config.identities.map(identity => identity.id);
  const colours = config.identities.map(identity => identity.primary.toLowerCase());
  const lightStyles = config.identities.map(identity => identity.light.style);
  const atlasKeys = config.atlases.map(entry => entry.key);
  const lightAtlasKeys = config.lightAtlases.map(entry => entry.key);
  const counts = config.rarityIdentityCounts.map((unused, rarityIndex) => (
    config.identities.filter(identity => identity.rarityIndex === rarityIndex).length
  ));
  const framesValid = config.identities.every(identity => {
    const atlasEntry = config.atlases[identity.rarityIndex];
    return atlasEntry
      && identity.atlasKey === atlasEntry.key
      && identity.frame >= 0
      && identity.frame < atlasEntry.frameCount
      && identity.frameName === `${atlasEntry.framePrefix}${identity.frame}`;
  });
  const lightFramesValid = config.identities.every(identity => {
    const atlasEntry = config.lightAtlases[identity.rarityIndex];
    return atlasEntry
      && identity.lightAtlasKey === atlasEntry.key
      && identity.frame >= 0
      && identity.frame < atlasEntry.frameCount
      && identity.lightFrameName === `${atlasEntry.framePrefix}${identity.frame}`;
  });
  const lightDecodedBytes = config.lightAtlases.reduce(
    (total, entry) => total + entry.decodedBytes, 0,
  );
  const uniqueIds = new Set(ids).size;
  const distinctColours = new Set(colours).size;
  const distinctLightStyles = new Set(lightStyles).size;
  const countsValid = counts.every(
    (count, index) => count === expected.expectedRarityIdentityCounts[index],
  );
  const storageCapacityValid = config.identities.length
    <= expected.maximumStoredIdentityCount;
  const ready = config.identities.length === expected.expectedIdentityCount
    && config.atlases.length === expected.expectedAtlasCount
    && config.lightAtlases.length === expected.expectedLightAtlasCount
    && uniqueIds === config.identities.length
    && new Set(atlasKeys).size === atlasKeys.length
    && new Set(lightAtlasKeys).size === lightAtlasKeys.length
    && atlasKeys.every(key => !lightAtlasKeys.includes(key))
    && distinctColours >= expected.minimumDistinctPrimaryColours
    && distinctLightStyles >= expected.minimumDistinctLightStyles
    && countsValid
    && framesValid
    && lightFramesValid
    && lightDecodedBytes <= expected.maximumLightDecodedBytes
    && storageCapacityValid;
  return Object.freeze({
    ready,
    identityCount: config.identities.length,
    atlasCount: config.atlases.length,
    lightAtlasCount: config.lightAtlases.length,
    uniqueIds,
    distinctColours,
    distinctLightStyles,
    rarityIdentityCounts: Object.freeze(counts),
    countsValid,
    framesValid,
    lightFramesValid,
    lightDecodedBytes,
    lightDecodedBudgetValid: lightDecodedBytes <= expected.maximumLightDecodedBytes,
    storageCapacityValid,
  });
}
