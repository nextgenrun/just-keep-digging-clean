const freezeList = values => Object.freeze(values.map(value => Object.freeze(value)));

// Review-only SSOT for the Observatory baked-plate fidelity gate.
export const WORLD_VISUAL_ABOVE_GROUND_FIDELITY_GATE_REVIEW = Object.freeze({
  reviewOnly: true,
  productionChanged: false,
  version: "above-ground-fidelity-gate-v1-2026-08-30",
  title: "Observatory fidelity gate",
  chapterId: "observatory",
  chapterLabel: "Observatory Ridge",
  assetPolicy: "one-unchanged-imagegen-plate-plus-existing-runtime-layers",
  backgroundOwnerPolicy: "one-authoritative-plate-no-card-tiling-no-crossfade",
  decorativePropPolicy: "omit-unproved-modular-decoration",
  townVideoPolicy: "preserve-production-town-air-byte-for-byte",
  plate: Object.freeze({
    assetId: "sky13",
    sha256: "a1d6bf7b7f945bf1baf4f9c846c9ba7d9c44231d5804fcaa945c581e5c45e029",
    sourceWidthPx: 1672,
    sourceHeightPx: 941,
    depth: -20,
    alpha: 1,
    tint: 0xffffff,
    scrollFactor: 0,
  }),
  townVideo: Object.freeze({
    path: "sprites/backgrounds/start-zone-scenic-v1/living-background-v1/surface-town-air-v1.mp4",
    sha256: "1650f7a88e2445ef9ab1be954680e4a8d5ffb51b2ccd8e7def5bec19726132d6",
  }),
  comparison: Object.freeze({
    queryParam: "view",
    sourceValue: "source",
    runtimeValue: "runtime",
    defaultValue: "runtime",
  }),
  surfacePack: Object.freeze({
    queryParam: "surfacePack",
    staticValue: "current",
  }),
  camera: Object.freeze({
    centerTileX: 234.1,
    centerTileY: 62,
    horizontalPanLimitTiles: 4,
  }),
  heroQuery: (
    "?arrivalForgeLandmarkV4=0&caravanLandmarkV4=0&starwellLandmarkV4=0"
    + "&timberwrightLandmarkV4=0&frontierLandmarkV4=0&threeKingsLandmarkV4=0"
  ),
  initialWeatherId: "clear",
  forcedWeatherDurationMs: 120000,
  weatherPresets: freezeList([
    { id: "clear", label: "Clear drift", intensity: 0.18 },
    { id: "drizzle", label: "Light drizzle", intensity: 0.42 },
    { id: "rain", label: "Rain", intensity: 0.68 },
    { id: "storm", label: "Storm", intensity: 0.92 },
    { id: "snow", label: "Snow", intensity: 0.72 },
  ]),
  clock: Object.freeze({
    fixedTime: 0.78,
    dayDurationMs: 720000,
    starCount: 1,
    starTwinkleSpeed: 1700,
  }),
  runtime: Object.freeze({
    hudRefreshMs: 250,
    defaultMotionEnabled: true,
  }),
  acceptance: Object.freeze({
    backgroundOwners: 1,
    repeatedSkyCards: 0,
    generatedCelestialSprites: 0,
    decorativePropCount: 0,
    heroLandmarks: 1,
  }),
});
