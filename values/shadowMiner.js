import { SHADOW_MINER_VISUAL_CONFIG } from "./shadowMinerPresentation.js";

export const SHADOW_MINER_STATES = Object.freeze({
  DORMANT: "dormant",
  SPAWNING: "spawning",
  APPROACHING: "approaching",
  OBSERVING: "observing",
  FLEEING: "fleeing",
  VANISHING: "vanishing",
});

export const SHADOW_MINER_ENCOUNTER_BANDS = Object.freeze({
  AMBIENT: "ambient",
  WARNING: "warning",
  CRITICAL: "critical",
});

export const SHADOW_MINER_BEHAVIORS = Object.freeze({
  LURKER: "lurker",
  MIMIC: "mimic",
  STALKER: "stalker",
});

export const SHADOW_MINER_REPELLENTS = Object.freeze({
  TORCH: "torch",
  STAR: "star",
});

const PRODUCTION_PROFILE = Object.freeze({
  minimumDepthTiles: 50,
  firstCheckDelayMs: 8_000,
  checkIntervalMs: 45_000,
  placementRetryMs: 6_000,
  spawnChance: 0.18,
});

const REVIEW_PROFILE = Object.freeze({
  minimumDepthTiles: 0,
  firstCheckDelayMs: 250,
  checkIntervalMs: 3_500,
  placementRetryMs: 800,
  spawnChance: 1,
});

const PANIC_PROFILES = Object.freeze({
  [SHADOW_MINER_ENCOUNTER_BANDS.AMBIENT]: Object.freeze({
    spawnChanceMultiplier: 1,
    replayDelayMs: 5_200,
    approachPlaybackRate: 0.85,
    maximumEncounterMs: 7_000,
    observeMs: 700,
    visualIntensity: 0.82,
  }),
  [SHADOW_MINER_ENCOUNTER_BANDS.WARNING]: Object.freeze({
    spawnChanceMultiplier: 2.25,
    replayDelayMs: 4_200,
    approachPlaybackRate: 0.95,
    maximumEncounterMs: 7_500,
    observeMs: 900,
    visualIntensity: 1,
  }),
  [SHADOW_MINER_ENCOUNTER_BANDS.CRITICAL]: Object.freeze({
    spawnChanceMultiplier: 4,
    replayDelayMs: 3_000,
    approachPlaybackRate: 1.05,
    maximumEncounterMs: 8_000,
    observeMs: 1_150,
    visualIntensity: 1.16,
  }),
});

const BEHAVIOR_PERSONALITIES = Object.freeze([
  Object.freeze({
    id: SHADOW_MINER_BEHAVIORS.LURKER,
    weights: Object.freeze({
      [SHADOW_MINER_ENCOUNTER_BANDS.AMBIENT]: 5,
      [SHADOW_MINER_ENCOUNTER_BANDS.WARNING]: 3,
      [SHADOW_MINER_ENCOUNTER_BANDS.CRITICAL]: 1,
    }),
    targetDistanceTiles: Object.freeze([5.75, 6.25]),
    replayDelayMultiplier: Object.freeze([1.3, 1.55]),
    approachPlaybackRateMultiplier: Object.freeze([0.72, 0.9]),
    approachHoldMs: Object.freeze([0, 420]),
    nearPlayerDistanceTiles: Object.freeze([3, 3.6]),
    observeDurationMultiplier: Object.freeze([1.2, 1.55]),
    maximumEncounterMultiplier: Object.freeze([1.05, 1.2]),
    fleePlaybackRateMultiplier: Object.freeze([0.85, 1]),
    fleeDurationMultiplier: Object.freeze([1, 1.15]),
    visualIntensityMultiplier: Object.freeze([1, 1.08]),
    audioRateMultiplier: Object.freeze([1, 1.04]),
    actionPoseChance: 0.2,
    observeDigChance: 0.35,
  }),
  Object.freeze({
    id: SHADOW_MINER_BEHAVIORS.MIMIC,
    weights: Object.freeze({
      [SHADOW_MINER_ENCOUNTER_BANDS.AMBIENT]: 4,
      [SHADOW_MINER_ENCOUNTER_BANDS.WARNING]: 4,
      [SHADOW_MINER_ENCOUNTER_BANDS.CRITICAL]: 3,
    }),
    targetDistanceTiles: Object.freeze([5.5, 6]),
    replayDelayMultiplier: Object.freeze([1.15, 1.4]),
    approachPlaybackRateMultiplier: Object.freeze([0.9, 1.05]),
    approachHoldMs: Object.freeze([80, 240]),
    nearPlayerDistanceTiles: Object.freeze([2.75, 3.25]),
    observeDurationMultiplier: Object.freeze([1.1, 1.4]),
    maximumEncounterMultiplier: Object.freeze([1, 1.12]),
    fleePlaybackRateMultiplier: Object.freeze([0.95, 1.12]),
    fleeDurationMultiplier: Object.freeze([0.95, 1.15]),
    visualIntensityMultiplier: Object.freeze([0.9, 1.04]),
    audioRateMultiplier: Object.freeze([0.97, 1.04]),
    actionPoseChance: 0.9,
    observeDigChance: 1,
  }),
  Object.freeze({
    id: SHADOW_MINER_BEHAVIORS.STALKER,
    weights: Object.freeze({
      [SHADOW_MINER_ENCOUNTER_BANDS.AMBIENT]: 1,
      [SHADOW_MINER_ENCOUNTER_BANDS.WARNING]: 3,
      [SHADOW_MINER_ENCOUNTER_BANDS.CRITICAL]: 6,
    }),
    targetDistanceTiles: Object.freeze([5.25, 5.75]),
    replayDelayMultiplier: Object.freeze([0.95, 1.2]),
    approachPlaybackRateMultiplier: Object.freeze([1.15, 1.38]),
    approachHoldMs: Object.freeze([0, 90]),
    nearPlayerDistanceTiles: Object.freeze([2.5, 2.85]),
    observeDurationMultiplier: Object.freeze([0.65, 0.9]),
    maximumEncounterMultiplier: Object.freeze([0.85, 1]),
    fleePlaybackRateMultiplier: Object.freeze([1.18, 1.45]),
    fleeDurationMultiplier: Object.freeze([1.05, 1.3]),
    visualIntensityMultiplier: Object.freeze([1.02, 1.18]),
    audioRateMultiplier: Object.freeze([1.05, 1.16]),
    actionPoseChance: 0.35,
    observeDigChance: 0.55,
  }),
]);

export const SHADOW_MINER_CONFIG = Object.freeze({
  id: "shadow-miner-dynamic-echo-v5",
  enabled: true,
  query: Object.freeze({
    key: "shadowMiner",
    disabledValue: "0",
    reviewValue: "review",
    devRateKey: "shadowMiner10x",
    behaviorKey: "shadowMinerBehavior",
    depthReviewKey: "shadowMinerDepth",
    enabledValue: "1",
    localHosts: Object.freeze(["localhost", "127.0.0.1", "::1", ""]),
  }),
  production: PRODUCTION_PROFILE,
  review: REVIEW_PROFILE,
  dev: Object.freeze({
    rateMultiplier: 10,
  }),
  admission: Object.freeze({
    minimumDistanceTiles: 4,
    maximumDistanceTiles: 6.5,
    cameraMarginTiles: 0.25,
    enforceOnForcedSpawn: true,
    grounding: Object.freeze({
      supportProbePx: 1,
      maximumDropTiles: 2,
      clearanceTiles: 1,
      baselineOffsetPx: 0,
    }),
  }),
  panic: Object.freeze({
    warningBandKey: "warning",
    criticalBandKey: "critical",
    profiles: PANIC_PROFILES,
  }),
  behavior: Object.freeze({
    admissionTargetToleranceTiles: 0.65,
    minimumPersonalSpaceTiles: 4,
    observeDigPlaybackRate: 1.05,
    personalities: BEHAVIOR_PERSONALITIES,
  }),
  depthIntensity: Object.freeze({
    bands: Object.freeze([
      Object.freeze({
        id: "shallow",
        minimumDepthMeters: 0,
        visualIntensityMultiplier: 0.92,
        approachRateMultiplier: 0.9,
        observeDurationMultiplier: 1.08,
        fleeRateMultiplier: 0.92,
        audioRateMultiplier: 1.04,
        lightResistanceMultiplier: 0.8,
      }),
      Object.freeze({
        id: "lower",
        minimumDepthMeters: 300,
        visualIntensityMultiplier: 1,
        approachRateMultiplier: 1,
        observeDurationMultiplier: 1,
        fleeRateMultiplier: 1,
        audioRateMultiplier: 1,
        lightResistanceMultiplier: 1,
      }),
      Object.freeze({
        id: "deep",
        minimumDepthMeters: 700,
        visualIntensityMultiplier: 1.1,
        approachRateMultiplier: 1.08,
        observeDurationMultiplier: 0.95,
        fleeRateMultiplier: 1.08,
        audioRateMultiplier: 0.96,
        lightResistanceMultiplier: 1.1,
      }),
      Object.freeze({
        id: "abyss",
        minimumDepthMeters: 1_300,
        visualIntensityMultiplier: 1.22,
        approachRateMultiplier: 1.15,
        observeDurationMultiplier: 0.88,
        fleeRateMultiplier: 1.14,
        audioRateMultiplier: 0.92,
        lightResistanceMultiplier: 1.25,
      }),
    ]),
  }),
  history: Object.freeze({
    sampleIntervalMs: 45,
    retentionMs: 9_000,
    maximumSampleGapMs: 700,
    maximumSampleJumpTiles: 4,
    minimumReplaySamples: 16,
    minimumTravelTiles: 0.6,
    minimumActionReplaySamples: 3,
    actionAnimationTokens: Object.freeze([
      "dig",
      "mine",
      "quickslash",
      "thunder",
    ]),
  }),
  interaction: Object.freeze({
    minimumTrailingDelayMs: 260,
    nearPlayerDistanceTiles: 2.5,
    torchFleeMinimumIntensity: 0.01,
    fleePlaybackRate: 1.2,
    fleeDurationMs: 1_500,
    fleeOnTorch: true,
    fleeOnIntactStar: true,
    lightResponse: Object.freeze({
      maximumFrameMs: 100,
      exposureDecayMs: 550,
      visualAttackMs: 90,
      visualReleaseMs: 220,
      approachSlowMaximum: 0.78,
      minimumApproachRateMultiplier: 0.22,
      torch: Object.freeze({
        baseRepelDelayMs: 1200,
        minimumRepelDelayMs: 700,
        maximumRepelDelayMs: 2400,
        minimumPressure: 0.18,
        intensityExponent: 0.62,
        overdrivePressurePerUnit: 0.4,
        maximumPressure: 1.4,
        minimumVisualPressure: 0.34,
      }),
      star: Object.freeze({
        baseRepelDelayMs: 75,
        pressure: 1,
      }),
    }),
  }),
  timing: Object.freeze({
    spawnMs: 420,
    arrivalTellLeadMs: 120,
    observeSettleMs: 180,
    lightRecoilMs: 140,
    vanishMs: 850,
  }),
  audio: Object.freeze({
    spawnFamily: "dig",
    spawnVolume: 0.3,
    spawnRate: 0.68,
    repelFamily: "dig",
    torchRepelVolume: 0.24,
    torchRepelRate: 0.52,
    starRepelVolume: 0.32,
    starRepelRate: 0.44,
  }),
  preview: Object.freeze({
    anchorTileX: 24,
    depthOffsetTiles: 120,
    chamberPaddingTiles: 2,
    chamberAirRows: 5,
    trailDurationMs: 5_400,
    trailDistanceTiles: 4,
    digHoldMs: 900,
    digStartRatio: 0.12,
    torchIntensityPercent: 100,
    restoreGpSource: "shadow-miner-preview-restore",
    lightOnDelayMs: 1_050,
    evidenceTellDelayMs: 90,
    evidenceDigDelayMs: 650,
    evidenceApproachDelayMs: 900,
    evidenceObserveDelayMs: 1_000,
    evidenceRecoilDelayMs: 1_120,
    evidenceFleeDelayMs: 1_400,
    evidenceCompleteDelayMs: 2_500,
  }),
  visual: SHADOW_MINER_VISUAL_CONFIG,
});

export function resolveShadowMinerMode(
  search = globalThis.location?.search || "",
  hostname = globalThis.location?.hostname || "",
) {
  const params = new URLSearchParams(search);
  const value = params.get(SHADOW_MINER_CONFIG.query.key);
  const localAllowed = SHADOW_MINER_CONFIG.query.localHosts.includes(hostname);
  const requestedBehavior = params.get(SHADOW_MINER_CONFIG.query.behaviorKey);
  const requestedDepth = Number(
    params.get(SHADOW_MINER_CONFIG.query.depthReviewKey),
  );
  const behaviorId = Object.values(SHADOW_MINER_BEHAVIORS)
    .includes(requestedBehavior)
    ? requestedBehavior
    : null;
  const enabled = SHADOW_MINER_CONFIG.enabled
    && value !== SHADOW_MINER_CONFIG.query.disabledValue;
  const mode = {
    enabled,
    review: enabled && localAllowed
      && value === SHADOW_MINER_CONFIG.query.reviewValue,
    dev10x: enabled && localAllowed
      && params.get(SHADOW_MINER_CONFIG.query.devRateKey)
        === SHADOW_MINER_CONFIG.query.enabledValue,
  };
  if (enabled && localAllowed && behaviorId) mode.behaviorId = behaviorId;
  if (
    enabled
    && localAllowed
    && params.has(SHADOW_MINER_CONFIG.query.depthReviewKey)
    && Number.isFinite(requestedDepth)
    && requestedDepth >= 0
  ) {
    mode.reviewDepthMeters = requestedDepth;
  }
  return Object.freeze(mode);
}
