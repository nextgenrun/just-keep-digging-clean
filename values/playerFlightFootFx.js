const footOffset = (x, y) => Object.freeze({ x, y });

export const PLAYER_FLIGHT_FOOT_FX_CONFIG = Object.freeze({
  enabled: true,
  requiredVisualSkin: "approved-survival-blender-v2",
  spawnIntervalMs: 42,
  maxDeltaMs: 80,
  maxBurstsPerUpdate: 2,
  footOffsets: Object.freeze([
    footOffset(-0.306, -0.436),
    footOffset(-0.321, -0.453),
  ]),
  radiusPx: Object.freeze({ min: 2.2, max: 3.8 }),
  trailDistancePx: Object.freeze({ min: 24, max: 42 }),
  lateralJitterPx: 2.5,
  trailDriftPx: 4,
  lifetimeMs: Object.freeze({ min: 220, max: 340 }),
  startAlpha: 0.88,
  endScale: 0.28,
  depthOffset: -1,
  colors: Object.freeze([0xe6f8ff, 0x9bddff, 0x62b6ff]),
});
