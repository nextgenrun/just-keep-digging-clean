import { getConstellationRelicRequirement } from "../../values/ancientRelics.js";
import {
  CONSTELLATION_ABILITY_PREREQUISITES,
} from "../../values/constellationBuffs.js";
import { UI_COLORS } from "../../values/uiColors.js";
import {
  STARLIGHT_TALENT_RESOURCE_ORDER,
  STARLIGHT_TALENT_TREE_CONFIG,
} from "../../values/starlightTalentTree.js";

const BRANCH_BY_RESOURCE = Object.freeze(Object.fromEntries(
  STARLIGHT_TALENT_TREE_CONFIG.branches.flatMap(branch => (
    branch.resourceTypes.map(resourceType => [resourceType, branch])
  )),
));

function cssColor(color) {
  return `#${Number(color || 0x87ceeb).toString(16).padStart(6, "0").toUpperCase()}`;
}

function readUnlock(abilities, methodName, godMode) {
  if (godMode) return true;
  if (typeof abilities?.[methodName] !== "function") return false;
  return abilities[methodName]() === true;
}

export function readStarlightAbilityAccess(abilities) {
  const godMode = abilities?.isGodModeActive?.() === true;
  const access = {
    providerReady: true,
    godMode,
  };
  for (const branch of STARLIGHT_TALENT_TREE_CONFIG.branches) {
    const prerequisite = CONSTELLATION_ABILITY_PREREQUISITES[branch.id];
    const providerReady = typeof abilities?.[prerequisite?.unlockMethod] === "function";
    access.providerReady = access.providerReady && providerReady;
    access[branch.id] = {
      ...prerequisite,
      prerequisiteLabel: branch.prerequisiteLabel,
      providerReady,
      unlocked: readUnlock(abilities, prerequisite?.unlockMethod, godMode),
    };
  }
  return access;
}

export function buildStarlightTalentStatuses({
  data = {},
  counts = {},
  unlockedResources = [],
  relicCount = 0,
  abilities = null,
} = {}) {
  const unlocked = new Set(unlockedResources);
  const abilityAccess = readStarlightAbilityAccess(abilities);
  const statuses = Object.fromEntries(
    STARLIGHT_TALENT_RESOURCE_ORDER.map(resourceType => {
      const branch = BRANCH_BY_RESOURCE[resourceType];
      const access = abilityAccess[branch.id];
      const threshold = data.thresholds?.[resourceType] ?? 5;
      const collected = Math.min(threshold, Math.max(0, counts[resourceType] || 0));
      const isUnlocked = unlocked.has(resourceType);
      const abilityLocked = access.unlocked !== true;
      const baseState = isUnlocked ? "mastered" : collected > 0 ? "partial" : "locked";
      const state = abilityLocked ? "ability-locked" : baseState;
      const relicRequired = getConstellationRelicRequirement(resourceType);
      const sourceLineColor = data.lineColors?.[resourceType] || 0x87ceeb;
      const lineColor = abilityLocked ? UI_COLORS.borderBad : sourceLineColor;
      return [resourceType, {
        resourceType,
        abilityId: branch.id,
        abilityName: access.abilityName,
        abilityUnlocked: access.unlocked,
        abilityLocked,
        prerequisiteLabel: access.prerequisiteLabel,
        threshold,
        collected,
        isUnlocked,
        rewardActive: isUnlocked && !abilityLocked,
        progressBanked: abilityLocked && collected > 0,
        hasAny: collected > 0,
        relicRequired,
        relicCount,
        relicReady: relicCount >= relicRequired,
        baseState,
        state,
        lineColor,
        cssColor: cssColor(lineColor),
        shortLabel: abilityLocked
          ? STARLIGHT_TALENT_TREE_CONFIG.copy.boboLocked
          : isUnlocked
            ? STARLIGHT_TALENT_TREE_CONFIG.copy.mastered
            : collected > 0
              ? `${collected} / ${threshold}`
              : STARLIGHT_TALENT_TREE_CONFIG.copy.locked,
        statusColor: abilityLocked
          ? UI_COLORS.danger
          : isUnlocked
            ? UI_COLORS.success
            : collected > 0
              ? "#DDE7FF"
              : UI_COLORS.dim,
      }];
    }),
  );
  return { abilityAccess, statuses };
}
