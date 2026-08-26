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
    panicColor:   0xff1f2d,
    panicAlpha:   0.34,
    panicDuration: 260,
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
