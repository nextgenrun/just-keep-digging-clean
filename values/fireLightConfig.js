const FIRE_LIGHT_ASSET_BASE = "sprites/environment/fire-light-v3";
const FRAME_SIZE_PX = 313;
const FRAMES_PER_ATLAS = 16;

const makeAtlas = (id, key, filename) => Object.freeze({
  id,
  key,
  path: `${FIRE_LIGHT_ASSET_BASE}/${filename}`,
  frameCount: FRAMES_PER_ATLAS,
  frameConfig: Object.freeze({
    frameWidth: FRAME_SIZE_PX,
    frameHeight: FRAME_SIZE_PX,
    startFrame: 0,
    endFrame: FRAMES_PER_ATLAS - 1,
  }),
});

export const FIRE_LIGHT_ASSETS = Object.freeze([
  makeAtlas("steadyFlame", "fire-light-v3-flame-steady", "fire-flame-steady-v3.png"),
  makeAtlas("stateFlame", "fire-light-v3-flame-states", "fire-flame-states-v3.png"),
  makeAtlas("lightVolume", "fire-light-v3-volume", "fire-light-volume-v3.png"),
  makeAtlas("rays", "fire-light-v3-rays", "fire-light-rays-v3.png"),
  makeAtlas("atmosphere", "fire-light-v3-atmosphere", "fire-atmosphere-v3.png"),
]);

const ASSET_KEYS = Object.freeze(
  Object.fromEntries(FIRE_LIGHT_ASSETS.map(asset => [asset.id, asset.key]))
);

export const FIRE_LIGHT_CONFIG = Object.freeze({
  id: "fire-light-v3",
  revision: "2026-07-30-imagegen-v1",
  enabled: true,
  assetKeys: ASSET_KEYS,
  atlas: Object.freeze({
    frameSizePx: FRAME_SIZE_PX,
    frameCount: FRAMES_PER_ATLAS,
    columns: 4,
    rows: 4,
    authoredComponentCount: FIRE_LIGHT_ASSETS.length * FRAMES_PER_ATLAS,
  }),
  rollback: Object.freeze({
    featureParam: "fireLight",
    legacyValue: "legacy",
    raysParam: "fireRays",
    eyeAdaptationParam: "eyeAdaptation",
    flickerParam: "fireFlicker",
    reducedValue: "reduced",
  }),
  renderDepth: Object.freeze({
    lightVolume: 899.05,
    rays: 899.10,
    atmosphere: 899.24,
    flame: 899.42,
    eyeDarkVeil: 902,
    eyeBloom: 903,
  }),
  socket: Object.freeze({
    fallback: Object.freeze({
      bodyXRatio: 0.5,
      bodyYRatio: 0.42,
      facingOffsetTiles: 0.28,
      verticalOffsetTiles: -0.22,
      spriteFallbackYOffsetTiles: -0.48,
    }),
    profiles: Object.freeze({
      ualNative: Object.freeze({
        bodyXRatio: 0.5,
        bodyYRatio: 0.40,
        facingOffsetTiles: 0.30,
        verticalOffsetTiles: -0.24,
      }),
      survivalUal: Object.freeze({
        bodyXRatio: 0.5,
        bodyYRatio: 0.39,
        facingOffsetTiles: 0.31,
        verticalOffsetTiles: -0.25,
      }),
      robot: Object.freeze({
        bodyXRatio: 0.5,
        bodyYRatio: 0.43,
        facingOffsetTiles: 0.27,
        verticalOffsetTiles: -0.20,
      }),
      drillHead: Object.freeze({
        bodyXRatio: 0.5,
        bodyYRatio: 0.46,
        facingOffsetTiles: 0.24,
        verticalOffsetTiles: -0.17,
      }),
    }),
  }),
  flame: Object.freeze({
    framesPerSecond: 13,
    stateFramesPerSecond: 9,
    rekindleDurationMs: 520,
    windReferenceSpeed: 190,
    displayWidthTiles: 0.46,
    displayHeightTiles: 0.62,
    originY: 0.66,
    alpha: 0.90,
    reducedFlickerAlphaFloor: 0.92,
    lowFuelRatio: 0.22,
    rainStateThreshold: 0.20,
    windStateThreshold: 0.22,
    stateRows: Object.freeze({
      wind: 0,
      rain: 1,
      lowFuel: 2,
      rekindle: 3,
    }),
  }),
  lightVolume: Object.freeze({
    framesPerSecond: 7,
    framePhaseOffset: 5,
    diameterScale: 2.24,
    verticalScale: 0.78,
    verticalOffsetTiles: 0.08,
    alpha: 0.44,
    surfaceDayAlpha: 0.20,
    rainAlphaMultiplier: 0.84,
    reducedFlickerScale: 0.30,
  }),
  atmosphere: Object.freeze({
    framesPerSecond: 8,
    framePhaseOffset: 9,
    displayWidthTiles: 1.45,
    displayHeightTiles: 1.65,
    originY: 0.56,
    verticalOffsetTiles: 0.02,
    alpha: 0.28,
    rainAlphaMultiplier: 0.42,
    lowFuelAlphaMultiplier: 0.34,
  }),
  rays: Object.freeze({
    enabledByDefault: false,
    enabledValue: "1",
    maxSources: 6,
    framesPerSecond: 5,
    anglesDegrees: Object.freeze([-154, -126, -102, -78, -54, -26]),
    maxLengthTiles: 5.6,
    minimumLengthTiles: 0.48,
    collisionPaddingTiles: 0.18,
    sampleStepTiles: 0.18,
    refreshIntervalMs: 110,
    displayWidthTiles: Object.freeze([0.68, 0.54, 0.62, 0.58, 0.52, 0.64]),
    alpha: Object.freeze([0.11, 0.16, 0.20, 0.22, 0.17, 0.12]),
    frameOffsets: Object.freeze([1, 6, 10, 14, 4, 8]),
    undergroundAlpha: 1,
    surfaceNightAlpha: 0.46,
    surfaceDayAlpha: 0.12,
    rainAlphaMultiplier: 0.58,
    dustAlphaMultiplier: 0.74,
    reducedFlickerScale: 0.20,
  }),
  eyeAdaptation: Object.freeze({
    enabled: true,
    initialLuminance: 0.72,
    minimumLuminance: 0.025,
    surfaceNightLuminance: 0.10,
    torchLuminance: 0.24,
    lightningLuminance: 0.95,
    darkResponsePerSecond: 0.86,
    lightResponsePerSecond: 4.8,
    targetResponsePerSecond: 5.5,
    maximumDarkVeilAlpha: 0.30,
    maximumBloomAlpha: 0.22,
    differenceForMaximumEffect: 0.72,
    inactiveAlphaThreshold: 0.002,
    bloomFrame: 3,
    bloomScale: 1.65,
    reducedEffectScale: 0.38,
    darkVeilColor: 0x030407,
    bloomTint: 0xffe2aa,
  }),
  flicker: Object.freeze({
    reducedMotionMediaQuery: "(prefers-reduced-motion: reduce)",
    reducedScale: 0.24,
    positionFlutterTiles: 0.012,
    alphaAmount: 0.070,
    scaleAmount: 0.026,
    radiansPerMs: 0.0064,
    secondaryFrequency: 2.37,
    secondaryPhase: 1.4,
    verticalFlutterRatio: 0.65,
  }),
  shader: Object.freeze({
    authoredPresentationProceduralMix: 0.18,
  }),
});

function queryValue(search, name) {
  try {
    return new URLSearchParams(search || "").get(name);
  } catch {
    return null;
  }
}

export function getFireLightPreloadAssets() {
  return FIRE_LIGHT_ASSETS;
}

export function resolveFireLightEnabled(
  search = globalThis.location?.search || "",
  config = FIRE_LIGHT_CONFIG
) {
  const selected = queryValue(search, config.rollback.featureParam);
  return config.enabled !== false && selected !== config.rollback.legacyValue && selected !== "0";
}

export function resolveFireRaysEnabled(
  search = globalThis.location?.search || "",
  config = FIRE_LIGHT_CONFIG
) {
  const selected = queryValue(search, config.rollback.raysParam);
  const requested = selected === config.rays.enabledValue
    || (
      config.rays.enabledByDefault === true
      && selected !== "0"
    );
  return resolveFireLightEnabled(search, config) && requested;
}

export function resolveEyeAdaptationEnabled(
  search = globalThis.location?.search || "",
  config = FIRE_LIGHT_CONFIG
) {
  return resolveFireLightEnabled(search, config)
    && config.eyeAdaptation.enabled !== false
    && queryValue(search, config.rollback.eyeAdaptationParam) !== "0";
}

export function resolveReducedFireFlicker(
  search = globalThis.location?.search || "",
  prefersReducedMotion = null,
  config = FIRE_LIGHT_CONFIG
) {
  if (queryValue(search, config.rollback.flickerParam) === config.rollback.reducedValue) {
    return true;
  }
  if (typeof prefersReducedMotion === "boolean") return prefersReducedMotion;
  try {
    return globalThis.matchMedia?.(config.flicker.reducedMotionMediaQuery)?.matches === true;
  } catch {
    return false;
  }
}
