const FIRE_ILLUMINATION_ASSET_BASE = "sprites/environment/fire-light-v3";
const FRAME_SIZE_PX = 313;
const FRAMES_PER_ATLAS = 16;

const makeAtlas = (id, key, filename) => Object.freeze({
  id,
  key,
  path: `${FIRE_ILLUMINATION_ASSET_BASE}/${filename}`,
  frameCount: FRAMES_PER_ATLAS,
  frameConfig: Object.freeze({
    frameWidth: FRAME_SIZE_PX,
    frameHeight: FRAME_SIZE_PX,
    startFrame: 0,
    endFrame: FRAMES_PER_ATLAS - 1,
  }),
});

export const FIRE_ILLUMINATION_ASSETS = Object.freeze([
  makeAtlas(
    "hotCore",
    "fire-light-v3-hot-core",
    "fire-light-hot-core-v3.png"
  ),
  makeAtlas(
    "penumbra",
    "fire-light-v3-penumbra",
    "fire-light-penumbra-v3.png"
  ),
  makeAtlas(
    "bounce",
    "fire-light-v3-bounce",
    "fire-light-bounce-v3.png"
  ),
  makeAtlas(
    "breakup",
    "fire-light-v3-breakup",
    "fire-light-breakup-v3.png"
  ),
  makeAtlas(
    "environment",
    "fire-light-v3-environment",
    "fire-light-environment-v3.png"
  ),
]);

const ASSET_KEYS = Object.freeze(
  Object.fromEntries(
    FIRE_ILLUMINATION_ASSETS.map(asset => [asset.id, asset.key])
  )
);

export const FIRE_ILLUMINATION_CONFIG = Object.freeze({
  id: "fire-illumination-v3",
  revision: "2026-07-30-imagegen-v2",
  enabled: true,
  assetKeys: ASSET_KEYS,
  atlas: Object.freeze({
    frameSizePx: FRAME_SIZE_PX,
    frameCount: FRAMES_PER_ATLAS,
    columns: 4,
    rows: 4,
    authoredComponentCount: FIRE_ILLUMINATION_ASSETS.length * FRAMES_PER_ATLAS,
    retainedVolumeFrameCount: 16,
    totalAuthoredLightFrameCount: 96,
  }),
  rollback: Object.freeze({
    texturesParam: "fireLightTextures",
  }),
  renderDepth: Object.freeze({
    penumbra: 899.02,
    bounce: 899.04,
    hotCore: 899.065,
    breakup: 899.075,
    environment: 899.085,
  }),
  layerOrder: Object.freeze([
    "penumbra",
    "bounce",
    "hotCore",
    "breakup",
  ]),
  integration: Object.freeze({
    baseVolumeAlphaScale: 0.56,
    proceduralShaderMix: 0.10,
  }),
  environmentIntensity: Object.freeze({
    underground: 1,
    surfaceNight: 0.62,
    surfaceDay: 0.16,
    lowFuelMinimumScale: 0.30,
    lowFuelReferenceRatio: 0.22,
  }),
  motion: Object.freeze({
    radiansPerMs: 0.0048,
    alphaAmount: 0.055,
    scaleAmount: 0.018,
    reducedFrameRateScale: 0.34,
    reducedPulseScale: 0.22,
  }),
  layers: Object.freeze({
    hotCore: Object.freeze({
      framesPerSecond: 10.5,
      framePhaseOffset: 2,
      rainMultiplier: 0.84,
      flipWithFacing: true,
      widthRadiusScale: 0.78,
      heightRadiusScale: 0.65,
      verticalOffsetTiles: 0.015,
      alpha: 0.22,
      originY: 0.5,
    }),
    penumbra: Object.freeze({
      framesPerSecond: 3.6,
      framePhaseOffset: 7,
      rainMultiplier: 0.76,
      flipWithFacing: false,
      widthRadiusScale: 2.05,
      heightRadiusScale: 1.55,
      verticalOffsetTiles: 0.08,
      alpha: 0.16,
      originY: 0.5,
    }),
    bounce: Object.freeze({
      framesPerSecond: 2.8,
      framePhaseOffset: 11,
      rainMultiplier: 1.08,
      flipWithFacing: true,
      widthRadiusScale: 1.72,
      heightRadiusScale: 1.34,
      verticalOffsetTiles: 0.02,
      alpha: 0.14,
      originY: 0.34,
    }),
    breakup: Object.freeze({
      framesPerSecond: 4.6,
      framePhaseOffset: 13,
      rainMultiplier: 0.58,
      flipWithFacing: true,
      widthRadiusScale: 1.88,
      heightRadiusScale: 1.48,
      verticalOffsetTiles: 0.06,
      alpha: 0.085,
      originY: 0.5,
    }),
    environment: Object.freeze({
      framesPerSecond: 8,
      widthRadiusScale: 1.82,
      heightRadiusScale: 1.42,
      verticalOffsetTiles: 0.05,
      originY: 0.5,
      stateRows: Object.freeze({
        wind: 0,
        rain: 1,
        lowFuel: 2,
        rekindle: 3,
      }),
      stateAlpha: Object.freeze({
        steady: 0,
        wind: 0.12,
        rain: 0.16,
        lowFuel: 0.10,
        rekindle: 0.20,
      }),
    }),
  }),
});

function queryValue(search, name) {
  try {
    return new URLSearchParams(search || "").get(name);
  } catch {
    return null;
  }
}

export function getFireIlluminationPreloadAssets() {
  return FIRE_ILLUMINATION_ASSETS;
}

export function resolveFireIlluminationEnabled(
  search = globalThis.location?.search || "",
  parentEnabled = true,
  config = FIRE_ILLUMINATION_CONFIG
) {
  return Boolean(
    parentEnabled
    && config.enabled !== false
    && queryValue(search, config.rollback.texturesParam) !== "0"
  );
}
