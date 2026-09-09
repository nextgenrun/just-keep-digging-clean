// ==================== CELESTIAL ENGINES ====================
// Star Heart choice, GP activation cost, legacy charge saves, hard caps, and UI copy.

import { STELLAR_LANCE_PRESENTATION as LANCE } from "./stellarLancePresentation.js";
import { STAR_RARITY_PROGRESSION_CONFIG } from "./starRarityProgression.js";

export const CELESTIAL_ENGINE_IDS = Object.freeze({
  WAYWARD_STAR: "wayward-star",
  HOLLOW_SUN: "hollow-sun",
  STELLAR_RAGE: "comet-engine",
  // Legacy alias retained because existing saves persist this stable id.
  COMET_ENGINE: "comet-engine",
});

export const CELESTIAL_ENGINE_ORDER = Object.freeze([
  CELESTIAL_ENGINE_IDS.WAYWARD_STAR,
  CELESTIAL_ENGINE_IDS.HOLLOW_SUN,
  CELESTIAL_ENGINE_IDS.STELLAR_RAGE,
]);

export const CELESTIAL_ENGINE_CORE_ASSETS = Object.freeze({
  starHeart: "sprites/celestial-engines/star-heart-core-v1.png",
  waywardStar: "sprites/celestial-engines/wayward-star-core-v1.png",
  hollowSun: "sprites/celestial-engines/hollow-sun-core-v1.png",
  cometEngine: "sprites/celestial-engines/comet-engine-core-v1.png",
  stellarLanceProjectile:
    "sprites/celestial-engines/stellar-lance-projectiles-v1.png",
  stellarLanceWaveBlue:
    "sprites/celestial-engines/cinder-lance-v1/azure.png",
  stellarLanceWavePurple:
    "sprites/celestial-engines/cinder-lance-v1/violet.png",
  stellarLanceWaveRed:
    "sprites/celestial-engines/cinder-lance-v1/ember.png",
  stellarLancePrismatic:
    "sprites/celestial-engines/cinder-lance-v1/prismatic.png",
  stellarLanceImpact:
    "sprites/celestial-engines/stellar-lance-impact-purple-v1.png",
});

const STELLAR_LANCE_PROJECTILE_STATES = Object.freeze([
  Object.freeze({
    id: "violet-edge",
    label: "VIOLET EDGE",
    minimumDistanceTiles: 1,
    damageMultiplier: 1,
    tint: 0xc08cff,
    impactTint: 0xe1c2ff,
    displayScale: 0.9,
    alpha: 0.94,
  }),
  Object.freeze({
    id: "amethyst-surge",
    label: "AMETHYST SURGE",
    minimumDistanceTiles: 3,
    damageMultiplier: 1,
    tint: 0xa855f7,
    impactTint: 0xd8a7ff,
    displayScale: 1,
    alpha: 0.95,
  }),
  Object.freeze({
    id: "voidpiercer",
    label: "VOIDPIERCER",
    minimumDistanceTiles: 5,
    damageMultiplier: 1,
    tint: 0x7c3aed,
    impactTint: 0xf2e5ff,
    displayScale: 1.1,
    alpha: 1,
  }),
]);

const ENGINE_DEFINITIONS = Object.freeze({
  [CELESTIAL_ENGINE_IDS.WAYWARD_STAR]: Object.freeze({
    id: CELESTIAL_ENGINE_IDS.WAYWARD_STAR,
    name: "THE WAYWARD STAR",
    shortName: "WAYWARD STAR",
    role: "RICOCHET SWARM",
    description: "Release a fire-and-forget swarm of rebounding stars. Each chooses its own route without a final blast.",
    capLabel: "1 STAR  •  8 BOUNCES  •  8 SEC",
    accent: 0x65e8ff,
    cssAccent: "#65E8FF",
    lifetimeMs: 8000,
    speedTilesPerSecond: 3.2,
    maxBounces: 8,
    maxImpacts: 14,
    maxRedirects: 0,
    simultaneousStars: 1,
    swarmSpreadDegrees: 14,
    swarmSpawnOffsetTiles: 0.18,
    supernovaRadiusTiles: 0,
    supernovaMaxImpacts: 0,
    bounceSpeedMultiplier: 1,
    seekFreshTargets: false,
    seekRadiusTiles: 0,
    returnToPlayer: false,
    returnCanImpact: false,
    returnSpeedTilesPerSecond: 4.8,
    returnImpactCooldownMs: 140,
    displaySizePx: 78,
    trailIntervalMs: 58,
  }),
  [CELESTIAL_ENGINE_IDS.HOLLOW_SUN]: Object.freeze({
    id: CELESTIAL_ENGINE_IDS.HOLLOW_SUN,
    name: "THE HOLLOW SUN",
    shortName: "HOLLOW SUN",
    role: "SINGULARITY CLUSTER",
    description: "Deploy three black holes that pulse down the line, then back up. Your digs slowly push the cluster.",
    capLabel: "3 BLACK HOLES  •  WAVE PULSES  •  7.2 SEC",
    accent: 0xa96dff,
    cssAccent: "#B985FF",
    lifetimeMs: 7200,
    placementTiles: 3,
    pulseTimesMs: Object.freeze([900, 2400, 3900, 5400]),
    pulseRadiiTiles: Object.freeze([2, 3, 4, 5]),
    pulseImpactCaps: Object.freeze([4, 5, 6, 7]),
    maxImpacts: 22,
    simultaneousHoles: 3,
    clusterSpacingTiles: 2.4,
    clusterArcTiles: 1.1,
    clusterSpawnDelayMs: 180,
    pulseWaveStepMs: 125,
    digDriftStepTiles: 0.24,
    digDriftSpeedTilesPerSecond: 0.75,
    digDriftMaximumQueuedTiles: 1.25,
    digDriftReturnTilesPerSecond: 0.18,
    softFollowDistanceTiles: 2.4,
    softFollowSpeedTilesPerSecond: 1.35,
    softFollowDeadzoneTiles: 0.3,
    controlPulseEveryNudges: 0,
    controlPulseRadiusTiles: 1.5,
    controlPulseImpactCap: 2,
    clusterDisplayScale: 0.78,
    implosionMaxImpacts: 6,
    implosionRadiusTiles: 2,
    displaySizePx: 136,
    coreRadiusPx: 31,
  }),
  [CELESTIAL_ENGINE_IDS.STELLAR_RAGE]: Object.freeze({
    id: CELESTIAL_ENGINE_IDS.STELLAR_RAGE,
    name: "STELLAR LANCE",
    shortName: "STELLAR LANCE",
    role: "CINDER FIREBALLS",
    description: "Your strikes release a compact fireball at contact. It carries leftover damage forward after breaking a block.",
    capLabel: "5-TILE RANGE  •  75% FIRST HIT  •  15 SEC",
    accent: 0xa855f7,
    cssAccent: "#C084FC",
    lifetimeMs: 15000,
    maxImpacts: 0,
    maxBounces: 0,
    maxRedirects: 0,
    projectileEnabled: true,
    projectileInfiniteRange: false,
    projectileRangeTiles: 5,
    projectileSafetyMaxTiles: 8,
    projectileDamageMultiplier: 0.75,
    projectileSideLanes: 0,
    projectilePassesGeodeWalls: true,
    projectileStates: STELLAR_LANCE_PROJECTILE_STATES,
    projectileDisplayWidthPx: LANCE.displayWidthPx,
    projectileDisplayHeightPx: LANCE.displayHeightPx,
    projectileSpeedPxPerSecond: LANCE.speedPxPerSecond,
    projectileSpawnOffsetTiles: 0,
    resonantEveryShots: 0,
    resonantSideLanes: 0,
    resonantDamageBonus: 0,
    breakChargePerDestroyedTile: 0,
    breakChargeMaximum: 0,
    lifetimeGainPerDestroyedTileMs: 0,
    lifetimeGainCapMs: 0,
    finalWindowMs: 0,
    finalWindowSideLanes: 0,
  }),
});

export const CELESTIAL_ENGINE_CONFIG = Object.freeze({
  saveVersion: 4,
  rollbackQueryParam: "starHearts",
  unlock: Object.freeze({
    requiredConstellations: 10,
    maxHearts: 3,
    additionalHeartActivationMilestones: Object.freeze([20, 50]),
  }),
  activation: Object.freeze({
    gpCost: 100,
  }),
  // Retained for save compatibility; action-bar powers no longer spend this bank.
  charge: Object.freeze({
    capacity: 200,
    initialOnAttune: 100,
    activationCost: 100,
    starChargeByRarity: Object.freeze(
      STAR_RARITY_PROGRESSION_CONFIG.rarityTiers.map(tier => tier.engineCharge),
    ),
  }),
  damage: Object.freeze({
    maxPerHit: 1000000,
    rememberedTransactions: 512,
    maxActivationIdLength: 96,
  }),
  input: Object.freeze({
    openGraceMs: 240,
    confirmWindowMs: 6000,
  }),
  fx: Object.freeze({
    worldDepth: 78,
    trailLifeMs: 310,
    impactPulseMs: 260,
    finishDelayMs: 420,
    launchPulseMs: 360,
    waywardRotationDegPerSecond: 150,
    hollowRotationDegPerSecond: 18,
    hollowOrbitCycleMs: 880,
    hollowCorePulseMs: 170,
    hollowPull: Object.freeze({
      maxShardsPerPulse: 24,
      displaySizeTiles: 0.18,
      startAlpha: 0.94,
      endScale: 0.08,
      minimumDurationMs: 380,
      durationPerTileMs: 36,
      maximumDurationMs: 900,
      rotationRadians: 3.4,
      depthOffset: 1,
    }),
    stellarRage: Object.freeze({
      projectileAlpha: 0.9,
      projectileEndAlpha: 0.18,
      projectileImpactAlpha: 0.5,
      projectileImpactScale: 0.26,
      projectileImpactDisplaySizeTiles: 1.45,
      projectileImpactOriginX: 0.493,
      projectileImpactOriginY: 0.56,
      projectileImpactAuthoredTravelAngleDeg: 90,
      projectileImpactGrowth: 1.65,
      projectileImpactRotationDeg: 18,
      projectileImpactMs: 130,
      projectileFadeOutMs: 150,
      transientDepthOffset: 3,
      launchFlashAlpha: 0.44,
      launchFlashScale: 0.66,
      launchFlashGrowth: 1.22,
      launchFlashMs: 250,
      stateBurstAlpha: 0.18,
      stateBurstScale: 0.32,
      stateBurstGrowth: 1.18,
      stateBurstMs: 220,
    }),
    hitShakeSignature: "misc.legendBlock",
  }),
  hud: Object.freeze({
    widthPx: 252,
    heightPx: 58,
    marginPx: 18,
    iconPx: 45,
    barWidthPx: 148,
    barHeightPx: 7,
    depth: 1950,
    pulseMs: 260,
    activeSuffix: "ACTIVE",
    stellarLanceBuff: Object.freeze({
      chipLabel: "LANCE",
      passiveChipLabel: "ECHO LANCE",
      icon: "power",
      tooltipTitle: "STELLAR LANCE — ACTIVE",
      passiveTooltipTitle: "ECHO LANCE — PERMANENT",
      activeTooltipBody: "FIRST BLOCK: {damage}\n{range} • {lanes} • {remaining}s left.\nOnly leftover damage continues. Shots: blue, purple, red.",
      passiveTooltipBody: "FIRST BLOCK: {damage}\n{range} • ALWAYS ON\nOnly leftover damage continues. Full Stellar Lance temporarily replaces this echo.",
      infiniteRangeLabel: "TO WORLD EDGE",
      stateLabel: "VISUAL FORMS",
      cssAccent: "#C084FC",
      timeDecimals: 1,
      damageDecimals: 2,
    }),
  }),
  overlay: Object.freeze({
    maxWidthPx: 1160,
    maxHeightPx: 690,
    depth: 3900,
    cardGapPx: 14,
    cardHeightPx: 370,
    coreSizePx: 132,
    ambientBobPx: 6,
    ambientCycleMs: 2400,
  }),
  copy: Object.freeze({
    title: "STAR HEART",
    subtitle: "THREE HEARTS  •  THREE CELESTIAL POWERS",
    locked: "Master all 10 constellations to awaken a Star Heart.",
    ready: "A Star Heart is awake. Permanently unlock one of three powers.",
    selected: "POWER EQUIPPED",
    confirm: "ATTUNE POWER",
    permanentConfirm: "CONFIRM PERMANENT UNLOCK",
    equip: "EQUIP POWER",
    equipped: "CURRENTLY EQUIPPED",
    mastered: "ALL THREE CELESTIAL POWERS MASTERED",
    nextHeart: "Use Celestial powers to awaken more Hearts.",
    godModeStatus: "GOD MODE  •  ALL CELESTIAL POWERS FREE",
    godModeConfirm: "EQUIP POWER",
    godModeHint: "FREE SWITCH",
    godModeEquipped: "GOD MODE EQUIPPED",
    godModeActivated: "TRUE GODMODE  •  ALL ABILITIES FREE  •  ALL CELESTIAL ENGINES AVAILABLE",
    fullCharge: "STAR HEART RESONANCE READY",
    recharge: "Celestial powers spend GP. Only one Celestial power can be equipped at a time.",
    godModeRecharge: "God Mode ignores GP costs. Each Celestial power can still be active only once at a time.",
    protected: "Bedrock and protected structures are never damaged.",
    unavailable: "STAR HEART ASLEEP",
    activeBlocked: "Finish the active Celestial power first.",
  }),
  engines: ENGINE_DEFINITIONS,
});

export function isCelestialEnginesEnabled(search = globalThis.location?.search || "") {
  try {
    const value = new URLSearchParams(search).get(CELESTIAL_ENGINE_CONFIG.rollbackQueryParam);
    return value !== "0" && value !== "off" && value !== "false";
  } catch {
    return true;
  }
}

function finiteInt(value, fallback, min, max) {
  const parsed = Number.isFinite(value) ? Math.floor(value) : fallback;
  return Math.max(min, Math.min(max, parsed));
}

function uniqueEngineIds(values) {
  const source = Array.isArray(values) ? values : [];
  return CELESTIAL_ENGINE_ORDER.filter(engineId => source.includes(engineId));
}

export function getEarnedStarHeartCount(constellationCount, activationsUsed) {
  const safeConstellations = Math.max(0, Math.floor(Number(constellationCount) || 0));
  if (safeConstellations < CELESTIAL_ENGINE_CONFIG.unlock.requiredConstellations) return 0;

  const safeActivations = Math.max(0, Math.floor(Number(activationsUsed) || 0));
  let hearts = 1;
  for (const milestone of CELESTIAL_ENGINE_CONFIG.unlock.additionalHeartActivationMilestones) {
    if (safeActivations >= milestone) hearts += 1;
  }
  return Math.min(CELESTIAL_ENGINE_CONFIG.unlock.maxHearts, hearts);
}

export function sanitizeStarHeartData(data) {
  const source = data && typeof data === "object" ? data : {};
  const selectedCandidate = CELESTIAL_ENGINE_ORDER.includes(source.selectedEngine)
    ? source.selectedEngine
    : null;
  const activationsUsed = finiteInt(source.activationsUsed, 0, 0, 1000000);
  const constellationCount = finiteInt(source.constellationCount, 0, 0, 100);
  let unlockedEngines = uniqueEngineIds(source.unlockedEngines);
  if (selectedCandidate && !unlockedEngines.includes(selectedCandidate)) {
    unlockedEngines = [...unlockedEngines, selectedCandidate];
  }
  unlockedEngines = uniqueEngineIds(unlockedEngines);

  const progressHearts = getEarnedStarHeartCount(constellationCount, activationsUsed);
  const requestedHearts = finiteInt(
    source.heartsEarned,
    progressHearts,
    0,
    CELESTIAL_ENGINE_CONFIG.unlock.maxHearts,
  );
  const heartsEarned = Math.min(
    CELESTIAL_ENGINE_CONFIG.unlock.maxHearts,
    Math.max(progressHearts, requestedHearts, unlockedEngines.length),
  );
  unlockedEngines = unlockedEngines.slice(0, heartsEarned);
  const selectedEngine = selectedCandidate && unlockedEngines.includes(selectedCandidate)
    ? selectedCandidate
    : unlockedEngines[0] || null;
  const heartsSpent = unlockedEngines.length;

  return {
    version: CELESTIAL_ENGINE_CONFIG.saveVersion,
    heartsEarned,
    heartsSpent,
    selectedEngine,
    unlockedEngines,
    charge: finiteInt(
      source.charge,
      selectedEngine ? 0 : CELESTIAL_ENGINE_CONFIG.charge.capacity,
      0,
      CELESTIAL_ENGINE_CONFIG.charge.capacity,
    ),
    activationsUsed,
    constellationCount,
  };
}
