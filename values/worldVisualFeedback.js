import { TILE_TYPES } from "./tileTypes.js";

const marker = (frame, variants = 1, scale = 1, alpha = 1) => Object.freeze({
  frame,
  variants,
  scale,
  alpha,
});

export const WORLD_VISUAL_FEEDBACK = Object.freeze({
  atlas: Object.freeze({
    key: "world-visual-v2-feedback-atlas",
    path: "sprites/backgrounds/world-scenic-regions-v1/level1-ground-recognition-atlas-v2.png?v=scenic-v2-20260716",
    columns: 8,
    frameSizePx: 94,
    frameCount: 44,
    framePrefix: "world-visual-v2-feedback-",
  }),
  resourceMarkers: Object.freeze({
    copper: marker(0, 3, 0.92, 0.88),
    bronze: marker(3, 3, 0.92, 0.88),
    steel: marker(6, 3, 0.92, 0.86),
    iron: marker(9, 3, 0.92, 0.86),
    silver: marker(12, 3, 0.92, 0.88),
    gold: marker(15, 3, 0.94, 0.92),
    obsidian: marker(18, 3, 0.92, 0.86),
    emberOre: marker(21, 3, 0.94, 0.90),
    magmaCrystal: marker(24, 3, 0.94, 0.90),
    stone: marker(27, 3, 0.90, 0.48),
  }),
  embeddedResourceVeins: Object.freeze({
    enabled: true,
    queryParam: "resourceVeins",
    queryEnableValues: Object.freeze(["1", "on", "true", "embedded"]),
    queryDisableValues: Object.freeze(["0", "off", "false", "atlas", "legacy"]),
    alphaScale: 0.68,
    spanScale: 0.54,
    spanRandomMin: 0.84,
    spanRandomRange: 0.16,
    centerJitterScale: 0.08,
    bendScale: 0.16,
    mainPointPositions: Object.freeze([-0.5, -0.17, 0.17, 0.5]),
    branchLengthScale: 0.29,
    branchLengthRandomMin: 0.72,
    branchLengthRandomRange: 0.28,
    branchAngleMinRadians: 0.62,
    branchAngleRangeRadians: 0.58,
    branchMidpoint: 0.54,
    branchWidthScale: 0.72,
    shadowWidthScale: 0.085,
    coreWidthScale: 0.035,
    highlightWidthScale: 0.010,
    nodeRadiusScale: 0.052,
    nodeJitterScale: 0.16,
    nodeRadiusRandomMin: 0.65,
    nodeRadiusRandomRange: 0.55,
    nodeShadowScale: 1.65,
    nodeHighlightOffsetScale: 0.24,
    nodeHighlightRadiusScale: 0.34,
    crystalTipScale: 2.1,
    crystalHalfWidthScale: 0.82,
    crystalBaseScale: 0.72,
    shadowColor: 0x080706,
    highlightTargetColor: 0xffffff,
    shadowAlpha: 0.78,
    coreAlpha: 0.72,
    highlightAlpha: 0.32,
    highlightMix: 0.46,
    profiles: Object.freeze({
      copper: Object.freeze({ scale: 0.96, branches: 2, nodes: 5, crystalline: false }),
      bronze: Object.freeze({ scale: 0.92, branches: 3, nodes: 4, crystalline: false }),
      steel: Object.freeze({ scale: 0.88, branches: 2, nodes: 3, crystalline: false }),
      iron: Object.freeze({ scale: 0.94, branches: 3, nodes: 4, crystalline: false }),
      silver: Object.freeze({ scale: 0.90, branches: 3, nodes: 6, crystalline: false }),
      gold: Object.freeze({ scale: 0.86, branches: 2, nodes: 6, crystalline: false }),
      obsidian: Object.freeze({ scale: 0.88, branches: 2, nodes: 3, crystalline: true }),
      emberOre: Object.freeze({ scale: 0.92, branches: 3, nodes: 5, crystalline: true }),
      magmaCrystal: Object.freeze({ scale: 0.90, branches: 2, nodes: 4, crystalline: true }),
      stone: Object.freeze({
        scale: 0.55,
        branches: 0,
        nodes: 4,
        crystalline: false,
        vein: false,
        alphaScale: 0.72,
      }),
    }),
  }),
  specialMarkers: Object.freeze({
    teleport: marker(30, 1, 0.78, 0.94),
    gamble: marker(31, 1, 0.78, 0.94),
    gemPower: marker(32, 1, 0.78, 0.94),
    speed: marker(33, 1, 0.78, 0.94),
    xp: marker(34, 1, 0.78, 0.94),
    crit: marker(35, 1, 0.78, 0.94),
    berserk: marker(36, 1, 0.78, 0.94),
    combo: marker(37, 1, 0.78, 0.94),
    legend: marker(38, 1, 0.78, 0.94),
    geodeInterior: marker(39, 1, 0.84, 0.96),
    geodeWall: marker(40, 1, 0.82, 0.92),
    chest: marker(41, 1, 0.82, 0.98),
    ancientRelic: marker(42, 1, 0.80, 0.96),
    glowCrystal: marker(43, 1, 0.86, 0.98),
  }),
});

export const WORLD_VISUAL_SPECIAL_MARKER_KEY_BY_TYPE = Object.freeze({
  [TILE_TYPES.TELEPORT_TILE]: "teleport",
  [TILE_TYPES.GAMBLE_TILE]: "gamble",
  [TILE_TYPES.GEM_POWER_BLOCK]: "gemPower",
  [TILE_TYPES.SPEED_BLOCK]: "speed",
  [TILE_TYPES.XP_BLOCK]: "xp",
  [TILE_TYPES.CRIT_BLOCK]: "crit",
  [TILE_TYPES.BERSERK_BLOCK]: "berserk",
  [TILE_TYPES.COMBO_BLOCK]: "combo",
  [TILE_TYPES.LEGEND_BLOCK]: "legend",
  [TILE_TYPES.GEODE_INTERIOR]: "geodeInterior",
  [TILE_TYPES.GEODE_WALL]: "geodeWall",
  [TILE_TYPES.CHEST]: "chest",
  [TILE_TYPES.ANCIENT_RELIC_CACHE]: "ancientRelic",
  [TILE_TYPES.GLOW_CRYSTAL]: "glowCrystal",
});

export function getWorldVisualFeedbackPreloadAssets(config = WORLD_VISUAL_FEEDBACK) {
  return [config.atlas];
}

export function resolveWorldVisualFeedbackMarker(resourceKey, tileType, config = WORLD_VISUAL_FEEDBACK) {
  return config.resourceMarkers[resourceKey]
    || config.specialMarkers[WORLD_VISUAL_SPECIAL_MARKER_KEY_BY_TYPE[tileType]]
    || null;
}

export function resolveWorldVisualFeedbackFrame(tx, ty, tileType, markerConfig) {
  let hash = Math.imul(tx + 17, 374761393)
    ^ Math.imul(ty + 31, 668265263)
    ^ Math.imul(tileType + 7, 2246822519);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  const variant = ((hash ^ (hash >>> 16)) >>> 0) % markerConfig.variants;
  return markerConfig.frame + variant;
}

export function resolveWorldVisualResourceVeinsEnabled(
  config = WORLD_VISUAL_FEEDBACK,
  search = globalThis.location?.search || ""
) {
  const veins = config.embeddedResourceVeins;
  const value = new URLSearchParams(search).get(veins.queryParam)?.trim().toLowerCase();
  if (value && veins.queryDisableValues.includes(value)) return false;
  if (value && veins.queryEnableValues.includes(value)) return true;
  return veins.enabled;
}
