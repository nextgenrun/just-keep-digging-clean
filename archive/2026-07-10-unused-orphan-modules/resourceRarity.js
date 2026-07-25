// ==================== RESOURCE RARITY CONFIG ====================
export const RESOURCE_RARITY_CONFIG = Object.freeze({
  // Rarity rates at surface (depth 0)
  // IMPORTANT: These rates must sum to <= 1.0 for proper probability distribution
  surfaceRarity: {
    dirt: 0.5500,
    stone: 0.200,
    copper: 0.0600,
    darkDirtNormal: 0.045,
    darkDirtStrong: 0.021,
    steel: 0.009,
    iron: 0.005,
    bronze: 0.003,
    silver: 0.002,
    gold: 0.0005,
  },
  deepRarity: {
    dirt: 0.00,
    stone: 0.15,
    copper: 0.08,
    darkDirtNormal: 0.055,
    darkDirtStrong: 0.085,
    steel: 0.09,
    iron: 0.03,
    bronze: 0.02,
    silver: 0.15,
    gold: 0.05,
  },
});

export function getRarityAtDepth(depthTiles, tileType) {
  const config = RESOURCE_RARITY_CONFIG;
  const maxDepth = 1940;
  const surfaceRate = config.surfaceRarity[tileType] || 0;
  const deepRate = config.deepRarity[tileType] || 0;
  const thresholds = {
    darkDirtNormal: 30,
    darkDirtStrong: 100,
    steel: 50,
    iron: 150,
    bronze: 350,
    silver: 550,
    gold: 800,
  };
  const threshold = thresholds[tileType];
  if (threshold && depthTiles < threshold) return 0;
  if (tileType === 'dirt') {
    const fadeOutStart = 400;
    const fadeOutEnd = 8000;
    if (depthTiles < fadeOutStart) {
      const depthRatio = Math.min(1, Math.max(0, depthTiles / fadeOutStart));
      return surfaceRate + (deepRate - surfaceRate) * depthRatio;
    } else if (depthTiles < fadeOutEnd) {
      const fadeRatio = (depthTiles - fadeOutStart) / (fadeOutEnd - fadeOutStart);
      const rateAtFadeOut = surfaceRate + (deepRate - surfaceRate) * (fadeOutStart / maxDepth);
      return rateAtFadeOut + (deepRate - rateAtFadeOut) * fadeRatio;
    }
    return deepRate;
  }
  const depthRatio = Math.min(1, Math.max(0, depthTiles / maxDepth));
  return surfaceRate + (deepRate - surfaceRate) * depthRatio;
}
