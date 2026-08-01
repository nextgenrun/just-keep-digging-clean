export const WORLD_VISUAL_SURFACE_PROPS = Object.freeze({
  enabled: true,
  version: "surface-props-v6-camera-composed-chapters",
  query: Object.freeze({
    all: "surfaceProps",
    level1: "surfacePropsL1",
    level2: "surfacePropsL2",
    disabledValue: "0",
  }),
  scale: Object.freeze({
    minimumSourcePixelsPerWorldPixel: 2.25,
    sizeVariants: Object.freeze({
      small: 0.84,
      standard: 1,
      large: 1.10,
    }),
    lanePerspective: Object.freeze({
      rear: 0.93,
      mid: 1,
      front: 1.06,
    }),
    distanceByLane: Object.freeze({
      rear: "far",
      mid: "middle",
      front: "near",
    }),
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
    rear: 0.88,
    mid: 0.97,
    front: 1,
  }),
  coverage: Object.freeze({
    maximumUncoveredGapTiles: 3,
  }),
  exclusions: Object.freeze({
    titanGalleryPaddingTiles: 2,
    titanStatueFootingPaddingTiles: 0.12,
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
