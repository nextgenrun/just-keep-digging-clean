// ==================== MINING CONFIG ====================
export const MINING_CONFIG = Object.freeze({
  // Mining
  mineCooldownMs: 750,
  maxTileHp: 5, // Reduced from 3 for faster early game
  
  // Base damage
  baseDamage: 16,     // base dig damage for soft tiles (dirt, dark dirt)
  baseDamageHard: 8, // base dig damage for hard tiles (stone, copper)

  blockedUi: Object.freeze({
    bedrockMessage: "You cannot break this",
    notificationKey: "mining-cannot-dig-bedrock",
    durationMs: 1600,
    color: "#f6d36c",
    zeroDamageText: "0 damage",
    zeroDamageColor: "#9ed8ff",
    zeroDamageDurationMs: 900,
    zeroDamageFontSize: 20,
  }),
});
