export const WEATHER_CONFIG = Object.freeze({
  enabled: true,
  initialKind: "clear",

  // Random weather phases. Durations are intentionally short enough that the
  // world breathes during a normal play session.
  phases: {
    clear:   { durationMs: [18000, 42000], intensity: [0.00, 0.05], wind: [-20, 35],  next: { clear: 3, drizzle: 4, rain: 2, storm: 1 } },
    drizzle: { durationMs: [14000, 32000], intensity: [0.18, 0.38], wind: [-50, 70],  next: { clear: 3, drizzle: 3, rain: 4, storm: 1 } },
    rain:    { durationMs: [18000, 46000], intensity: [0.45, 0.78], wind: [-95, 120], next: { clear: 2, drizzle: 3, rain: 3, storm: 2 } },
    storm:   { durationMs: [16000, 36000], intensity: [0.76, 1.00], wind: [-170, 190], next: { clear: 1, drizzle: 2, rain: 3, storm: 2 } },
  },

  intensityRetargetMs: [2200, 6200],
  transitionRatePerSecond: 0.42,
  windRatePerSecond: 0.34,

  depth: {
    surfaceFadeTiles: 18,
    undergroundFullTiles: 36,
    deepFadeStartTiles: 180,
    deepFadeEndTiles: 760,
    stormMinimumSignal: 0.18,
  },

  renderDepths: {
    tint: 56,
    mist: 57,
    rain: 58,
    lightning: 995,
  },

  rain: {
    minFrequencyMs: 92,
    maxFrequencyMs: 13,
    maxQuantity: 3,
    alpha: 0.90,
    maxSpeedY: 1280,
    minSpeedY: 760,
    windScale: 1.18,
  },

  splashes: {
    minFrequencyMs: 320,
    maxFrequencyMs: 52,
    alpha: 0.42,
  },

  underground: {
    dripMinFrequencyMs: 640,
    dripMaxFrequencyMs: 110,
    mistMinFrequencyMs: 760,
    mistMaxFrequencyMs: 160,
    dripAlpha: 0.55,
    mistAlpha: 0.34,
  },

  lighting: {
    nightAlpha: 0.12,
    rainAlpha: 0.07,
    stormAlpha: 0.09,
    undergroundAlpha: 0.06,
    clearTint: 0x111820,
    rainTint: 0x1d3547,
    stormTint: 0x0b1830,
    nightTint: 0x0a0e1a,
    caveTint: 0x101a24,
  },

  lightning: {
    intervalMs: [3600, 9200],
    clusterChance: 0.38,
    clusterGapMs: [90, 260],
    flashDurationMs: [70, 145],
    flashAlpha: [0.34, 0.78],
    thunderDelayMs: [180, 780],
  },

  audio: {
    rainVolume: 0.13,
    thunderVolume: 0.24,
    undergroundMuffle: 0.42,
  },
});
