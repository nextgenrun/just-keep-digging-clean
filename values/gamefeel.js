/**
 * Gamefeel configuration — all tunable feel values in one place.
 */
export const GAMEFEEL_CONFIG = Object.freeze({

  // ── SCREENSHAKE ────────────────────────────────────────────────────────
  shake: {
    // Individual shake signatures live in gamefeel/cameraShake.js.
    minFps: 40,   // skip shake below this FPS to avoid jitter
  },

  // ── HITSTOP ────────────────────────────────────────────────────────────
  hitstop: {
    critDurationMs:   90,
    luckyDurationMs:  60,
    slowTimeScale:    0.05,
    resumeTimeScale:  1.0,
  },

  // ── SCREEN FLASH (removed bright white flash to fix lag) ──────────────
  flash: {
    critColor:    0x6644aa,  // subtle purple instead of bright white
    critAlpha:    0.016,     // 80% reduced for subtle feedback
    critDuration: 80,        // faster fade
    luckyColor:   0x44cc88,
    luckyAlpha:   0.024,
    luckyDuration: 70,
  },

  // ── CAMERA ZOOM PULSE (on crit) ────────────────────────────────────────
  zoomPulse: {
    enabled:      true,
    targetZoom:   0.965,
    defaultZoom:  1.0,
    inDuration:   25,
    outDuration:  80,
  },

  // ── PICKAXE TRAIL (swing arc ghost sprites) ────────────────────────────
  trail: {
    alpha:       0.35,
    tint:        0xaaddff,  // subtle blue-white
    fadeMs:      1990,
    depth:       18,        // just below playerDepth:20
  },

  // ── CLIMB STATE ─────────────────────────────────────────────────────────────
  climb: {
    alpha:       0.22,
    tint:        0xccaaff,  // subtle purple trail during flying/climbing
    fadeMs:      320,
    spawnEveryFrames: 4,
    depth:       18,        // just below playerDepth:20
  },

  // ── AUTHORED TILE DESTROY IMPACT ───────────────────────────────────────
  particles: {
    enabledByDefault:    true,
    rollbackQuery:       "authoredMineImpact",
    disabledValues:      Object.freeze(["0", "false", "off", "legacy"]),
    depth:              36,   // just above fxDepth:35
    displayWidthTiles:  1.62,
    displayHeightTiles: 1.18,
    originY:            0.68,
    offsetYTiles:       0.13,
    randomOffsetTiles:  0.1,
    startScale:         0.64,
    peakScale:          1.0,
    endScale:           1.08,
    minMaterialScale:   0.9,
    maxMaterialScale:   1.32,
    alpha:              0.88,
    startAlpha:          0.32,
    rotationMin:       -0.1,
    rotationMax:        0.1,
    enterMs:            75,
    holdMs:             45,
    exitMs:             285,
    driftYTiles:       -0.1,
    // Light material tints preserve detail in the authored debris artwork.
    tileColors: {
      1:  0xd9ad7a,   // dirt
      2:  0xc3c8cc,   // stone
      3:  0xe5aa73,   // copper
      4:  0xc69675,   // dark dirt
      5:  0xaa7b60,   // dark dirt strong
      6:  0xe0e9ee,   // steel
      7:  0xf0f0f0,   // iron
      8:  0xd99d69,   // bronze
      9:  0xe6edf2,   // silver
      10: 0xffe394,   // gold
      16: 0xc2f5ff,   // sky tile
    },
    defaultColor: 0xd5d5d5,
  },

  // ── DIG ANIMATION SPEED SCALING ────────────────────────────────────────
  animSpeed: {
    baseCooldownMs: 750,  // matches miningConfig.mineCooldownMs baseline
    maxSpeedMultiplier: 2.5,
  },

  // ── PLAYER BODY LANGUAGE (squash & stretch) ────────────────────────────
  bodyLanguage: {
    enabled: true,
    affectLivingDrill: false,   // drill has its own bite/commit visuals
    // Landing squash — triggers when touching down after a real fall
    landSquashMinVy: 260,       // px/s downward velocity needed to squash
    landSquashAmount: 0.14,     // scaleY compress at min velocity
    landSquashMaxAmount: 0.22,  // scaleY compress at heavy landings
    landSquashMaxVy: 900,       // velocity at which max squash is reached
    landRecoverMs: 170,         // spring back duration
    landRecoverEase: "Back.easeOut",
    // Falling stretch — subtle vertical stretch while dropping fast
    fallStretchMinVy: 420,      // px/s downward velocity to begin stretch
    fallStretchMaxVy: 1000,
    fallStretchAmount: 0.06,    // max scaleY stretch
    fallStretchLerp: 0.18,      // smoothing per frame
    // Dig impact pop — tiny punch on every successful hit
    digPopAmount: 0.05,         // uniform scale pop on hit
    digPopDestroyAmount: 0.09,  // bigger pop when the tile breaks
    digPopMs: 90,
    digPopEase: "Sine.easeOut",
  },

});

export function resolveAuthoredMineImpactEnabled(
  search = globalThis.window?.location?.search || "",
  config = GAMEFEEL_CONFIG,
) {
  const particles = config?.particles;
  if (particles?.enabledByDefault !== true) return false;
  const value = new URLSearchParams(search)
    .get(particles.rollbackQuery)
    ?.trim()
    .toLowerCase();
  return !particles.disabledValues.includes(value);
}
