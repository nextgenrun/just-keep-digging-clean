import { WORLD_VISUAL_SURFACE_PROPS } from "./worldVisualSurfaceProps.js";

export const WORLD_VISUAL_SURFACE_SKY_PROPS_V3 = Object.freeze({
  enabled: true,
  version: "surface-sky-props-v3-camera-composed-2026-07-29",
  query: Object.freeze({
    all: "surfaceSkyPropsV3",
    surface: "surfacePropsV3",
    sky: "skyPropsV3",
    disabledValue: "0",
  }),
  scale: Object.freeze({
    minimumSourcePixelsPerWorldPixel: 1.75,
    sizeVariants: Object.freeze({
      small: 0.86,
      standard: 1,
      large: 1.18,
      feature: 1.32,
    }),
    lanePerspective: Object.freeze({
      rear: 0.88,
      mid: 1,
      front: 1.08,
    }),
    distanceByLane: Object.freeze({
      rear: "far",
      mid: "middle",
      front: "near",
    }),
  }),
  surface: Object.freeze({
    grounding: WORLD_VISUAL_SURFACE_PROPS.grounding,
    streaming: Object.freeze({
      horizontalMarginTiles: 5,
      surfaceVisibilityMarginRows: 8,
    }),
    renderDepths: Object.freeze({
      rear: 6.35,
      mid: 12.35,
      front: 21.35,
    }),
    alphaByLane: Object.freeze({
      rear: 0.82,
      mid: 0.95,
      front: 1,
    }),
  }),
  sky: Object.freeze({
    streamingMarginTiles: 4,
    portalIslandDepths: Object.freeze({
      rear: 0.45,
      mid: 0.85,
      front: 1.25,
    }),
    heavenblockDepths: Object.freeze({
      rear: 5.8,
      mid: 6.2,
      front: 6.6,
    }),
    alphaByLane: Object.freeze({
      rear: 0.78,
      mid: 0.93,
      front: 1,
    }),
  }),
});

function queryEnabled(params, key, disabledValue) {
  return params.get(key) !== disabledValue;
}

export function resolveWorldVisualSurfaceSkyPropsV3Enabled(
  config = WORLD_VISUAL_SURFACE_SKY_PROPS_V3,
  search = globalThis.location?.search || "",
) {
  if (!config.enabled) return Object.freeze({ all: false, surface: false, sky: false });
  const params = new URLSearchParams(search);
  const all = queryEnabled(params, config.query.all, config.query.disabledValue);
  return Object.freeze({
    all,
    surface: all && queryEnabled(params, config.query.surface, config.query.disabledValue),
    sky: all && queryEnabled(params, config.query.sky, config.query.disabledValue),
  });
}
