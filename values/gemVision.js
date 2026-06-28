// ==================== GEM VISION CONFIG ====================
export const GEM_VISION_CONFIG = Object.freeze({
  // Base values (Phaser zoom: 1.0 = normal, 0.5 = 2x area visible, lower = more zoomed out)
  baseRange: 0.80, // Starting zoom on unlock (mildly zoomed out, shows ~25% more area)
  baseDrain: 5,
  minDrain: 1,

  // Upgrade multipliers
  levelRangeBonus: 0.05, // per gemVisionRange level (each level zooms out further)
  deepSightBonus: 0.20,  // extra zoom when deepSight is unlocked

  // Drain reduction per level
  visionLevelDrainReduction: 3, // GP reduction per level
  efficiencyLevelDrainReduction: 2, // GP reduction per level
  deepSightLevelDrainReduction: 2, // GP reduction if unlocked
});