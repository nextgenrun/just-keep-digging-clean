const freezeRange = (min, max) => Object.freeze({ min, max });
const freezeFrames = frames => Object.freeze([...frames]);

const LEVEL_ONE_REGION = Object.freeze({
  leftTile: 0,
  // Cool and warm ambience deliberately overlap through the authored visual
  // handoff (x113..131); gameplay ownership still changes at x132.
  rightTileExclusive: 132,
  topTile: 65,
  bottomTileExclusive: 2065,
  anchorPaddingTiles: 0.45,
});

const LEVEL_TWO_REGION = Object.freeze({
  leftTile: 113,
  rightTileExclusive: 280,
  topTile: 65,
  bottomTileExclusive: 2065,
  anchorPaddingTiles: 0.45,
});

export const LEVEL_ONE_LIVING_BACKDROP = Object.freeze({
  enabled: true,
  queryParam: "worldLiving",
  legacyQueryParam: "level1Living",
  sharedMotionQueryParam: "worldMotion",
  queryEnableValues: Object.freeze(["1", "on", "true"]),
  queryDisableValues: Object.freeze(["0", "off", "false"]),
  tileSize: 94,
  requiresMasterBackground: true,
  requiresDepthBackground: true,
  region: LEVEL_ONE_REGION,
  regions: Object.freeze({
    level1: LEVEL_ONE_REGION,
    level2: LEVEL_TWO_REGION,
  }),
  atlas: Object.freeze({
    sheetName: "atmosphere",
  }),
  performance: Object.freeze({
    updateIntervalMs: 50,
    reducedUpdateIntervalMs: 100,
    reduceBelowFps: 48,
    disableBelowFps: 36,
    cullMarginTiles: 2.5,
    maxVisible: Object.freeze({
      mist: 8,
      crystalAura: 10,
      level2Smoke: 8,
      level2Steam: 9,
    }),
    reducedMaxVisible: Object.freeze({
      mist: 4,
      crystalAura: 5,
      level2Smoke: 4,
      level2Steam: 4,
    }),
  }),
  environment: Object.freeze({
    maxWindPxPerSecond: 96,
    surfaceTile: 65,
    weatherInfluenceDepthTiles: 96,
    deepWindScale: 0.06,
  }),
  layers: Object.freeze({
    mist: Object.freeze({
      region: "level1",
      seed: 1709,
      spacingTilesX: 15,
      spacingTilesY: 18,
      frames: freezeFrames([0, 1, 2, 3, 10, 11]),
      depth: -4.74,
      blendMode: "NORMAL",
      tint: 0x96b7c9,
      periodMs: freezeRange(12000, 16000),
      widthTiles: freezeRange(2.4, 4.8),
      heightTiles: freezeRange(0.55, 1.12),
      alpha: freezeRange(0.022, 0.062),
      swayTiles: 0.16,
      bobTiles: 0.05,
      scalePulse: 0.025,
      rotationRadians: 0.012,
      windTiles: 0.12,
      gustWindBoost: 0.22,
      fogAlphaBoost: 0.42,
      rainAlphaBoost: 0.12,
      nightAlphaBoost: 0.12,
      undergroundSignalAlphaBoost: 0.08,
    }),
    crystalAura: Object.freeze({
      region: "level1",
      seed: 4813,
      spacingTilesX: 18,
      spacingTilesY: 22,
      frames: freezeFrames([10, 11]),
      depth: -4.70,
      blendMode: "SCREEN",
      tint: 0x62dff4,
      periodMs: freezeRange(7000, 11000),
      widthTiles: freezeRange(0.65, 1.45),
      heightTiles: freezeRange(0.5, 1.08),
      alpha: freezeRange(0.028, 0.085),
      swayTiles: 0.08,
      bobTiles: 0.04,
      scalePulse: 0.03,
      rotationRadians: 0.025,
      windTiles: 0.025,
      gustWindBoost: 0.08,
      fogAlphaBoost: 0,
      rainAlphaBoost: 0,
      nightAlphaBoost: 0.58,
      undergroundSignalAlphaBoost: 0.16,
    }),
    level2Smoke: Object.freeze({
      region: "level2",
      seed: 7193,
      spacingTilesX: 17,
      spacingTilesY: 20,
      frames: freezeFrames([4, 5, 6, 7]),
      depth: -4.73,
      blendMode: "NORMAL",
      tint: 0xb99a91,
      periodMs: freezeRange(13000, 18000),
      widthTiles: freezeRange(2.1, 4.2),
      heightTiles: freezeRange(0.58, 1.18),
      alpha: freezeRange(0.018, 0.052),
      swayTiles: 0.14,
      bobTiles: 0.06,
      scalePulse: 0.024,
      rotationRadians: 0.014,
      windTiles: 0.1,
      gustWindBoost: 0.2,
      fogAlphaBoost: 0.16,
      rainAlphaBoost: 0.08,
      nightAlphaBoost: 0.1,
      undergroundSignalAlphaBoost: 0.14,
    }),
    level2Steam: Object.freeze({
      region: "level2",
      seed: 9829,
      spacingTilesX: 18,
      spacingTilesY: 22,
      frames: freezeFrames([8, 9, 10, 11]),
      depth: -4.69,
      blendMode: "SCREEN",
      tint: 0xff9b72,
      periodMs: freezeRange(8500, 13000),
      widthTiles: freezeRange(0.72, 1.62),
      heightTiles: freezeRange(0.62, 1.35),
      alpha: freezeRange(0.022, 0.074),
      swayTiles: 0.09,
      bobTiles: 0.07,
      scalePulse: 0.03,
      rotationRadians: 0.022,
      windTiles: 0.035,
      gustWindBoost: 0.1,
      fogAlphaBoost: 0.08,
      rainAlphaBoost: 0.34,
      nightAlphaBoost: 0.2,
      undergroundSignalAlphaBoost: 0.2,
    }),
  }),
});

export function resolveLevelOneLivingBackdropEnabled(
  config = LEVEL_ONE_LIVING_BACKDROP,
  search = globalThis.location?.search || ""
) {
  const params = new URLSearchParams(search);
  const sharedValue = params.get(config.sharedMotionQueryParam)?.toLowerCase();
  if (sharedValue && config.queryDisableValues.includes(sharedValue)) return false;
  const value = params.get(config.queryParam)?.toLowerCase();
  if (value && config.queryDisableValues.includes(value)) return false;
  const legacyValue = params.get(config.legacyQueryParam)?.toLowerCase();
  if (legacyValue && config.queryDisableValues.includes(legacyValue)) return false;
  if (value && config.queryEnableValues.includes(value)) return true;
  if (legacyValue && config.queryEnableValues.includes(legacyValue)) return true;
  return config.enabled;
}
