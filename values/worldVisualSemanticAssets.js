import { TILE_TYPES } from "./tileTypes.js";

const asset = (key, path) => Object.freeze({ key, path });

export const WORLD_VISUAL_SEMANTIC_ASSETS = Object.freeze({
  feature: Object.freeze({
    enabled: true,
    queryParam: "terrainSemantics",
    queryEnableValues: Object.freeze(["1", "on", "true", "generated", "imagegen"]),
    queryDisableValues: Object.freeze(["0", "off", "false", "procedural", "legacy"]),
  }),
  resources: Object.freeze({
    atlas: Object.freeze({
      ...asset(
        "world-visual-v2-semantic-resource-insets",
        "sprites/backgrounds/world-visual-v2/semantic-decals-v1/resource-insets-beauty-v1.png?v=20260717b"
      ),
      columns: 8,
      frameSizePx: 256,
      frameCount: 30,
      variants: 3,
      framePrefix: "world-visual-v2-semantic-resource-",
    }),
    frameStarts: Object.freeze({
      copper: 0,
      bronze: 3,
      steel: 6,
      iron: 9,
      silver: 12,
      gold: 15,
      obsidian: 18,
      emberOre: 21,
      magmaCrystal: 24,
      stone: 27,
    }),
    scale: 0.84,
    alpha: 0.9,
    scaleVariation: 0.035,
    rotationVariationRadians: 0.045,
    stoneDensity: 0.24,
    maxVisibleStone: 14,
    profiles: Object.freeze({
      copper: Object.freeze({ scale: 0.86, alpha: 0.93 }),
      bronze: Object.freeze({ scale: 0.84, alpha: 0.91 }),
      steel: Object.freeze({ scale: 0.82, alpha: 0.88 }),
      iron: Object.freeze({ scale: 0.83, alpha: 0.89 }),
      silver: Object.freeze({ scale: 0.81, alpha: 0.86 }),
      gold: Object.freeze({ scale: 0.84, alpha: 0.92 }),
      obsidian: Object.freeze({ scale: 0.87, alpha: 0.93 }),
      emberOre: Object.freeze({ scale: 0.86, alpha: 0.95 }),
      magmaCrystal: Object.freeze({ scale: 0.88, alpha: 0.96 }),
      // Stone is common enough to read as geology instead of a repeated pickup.
      stone: Object.freeze({ scale: 0.74, alpha: 0.64 }),
    }),
  }),
  specialBlocks: Object.freeze({
    beautyAtlas: Object.freeze({
      ...asset(
        "world-visual-v2-semantic-special-rewards-beauty",
        "sprites/backgrounds/world-visual-v2/semantic-decals-v1/special-reward-insets-beauty-v1.png?v=20260717b"
      ),
      columns: 4,
      frameSizePx: 256,
      frameCount: 7,
      framePrefix: "world-visual-v2-semantic-special-reward-beauty-",
    }),
    emissiveAtlas: Object.freeze({
      ...asset(
        "world-visual-v2-semantic-special-rewards-emissive",
        "sprites/backgrounds/world-visual-v2/semantic-decals-v1/special-reward-insets-emissive-v1.png?v=20260717b"
      ),
      columns: 4,
      frameSizePx: 256,
      frameCount: 7,
      framePrefix: "world-visual-v2-semantic-special-reward-emissive-",
    }),
    frameByTileType: Object.freeze({
      [TILE_TYPES.GEM_POWER_BLOCK]: 0,
      [TILE_TYPES.SPEED_BLOCK]: 1,
      [TILE_TYPES.XP_BLOCK]: 2,
      [TILE_TYPES.CRIT_BLOCK]: 3,
      [TILE_TYPES.BERSERK_BLOCK]: 4,
      [TILE_TYPES.COMBO_BLOCK]: 5,
      [TILE_TYPES.LEGEND_BLOCK]: 6,
    }),
    scale: 0.84,
    beautyAlpha: 0.94,
    emissiveAlpha: 0.32,
    pulsePeriodMs: 2600,
    pulseAlphaRange: 0.16,
  }),
  bedrock: Object.freeze({
    material: asset(
      "world-visual-v2-semantic-bedrock",
      "sprites/backgrounds/world-visual-v2/semantic-decals-v1/bedrock-seamless-v1.webp?v=20260717b"
    ),
    semantic: "bedrock",
    includesCaveWall: true,
    alpha: 1,
    lightingLift: 0.38,
    coolTint: 0xbddcff,
    coolTintStrength: 0.22,
  }),
  skyTile: Object.freeze({
    beautyAtlas: Object.freeze({
      ...asset(
        "world-visual-v2-semantic-sky-stars-beauty",
        "sprites/backgrounds/world-visual-v2/semantic-decals-v1/sky-stars-beauty-v1.png?v=20260717b"
      ),
      columns: 3,
      frameSizePx: 256,
      frameCount: 6,
      framePrefix: "world-visual-v2-semantic-sky-star-beauty-",
    }),
    emissiveAtlas: Object.freeze({
      ...asset(
        "world-visual-v2-semantic-sky-stars-emissive",
        "sprites/backgrounds/world-visual-v2/semantic-decals-v1/sky-stars-emissive-v1.png?v=20260717b"
      ),
      columns: 3,
      frameSizePx: 256,
      frameCount: 6,
      framePrefix: "world-visual-v2-semantic-sky-star-emissive-",
    }),
    scale: 1,
    beautyAlpha: 0.98,
    emissiveAlpha: 0.58,
    pulsePeriodMs: 2100,
    pulseAlphaRange: 0.18,
  }),
  render: Object.freeze({
    bedrockDepth: 2.27,
    resourceDepth: 2.41,
    starBeautyDepth: 2.43,
    specialBeautyDepth: 2.44,
    starEmissiveDepth: 898,
    emissiveBlendMode: "ADD",
  }),
  performance: Object.freeze({
    maxVisibleResources: 72,
    maxVisibleStars: 72,
    maxVisibleSpecialBlocks: 72,
  }),
});

export function resolveWorldVisualSemanticAssetsEnabled(
  config = WORLD_VISUAL_SEMANTIC_ASSETS,
  search = globalThis.location?.search || ""
) {
  const feature = config.feature;
  const value = new URLSearchParams(search).get(feature.queryParam)?.trim().toLowerCase();
  if (value && feature.queryDisableValues.includes(value)) return false;
  if (value && feature.queryEnableValues.includes(value)) return true;
  return feature.enabled;
}

export function resolveWorldVisualSemanticResourceFrame(tx, ty, resourceKey, config = WORLD_VISUAL_SEMANTIC_ASSETS) {
  const start = config.resources.frameStarts[resourceKey];
  if (!Number.isInteger(start)) return null;
  let hash = Math.imul(tx + 17, 374761393) ^ Math.imul(ty + 31, 668265263);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return start + (((hash ^ (hash >>> 16)) >>> 0) % config.resources.atlas.variants);
}

export function resolveWorldVisualSemanticStarFrame(rarity, config = WORLD_VISUAL_SEMANTIC_ASSETS) {
  return Math.max(0, Math.min(config.skyTile.beautyAtlas.frameCount - 1, Math.floor(Number(rarity) || 0)));
}

export function resolveWorldVisualSemanticSpecialFrame(tileType, config = WORLD_VISUAL_SEMANTIC_ASSETS) {
  const frame = config.specialBlocks.frameByTileType[tileType];
  return Number.isInteger(frame) ? frame : null;
}

export function getWorldVisualSemanticPreloadAssets(config = WORLD_VISUAL_SEMANTIC_ASSETS) {
  return [
    config.resources.atlas,
    config.bedrock.material,
    config.skyTile.beautyAtlas,
    config.skyTile.emissiveAtlas,
    config.specialBlocks.beautyAtlas,
    config.specialBlocks.emissiveAtlas,
  ];
}
