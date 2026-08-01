// ==================== STAR CONSTELLATION CONFIG ====================
// Shared star pillar / sky-star constellation layout and display tuning.

import { GAME_CONFIG } from "./gameConfig.js";
import { STAR_RARITY_PROGRESSION_CONFIG } from "./starRarityProgression.js";

const STAR_BLOCK_TILE_DISPLAY_SIZE_PX = GAME_CONFIG.tileSize;

export const STAR_CONSTELLATION_CONFIG = Object.freeze({
  thresholds: Object.freeze({
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
  }),

  spacingPx: 118,

  centers: Object.freeze({
    dirt: Object.freeze([-1390, -560]),
    stone: Object.freeze([-1160, -710]),
    copper: Object.freeze([-850, -825]),
    darkDirtNormal: Object.freeze([-480, -875]),
    steel: Object.freeze([-70, -890]),
    iron: Object.freeze([340, -875]),
    bronze: Object.freeze([710, -825]),
    darkDirtStrong: Object.freeze([1020, -710]),
    silver: Object.freeze([1245, -560]),
    gold: Object.freeze([1390, -400]),
  }),

  defs: Object.freeze({
    dirt: Object.freeze({ name: 'The Shovel', points: Object.freeze([[0, -2], [-1, -1], [1, -1], [0, 0], [0, 2]]), lines: Object.freeze([[0, 1], [0, 2], [1, 2], [2, 3], [3, 4]]) }),
    stone: Object.freeze({ name: 'The Mountain', points: Object.freeze([[0, -2], [-2, -1], [2, -1], [-2, 1], [2, 1]]), lines: Object.freeze([[0, 1], [0, 2], [1, 3], [2, 4], [3, 4]]) }),
    copper: Object.freeze({ name: 'The Anvil', points: Object.freeze([[-2, -1], [2, -1], [0, 0], [-1, 1], [1, 1]]), lines: Object.freeze([[0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [3, 4]]) }),
    darkDirtNormal: Object.freeze({ name: 'The Cave', points: Object.freeze([[-2, 1], [-1, -1], [0, -2], [1, -1], [2, 1]]), lines: Object.freeze([[0, 1], [1, 2], [2, 3], [3, 4]]) }),
    darkDirtStrong: Object.freeze({ name: 'The Fortress', points: Object.freeze([[-2, -2], [0, -2], [2, -2], [-1, 1], [1, 1]]), lines: Object.freeze([[0, 3], [1, 3], [1, 4], [2, 4], [3, 4]]) }),
    bronze: Object.freeze({ name: 'The Shield', points: Object.freeze([[0, -2], [-2, -1], [2, -1], [-1, 1], [1, 1]]), lines: Object.freeze([[0, 1], [0, 2], [1, 3], [2, 4], [3, 4]]) }),
    steel: Object.freeze({ name: 'The Sword', points: Object.freeze([[0, -2], [0, -1], [-1, 0], [1, 0], [0, 1]]), lines: Object.freeze([[0, 1], [1, 2], [1, 3], [2, 3], [1, 4]]) }),
    iron: Object.freeze({ name: 'The Hammer', points: Object.freeze([[-1, -2], [0, -2], [1, -2], [0, 0], [0, 2]]), lines: Object.freeze([[0, 1], [1, 2], [1, 3], [3, 4]]) }),
    silver: Object.freeze({ name: 'The Crescent', points: Object.freeze([[1, -2], [0, -1], [-1, 0], [0, 1], [1, 2]]), lines: Object.freeze([[0, 1], [1, 2], [2, 3], [3, 4]]) }),
    gold: Object.freeze({ name: 'The Crown', points: Object.freeze([[-2, -1], [0, -2], [2, -1], [-1, 1], [1, 1]]), lines: Object.freeze([[0, 1], [1, 2], [0, 3], [2, 4], [3, 4]]) }),
  }),

  lineColors: Object.freeze({
    dirt: 0xA0784A,
    stone: 0x888888,
    copper: 0xFF7700,
    darkDirtNormal: 0x5544AA,
    darkDirtStrong: 0x663322,
    bronze: 0xCC8800,
    steel: 0x778899,
    iron: 0x8899AA,
    silver: 0xCCDDEE,
    gold: 0xFFD700,
  }),

  collectedStarReleaseFx: Object.freeze({
    artSource: "ImageGen",
    artRevision: "star-block-crystal-v2-20260728",
    presentationRevision: "one-to-one-pop-v4-20260729",
    fallbackRarityIndex: 0,
    tileDisplaySizePx: STAR_BLOCK_TILE_DISPLAY_SIZE_PX,
    coreAssets: Object.freeze([
      Object.freeze({
        key: "star-block-release-core-cyan-v2",
        path: "sprites/environment/star-block-crystal-v2/star-core-cyan-v2.png?v=20260728",
      }),
      Object.freeze({
        key: "star-block-release-core-lavender-v2",
        path: "sprites/environment/star-block-crystal-v2/star-core-lavender-v2.png?v=20260728",
      }),
      Object.freeze({
        key: "star-block-release-core-gold-v2",
        path: "sprites/environment/star-block-crystal-v2/star-core-gold-v2.png?v=20260728",
      }),
      Object.freeze({
        key: "star-block-release-core-orange-v2",
        path: "sprites/environment/star-block-crystal-v2/star-core-orange-v2.png?v=20260728",
      }),
      Object.freeze({
        key: "star-block-release-core-turquoise-v2",
        path: "sprites/environment/star-block-crystal-v2/star-core-turquoise-v2.png?v=20260728",
      }),
      Object.freeze({
        key: "star-block-release-core-violet-v2",
        path: "sprites/environment/star-block-crystal-v2/star-core-violet-v2.png?v=20260728",
      }),
    ]),
    fractureAssets: Object.freeze([
      Object.freeze({
        key: "star-block-release-fracture-cyan-v1",
        path: "sprites/environment/star-block-destruction-v1/star-fracture-cyan-v1.png?v=20260727",
      }),
      Object.freeze({
        key: "star-block-release-fracture-lavender-v1",
        path: "sprites/environment/star-block-destruction-v1/star-fracture-lavender-v1.png?v=20260727",
      }),
      Object.freeze({
        key: "star-block-release-fracture-gold-v1",
        path: "sprites/environment/star-block-destruction-v1/star-fracture-gold-v1.png?v=20260727",
      }),
      Object.freeze({
        key: "star-block-release-fracture-orange-v1",
        path: "sprites/environment/star-block-destruction-v1/star-fracture-orange-v1.png?v=20260727",
      }),
      Object.freeze({
        key: "star-block-release-fracture-turquoise-v1",
        path: "sprites/environment/star-block-destruction-v1/star-fracture-turquoise-v1.png?v=20260727",
      }),
      Object.freeze({
        key: "star-block-release-fracture-violet-v1",
        path: "sprites/environment/star-block-destruction-v1/star-fracture-violet-v1.png?v=20260727",
      }),
    ]),
    coreDisplaySizesPx: Object.freeze([
      STAR_BLOCK_TILE_DISPLAY_SIZE_PX,
      STAR_BLOCK_TILE_DISPLAY_SIZE_PX,
      STAR_BLOCK_TILE_DISPLAY_SIZE_PX,
      STAR_BLOCK_TILE_DISPLAY_SIZE_PX,
      STAR_BLOCK_TILE_DISPLAY_SIZE_PX,
      STAR_BLOCK_TILE_DISPLAY_SIZE_PX,
    ]),
    riseMinPx: 360,
    riseMaxPx: 480,
    lateralDriftMaxPx: 34,
    swayAmplitudeMinPx: 15,
    swayAmplitudeMaxPx: 32,
    swayCyclesMin: 0.45,
    swayCyclesMax: 0.75,
    durationMs: 10800,
    rarityDurationBonusMs: 260,
    liftDelayMs: 520,
    flashInMs: 280,
    settleMs: 1800,
    fadeHoldMs: 6600,
    startScale: 0.9,
    flashScale: 1,
    growthDelayMs: 720,
    peakScale: 1.45,
    endScale: 1.18,
    maxRotationDeg: 6,
    sourceFractureDisplaySizePx: 210,
    sourceFractureRarityBonusPx: 9,
    sourceFractureOffsetYPx: -22,
    sourceFractureAlpha: 0.68,
    sourceFractureStartScale: 0.34,
    sourceFractureEndScale: 1.04,
    sourceFractureDurationMs: 1120,
    sourcePulseDisplaySizePx: 170,
    sourcePulseRarityBonusPx: 8,
    sourcePulseAlpha: 0.12,
    sourcePulseStartScale: 0.14,
    sourcePulseEndScale: 1.92,
    sourcePulseDurationMs: 1680,
    echoCount: 6,
    echoLeadDelayMs: 360,
    echoStepDelayMs: 420,
    echoStartAlpha: 0.24,
    echoAlphaDecay: 0.026,
    echoStartScale: 0.98,
    echoScaleDecay: 0.055,
    echoEndScale: 0.42,
    echoRiseRatioStart: 0.96,
    echoRiseRatioDecay: 0.07,
    echoDriftRatio: 0.82,
    echoSwayRatio: 0.72,
  }),
  chartStarSizePx: 20,
  chartPartialStarSizePx: 16,
  chartEmptyStarRadiusPx: 10,


  rarityFallbacks: STAR_RARITY_PROGRESSION_CONFIG.rarityTiers,

});

export function getCollectedStarReleasePreloadAssets(config = STAR_CONSTELLATION_CONFIG) {
  const releaseFx = config.collectedStarReleaseFx;
  return [
    ...(Array.isArray(releaseFx?.coreAssets) ? releaseFx.coreAssets : []),
    ...(Array.isArray(releaseFx?.fractureAssets) ? releaseFx.fractureAssets : []),
  ];
}
