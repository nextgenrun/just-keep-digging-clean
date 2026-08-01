const MODES = Object.freeze({
  casual: "casual",
  hardcore: "hardcore",
});

const TELEPORT_KIND_MULTIPLIERS = Object.freeze({
  undergroundToSky: 1,
  groundToSky: 0.8,
  skyToDungeon: 1.15,
  quickResume: 1.45,
});

export const HARDCORE_MODE_CONFIG = Object.freeze({
  version: 3,
  modes: MODES,
  defaultData: Object.freeze({
    version: 3,
    mode: MODES.casual,
    armed: false,
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
      choiceTitlePx: 21,
      choiceBodyPx: 13,
      statusTitlePx: 12,
      statusBodyPx: 11,
    }),
    modeSelector: Object.freeze({
      title: "CHOOSE SAVE RULES",
      subtitle: "THIS CHOICE IS PERMANENT FOR THE SAVE",
      choiceCenterY: 58,
      choiceGap: 310,
      choiceWidth: 290,
      choiceHeight: 270,
      casualAccent: "#72b9e8",
      hardcoreAccent: "#ff7566",
      selectedScale: 1.08,
      idleAlpha: 0.64,
      selectedAlpha: 1,
    }),
    statusHud: Object.freeze({
      x: 164,
      y: 153,
      width: 304,
      height: 48,
      crestSize: 42,
      textOffsetX: 12,
      depth: 3601,
      warningPulseHz: 2.1,
      criticalPulseHz: 4.1,
      pulseScale: 0.025,
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
    litRecoveryPerSecond: 7.2,
    surfaceRecoveryPerSecond: 13,
    warningThreshold: 55,
    criticalThreshold: 80,
    gpDrainStartThreshold: 65,
    gpDrainAtStartPerSecond: 3,
    gpDrainAtMaximumPerSecond: 18,
    thresholdNoticeCooldownMs: 9000,
    persistenceIntervalMs: 10000,
    persistenceDelta: 5,
  }),
  checkpoint: Object.freeze({
    intervalMs: 1000,
    lowGpImmediateThreshold: 1,
  }),
  upkeepProtection: Object.freeze({
    floorGp: 1, sources: Object.freeze(["flight", "torch"]),
  }),
  runStats: Object.freeze({
    maximumActivePlayMs: 315360000000,
    maximumActiveFrameMs: 1000,
    maximumActionCount: 1000000,
    maximumMoneySpent: 1000000000000,
  }),
  teleport: Object.freeze({
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
    actionLabel: "TYPE YES • ENABLE PERMADEATH",
  }),
  unstuck: Object.freeze({
    resourceLossRatio: 0.5,
    cooldownMs: 10 * 60 * 1000,
    cooldownDisplayUnitMs: 60 * 1000,
    confirmationWord: "YES",
  }),
  death: Object.freeze({
    zeroGpEpsilon: 0.0001,
    returnDelayMs: 350,
    inFlightSaveWaitMs: 2500,
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
    oneGpText: "1 GP • one mistake from permanent death",
    armedText: "HARDCORE ARMED • 0 GP NOW ERASES THIS SAVE",
  }),
  copy: Object.freeze({
    casualName: "CASUAL",
    casualSummary: "Persistent mine. Zero GP disables abilities, but never deletes your save.",
    hardcoreName: "PERMADEATH HARDCORE",
    hardcoreSummary: "Arms at Flight. Flight and torch stop at 1 GP; stress and hazards can take the last.",
    pendingLabel: "HARDCORE • ARMS AT FLIGHT",
    armedLabel: "HARDCORE • OATH ARMED",
    boboOfferName: "The Hardcore Oath",
    boboOfferSummary: "Convert this Casual save forever. Bobo fully charges GP, then 0 GP means permadeath.",
    boboConfirmationTitle: "BOBO'S HARDCORE OATH",
    boboConfirmationBody:
      "This cannot be undone.\n\nBobo will fully charge your Gem Power and arm Hardcore immediately. Flight and torch stop at 1 GP, but stress, darkness, cave traps, falling rocks, combat abilities, and the Graveborer Wurm can take the final GP. At 0 GP the save and its local backups are erased.",
    unstuckTitle: "LAST RESORT RETURN",
    unstuckBody:
      "Returning to safety destroys 50% of every carried resource stack and starts a 10-minute cooldown.\n\nThis applies in Casual and Hardcore. Your wallet and permanent upgrades are not touched.",
    typedInstruction: "TYPE  YES  THEN PRESS ENTER",
    deathTitle: "THE OATH IS CLAIMED",
    erasingLabel: "ERASING SAVE AND BACKUPS...",
    erasedLabel: "SAVE DELETED",
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
  const mode = data?.mode === MODES.hardcore ? MODES.hardcore : MODES.casual;
  const stress = mode === MODES.hardcore
    ? clamp(finiteOr(data?.stress, 0), 0, HARDCORE_MODE_CONFIG.stress.maximum)
    : 0;
  return {
    version: HARDCORE_MODE_CONFIG.version,
    mode,
    armed: mode === MODES.hardcore && data?.armed === true,
    stress,
    peakStress: mode === MODES.hardcore
      ? clamp(Math.max(stress, finiteOr(data?.peakStress, stress)), 0, HARDCORE_MODE_CONFIG.stress.maximum)
      : 0,
    selectedAt: Math.max(0, finiteOr(data?.selectedAt, 0)),
    armedAt: mode === MODES.hardcore && data?.armed === true
      ? Math.max(0, finiteOr(data?.armedAt, 0))
      : 0,
    lastUnstuckAt: Math.max(0, finiteOr(data?.lastUnstuckAt, 0)),
    activePlayMs: mode === MODES.hardcore
      ? clamp(
        finiteOr(data?.activePlayMs, 0),
        0,
        HARDCORE_MODE_CONFIG.runStats.maximumActivePlayMs,
      )
      : 0,
    unstuckUses: mode === MODES.hardcore
      ? Math.floor(clamp(
        finiteOr(data?.unstuckUses, 0),
        0,
        HARDCORE_MODE_CONFIG.runStats.maximumActionCount,
      ))
      : 0,
    paidTeleports: mode === MODES.hardcore
      ? Math.floor(clamp(
        finiteOr(data?.paidTeleports, 0),
        0,
        HARDCORE_MODE_CONFIG.runStats.maximumActionCount,
      ))
      : 0,
    teleportMoneySpent: mode === MODES.hardcore
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
    mode: mode === MODES.hardcore ? MODES.hardcore : MODES.casual,
    armed: false,
    selectedAt: Math.max(0, finiteOr(now, 0)),
  });
}

export function isHardcoreMode(data) {
  return sanitizeHardcoreModeData(data).mode === MODES.hardcore;
}

export function isHardcoreModeArmed(data) {
  const normalized = sanitizeHardcoreModeData(data);
  return normalized.mode === MODES.hardcore && normalized.armed === true;
}

export function resolveHardcoreUpkeepGpFloor(data, source) {
  const cfg = HARDCORE_MODE_CONFIG.upkeepProtection;
  return data?.mode === MODES.hardcore && data?.armed === true
    && cfg.sources.includes(source) ? cfg.floorGp : 0;
}

export function getHardcoreModePreloadAssets() {
  return Object.values(HARDCORE_MODE_CONFIG.assets).map(asset => ({
    key: asset.key,
    path: asset.path,
  }));
}

export function resolveHardcoreTeleportCost(depthTiles, kind = "undergroundToSky") {
  const cfg = HARDCORE_MODE_CONFIG.teleport;
  const depth = Math.max(0, finiteOr(depthTiles, 0));
  const multiplier = cfg.kindMultipliers[kind] ?? 1;
  const raw = (cfg.baseCost + depth * cfg.costPerDepthTile) * multiplier;
  return Math.max(cfg.minimumCost, Math.min(cfg.maximumCost, Math.ceil(raw / 5) * 5));
}
