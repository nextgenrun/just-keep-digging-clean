export const SURFACE_LIVING_BACKGROUND_MOCKUP = Object.freeze({
  assets: Object.freeze({
    still: "./2026-08-26-surface-two-row-reference-v2.png",
    video: "./2026-08-26-surface-living-loop-v2.mp4",
  }),
  source: Object.freeze({
    widthPx: 1672,
    heightPx: 941,
    surfaceYpx: 558,
    tileSizePx: 94,
    visibleDepthTiles: 2,
  }),
  loop: Object.freeze({
    clipDurationSeconds: 4,
    crossfadeMs: 700,
    startGuardSeconds: 0.04,
    endGuardSeconds: 0.05,
  }),
  diagnostics: Object.freeze({
    sampleWidthPx: 320,
    sampleHeightPx: 180,
    motionSampleGapSeconds: 0.1,
    endpointMaeWarning: 5,
    endpointLumaWarning: 2,
  }),
});
