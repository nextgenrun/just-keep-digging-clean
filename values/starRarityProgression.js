// ==================== STAR RARITY + SIGN XP ====================
// Weighted Star Block encounters, reward identity, and Sign XP curves.
const palette = (
  primary,
  secondary,
  accent,
  highlight,
  shadow,
  text,
  glowColor,
) => Object.freeze({
  primary,
  secondary,
  accent,
  highlight,
  shadow,
  text,
  glowColor,
});

const LEGACY_STAR_PROBABILITY = 0.018;
const PREVIOUS_SPAWN_REDUCTION_RATIO = 0.80;
const CURRENT_RATE_REDUCTION_RATIO = 0.65;
const PREVIOUS_STAR_PROBABILITY = LEGACY_STAR_PROBABILITY
  * (1 - PREVIOUS_SPAWN_REDUCTION_RATIO);
const STAR_PROBABILITY = PREVIOUS_STAR_PROBABILITY
  * (1 - CURRENT_RATE_REDUCTION_RATIO);
const TOTAL_SPAWN_REDUCTION_RATIO = 1
  - (1 - PREVIOUS_SPAWN_REDUCTION_RATIO) * (1 - CURRENT_RATE_REDUCTION_RATIO);

const RARITY_TIERS = Object.freeze([
  Object.freeze({
    id: "common",
    name: "COMMON",
    encounterCopy: "STAR FOUND",
    label: "★",
    weight: 7200,
    deepWeightMultiplier: 0.25,
    minDepthTiles: 0,
    signXp: 8,
    multiplier: 2,
    engineCharge: 12,
    wow: false,
    palette: palette(
      "#78DCFF", "#E9FAFF", "#3E9DFF", "#FFFFFF",
      "#071A3C", "#F5FDFF", 0x87CEEB,
    ),
  }),
  Object.freeze({
    id: "uncommon",
    name: "UNCOMMON",
    encounterCopy: "LUMINOUS STAR",
    label: "★★",
    weight: 2000,
    deepWeightMultiplier: 0.75,
    minDepthTiles: 0,
    signXp: 18,
    multiplier: 3,
    engineCharge: 18,
    wow: false,
    palette: palette(
      "#C990FF", "#FFD6F4", "#8A72FF", "#FFF3FC",
      "#1A103C", "#FFF6FD", 0xCC44FF,
    ),
  }),
  Object.freeze({
    id: "rare",
    name: "RARE",
    encounterCopy: "WOW! RARE STAR",
    label: "★★★",
    weight: 600,
    deepWeightMultiplier: 2.5,
    minDepthTiles: 0,
    signXp: 45,
    multiplier: 5,
    engineCharge: 30,
    wow: true,
    palette: palette(
      "#FFD34E", "#FFF3B0", "#FF9D2E", "#FFFFFF",
      "#3B2104", "#FFF9DE", 0xFFD700,
    ),
  }),
  Object.freeze({
    id: "epic",
    name: "EPIC",
    encounterCopy: "WOW! EPIC STAR",
    label: "✦",
    weight: 160,
    deepWeightMultiplier: 6,
    minDepthTiles: 300,
    signXp: 120,
    multiplier: 8,
    engineCharge: 48,
    wow: true,
    palette: palette(
      "#FF6A2B", "#FFD084", "#E92C37", "#FFF0C2",
      "#350A08", "#FFF1DA", 0xFF4422,
    ),
  }),
  Object.freeze({
    id: "mythic",
    name: "MYTHIC",
    encounterCopy: "WOW! MYTHIC STAR",
    label: "✦✦",
    weight: 35,
    deepWeightMultiplier: 12,
    minDepthTiles: 900,
    signXp: 360,
    multiplier: 14,
    engineCharge: 72,
    wow: true,
    palette: palette(
      "#39F4D0", "#D8FFF8", "#18AFC4", "#FFFFFF",
      "#032C34", "#EFFFFC", 0x00FFEE,
    ),
  }),
  Object.freeze({
    id: "astral",
    name: "ASTRAL",
    encounterCopy: "WOW! ASTRAL STAR",
    label: "✦✦✦",
    weight: 5,
    deepWeightMultiplier: 20,
    minDepthTiles: 1600,
    signXp: 1200,
    multiplier: 25,
    engineCharge: 100,
    wow: true,
    palette: palette(
      "#B957FF", "#FF8FE8", "#6555FF", "#FFF4FF",
      "#190733", "#FFF5FF", 0x9900FF,
    ),
  }),
]);

const SIGN_XP_TOTALS = Object.freeze({
  dirt: 200,
  stone: 200,
  copper: 200,
  darkDirtNormal: 120,
  steel: 120,
  iron: 80,
  bronze: 80,
  darkDirtStrong: 80,
  silver: 80,
  gold: 40,
});

const LEGACY_STAR_THRESHOLDS = Object.freeze({
  dirt: 5,
  stone: 5,
  copper: 5,
  darkDirtNormal: 3,
  steel: 3,
  iron: 2,
  bronze: 2,
  darkDirtStrong: 2,
  silver: 2,
  gold: 1,
});

export const STAR_RARITY_PROGRESSION_CONFIG = Object.freeze({
  schemaVersion: 2,
  spawn: Object.freeze({
    legacyProbability: LEGACY_STAR_PROBABILITY,
    previousProbability: PREVIOUS_STAR_PROBABILITY,
    previousReductionRatio: PREVIOUS_SPAWN_REDUCTION_RATIO,
    currentRateReductionRatio: CURRENT_RATE_REDUCTION_RATIO,
    reductionRatio: TOTAL_SPAWN_REDUCTION_RATIO,
    probability: STAR_PROBABILITY,
    occurrenceHashSalt: 0x53544152,
    rarityHashSalt: 0x53a9b17,
  }),
  rarityDepthBias: Object.freeze({
    fullStrengthDepthTiles: 2000,
  }),
  rarityTiers: RARITY_TIERS,
  signProgression: Object.freeze({
    saveKey: "dig-game-sign-xp-v2",
    saveVersion: 2,
    maxEncounterCount: 999999,
    maxLevel: 5,
    levelFractions: Object.freeze([0.12, 0.28, 0.48, 0.72, 1]),
    xpTotals: SIGN_XP_TOTALS,
    legacyStarThresholds: LEGACY_STAR_THRESHOLDS,
  }),
  health: Object.freeze({
    expectedTierCount: 6,
    expectedWeightTotal: 10000,
    expectedSpawnReductionRatio: TOTAL_SPAWN_REDUCTION_RATIO,
    expectedCurrentRateReductionRatio: CURRENT_RATE_REDUCTION_RATIO,
  }),
});
