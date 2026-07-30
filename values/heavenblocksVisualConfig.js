import { ASSET_KEYS } from "./assetKeys.js";
import { HEAVENBLOCK_REGION_IDS } from "./heavenblocksProgressionConfig.js";

function freezeBiome({
  id,
  folder,
  prefix,
  keys,
  tint,
}) {
  return Object.freeze({
    id,
    folder,
    prefix,
    keys,
    tint,
    files: Object.freeze({
      interior: `${prefix}-terrain-interior-v2.webp`,
      alternate: `${prefix}-terrain-alternate-v2.webp`,
      ore: `${prefix}-terrain-ore-v2.webp`,
      crystal: `${prefix}-terrain-crystal-v2.webp`,
      surface: `${prefix}-terrain-surface-v2.webp`,
      edgeLeft: `${prefix}-terrain-edge-left-v2.webp`,
      edgeRight: `${prefix}-terrain-edge-right-v2.webp`,
      underside: `${prefix}-terrain-underside-v2.webp`,
      flora: `${prefix}-prop-flora-v2.webp`,
      crystalCluster: `${prefix}-prop-crystal-cluster-v2.webp`,
      shrine: `${prefix}-heart-shrine-v2.webp`,
      portal: `${prefix}-portal-v2.webp`,
      barrier: `${prefix}-barrier-v2.webp`,
      relicVault: `${prefix}-relic-vault-v2.webp`,
      component: `${prefix}-craft-component-v2.webp`,
      capstone: `${prefix}-capstone-v2.webp`,
    }),
  });
}

const BIOMES = Object.freeze({
  [HEAVENBLOCK_REGION_IDS.LOWER_SKY]: freezeBiome({
    id: HEAVENBLOCK_REGION_IDS.LOWER_SKY,
    folder: "cloud-reef",
    prefix: "cloud",
    keys: ASSET_KEYS.heavenblocks.cloudReef,
    tint: 0xbfefff,
  }),
  [HEAVENBLOCK_REGION_IDS.ANGEL]: freezeBiome({
    id: HEAVENBLOCK_REGION_IDS.ANGEL,
    folder: "halo-bastion",
    prefix: "halo",
    keys: ASSET_KEYS.heavenblocks.haloBastion,
    tint: 0xffe7a6,
  }),
  [HEAVENBLOCK_REGION_IDS.DEVIL]: freezeBiome({
    id: HEAVENBLOCK_REGION_IDS.DEVIL,
    folder: "eclipse-scar",
    prefix: "eclipse",
    keys: ASSET_KEYS.heavenblocks.eclipseScar,
    tint: 0xff456c,
  }),
});

export const HEAVENBLOCKS_VISUAL_CONFIG = Object.freeze({
  version: 2,
  enabled: true,
  queryParam: "heavenblocksVisuals",
  nativeTileRenderer: true,
  bakedFacadeRuntime: false,
  assetBasePath: "sprites/heavenblocks-v2",
  render: Object.freeze({
    tileDepth: 0.45,
    crackDepth: 0.51,
    propDepth: 1.65,
    portalDepth: 1.9,
    shrineDepth: 1.8,
    barrierDepth: 1.95,
    streamMarginTiles: 4,
    updateIntervalMs: 90,
    alternateChance: 0.34,
    crystalVariantChance: 0.28,
    relicDisplayScale: 1.28,
    barrierDisplayScale: 1.12,
    tileDisplayScale: 1.045,
    relicAuraScale: 1.62,
    barrierAuraScale: 1.3,
    damageOverlayAlpha: 0.84,
  }),
  discoveryFx: Object.freeze({
    durationMs: 1450,
    ringCount: 3,
    ringStartRadiusTiles: 0.28,
    ringRadiusTiles: 2.8,
    ringRadiusStepTiles: 0.7,
    ringDelayStepMs: 150,
    ringStrokeTiles: 0.035,
    ringMinimumStrokePx: 2,
    ringDepthOffset: 0.2,
    particleCount: 26,
    particleSizeTiles: 0.22,
    particleStartDistanceTiles: 1.1,
    particleDistanceStepTiles: 0.28,
    particleDistanceVariants: 5,
    particleDepthOffset: 0.24,
    particleRotationBaseDegrees: 180,
    particleRotationStepDegrees: 17,
    cameraFlashDurationMs: 260,
    cameraShakeDurationMs: 180,
    cameraShakeIntensity: 0.004,
    labelDurationMs: 2600,
  }),
  artifacts: Object.freeze({
    propHeightTiles: 1.45,
    crystalHeightTiles: 1.3,
    capstoneHeightTiles: 1.7,
    propFloorSearchUpTiles: 3,
    propFloorSearchDownTiles: 8,
    shrineWidthTiles: 2.75,
    shrineHeightTiles: 2.55,
    componentSizeTiles: 1.05,
    componentOffsetTiles: 1.38,
    componentFloatTiles: 0.12,
    componentLockedAlpha: 0.46,
    componentReadyAlpha: 0.95,
    componentInstalledAlpha: 1,
    portalWidthTiles: 2,
    portalHeightTiles: 2.15,
    inactivePortalAlpha: 0.3,
    activePortalAlpha: 0.98,
    portalPulseAlpha: 0.74,
    portalPulseScale: 1.04,
    lockedTint: 0x495161,
    pulseDurationMs: 1100,
    componentSpinDurationMultiplier: 4,
    arrivalTitleDurationMs: 2800,
    unlockTitleDurationMs: 3200,
    titleFadeMs: 260,
    titleY: 126,
    titleDepth: 3600,
    titleFontSizePx: 28,
    titleStrokeThickness: 7,
    titleFontFamily: "Bahnschrift SemiCondensed, Trebuchet MS, sans-serif",
    titleFontStyle: "bold",
    titleStrokeColor: "#06101a",
    titleLetterSpacing: 1.4,
    titleStartScale: 0.86,
  }),
  biomes: BIOMES,
});

export function resolveHeavenblocksVisualsEnabled(
  config = HEAVENBLOCKS_VISUAL_CONFIG,
  search = globalThis.location?.search || "",
) {
  const raw = new URLSearchParams(search).get(config.queryParam);
  if (raw === null) return config.enabled;
  const normalized = raw.trim().toLowerCase();
  if (["0", "false", "off", "no"].includes(normalized)) return false;
  if (["1", "true", "on", "yes"].includes(normalized)) return true;
  return config.enabled;
}

export function getHeavenblocksNativePreloadAssets(
  config = HEAVENBLOCKS_VISUAL_CONFIG,
) {
  const assets = [];
  for (const biome of Object.values(config.biomes)) {
    for (const [role, file] of Object.entries(biome.files)) {
      assets.push(Object.freeze({
        key: biome.keys[role],
        path: `${config.assetBasePath}/${biome.folder}/${file}`,
      }));
    }
  }
  return Object.freeze(assets);
}
