const profile = (sharpness, reliefStrength, reliefRadiusPx, vibrance, shadowLift) =>
  Object.freeze({ sharpness, reliefStrength, reliefRadiusPx, vibrance, shadowLift });

export const FULL_WORLD_MATERIAL_CONFIG = Object.freeze({
  queryParam: "fullWorldMaterials",
  enabledValue: "1",
  pipelineKey: "jkd-full-world-material-v1",
  profiles: Object.freeze({
    surface: profile(0.34, 0.10, 1.15, 0.055, 0.012),
    shallow: profile(0.40, 0.14, 1.30, 0.050, 0.016),
    deep: profile(0.46, 0.18, 1.50, 0.042, 0.020),
  }),
  depth: Object.freeze({
    shallowStartMeters: 12,
    deepStartMeters: 320,
    fullDeepMeters: 900,
  }),
  relief: Object.freeze({
    directionX: -0.58,
    directionY: -0.82,
    gradientGain: 2.6,
    ceiling: 0.095,
  }),
  tone: Object.freeze({
    highlightCompression: 0.025,
    detailCeiling: 0.12,
  }),
  performance: Object.freeze({
    updateIntervalMs: 250,
    disableBelowFps: 36,
    lowFpsChecksToDisable: 6,
  }),
});

export function isFullWorldMaterialReviewEnabled(
  search = globalThis.location?.search || "",
  config = FULL_WORLD_MATERIAL_CONFIG,
) {
  return new URLSearchParams(search).get(config.queryParam) === config.enabledValue;
}

export function resolveFullWorldMaterialDepthBlend(depthMeters, config = FULL_WORLD_MATERIAL_CONFIG) {
  const depth = Math.max(0, Number(depthMeters) || 0);
  const { shallowStartMeters, deepStartMeters, fullDeepMeters } = config.depth;
  if (depth <= shallowStartMeters) return Object.freeze({ shallow: 0, deep: 0 });
  const shallow = Math.min(1, (depth - shallowStartMeters) / Math.max(1, deepStartMeters - shallowStartMeters));
  const deep = Math.min(1, Math.max(0, (depth - deepStartMeters) / Math.max(1, fullDeepMeters - deepStartMeters)));
  return Object.freeze({ shallow, deep });
}
