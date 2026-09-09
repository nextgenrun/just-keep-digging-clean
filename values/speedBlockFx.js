/** Yellow Speed Block feedback; reuses the approved mining-spark atlas. */
export const SPEED_BLOCK_FX_CONFIG = Object.freeze({
  enabled: true,
  rollbackQuery: "speedBlockFx",
  disabledValues: Object.freeze(["0", "off", "false"]),
  reducedMotionMediaQuery: "(prefers-reduced-motion: reduce)",
  // Isolated, alpha-safe glints in the already-loaded approved core atlas.
  frames: Object.freeze([
    Object.freeze({ name: "speed-block-glint-point", x: 908, y: 498, width: 27, height: 32 }),
    Object.freeze({ name: "speed-block-glint-gold", x: 908, y: 1746, width: 27, height: 32 }),
  ]),
  colors: Object.freeze([0xffe13b, 0xffef83, 0xffcc28]),
  depthOffset: 0.7,
  blendMode: "ADD",
  maxParticles: 28,
  maxDeltaMs: 80,
  maxBurstsPerUpdate: 2,
  intervalMs: 90,
  ambientCount: 3,
  activationCount: 10,
  impactCount: 6,
  originY: 0.5,
  bodySpreadX: 0.8,
  bodyTopRatio: 0.12,
  bodyBottomRatio: 0.9,
  sizePx: Object.freeze({ min: 13, max: 22 }),
  burstSizeMultiplier: 1.25,
  alpha: 0.95,
  lifetimeMs: Object.freeze({ min: 420, max: 650 }),
  driftPx: Object.freeze({ min: -18, max: 18 }),
  risePx: Object.freeze({ min: 18, max: 42 }),
  rotationRadians: 0.7,
  endScaleMultiplier: 0.45,
  ease: "Sine.In",
  reducedMotion: Object.freeze({
    intervalMs: 320,
    ambientCount: 1,
    activationCount: 3,
    impactCount: 2,
    travelMultiplier: 0.25,
    alpha: 0.72,
  }),
  hud: Object.freeze({
    label: "ATK",
    title: "ATTACK SPEED",
    color: "#ffe13b",
    description: "+{percent}% attack speed from a Speed Block. {seconds}s remaining.",
  }),
});

export function isSpeedBlockFxEnabled(search = globalThis.location?.search || "") {
  const value = new URLSearchParams(search)
    .get(SPEED_BLOCK_FX_CONFIG.rollbackQuery)?.toLowerCase();
  return SPEED_BLOCK_FX_CONFIG.enabled
    && !SPEED_BLOCK_FX_CONFIG.disabledValues.includes(value);
}
