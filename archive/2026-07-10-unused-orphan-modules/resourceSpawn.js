import { getRarityAtDepth } from "./resourceRarity.js";

// ==================== RESOURCE SPAWN CONFIG ====================
export const RESOURCE_SPAWN_CONFIG = Object.freeze({
  // Depth thresholds for resource introduction
  depthThresholds: {
    darkDirtNormal: 100,
    darkDirtStrong: 800,
    steel: 150,
    iron: 300,
    bronze: 500,  // FIX: Moved to 500m for smoother progression (was 600m)
    silver: 700,
    gold: 800,
  },
  // Silver tile special configuration
  silver: {
    minimumSpawnDepth: 700,
    bonusSpawnDepth: 1000,
    caveBonusMultiplier: 10,
    minimumGuaranteedCount: 5,
    guaranteedSpawnZone: { min: 1000, max: 2000 },
  },
  
  // Special tile spawn rates
  specialTileRates: {
    teleportTile: 0.0002,
    gambleTile: 0.0001,
  },
  
  // Steel balance adjustments
  steel: {
    spawnRateMultiplier: 0.6,  // 40% less common (BALANCE OVERHAUL)
    rewardMultiplier: 0.7,     // 30% less reward (BALANCE OVERHAUL)
  },
  
  // Gold tile special configuration
  gold: {
    minimumSpawnDepth: 800,
    bonusSpawnDepth: 1200,
    caveBonusMultiplier: 15,
    minimumGuaranteedCount: 3,
    guaranteedSpawnZone: { min: 1200, max: 2000 },
  },
  
  // Cave bonus configuration
  caveBonus: {
    earlyGameZone: { min: 200, max: 300 },
    earlyGameMultiplier: 5,
    earlyGameResourceMultiplier: 8,
    lateGameMultiplier: 8.5,
    pocketDistanceThreshold: 3,
  },
});

// Helper function to get gold spawn rate at specific depth and location
export function getGoldSpawnRate(depthTiles, isNearCave) {
  const goldConfig = RESOURCE_SPAWN_CONFIG.gold;
  
  // Gold doesn't spawn before minimum depth
  if (depthTiles < goldConfig.minimumSpawnDepth) {
    return 0;
  }
  
  let baseRate = getRarityAtDepth(depthTiles, 'gold');
  
  // Bonus spawn rate in bonus zone (1800-2000m)
  if (depthTiles >= goldConfig.bonusSpawnDepth) {
    baseRate *= 3;
  }
  
  // Cave bonus (5x in caves at bottom 200m)
  if (isNearCave && depthTiles >= goldConfig.bonusSpawnDepth) {
    baseRate *= goldConfig.caveBonusMultiplier;
  }
  
  return baseRate;
}

// Helper function to get silver spawn rate at specific depth and location
export function getSilverSpawnRate(depthTiles, isNearCave) {
  const silverConfig = RESOURCE_SPAWN_CONFIG.silver;
  
  if (depthTiles < silverConfig.minimumSpawnDepth) {
    return 0;
  }
  
  let baseRate = getRarityAtDepth(depthTiles, 'silver');
  
  if (depthTiles >= silverConfig.bonusSpawnDepth) {
    baseRate *= 2.5;
  }
  
  if (isNearCave && depthTiles >= silverConfig.bonusSpawnDepth) {
    baseRate *= silverConfig.caveBonusMultiplier;
  }
  
  return baseRate;
}

// Helper function to get cave bonus multiplier
export function getCaveBonusMultiplier(depthTiles) {
  const caveConfig = RESOURCE_SPAWN_CONFIG.caveBonus;
  
  // Early game zone (tiles 200-300)
  if (depthTiles >= caveConfig.earlyGameZone.min && depthTiles <= caveConfig.earlyGameZone.max) {
    return caveConfig.earlyGameResourceMultiplier;
  }
  
  // Late game
  return caveConfig.lateGameMultiplier;
}

// Resource depth thresholds for tier calculation
const RESOURCE_TIERS = Object.freeze({
  dirt: { threshold: 0, tier: 0 },
  stone: { threshold: 0, tier: 0 },
  copper: { threshold: 0, tier: 1 },
  darkDirtNormal: { threshold: 100, tier: 1 },
  darkDirtStrong: { threshold: 200, tier: 2 },
  steel: { threshold: 150, tier: 2 },
  iron: { threshold: 300, tier: 3 },
  bronze: { threshold: 600, tier: 4 },
  silver: { threshold: 700, tier: 5 },
  gold: { threshold: 800, tier: 6 },
});

/**
 * Get cave resource rates with tier-based boosting
 * Caves spawn resources up to 2 tiers deeper than current depth
 * @param {number} depthTiles - Current depth in tiles
 * @returns {Object} Object with resource rates for cave areas
 */
export function getCaveResourceRates(depthTiles) {
  // Get current tier based on depth
  let currentTier = 0;
  for (const [resource, info] of Object.entries(RESOURCE_TIERS)) {
    if (depthTiles >= info.threshold) {
      currentTier = Math.max(currentTier, info.tier);
    }
  }
  
  // Resources allowed: current tier + up to 2 deeper tiers
  const maxAllowedTier = currentTier + 2;
  
  // Calculate rates with tier boosting
  const rates = {};
  
  // Base multiplier for total resource density (2x in caves)
  const baseCaveMultiplier = 2.0;
  
  for (const [resource, info] of Object.entries(RESOURCE_TIERS)) {
    // Check if resource is available at this depth
    if (depthTiles < info.threshold) {
      // Resource is deeper than current depth - check if within 2 tier limit
      if (info.tier > maxAllowedTier) {
        rates[resource] = 0; // Too deep, not allowed
        continue;
      }
      
      // Resource is within 2 tiers - boost it heavily
      // Calculate how many tiers deeper this is
      const tierDifference = info.tier - currentTier;
      
      // Boost factor: deeper tiers get higher boost
      // Tier difference 0 (current): 2x (base multiplier)
      // Tier difference 1: 4x boost
      // Tier difference 2: 6x boost
      const tierBoost = tierDifference * 2;
      const resourceRate = getRarityAtDepth(depthTiles, resource) * (baseCaveMultiplier * tierBoost);
      rates[resource] = resourceRate;
    } else {
      // Resource is at current depth or shallower - normal 2x cave multiplier
      const resourceRate = getRarityAtDepth(depthTiles, resource) * baseCaveMultiplier;
      rates[resource] = resourceRate;
    }
  }
  
  return rates;
}