const freezeList = values => Object.freeze(values.map(value => Object.freeze(value)));

// Review-only controls for the implementable above-ground living-world pass.
// Spatial placement remains owned by the existing production value modules.
export const WORLD_VISUAL_ABOVE_GROUND_LIVING_RUNTIME_REVIEW = Object.freeze({
  reviewOnly: true,
  productionChanged: false,
  version: "above-ground-living-runtime-review-v1-2026-08-30",
  assetPolicy: "checked-in-runtime-assets-only",
  compositionPolicy: "one-background-owner-per-camera-band",
  celestialPolicy: "baked-sky-owns-celestial-bodies",
  skyPropPolicy: "render-grounded-props-only-until-floating-support-is-authored",
  townVideoPolicy: "preserve-production-town-air-byte-for-byte",
  initialWeatherId: "clear",
  forcedWeatherDurationMs: 120000,
  weatherPresets: freezeList([
    { id: "clear", label: "Clear drift", intensity: 0.18 },
    { id: "drizzle", label: "Light drizzle", intensity: 0.42 },
    { id: "rain", label: "Rain", intensity: 0.68 },
    { id: "storm", label: "Storm", intensity: 0.92 },
    { id: "snow", label: "Snow", intensity: 0.72 },
  ]),
  nightCycle: Object.freeze({
    startTime: 0.76,
    endTime: 0.98,
    dayDurationMs: 720000,
    starCount: 36,
    starTwinkleSpeed: 1700,
  }),
  runtime: Object.freeze({
    hudRefreshMs: 250,
    syncSnapTiles: 1,
    defaultMotionEnabled: true,
  }),
  owners: freezeList([
    { layer: "sky", owner: "WorldVisualSkyCohesionLayer" },
    { layer: "town", owner: "WorldVisualSurfaceStage / locked town-air" },
    { layer: "weather", owner: "WeatherSystem + AtmosphereSystem" },
    { layer: "surface props", owner: "production sparse prop layers" },
    { layer: "sky support", owner: "V11SkyIslandVisualSystem + Heavenblocks" },
  ]),
});
