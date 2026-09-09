// ==================== MINING CONFIG ====================
export const MINING_CONFIG = Object.freeze({
  // Mining
  mineCooldownMs: 1500, // Level-1 rate is 50% of the previous 750 ms baseline
  maxTileHp: 5, // Reduced from 3 for faster early game
  
  // Base damage
  baseDamage: 16,     // base dig damage for soft tiles (dirt, dark dirt)
  baseDamageHard: 8, // base dig damage for hard tiles (stone, copper)
});
