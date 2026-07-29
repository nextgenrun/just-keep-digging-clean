export const GRAVEBORER_WURM_PHASES = Object.freeze({
  dormant: "dormant",
  warning: "warning",
  burrowing: "burrowing",
  cooldown: "cooldown",
});

export const GRAVEBORER_WURM_CONFIG = Object.freeze({
  version: 4,
  name: "Graveborer Wurm",
  featureFlags: Object.freeze({
    enabled: true,
    devTest10x: false,
    enabledQuery: "wurm",
    devTest10xQuery: "wurm10x",
    queryEnabledValue: "1",
    queryDisabledValue: "0",
  }),
  frequency: Object.freeze({
    productionActivityMultiplier: 1,
    devActivityMultiplier: 10,
    liveOccurrenceRatioVsDev: 0.1,
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
    maxFrameMs: 50,
    initialCooldownMs: 18000,
    cooldownMs: 90000,
    warningMs: 3600,
    devWarningMs: 1800,
    restoredWarningMinMs: 2400,
    travelMs: 1900,
    phaseNoticeCooldownMs: 900,
  }),
  difficulty: Object.freeze({
    fullDangerDepthTiles: 2200,
    passCountAtStart: 2,
    maximumPassCount: 6,
    passCountDepthStepTiles: 450,
    warningMsAtFullDepth: 2000,
    minimumWarningMs: 1200,
    minimumDevWarningMs: 900,
    warningReductionPerPassMs: 160,
    travelMsAtFullDepth: 950,
    minimumTravelMs: 520,
    travelReductionPerPassMs: 85,
    headDamageRatioAtFullDepth: 1.08,
    bodyDamageRatioAtFullDepth: 0.94,
    headDamageRatioPerPass: 0.04,
    bodyDamageRatioPerPass: 0.025,
    maximumHeadDamageRatio: 1.28,
    maximumBodyDamageRatio: 1.08,
    minimumHeadDamageAtFullDepth: 120,
    minimumBodyDamageAtFullDepth: 90,
    minimumHeadDamagePerPass: 5,
    minimumBodyDamagePerPass: 3,
    maximumMinimumHeadDamageGp: 160,
    maximumMinimumBodyDamageGp: 120,
    threatPercentAtStart: 25,
    threatPercentAtFullDepth: 100,
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
    carveLaneOffsetsTiles: Object.freeze([-1, 0, 1]),
    encounterEndProgress: 1.52,
    tangentSampleProgress: 0.008,
  }),
  combat: Object.freeze({
    headHitRadiusTiles: 0.72,
    bodyHitRadiusTiles: 0.52,
    headDamageMaxGpRatio: 0.96,
    bodyDamageMaxGpRatio: 0.78,
    minimumHeadDamageGp: 60,
    minimumBodyDamageGp: 45,
    criticalRemainingMaxGpRatio: 0.1,
    maxHitsPerPass: 1,
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
    hudX: 370,
    hudY: 150,
    hudSizePx: 104,
    hudDepth: 2580,
    hudDormantAlpha: 0.34,
    hudListeningAlpha: 0.76,
    hudActiveAlpha: 1,
    hudPulseAmount: 0.08,
    hudDormantPulseHz: 0.8,
    hudDormantPulseScale: 0.25,
    hudListeningBasePulseHz: 1.6,
    hudListeningNoisePulseHz: 1,
    hudListeningPulseScaleBase: 0.35,
    hudListeningPulseScaleNoise: 0.5,
    hudWarningPulseHz: 2.8,
    hudBurrowPulseHz: 4.8,
    hudBurrowPulseScale: 1.25,
    hudRotationWaveScale: 0.34,
    hudRotationRadians: 0.018,
    hudMinimumLabelAlpha: 0.72,
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
    hudDevBadgeOffsetY: 23,
    hudDevBadgeFontSizePx: 12,
    hudDevBadgeColor: "#ffd18a",
    hudDevBadgeStrokeColor: "#120908",
    hudDevBadgeStrokeThickness: 4,
    hudDevReadyTint: 0xd8a55c,
    hudDevReadyAlpha: 0.9,
    hudDevReadyPulseHz: 1.1,
    hudDevHoverScale: 1.08,
    hudDevPressScale: 0.92,
    hudDevPressMs: 180,
  }),
  labels: Object.freeze({
    dormant: "THE DEEP IS QUIET",
    listening: "IT IS LISTENING",
    warningPrefix: "BREACH IN",
    burrowing: "DODGE NOW • FLY CLEAR OF THE LINE",
    passPrefix: "PASS",
    circling: "THE GRAVEBORER IS CIRCLING",
    hitPrefix: "WURM HIT",
    criticalHitPrefix: "MAULED • CRITICAL GP",
    fatalHitPrefix: "FATAL WURM STRIKE",
    missed: "THE GRAVEBORER PASSED",
    devReady: "DEV • CLICK TO SUMMON",
    devDisabled: "DEV • WURM DISABLED",
    devBadge: "DEV SUMMON",
    devBadge10x: "DEV SUMMON • 10×",
    devBadgeDisabled: "DEV OFF",
    devSummoned: "DEV WURM HUNT SUMMONED",
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
  devControls: Object.freeze({
    summonNoticeKey: "graveborer-wurm-dev-summon",
    disabledNoticeKey: "graveborer-wurm-dev-disabled",
    noticeDurationMs: 2600,
    summonShakeIntensity: 0.45,
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
  const encounterActive = phase === GRAVEBORER_WURM_PHASES.warning
    || phase === GRAVEBORER_WURM_PHASES.burrowing;
  const rawPassCount = Math.floor(finiteOr(data?.passCount, 0));
  const passCount = encounterActive
    ? clamp(
      Math.max(GRAVEBORER_WURM_CONFIG.difficulty.passCountAtStart, rawPassCount),
      GRAVEBORER_WURM_CONFIG.difficulty.passCountAtStart,
      GRAVEBORER_WURM_CONFIG.difficulty.maximumPassCount,
    )
    : clamp(rawPassCount, 0, GRAVEBORER_WURM_CONFIG.difficulty.maximumPassCount);
  const passIndex = encounterActive
    ? clamp(
      Math.max(1, Math.floor(finiteOr(data?.passIndex, 1))),
      1,
      passCount,
    )
    : 0;
  const legacyHitCount = data?.hitConsumed === true ? 1 : 0;
  const hitCount = clamp(
    Math.floor(finiteOr(data?.hitCount, legacyHitCount)),
    0,
    GRAVEBORER_WURM_CONFIG.combat.maxHitsPerPass,
  );
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
    encounterDepthTiles: encounterActive
      ? Math.max(
        GRAVEBORER_WURM_CONFIG.activation.minDepthTiles,
        finiteOr(
          data?.encounterDepthTiles,
          GRAVEBORER_WURM_CONFIG.activation.minDepthTiles,
        ),
      )
      : 0,
    passIndex,
    passCount,
    huntHitCount: clamp(
      Math.floor(finiteOr(data?.huntHitCount, legacyHitCount)),
      0,
      GRAVEBORER_WURM_CONFIG.difficulty.maximumPassCount,
    ),
    targetTile: sanitizeTile(data?.targetTile),
    lastNoiseTile: sanitizeTile(data?.lastNoiseTile),
    direction: data?.direction === -1 ? -1 : 1,
    hitCount,
    hitConsumed: hitCount >= GRAVEBORER_WURM_CONFIG.combat.maxHitsPerPass,
  };
}
