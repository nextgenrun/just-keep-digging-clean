// ==================== CELESTIAL TALENT PROGRESSION ====================
// Save-safe Stars economy and three ability-first talent branches.

export const CELESTIAL_TALENT_BRANCH_IDS = Object.freeze({
  WAYWARD_STAR: "wayward-star",
  HOLLOW_SUN: "hollow-sun",
  COMET_ENGINE: "comet-engine",
});

export const CELESTIAL_STAR_RARITY_ORDER = Object.freeze([
  "common",
  "uncommon",
  "rare",
  "epic",
  "mythic",
  "astral",
]);

const STAR_POINT_YIELDS = Object.freeze({
  common: 1,
  uncommon: 2,
  rare: 4,
  epic: 8,
  mythic: 15,
  astral: 30,
});

function talentNode(definition) {
  return Object.freeze({
    ...definition,
    prerequisiteIds: Object.freeze([...(definition.prerequisiteIds || [])]),
  });
}

function talentBranch(id, name, nodes) {
  return Object.freeze({
    id,
    name,
    rootNodeId: nodes[0].id,
    nodes: Object.freeze(nodes),
  });
}

const WAYWARD_STAR_NODES = [
  talentNode({
    id: "wayward-star-root", branchId: "wayward-star", tier: 0, kind: "ability",
    name: "Wayward Star", abilityId: "wayward-star", requiredLevel: 20, starsCost: 0,
    effectId: "unlock-wayward-star", description: "Unlock the Wayward Star ability.",
  }),
  talentNode({
    id: "wayward-ricochet-matrix", branchId: "wayward-star", tier: 1, kind: "upgrade",
    name: "Ricochet Matrix", requiredLevel: 24, starsCost: 50,
    prerequisiteIds: ["wayward-star-root"], effectId: "wayward-extra-bounces",
    description: "Strengthen the bounded ricochet route.",
  }),
  talentNode({
    id: "wayward-vector-command", branchId: "wayward-star", tier: 2, kind: "upgrade",
    name: "Vector Command", requiredLevel: 28, starsCost: 75,
    prerequisiteIds: ["wayward-ricochet-matrix"], effectId: "wayward-extra-redirect",
    description: "Add one controlled redirection opportunity.",
  }),
  talentNode({
    id: "wayward-impact-lattice", branchId: "wayward-star", tier: 3, kind: "upgrade",
    name: "Impact Lattice", requiredLevel: 32, starsCost: 100,
    prerequisiteIds: ["wayward-vector-command"], effectId: "wayward-impact-capacity",
    description: "Extend the capped impact budget.",
  }),
  talentNode({
    id: "wayward-supernova-core", branchId: "wayward-star", tier: 4, kind: "capstone",
    name: "Supernova Core", requiredLevel: 36, starsCost: 150,
    prerequisiteIds: ["wayward-impact-lattice"], effectId: "wayward-supernova-mastery",
    description: "Complete the branch and unlock another root choice.",
  }),
];

const HOLLOW_SUN_NODES = [
  talentNode({
    id: "hollow-sun-root", branchId: "hollow-sun", tier: 0, kind: "ability",
    name: "Hollow Sun", abilityId: "hollow-sun", requiredLevel: 20, starsCost: 0,
    effectId: "unlock-hollow-sun", description: "Unlock the Hollow Sun ability.",
  }),
  talentNode({
    id: "hollow-gravity-well", branchId: "hollow-sun", tier: 1, kind: "upgrade",
    name: "Gravity Well", requiredLevel: 24, starsCost: 50,
    prerequisiteIds: ["hollow-sun-root"], effectId: "hollow-pulse-radius",
    description: "Widen the bounded gravity pulse.",
  }),
  talentNode({
    id: "hollow-event-horizon", branchId: "hollow-sun", tier: 2, kind: "upgrade",
    name: "Event Horizon", requiredLevel: 28, starsCost: 75,
    prerequisiteIds: ["hollow-gravity-well"], effectId: "hollow-impact-capacity",
    description: "Increase the capped target budget.",
  }),
  talentNode({
    id: "hollow-collapse-cycle", branchId: "hollow-sun", tier: 3, kind: "upgrade",
    name: "Collapse Cycle", requiredLevel: 32, starsCost: 100,
    prerequisiteIds: ["hollow-event-horizon"], effectId: "hollow-pulse-tempo",
    description: "Tighten the three-pulse collapse cycle.",
  }),
  talentNode({
    id: "hollow-singularity-core", branchId: "hollow-sun", tier: 4, kind: "capstone",
    name: "Singularity Core", requiredLevel: 36, starsCost: 150,
    prerequisiteIds: ["hollow-collapse-cycle"], effectId: "hollow-implosion-mastery",
    description: "Complete the branch and unlock another root choice.",
  }),
];

const COMET_ENGINE_NODES = [
  talentNode({
    id: "comet-engine-root", branchId: "comet-engine", tier: 0, kind: "ability",
    name: "Comet Engine", abilityId: "comet-engine", requiredLevel: 20, starsCost: 0,
    effectId: "unlock-comet-engine", description: "Unlock the Comet Engine ability.",
  }),
  talentNode({
    id: "comet-bore-drive", branchId: "comet-engine", tier: 1, kind: "upgrade",
    name: "Bore Drive", requiredLevel: 24, starsCost: 50,
    prerequisiteIds: ["comet-engine-root"], effectId: "comet-travel-capacity",
    description: "Extend the protected, capped tunnel route.",
  }),
  talentNode({
    id: "comet-rider-plating", branchId: "comet-engine", tier: 2, kind: "upgrade",
    name: "Rider Plating", requiredLevel: 28, starsCost: 75,
    prerequisiteIds: ["comet-bore-drive"], effectId: "comet-ride-control",
    description: "Improve control during the bounded ride.",
  }),
  talentNode({
    id: "comet-impact-wake", branchId: "comet-engine", tier: 3, kind: "upgrade",
    name: "Impact Wake", requiredLevel: 32, starsCost: 100,
    prerequisiteIds: ["comet-rider-plating"], effectId: "comet-impact-capacity",
    description: "Increase the capped impact budget.",
  }),
  talentNode({
    id: "comet-zenith-drive", branchId: "comet-engine", tier: 4, kind: "capstone",
    name: "Zenith Drive", requiredLevel: 36, starsCost: 150,
    prerequisiteIds: ["comet-impact-wake"], effectId: "comet-drive-mastery",
    description: "Complete the branch and unlock another root choice.",
  }),
];

const BRANCHES = Object.freeze([
  talentBranch("wayward-star", "WAYWARD STAR", WAYWARD_STAR_NODES),
  talentBranch("hollow-sun", "HOLLOW SUN", HOLLOW_SUN_NODES),
  talentBranch("comet-engine", "COMET ENGINE", COMET_ENGINE_NODES),
]);

export const CELESTIAL_TALENT_PROGRESSION_CONFIG = Object.freeze({
  saveVersion: 1,
  access: Object.freeze({
    requiredPlayerLevel: 20,
    initialFreeRootSelections: 1,
    rootSelectionsPerCompletedBranch: 1,
  }),
  currency: Object.freeze({
    maximumBalance: 9999999,
    maximumLifetimeEarned: 99999999,
    rarityOrder: CELESTIAL_STAR_RARITY_ORDER,
    pointsByRarity: STAR_POINT_YIELDS,
  }),
  branches: BRANCHES,
});

export const CELESTIAL_TALENT_NODES_BY_ID = Object.freeze(Object.fromEntries(
  BRANCHES.flatMap(branch => branch.nodes.map(node => [node.id, node])),
));

export function getCelestialStarPointYield(rarity) {
  const id = Number.isInteger(rarity)
    ? CELESTIAL_STAR_RARITY_ORDER[rarity]
    : String(rarity || "").toLowerCase();
  return STAR_POINT_YIELDS[id] || 0;
}

function boundedInteger(value, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(maximum, Math.floor(number)));
}

export function sanitizeCelestialTalentProgressionData(data) {
  const source = data?.celestialTalents && typeof data.celestialTalents === "object"
    ? data.celestialTalents
    : data && typeof data === "object" ? data : {};
  const requestedNodes = new Set(
    [source.purchasedNodeIds, source.purchasedNodes, source.unlockedNodeIds, source.unlockedNodes]
      .find(Array.isArray) || [],
  );
  const legacyEngines = Array.isArray(source.unlockedEngines) ? source.unlockedEngines : [];
  for (const branch of BRANCHES) {
    if (legacyEngines.includes(branch.id)) requestedNodes.add(branch.rootNodeId);
  }

  const purchasedNodeIds = [];
  const accepted = new Set();
  for (const branch of BRANCHES) {
    for (const node of branch.nodes) {
      if (!requestedNodes.has(node.id)) continue;
      if (node.prerequisiteIds.every(id => accepted.has(id))) {
        purchasedNodeIds.push(node.id);
        accepted.add(node.id);
      }
    }
  }

  const currency = source.currency && typeof source.currency === "object"
    ? source.currency
    : {};
  const stars = boundedInteger(
    source.stars ?? source.starPoints ?? currency.stars,
    CELESTIAL_TALENT_PROGRESSION_CONFIG.currency.maximumBalance,
  );
  const configuredSpend = purchasedNodeIds.reduce(
    (total, nodeId) => total + CELESTIAL_TALENT_NODES_BY_ID[nodeId].starsCost,
    0,
  );
  const spentStars = Math.max(
    configuredSpend,
    boundedInteger(source.spentStars, CELESTIAL_TALENT_PROGRESSION_CONFIG.currency.maximumLifetimeEarned),
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
  };
}
