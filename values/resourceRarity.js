// ==================== RESOURCE RARITY CONFIG ====================
export const RESOURCE_RARITY_CONFIG = Object.freeze({
  // Rarity rates at surface (depth 0)
  // IMPORTANT: These rates must sum to <= 1.0 for proper probability distribution
  surfaceRarity: {
    dirt: 0.5500,          // 55.00%
    stone: 0.200,          // 20.00%
    copper: 0.0600,        // 6.00%
    darkDirtNormal: 0.045, // 4.50% (FIXED: was 0.45 = 45%!)
    darkDirtStrong: 0.021, // 2.10% (FIXED: was 0.21 = 21%!)
    steel: 0.009,          // 0.90% (FIXED: was 0.09 = 9%!)
    iron: 0.005,           // 0.50% (FIXED: was 0.05 = 5%!)
    bronze: 0.003,         // 0.30% (FIXED: was 0.03 = 3%!)
    silver: 0.002,         // 0.20%
    gold: 0.0005,          // 0.05%
  },
  
  // Rarity rates at max depth (2000m)
  // These also need to sum to <= 1.0
  deepRarity: {
    dirt: 0.00, // Dirt fades out significantly below 1000m
    stone: 0.15,
    copper: 0.08,
    darkDirtNormal: 0.055, // 5.50% (FIXED: was 0.55 = 55%!)
    darkDirtStrong: 0.085, // 8.50% (FIXED: was 0.85 = 85%!)
    steel: 0.09,           // 9.00% (FIXED: was 0.9 = 90%!)
    iron: 0.03,            // 3.00% (FIXED: was 0.3 = 30%!)
    bronze: 0.02,          // 2.00% (FIXED: was 0.2 = 20%!)
    silver: 0.03,          // 3.00% (FIXED: was 0.08 = 8%!)
    gold: 0.01,            // 1.00%
  },
});

// Helper function to get rarity at a specific depth
export function getRarityAtDepth(depthTiles, tileType) {
  const config = RESOURCE_RARITY_CONFIG;
  const maxDepth = 1940; // 2000 - 60 (topAirRows)
  
  const surfaceRate = config.surfaceRarity[tileType] || 0;
  const deepRate = config.deepRarity[tileType] || 0;
  
  // Check depth threshold for resource introduction
  const thresholds = {
    darkDirtNormal: 30,
    darkDirtStrong: 100,
    steel: 50,
    iron: 150,
    bronze: 300,
    silver: 700,    // Starts at 700m
    gold: 800,     // Gold starts at 800m
  };
  
  const threshold = thresholds[tileType];
  if (threshold && depthTiles < threshold) {
    return 0;
  }
  
  // Handle dirt fade-out below 800m
  if (tileType === 'dirt') {
    const fadeOutStart = 400; // Dirt starts fading out at 800m
    const fadeOutEnd = 8000; // Dirt fully fades out by 1000m
    
    if (depthTiles < fadeOutStart) {
      // Before fade-out, interpolate from surface rate
      const depthRatio = Math.min(1, Math.max(0, depthTiles / fadeOutStart));
      return surfaceRate + (deepRate - surfaceRate) * depthRatio;
    } else if (depthTiles < fadeOutEnd) {
      // During fade-out, gradually reduce to deep rate
      const fadeRatio = (depthTiles - fadeOutStart) / (fadeOutEnd - fadeOutStart);
      const rateAtFadeOut = surfaceRate + (deepRate - surfaceRate) * (fadeOutStart / maxDepth);
      return rateAtFadeOut + (deepRate - rateAtFadeOut) * fadeRatio;
    } else {
      // After fade-out, use deep rate (very low)
      return deepRate;
    }
  }
  
  // For other resources, interpolate between surface and deep rates
  const depthRatio = Math.min(1, Math.max(0, depthTiles / maxDepth));
  return surfaceRate + (deepRate - surfaceRate) * depthRatio;
}