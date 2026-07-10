// ==================== DEPTH CINEMATIC CONFIG ====================
// Tunables for the DepthMilestoneCinematic system.
// Cinematic moments trigger at specific depths — slow zoom + letterbox bars
// + title card overlay. Only a curated subset of milestones get cinematics
// (not every 100m — that would feel repetitive).

export const DEPTH_CINEMATIC_CONFIG = Object.freeze({
  enabled: true,

  // Depths that trigger a cinematic moment.
  // These are the "big beat" depths — major progression thresholds.
  cinematicDepths: Object.freeze([100, 300, 500, 750, 1000, 1500, 2000]),

  // ── TIMING (ms) ────────────────────────────────────────────────────────
  // Total sequence: fadeBarsIn → hold → titleIn → titleHold → titleOut → fadeBarsOut
  barsInMs:     400,   // letterbox bars slide in
  holdMs:       200,   // pause before title appears
  titleInMs:    500,   // title card slides up + fades in
  titleHoldMs:  1800,  // title holds on screen
  titleOutMs:   500,   // title fades out
  barsOutMs:    400,   // letterbox bars slide out

  // ── CAMERA ──────────────────────────────────────────────────────────────
  zoomIn:       0.88,  // slow zoom-in during cinematic (from 1.0)
  zoomLerp:     0.04,  // per-frame lerp toward zoomIn (slow, cinematic)
  zoomOutLerp:  0.08,  // per-frame lerp back to 1.0 after cinematic

  // ── LETTERBOX BARS ──────────────────────────────────────────────────────
  barColor:     0x000000,
  barAlpha:     0.92,
  barHeightPct: 0.14,  // 14% of viewport height each (top + bottom)
  barDepth:     990,   // below HUD (1000) but above world

  // ── TITLE CARD ──────────────────────────────────────────────────────────
  titleDepth:   995,
  titleFont:    'Trebuchet MS, Segoe UI, sans-serif',
  titleFontSize: '42px',
  titleColor:   '#FFD700',
  titleStroke:  '#000000',
  titleStrokeThickness: 6,
  titleShadowX: 0,
  titleShadowY: 4,
  titleShadowColor: 'rgba(0,0,0,0.8)',
  titleShadowBlur: 6,

  subtitleFontSize: '22px',
  subtitleColor:   '#aaccff',
  subtitleOffsetY: 36,  // px below title

  depthFontSize:   '18px',
  depthColor:     '#ffffff',
  depthOffsetY:   72,  // px below title

  // ── VIGNETTE FLASH ──────────────────────────────────────────────────────
  // Brief golden vignette pulse when the cinematic starts
  flashColor:    0xFFD700,
  flashAlpha:    0.15,
  flashDurationMs: 600,

  // ── GAMEPLAY ─────────────────────────────────────────────────────────────
  // Slow time-scale during the cinematic for dramatic effect
  timeScale:     0.35,
  timeScaleLerp: 0.08,  // lerp toward timeScale
  timeScaleRestoreLerp: 0.06, // lerp back to 1.0

  // ── COOLDOWN ─────────────────────────────────────────────────────────────
  // Prevent re-triggering the same depth cinematic
  cooldownMs:    5000,

  // ── GUARDS ───────────────────────────────────────────────────────────────
  // Don't trigger during these UI states
  blockDuringOverlays: true,
  minFps:        25,    // skip if FPS below this (avoid stutter on slow machines)
});