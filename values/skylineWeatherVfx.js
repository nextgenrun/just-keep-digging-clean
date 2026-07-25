const freezeActors = actors => Object.freeze(actors.map(actor => Object.freeze(actor)));

export const SKYLINE_WEATHER_VFX = Object.freeze({
  enabled: true,
  queryParam: "skylineVfx",
  queryEnableValues: Object.freeze(["1", "on", "true", "imagegen"]),
  queryDisableValues: Object.freeze(["0", "off", "false", "procedural"]),
  assetBasePath: "sprites/environment/v11-skyline-weather-vfx-v1/",
  sheets: Object.freeze({
    clouds: Object.freeze({ file: "clouds-screen.webp", layoutRows: Object.freeze([3, 3, 3]) }),
    rain: Object.freeze({ file: "rain-alpha.webp", layoutRows: Object.freeze([4, 4, 6]) }),
    snow: Object.freeze({ file: "snow-alpha.webp", layoutRows: Object.freeze([4, 4, 6]) }),
    water: Object.freeze({ file: "water-alpha.webp", layoutRows: Object.freeze([4, 4, 4]) }),
    atmosphere: Object.freeze({ file: "atmosphere-screen.webp", layoutRows: Object.freeze([4, 4, 4]) }),
    lightning: Object.freeze({ file: "lightning-screen.webp", layoutRows: Object.freeze([4, 4, 4]) }),
  }),
  frames: Object.freeze({
    clouds: Object.freeze({ distant: Object.freeze([0, 1, 2]), midground: Object.freeze([3, 4, 5]), storm: Object.freeze([6, 7, 8]) }),
    rain: Object.freeze({ distant: Object.freeze([0, 1, 2, 3]), foreground: Object.freeze([4, 5, 6, 7]) }),
    snow: Object.freeze({ flakes: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7]), powder: Object.freeze([11, 12, 13]) }),
    // Water frames 8 and 9 remain permanently rejected.
    water: Object.freeze({ splash: Object.freeze([0, 1, 2, 3]), ripple: Object.freeze([4, 5, 6, 7]), spray: Object.freeze([10, 11]) }),
    atmosphere: Object.freeze({ fog: Object.freeze([0, 1, 2, 3]), smoke: Object.freeze([4, 5, 6, 7]), steam: Object.freeze([8, 9]), groundMist: Object.freeze([10, 11]) }),
    lightning: Object.freeze({ bolts: Object.freeze([0, 1, 2, 3]), flashes: Object.freeze([8, 9, 10, 11]) }),
  }),
  renderDepths: Object.freeze({ cloudsFar: -4.745, clouds: 14, fog: 57.2, precipitation: 58.2, impacts: 58.4, wisps: -4.70, lightning: 994 }),
  clouds: Object.freeze({
    minimumClearCover: 0.12,
    nightAlphaBoost: 0.10,
    spacingTiles: 8,
    wrapMarginTiles: 8,
    bobPeriodSeconds: 14,
    bobAmplitudeTiles: 0.08,
    actors: freezeActors([
      { layer: "far", altitudeTiles: 6.80, widthTiles: 4.8, heightTiles: 1.12, speed: 7, alpha: 0.10 },
      { layer: "far", altitudeTiles: 7.55, widthTiles: 4.2, heightTiles: 1.02, speed: 9, alpha: 0.09 },
      { layer: "far", altitudeTiles: 8.10, widthTiles: 5.7, heightTiles: 1.42, speed: 13, alpha: 0.11 },
      { layer: "far", altitudeTiles: 8.85, widthTiles: 5.3, heightTiles: 1.30, speed: 17, alpha: 0.12 },
      { layer: "far", altitudeTiles: 9.60, widthTiles: 6.3, heightTiles: 1.52, speed: 22, alpha: 0.14 },
      { layer: "far", altitudeTiles: 10.35, widthTiles: 6.8, heightTiles: 1.62, speed: 25, alpha: 0.12 },
    ]),
  }),
  precipitation: Object.freeze({
    // The generated rain sheet contains large horizontal/L-shaped artifacts.
    // WeatherImpactRainController remains the authoritative collision-aware
    // rain renderer until a clean alpha atlas is approved.
    rainAtlasEnabled: false,
    snowAtlasEnabled: true,
    count: 38,
    reducedCount: 22,
    rainWidthPx: 108,
    rainHeightPx: 132,
    snowSizePx: 20,
    impactCount: 14,
    winterSnowTemperatureC: 1,
    maxAccentAlpha: 0.42,
  }),
  fog: Object.freeze({ count: 4, widthFraction: 0.42, heightFraction: 0.18, yFraction: 0.72, maxAlpha: 0.32 }),
  wisps: Object.freeze({ sizePx: 72, smokeAlpha: 0.22, steamAlpha: 0.18, cullMarginPx: 220 }),
  lightning: Object.freeze({ boltWidthPx: 210, boltHeightPx: 310, flashWidthPx: 460, flashHeightPx: 260, maxBoltAlpha: 0.58, maxFlashAlpha: 0.28 }),
  performance: Object.freeze({ reducedBelowFps: 48, updateIntervalMs: 16, reducedUpdateIntervalMs: 33 }),
});
