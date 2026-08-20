const COMMON_QUERY = Object.freeze({
  jkd_e2e: "1",
  runtimeAssetQueue: "1",
  nativeDensity: "0",
  renderRevision: "20260815-shallow-material-v1",
});
const COMMON_WORLD = Object.freeze({
  identity: "carried-light-live-comparison",
  tutorialChoice: "no",
  spawnOffsetTiles: -80,
  searchWidthTiles: 160,
  startDepthOffsetTiles: 140,
  searchDepthTiles: 100,
  edgeMarginTiles: 2,
  weatherDurationMs: 600_000,
});
const DEPTH_PROFILES = Object.freeze({
  surface: Object.freeze({ id: "surface", label: "Surface", depthTiles: 0 }),
  entry: Object.freeze({ id: "entry", label: "18 m", depthTiles: 18 }),
  shallow: Object.freeze({ id: "shallow", label: "140 m", depthTiles: 140 }),
  deep: Object.freeze({ id: "deep", label: "700 m", depthTiles: 700 }),
  abyss: Object.freeze({ id: "abyss", label: "1000 m", depthTiles: 1000 }),
  extreme: Object.freeze({ id: "extreme", label: "1800 m", depthTiles: 1800 }),
});
const COMMON_TIMING = Object.freeze({
  pollIntervalMs: 100,
  bootTimeoutMs: 240_000,
  playTimeoutMs: 240_000,
  settleMs: 1_400,
  telemetryIntervalMs: 250,
  inputReleaseResyncMs: 260,
});
const COMMON_MOVEMENT = Object.freeze({
  stepTiles: 1,
  horizontalSearchTiles: 8,
  verticalSearchTiles: 3,
  forwardedCodes: Object.freeze([
    "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
    "KeyA", "KeyD", "KeyW", "KeyS", "ShiftLeft", "ShiftRight",
  ]),
});
const FUEL_PROFILES = Object.freeze({
  full: Object.freeze({ id: "full", label: "Full GP", ratio: 1 }),
  low: Object.freeze({ id: "low", label: "Low GP", ratio: 0.14 }),
});
const WEATHER_PROFILES = Object.freeze({
  clear: Object.freeze({ id: "clear", label: "Clear", intensity: 0 }),
  rain: Object.freeze({ id: "rain", label: "Rain", intensity: 0.82 }),
  storm: Object.freeze({ id: "storm", label: "Storm", intensity: 1 }),
});
const DAY_PROFILES = Object.freeze({
  day: Object.freeze({ id: "day", label: "Day", time: 0.50 }),
  dusk: Object.freeze({ id: "dusk", label: "Dusk", time: 0.73 }),
  night: Object.freeze({ id: "night", label: "Night", time: 0.88 }),
});
const COMMON_COPY = Object.freeze({
  loading: "Booting both real game instances…",
  ready: "LIVE · inputs synchronized",
  failed: "Comparison failed to initialize",
  controls:
    "Depth, movement, GP, weather, day/night and torch stay synchronized",
});

export const OLD_SCHOOL_LAMP_LIVE_COMPARISON = Object.freeze({
  id: "old-school-lamp-live-comparison-v1",
  reviewOnly: true,
  apiGlobal: "__lampLiveCompare",
  logLabel: "OldSchoolLampLiveComparison",
  title: "LIVE CARRIED-LIGHT A/B",
  subtitle: "Two simultaneous Phaser/WebGL worlds · synchronized state",
  rootPath: "../",
  scenarios: Object.freeze([
    Object.freeze({
      id: "torch",
      label: "FIRE LIGHT V3",
      detail: "Exposed flame · compact turbulent source",
      saveSlot: 1,
      query: COMMON_QUERY,
    }),
    Object.freeze({
      id: "lamp",
      label: "OLD-SCHOOL SAFETY LAMP",
      detail: "Shielded flame · glass-weighted falloff",
      saveSlot: 2,
      query: Object.freeze({
        ...COMMON_QUERY,
        carriedLightStyle: "lamp-review",
      }),
    }),
  ]),
  world: COMMON_WORLD,
  depthProfiles: DEPTH_PROFILES,
  defaultDepthProfile: "shallow",
  timing: COMMON_TIMING,
  movement: COMMON_MOVEMENT,
  fuelProfiles: FUEL_PROFILES,
  weatherProfiles: WEATHER_PROFILES,
  dayProfiles: DAY_PROFILES,
  copy: COMMON_COPY,
});

export const NATURAL_FIRE_LIVE_COMPARISON = Object.freeze({
  id: "natural-fire-live-comparison-v1",
  reviewOnly: true,
  apiGlobal: "__naturalFireLiveCompare",
  logLabel: "NaturalFireLiveComparison",
  title: "DEEP NATURAL FIRE / LEGACY A/B",
  subtitle: "Real darkness at 700 m, 1000 m and 1800 m · synchronized state",
  rootPath: "../",
  scenarios: Object.freeze([
    Object.freeze({
      id: "natural",
      label: "NATURAL FIRE V1",
      detail: "One authored flame · procedural falloff · restrained adaptation",
      saveSlot: 1,
      query: Object.freeze({ ...COMMON_QUERY, fireLightStyle: "natural" }),
    }),
    Object.freeze({
      id: "legacy",
      label: "LEGACY PROCEDURAL LIGHT",
      detail: "Untouched pre-Fire-V3 glow and shader baseline",
      saveSlot: 2,
      query: Object.freeze({ ...COMMON_QUERY, fireLight: "legacy" }),
    }),
  ]),
  world: COMMON_WORLD,
  depthProfiles: DEPTH_PROFILES,
  defaultDepthProfile: "abyss",
  timing: COMMON_TIMING,
  movement: COMMON_MOVEMENT,
  fuelProfiles: FUEL_PROFILES,
  weatherProfiles: WEATHER_PROFILES,
  dayProfiles: DAY_PROFILES,
  copy: COMMON_COPY,
});

export const MATERIAL_LIGHTING_LIVE_COMPARISON = Object.freeze({
  id: "material-lighting-live-comparison-v1",
  reviewOnly: true,
  apiGlobal: "__materialLightingLiveCompare",
  logLabel: "MaterialLightingLiveComparison",
  title: "REAL WORLD RENDERING A/B",
  subtitle: "Same Phaser/WebGL world, camera, source assets and gameplay state",
  rootPath: "../",
  scenarios: Object.freeze([
    Object.freeze({
      id: "before",
      label: "BEFORE - NATURAL V1",
      detail: "Existing diffuse cave plates and natural fire",
      saveSlot: 1,
      query: Object.freeze({
        ...COMMON_QUERY,
        fireLightStyle: "natural",
        materialLighting: "0",
        shallowMaterialLighting: "0",
        fullWorldMaterials: "0",
      }),
    }),
    Object.freeze({
      id: "after",
      label: "AFTER - FULL-WORLD MATERIAL V1",
      detail: "Every composed asset gets crisp relief; supported cave plates also receive Light2D normals",
      saveSlot: 2,
      query: Object.freeze({
        ...COMMON_QUERY,
        fireLightStyle: "natural",
        materialLighting: "0",
        shallowMaterialLighting: "1",
        fullWorldMaterials: "1",
      }),
    }),
  ]),
  world: Object.freeze({
    ...COMMON_WORLD,
    startDepthOffsetTiles: 18,
    searchDepthTiles: 80,
    captureGallery: true,
    captureGalleryHalfWidth: 18,
  }),
  depthProfiles: DEPTH_PROFILES,
  defaultDepthProfile: "entry",
  timing: COMMON_TIMING,
  movement: COMMON_MOVEMENT,
  fuelProfiles: FUEL_PROFILES,
  weatherProfiles: WEATHER_PROFILES,
  dayProfiles: DAY_PROFILES,
  copy: COMMON_COPY,
});

export function getCarriedLightLiveComparisonFrameUrl(
  pageHref,
  scenario,
  config = OLD_SCHOOL_LAMP_LIVE_COMPARISON
) {
  const url = new URL(config.rootPath, pageHref);
  for (const [name, value] of Object.entries(scenario.query)) {
    url.searchParams.set(name, value);
  }
  return url.href;
}
