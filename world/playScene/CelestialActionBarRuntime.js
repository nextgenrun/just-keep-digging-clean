// Routes image-backed actionbar entries into existing gameplay authorities.

import {
  CELESTIAL_ACTION_BAR_ENTRY_IDS,
} from "../../values/celestialActionBar.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { describeCelestialTalentAvailability } from
  "../../values/celestialTalentTreeUi.js";

const ENGINE_IDS = new Set([
  CELESTIAL_ACTION_BAR_ENTRY_IDS.WAYWARD_STAR,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.HOLLOW_SUN,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.COMET_ENGINE,
]);

function gpState(abilities, cost, godMode = false) {
  const current = Math.max(0, Number(abilities?.getGemPowerExact?.()) || 0);
  const required = Math.max(0, Number(cost) || 0);
  return {
    available: godMode || current >= required,
    unavailableReason: godMode ? "" : "Requires " + required + " GP. Current GP: "
      + Math.floor(current) + ".",
  };
}

function getEngineState(scene, entryId) {
  const talents = scene.celestialTalentProgressionSystem?.getSnapshot?.();
  const branch = talents?.branches?.find(current => current.id === entryId);
  const root = branch?.nodes?.[0];
  const godMode = scene.upgradeSystem?.godModeActive === true
    || scene.starHeartProgressionSystem?.getSnapshot?.()?.godMode === true;
  const unlocked = godMode || talents?.unlockedAbilityIds?.includes?.(entryId) === true;
  const active = scene.celestialEngineController?.isEngineActive?.(entryId) === true;
  const waywardRedirect = entryId === CELESTIAL_ACTION_BAR_ENTRY_IDS.WAYWARD_STAR
    && active;
  const runtimeAvailable = scene.celestialEngineController?.isActivationAvailable?.() === true;
  return {
    unlocked,
    active,
    available: unlocked && (waywardRedirect || runtimeAvailable),
    unlockCondition: root
      ? "Star Pillar: " + describeCelestialTalentAvailability(root)
      : "Reach Level 3 and visit the Star Pillar.",
    unavailableReason: active && !waywardRedirect
      ? "Another Celestial Engine is active."
      : "Celestial Engine runtime is busy.",
  };
}

export function getCelestialActionBarAbilityState(scene, entryId) {
  const abilities = scene.playerController?.abilities;
  const godMode = scene.upgradeSystem?.godModeActive === true;
  if (entryId === CELESTIAL_ACTION_BAR_ENTRY_IDS.QUICK_SLASH) {
    const unlocked = abilities?.isQuickslashUnlocked?.() === true;
    const cost = abilities?.getQuickslashCost?.() || 0;
    return {
      unlocked,
      active: abilities?.isQuickslashActive?.() === true,
      unlockCondition: "Buy Quick Slash from Bobo.",
      ...gpState(abilities, cost, godMode),
    };
  }
  if (entryId === CELESTIAL_ACTION_BAR_ENTRY_IDS.THUNDER_STRIKE) {
    const unlocked = abilities?.isThunderStrikeUnlocked?.() === true;
    const cost = abilities?.getThunderStrikeCost?.() || 0;
    const charging = abilities?.isThunderStrikeCharging?.() === true;
    return {
      unlocked,
      active: charging,
      unlockCondition: "Buy Thunder Strike from Bobo.",
      ...(charging
        ? { available: true, unavailableReason: "" }
        : gpState(abilities, cost, godMode)),
    };
  }
  if (ENGINE_IDS.has(entryId)) return getEngineState(scene, entryId);
  return {
    unlocked: false,
    available: false,
    unlockCondition: "Unknown ability.",
  };
}

export function getCelestialActionBarMetrics(scene) {
  const abilities = scene.playerController?.abilities;
  return Object.freeze({
    gpCurrent: Math.max(0, Number(abilities?.getGemPowerExact?.()) || 0),
    gpMax: Math.max(0, Number(abilities?.getGemPowerMax?.()) || 0),
    miningDamage: Math.max(
      0,
      Number(scene.digSystem?.getDamagePreview?.(TILE_TYPES.DIRT)) || 0,
    ),
  });
}

export function activateCelestialActionBarEntry(scene, entryId) {
  if (entryId === CELESTIAL_ACTION_BAR_ENTRY_IDS.QUICK_SLASH) {
    const queued = scene.playerController?.input?.queueQuickslashInput?.() === true;
    return {
      ok: queued,
      reason: queued ? null : "input-unavailable",
      abilityId: entryId,
    };
  }
  if (entryId === CELESTIAL_ACTION_BAR_ENTRY_IDS.THUNDER_STRIKE) {
    const queued = scene.playerController?.input?.queueThunderStrikeInput?.() === true;
    return {
      ok: queued,
      reason: queued ? null : "input-unavailable",
      abilityId: entryId,
    };
  }
  if (ENGINE_IDS.has(entryId)) {
    return scene.celestialEngineController?.activateEngine?.(entryId)
      || { ok: false, reason: "missing-engine-controller" };
  }
  return { ok: false, reason: "unknown-ability" };
}
