/**
 * Gamefeel configuration — all tunable feel values in one place.
 */
export const GAMEFEEL_CONFIG = Object.freeze({

  // ── SCREENSHAKE ────────────────────────────────────────────────────────
  shake: Object.freeze({
    // Individual event signatures live in values/cameraShake.js.
    minFps: 40,
    minimumDurationMs: 20,
    minimumDurationScale: 0.2,
    duplicateMergeWindowMs: 34,
    defaultFrequencyXHz: 5,
    defaultFrequencyYHz: 6,
    exponentialDecayRate: 2.2,
    exponentialEndTaperPower: 1,
    secondaryWaveAmplitudeRatio: 0.22,
    secondaryWaveFrequencyRatioX: 0.43,
    secondaryWaveFrequencyRatioY: 0.37,
    secondaryWavePhaseX: 1.7,
    secondaryWavePhaseY: 0.9,
  }),

  // ── SCREEN FLASH (removed bright white flash to fix lag) ──────────────
  flash: {
    rewardColor:   0x44cc88,
    rewardAlpha:   0.024,
    rewardDuration: 70,
    panicColor:   0xff1f2d,
    panicAlpha:   0.34,
    panicDuration: 260,
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
    baseCooldownMs: 1500,  // matches miningConfig.mineCooldownMs baseline
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
