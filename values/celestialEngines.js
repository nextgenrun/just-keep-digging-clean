// ==================== CELESTIAL ENGINES ====================
// Star Heart choice, charge economy, hard activation caps, and UI copy.

export const CELESTIAL_ENGINE_IDS = Object.freeze({
  WAYWARD_STAR: "wayward-star",
  HOLLOW_SUN: "hollow-sun",
  COMET_ENGINE: "comet-engine",
});

export const CELESTIAL_ENGINE_ORDER = Object.freeze([
  CELESTIAL_ENGINE_IDS.WAYWARD_STAR,
  CELESTIAL_ENGINE_IDS.HOLLOW_SUN,
  CELESTIAL_ENGINE_IDS.COMET_ENGINE,
]);

const ENGINE_DEFINITIONS = Object.freeze({
  [CELESTIAL_ENGINE_IDS.WAYWARD_STAR]: Object.freeze({
    id: CELESTIAL_ENGINE_IDS.WAYWARD_STAR,
    name: "THE WAYWARD STAR",
    shortName: "WAYWARD STAR",
    role: "RICOCHET ENGINE",
    description: "Release a physical star-ball. Redirect it while it rebounds, then survive its final supernova.",
    capLabel: "10 BOUNCES  •  18 IMPACTS  •  12 SEC",
    accent: 0x65e8ff,
    cssAccent: "#65E8FF",
    lifetimeMs: 12000,
    speedTilesPerSecond: 7.2,
    maxBounces: 10,
    maxImpacts: 18,
    maxRedirects: 3,
    redirectCooldownMs: 180,
    supernovaRadiusTiles: 2,
    displaySizePx: 78,
    trailIntervalMs: 58,
  }),
  [CELESTIAL_ENGINE_IDS.HOLLOW_SUN]: Object.freeze({
    id: CELESTIAL_ENGINE_IDS.HOLLOW_SUN,
    name: "THE HOLLOW SUN",
    shortName: "HOLLOW SUN",
    role: "GRAVITY ENGINE",
    description: "Place a miniature black sun. Three crushing gravity waves converge into a violent implosion.",
    capLabel: "3 PULSES  •  24 TARGETS  •  4.2 SEC",
    accent: 0xa96dff,
    cssAccent: "#B985FF",
    lifetimeMs: 4200,
    placementTiles: 2,
    pulseTimesMs: Object.freeze([520, 1480, 2660]),
    pulseRadiiTiles: Object.freeze([2, 3, 4]),
    maxImpacts: 24,
    displaySizePx: 136,
    coreRadiusPx: 31,
  }),
  [CELESTIAL_ENGINE_IDS.COMET_ENGINE]: Object.freeze({
    id: CELESTIAL_ENGINE_IDS.COMET_ENGINE,
    name: "THE COMET ENGINE",
    shortName: "COMET ENGINE",
    role: "TUNNEL ENGINE",
    description: "Launch and ride a celestial spear through a short tunnel. Protected structures stop it instantly.",
    capLabel: "10 TILES  •  12 TARGETS  •  1.8 SEC",
    accent: 0xffc85c,
    cssAccent: "#FFD27A",
    lifetimeMs: 1800,
    maxTravelTiles: 10,
    maxImpacts: 12,
    speedTilesPerSecond: 8.5,
    sideBurstEveryTiles: 3,
    rideSpeedPxPerSecond: 430,
    displaySizePx: 116,
    trailIntervalMs: 42,
  }),
});

export const CELESTIAL_ENGINE_CONFIG = Object.freeze({
  saveVersion: 2,
  rollbackQueryParam: "starHearts",
  unlock: Object.freeze({
    requiredConstellations: 10,
    maxHearts: 3,
    additionalHeartActivationMilestones: Object.freeze([20, 50]),
  }),
  charge: Object.freeze({
    capacity: 100,
    initialOnAttune: 100,
    activationCost: 100,
    starChargeByRarity: Object.freeze([12, 18, 26, 38, 55, 75]),
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
    cometPulseScale: 1.08,
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
    subtitle: "THREE HEARTS  •  THREE CELESTIAL ENGINES  •  MASTER ALL LATE GAME",
    locked: "Master all 10 constellations to forge a Star Heart.",
    ready: "A Star Heart is awake. Permanently unlock one of three Engines.",
    selected: "ENGINE EQUIPPED",
    confirm: "ATTUNE ENGINE",
    permanentConfirm: "CONFIRM PERMANENT UNLOCK",
    equip: "EQUIP ENGINE",
    equipped: "CURRENTLY EQUIPPED",
    mastered: "ALL THREE ENGINES MASTERED",
    nextHeart: "Additional Hearts awaken through capped Engine activations.",
    godModeStatus: "GOD MODE  •  ALL CELESTIAL ENGINES FREE",
    godModeConfirm: "EQUIP ENGINE",
    godModeHint: "FREE SWITCH",
    godModeEquipped: "GOD MODE EQUIPPED",
    godModeActivated: "TRUE GODMODE  •  ALL ABILITIES FREE  •  ALL CELESTIAL ENGINES AVAILABLE",
    fullCharge: "CELESTIAL CHARGE READY",
    recharge: "Sky stars recharge the Heart. Only one Engine can be equipped at a time.",
    godModeRecharge: "God Mode ignores charge. Every Engine remains bounded to one capped activation.",
    protected: "Bedrock and protected structures are never damaged.",
    unavailable: "STAR HEART DORMANT",
    activeBlocked: "A Celestial Engine is already active.",
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
