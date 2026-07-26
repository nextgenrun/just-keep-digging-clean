export const WORLD_VISUAL_SURFACE_PROPS = Object.freeze({
  enabled: true,
  version: "surface-props-v2-approved-mockup-3-midtone-safe",
  query: Object.freeze({
    all: "surfaceProps",
    level1: "surfacePropsL1",
    level2: "surfacePropsL2",
    disabledValue: "0",
  }),
  scale: Object.freeze({
    minimumSourcePixelsPerWorldPixel: 2.25,
  }),
  grounding: Object.freeze({
    scanRowsAboveSurface: 4,
    scanRowsBelowSurface: 8,
    sampleHalfWidthRatio: 0.34,
    maximumSampleHalfWidthTiles: 0.72,
    maximumGroundDeltaWorldPx: 2,
    groundSinkWorldPx: 1,
  }),
  streaming: Object.freeze({
    horizontalMarginTiles: 4,
    surfaceVisibilityMarginRows: 7,
  }),
  renderDepths: Object.freeze({
    rear: 6,
    mid: 12,
    front: 21,
  }),
  alphaByLane: Object.freeze({
    rear: 1,
    mid: 1,
    front: 0.94,
  }),
  coverage: Object.freeze({
    maximumUncoveredGapTiles: 0.5,
  }),
});

function queryEnabled(params, key, disabledValue) {
  return params.get(key) !== disabledValue;
}

export function resolveWorldVisualSurfacePropsEnabled(
  config = WORLD_VISUAL_SURFACE_PROPS,
  search = globalThis.location?.search || "",
) {
  if (!config.enabled) return Object.freeze({ all: false, level1: false, level2: false });
  const params = new URLSearchParams(search);
  const all = queryEnabled(params, config.query.all, config.query.disabledValue);
  return Object.freeze({
    all,
    level1: all && queryEnabled(params, config.query.level1, config.query.disabledValue),
    level2: all && queryEnabled(params, config.query.level2, config.query.disabledValue),
  });
}
