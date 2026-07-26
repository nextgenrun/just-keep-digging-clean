import { HEAVENBLOCKS_WORLD_CONFIG } from "./heavenblocksWorldConfig.js";

function freezeLayer(key, path, depth, alpha = 1, overscan = 1) {
  return Object.freeze({
    key,
    path,
    depth,
    alpha,
    overscan,
  });
}

function freezeRegion(worldRegion) {
  const visual = HEAVENBLOCKS_WORLD_CONFIG.visual;
  return Object.freeze({
    id: worldRegion.id,
    label: worldRegion.label,
    levelId: worldRegion.levelId,
    leftTile: worldRegion.leftTile,
    topTile: worldRegion.topTile,
    widthTiles: worldRegion.widthTiles,
    heightTiles: worldRegion.heightTiles,
    displayWidthPx: worldRegion.displayWidthPx,
    displayHeightPx: worldRegion.displayHeightPx,
    arrival: worldRegion.arrival,
    layers: Object.freeze([
      freezeLayer(
        worldRegion.backdropKey,
        worldRegion.backdropPath,
        visual.backdropDepth,
        1,
        visual.backdropOverscan,
      ),
    ]),
  });
}

export const HEAVENBLOCKS_VISUAL_CONFIG = Object.freeze({
  enabled: true,
  queryParam: "heavenblocksVisuals",
  tileSize: HEAVENBLOCKS_WORLD_CONFIG.tileSize,
  worldConfigVersion: HEAVENBLOCKS_WORLD_CONFIG.version,
  visualOnly: false,
  collisionWired: true,
  accessWired: true,
  craftingWired: true,
  nativeTileMaskWired: true,
  nativeTileRenderer: true,
  bakedFacadeRuntime: false,
  regions: Object.freeze(HEAVENBLOCKS_WORLD_CONFIG.regions.map(freezeRegion)),
});

export function resolveHeavenblocksVisualsEnabled(
  config = HEAVENBLOCKS_VISUAL_CONFIG,
  search = globalThis.location?.search || "",
) {
  const rawValue = new URLSearchParams(search).get(config.queryParam);
  if (rawValue === null) return config.enabled;

  const value = rawValue.trim().toLowerCase();
  if (["0", "false", "off", "no"].includes(value)) return false;
  if (["1", "true", "on", "yes"].includes(value)) return true;
  return config.enabled;
}
