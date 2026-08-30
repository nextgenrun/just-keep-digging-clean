// ==================== CELESTIAL ENGINES ====================
// Star Heart choice, GP activation cost, legacy charge saves, hard caps, and UI copy.

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
});

const ENGINE_DEFINITIONS = Object.freeze({
  [CELESTIAL_ENGINE_IDS.WAYWARD_STAR]: Object.freeze({
    id: CELESTIAL_ENGINE_IDS.WAYWARD_STAR,
    name: "THE WAYWARD STAR",
    shortName: "WAYWARD STAR",
    role: "RICOCHET SWARM",
    description: "Release a physical star swarm. Each star rebounds independently before erupting in a final supernova.",
    capLabel: "1 STAR  •  8 BOUNCES  •  8 SEC",
    accent: 0x65e8ff,
    cssAccent: "#65E8FF",
    lifetimeMs: 8000,
    speedTilesPerSecond: 8,
    maxBounces: 8,
    maxImpacts: 14,
    maxRedirects: 0,
    simultaneousStars: 1,
    swarmSpreadDegrees: 14,
    swarmSpawnOffsetTiles: 0.18,
    supernovaRadiusTiles: 2,
    supernovaMaxImpacts: 7,
    displaySizePx: 78,
    trailIntervalMs: 58,
  }),
  [CELESTIAL_ENGINE_IDS.HOLLOW_SUN]: Object.freeze({
    id: CELESTIAL_ENGINE_IDS.HOLLOW_SUN,
    name: "THE HOLLOW SUN",
    shortName: "HOLLOW SUN",
    role: "SINGULARITY CLUSTER",
    description: "Deploy two black holes in a gravity cluster. Each core pulses, pulls debris, and implodes independently.",
    capLabel: "2 BLACK HOLES  •  4 PULSES EACH  •  7.2 SEC",
    accent: 0xa96dff,
    cssAccent: "#B985FF",
    lifetimeMs: 7200,
    placementTiles: 3,
    pulseTimesMs: Object.freeze([900, 2400, 3900, 5400]),
    pulseRadiiTiles: Object.freeze([2, 3, 4, 5]),
    pulseImpactCaps: Object.freeze([6, 7, 8, 9]),
    maxImpacts: 30,
    simultaneousHoles: 2,
    clusterSpacingTiles: 2.4,
    clusterArcTiles: 1.1,
    clusterSpawnDelayMs: 180,
    clusterDisplayScale: 0.78,
    implosionMaxImpacts: 4,
    implosionRadiusTiles: 2,
    displaySizePx: 136,
    coreRadiusPx: 31,
  }),
  [CELESTIAL_ENGINE_IDS.STELLAR_RAGE]: Object.freeze({
    id: CELESTIAL_ENGINE_IDS.STELLAR_RAGE,
    name: "STELLAR LANCE",
    shortName: "STELLAR LANCE",
    role: "PIERCING PROJECTILE BUFF",
    description: "Every mining action fires a Star Lance through air and diggable tiles, dealing a full hit to every block in its path.",
    capLabel: "6-TILE RANGE  •  FULL DAMAGE  •  6 SEC",
    accent: 0xff6d4a,
    cssAccent: "#FF8A68",
    lifetimeMs: 6000,
    maxImpacts: 0,
    maxBounces: 0,
    maxRedirects: 0,
    projectileEnabled: true,
    projectileRangeTiles: 6,
    projectileDamageMultiplier: 1,
    projectileSideLanes: 0,
    projectilePassesGeodeWalls: true,
    projectileDisplaySizePx: 58,
    projectileTravelMsPerTile: 42,
    projectileMinimumTravelMs: 150,
    projectileMaximumTravelMs: 460,
    displaySizePx: 104,
    auraDisplaySizePx: 176,
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
      auraAlpha: 0.34,
      auraPulseScale: 1.22,
      auraPulseMs: 360,
      coreRotationDegPerSecond: 190,
      auraRotationDegPerSecond: -72,
      projectileAlpha: 0.96,
      projectileImpactAlpha: 0.72,
      projectileImpactScale: 0.46,
      projectileImpactMs: 180,
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
    subtitle: "THREE HEARTS  •  THREE CELESTIAL POWERS  •  MASTER ALL LATE GAME",
    locked: "Master all 10 constellations to forge a Star Heart.",
    ready: "A Star Heart is awake. Permanently unlock one of three powers.",
    selected: "POWER EQUIPPED",
    confirm: "ATTUNE POWER",
    permanentConfirm: "CONFIRM PERMANENT UNLOCK",
    equip: "EQUIP POWER",
    equipped: "CURRENTLY EQUIPPED",
    mastered: "ALL THREE CELESTIAL POWERS MASTERED",
    nextHeart: "Additional Hearts awaken through capped Celestial activations.",
    godModeStatus: "GOD MODE  •  ALL CELESTIAL POWERS FREE",
    godModeConfirm: "EQUIP POWER",
    godModeHint: "FREE SWITCH",
    godModeEquipped: "GOD MODE EQUIPPED",
    godModeActivated: "TRUE GODMODE  •  ALL ABILITIES FREE  •  ALL CELESTIAL ENGINES AVAILABLE",
    fullCharge: "STAR HEART RESONANCE READY",
    recharge: "Celestial powers spend GP. Only one Celestial power can be equipped at a time.",
    godModeRecharge: "God Mode ignores GP costs. Every Celestial power remains bounded to one activation.",
    protected: "Bedrock and protected structures are never damaged.",
    unavailable: "STAR HEART DORMANT",
    activeBlocked: "A Celestial power is already active.",
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
