/**
 * Scene transition configuration.
 * Tunables for the unified fade transition language.
 */
export const SCENE_TRANSITION_CONFIG = Object.freeze({
  enabled: true,

  // ── FADE ────────────────────────────────────────────────────────────────
  fadeOutMs: 300,     // fade to black before scene switch
  fadeInMs: 400,      // fade from black after new scene loads
  color: 0x000000,    // fade color
  maxAlpha: 1,        // full black at peak

  // ── BEHAVIOUR ───────────────────────────────────────────────────────────
  // If true, the fade-out completes before scene.start() is called.
  // If false, scene.start() fires immediately and the new scene fades in.
  waitForFadeOut: true,
});