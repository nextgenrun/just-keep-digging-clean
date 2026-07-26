const profile = (
  mode,
  responseX,
  responseY,
  maxOffsetXPx,
  maxOffsetYPx,
  settlePerSecond
) => Object.freeze({
  mode,
  responseX,
  responseY,
  maxOffsetXPx,
  maxOffsetYPx,
  settlePerSecond,
});

const ANCHORED = profile("anchored", 0, 0, 0, 0, 0);

export const WORLD_VISUAL_DEPTH_CAMERA_MOTION = Object.freeze({
  maxFrameDeltaMs: 100,
  snapDeltaTiles: 4,
  profiles: Object.freeze({
    "surface-entry": profile("soft-lag", 0.06, 0.05, 4, 4, 5.2),
    "level1-blue": profile("distant-lag", 0.1, 0.09, 6, 7, 4.4),
    "level1-amber": ANCHORED,
    "level1-silver": profile("distant-lag", 0.09, 0.11, 6, 8, 4),
    "level1-magma": profile("heavy-lag", 0.04, 0.05, 3, 4, 5.8),
    "level2-slagworks": ANCHORED,
    "level2-obsidian": profile("distant-lag", 0.07, 0.09, 5, 6, 4.7),
    "level2-foundry": ANCHORED,
    "level2-blackglass": profile("abyss-lag", 0.12, 0.14, 8, 9, 3.8),
    "level2-starfire": profile("cosmic-lag", 0.14, 0.16, 9, 10, 3.4),
  }),
});
