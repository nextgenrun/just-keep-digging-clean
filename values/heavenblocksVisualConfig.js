import { ASSET_KEYS } from "./assetKeys.js";

const BIOME_KEYS = Object.freeze({
  cloudReef: "cloud-reef",
  haloBastion: "halo-bastion",
  eclipseScar: "eclipse-scar",
});

function makeBiomeVisual(id, folder, prefix, keys, tint) {
  const names = Object.freeze({
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
  });
  return Object.freeze({
    id,
    folder,
    prefix,
    names,
    keys,
    backgroundKey: keys.atmosphere,
    tint,
  });
}

export const HEAVENBLOCKS_VISUAL_CONFIG = Object.freeze({
  version: 2,
  nativeTileRenderer: true,
  bakedFacadeRuntime: false,
  assetBasePath: "sprites/heavenblocks-v2",
  backgroundBasePath: "sprites/backgrounds/heavenblocks-v2",
  render: Object.freeze({
    tileDepth: 0.45,
    crackDepth: 0.51,
    propDepth: 1.65,
    portalDepth: 1.9,
    shrineDepth: 1.8,
    barrierDepth: 1.95,
    backgroundDepth: -7.5,
    streamMarginTiles: 4,
    updateIntervalMs: 90,
    alternateChance: 0.34,
    crystalVariantChance: 0.28,
    sourceTileSizePx: 384,
  }),
  atmosphere: Object.freeze({
    displayWidthTiles: 18,
    displayHeightTiles: 12,
    regionWidthScale: 1.12,
    regionHeightScale: 0.92,
    alpha: 0.96,
    parallaxX: 0.04,
    parallaxY: 0.025,
    driftXTiles: 0.38,
    driftYTiles: 0.18,
    driftDurationMs: 7800,
    surfaceCullRows: 12,
    fadeMs: 520,
  }),
  discoveryFx: Object.freeze({
    durationMs: 1450,
    ringCount: 3,
    ringRadiusTiles: 2.8,
    particleCount: 26,
    flashAlpha: 0.72,
    labelDurationMs: 2600,
  }),
  artifacts: Object.freeze({
    propHeightTiles: 1.45,
    crystalHeightTiles: 1.3,
    capstoneHeightTiles: 1.7,
    shrineWidthTiles: 2.75,
    shrineHeightTiles: 2.55,
    portalWidthTiles: 2,
    portalHeightTiles: 2.15,
    componentSizeTiles: 1.05,
    inactivePortalAlpha: 0.3,
    activePortalAlpha: 0.98,
    lockedTint: 0x495161,
    pulseDurationMs: 1100,
    arrivalTitleDurationMs: 2800,
    unlockTitleDurationMs: 3200,
    titleY: 126,
  }),
  biomes: Object.freeze({
    [BIOME_KEYS.cloudReef]: makeBiomeVisual(
      BIOME_KEYS.cloudReef,
      "cloud-reef",
      "cloud",
      ASSET_KEYS.heavenblocks.cloudReef,
      0xbfefff
    ),
    [BIOME_KEYS.haloBastion]: makeBiomeVisual(
      BIOME_KEYS.haloBastion,
      "halo-bastion",
      "halo",
      ASSET_KEYS.heavenblocks.haloBastion,
      0xffe7a6
    ),
    [BIOME_KEYS.eclipseScar]: makeBiomeVisual(
      BIOME_KEYS.eclipseScar,
      "eclipse-scar",
      "eclipse",
      ASSET_KEYS.heavenblocks.eclipseScar,
      0xff456c
    ),
  }),
  backgroundFiles: Object.freeze({
    [BIOME_KEYS.cloudReef]: "cloud-reef-atmosphere-v2.webp",
    [BIOME_KEYS.haloBastion]: "halo-bastion-atmosphere-v2.webp",
    [BIOME_KEYS.eclipseScar]: "eclipse-scar-atmosphere-v2.webp",
  }),
});
