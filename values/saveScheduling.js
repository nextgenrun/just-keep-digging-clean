export const SAVE_SCHEDULING_CONFIG = Object.freeze({
  schemaVersion: 2,
  debounceMs: 350,
  maxDelayMs: 1800,
  idleTimeoutMs: 750,
  fallbackDelayMs: 16,
  autosaveIntervalMs: 60000,
  mainMenuFlushTimeoutMs: 2500,
  recentSampleLimit: 60,
  events: Object.freeze({
    visibilityChange: "visibilitychange",
    pageHide: "pagehide",
    hiddenState: "hidden",
  }),
});
