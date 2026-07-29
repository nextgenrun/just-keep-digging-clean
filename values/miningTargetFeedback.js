const ASSET_BASE = "sprites/UI/mining-target-v1";

const DISABLED_QUERY_VALUES = Object.freeze(["0", "false", "off"]);

export const MINING_TARGET_FEEDBACK_CONFIG = Object.freeze({
  asset: Object.freeze({
    key: "fx-mining-target-corners-v1",
    path: `${ASSET_BASE}/mining-target-corners-v1.webp`,
  }),
  visual: Object.freeze({
    depth: 54,
    displayTiles: 1.16,
    alphaBase: 0.86,
    alphaPulse: 0.08,
    scalePulse: 0.014,
    pulsePeriodMs: 1450,
    activeAlphaBase: 0.98,
    activeAlphaPulse: 0.02,
    activeScale: 0.985,
    activeScalePulse: 0.009,
    activePulsePeriodMs: 560,
    glowScaleBase: 1.07,
    glowScalePulse: 0.018,
    glowAlphaBase: 0.14,
    glowAlphaPulse: 0.05,
    activeGlowScaleBase: 1.035,
    activeGlowScalePulse: 0.012,
    activeGlowAlphaBase: 0.3,
    activeGlowAlphaPulse: 0.07,
    acquireDurationMs: 135,
    acquireStartScale: 1.08,
    fallbackStrokeWidthPx: 2,
    fallbackStrokeColor: 0xf6df80,
    fallbackStrokeAlpha: 0.95,
    fallbackFillColor: 0xf6df80,
    fallbackFillAlpha: 0.14,
  }),
  mouse: Object.freeze({
    primaryButton: 0,
    pointerActivationDistancePx: 2,
    clickBufferMs: 220,
  }),
  rollback: Object.freeze({
    visualQueryParam: "miningTargetVisuals",
    mouseQueryParam: "mouseDig",
  }),
  diagnostics: Object.freeze({
    globalKey: "__jkdMiningTargetFeedback",
  }),
});

function isQueryEnabled(queryParam, search) {
  const value = new URLSearchParams(search)
    .get(queryParam)
    ?.trim()
    .toLowerCase();
  return !DISABLED_QUERY_VALUES.includes(value);
}

export function resolveMiningTargetVisualsEnabled(
  search = globalThis.location?.search || "",
  config = MINING_TARGET_FEEDBACK_CONFIG,
) {
  return isQueryEnabled(config.rollback.visualQueryParam, search);
}

export function resolveMouseDigEnabled(
  search = globalThis.location?.search || "",
  config = MINING_TARGET_FEEDBACK_CONFIG,
) {
  return isQueryEnabled(config.rollback.mouseQueryParam, search);
}

export function getMiningTargetFeedbackPreloadAssets(
  config = MINING_TARGET_FEEDBACK_CONFIG,
  search = globalThis.location?.search || "",
) {
  if (!resolveMiningTargetVisualsEnabled(search, config)) return [];
  return [config.asset];
}
