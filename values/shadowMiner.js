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
    approachPlaybackRate: 1.65,
    maximumEncounterMs: 7_000,
    observeMs: 700,
    visualIntensity: 0.82,
  }),
  [SHADOW_MINER_ENCOUNTER_BANDS.WARNING]: Object.freeze({
    spawnChanceMultiplier: 2.25,
    replayDelayMs: 4_200,
    approachPlaybackRate: 1.9,
    maximumEncounterMs: 7_500,
    observeMs: 900,
    visualIntensity: 1,
  }),
  [SHADOW_MINER_ENCOUNTER_BANDS.CRITICAL]: Object.freeze({
    spawnChanceMultiplier: 4,
    replayDelayMs: 3_000,
    approachPlaybackRate: 2.3,
    maximumEncounterMs: 8_000,
    observeMs: 1_150,
    visualIntensity: 1.16,
  }),
});

export const SHADOW_MINER_CONFIG = Object.freeze({
  id: "shadow-miner-stress-echo-v2",
  enabled: true,
  query: Object.freeze({
    key: "shadowMiner",
    disabledValue: "0",
    reviewValue: "review",
    devRateKey: "shadowMiner10x",
    enabledValue: "1",
    localHosts: Object.freeze(["localhost", "127.0.0.1", "::1", ""]),
  }),
  production: PRODUCTION_PROFILE,
  review: REVIEW_PROFILE,
  dev: Object.freeze({
    rateMultiplier: 10,
  }),
  panic: Object.freeze({
    warningBandKey: "warning",
    criticalBandKey: "critical",
    profiles: PANIC_PROFILES,
  }),
  history: Object.freeze({
    sampleIntervalMs: 45,
    retentionMs: 9_000,
    maximumSampleGapMs: 700,
    maximumSampleJumpTiles: 4,
    minimumReplaySamples: 16,
    minimumTravelTiles: 0.6,
    actionAnimationTokens: Object.freeze([
      "dig",
      "mine",
      "quickslash",
      "thunder",
    ]),
  }),
  interaction: Object.freeze({
    minimumTrailingDelayMs: 260,
    nearPlayerDistanceTiles: 1.15,
    torchFleeMinimumIntensity: 0.01,
    fleePlaybackRate: 2.4,
    fleeDurationMs: 1_000,
    fleeOnTorch: true,
    fleeOnIntactStar: true,
  }),
  timing: Object.freeze({
    spawnMs: 360,
    vanishMs: 420,
  }),
  audio: Object.freeze({
    spawnFamily: "dig",
    spawnVolume: 0.3,
    spawnRate: 0.68,
  }),
  preview: Object.freeze({
    anchorTileX: 24,
    depthOffsetTiles: 120,
    chamberPaddingTiles: 2,
    chamberAirRows: 5,
    trailDurationMs: 5_400,
    trailDistanceTiles: 4,
    digHoldMs: 620,
    digStartRatio: 0.45,
    torchIntensityPercent: 100,
    restoreGpSource: "shadow-miner-preview-restore",
    lightOnDelayMs: 1_650,
    evidenceDigDelayMs: 600,
    evidenceApproachDelayMs: 900,
    evidenceFleeDelayMs: 1_900,
    evidenceCompleteDelayMs: 3_100,
  }),
  visual: Object.freeze({
    renderMode: "solid-purple-silhouette",
    tint: 0x8b3fe0,
    echoTint: 0xd6a2ff,
    alpha: 0.88,
    echoAlpha: 0.36,
    echoPulseAlpha: 0.06,
    echoScale: 1.08,
    echoOffsetXPx: 0,
    echoOffsetYPx: 0,
    hoverAmplitudePx: 2,
    hoverCycleMs: 1_600,
    scaleMultiplier: 1,
    spawnScaleMultiplier: 0.92,
    vanishScaleMultiplier: 0.82,
    depth: 19.85,
    echoDepth: 19.75,
    reducedMotionMediaQuery: "(prefers-reduced-motion: reduce)",
  }),
});

export function resolveShadowMinerMode(
  search = globalThis.location?.search || "",
  hostname = globalThis.location?.hostname || "",
) {
  const params = new URLSearchParams(search);
  const value = params.get(SHADOW_MINER_CONFIG.query.key);
  const localAllowed = SHADOW_MINER_CONFIG.query.localHosts.includes(hostname);
  const enabled = SHADOW_MINER_CONFIG.enabled
    && value !== SHADOW_MINER_CONFIG.query.disabledValue;
  return Object.freeze({
    enabled,
    review: enabled && localAllowed
      && value === SHADOW_MINER_CONFIG.query.reviewValue,
    dev10x: enabled && localAllowed
      && params.get(SHADOW_MINER_CONFIG.query.devRateKey)
        === SHADOW_MINER_CONFIG.query.enabledValue,
  });
}
