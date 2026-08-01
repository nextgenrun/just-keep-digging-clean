const LAMP_ASSET_BASE = "sprites/environment/old-school-lamp-light-v1";
const FRAME_SIZE_PX = 313;
const FRAMES_PER_ATLAS = 16;

const makeAtlas = (id, key, filename) => Object.freeze({
  id,
  key,
  path: `${LAMP_ASSET_BASE}/${filename}`,
  frameCount: FRAMES_PER_ATLAS,
  frameConfig: Object.freeze({
    frameWidth: FRAME_SIZE_PX,
    frameHeight: FRAME_SIZE_PX,
    startFrame: 0,
    endFrame: FRAMES_PER_ATLAS - 1,
  }),
});

export const OLD_SCHOOL_LAMP_LIGHT_ASSETS = Object.freeze([
  makeAtlas("source", "old-school-lamp-v1-source", "old-school-lamp-source-v1.png"),
  makeAtlas("lightVolume", "old-school-lamp-v1-volume", "old-school-lamp-volume-v1.png"),
  makeAtlas("rays", "old-school-lamp-v1-rays", "old-school-lamp-rays-v1.png"),
  makeAtlas("penumbra", "old-school-lamp-v1-penumbra", "old-school-lamp-penumbra-v1.png"),
  makeAtlas("bounce", "old-school-lamp-v1-bounce", "old-school-lamp-bounce-v1.png"),
  makeAtlas("hotCore", "old-school-lamp-v1-hot-core", "old-school-lamp-hot-core-v1.png"),
  makeAtlas("atmosphere", "old-school-lamp-v1-atmosphere", "old-school-lamp-atmosphere-v1.png"),
]);

const ASSET_KEYS = Object.freeze(
  Object.fromEntries(OLD_SCHOOL_LAMP_LIGHT_ASSETS.map(asset => [asset.id, asset.key]))
);

export const OLD_SCHOOL_LAMP_LIGHT_CONFIG = Object.freeze({
  id: "old-school-lamp-light-v1",
  revision: "2026-07-30-imagegen-piskel-v1",
  reviewOnly: true,
  selection: Object.freeze({
    param: "carriedLightStyle",
    value: "lamp-review",
  }),
  assetKeys: ASSET_KEYS,
  atlas: Object.freeze({
    frameSizePx: FRAME_SIZE_PX,
    frameCount: FRAMES_PER_ATLAS,
    columns: 4,
    rows: 4,
    authoredComponentCount: OLD_SCHOOL_LAMP_LIGHT_ASSETS.length * FRAMES_PER_ATLAS,
    authoredLightFrameCount: (OLD_SCHOOL_LAMP_LIGHT_ASSETS.length - 1) * FRAMES_PER_ATLAS,
  }),
  renderDepth: Object.freeze({
    penumbra: 899.03,
    lightVolume: 899.06,
    rays: 899.10,
    bounce: 899.14,
    hotCore: 899.30,
    atmosphere: 899.36,
    source: 899.44,
    eyeDarkVeil: 902,
    eyeBloom: 903,
  }),
  fixture: Object.freeze({
    framesPerSecond: 8,
    framePhaseOffset: 0,
    displayWidthTiles: 0.68,
    displayHeightTiles: 0.98,
    originY: 0.08,
    verticalOffsetTiles: 0,
    alpha: 0.92,
    lowFuelRatio: 0.22,
    lowFuelAlpha: 0.58,
    swayRadians: 0.022,
    swayRadiansPerMs: 0.0021,
  }),
  lightVolume: Object.freeze({
    framesPerSecond: 5,
    framePhaseOffset: 5,
    diameterScale: 1.72,
    verticalScale: 0.82,
    verticalOffsetTiles: 0.48,
    alpha: 0.34,
    surfaceDayAlpha: 0.22,
    rainAlphaMultiplier: 0.92,
  }),
  penumbra: Object.freeze({
    framesPerSecond: 3,
    framePhaseOffset: 9,
    diameterScale: 2.02,
    verticalScale: 0.92,
    verticalOffsetTiles: 0.48,
    alpha: 0.28,
    surfaceDayAlpha: 0.18,
  }),
  bounce: Object.freeze({
    framesPerSecond: 2,
    framePhaseOffset: 11,
    widthScale: 1.42,
    heightScale: 0.42,
    verticalOffsetTiles: 0.86,
    alpha: 0.28,
  }),
  hotCore: Object.freeze({
    framesPerSecond: 7,
    framePhaseOffset: 2,
    displayWidthTiles: 0.48,
    displayHeightTiles: 0.60,
    originY: 0.5,
    verticalOffsetTiles: 0.52,
    alpha: 0.46,
  }),
  atmosphere: Object.freeze({
    framesPerSecond: 4,
    framePhaseOffset: 7,
    displayWidthTiles: 2.05,
    displayHeightTiles: 2.25,
    originY: 0.62,
    verticalOffsetTiles: 0.36,
    alpha: 0.24,
    rainAlphaMultiplier: 0.70,
  }),
  rays: Object.freeze({
    enabledByDefault: false,
    queryParam: "fireRays",
    enabledValue: "1",
    framesPerSecond: 3,
    relativeAnglesDegrees: Object.freeze([-18, 0, 18]),
    baseTextureAngleDegrees: 43,
    textureOriginX: 66 / FRAME_SIZE_PX,
    textureOriginY: 68 / FRAME_SIZE_PX,
    textureExtentScale: 1.18,
    sourceVerticalOffsetTiles: 0.52,
    maxLengthTiles: 5.2,
    minimumLengthTiles: 0.58,
    collisionPaddingTiles: 0.18,
    sampleStepTiles: 0.18,
    refreshIntervalMs: 120,
    alpha: Object.freeze([0.13, 0.22, 0.14]),
    frameOffsets: Object.freeze([1, 7, 12]),
    undergroundAlpha: 1,
    surfaceNightAlpha: 0.42,
    surfaceDayAlpha: 0.08,
    rainAlphaMultiplier: 0.72,
    dustAlphaMultiplier: 0.55,
  }),
  eyeAdaptation: Object.freeze({
    enabled: true,
    initialLuminance: 0.72,
    minimumLuminance: 0.025,
    surfaceNightLuminance: 0.10,
    torchLuminance: 0.28,
    lightningLuminance: 0.95,
    darkResponsePerSecond: 0.78,
    lightResponsePerSecond: 4.2,
    targetResponsePerSecond: 5.0,
    maximumDarkVeilAlpha: 0.28,
    maximumBloomAlpha: 0.18,
    differenceForMaximumEffect: 0.72,
    inactiveAlphaThreshold: 0.002,
    bloomFrame: 3,
    bloomScale: 1.55,
    reducedEffectScale: 0.35,
    darkVeilColor: 0x030407,
    bloomTint: 0xffd28f,
  }),
  flicker: Object.freeze({
    reducedMotionMediaQuery: "(prefers-reduced-motion: reduce)",
    reducedScale: 0.18,
    alphaAmount: 0.026,
    scaleAmount: 0.012,
    radiansPerMs: 0.0042,
    secondaryFrequency: 1.83,
    secondaryPhase: 0.8,
  }),
  shader: Object.freeze({
    authoredPresentationProceduralMix: 0.12,
  }),
});

function queryValue(search, name) {
  try {
    return new URLSearchParams(search || "").get(name);
  } catch {
    return null;
  }
}

export function resolveOldSchoolLampLightReviewEnabled(
  search = globalThis.location?.search || "",
  config = OLD_SCHOOL_LAMP_LIGHT_CONFIG
) {
  return config.reviewOnly === true
    && queryValue(search, config.selection.param) === config.selection.value;
}

export function resolveOldSchoolLampRaysEnabled(
  search = globalThis.location?.search || "",
  config = OLD_SCHOOL_LAMP_LIGHT_CONFIG
) {
  const selected = queryValue(search, config.rays.queryParam);
  const requested = selected === config.rays.enabledValue
    || (
      config.rays.enabledByDefault === true
      && selected !== "0"
    );
  return resolveOldSchoolLampLightReviewEnabled(search, config)
    && requested;
}

export function getOldSchoolLampLightPreloadAssets(
  search = globalThis.location?.search || ""
) {
  return resolveOldSchoolLampLightReviewEnabled(search)
    ? OLD_SCHOOL_LAMP_LIGHT_ASSETS
    : [];
}
