const freezeAnchors = anchors => Object.freeze(
  anchors.map(anchor => Object.freeze(anchor))
);

// Runtime-tile coordinates are derived from the approved v11 manifest crop
// (source TMX offset -40,-40). They intentionally stop at exactly 20 m.
const TOWN_LIGHTS = freezeAnchors([
  { xTile: 4.1, yTile: 64.1, phase: 0.07, scale: 0.82 },
  { xTile: 7.7, yTile: 64.2, phase: 0.39, scale: 0.95 },
  { xTile: 11.2, yTile: 64.0, phase: 0.71, scale: 0.78 },
  { xTile: 16.7, yTile: 63.9, phase: 0.23, scale: 1.08 },
  { xTile: 20.9, yTile: 63.8, phase: 0.58, scale: 0.84 },
  { xTile: 23.5, yTile: 64.0, phase: 0.91, scale: 0.72 },
  { xTile: 30.3, yTile: 63.7, phase: 0.31, scale: 0.88 },
  { xTile: 35.9, yTile: 63.8, phase: 0.66, scale: 1.08 },
  { xTile: 40.7, yTile: 64.1, phase: 0.12, scale: 0.74 },
  { xTile: 43.1, yTile: 63.9, phase: 0.48, scale: 0.82 },
  { xTile: 47.8, yTile: 64.0, phase: 0.82, scale: 0.94 },
  { xTile: 53.1, yTile: 63.9, phase: 0.18, scale: 0.76 },
  { xTile: 57.2, yTile: 64.0, phase: 0.55, scale: 0.88 },
  { xTile: 62.4, yTile: 63.9, phase: 0.96, scale: 1.0 },
  { xTile: 66.1, yTile: 64.2, phase: 0.35, scale: 0.72 },
]);

const TOWN_SMOKE = freezeAnchors([
  { xTile: 6.3, yTile: 62.9, phase: 0.04, scale: 0.9 },
  { xTile: 12.5, yTile: 62.7, phase: 0.33, scale: 0.72 },
  { xTile: 18.5, yTile: 62.8, phase: 0.62, scale: 0.86 },
  { xTile: 25.0, yTile: 62.6, phase: 0.87, scale: 0.76 },
  { xTile: 32.4, yTile: 62.7, phase: 0.21, scale: 1.0 },
  { xTile: 39.5, yTile: 62.9, phase: 0.51, scale: 0.74 },
  { xTile: 45.3, yTile: 62.8, phase: 0.79, scale: 0.88 },
  { xTile: 51.7, yTile: 62.6, phase: 0.14, scale: 0.82 },
  { xTile: 58.8, yTile: 62.9, phase: 0.43, scale: 0.72 },
  { xTile: 64.5, yTile: 62.7, phase: 0.73, scale: 0.9 },
]);

const LEVEL1_CRYSTALS = freezeAnchors([
  { xTile: 5.5, yTile: 68.7, phase: 0.08, scale: 0.86 },
  { xTile: 18.2, yTile: 72.2, phase: 0.41, scale: 0.72 },
  { xTile: 31.6, yTile: 66.9, phase: 0.76, scale: 1.0 },
  { xTile: 43.8, yTile: 70.5, phase: 0.19, scale: 0.82 },
  { xTile: 55.7, yTile: 73.0, phase: 0.53, scale: 0.92 },
  { xTile: 68.4, yTile: 68.1, phase: 0.88, scale: 0.76 },
  { xTile: 80.2, yTile: 71.5, phase: 0.27, scale: 1.06 },
  { xTile: 92.0, yTile: 66.7, phase: 0.64, scale: 0.8 },
  { xTile: 104.5, yTile: 72.4, phase: 0.02, scale: 0.94 },
  { xTile: 115.3, yTile: 69.1, phase: 0.37, scale: 0.78 },
]);

const LEVEL1_DRIPS = freezeAnchors([
  { xTile: 10.8, yTile: 66.1, phase: 0.16, scale: 0.8 },
  { xTile: 28.7, yTile: 68.0, phase: 0.72, scale: 0.66 },
  { xTile: 47.3, yTile: 65.8, phase: 0.39, scale: 0.9 },
  { xTile: 70.7, yTile: 67.1, phase: 0.91, scale: 0.72 },
  { xTile: 91.8, yTile: 69.0, phase: 0.53, scale: 0.84 },
  { xTile: 109.1, yTile: 66.2, phase: 0.05, scale: 0.7 },
]);

const LEVEL2_EMBERS = freezeAnchors([
  { xTile: 116.2, yTile: 68.1, phase: 0.11, scale: 0.78 },
  { xTile: 128.6, yTile: 72.5, phase: 0.42, scale: 0.94 },
  { xTile: 141.3, yTile: 66.9, phase: 0.73, scale: 0.72 },
  { xTile: 154.8, yTile: 70.7, phase: 0.04, scale: 1.0 },
  { xTile: 167.4, yTile: 73.1, phase: 0.36, scale: 0.84 },
  { xTile: 180.1, yTile: 67.8, phase: 0.67, scale: 0.76 },
  { xTile: 193.2, yTile: 71.6, phase: 0.98, scale: 0.9 },
  { xTile: 206.0, yTile: 66.7, phase: 0.29, scale: 0.82 },
  { xTile: 219.2, yTile: 72.8, phase: 0.61, scale: 1.04 },
  { xTile: 232.1, yTile: 69.3, phase: 0.92, scale: 0.72 },
  { xTile: 245.0, yTile: 67.2, phase: 0.23, scale: 0.88 },
  { xTile: 257.8, yTile: 71.2, phase: 0.55, scale: 0.8 },
  { xTile: 270.6, yTile: 73.0, phase: 0.86, scale: 0.96 },
  { xTile: 278.0, yTile: 68.5, phase: 0.17, scale: 0.74 },
]);

const LEVEL2_STEAM = freezeAnchors([
  { xTile: 120.5, yTile: 65.7, phase: 0.26, scale: 0.78 },
  { xTile: 144.9, yTile: 68.2, phase: 0.68, scale: 0.94 },
  { xTile: 169.6, yTile: 66.0, phase: 0.09, scale: 0.74 },
  { xTile: 194.4, yTile: 69.0, phase: 0.51, scale: 0.88 },
  { xTile: 219.5, yTile: 65.8, phase: 0.93, scale: 0.8 },
  { xTile: 244.1, yTile: 68.6, phase: 0.34, scale: 0.98 },
  { xTile: 263.8, yTile: 66.2, phase: 0.76, scale: 0.72 },
  { xTile: 276.0, yTile: 69.4, phase: 0.18, scale: 0.84 },
]);

export const WORLD_BACKGROUND_AMBIENT_MOTION = Object.freeze({
  enabled: true,
  tileSize: 94,
  requiresMasterBackground: true,
  queryParam: "worldMotion",
  queryEnableValues: Object.freeze(["1", "on", "true"]),
  queryDisableValues: Object.freeze(["0", "off", "false"]),
  rows: Object.freeze({ top: 54, surface: 65, bottom: 74.41176470588235 }),
  regions: Object.freeze({
    town: Object.freeze({ left: 3, right: 68, top: 62, bottom: 65 }),
    level1: Object.freeze({ left: 1, right: 119, top: 65, bottom: 74.41176470588235 }),
    level2: Object.freeze({ left: 113, right: 280, top: 65, bottom: 74.41176470588235 }),
  }),
  performance: Object.freeze({
    updateIntervalMs: 33,
    reducedUpdateIntervalMs: 50,
    reduceBelowFps: 48,
    disableBelowFps: 36,
    maxVisibleAnchors: 42,
    reducedMaxVisibleAnchors: 24,
    reducedAnchorStride: 2,
    cullMarginTiles: 2.5,
    maxWindPxPerSecond: 96,
  }),
  render: Object.freeze({ depth: -4.70, minVisibleAlpha: 0.002 }),
  townLight: Object.freeze({
    color: 0xffc46b,
    coreColor: 0xffe2a3,
    dayAlpha: 0.025,
    nightAlpha: 0.13,
    coreAlpha: 0.15,
    radiusTiles: 0.13,
    flickerHz: 1.35,
    flickerBase: 0.88,
    flickerRange: 0.12,
    rainDimming: 0.16,
    coreRadiusScale: 0.28,
  }),
  smoke: Object.freeze({
    color: 0xaab5bd,
    alpha: 0.065,
    periodMs: 5200,
    riseTiles: 0.72,
    widthTiles: 0.21,
    heightTiles: 0.07,
    windSeconds: 0.16,
    rainSuppression: 0.42,
  }),
  crystal: Object.freeze({
    color: 0x52d9ff,
    coreColor: 0xb8f4ff,
    alpha: 0.085,
    coreAlpha: 0.13,
    radiusTiles: 0.16,
    pulseHz: 0.42,
    pulseBase: 0.76,
    pulseRange: 0.24,
    coreRadiusScale: 0.24,
    moteOrbitTiles: 0.2,
    moteRadiusTiles: 0.018,
    moteHz: 0.23,
    moteYScale: 0.45,
  }),
  drip: Object.freeze({
    color: 0x8dd8e8,
    alpha: 0.16,
    periodMs: 3600,
    fallTiles: 0.42,
    lengthTiles: 0.07,
    radiusTiles: 0.018,
    lineAlphaScale: 0.55,
    minLineWidthPx: 1,
  }),
  ember: Object.freeze({
    color: 0xff7b32,
    hotColor: 0xffc15a,
    alpha: 0.2,
    periodMs: 3100,
    riseTiles: 0.48,
    driftTiles: 0.12,
    windSeconds: 0.05,
    radiusTiles: 0.018,
    hotAlphaScale: 0.62,
    hotRadiusScale: 0.42,
  }),
  steam: Object.freeze({
    color: 0xd8b8a8,
    alpha: 0.055,
    periodMs: 4600,
    riseTiles: 0.58,
    widthTiles: 0.18,
    heightTiles: 0.055,
    windSeconds: 0.12,
    rainBoost: 0.35,
  }),
  anchors: Object.freeze({
    townLights: TOWN_LIGHTS,
    townSmoke: TOWN_SMOKE,
    level1Crystals: LEVEL1_CRYSTALS,
    level1Drips: LEVEL1_DRIPS,
    level2Embers: LEVEL2_EMBERS,
    level2Steam: LEVEL2_STEAM,
  }),
});

export function resolveWorldBackgroundAmbientMotionEnabled(
  config = WORLD_BACKGROUND_AMBIENT_MOTION,
  search = globalThis.location?.search || ""
) {
  const value = new URLSearchParams(search).get(config.queryParam)?.toLowerCase();
  if (value && config.queryDisableValues.includes(value)) return false;
  if (value && config.queryEnableValues.includes(value)) return true;
  return config.enabled;
}
