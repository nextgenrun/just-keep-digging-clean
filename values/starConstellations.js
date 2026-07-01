// ==================== STAR CONSTELLATION CONFIG ====================
// Shared star pillar / sky-star constellation layout and display tuning.

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

  skyStarTexturePrefix: 'dig-game-sky-star-rarity-',
  skyStarDisplaySizesPx: Object.freeze([48, 58, 70, 82, 94, 108]),
  chartStarSizePx: 20,
  chartPartialStarSizePx: 16,
  chartEmptyStarRadiusPx: 10,

  rarityFallbacks: Object.freeze([
    Object.freeze({ name: 'common', glowColor: 0x87CEEB, multiplier: 2, label: '★' }),
    Object.freeze({ name: 'rare', glowColor: 0xCC44FF, multiplier: 3, label: '★★' }),
    Object.freeze({ name: 'legendary', glowColor: 0xFFD700, multiplier: 5, label: '★★★' }),
    Object.freeze({ name: 'ancient', glowColor: 0xFF4422, multiplier: 8, label: '✦' }),
    Object.freeze({ name: 'cosmic', glowColor: 0x00FFEE, multiplier: 14, label: '✦✦' }),
    Object.freeze({ name: 'void', glowColor: 0x9900FF, multiplier: 25, label: '✦✦✦' }),
  ]),
});
