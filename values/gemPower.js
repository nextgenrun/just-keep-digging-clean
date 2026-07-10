  // ==================== GEM POWER CONFIG ====================
export const GEM_POWER_CONFIG = Object.freeze({
  // Base values
  baseMax: 100,
  baseDrain: 15,
    baseRegen: 1,
  
  // Flight
  flightStartCost: 10, // One-time GP spend when Shift starts flight, preventing Shift spam
  flightHeightMultiplier: 0.03, // tiles per GP (0 GP = 0 tiles, 100 GP = 3 tiles)
  maxFlightHeightTiles: 20, // Hard cap on flight height — prevents unbounded scaling with tank upgrades + level
  lowGpWarningThreshold: 20, // GP level that triggers "Low Gem Power" HUD flash
  lowGpFlashMs: 800, // Duration of low-GP warning flash messages
  
  // Upgrade multipliers
  tankMultiplier: 40, // GP per level (increased from 20 to 40)
  regenMultiplier: 1.5, // GP/s per level
  drainReductionMultiplier: 1, // GP/s reduction per level
  
  // Leveling multipliers
  gpPerLevel: 10, // GP gained per level (up to level 99)
  gpPerLevelHardcap: 2, // GP gained per level after level 99 (100-999)
});
