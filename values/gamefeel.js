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
    alpha:       0.65,
    tint:        0xaaddff,  // subtle blue-white
    fadeMs:      3990,
    depth:       18,        // just below playerDepth:20
  },

  // ── CLIMB STATE ─────────────────────────────────────────────────────────────
  climb: {
    alpha:       0.58,
    tint:        0xccaaff,  // subtle purple trail during flying/climbing
    fadeMs:      2390,
    depth:       18,        // just below playerDepth:20
  },

  // ── TILE DESTROY PARTICLES ─────────────────────────────────────────────
  particles: {
    count:          7,
    critCount:      12,
    speedMin:       70,
    speedMax:       220,
    lifespanMin:    180,
    lifespanMax:    420,
    gravityY:       550,
    size:           5,      // radius of each chip circle in px
    depth:          36,     // just above fxDepth:35
    // Colors per tile type
    tileColors: {
      1:  0x9B5523,   // dirt
      2:  0x888888,   // stone
      3:  0xCD7F32,   // copper
      4:  0x8b5a2b,   // dark dirt
      5:  0x6b4226,   // dark dirt strong
      6:  0xc8d4dc,   // steel
      7:  0xd8d8d8,   // iron
      8:  0xcd7f32,   // bronze
      9:  0xc8c8c8,   // silver
      10: 0xffd700,   // gold
      16: 0x88eeff,   // sky tile
    },
    defaultColor: 0xaaaaaa,
  },

  // ── DIG ANIMATION SPEED SCALING ────────────────────────────────────────
  animSpeed: {
    baseCooldownMs: 750,  // matches miningConfig.mineCooldownMs baseline
    maxSpeedMultiplier: 2.5,
  },
});
