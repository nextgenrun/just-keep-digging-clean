const asset = (key, path) => Object.freeze({ key, path });
const videoAsset = (key, path, dimensions) => Object.freeze({
  key,
  path,
  type: "video",
  dimensions,
});
const LIVING_BACKGROUND_DIMENSIONS = Object.freeze({ width: 1800, height: 534 });
const LIVING_BACKGROUND_ROOT = (
  "sprites/backgrounds/start-zone-scenic-v1/living-background-v1"
);
const LIVING_BACKGROUND_V2_ROOT = (
  "sprites/backgrounds/start-zone-scenic-v1/living-background-v2"
);
const livingBackgroundVariant = (
  id,
  filename,
  aliases,
  root = LIVING_BACKGROUND_ROOT,
  revision = "v1",
) => Object.freeze({
  id,
  aliases: Object.freeze(aliases),
  asset: videoAsset(
    `world-visual-surface-motion-${id}-${revision}`,
    `${root}/${filename}`,
    LIVING_BACKGROUND_DIMENSIONS,
  ),
});

const TOWN_LIVING_BACKGROUND_V1 = Object.freeze({
  enabled: true,
  queryParam: "surfaceMotion",
  defaultVariantId: "town-air",
  disableValues: Object.freeze(["0", "off", "false", "static", "none"]),
  loop: true,
  depthOffset: 0.005,
  pauseBelowAlpha: 0.01,
  expectedSource: LIVING_BACKGROUND_DIMENSIONS,
  groundIncluded: false,
  variants: Object.freeze([
    livingBackgroundVariant(
      "soft-canopy",
      "surface-soft-canopy-v1.mp4",
      ["1", "canopy", "soft-canopy"],
    ),
    livingBackgroundVariant(
      "town-air",
      "surface-town-air-v1.mp4",
      ["2", "mini", "town-air", "default"],
    ),
    livingBackgroundVariant(
      "layered-night",
      "surface-layered-night-v1.mp4",
      ["3", "layered", "layered-night"],
    ),
    livingBackgroundVariant(
      "natural-canopy",
      "surface-natural-canopy-v2.mp4",
      ["4", "natural", "async", "natural-canopy-v2"],
      LIVING_BACKGROUND_V2_ROOT,
      "v2",
    ),
    livingBackgroundVariant(
      "depth-breeze",
      "surface-depth-breeze-v2.mp4",
      ["5", "depth", "depth-breeze-v2"],
      LIVING_BACKGROUND_V2_ROOT,
      "v2",
    ),
    livingBackgroundVariant(
      "quiet-stars",
      "surface-quiet-stars-v2.mp4",
      ["6", "stars", "quiet", "quiet-stars-v2"],
      LIVING_BACKGROUND_V2_ROOT,
      "v2",
    ),
  ]),
});

const TOWN_BENCHMARK_V1 = Object.freeze({
  id: "town-benchmark-v1",
  worldAnchor: Object.freeze({
    leftTile: 0,
    widthTiles: 14,
  }),
  transition: Object.freeze({
    // Ground hands back over its final tile. The beauty plate preserves all
    // 1,672 approved source pixels, then fades only its 129 px mirrored edge.
    fadeTiles: 1,
    beautyFadeSourceWidthPx: 129,
    strips: 16,
  }),
  beauty: Object.freeze({
    asset: asset(
      "world-visual-surface-pack-town-benchmark-v1",
      "sprites/backgrounds/start-zone-scenic-v1/npc-town-scenic-composite-v2.webp"
    ),
    expectedSource: Object.freeze({ width: 1801, height: 941 }),
    sourceGroundY: 534,
    frameName: "world-visual-surface-pack-town-benchmark-v1-upper",
    depth: -4.2,
    minSourcePixelsPerWorldPixel: 1,
    maxWorldPixelsPerSourcePixel: 1,
    scaleReference: Object.freeze({
      sourceDoorHeightPx: 75,
      targetDoorHeightMeters: 2.1,
    }),
    verticalReveal: Object.freeze({
      // Feather only the otherwise-visible top edge into the continuous sky.
      // The authored town and its ground alignment remain fully opaque.
      topFeatherTiles: 0.75,
      // Keep the approved tree/town plate stable while it still owns most of
      // the surface view. Fade only as its feathered top edge approaches the
      // lower screen, preventing the former obvious image-to-image switch.
      fullAlphaEdgeViewportFraction: 0.42,
      zeroAlphaEdgeViewportFraction: 0.92,
    }),
  }),
  floor: Object.freeze({
    asset: asset(
      "world-visual-surface-pack-town-square-slate-strip-v3",
      "sprites/backgrounds/start-zone-scenic-v1/town-square-slate-strip-v3.png"
    ),
    expectedSource: Object.freeze({ width: 1801, height: 48 }),
    sourceRect: Object.freeze({ x: 0, y: 0, width: 1801, height: 48 }),
    approvedCoreSourceWidthPx: 1672,
    handoffSourceWidthPx: 129,
    surfaceOffsetSourcePx: 2,
    frameName: "world-visual-surface-pack-town-square-slate-strip-v3-floor",
    depth: 2.445,
    effectDepthStep: 0.001,
    minSourcePixelsPerWorldPixel: 1,
  }),
  ground: Object.freeze({
    asset: asset(
      "world-visual-surface-pack-town-ground-v1",
      "sprites/backgrounds/world-scenic-regions-v1/level1-ground-facade-01-v2.webp?v=benchmark-20260717"
    ),
    sourceCellPx: 94,
    columns: 14,
    rows: 10,
    frameName: "world-visual-surface-pack-town-ground-v1-crop",
    depth: 0.15,
  }),
  effects: Object.freeze({
    lightningBeautyAlpha: 0.42,
    lightningGroundAlpha: 0.24,
    wetGroundAlpha: 0.075,
    wetGroundTint: 0x82a9cf,
  }),
  motion: TOWN_LIVING_BACKGROUND_V1,
});

const TOWN_BENCHMARK_RELIEF_V1 = Object.freeze({
  ...TOWN_BENCHMARK_V1,
  id: "town-benchmark-relief-v1",
  beauty: Object.freeze({
    ...TOWN_BENCHMARK_V1.beauty,
    asset: asset(
      "world-visual-surface-pack-town-benchmark-relief-v1",
      "sprites/backgrounds/start-zone-scenic-v1/npc-town-scenic-composite-v2-relief-bake-v1.webp"
    ),
    frameName: "world-visual-surface-pack-town-benchmark-relief-v1-upper",
  }),
  motion: null,
});

export const WORLD_VISUAL_SURFACE_PACKS = Object.freeze({
  queryParam: "surfacePack",
  reliefQueryParam: "surfaceRelief",
  reliefEnabledValue: "1",
  defaultPackId: TOWN_BENCHMARK_V1.id,
  reliefPackId: TOWN_BENCHMARK_RELIEF_V1.id,
  benchmarkValues: Object.freeze([
    "benchmark",
    "town-benchmark",
    "town-benchmark-v1",
    "approved",
    "1",
  ]),
  currentValues: Object.freeze(["current", "current-v2", "split", "off", "0"]),
  packs: Object.freeze({
    [TOWN_BENCHMARK_V1.id]: TOWN_BENCHMARK_V1,
    [TOWN_BENCHMARK_RELIEF_V1.id]: TOWN_BENCHMARK_RELIEF_V1,
  }),
});

export function resolveWorldVisualSurfacePack(
  config = WORLD_VISUAL_SURFACE_PACKS,
  search = globalThis.location?.search || ""
) {
  const params = new URLSearchParams(search);
  const requested = params.get(config.queryParam)?.trim().toLowerCase();
  if (requested && config.currentValues.includes(requested)) return null;
  const reliefRequested = params.get(config.reliefQueryParam)?.trim().toLowerCase();
  if (reliefRequested === config.reliefEnabledValue) {
    return config.packs[config.reliefPackId];
  }
  if (requested && config.benchmarkValues.includes(requested)) {
    return config.packs[config.defaultPackId];
  }
  return config.packs[config.defaultPackId];
}

export function getWorldVisualSurfacePackPreloadAssets(config, search) {
  const pack = resolveWorldVisualSurfacePack(config, search);
  if (!pack) return [];
  const motion = resolveWorldVisualSurfaceMotion(pack, search);
  return [
    pack.beauty.asset,
    pack.floor.asset,
    pack.ground.asset,
    ...(motion ? [motion.asset] : []),
  ];
}

export function resolveWorldVisualSurfaceMotion(
  pack,
  search = globalThis.location?.search || "",
) {
  const config = pack?.motion;
  if (!config?.enabled || !Array.isArray(config.variants)) return null;
  const requested = new URLSearchParams(search)
    .get(config.queryParam)?.trim().toLowerCase();
  if (requested && config.disableValues.includes(requested)) return null;
  const selected = requested
    ? config.variants.find(variant => (
      variant.id === requested || variant.aliases.includes(requested)
    ))
    : null;
  return selected
    || config.variants.find(variant => variant.id === config.defaultVariantId)
    || config.variants[0]
    || null;
}
