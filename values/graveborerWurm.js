export const GRAVEBORER_WURM_PHASES = Object.freeze({
  dormant: "dormant",
  warning: "warning",
  burrowing: "burrowing",
  cooldown: "cooldown",
});

export const GRAVEBORER_WURM_CONFIG = Object.freeze({
  version: 1,
  name: "Graveborer Wurm",
  featureFlags: Object.freeze({
    enabled: true,
    devTest10x: false,
    enabledQuery: "wurm",
    devTest10xQuery: "wurm10x",
    queryEnabledValue: "1",
    queryDisabledValue: "0",
    devActivityMultiplier: 10,
  }),
  activation: Object.freeze({
    minDepthTiles: 120,
    requiresFlightUnlock: true,
  }),
  noise: Object.freeze({
    threshold: 18,
    maximum: 36,
    decayPerSecond: 0.32,
    devPassivePerSecond: 2.2,
    sources: Object.freeze({
      normal: 1,
      quickslash: 1.8,
      heavyPunch: 1.35,
      thunderStrike: 3.4,
      arcCore: 2.2,
      frontierDescent: 1.5,
      devForce: 18,
    }),
  }),
  timing: Object.freeze({
    maxFrameMs: 80,
    initialCooldownMs: 18000,
    cooldownMs: 90000,
    warningMs: 7200,
    devWarningMs: 4200,
    restoredWarningMinMs: 4200,
    travelMs: 4300,
    phaseNoticeCooldownMs: 900,
  }),
  path: Object.freeze({
    spawnDistanceTiles: 8,
    exitDistanceTiles: 9,
    verticalOffsetTiles: 2.4,
    bendTiles: 3.1,
    targetLeadTiles: 0.35,
    segmentCount: 6,
    segmentLagProgress: 0.065,
    tailLagProgress: 0.065,
    warningDecalCount: 5,
    warningStartProgress: 0.18,
    warningEndProgress: 0.84,
    carveStepProgress: 0.026,
    carvePerpendicularTiles: 0.42,
    encounterEndProgress: 1.52,
    tangentSampleProgress: 0.008,
  }),
  combat: Object.freeze({
    headHitRadiusTiles: 0.72,
    bodyHitRadiusTiles: 0.52,
    headDamageMaxGpRatio: 0.52,
    bodyDamageMaxGpRatio: 0.28,
    minimumHeadDamageGp: 28,
    minimumBodyDamageGp: 14,
    maxHitsPerEncounter: 1,
  }),
  visuals: Object.freeze({
    worldDepth: 82,
    warningDepth: 81,
    headHeightTiles: 1.58,
    bodyHeightTiles: 1.02,
    bodyWidthTiles: 1.12,
    tailHeightTiles: 0.94,
    warningWidthTiles: 2.7,
    warningAlphaMin: 0.24,
    warningAlphaMax: 0.82,
    warningPulseHz: 2.2,
    bodyWaveTiles: 0.08,
    bodyWaveHz: 2.6,
    bodyWavePhase: 0.72,
    headPulseAmount: 0.055,
    headPulseHz: 3.4,
    burrowAlphaFadeProgress: 0.12,
    hudX: 390,
    hudY: 66,
    hudSizePx: 104,
    hudDepth: 2580,
    hudDormantAlpha: 0.34,
    hudListeningAlpha: 0.76,
    hudActiveAlpha: 1,
    hudPulseAmount: 0.08,
    hudWarningPulseHz: 2.8,
    hudBurrowPulseHz: 4.8,
    hudDormantTint: 0x77727d,
    hudListeningTint: 0xd8a55c,
    hudWarningTint: 0xff715f,
    hudBurrowTint: 0xffffff,
    hudLabelOffsetY: 61,
    hudLabelFont: "Georgia, serif",
    hudLabelFontSizePx: 16,
    hudLabelStrokeColor: "#120908",
    hudLabelStrokeThickness: 5,
    hudLabelDormantColor: "#8d8793",
    hudLabelListeningColor: "#e7be78",
    hudLabelWarningColor: "#ff8b73",
    hudLabelBurrowColor: "#fff1dc",
  }),
  labels: Object.freeze({
    dormant: "THE DEEP IS QUIET",
    listening: "IT IS LISTENING",
    warningPrefix: "BREACH IN",
    burrowing: "MOVE • FLIGHT OR COVER",
    hitPrefix: "WURM HIT",
    missed: "THE GRAVEBORER PASSED",
  }),
  assets: Object.freeze({
    basePath: "sprites/environment/graveborer-wurm-v1",
    headFile: "graveborer-head-runtime-v1.webp",
    bodyFile: "graveborer-body-runtime-v1.webp",
    tailFile: "graveborer-tail-runtime-v1.webp",
    medallionFile: "graveborer-medallion-runtime-v1.webp",
    warningFile: "graveborer-burrow-warning-runtime-v1.webp",
  }),
  diagnostics: Object.freeze({
    globalKey: "__jkdGraveborerWurm",
  }),
});

function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sanitizeTile(tile) {
  if (!Number.isInteger(tile?.tx) || !Number.isInteger(tile?.ty)) return null;
  return {
    tx: Math.max(0, tile.tx),
    ty: Math.max(0, tile.ty),
  };
}

export function sanitizeGraveborerWurmData(data) {
  const validPhases = new Set(Object.values(GRAVEBORER_WURM_PHASES));
  const phase = validPhases.has(data?.phase)
    ? data.phase
    : GRAVEBORER_WURM_PHASES.dormant;
  return {
    version: GRAVEBORER_WURM_CONFIG.version,
    phase,
    noise: clamp(
      finiteOr(data?.noise, 0),
      0,
      GRAVEBORER_WURM_CONFIG.noise.maximum,
    ),
    cooldownMs: Math.max(0, finiteOr(data?.cooldownMs, 0)),
    warningRemainingMs: Math.max(0, finiteOr(data?.warningRemainingMs, 0)),
    progress: clamp(
      finiteOr(data?.progress, 0),
      0,
      GRAVEBORER_WURM_CONFIG.path.encounterEndProgress,
    ),
    encounterCount: Math.max(0, Math.floor(finiteOr(data?.encounterCount, 0))),
    targetTile: sanitizeTile(data?.targetTile),
    lastNoiseTile: sanitizeTile(data?.lastNoiseTile),
    direction: data?.direction === -1 ? -1 : 1,
    hitConsumed: data?.hitConsumed === true,
  };
}
