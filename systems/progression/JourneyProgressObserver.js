import {
  JOURNEY_CONFIG,
  JOURNEY_EVENT_TYPES,
} from "../../values/journeyConfig.js";
import { JOURNEY_DEPTH_MILESTONES } from "../../values/progressionGraph.js";

function number(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}
function stringSet(values) {
  return new Set(Array.isArray(values) ? values.map(value => String(value)) : []);
}

function crossed(previous, current, target) {
  return number(previous) < target && number(current) >= target;
}

export function observeJourneyProgress(previous, current, ledger) {
  let changed = false;
  const before = previous?.progress || {};
  const after = current?.progress || {};
  const record = data => {
    if (ledger?.record?.(data)) changed = true;
  };

  JOURNEY_DEPTH_MILESTONES.forEach(target => {
    if (!crossed(before.bestDepth, after.bestDepth, target)) return;
    record({
      type: JOURNEY_EVENT_TYPES.DEPTH,
      title: `${JOURNEY_CONFIG.eventCopy.depthTitle}: ${target}m`,
      detail: JOURNEY_CONFIG.eventCopy.depthDetail,
      source: `depth-${target}`,
      before: number(before.bestDepth),
      after: target,
      unit: "m",
    });
  });

  const oldGates = stringSet(before.acceptedDepthGates);
  stringSet(after.acceptedDepthGates).forEach(gate => {
    if (oldGates.has(gate)) return;
    record({
      type: JOURNEY_EVENT_TYPES.DEPTH_GATE,
      title: `${JOURNEY_CONFIG.eventCopy.gateTitle}: ${gate}m`,
      detail: JOURNEY_CONFIG.eventCopy.gateDetail,
      source: `gate-${gate}`,
      before: 0,
      after: 1,
      unit: "accepted",
    });
  });

  const oldPortals = stringSet(before.portalLabels);
  stringSet(after.portalLabels).forEach(label => {
    if (oldPortals.has(label)) return;
    record({
      type: JOURNEY_EVENT_TYPES.PORTAL,
      title: `${JOURNEY_CONFIG.eventCopy.portalTitle}: ${label}`,
      detail: JOURNEY_CONFIG.eventCopy.portalDetail,
      source: label,
      before: oldPortals.size,
      after: oldPortals.size + 1,
      unit: "routes",
    });
  });

  if (number(after.campfireLevel, 1) > number(before.campfireLevel, 1)) {
    record({
      type: JOURNEY_EVENT_TYPES.CAMPFIRE,
      title: JOURNEY_CONFIG.eventCopy.campfireTitle,
      detail: JOURNEY_CONFIG.eventCopy.campfireDetail,
      source: "campfire",
      before: number(before.campfireLevel, 1),
      after: number(after.campfireLevel, 1),
      unit: "tier",
    });
  }

  if (number(after.ancientRelics) > number(before.ancientRelics)) {
    record({
      type: JOURNEY_EVENT_TYPES.RELIC,
      title: JOURNEY_CONFIG.eventCopy.relicTitle,
      detail: JOURNEY_CONFIG.eventCopy.relicDetail,
      source: "ancient-relic",
      before: number(before.ancientRelics),
      after: number(after.ancientRelics),
      unit: "relics",
    });
  }

  if (number(after.constellationCount) > number(before.constellationCount)) {
    record({
      type: JOURNEY_EVENT_TYPES.CONSTELLATION,
      title: JOURNEY_CONFIG.eventCopy.constellationTitle,
      detail: JOURNEY_CONFIG.eventCopy.constellationDetail,
      source: "constellation",
      before: number(before.constellationCount),
      after: number(after.constellationCount),
      unit: "unlocked",
    });
  }

  const oldParts = stringSet(before.installedHeavenblockPartIds);
  stringSet(after.installedHeavenblockPartIds).forEach(partId => {
    if (oldParts.has(partId)) return;
    record({
      type: JOURNEY_EVENT_TYPES.HEAVENBLOCK,
      title: `${JOURNEY_CONFIG.eventCopy.heavenblockTitle}: ${partId}`,
      detail: JOURNEY_CONFIG.eventCopy.heavenblockDetail,
      source: partId,
      before: oldParts.size,
      after: oldParts.size + 1,
      unit: "parts",
    });
  });

  const oldVaults = stringSet(before.openedArcVaultIds);
  stringSet(after.openedArcVaultIds).forEach(vaultId => {
    if (oldVaults.has(vaultId)) return;
    record({
      type: JOURNEY_EVENT_TYPES.HEAVENBLOCK,
      title: `${JOURNEY_CONFIG.eventCopy.vaultTitle}: ${vaultId}`,
      detail: JOURNEY_CONFIG.eventCopy.vaultDetail,
      source: vaultId,
      before: oldVaults.size,
      after: oldVaults.size + 1,
      unit: "vaults",
    });
  });

  const oldTitans = stringSet(before.discoveredTitanIds);
  stringSet(after.discoveredTitanIds).forEach(titanId => {
    if (oldTitans.has(titanId)) return;
    record({
      type: JOURNEY_EVENT_TYPES.TITAN,
      title: `${JOURNEY_CONFIG.eventCopy.titanTitle}: ${titanId}`,
      detail: JOURNEY_CONFIG.eventCopy.titanDetail,
      source: titanId,
      before: oldTitans.size,
      after: oldTitans.size + 1,
      unit: "found",
    });
  });

  JOURNEY_CONFIG.playerLevelMilestones.forEach(target => {
    if (!crossed(before.playerLevel, after.playerLevel, target)) return;
    record({
      type: JOURNEY_EVENT_TYPES.LEVEL,
      title: `${JOURNEY_CONFIG.eventCopy.levelTitle}: ${target}`,
      detail: JOURNEY_CONFIG.eventCopy.levelDetail,
      source: `level-${target}`,
      before: number(before.playerLevel, 1),
      after: target,
      unit: "level",
    });
  });
  return changed;
}
