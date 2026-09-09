/** Contact-local feedback; no damage, reach, collider or playback-speed authority. */
export const DIG_IMPACT_FX_CONFIG = Object.freeze({
  enabled: true,
  queryParam: "digImpact",
  disabledValues: Object.freeze(["0", "false", "off", "legacy"]),
  requiredPipeline: "survival-unified-animation-runtime-v1",
  postUpdateEvent: "postupdate",
  presentedEvent: "dig-impact-presented",
  reducedMotionMediaQuery: "(prefers-reduced-motion: reduce)",
  maxLive: 48,
  maxPending: 8,
  rememberedContacts: 32,
  depthOffset: 0.8,
  minimumDepth: 38.5,
  faceInsetTiles: 0.008,
  fallbackStrength: 0.86,
  directionEpsilon: 0.001,
  breakStrength: 0.88,
  flash: Object.freeze({
    firstFrame: "p01", secondFrame: "p02",
    originX: 0.5, originY: 0.73,
    widthTiles: 0.38,
    alpha: 0.96, reducedAlpha: 0.68,
    startScale: 0.82, peakScale: 1.04, endScale: 1.18,
    peakMs: 32, fadeMs: 115, reducedFadeMs: 80,
    angleVariation: 0.14,
    enterEase: "Cubic.Out", fadeEase: "Sine.In",
  }),
  chips: Object.freeze({
    count: 4, reducedCount: 1, frameCount: 5,
    sizeTiles: Object.freeze([0.04, 0.075]),
    travelTiles: Object.freeze([0.13, 0.3]),
    spreadTiles: 0.14, sweepTiles: 0.12, gravityTiles: 0.16,
    launchMs: Object.freeze([65, 100]), settleMs: Object.freeze([120, 190]),
    reducedTravel: 0.3,
    startScale: 0.7, foregroundScale: 1.12, endScale: 0.35,
    alpha: 0.94, rotation: 1.8, depthStep: 0.01,
    launchEase: "Cubic.Out", settleEase: "Quad.In",
  }),
});

export function isDigImpactEnabled(search = globalThis.location?.search || "") {
  const value = new URLSearchParams(search)
    .get(DIG_IMPACT_FX_CONFIG.queryParam)?.trim().toLowerCase();
  return DIG_IMPACT_FX_CONFIG.enabled
    && !DIG_IMPACT_FX_CONFIG.disabledValues.includes(value);
}
