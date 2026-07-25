import {
  WORLD_VISUAL_SURFACE_PACKS,
  getWorldVisualSurfacePackPreloadAssets,
  resolveWorldVisualSurfacePack,
} from "./worldVisualSurfacePacks.js";

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
    maxVisibleResourceVeins: 72,
    maxVisibleDamageCells: 48,
  }),
  render: Object.freeze({
    farDepth: -10,
    cloudDepth: -8.8,
    townDepth: -4.2,
    caveBackdropDepth: -3.5,
    terrainDepth: 0.1,
    terrainEdgeDepth: 0.2,
    surfaceEdgeDepth: 2.2,
    rootOverlayDepth: 2.32,
    physicalEffectDepth: 2.4,
    feedbackDepth: 2.45,
    emissiveDepth: 898,
  }),
  surface: Object.freeze({
    farSegmentWidthTiles: 30,
    farSegmentOverlapPx: 4,
    farMaxSourceScale: 1,
    townLeftTile: 0,
    townWidthTiles: 20,
    townBaselineFraction: 727 / 941,
    edgeSegmentWidthTiles: 17.78,
    edgeTopFraction: 370 / 941,
    edgeOverlapPx: 3,
    surfaceEdgeFeature: Object.freeze({
      enabled: false,
      queryParam: "surfaceEdge",
      queryEnableValues: Object.freeze(["1", "on", "true", "legacy"]),
      queryDisableValues: Object.freeze(["0", "off", "false", "removed"]),
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
      key: "world-visual-v2-town-surface-edge",
      path: "sprites/backgrounds/world-visual-v2/surface/town-surface-edge-v1.png",
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
    ...getWorldVisualSurfacePackPreloadAssets(config.surfacePacks, search),
  ];
}
