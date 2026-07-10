/**
 * Post-processing (camera PostFX) configuration.
 * Cinematic polish layer: soft vignette + depth-based color grading.
 * All values are tunables — systems read them, never hardcode.
 */
export const POSTFX_CONFIG = Object.freeze({
  enabled: false, // TEMPORARILY disabled — investigating sprite visibility regression

  // ── VIGNETTE ───────────────────────────────────────────────────────────
  // Subtle at the surface, closes in slightly as the player goes deeper.
  vignette: Object.freeze({
    enabled: true,
    x: 0.5,
    y: 0.5,
    surfaceRadius: 0.72,     // wide + airy above ground
    surfaceStrength: 0.16,   // barely-there framing
    deepRadius: 0.55,        // closes in underground
    deepStrength: 0.32,      // still subtle — mood, not obstruction
  }),

  // ── DEPTH COLOR GRADING ────────────────────────────────────────────────
  // Warm/neutral at the surface, gently desaturated + darker in the deep.
  grading: Object.freeze({
    enabled: true,
    surfaceSaturation: 0.04,   // tiny richness boost topside
    deepSaturation: -0.16,     // muted, colder feel at depth
    surfaceBrightness: 1.0,
    deepBrightness: 0.93,
  }),

  // ── DEPTH MAPPING ──────────────────────────────────────────────────────
  depth: Object.freeze({
    startMeters: 10,    // grading starts fading in below this depth
    fullMeters: 350,    // full "deep" look reached here
  }),

  // ── BEHAVIOUR ──────────────────────────────────────────────────────────
  updateIntervalMs: 200,  // how often the depth look re-evaluates
  lerpFactor: 0.12,       // smoothing toward target per update tick
  disableBelowFps: 38,    // auto-disable postFX if FPS stays below this
  lowFpsChecksToDisable: 4,
});