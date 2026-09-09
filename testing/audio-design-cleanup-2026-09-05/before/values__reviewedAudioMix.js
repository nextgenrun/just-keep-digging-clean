import { TILE_TYPES } from "./tileTypes.js";

// Gain staging: master is owned only by Phaser's manager. Source gain -> SFX
// bus (including speech duck) -> master. All gains are linear, not percentages.
export const REVIEWED_AUDIO_MIX = Object.freeze({
  composites: Object.freeze({
    deepCave: Object.freeze(["caveEerie", "miningMars", "evilSpell"]),
    rainReference: Object.freeze(["rainReference", "windReference"]),
  }),
  softMaterialTypes: Object.freeze([TILE_TYPES.DIRT, TILE_TYPES.DARK_DIRT_NORMAL, TILE_TYPES.DARK_DIRT_STRONG, TILE_TYPES.LAVA_DIRT]),
  maxOneShots: 10,
  oneShotPeakBudget: 0.45,
  defaultPriority: 60,
  protectedPriority: 100,
  protectedKeyParts: Object.freeze(["seismic", "warning", "critical", "star-destruction", "level-up"]),
  spatialFilterQ: 0.5,
  spatialFilterSmoothSeconds: 0.12,
  voiceHeadroom: 0.72,
  maxRate: 1.12,
  minRate: 0.84,
  loadRetryMs: 8000,
  loopStopEpsilon: 0.0001,
  cave: Object.freeze({
    enterDepth: 300, exitDepth: 260, fullDepth: 520,
    maxVoices: 6, peakBudget: 0.10, fadeMs: 2400,
    bedHoldMs: Object.freeze([70000, 110000]),
    detailGapMs: Object.freeze([42000, 85000]),
    firstDetailDelayMs: 18000,
    detailFadeMs: 1400,
    presets: Object.freeze([
      Object.freeze([{ id: "libDeepCaveBedA" }]),
      Object.freeze([{ id: "libDeepCaveBedB" }]),
      Object.freeze([{ id: "miningMars" }]),
      Object.freeze([
        { id: "caveEerie", gain: 0.08, mix: "deepCave" },
        { id: "miningMars", gain: 0.045, mix: "deepCave" },
        { id: "evilSpell", gain: 0.055, mix: "deepCave" },
      ]),
    ]),
    vocalDetails: Object.freeze([
      "libCreepySingerA", "libCreepySingerB", "libCreepySingerC", "libCreepySingerD",
      "libDeepVoicesA", "libDeepVoicesB", "libSoundsDeep", "libWhispersDeep",
    ]),
  }),
  weather: Object.freeze({
    holdWhileLoading: false,
    coveredWindMultiplier: 0.2,
    coveredWindMultiplier: 0.2,
    maxVoices: 4, peakBudget: 0.14, fadeMs: 2800, variantHoldMs: 90000,
    rainOpen: Object.freeze(["rainReference", "libRainDirtA", "libRainDirtB", "libRainDirtC", "libShopRainOutside"]),
    drizzle: Object.freeze(["libLightRainStoneA", "libLightRainStoneB"]),
    rainRoof: Object.freeze(["libShopRainInside", "libWoodRainInside"]),
    rainShelter: Object.freeze(["libWoodRainInside", "libShopRainInside"]),
    stormOpen: Object.freeze(["libTownHeavyRain"]),
    windDay: Object.freeze(["libTownDayBreeze"]),
    windNight: Object.freeze(["libNightWindDirtB", "libNightWindOnly"]),
  }),
  landing: Object.freeze({ minAirMs: 140, minSpeed: 220, fullSpeed: 720, teleportDistance: 250 }),
});

export const REVIEWED_AUDIO_GROUP_LIMITS = Object.freeze({
  ui: 1, contact: 1, tool: 1, swing: 1, break: 1, landing: 1,
  pickup: 1, reward: 1, danger: 1, torch: 1, detail: 1,
  footstep: 1, flight: 1, structural: 1, starDetail: 1, dangerDetail: 1,
});
