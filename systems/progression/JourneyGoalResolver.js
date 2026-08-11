import { JOURNEY_CONFIG } from "../../values/journeyConfig.js";
import { JOURNEY_PROGRESSION_GRAPH } from "../../values/progressionGraph.js";
import {
  GAMEPLAY_FEATURE_IDS,
  isGameplayFeatureEnabled,
} from "../../values/gameplayDevFlags.js";

const LEVEL_TWO_GOAL_KINDS = new Set([
  "worldTwoKey",
  "heavenblockDiscovery",
  "heavenblockInstallation",
]);
const ARC_CORE_GOAL_KINDS = new Set([
  "arcCoreForge",
  "omegaVaults",
  "omegaArcCoreForge",
]);

function isJourneyNodeEnabled(node) {
  if (LEVEL_TWO_GOAL_KINDS.has(node.kind)) {
    return isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.LEVEL_TWO);
  }
  if (ARC_CORE_GOAL_KINDS.has(node.kind)) {
    return isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.ARC_CORES);
  }
  return true;
}

function number(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}
function hasUpgrade(progress, upgradeId) {
  return number(progress?.upgradeLevels?.[upgradeId]) > 0;
}

function hasGate(progress, threshold) {
  return Array.isArray(progress?.acceptedDepthGates)
    && progress.acceptedDepthGates.includes(threshold);
}

function goal(node, title, detail, current, target) {
  const safeTarget = Math.max(1, number(target, 1));
  return {
    id: node.id,
    title,
    detail,
    connection: node.connection,
    current: Math.max(0, Math.min(safeTarget, number(current))),
    target: safeTarget,
  };
}

function resolveDepthGate(node, progress) {
  if (hasGate(progress, node.target)) return null;
  if (node.requiresAcceptedGate && !hasGate(progress, node.requiresAcceptedGate)) return null;
  const bestDepth = Math.max(0, number(progress.bestDepth));
  if (bestDepth >= node.target) {
    return goal(
      node,
      `Confirm the ${node.target}m depth gate`,
      "Accept the warning to make the next progression layer available.",
      1,
      1,
    );
  }
  return goal(
    node,
    `Reach ${node.target}m`,
    "Use permanent town upgrades and return routes to push this descent.",
    bestDepth,
    node.target,
  );
}

function resolveWorldTwoKey(node, progress) {
  if (!hasGate(progress, node.requiresAcceptedGate)) return null;
  if (hasUpgrade(progress, "worldTwoTunnelAccess")) return null;
  const total = Math.max(1, number(progress.worldTwoRequirementCount, 1));
  const met = Math.max(0, number(progress.worldTwoRequirementsMet));
  return goal(
    node,
    met >= total ? "Buy the World Two Tunnel Key" : "Prepare the World Two Tunnel Key",
    met >= total
      ? "All requirements are ready. Buy the key from Bobo."
      : `Next missing requirement: ${progress.worldTwoNextRequirement || "deep materials"}.`,
    met,
    total,
  );
}

function resolvePrimaryGoal(node, progress) {
  if (node.kind === "depthGate") return resolveDepthGate(node, progress);
  if (node.kind === "worldTwoKey") return resolveWorldTwoKey(node, progress);

  if (node.requiresUpgrade && !hasUpgrade(progress, node.requiresUpgrade)) return null;
  if (
    node.requiresDiscoveredParts
    && number(progress.discoveredHeavenblockParts) < node.requiresDiscoveredParts
  ) return null;
  if (
    node.requiresInstalledParts
    && number(progress.installedHeavenblockParts) < node.requiresInstalledParts
  ) return null;
  if (
    node.requiresOpenedVaults
    && number(progress.openedArcVaults) < node.requiresOpenedVaults
  ) return null;

  switch (node.kind) {
    case "heavenblockDiscovery": {
      const count = number(progress.discoveredHeavenblockParts);
      if (count >= node.target) return null;
      return goal(
        node,
        "Recover the three Heavenblock parts",
        "Complete the World Two regions; each region supplies one unique Forge part.",
        count,
        node.target,
      );
    }
    case "heavenblockInstallation": {
      const count = number(progress.installedHeavenblockParts);
      if (count >= node.target) return null;
      return goal(
        node,
        "Install the Heavenblock parts",
        "Bring discovered parts to their machine slots before using the Arc Forge.",
        count,
        node.target,
      );
    }
    case "arcCoreForge": {
      if (hasUpgrade(progress, "arcCoreVehicle")) return null;
      const status = progress.arcCoreForge || {};
      return goal(
        node,
        status.ready ? "Forge the Arc Core" : "Prepare the Arc Core",
        status.ready
          ? "All systems agree. Return to the Molten Arc Forge."
          : `Next missing requirement: ${status.nextRequirement || "Forge materials"}.`,
        status.met || 0,
        status.total || 1,
      );
    }
    case "omegaVaults": {
      const count = number(progress.openedArcVaults);
      if (count >= node.target) return null;
      return goal(
        node,
        "Reopen the three Arc Vaults",
        "Use the Arc Core to reach each vault and assemble the Zenith Keystone.",
        count,
        node.target,
      );
    }
    case "omegaArcCoreForge": {
      if (hasUpgrade(progress, "omegaArcCoreVehicle")) return null;
      const status = progress.omegaArcCoreForge || {};
      return goal(
        node,
        status.ready ? "Forge the Omega Arc Core" : "Prepare the Omega Arc Core",
        status.ready
          ? "The Zenith craft is ready at the Molten Arc Forge."
          : `Next missing requirement: ${status.nextRequirement || "deep relics and materials"}.`,
        status.met || 0,
        status.total || 1,
      );
    }
    default:
      return null;
  }
}

function resolveSupportGoal(node, progress) {
  switch (node.kind) {
    case "permanentUpgrade": {
      const count = number(progress.ownedUpgradeCount);
      if (count >= node.target) return null;
      return goal(
        node,
        "Choose a permanent town upgrade",
        "Sell mined resources, then invest the money in a visible build stat.",
        count,
        node.target,
      );
    }
    case "returnRoute": {
      if (number(progress.bestDepth) < node.minimumDepth) return null;
      const count = Array.isArray(progress.portalLabels) ? progress.portalLabels.length : 0;
      if (count >= node.target) return null;
      return goal(
        node,
        "Activate a return portal",
        "Activate a portal tile underground to create a reusable Sky Island route.",
        count,
        node.target,
      );
    }
    case "campfireTier": {
      if (number(progress.bestDepth) < node.minimumDepth) return null;
      const level = number(progress.campfireLevel, 1);
      if (level >= node.target) return null;
      return goal(
        node,
        "Improve the campfire",
        "Spend town earnings on a stronger blessing for the next descent.",
        level,
        node.target,
      );
    }
    case "constellation": {
      if (number(progress.starsCollected) < node.minimumStars) return null;
      const count = number(progress.constellationCount);
      if (count >= node.target) return null;
      return goal(
        node,
        "Turn stars into a constellation",
        "Use the Star Pillar so collected stars become a permanent ability buff.",
        count,
        node.target,
      );
    }
    case "titanClue": {
      if (!progress.activeTitanName || progress.activeTitanDiscovered) return null;
      return goal(
        node,
        `Follow the ${progress.activeTitanName} clue`,
        "The active trail is explained in the Titans tab and resolves into a discovery.",
        0,
        1,
      );
    }
    default:
      return null;
  }
}

export function resolveJourneyGoals(snapshot) {
  const progress = snapshot?.progress || {};
  const primary = JOURNEY_PROGRESSION_GRAPH
    .filter(node => node.lane === "primary" && isJourneyNodeEnabled(node))
    .map(node => resolvePrimaryGoal(node, progress))
    .find(Boolean);
  const support = JOURNEY_PROGRESSION_GRAPH
    .filter(node => node.lane === "support" && isJourneyNodeEnabled(node))
    .map(node => ({ node, goal: resolveSupportGoal(node, progress) }))
    .filter(entry => entry.goal)
    .sort((a, b) => number(b.node.priority) - number(a.node.priority))
    .map(entry => entry.goal);
  return [primary, ...support]
    .filter(Boolean)
    .slice(0, JOURNEY_CONFIG.maxVisibleGoals);
}
