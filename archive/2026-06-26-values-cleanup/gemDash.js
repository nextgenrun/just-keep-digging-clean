// ==================== GEM DASH CONFIG ====================
export const GEM_DASH_CONFIG = Object.freeze({
  // Base values
  maxTiles: 10, // base blink range in tiles; upgrades add extra tiles
  cooldownMs: 8000, // 8s base cooldown (reduced by upgrades)
  powerCost: 25, // GP consumed per dash
  
  // Upgrade multipliers
  distanceBonus: 2, // tiles per level
  cooldownReduction: 1000, // ms reduction per level
  minCooldown: 2000, // minimum cooldown in ms
});