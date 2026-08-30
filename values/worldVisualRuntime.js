import {
  WORLD_VISUAL_SURFACE_PACKS,
  getWorldVisualSurfacePackPreloadAssets,
  resolveWorldVisualSurfacePack,
} from "./worldVisualSurfacePacks.js?rev=20260826-surface-motion-v2";

const SURFACE_GROUND_VARIATION_ROOT = (
  "sprites/backgrounds/world-visual-v2/surface/surface-ground-variation-v5"
);
const surfaceGroundVariationAsset = stem => Object.freeze({
  key: `world-visual-surface-ground-variation-v5-${stem}`,
  path: `${SURFACE_GROUND_VARIATION_ROOT}/${stem}.webp`,
});
const SURFACE_GROUND_VARIATION_ASSETS = Object.freeze([
  "surface-rain-polished-slate-and-loam-v5",
  "surface-mossy-stone-root-break-v5",
  "surface-weathered-cobble-clay-v5",
  "surface-frost-wet-slate-v5",
  "surface-ironwater-gravel-v5",
  "surface-storm-scoured-earth-v5",
  "surface-orchard-root-stone-v5",
  "surface-broken-town-slate-v5",
  "surface-mist-soaked-peat-stone-v5",
  "surface-eastern-expedition-rock-v5",
].map(surfaceGroundVariationAsset));

export const WORLD_VISUAL_RUNTIME_MODES = Object.freeze({
  scenic: "scenic-v2",
  legacy: "legacy",
});

export const WORLD_VISUAL_RUNTIME = Object.freeze({
  defaultMode: WORLD_VISUAL_RUNTIME_MODES.scenic,
  queryParam: "worldVisualRuntime",
  legacyValues: Object.freeze(["legacy", "tiled", "tiles", "old"]),
  scenicValues: Object.freeze(["scenic", "scenic-v2", "new", "v2"]),
  streaming: Object.freeze({
    updateIntervalMs: 50,
    maskMarginTiles: 2,
    feedbackMarginTiles: 1,
    signatureSnapTiles: 2,
    reduceBelowFps: 44,
    recoverReducedAboveFps: 50,
    maxVisibleResourceVeins: 72,
    maxVisibleDamageCells: 48,
    stableWindowScheduler: Object.freeze({
      enabled: true,
      queryParam: "scenicStreamScheduler",
      queryEnableValues: Object.freeze(["1", "on", "true"]),
      queryDisableValues: Object.freeze(["0", "off", "false"]),
      syncMetricName: "scenic-world-sync",
    }),
    assetLoadScheduler: Object.freeze({
      enabled: true,
      queryParam: "scenicAssetScheduler",
      queryEnableValues: Object.freeze(["1", "on", "true"]),
      queryDisableValues: Object.freeze(["0", "off", "false"]),
      maxAssetsPerBatch: 1,
      loaderCompleteEvent: "complete",
    }),
    demandAssetStreaming: Object.freeze({
      enabled: true,
      queryParam: "scenicDemandStreaming",
      queryEnableValues: Object.freeze(["1", "on", "true"]),
      queryDisableValues: Object.freeze(["0", "off", "false"]),
      // Every feather depends on its adjacent card. Request one complete ring
      // so a slow asset swap can never reveal the black blend matte.
      neighborSegments: 1,
    }),
  }),
  render: Object.freeze({
    farDepth: -10,
    cloudDepth: -8.8,
    townDepth: -4.2,
    caveBackdropDepth: -3.5,
    terrainDepth: 0.1,
    terrainEdgeDepth: 0.2,
    surfaceEdgeDepth: 2.2,
    physicalEffectDepth: 2.4,
    feedbackDepth: 2.45,
    emissiveDepth: 898,
  }),
  surface: Object.freeze({
    farSegmentWidthTiles: 30,
    // The 1672px far plate carries a wider scenic vignette than the depth
    // cards. This includes the 209px mask feather plus a 335px safe handoff
    // and a small opaque guard, without scaling the source above 1:1.
    farSegmentOverlapPx: 576,
    farMaxSourceScale: 1,
    townLeftTile: 0,
    townWidthTiles: 20,
    townMaxSourceScale: 1,
    townBaselineFraction: 727 / 941,
    edgeSegmentWidthTiles: 21.4016,
    edgeMaxSourceScale: 1,
    edgeTopFraction: 2 / 48,
    edgeOverlapPx: 3,
    surfaceEdgeFeature: Object.freeze({
      enabled: true,
      queryParam: "surfaceEdge",
      queryEnableValues: Object.freeze(["1", "on", "true", "legacy"]),
      queryDisableValues: Object.freeze(["0", "off", "false", "removed"]),
    }),
    surfaceGroundVariation: Object.freeze({
      // Keep the exact Town Square slate underneath as the stable ground
      // baseline. These transparent, terrain-masked ImageGen strips only add
      // top-soil variation and retain their authored three-tile alpha handoff.
      enabled: true,
      queryParam: "surfaceGroundVariation",
      queryEnableValues: Object.freeze(["1", "on", "true", "v5"]),
      queryDisableValues: Object.freeze(["0", "off", "false", "legacy"]),
      expectedSourceWidthPx: 1536,
      expectedSourceHeightPx: 160,
      maxSourceScale: 1,
      overlapPx: 192,
      stridePx: 1344,
      edgeTopFraction: 0,
      assets: SURFACE_GROUND_VARIATION_ASSETS,
    }),
  }),
  assets: Object.freeze({
    far: Object.freeze({
      key: "world-visual-v2-far-moonlit-mountains",
      path: "sprites/backgrounds/world-visual-v2/far/moonlit-mountain-forest-v1.png",
    }),
    town: Object.freeze({
      key: "world-visual-v2-town-hero",
      path: "sprites/backgrounds/world-visual-v2/mid/town-row-hero-v1.png",
    }),
    surfaceEdge: Object.freeze({
      key: "world-visual-v2-town-surface-edge-thin-v2",
      path: "sprites/backgrounds/world-visual-v2/surface/town-surface-edge-thin-v2.png",
    }),
  }),
  surfacePacks: WORLD_VISUAL_SURFACE_PACKS,
});

export function resolveWorldVisualRuntimeMode(
  config = WORLD_VISUAL_RUNTIME,
  search = globalThis.location?.search || ""
) {
  const value = new URLSearchParams(search).get(config.queryParam)?.trim().toLowerCase();
  if (value && config.legacyValues.includes(value)) return WORLD_VISUAL_RUNTIME_MODES.legacy;
  if (value && config.scenicValues.includes(value)) return WORLD_VISUAL_RUNTIME_MODES.scenic;
  return config.defaultMode;
}

export function isScenicWorldVisualRuntime(config = WORLD_VISUAL_RUNTIME, search) {
  return resolveWorldVisualRuntimeMode(config, search) === WORLD_VISUAL_RUNTIME_MODES.scenic;
}

export function resolveScenicStableWindowSchedulerEnabled(
  config = WORLD_VISUAL_RUNTIME.streaming.stableWindowScheduler,
  search = globalThis.location?.search || ""
) {
  const value = new URLSearchParams(search).get(config.queryParam)?.trim().toLowerCase();
  if (value && config.queryDisableValues.includes(value)) return false;
  if (value && config.queryEnableValues.includes(value)) return true;
  return config.enabled;
}

export function resolveScenicAssetSchedulerEnabled(
  config = WORLD_VISUAL_RUNTIME.streaming.assetLoadScheduler,
  search = globalThis.location?.search || ""
) {
  const value = new URLSearchParams(search).get(config.queryParam)?.trim().toLowerCase();
  if (value && config.queryDisableValues.includes(value)) return false;
  if (value && config.queryEnableValues.includes(value)) return true;
  return config.enabled;
}

export function resolveScenicDemandAssetStreamingEnabled(
  config = WORLD_VISUAL_RUNTIME.streaming.demandAssetStreaming,
  search = globalThis.location?.search || ""
) {
  const value = new URLSearchParams(search).get(config.queryParam)?.trim().toLowerCase();
  if (value && config.queryDisableValues.includes(value)) return false;
  if (value && config.queryEnableValues.includes(value)) return true;
  return config.enabled;
}

export function resolveWorldVisualSurfaceEdgeEnabled(
  config = WORLD_VISUAL_RUNTIME,
  search = globalThis.location?.search || ""
) {
  const feature = config.surface.surfaceEdgeFeature;
  const value = new URLSearchParams(search).get(feature.queryParam)?.trim().toLowerCase();
  if (value && feature.queryDisableValues.includes(value)) return false;
  if (value && feature.queryEnableValues.includes(value)) return true;
  return feature.enabled;
}

export function resolveWorldVisualSurfaceGroundVariationEnabled(
  config = WORLD_VISUAL_RUNTIME,
  search = globalThis.location?.search || ""
) {
  if (!resolveWorldVisualSurfaceEdgeEnabled(config, search)) return false;
  const feature = config.surface.surfaceGroundVariation;
  if (!feature) return false;
  const value = new URLSearchParams(search).get(feature.queryParam)?.trim().toLowerCase();
  if (value && feature.queryDisableValues.includes(value)) return false;
  if (value && feature.queryEnableValues.includes(value)) return true;
  return feature.enabled;
}

export function getWorldVisualPreloadAssets(
  config = WORLD_VISUAL_RUNTIME,
  search = globalThis.location?.search || ""
) {
  const includeSurfaceEdge = resolveWorldVisualSurfaceEdgeEnabled(config, search);
  const surfacePack = resolveWorldVisualSurfacePack(config.surfacePacks, search);
  const baseAssets = Object.entries(config.assets)
    .filter(([name]) => name !== "surfaceEdge" || includeSurfaceEdge)
    .filter(([name]) => name !== "town" || !surfacePack)
    .map(([, asset]) => asset);
  return [
    ...baseAssets,
    ...(resolveWorldVisualSurfaceGroundVariationEnabled(config, search)
      ? config.surface.surfaceGroundVariation.assets
      : []),
    ...getWorldVisualSurfacePackPreloadAssets(config.surfacePacks, search),
  ];
}
