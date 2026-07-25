// Campfire upgrade tiers and temporary blessing values.
export const CAMPFIRE_TIERS = Object.freeze([
  Object.freeze({ level: 1, label: "Tier I", cost: 0, durationMs: 60000, miningSpeedBonus: 0.05, xpBonus: 0.10, critBonus: 0.02, desc: "Basic warmth (60s)" }),
  Object.freeze({ level: 2, label: "Tier II", cost: 5, durationMs: 75000, miningSpeedBonus: 0.08, xpBonus: 0.15, critBonus: 0.03, desc: "Cozy fire (75s)" }),
  Object.freeze({ level: 3, label: "Tier III", cost: 10, durationMs: 90000, miningSpeedBonus: 0.10, xpBonus: 0.20, critBonus: 0.05, desc: "Warm glow (90s)" }),
  Object.freeze({ level: 4, label: "Tier IV", cost: 20, durationMs: 120000, miningSpeedBonus: 0.12, xpBonus: 0.25, critBonus: 0.06, desc: "Steady flame (120s)" }),
  Object.freeze({ level: 5, label: "Tier V", cost: 50, durationMs: 150000, miningSpeedBonus: 0.15, xpBonus: 0.30, critBonus: 0.08, desc: "Bright blaze (150s)" }),
  Object.freeze({ level: 6, label: "Tier VI", cost: 75, durationMs: 180000, miningSpeedBonus: 0.18, xpBonus: 0.40, critBonus: 0.10, desc: "Roaring fire (180s)" }),
  Object.freeze({ level: 7, label: "Tier VII", cost: 100, durationMs: 210000, miningSpeedBonus: 0.20, xpBonus: 0.50, critBonus: 0.12, desc: "Intense heat (210s)" }),
  Object.freeze({ level: 8, label: "Tier VIII", cost: 150, durationMs: 240000, miningSpeedBonus: 0.25, xpBonus: 0.60, critBonus: 0.15, desc: "Inferno (240s)" }),
  Object.freeze({ level: 9, label: "Tier IX", cost: 200, durationMs: 270000, miningSpeedBonus: 0.30, xpBonus: 0.75, critBonus: 0.18, desc: "Volcanic (270s)" }),
  Object.freeze({ level: 10, label: "Tier X", cost: 300, durationMs: 360000, miningSpeedBonus: 0.35, xpBonus: 0.90, critBonus: 0.20, desc: "Eternal flame (360s)" }),
]);

export const CAMPFIRE_CONFIG = Object.freeze({
  inputActions: Object.freeze({
    interact: "interact",
    previousBlessing: "aimUp",
    nextBlessing: "aimDown",
  }),
  spriteKeys: Object.freeze([
    "campfire-tier-01", "campfire-tier-02", "campfire-tier-03", "campfire-tier-04", "campfire-tier-05",
    "campfire-tier-06", "campfire-tier-07", "campfire-tier-08", "campfire-tier-09", "campfire-tier-10",
  ]),
  groundOverlapPx: 1,
  heightByLevelTiles: Object.freeze([
    1.06, 1.10, 1.14, 1.18, 1.22,
    1.26, 1.30, 1.34, 1.38, 1.42,
  ]),
});
