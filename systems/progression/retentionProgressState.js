import {
  RETENTION_CONFIG,
  TOWN_TUTORIAL_CHOICES,
  TOWN_TUTORIAL_STAGES,
} from "../../values/retentionConfig.js";
import { sanitizeTitanDiscoveryIds } from "../../values/titanDiscoveries.js";

const TUTORIAL_STAGES = RETENTION_CONFIG.tutorial.stages;

export function finiteRetentionInt(value, fallback = 0, max = Number.MAX_SAFE_INTEGER) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(max, Math.floor(numeric)));
}

function sanitizeStringArray(value, max = 128) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(item => typeof item === "string" && item.length <= 80))]
    .slice(0, max);
}

function createStats() {
  return {
    bestDepth: 0,
    currentDepth: 0,
    totalTilesBroken: 0,
    totalResources: 0,
    moneyEarned: 0,
    resourcesSold: 0,
    upgradesPurchased: 0,
    portalsActivated: 0,
    chestsOpened: 0,
    starsCollected: 0,
    relicsFound: 0,
    criticalHits: 0,
    highestCombo: 0,
    luckyDrops: 0,
    overkills: 0,
    earthquakesSurvived: 0,
    passagesOpened: 0,
    expeditionsCompleted: 0,
  };
}

export function createRetentionExpedition() {
  return {
    active: false,
    maxDepth: 0,
    tilesBroken: 0,
    resourceUnits: 0,
    moneyEarned: 0,
    stars: 0,
    chests: 0,
    relics: 0,
    bestMaterial: null,
  };
}

export function sanitizeRetentionExpedition(value) {
  if (!value || typeof value !== "object") return null;
  return {
    maxDepth: finiteRetentionInt(value.maxDepth, 0, 100000),
    tilesBroken: finiteRetentionInt(value.tilesBroken, 0, 100000000),
    resourceUnits: finiteRetentionInt(value.resourceUnits, 0, 1000000000),
    moneyEarned: finiteRetentionInt(value.moneyEarned, 0, 1000000000000),
    stars: finiteRetentionInt(value.stars, 0, 1000000),
    chests: finiteRetentionInt(value.chests, 0, 1000000),
    relics: finiteRetentionInt(value.relics, 0, 1000000),
    bestMaterial: typeof value.bestMaterial === "string" && value.bestMaterial.length <= 48
      ? value.bestMaterial
      : null,
  };
}

function sanitizeTitanClueTracking(value) {
  const source = value && typeof value === "object" ? value : {};
  const configured = source.configured === true;
  const activeTitanId = configured
    ? sanitizeTitanDiscoveryIds([source.activeTitanId])[0] || null
    : null;
  return {
    configured,
    activeTitanId,
  };
}

export function sanitizeRetentionProgressData(value) {
  const source = value && typeof value === "object" ? value : {};
  const sourceVersion = finiteRetentionInt(source.version, 0, RETENTION_CONFIG.saveVersion);
  const rawStats = source.stats && typeof source.stats === "object" ? source.stats : {};
  const stats = createStats();
  Object.keys(stats).forEach(key => {
    const max = key === "moneyEarned" ? 1000000000000 : 1000000000;
    stats[key] = finiteRetentionInt(rawStats[key], 0, max);
  });

  const rawDiscoveries = source.discoveries && typeof source.discoveries === "object"
    ? source.discoveries
    : {};
  const explicitChoice = Object.values(TOWN_TUTORIAL_CHOICES).includes(
    source.tutorialChoice,
  )
    ? source.tutorialChoice
    : null;
  const legacyStage = typeof source.tutorialStage === "string"
    ? source.tutorialStage
    : null;
  const migratedStage = sourceVersion < 3
    && (legacyStage === "sell" || legacyStage === "upgrade")
    ? TOWN_TUTORIAL_STAGES.PORTAL
    : legacyStage;
  const v3Stage = sourceVersion === 3
    && migratedStage === TOWN_TUTORIAL_STAGES.SELL
    ? TOWN_TUTORIAL_STAGES.RESUME
    : migratedStage;
  const routeStage = sourceVersion === 4
    && (v3Stage === "sell" || v3Stage === "upgrade")
    ? TOWN_TUTORIAL_STAGES.FLIGHT
    : v3Stage;
  const currentStage = sourceVersion === 5
    && routeStage === TOWN_TUTORIAL_STAGES.RESUME
    && stats.upgradesPurchased === 0
    ? TOWN_TUTORIAL_STAGES.UPGRADE
    : routeStage;
  const hasLegacyData = value && typeof value === "object";
  const tutorialChoice = explicitChoice
    ?? (hasLegacyData ? TOWN_TUTORIAL_CHOICES.LEGACY : null);
  const fallbackStage = tutorialChoice === TOWN_TUTORIAL_CHOICES.YES
    ? TOWN_TUTORIAL_STAGES.MOVE
    : tutorialChoice === TOWN_TUTORIAL_CHOICES.NO
      ? TOWN_TUTORIAL_STAGES.SKIPPED
      : hasLegacyData
        ? (currentStage === TOWN_TUTORIAL_STAGES.COMPLETE
          ? TOWN_TUTORIAL_STAGES.COMPLETE
          : TOWN_TUTORIAL_STAGES.SKIPPED)
        : TOWN_TUTORIAL_STAGES.UNSELECTED;
  const tutorialStage = TUTORIAL_STAGES.includes(currentStage)
    ? currentStage
    : fallbackStage;

  return {
    version: RETENTION_CONFIG.saveVersion,
    stats,
    discoveries: {
      materials: sanitizeStringArray(rawDiscoveries.materials, 64),
      portals: sanitizeStringArray(rawDiscoveries.portals, 32),
      journal: sanitizeStringArray(rawDiscoveries.journal, 128),
      titans: sanitizeTitanDiscoveryIds(rawDiscoveries.titans),
    },
    tutorialChoice,
    tutorialStage,
    tutorialFlightTrainingGranted:
      tutorialChoice === TOWN_TUTORIAL_CHOICES.LEGACY
      || source.tutorialFlightTrainingGranted === true
      || source.tutorialCompletionRewardGranted === true,
    tutorialFreeFlightRemainingMs: finiteRetentionInt(
      source.tutorialFreeFlightRemainingMs,
      0,
      RETENTION_CONFIG.tutorial.flightTraining.freeFlightMs,
    ),
    titanClueTracking: sanitizeTitanClueTracking(source.titanClueTracking),
    lastExpedition: sanitizeRetentionExpedition(source.lastExpedition),
  };
}

export function createRetentionObjective(saveSlot) {
  const definitions = RETENTION_CONFIG.objective.definitions;
  const index = (finiteRetentionInt(saveSlot, 1, 999) - 1)
    % Math.max(1, definitions.length);
  return {
    ...definitions[index],
    progress: 0,
    complete: false,
    startDepth: null,
  };
}
