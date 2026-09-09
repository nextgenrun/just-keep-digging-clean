import { TILE_TYPES } from "./tileTypes.js";
import { GEM_POWER_BLOCK_TIERS } from "./specialBlocks.js";

const marker = (frame, variants = 1, scale = 1, alpha = 1) => Object.freeze({
  frame,
  variants,
  scale,
  alpha,
});

export const WORLD_VISUAL_FEEDBACK = Object.freeze({
  atlas: Object.freeze({
    key: "world-visual-v2-feedback-atlas-v7",
    path: "sprites/backgrounds/world-scenic-regions-v1/level1-ground-recognition-atlas-v7.png?v=imagegen-ground-veins-20260728e",
    columns: 8,
    frameSizePx: 94,
    frameCount: 78,
    framePrefix: "world-visual-v2-feedback-",
  }),
  resourceMarkers: Object.freeze({
    copper: marker(0, 6, 1, 1),
    bronze: marker(6, 6, 1, 1),
    steel: marker(12, 6, 1, 1),
    iron: marker(18, 6, 1, 1),
    silver: marker(24, 6, 1, 1),
    gold: marker(30, 6, 1, 1),
    obsidian: marker(36, 6, 1, 1),
    emberOre: marker(42, 6, 1, 1),
    magmaCrystal: marker(48, 6, 1, 1),
    stone: marker(54, 6, 1, 1),
  }),
  embeddedResourceVeins: Object.freeze({
    // The approved default is the ImageGen atlas. This procedural path remains
    // available only through ?resourceVeins=1 for explicit comparison.
    enabled: false,
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
    teleport: marker(60, 1, 1, 1),
    gamble: marker(61, 1, 1, 1),
    gemPower: marker(62, 1, 1, 1),
    gemPowerTiers: Object.freeze(Object.fromEntries(
      GEM_POWER_BLOCK_TIERS.map(tier => [
        tier.id,
        marker(tier.recognitionFrame, 1, 1, 1),
      ])
    )),
    speed: marker(67, 1, 1, 1),
    xp: marker(68, 1, 1, 1),
    crit: marker(69, 1, 1, 1),
    ability: marker(69, 1, 1, 1),
    berserk: marker(70, 1, 1, 1),
    combo: marker(71, 1, 1, 1),
    legend: marker(72, 1, 1, 1),
    geodeInterior: marker(73, 1, 0.8, 0.94),
    geodeWall: marker(74, 1, 0.78, 0.9),
    chest: marker(75, 1, 0.78, 0.96),
    ancientRelic: marker(76, 1, 0.74, 0.94),
    glowCrystal: marker(77, 1, 0.82, 0.96),
  }),
});

export const WORLD_VISUAL_SPECIAL_MARKER_KEY_BY_TYPE = Object.freeze({
  [TILE_TYPES.TELEPORT_TILE]: "teleport",
  [TILE_TYPES.GAMBLE_TILE]: "gamble",
  [TILE_TYPES.GEM_POWER_BLOCK]: "gemPower",
  [TILE_TYPES.SPEED_BLOCK]: "speed",
  [TILE_TYPES.XP_BLOCK]: "xp",
  [TILE_TYPES.BERSERK_BLOCK]: "berserk",
  [TILE_TYPES.COMBO_BLOCK]: "combo",
  [TILE_TYPES.LEGEND_BLOCK]: "legend",
  [TILE_TYPES.ABILITY_BLOCK]: "ability",
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
