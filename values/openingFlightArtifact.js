// ==================== OPENING FLIGHT ARTIFACT ====================
// Pure onboarding configuration. Runtime state and Phaser objects live in
// systems/onboarding/.

export const OPENING_FLIGHT_STAGES = Object.freeze({
  ARRIVAL: "arrival",
  DIGGING: "digging",
  REVEAL: "reveal",
  ESCAPE: "escape",
  FREE_FLIGHT: "free-flight",
  COMPLETE: "complete",
});

const COPY = Object.freeze({
  objectiveTitle: "FIND THE FLIGHT GEM",
  objectiveSurface: "Follow the huge arrows to the marked starter shaft",
  objectiveMine: "Aim DOWN and mine through the glowing seam",
  artifactLabel: "GEM OF FLIGHT",
  artifactSubLabel: "BREAK THE GLOWING BLOCK",
  approachHint: "The Flight Gem is below you — aim DOWN and mine!",
  starterLevelUp: "LEVEL {level} — mining power increased!",
  starterChoiceLevelUp: "LEVEL {level} — MINING POWER starter boost auto-claimed!",
  pickupToast: "GEM OF FLIGHT FOUND — permanent flight unlocked!",
  trialReady: "Hold {flyKey} to fly out — 30 seconds of flight are free",
  trialStarted: "FREE FLIGHT ACTIVE — GP will not drain",
  trialTitle: "FREE FLIGHT",
  trialReadyLine: "HOLD {flyKey} TO LAUNCH  •  {seconds}s FREE",
  trialActiveLine: "HOLD {flyKey}  •  {seconds}s FREE",
  returnSuccess: "Perfect! Dig → collect → fly home. That is the core loop.",
  trialComplete: "Free flight complete — future flight uses GP",
  gpExplainer: "GP powers flight and refills while you are not flying.",
  merchantHint: "The Gem of Great Power is buried beneath the huge arrows at the starter shaft.",
});

const COLORS = Object.freeze({
  cyan: 0x59f4ff,
  cyanText: "#59f4ff",
  cyanBright: 0xc8fbff,
  blue: 0x277dff,
  violet: 0x9d66ff,
  gold: 0xffd45a,
  white: 0xffffff,
  ink: 0x07101f,
  panel: 0x091426,
  panelStroke: 0x6fefff,
  objectiveTitle: "#fff2a8",
  objectiveBody: "#d7f9ff",
  artifactTitle: "#fff2a8",
  artifactBody: "#bff8ff",
  trialTitle: "#fff2a8",
  trialBody: "#d7f9ff",
  textStroke: "#08111f",
});

export const OPENING_FLIGHT_ARTIFACT_CONFIG = Object.freeze({
  enabled: false,
  saveVersion: 2,
  upgradeId: "gemPowerUnlock",
  flyActionId: "fly",
  trialDurationMs: 30000,
  pickupStatusDurationMs: 3600,
  starterLevelUpToastDurationMs: 2200,
  starterChoiceToastExtraDurationMs: 900,
  gpExplainerDelayMs: 900,
  pickupRadiusTiles: 0.9,
  approachRadiusTiles: 4,
  starterSeam: Object.freeze({
    tileXOffsetFromLegacySpawn: 0,
    surfaceRowOffset: 0,
    artifactDepthTiles: 5,
    bottomDepthTiles: 6,
    tileHp: 1,
    tileTypeNames: Object.freeze([
      "DIRT",
      "DIRT",
      "STONE",
      "DIRT",
      "DIRT",
    ]),
    bottomTileTypeName: "BEDROCK",
  }),
  worldView: Object.freeze({
    depth: 46,
    artifactRadiusPx: 38,
    artifactGlowAlpha: 0.24,
    artifactRingRadiusPx: 50,
    artifactRingWidthPx: 4,
    artifactRingAlpha: 0.88,
    gemWidthPx: 46,
    gemHeightPx: 62,
    gemHighlight: Object.freeze({
      leftXRatio: -0.2,
      topYRatio: -0.22,
      rightXRatio: 0.08,
      rightYRatio: -0.34,
      bottomXRatio: -0.02,
      bottomYRatio: 0,
      alpha: 0.72,
    }),
    artifactLabelOffsetYPx: 74,
    artifactSubLabelOffsetYPx: 98,
    artifactTitleFontSize: "18px",
    artifactBodyFontSize: "13px",
    arrowCount: 3,
    arrowWidthPx: 78,
    arrowHeightPx: 48,
    arrowGapPx: 44,
    arrowTopOffsetTiles: 2.25,
    arrowLabelOffsetYPx: -44,
    arrowLabelFontSize: "22px",
    pulseDurationMs: 720,
    pulseEase: "Sine.inOut",
    pulseAlphaFrom: 0.35,
    pulseAlphaTo: 1,
    pulseScaleFrom: 0.88,
    pulseScaleTo: 1.14,
    bobDistancePx: 12,
    bobDurationMs: 560,
    bobEase: "Sine.inOut",
  }),
  screenView: Object.freeze({
    depth: 3650,
    objectiveNotificationKey: "opening-flight-objective",
    pointerRadiusPx: 42,
    pointerArrowLengthPx: 70,
    pointerArrowWidthPx: 44,
    pointerEdgeMarginPx: 76,
    pointerPlayerClearancePx: 112,
    pointerMaxTravelViewportRatio: 0.36,
    trialYFromBottomPx: 82,
    trialWidthPx: 440,
    trialHeightPx: 72,
    trialTitleOffsetYPx: -15,
    trialBodyOffsetYPx: 10,
    trialBarOffsetYPx: 29,
    trialBarWidthPx: 368,
    trialBarHeightPx: 7,
    trialTitleFontSize: "18px",
    trialBodyFontSize: "15px",
    panelAlpha: 0.9,
    panelStrokeWidthPx: 2,
    panelStrokeAlpha: 0.95,
    trialBarBgAlpha: 0.9,
    trialBarFillAlpha: 1,
  }),
  typography: Object.freeze({
    titleFontFamily: "Trebuchet MS, Segoe UI, sans-serif",
    bodyFontFamily: "Consolas, monospace",
    titleFontStyle: "bold",
  }),
  collectionFx: Object.freeze({
    sparkCount: 18,
    sparkRadiusPx: 4,
    travelMinPx: 72,
    travelMaxPx: 150,
    distanceSteps: 5,
    durationMs: 620,
    ease: "Cubic.out",
    startAlpha: 1,
    endScale: 0.1,
  }),
  colors: COLORS,
  copy: COPY,
});

const goldenPathTile = (depth, typeName, hp, beat = "") => Object.freeze({
  depth,
  typeName,
  hp,
  beat,
});

export const OPENING_FLIGHT_GOLDEN_FIVE_CONFIG = Object.freeze({
  enabled: true,
  queryParam: "openingFlightV2",
  queryDisableValues: Object.freeze(["0", "off", "false", "legacy"]),
  freeFlightBankMs: 30000,
  revealControlLockMs: 650,
  saveVersion: 2,
  openingWeather: Object.freeze({
    kind: "clear",
    intensity: 0.08,
    durationMs: 300000,
  }),
  layout: Object.freeze({
    tileXOffsetFromTownAnchor: 0,
    surfaceRowOffset: 0,
    sideHalfWidthTiles: 1,
    sideWallHp: 45,
    artifactDepthTiles: 13,
    bottomDepthTiles: 14,
    sideWallTypeName: "DIRT",
    bottomTypeName: "BEDROCK",
    path: Object.freeze([
      goldenPathTile(0, "DIRT", 1, "cap"),
      goldenPathTile(1, "DIRT", 1),
      goldenPathTile(2, "COPPER", 12, "ore"),
      goldenPathTile(3, "DIRT", 22),
      goldenPathTile(4, "STONE", 16),
      goldenPathTile(5, "XP_BLOCK", 1, "level"),
      goldenPathTile(6, "DIRT", 18),
      goldenPathTile(7, "STONE", 16),
      goldenPathTile(8, "DIRT", 22),
      goldenPathTile(9, "GEM_POWER_BLOCK", 16, "gp"),
      goldenPathTile(10, "DIRT", 20),
      goldenPathTile(11, "COPPER", 16),
      goldenPathTile(12, "DIRT", 22),
      goldenPathTile(13, "GEM_POWER_BLOCK", 24, "artifact-shell"),
    ]),
  }),
  escape: Object.freeze({
    ringRadiusTiles: 1.35,
    rings: Object.freeze([
      Object.freeze({ tileXOffset: 0, depthTiles: 10 }),
      Object.freeze({ tileXOffset: 1, depthTiles: 6 }),
      Object.freeze({ tileXOffset: 0, depthTiles: 2 }),
    ]),
  }),
  cache: Object.freeze({
    tileXOffset: 5,
    platformRowOffset: -3,
    platformHalfWidthTiles: 1,
    pickupRadiusTiles: 1.55,
    pickupCenterOffsetRatio: 0.34,
    money: 125,
    gpCapacityAmount: 40,
    tankUpgradeId: "gemPowerTank",
    tankUpgradeLevel: 1,
    minimumPlayerLevel: 2,
    resources: Object.freeze({
      dirt: 40,
      stone: 25,
      copper: 12,
    }),
  }),
  guidance: Object.freeze({
    firstAssistDelayMs: 4000,
    secondAssistDelayMs: 8000,
    finalAssistDelayMs: 12000,
  }),
  presentation: Object.freeze({
    worldDepth: 15,
    hudDepth: 3660,
    markerHeightPx: 190,
    markerLiftTiles: 0.72,
    markerMinLiftPx: 62,
    markerPulseScale: 1.035,
    markerPulseDurationRatio: 0.78,
    haloPulseDurationRatio: 0.7,
    markerExitDistancePx: 45,
    markerExitDurationMs: 280,
    entranceBottomOffsetYPx: -4,
    entranceHaloWidthTiles: 1.08,
    entranceHaloHeightPx: 18,
    entranceHaloOffsetYPx: 4,
    entranceHaloAlphaFrom: 0.16,
    entranceHaloAlphaTo: 0.46,
    entranceHaloScaleFrom: 0.84,
    entranceHaloScaleTo: 1.1,
    artifactHeightPx: 470,
    artifactBuriedAlpha: 0.18,
    artifactNearAlpha: 0.54,
    artifactRevealDistanceTiles: 5,
    artifactGlowWidthRatio: 0.72,
    artifactGlowHeightRatio: 0.84,
    artifactGlowOffsetRatio: 0.42,
    artifactGlowBuriedAlpha: 0.12,
    artifactGlowNearAlphaBase: 0.1,
    artifactGlowNearAlphaGain: 0.22,
    artifactPulseAlphaRatio: 0.72,
    artifactRestoreAlpha: 0.82,
    artifactRestoreGlowAlpha: 0.3,
    artifactRevealStartScale: 0.72,
    artifactRevealGlowStartScale: 0.6,
    artifactRevealGlowEndScale: 1.25,
    artifactRevealGlowAlpha: 0.18,
    artifactRevealDurationMs: 620,
    artifactGlowRevealDurationMs: 760,
    artifactEscapeScale: 0.62,
    artifactEscapeAlpha: 0.44,
    artifactEscapeGlowAlpha: 0.12,
    artifactEscapeSettleDurationMs: 360,
    cameraFlashDurationMs: 180,
    cameraFlashRgb: Object.freeze([180, 245, 255]),
    ringDiameterPx: 188,
    ringAlphaFrom: 0.62,
    ringAlphaTo: 0.88,
    ringPulseScale: 1.08,
    ringExitScale: 1.65,
    ringExitDurationMs: 260,
    cacheWidthPx: 132,
    cacheGroundInsetPx: 4,
    cacheShadowWidthRatio: 0.82,
    cacheShadowHeightPx: 10,
    cacheShadowOffsetYPx: -2,
    cacheShadowAlpha: 0.32,
    cacheGlowWidthRatio: 1.46,
    cacheGlowHeightRatio: 0.92,
    cacheGlowOffsetRatio: 0.34,
    cacheGlowAlphaFrom: 0.12,
    cacheGlowAlphaTo: 0.36,
    cacheGlowScaleFrom: 0.86,
    cacheGlowScaleTo: 1.08,
    cacheGlowPulseDurationRatio: 0.72,
    cacheLabelOffsetYPx: -101,
    cacheSpawnLiftPx: 14,
    cacheSettleDurationMs: 420,
    cacheExitScale: 1.2,
    cacheExitDurationMs: 520,
    pulseDurationMs: 880,
    hudWidthPx: 620,
    hudHeightPx: 126,
    hudYFromBottomPx: 132,
    hudTextLeftPx: 86,
    hudTextRightPx: 30,
    hudPhaseYPx: -38,
    hudTitleYPx: -20,
    hudBodyYPx: 8,
    hudProgressYPx: 42,
    hudProgressHeightPx: 5,
    hudProgressGlowHeightPx: 11,
    hudProgressGlowAlpha: 0.28,
    rewardReveal: Object.freeze({
      depth: 3830,
      widthPx: 860,
      heightPx: 174,
      viewportYRatio: 0.46,
      textLeftPx: 150,
      titleYPx: -42,
      primaryYPx: -9,
      resourcesYPx: 12,
      footerYPx: 28,
      enterScale: 0.84,
      enterDurationMs: 420,
      holdDurationMs: 5200,
      exitScale: 0.96,
      exitLiftPx: 18,
      exitDurationMs: 320,
    }),
    artifactGlowDepthOffset: -1,
    markerDepthOffset: 2,
    ringDepthOffset: 3,
    cacheDepthOffset: 4,
    fxDepthOffset: 8,
    pulseEase: "Sine.inOut",
    revealEase: "Back.out",
    settleEase: "Sine.out",
    exitEase: "Cubic.out",
    cacheExitEase: "Back.in",
  }),
  fx: Object.freeze({
    sparkRadiusBasePx: 3,
    sparkRadiusVariants: 3,
    travelBaseRatio: 0.45,
    travelVariantCount: 7,
    travelVariantDivisor: 11,
    durationBaseMs: 420,
    durationStepMs: 46,
    durationVariants: 5,
    endScale: 0.12,
    artifactSparkCount: 26,
    artifactTravelPx: 190,
    ringSparkCount: 12,
    ringTravelPx: 92,
    cacheSparkCount: 30,
    cacheTravelPx: 220,
  }),
  feedback: Object.freeze({
    cyan: "#71f5ff",
    gold: "#ffe177",
    violet: "#bd8aff",
    firstDigDurationMs: 1100,
    firstDigFontSize: "20px",
    ringDurationMs: 760,
    ringFontSize: "18px",
    cacheDurationMs: 1900,
    cacheFontSize: "22px",
    assistOneDurationMs: 2200,
    assistTwoDurationMs: 2600,
    unlockToastDurationMs: 3800,
    unlockStatusDurationMs: 4200,
    surfaceToastDurationMs: 3600,
    cacheToastDurationMs: 5200,
    cacheNotificationKey: "opening-flight-first-ascent-reward",
    completeStatusDurationMs: 4400,
  }),
  palette: Object.freeze({
    cyan: 0x65f4ff,
    cyanText: "#9af8ff",
    gold: 0xffd76a,
    goldText: "#ffe69a",
    violet: 0xa96cff,
    groundShadow: 0x02040a,
    whiteText: "#f4fbff",
    bodyText: "#cce9f4",
  }),
  typography: Object.freeze({
    titleFamily: "Trebuchet MS, Segoe UI, sans-serif",
    bodyFamily: "Consolas, monospace",
    phaseSize: "12px",
    titleSize: "20px",
    bodySize: "12px",
    cacheLabelSize: "18px",
    cacheLabelStroke: "#07101f",
    cacheLabelStrokeThickness: 5,
    rewardTitleSize: "23px",
    rewardPrimarySize: "18px",
    rewardResourcesSize: "14px",
    rewardFooterSize: "12px",
    rewardTextStrokeThickness: 3,
    rewardSmallTextStrokeThickness: 2,
  }),
  copy: Object.freeze({
    phaseDig: "STEP 1 OF 3  •  DIG",
    phaseEscape: "STEP 2 OF 3  •  ESCAPE",
    phaseFlight: "STEP 3 OF 3  •  FLY & CLAIM",
    phaseArtifact: "FLIGHT ARTIFACT CLAIMED",
    phaseComplete: "GOLDEN FIVE COMPLETE",
    arrivalTitle: "DIG FOR FLIGHT",
    arrivalBody: "Hold {downKey} to aim at the marked ground",
    aimedBody: "Hold {digKey} to break the flight seam",
    diggingBody: "Follow the violet light  •  {downKey} + {digKey}",
    nearArtifactBody: "The Gem of Great Power is close",
    firstDig: "GREAT START!",
    assistAim: "Hold {downKey} to aim at the huge arrows",
    assistDig: "Keep {downKey} held, then hold {digKey} to dig",
    assistFinal: "You are standing on the flight seam — {downKey} + {digKey}",
    unlockTitle: "FLIGHT UNLOCKED — PERMANENT",
    unlockBody: "Hold {flyKey} to power Flight  •  {leftKey}/{rightKey} steer  •  {upKey}/{downKey} climb or dive",
    unlockToast: "GEM OF GREAT POWER — permanent flight unlocked!",
    escapeTitle: "FIRST ASCENT",
    escapeBody: "Escape flight is protected  •  pass through the luminous rings",
    freeTitle: "30 SECONDS FREE FLIGHT BANKED",
    freeReadyBody: "Hold {flyKey} to launch  •  the timer pauses when you stop flying",
    freeActiveBody: "{seconds}s FREE  •  {leftKey}/{rightKey} steer  •  {upKey}/{downKey} climb or dive",
    freeStarted: "FREE FLIGHT ACTIVE — the timer pauses whenever you land.",
    freeComplete: "Free bank complete — flight now uses GP and GP refills while grounded.",
    surfaceSuccess: "Perfect ascent! Your 30-second flight bank starts only while flying.",
    cacheTitle: "FIRST ASCENT CACHE",
    cacheBody: "Fly to the glowing cache for your permanent starter reward",
    cacheDirectionSuffix: "CACHE →",
    freeEndedBody: "{flyKey} uses GP now  •  {cacheDirectionSuffix}",
    cacheReward: "FIRST ASCENT CACHE — +{gpCapacity} GP capacity, {money} M, and starter resources!",
    cacheFloatingReward: "+{gpCapacity} GP  •  +{money} M",
    rewardRevealTitle: "FIRST ASCENT CACHE — REWARD SECURED",
    rewardRevealPrimary: "+{gpCapacity} GP CAPACITY  •  +{money} M",
    rewardRevealResources: "+{dirt} DIRT  •  +{stone} STONE  •  +{copper} COPPER",
    rewardRevealFooter: "LEVEL {minimumLevel} GUARANTEED  •  FLIGHT USES GP  •  GP REFILLS WHILE GROUNDED",
    completeTitle: "THE CORE LOOP",
    completeBody: "DIG DEEPER  •  COLLECT POWER  •  FLY HOME",
    levelGuarantee: "LEVEL 2 — mining power increased!",
  }),
});

export function resolveOpeningFlightGoldenFiveEnabled(
  config = OPENING_FLIGHT_GOLDEN_FIVE_CONFIG,
  search = globalThis.location?.search || "",
) {
  if (config.enabled !== true) return false;
  const value = new URLSearchParams(search).get(config.queryParam)?.toLowerCase();
  return !value || !config.queryDisableValues.includes(value);
}

export function shouldUseOpeningFlightGoldenSpawn(
  saveData,
  config = OPENING_FLIGHT_GOLDEN_FIVE_CONFIG,
  search = globalThis.location?.search || "",
) {
  if (!resolveOpeningFlightGoldenFiveEnabled(config, search)) return false;
  if (!saveData) return true;

  const opening = saveData.openingFlightArtifactData;
  if (opening && typeof opening === "object") {
    return opening.onboardingComplete !== true && opening.cacheCollected !== true;
  }

  const levels = saveData.upgrades?.upgradeLevels;
  if (levels && typeof levels === "object") {
    if (Object.hasOwn(levels, "gemPowerUnlock")) {
      return Math.max(0, Number(levels.gemPowerUnlock) || 0) <= 0;
    }
    return false;
  }

  const hasDugProgress = Array.isArray(saveData.dugTiles) && saveData.dugTiles.length > 0;
  const hasResources = Object.values(saveData.resources || {})
    .some(value => Math.max(0, Number(value) || 0) > 0);
  return !hasDugProgress && !hasResources;
}

export function sanitizeOpeningFlightArtifactData(data) {
  const config = OPENING_FLIGHT_ARTIFACT_CONFIG;
  const artifactCollected = data?.artifactCollected === true;
  const surfaceReturnCelebrated = artifactCollected
    && data?.surfaceReturnCelebrated === true;
  const cacheCollected = surfaceReturnCelebrated && data?.cacheCollected === true;
  const rawRemainingMs = Number.isFinite(data?.trialRemainingMs)
    ? data.trialRemainingMs
    : 0;
  const trialWasCompleted = data?.trialComplete === true
    || cacheCollected
    || data?.onboardingComplete === true;
  const trialRemainingMs = artifactCollected && !trialWasCompleted
    ? Math.max(0, Math.min(config.trialDurationMs, rawRemainingMs))
    : 0;
  const validStages = new Set(Object.values(OPENING_FLIGHT_STAGES));
  const inferredStage = !artifactCollected
    ? (data?.firstDigCelebrated === true
      ? OPENING_FLIGHT_STAGES.DIGGING
      : OPENING_FLIGHT_STAGES.ARRIVAL)
    : !surfaceReturnCelebrated
      ? OPENING_FLIGHT_STAGES.ESCAPE
      : cacheCollected
        ? OPENING_FLIGHT_STAGES.COMPLETE
        : OPENING_FLIGHT_STAGES.FREE_FLIGHT;
  return {
    version: Number.isInteger(data?.version) ? data.version : config.saveVersion,
    stage: validStages.has(data?.stage) ? data.stage : inferredStage,
    artifactCollected,
    firstDigCelebrated: data?.firstDigCelebrated === true,
    ringsPassed: artifactCollected
      ? Math.max(0, Math.min(3, Math.floor(Number(data?.ringsPassed) || 0)))
      : 0,
    trialStarted: artifactCollected && data?.trialStarted === true,
    trialRemainingMs,
    trialComplete: artifactCollected
      && (trialWasCompleted || trialRemainingMs <= 0),
    surfaceReturnCelebrated,
    cacheCollected,
    rewardGranted: cacheCollected && data?.rewardGranted !== false,
    onboardingComplete: cacheCollected || data?.onboardingComplete === true,
  };
}
