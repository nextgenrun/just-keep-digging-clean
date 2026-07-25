const freezeRange = (min, max) => Object.freeze({ min, max });
const freezeFrames = frames => Object.freeze([...frames]);
const freezeBand = (alphaScale, tint) => Object.freeze({ alphaScale, tint });

const REGION = Object.freeze({
  leftTile: 132,
  rightTileExclusive: 280,
  topTile: 2065,
  bottomTileExclusive: 5065,
  anchorPaddingTiles: 0.45,
});

export const DEEP_WORLD_LIVING_BACKDROP = Object.freeze({
  enabled: true,
  queryParam: "deepWorldLiving",
  sharedMotionQueryParam: "worldMotion",
  queryEnableValues: Object.freeze(["1", "on", "true"]),
  queryDisableValues: Object.freeze(["0", "off", "false"]),
  tileSize: 94,
  requiresMasterBackground: true,
  requiresDepthBackground: true,
  requiresWorldFacade: true,
  region: REGION,
  anchorJitterFactor: 0.58,
  atlas: Object.freeze({ sheetName: "atmosphere" }),
  performance: Object.freeze({
    updateIntervalMs: 50,
    reducedUpdateIntervalMs: 100,
    reduceBelowFps: 46,
    disableBelowFps: 34,
    cullMarginTiles: 2.5,
    maxVisible: Object.freeze({ ember: 12, steam: 8, ash: 10, magmaAura: 10 }),
    reducedMaxVisible: Object.freeze({ ember: 6, steam: 4, ash: 5, magmaAura: 5 }),
  }),
  environment: Object.freeze({
    maxWindPxPerSecond: 96,
    deepWindScale: 0.025,
    deepWeatherScale: 0.045,
    gustWindBoost: 0.22,
  }),
  motion: Object.freeze({
    crossWaveRate: 0.73,
    minAlphaEnvelope: 0.72,
  }),
  layers: Object.freeze({
    ember: Object.freeze({
      seed: 12017,
      spacingTilesX: 11,
      spacingTilesY: 17,
      frames: freezeFrames([10, 11]),
      depth: 2.38,
      blendMode: "SCREEN",
      periodMs: freezeRange(8000, 13000),
      widthTiles: freezeRange(0.14, 0.30),
      heightTiles: freezeRange(0.10, 0.22),
      alpha: freezeRange(0.10, 0.24),
      swayTiles: 0.12,
      bobTiles: 0.18,
      scalePulse: 0.08,
      rotationRadians: 0.04,
      windTiles: 0.20,
      rainAlphaBoost: 0,
      fogAlphaBoost: 0,
      nightAlphaBoost: 0.08,
      bands: Object.freeze({
        "level2-magma": freezeBand(1, 0xff7a32),
        "level2-obsidian": freezeBand(0.62, 0xf2632f),
        "level2-foundry": freezeBand(0.82, 0xffa044),
        "level2-blackglass": freezeBand(0.38, 0xe25342),
        "level2-starfire": freezeBand(1.1, 0xffc166),
      }),
    }),
    steam: Object.freeze({
      seed: 22063,
      spacingTilesX: 19,
      spacingTilesY: 24,
      frames: freezeFrames([8, 9]),
      depth: 2.35,
      blendMode: "SCREEN",
      periodMs: freezeRange(11000, 19000),
      widthTiles: freezeRange(1.15, 2.75),
      heightTiles: freezeRange(0.72, 1.65),
      alpha: freezeRange(0.025, 0.075),
      swayTiles: 0.16,
      bobTiles: 0.08,
      scalePulse: 0.035,
      rotationRadians: 0.018,
      windTiles: 0.14,
      rainAlphaBoost: 0.35,
      fogAlphaBoost: 0.12,
      nightAlphaBoost: 0.06,
      bands: Object.freeze({
        "level2-magma": freezeBand(0.72, 0xffb083),
        "level2-foundry": freezeBand(1, 0xd7c6b9),
        "level2-blackglass": freezeBand(0.22, 0xa7aab7),
        "level2-starfire": freezeBand(0.42, 0xffd6ad),
      }),
    }),
    ash: Object.freeze({
      seed: 34039,
      spacingTilesX: 13,
      spacingTilesY: 18,
      frames: freezeFrames([4, 5, 6, 7]),
      depth: 2.34,
      blendMode: "NORMAL",
      periodMs: freezeRange(13000, 20000),
      widthTiles: freezeRange(0.22, 0.52),
      heightTiles: freezeRange(0.16, 0.38),
      alpha: freezeRange(0.025, 0.082),
      swayTiles: 0.14,
      bobTiles: 0.10,
      scalePulse: 0.025,
      rotationRadians: 0.06,
      windTiles: 0.16,
      rainAlphaBoost: -0.18,
      fogAlphaBoost: 0.10,
      nightAlphaBoost: 0.05,
      bands: Object.freeze({
        "level2-obsidian": freezeBand(1, 0x8f7f7b),
        "level2-foundry": freezeBand(0.62, 0xa88c7d),
        "level2-blackglass": freezeBand(1.08, 0x777986),
        "level2-starfire": freezeBand(0.58, 0xa08d8c),
      }),
    }),
    magmaAura: Object.freeze({
      seed: 46091,
      spacingTilesX: 17,
      spacingTilesY: 21,
      frames: freezeFrames([10, 11]),
      depth: 2.40,
      blendMode: "SCREEN",
      periodMs: freezeRange(9000, 16000),
      widthTiles: freezeRange(1.2, 3.1),
      heightTiles: freezeRange(0.32, 0.82),
      alpha: freezeRange(0.035, 0.105),
      swayTiles: 0.08,
      bobTiles: 0.035,
      scalePulse: 0.04,
      rotationRadians: 0.015,
      windTiles: 0.045,
      rainAlphaBoost: 0.08,
      fogAlphaBoost: 0.04,
      nightAlphaBoost: 0.16,
      bands: Object.freeze({
        "level2-magma": freezeBand(1, 0xff5b28),
        "level2-obsidian": freezeBand(0.28, 0xd73c2f),
        "level2-foundry": freezeBand(0.76, 0xff8e38),
        "level2-blackglass": freezeBand(0.38, 0xd24049),
        "level2-starfire": freezeBand(1.12, 0xffba58),
      }),
    }),
  }),
});

export function resolveDeepWorldLivingBackdropEnabled(
  config = DEEP_WORLD_LIVING_BACKDROP,
  search = globalThis.location?.search || ""
) {
  const params = new URLSearchParams(search);
  const sharedValue = params.get(config.sharedMotionQueryParam)?.toLowerCase();
  if (sharedValue && config.queryDisableValues.includes(sharedValue)) return false;
  const value = params.get(config.queryParam)?.toLowerCase();
  if (value && config.queryDisableValues.includes(value)) return false;
  if (value && config.queryEnableValues.includes(value)) return true;
  return config.enabled;
}
