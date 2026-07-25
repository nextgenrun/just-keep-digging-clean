const asset = (key, path) => Object.freeze({ key, path });

const TOWN_BENCHMARK_V1 = Object.freeze({
  id: "town-benchmark-v1",
  worldAnchor: Object.freeze({
    leftTile: 0,
    widthTiles: 14,
  }),
  transition: Object.freeze({
    // The approved v1 composition occupies the first 13 tiles. The v2 asset's
    // mirrored fourteenth tile exists only to hand that composition back to the
    // continuous scenic world without exposing a vertical card edge.
    fadeTiles: 1,
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
    verticalReveal: Object.freeze({
      // Feather only the otherwise-visible top edge into the continuous sky.
      // The authored town and its ground alignment remain fully opaque.
      topFeatherTiles: 0.75,
      fullAlphaEdgeViewportFraction: 0.12,
      zeroAlphaEdgeViewportFraction: 0.52,
    }),
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
});

export const WORLD_VISUAL_SURFACE_PACKS = Object.freeze({
  queryParam: "surfacePack",
  defaultPackId: TOWN_BENCHMARK_V1.id,
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
  }),
});

export function resolveWorldVisualSurfacePack(
  config = WORLD_VISUAL_SURFACE_PACKS,
  search = globalThis.location?.search || ""
) {
  const requested = new URLSearchParams(search).get(config.queryParam)?.trim().toLowerCase();
  if (requested && config.currentValues.includes(requested)) return null;
  if (requested && config.benchmarkValues.includes(requested)) {
    return config.packs[config.defaultPackId];
  }
  return config.packs[config.defaultPackId];
}

export function getWorldVisualSurfacePackPreloadAssets(config, search) {
  const pack = resolveWorldVisualSurfacePack(config, search);
  return pack ? [pack.beauty.asset, pack.ground.asset] : [];
}
