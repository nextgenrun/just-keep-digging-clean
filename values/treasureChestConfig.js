// ==================== AUTHORED TREASURE CHESTS ====================
// Existing authored CHEST cells are one-time interactables. Their loot table
// is intentionally narrow: money, with an occasional constellation star.

export const TREASURE_CHEST_CONFIG = Object.freeze({
  interaction: Object.freeze({
    prompt: "Open Treasure Chest",
    openedPrompt: "Chest Opened",
  }),
  money: Object.freeze({
    base: 45,
    perDepthMeter: 0.18,
    maxDepthBonus: 1800,
    variance: 0.3,
  }),
  star: Object.freeze({
    chance: 0.22,
    rarity: 0,
  }),
  critBuff: Object.freeze({
    durationMs: 20000,
    criticalDamageMultiplierBonus: 2,
    name: "TREASURE FURY",
    color: "#ff5d73",
  }),
  feedback: Object.freeze({
    moneyColor: "#ffd35a",
    starColor: "#8fe8ff",
    moneyUnit: "M",
    starAwardLabel: "+1 STAR",
    activeLabel: "ACTIVE",
    separator: "  •  ",
    statusDurationMs: 3600,
    floatingDurationMs: 2400,
    floatingFontSizePx: 22,
  }),
  deterministicSalt: Object.freeze({
    money: 9029,
    star: 15131,
  }),
});
