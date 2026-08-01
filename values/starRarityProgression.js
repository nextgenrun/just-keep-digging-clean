// ==================== STAR RARITY + SIGN XP ====================
// Weighted Star Block encounters, reward identity, Sign XP curves, and popup art.

const asset = (key, path) => Object.freeze({ key, path });
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

const ASSET_BASE = "sprites/UI/star-discovery-v1/";
const LEGACY_STAR_PROBABILITY = 0.018;
const SPAWN_REDUCTION_RATIO = 0.80;
const STAR_PROBABILITY = LEGACY_STAR_PROBABILITY * (1 - SPAWN_REDUCTION_RATIO);

const RARITY_TIERS = Object.freeze([
  Object.freeze({
    id: "common",
    name: "COMMON",
    encounterCopy: "STAR FOUND",
    label: "★",
    weight: 7200,
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

const plateAssets = Object.freeze(RARITY_TIERS.map(tier => asset(
  `star-discovery-${tier.id}-plate-v1`,
  `${ASSET_BASE}star-discovery-${tier.id}-plate-v1.png?v=20260730`,
)));
const fillAssets = Object.freeze(RARITY_TIERS.map(tier => asset(
  `star-discovery-${tier.id}-xp-fill-v1`,
  `${ASSET_BASE}star-discovery-${tier.id}-xp-fill-v1.png?v=20260730`,
)));

export const STAR_RARITY_PROGRESSION_CONFIG = Object.freeze({
  schemaVersion: 2,
  spawn: Object.freeze({
    legacyProbability: LEGACY_STAR_PROBABILITY,
    reductionRatio: SPAWN_REDUCTION_RATIO,
    probability: STAR_PROBABILITY,
    rarityHashSalt: 0x53a9b17,
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
  popup: Object.freeze({
    artSource: "ImageGen",
    packageId: "star-discovery-v1",
    plateAssets,
    fillAssets,
    maximumActive: 1,
    wowMinRarityIndex: 2,
    depthOffset: 30,
    widthPx: 540,
    heightPx: 242,
    topYPx: 152,
    starPulseSizePx: 330,
    starPulseRarityBonusPx: 22,
    starPulseAlpha: 0.2,
    pulseEndScale: 1.7,
    pulseMs: 1450,
    fillWidthPx: 314,
    fillHeightPx: 25,
    fillOffsetYPx: 74,
    titleOffsetYPx: -58,
    signOffsetYPx: -23,
    rewardOffsetYPx: 11,
    levelOffsetYPx: 43,
    titleFontSizePx: 22,
    signFontSizePx: 17,
    rewardFontSizePx: 15,
    levelFontSizePx: 12,
    textStroke: "#02060A",
    textStrokeThicknessPx: 3,
    enterOffsetYPx: -34,
    exitOffsetYPx: -14,
    enterMs: 300,
    settleScale: 1,
    startScale: 0.84,
    wowStartScale: 0.72,
    fillTweenMs: 720,
    holdMsByRarity: Object.freeze([3000, 3000, 3000, 3000, 3000, 3000]),
    minimumIntervalMs: 20000,
    alwaysShowFirstRarityEncounter: true,
    alwaysShowSignLevelUp: true,
    exitMs: 360,
    priorityLevelUpBonus: 10,
    copy: Object.freeze({
      signXp: "SIGN XP",
      materialReward: "MATERIAL",
      bonusReward: "BONUS STAR",
      signLevel: "SIGN LV",
      mastered: "MASTERED",
      toLevel: "TO LV",
    }),
  }),
  health: Object.freeze({
    expectedTierCount: 6,
    expectedAssetCount: 12,
    expectedWeightTotal: 10000,
    expectedSpawnReductionRatio: SPAWN_REDUCTION_RATIO,
    expectedPopupHoldMs: 3000,
    expectedPopupMinimumIntervalMs: 20000,
  }),
});

export function getStarDiscoveryPreloadAssets(
  config = STAR_RARITY_PROGRESSION_CONFIG,
) {
  return [
    ...config.popup.plateAssets,
    ...config.popup.fillAssets,
  ];
}
