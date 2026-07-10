/**
 * HUD juice config — micro-animations that make the HUD feel alive.
 * SSOT: all tunables for HUD 2.0 micro-juice live here.
 */
export const HUD_JUICE_CONFIG = Object.freeze({
  enabled: true,

  // ── DEPTH COUNT-UP ──────────────────────────────────────────────────────
  // When depth changes, tween the displayed number instead of snapping.
  depthCountUp: Object.freeze({
    enabled: true,
    durationMs: 350,       // tween duration
    ease: 'Cubic.easeOut',
    // Flash gold when crossing a 100m boundary
    milestoneFlashColor: '#FFD700',
    milestoneFlashMs: 800,
    milestoneEvery: 100,   // flash at every 100m
  }),

  // ── COMBO TEXT POP ───────────────────────────────────────────────────────
  // Quick scale pop when combo count increases.
  comboPop: Object.freeze({
    enabled: true,
    scaleAmount: 1.18,     // peak scale
    durationMs: 120,       // pop up
    recoverMs: 180,        // scale back down
    ease: 'Back.easeOut',
  }),

  // ── TILES BROKEN POP ─────────────────────────────────────────────────────
  // (If tiles broken is ever shown in HUD — currently tracked but not displayed)
  // Reserved for future use.
  tilesBrokenPop: Object.freeze({
    enabled: false,
    scaleAmount: 1.15,
    durationMs: 100,
  }),
});