// Save-safe Stars economy and the three mockup-faithful Celestial talent lattices.

import {
  CELESTIAL_TALENT_BRANCHES,
} from "./celestialTalentBranches.js";
import { LEVEL_CONFIG } from "./levelConfig.js";
import {
  CELESTIAL_TALENT_RANK_CONFIG,
  getCelestialTalentRank,
} from "./celestialTalentRanks.js";

export { CELESTIAL_TALENT_BRANCH_IDS } from "./celestialTalentBranches.js";

export const CELESTIAL_STAR_RARITY_ORDER = Object.freeze([
  "common",
  "uncommon",
  "rare",
  "epic",
  "mythic",
  "astral",
]);

const STAR_POINT_YIELDS = Object.freeze({
  common: 20,
  uncommon: 50,
  rare: 100,
  epic: 250,
  mythic: 750,
  astral: 2000,
});

export const CELESTIAL_TALENT_PROGRESSION_CONFIG = Object.freeze({
  saveVersion: 3,
  access: Object.freeze({
    requiredPlayerLevel: 3,
    initialFreeRootSelections: 1,
    rootSelectionsPerCompletedBranch: 1,
  }),
  talentPoints: Object.freeze({ firstLevel: 3, perLevel: 1, unlockCost: 1 }),
  currency: Object.freeze({
    maximumBalance: 9999999,
    maximumLifetimeEarned: 99999999,
    rarityOrder: CELESTIAL_STAR_RARITY_ORDER,
    pointsByRarity: STAR_POINT_YIELDS,
  }),
  branches: CELESTIAL_TALENT_BRANCHES,
});

export const CELESTIAL_TALENT_NODES_BY_ID = Object.freeze(Object.fromEntries(
  CELESTIAL_TALENT_BRANCHES.flatMap(
    branch => branch.nodes.map(node => [node.id, node]),
  ),
));

export function getCelestialTalentPrerequisiteState(node, purchasedSource) {
  const purchased = purchasedSource instanceof Set
    ? purchasedSource
    : new Set(Array.isArray(purchasedSource) ? purchasedSource : []);
  const prerequisiteIds = node?.prerequisiteIds || [];
  const purchasedPrerequisiteIds = prerequisiteIds.filter(id => purchased.has(id));
  const mode = node?.prerequisiteMode === "any" ? "any" : "all";
  const satisfied = prerequisiteIds.length === 0
    || (mode === "any"
      ? purchasedPrerequisiteIds.length > 0
      : purchasedPrerequisiteIds.length === prerequisiteIds.length);
  return Object.freeze({
    mode,
    satisfied,
    purchasedPrerequisiteIds: Object.freeze(purchasedPrerequisiteIds),
    missingPrerequisiteIds: Object.freeze(
      satisfied && mode === "any"
        ? []
        : prerequisiteIds.filter(id => !purchased.has(id)),
    ),
  });
}

export function getCelestialStarPointYield(rarity) {
  const id = Number.isInteger(rarity)
    ? CELESTIAL_STAR_RARITY_ORDER[rarity]
    : String(rarity || "").toLowerCase();
  return STAR_POINT_YIELDS[id] || 0;
}

export function getEarnedCelestialTalentPoints(playerLevel) {
  const level = boundedInteger(playerLevel, LEVEL_CONFIG.HARDCAP);
  const { firstLevel, perLevel } = CELESTIAL_TALENT_PROGRESSION_CONFIG.talentPoints;
  return Math.max(0, level - firstLevel + 1) * perLevel;
}

function boundedInteger(value, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(maximum, Math.floor(number)));
}

function requestedNodeIds(source) {
  const requested = new Set(
    [source.purchasedNodeIds, source.purchasedNodes, source.unlockedNodeIds, source.unlockedNodes]
      .find(Array.isArray) || [],
  );
  const legacyEngines = Array.isArray(source.unlockedEngines)
    ? source.unlockedEngines
    : [];
  for (const branch of CELESTIAL_TALENT_BRANCHES) {
    if (legacyEngines.includes(branch.id)) requested.add(branch.rootNodeId);
  }
  return requested;
}

function acceptRequestedGraph(requested) {
  const accepted = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const branch of CELESTIAL_TALENT_BRANCHES) {
      for (const node of branch.nodes) {
        if (!requested.has(node.id) || accepted.has(node.id)) continue;
        if (!getCelestialTalentPrerequisiteState(node, accepted).satisfied) continue;
        accepted.add(node.id);
        changed = true;
      }
    }
  }
  return CELESTIAL_TALENT_BRANCHES.flatMap(branch => branch.nodes)
    .filter(node => accepted.has(node.id))
    .map(node => node.id);
}

export function sanitizeCelestialTalentProgressionData(data) {
  const source = data?.celestialTalents && typeof data.celestialTalents === "object"
    ? data.celestialTalents
    : data && typeof data === "object" ? data : {};
  const purchasedNodeIds = acceptRequestedGraph(requestedNodeIds(source));
  const legacy = Number(source.version || 0) < CELESTIAL_TALENT_PROGRESSION_CONFIG.saveVersion;
  const nodeRanks = Object.fromEntries(purchasedNodeIds.map(nodeId => [
    nodeId,
    legacy
      ? (CELESTIAL_TALENT_NODES_BY_ID[nodeId].starsCost > 0
        ? CELESTIAL_TALENT_RANK_CONFIG.legacyPaidRank : 1)
      : getCelestialTalentRank(source.nodeRanks?.[nodeId]),
  ]));
  const currency = source.currency && typeof source.currency === "object"
    ? source.currency
    : {};
  const stars = boundedInteger(
    source.stars ?? source.starPoints ?? currency.stars,
    CELESTIAL_TALENT_PROGRESSION_CONFIG.currency.maximumBalance,
  );
  const configuredSpend = purchasedNodeIds.reduce(
    (total, nodeId) => total + (legacy ? CELESTIAL_TALENT_NODES_BY_ID[nodeId].starsCost : 0),
    0,
  );
  const spentStars = Math.max(
    configuredSpend,
    boundedInteger(
      source.spentStars,
      CELESTIAL_TALENT_PROGRESSION_CONFIG.currency.maximumLifetimeEarned,
    ),
  );
  const lifetimeStarsEarned = Math.max(
    stars + spentStars,
    boundedInteger(
      source.lifetimeStarsEarned ?? source.totalStarsEarned,
      CELESTIAL_TALENT_PROGRESSION_CONFIG.currency.maximumLifetimeEarned,
    ),
  );

  return {
    version: CELESTIAL_TALENT_PROGRESSION_CONFIG.saveVersion,
    stars,
    spentStars,
    lifetimeStarsEarned: Math.min(
      CELESTIAL_TALENT_PROGRESSION_CONFIG.currency.maximumLifetimeEarned,
      lifetimeStarsEarned,
    ),
    purchasedNodeIds,
    nodeRanks,
    // Old unlocks are grandfathered. Only new Talent Point purchases use this ledger.
    spentTalentPoints: legacy ? 0 : boundedInteger(source.spentTalentPoints, purchasedNodeIds.length),
  };
}
