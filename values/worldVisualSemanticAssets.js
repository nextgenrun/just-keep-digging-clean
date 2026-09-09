import { TILE_TYPES } from "./tileTypes.js";
import { getGemPowerBlockTier } from "./specialBlocks.js";

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
        "world-visual-v2-semantic-resource-ground-veins-v6",
        "sprites/backgrounds/world-visual-v2/semantic-decals-v1/resource-ground-veins-imagegen-2d-v6.png?v=20260728e"
      ),
      columns: 6,
      frameSizePx: 188,
      frameCount: 60,
      variants: 6,
      framePrefix: "world-visual-v2-semantic-resource-",
    }),
    frameStarts: Object.freeze({
      copper: 0,
      bronze: 6,
      steel: 12,
      iron: 18,
      silver: 24,
      gold: 30,
      obsidian: 36,
      emberOre: 42,
      magmaCrystal: 48,
      stone: 54,
    }),
    scale: 1,
    alpha: 1,
    scaleVariation: 0,
    rotationVariationRadians: 0,
    stoneDensity: 1,
    maxVisibleStone: 96,
    profiles: Object.freeze({
      copper: Object.freeze({ scale: 1, alpha: 1 }),
      bronze: Object.freeze({ scale: 1, alpha: 1 }),
      steel: Object.freeze({ scale: 1, alpha: 1 }),
      iron: Object.freeze({ scale: 1, alpha: 1 }),
      silver: Object.freeze({ scale: 1, alpha: 1 }),
      gold: Object.freeze({ scale: 1, alpha: 1 }),
      obsidian: Object.freeze({ scale: 1, alpha: 1 }),
      emberOre: Object.freeze({ scale: 1, alpha: 1 }),
      magmaCrystal: Object.freeze({ scale: 1, alpha: 1 }),
      stone: Object.freeze({ scale: 1, alpha: 1 }),
    }),
  }),
  specialBlocks: Object.freeze({
    beautyAtlas: Object.freeze({
      ...asset(
        "world-visual-v2-semantic-special-blocks-imagegen-gp-tiers-v3",
        "sprites/backgrounds/world-visual-v2/semantic-decals-v1/special-blocks-imagegen-gp-tiers-v3.png?v=20260728c"
      ),
      columns: 4,
      frameSizePx: 188,
      frameCount: 12,
      framePrefix: "world-visual-v2-semantic-special-reward-beauty-",
    }),
    // Special blocks are approved opaque ImageGen rasters. GP owns five depth tiers.
    emissiveAtlas: null,
    frameByTileType: Object.freeze({
      [TILE_TYPES.SPEED_BLOCK]: 5,
      [TILE_TYPES.XP_BLOCK]: 6,
      [TILE_TYPES.BERSERK_BLOCK]: 8,
      [TILE_TYPES.COMBO_BLOCK]: 9,
      [TILE_TYPES.LEGEND_BLOCK]: 10,
      [TILE_TYPES.ABILITY_BLOCK]: 7,
      [TILE_TYPES.ANCIENT_RELIC_CACHE]: 11,
    }),
    scale: 1,
    beautyAlpha: 1,
  }),
  bedrock: Object.freeze({
    seamMaterial: asset(
      "world-visual-v2-semantic-bedrock-seamless-v1",
      "sprites/backgrounds/world-visual-v2/semantic-decals-v1/bedrock-seamless-v1.webp?v=20260729a"
    ),
    material: asset(
      "tile-bedrock",
      "sprites/tiles/approved-world/bedrock-megalith-lock-v1.png"
    ),
    semantic: "bedrock",
    includesCaveWall: true,
    includesTownFloors: false,
    seamAlpha: 1,
    alpha: 0.54,
    lightingLift: 0.38,
    coolTint: 0xbddcff,
    coolTintStrength: 0.22,
  }),
  skyTile: Object.freeze({
    beautyAtlas: Object.freeze({
      ...asset(
        "world-visual-v2-semantic-sky-stars-floating-crystal-beauty-v2",
        "sprites/backgrounds/world-visual-v2/semantic-decals-v1/sky-stars-floating-crystal-beauty-v2.png?v=20260728a"
      ),
      columns: 3,
      frameSizePx: 256,
      frameCount: 6,
      framePrefix: "world-visual-v2-semantic-sky-star-crystal-beauty-",
    }),
    emissiveAtlas: Object.freeze({
      ...asset(
        "world-visual-v2-semantic-sky-stars-floating-crystal-emissive-v2",
        "sprites/backgrounds/world-visual-v2/semantic-decals-v1/sky-stars-floating-crystal-emissive-v2.png?v=20260728a"
      ),
      columns: 3,
      frameSizePx: 256,
      frameCount: 6,
      framePrefix: "world-visual-v2-semantic-sky-star-crystal-emissive-",
    }),
    scale: 1,
    beautyAlpha: 0.96,
    beautyBlendMode: "SCREEN",
    beautyReceivesTerrainTint: false,
    emissiveAlpha: 0.44,
    pulsePeriodMs: 2100,
    pulseAlphaRange: 0.18,
    idleMotion: Object.freeze({
      enabled: true,
      queryParam: "starIdle",
      queryEnableValues: Object.freeze(["1", "on", "true", "openrouter"]),
      queryDisableValues: Object.freeze(["0", "off", "false", "legacy"]),
      artSource: "OpenRouter google/veo-3.1-lite",
      atlas: Object.freeze({
        ...asset(
          "star-block-idle-motion-atlas-v1",
          "sprites/backgrounds/world-visual-v2/semantic-decals-v1/star-block-idle-motion-atlas-v1.png?v=20260826b"
        ),
        columns: 12,
        frameSizePx: 128,
        frameCount: 72,
        framesPerVariant: 24,
        variantCount: 3,
        framePrefix: "star-block-idle-motion-",
      }),
      framePeriodMs: 166.6667,
      transformPolicy: "fixed-anchor-frame-content-only",
      alpha: 0.26,
      scale: 1.08,
      blendMode: "ADD",
      ui: Object.freeze({
        animationKeyPrefix: "star-block-idle-ui-v2-",
        selectorAlpha: 0.12,
        selectedSelectorAlpha: 0.2,
        selectorScale: 1.06,
        previewAlpha: 0.24,
        previewScale: 1.1,
        phaseFrameStride: 5,
        repeat: -1,
      }),
    }),
  }),
  render: Object.freeze({
    bedrockSeamDepth: 2.268,
    bedrockDepth: 2.27,
    resourceDepth: 2.41,
    starBeautyDepth: 2.43,
    specialBeautyDepth: 2.44,
    starEmissiveDepth: 898,
    townFloorOccludedEmissiveDepth: 2.44,
    emissiveBlendMode: "ADD",
  }),
  performance: Object.freeze({
    // Resource identity is gameplay information. Keep every resource inside
    // the active streamed window resident; caps only protect explicit
    // comparison/fallback profiles that disable this invariant.
    preserveActiveWindowResources: true,
    maxVisibleResources: 192,
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

export function resolveWorldVisualSemanticStarIdleEnabled(
  config = WORLD_VISUAL_SEMANTIC_ASSETS,
  search = globalThis.location?.search || ""
) {
  const feature = config.skyTile?.idleMotion;
  if (!feature) return false;
  const value = new URLSearchParams(search)
    .get(feature.queryParam)
    ?.trim()
    .toLowerCase();
  if (value && feature.queryDisableValues.includes(value)) return false;
  if (value && feature.queryEnableValues.includes(value)) return true;
  return feature.enabled;
}

export function resolveWorldVisualSemanticSpecialFrame(
  tileType,
  depthTiles = 0,
  config = WORLD_VISUAL_SEMANTIC_ASSETS
) {
  if (depthTiles && typeof depthTiles === "object") {
    config = depthTiles;
    depthTiles = 0;
  }
  if (tileType === TILE_TYPES.GEM_POWER_BLOCK) {
    return getGemPowerBlockTier(depthTiles).semanticFrame;
  }
  const frame = config.specialBlocks.frameByTileType[tileType];
  return Number.isInteger(frame) ? frame : null;
}

export function getWorldVisualSemanticPreloadAssets(
  config = WORLD_VISUAL_SEMANTIC_ASSETS,
  search = globalThis.location?.search || ""
) {
  const starIdleAtlas = resolveWorldVisualSemanticStarIdleEnabled(config, search)
    ? config.skyTile.idleMotion.atlas
    : null;
  return [
    config.resources.atlas,
    config.bedrock.seamMaterial,
    config.bedrock.material,
    config.skyTile.beautyAtlas,
    config.skyTile.emissiveAtlas,
    starIdleAtlas,
    config.specialBlocks.beautyAtlas,
    config.specialBlocks.emissiveAtlas,
  ].filter(Boolean);
}
