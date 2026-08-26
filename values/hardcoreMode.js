const MODES = Object.freeze({
  casual: "casual",
  hardcore: "hardcore",
  oneLifeHardcore: "one-life-hardcore",
});

const TELEPORT_KIND_MULTIPLIERS = Object.freeze({
  undergroundToSky: 1,
  groundToSky: 0.8,
  skyToDungeon: 1.15,
  quickResume: 1.45,
});

export const HARDCORE_MODE_CONFIG = Object.freeze({
  version: 4,
  queryParam: "runMode",
  modes: MODES,
  rules: Object.freeze({
    [MODES.casual]: Object.freeze({
      startingLives: null,
      firstReviveFree: false,
    }),
    [MODES.hardcore]: Object.freeze({
      startingLives: 2,
      firstReviveFree: true,
    }),
    [MODES.oneLifeHardcore]: Object.freeze({
      startingLives: 1,
      firstReviveFree: false,
    }),
  }),
  defaultData: Object.freeze({
    version: 4,
    mode: MODES.casual,
    armed: false,
    livesRemaining: null,
    freeReviveAvailable: false,
    deaths: 0,
    exhausted: false,
    stress: 0,
    peakStress: 0,
    selectedAt: 0,
    armedAt: 0,
    lastUnstuckAt: 0,
    activePlayMs: 0,
    unstuckUses: 0,
    paidTeleports: 0,
    teleportMoneySpent: 0,
  }),
  assets: Object.freeze({
    panel: Object.freeze({
      key: "ui-hardcore-oath-panel-v1",
      path: "sprites/UI/hardcore-mode-v1/hardcore-oath-panel-runtime-v1.webp",
    }),
    crest: Object.freeze({
      key: "ui-hardcore-oath-crest-v1",
      path: "sprites/UI/hardcore-mode-v1/hardcore-oath-crest-runtime-v1.webp",
    }),
    panicWarning: Object.freeze({
      key: "ui-hardcore-panic-warning-v1",
      path: "sprites/UI/hardcore-panic-v1/panic-warning-medallion-v1.png",
    }),
    panicCritical: Object.freeze({
      key: "ui-hardcore-panic-critical-v1",
      path: "sprites/UI/hardcore-panic-v1/panic-critical-medallion-v1.png",
    }),
    panicEdgeFrame: Object.freeze({
      key: "ui-hardcore-panic-edge-frame-v1",
      path: "sprites/UI/hardcore-panic-v1/high-panic-edge-frame-v1.png",
    }),
  }),
  ui: Object.freeze({
    depth: 4200,
    panelWidth: 960,
    panelHeight: 640,
    panelTopSafeInset: 122,
    titleY: -188,
    subtitleY: -151,
    bodyY: -94,
    bodyWidth: 720,
    typedPromptY: 103,
    typedValueY: 144,
    footerY: 220,
    crestSize: 92,
    font: Object.freeze({
      titlePx: 30,
      subtitlePx: 12,
      bodyPx: 16,
      typedPromptPx: 13,
      typedValuePx: 26,
      footerPx: 12,
      choiceTitlePx: 20,
      choiceBodyPx: 13,
      statusTitlePx: 13,
      statusBodyPx: 12,
    }),
    modeSelector: Object.freeze({
      title: "CHOOSE SAVE RULES",
      subtitle: "THIS CHOICE IS PERMANENT FOR THE SAVE",
      choiceCenterY: 58,
      choiceGap: 310,
      choiceWidth: 290,
      choiceHeight: 270,
      innerSafeInsetXPx: 26,
      innerSafeTopY: -108,
      innerSafeBottomY: 96,
      iconY: -65,
      casualIconWidthPx: 210,
      casualIconHeightPx: 47,
      hardcoreIconSizePx: 84,
      hardcoreIconMaskRadiusPx: 40,
      titleY: -1,
      titleMaxWidthPx: 238,
      bodyY: 29,
      bodyMaxWidthPx: 230,
      bodyLineSpacingPx: 4,
      selectedY: 87,
      casualAccent: "#72b9e8",
      hardcoreAccent: "#ff7566",
      selectedScale: 1,
      idleAlpha: 0.64,
      selectedAlpha: 1,
    }),
    statusHud: Object.freeze({
      x: 202,
      // Sit below the complete three-chip buff lane (y 120..150). Keeping the
      // status crest out of that lane prevents Hardcore danger feedback from
      // covering active buff names at the exact moment both matter most.
      y: 184,
      width: 380,
      height: 56,
      crestSize: 50,
      textOffsetX: 12,
      depth: 3601,
    }),
  }),
  stress: Object.freeze({
    minimumDepthTiles: 22,
    maximum: 100,
    maxFrameMs: 100,
    darknessAlphaThreshold: 0.72,
    darknessStressPerSecond: 5.2,
    darknessDepthBonusPer100Tiles: 0.62,
    darknessDepthBonusMax: 5.4,
    rapidDescentThresholdTilesPerSecond: 4.8,
    rapidDescentFullRateTilesPerSecond: 13,
    rapidDescentStressPerSecond: 9.5,
    deepPressureStartDepthTiles: 420,
    deepPressureFullDepthTiles: 1800,
    deepPressureStressPerSecondMax: 3.4,
    stressResistancePerPlayerLevel: 0.05,
    stressResistanceMaximum: 0.4,
    litRecoveryPerSecond: 7.2,
    // Match panic relief to the authored ~1.55-tile visible Star halo.
    // Five tiles created an oversized safe zone that trivialised nearby danger.
    intactStarLightRadiusTiles: 1.5,
    intactStarRecoveryPerSecond: 10,
    surfaceRecoveryPerSecond: 13,
    warningThreshold: 55,
    criticalThreshold: 80,
    gpDrainStartThreshold: 65,
    gpDrainAtStartPerSecond: 3,
    gpDrainAtMaximumPerSecond: 18,
    thresholdNoticeCooldownMs: 9000,
    persistenceIntervalMs: 10000,
    persistenceDelta: 5,
    nearDeathGpThreshold: 8,
    nearDeathCueCooldownMs: 7000,
  }),
  checkpoint: Object.freeze({
    intervalMs: 1000,
    lowGpImmediateThreshold: 1,
  }),
  upkeepProtection: Object.freeze({
    floorGp: 1, sources: Object.freeze(["flight", "torch", "debrisShield"]),
  }),
  runStats: Object.freeze({
    maximumActivePlayMs: 315360000000,
    maximumActiveFrameMs: 1000,
    maximumActionCount: 1000000,
    maximumMoneySpent: 1000000000000,
  }),
  teleport: Object.freeze({
    free: true,
    minimumCost: 60,
    baseCost: 85,
    costPerDepthTile: 1.35,
    maximumCost: 3600,
    kindMultipliers: TELEPORT_KIND_MULTIPLIERS,
  }),
  bobo: Object.freeze({
    merchantId: "boboMerchant",
    itemId: "__hardcoreOath",
    category: "SAVE RULES",
    rowStatus: "IRREVERSIBLE • TYPE YES",
    actionLabel: "TYPE YES • ENABLE HARDCORE",
  }),
  unstuck: Object.freeze({
    resourceLossRatio: 0.5,
    cooldownMs: 10 * 60 * 1000,
    cooldownDisplayUnitMs: 60 * 1000,
    confirmationWord: "YES",
  }),
  death: Object.freeze({
    automaticSaveDeletion: false,
    zeroGpEpsilon: 0.0001,
    returnDelayMs: 350,
    inFlightSaveWaitMs: 2500,
    lifeStateSaveTimeoutMs: 8000,
    remotePurgeWaitMs: 5000,
    sourceLabels: Object.freeze({
      flight: "Flight exhausted the last of your Gem Power",
      torch: "The torch consumed the last of your Gem Power",
      stress: "Panic and pressure consumed the last of your Gem Power",
      quickslash: "Quickslash consumed the last of your Gem Power",
      thunderStrike: "Thunder Strike consumed the last of your Gem Power",
      graveborerWurm: "The Graveborer Wurm shattered your final Gem Power",
      fallingRock: "A falling rock crushed your final Gem Power",
      caveHazard: "A cave hazard drained your final Gem Power",
      crushDepth: "The mine's crush boundary claimed you",
      unknown: "Your Gem Power reached zero",
    }),
  }),
  feedback: Object.freeze({
    armedFlashMs: 4600,
    dangerFlashMs: 2800,
    actionFlashMs: 2400,
    errorFlashMs: 2600,
    armedColor: "#ff7468",
    dangerColor: "#ff5f55",
    successColor: "#9de3a1",
    errorColor: "#ff8b7f",
    stressWarningText: "Stress is rising • find light and slow your descent",
    stressCriticalText: "Critical stress • panic is draining Gem Power",
    oneGpText: "1 GP • one mistake from a revive or life loss",
    armedText: "HARDCORE ARMED • 0 GP CONSUMES A REVIVE OR LIFE",
  }),
  copy: Object.freeze({
    casualName: "CASUAL",
    casualSummary: "Persistent mine. Zero GP disables abilities,\nbut never deletes your save.",
    hardcoreName: "HARDCORE",
    hardcoreSummary: "2 lives plus one free first revive. Arms at Flight.\nStress and hazards can consume a life.",
    oneLifeName: "ONE-LIFE HARDCORE",
    oneLifeSummary: "1 life. No free revive. Arms at Flight.\nThe save remains intact when the expedition ends.",
    pendingLabel: "HARDCORE • ARMS AT FLIGHT",
    armedLabel: "HARDCORE • OATH ARMED",
    exhaustedLabel: "HARDCORE • EXPEDITION ENDED",
    boboOfferName: "The Hardcore Oath",
    boboOfferSummary: "Convert this Casual save forever. Gain 2 lives and one free first revive; the save remains intact at exhaustion.",
    boboConfirmationTitle: "BOBO'S HARDCORE OATH",
    boboConfirmationBody:
      "This cannot be undone.\n\nBobo will fully charge your Gem Power and arm Hardcore immediately with 2 lives and one free first revive. Flight and torch stop at 1 GP, but stress, darkness, cave traps, falling rocks, combat abilities, and the Graveborer Wurm can consume a revive or life. An exhausted expedition remains intact in the Save Vault.",
    unstuckTitle: "LAST RESORT RETURN",
    unstuckBody:
      "Returning to safety destroys 50% of every carried resource stack and starts a 10-minute cooldown.\n\nThis applies in Casual and Hardcore. Your wallet and permanent upgrades are not touched.",
    typedInstruction: "TYPE  YES  THEN PRESS ENTER",
    deathTitle: "THE OATH TAKES ITS TOLL",
    erasingLabel: "SAVING THE NEW LIFE STATE...",
    erasedLabel: "LIFE STATE SAVED",
    deathFooter: "PRESS ENTER OR CLICK TO RETURN TO SAVE SLOTS",
  }),
  diagnostics: Object.freeze({
    globalKey: "__jkdHardcore",
  }),
});

function finiteOr(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function sanitizeHardcoreModeData(data) {
  const mode = data?.mode === MODES.oneLifeHardcore
    ? MODES.oneLifeHardcore
    : data?.mode === MODES.hardcore || data?.armed === true
      ? MODES.hardcore
      : MODES.casual;
  const riskMode = mode !== MODES.casual;
  const rules = HARDCORE_MODE_CONFIG.rules[mode];
  const rawLives = Number.isFinite(data?.livesRemaining)
    ? Math.floor(data.livesRemaining)
    : rules.startingLives;
  const requestedExhausted = riskMode && data?.exhausted === true;
  const livesRemaining = riskMode
    ? clamp(requestedExhausted ? 0 : rawLives, 0, rules.startingLives)
    : null;
  const exhausted = riskMode && livesRemaining <= 0;
  const stress = riskMode
    ? clamp(finiteOr(data?.stress, 0), 0, HARDCORE_MODE_CONFIG.stress.maximum)
    : 0;
  return {
    version: HARDCORE_MODE_CONFIG.version,
    mode,
    armed: riskMode && !exhausted && data?.armed === true,
    livesRemaining,
    freeReviveAvailable: mode === MODES.hardcore
      && !exhausted
      && data?.freeReviveAvailable !== false,
    deaths: riskMode
      ? Math.floor(clamp(
        finiteOr(data?.deaths, 0),
        0,
        HARDCORE_MODE_CONFIG.runStats.maximumActionCount,
      ))
      : 0,
    exhausted,
    stress,
    peakStress: riskMode
      ? clamp(Math.max(stress, finiteOr(data?.peakStress, stress)), 0, HARDCORE_MODE_CONFIG.stress.maximum)
      : 0,
    selectedAt: Math.max(0, finiteOr(data?.selectedAt, 0)),
    armedAt: riskMode && data?.armed === true
      ? Math.max(0, finiteOr(data?.armedAt, 0))
      : 0,
    lastUnstuckAt: Math.max(0, finiteOr(data?.lastUnstuckAt, 0)),
    activePlayMs: riskMode
      ? clamp(
        finiteOr(data?.activePlayMs, 0),
        0,
        HARDCORE_MODE_CONFIG.runStats.maximumActivePlayMs,
      )
      : 0,
    unstuckUses: riskMode
      ? Math.floor(clamp(
        finiteOr(data?.unstuckUses, 0),
        0,
        HARDCORE_MODE_CONFIG.runStats.maximumActionCount,
      ))
      : 0,
    paidTeleports: riskMode
      ? Math.floor(clamp(
        finiteOr(data?.paidTeleports, 0),
        0,
        HARDCORE_MODE_CONFIG.runStats.maximumActionCount,
      ))
      : 0,
    teleportMoneySpent: riskMode
      ? Math.floor(clamp(
        finiteOr(data?.teleportMoneySpent, 0),
        0,
        HARDCORE_MODE_CONFIG.runStats.maximumMoneySpent,
      ))
      : 0,
  };
}

export function createHardcoreModeData(mode, now = Date.now()) {
  return sanitizeHardcoreModeData({
    mode: Object.values(MODES).includes(mode) ? mode : MODES.casual,
    armed: false,
    selectedAt: Math.max(0, finiteOr(now, 0)),
  });
}

export function isHardcoreMode(data) {
  return sanitizeHardcoreModeData(data).mode !== MODES.casual;
}

export function isHardcoreModeArmed(data) {
  const normalized = sanitizeHardcoreModeData(data);
  return normalized.mode !== MODES.casual
    && normalized.armed === true
    && normalized.exhausted !== true;
}

export function isHardcoreModeExhausted(data) {
  const normalized = sanitizeHardcoreModeData(data);
  return normalized.mode !== MODES.casual && normalized.exhausted === true;
}

export function isHardcoreRunActive(data) {
  const normalized = sanitizeHardcoreModeData(data);
  return normalized.mode !== MODES.casual && normalized.exhausted !== true;
}

export function resolveHardcoreModeFromSearch(
  search = globalThis.location?.search || "",
) {
  const value = new URLSearchParams(search)
    .get(HARDCORE_MODE_CONFIG.queryParam)
    ?.trim()
    .toLowerCase();
  return Object.values(MODES).includes(value) ? value : null;
}

export function consumeHardcoreDeath(data) {
  const current = sanitizeHardcoreModeData(data);
  if (current.mode === MODES.casual) {
    return { data: current, outcome: "casual", livesRemaining: null };
  }
  if (current.exhausted) {
    return { data: current, outcome: "exhausted", livesRemaining: 0 };
  }
  if (current.freeReviveAvailable) {
    const next = sanitizeHardcoreModeData({
      ...current,
      freeReviveAvailable: false,
      deaths: current.deaths + 1,
    });
    return { data: next, outcome: "free-revive", livesRemaining: next.livesRemaining };
  }
  const next = sanitizeHardcoreModeData({
    ...current,
    livesRemaining: current.livesRemaining - 1,
    deaths: current.deaths + 1,
  });
  return {
    data: next,
    outcome: next.exhausted ? "exhausted" : "life-lost",
    livesRemaining: next.livesRemaining,
  };
}

export function getHardcoreModeLabel(data) {
  const mode = sanitizeHardcoreModeData(data).mode;
  if (mode === MODES.oneLifeHardcore) return HARDCORE_MODE_CONFIG.copy.oneLifeName;
  if (mode === MODES.hardcore) return "HARDCORE";
  return HARDCORE_MODE_CONFIG.copy.casualName;
}

export function resolveHardcoreUpkeepGpFloor(data, source) {
  const cfg = HARDCORE_MODE_CONFIG.upkeepProtection;
  return isHardcoreModeArmed(data)
    && cfg.sources.includes(source) ? cfg.floorGp : 0;
}

export function getHardcoreModePreloadAssets() {
  return [
    HARDCORE_MODE_CONFIG.assets.panel,
    HARDCORE_MODE_CONFIG.assets.crest,
  ].map(asset => ({
    key: asset.key,
    path: asset.path,
  }));
}

export function resolveHardcoreTeleportCost(depthTiles, kind = "undergroundToSky") {
  const cfg = HARDCORE_MODE_CONFIG.teleport;
  if (cfg.free === true) return 0;
  const depth = Math.max(0, finiteOr(depthTiles, 0));
  const multiplier = cfg.kindMultipliers[kind] ?? 1;
  const raw = (cfg.baseCost + depth * cfg.costPerDepthTile) * multiplier;
  return Math.max(cfg.minimumCost, Math.min(cfg.maximumCost, Math.ceil(raw / 5) * 5));
}
