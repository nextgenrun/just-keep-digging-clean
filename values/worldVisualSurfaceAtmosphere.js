const anchor = (
  id,
  kind,
  frameIndex,
  tileX,
  yOffsetTiles,
  lane,
  widthTiles,
  heightTiles,
  alpha,
  periodMs,
  riseTiles,
  driftTiles,
  phase,
) => Object.freeze({
  id,
  kind,
  frameIndex,
  tileX,
  yOffsetTiles,
  lane,
  widthTiles,
  heightTiles,
  alpha,
  periodMs,
  riseTiles,
  driftTiles,
  phase,
});

export const WORLD_VISUAL_SURFACE_ATMOSPHERE = Object.freeze({
  enabled: true,
  version: "surface-atmosphere-v1-additive-prop-anchors",
  query: Object.freeze({
    own: "surfaceAtmosphere",
    parent: "surfaceProps",
    disabledValue: "0",
  }),
  textureSheet: "atmosphere",
  renderDepths: Object.freeze({
    rear: 7,
    mid: 13,
    front: 20.5,
  }),
  streaming: Object.freeze({
    horizontalMarginTiles: 5,
    surfaceVisibilityMarginRows: 7,
  }),
  motion: Object.freeze({
    windWorldPxScale: 0.0015,
    minimumScale: 0.82,
    maximumScale: 1.18,
    groundPulseAmount: 0.08,
  }),
  anchors: Object.freeze([
    anchor("arrival-forge-smoke", "smoke", 4, 155.8, -1.32, "rear", 1.10, 1.00, 0.19, 5600, 0.72, 0.36, 0.13),
    anchor("caravan-kitchen-steam", "steam", 8, 167.1, -0.78, "mid", 0.92, 0.82, 0.15, 4700, 0.56, 0.25, 0.47),
    anchor("starwell-ground-mist", "groundMist", 10, 194.1, -0.03, "front", 2.45, 0.42, 0.08, 9200, 0.05, 0.30, 0.71),
    anchor("timberwright-dust", "groundMist", 11, 207.8, -0.02, "rear", 2.05, 0.38, 0.055, 10800, 0.04, 0.24, 0.32),
    anchor("observatory-haze", "groundMist", 10, 229.8, -0.04, "rear", 2.70, 0.40, 0.06, 11800, 0.03, 0.34, 0.88),
    anchor("expedition-smoke", "smoke", 6, 272.6, -1.24, "rear", 1.00, 0.94, 0.17, 6100, 0.68, 0.42, 0.56),
  ]),
});

export function resolveWorldVisualSurfaceAtmosphereEnabled(
  config = WORLD_VISUAL_SURFACE_ATMOSPHERE,
  search = globalThis.location?.search || "",
) {
  if (!config.enabled) return false;
  const params = new URLSearchParams(search);
  return params.get(config.query.own) !== config.query.disabledValue
    && params.get(config.query.parent) !== config.query.disabledValue;
}
