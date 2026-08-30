// Routes image-backed actionbar entries into existing gameplay authorities.

import {
  CELESTIAL_ACTION_BAR_ENTRY_IDS,
  getCelestialActionBarEntry,
} from "../../values/celestialActionBar.js";
import { CELESTIAL_ENGINE_CONFIG } from "../../values/celestialEngines.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { describeCelestialTalentAvailability } from
  "../../values/celestialTalentTreeUi.js";

const ENGINE_IDS = new Set([
  CELESTIAL_ACTION_BAR_ENTRY_IDS.WAYWARD_STAR,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.HOLLOW_SUN,
  CELESTIAL_ACTION_BAR_ENTRY_IDS.COMET_ENGINE,
]);

function gpState(abilities, cost, godMode = false, context = {}) {
  const current = Math.max(0, Number(abilities?.getGemPowerExact?.()) || 0);
  const required = Math.max(0, Number(cost) || 0);
  const spendableValue = Number(abilities?.getSpendableGemPower?.(context));
  const hasSpendableValue = Number.isFinite(spendableValue);
  const spendable = hasSpendableValue ? Math.max(0, spendableValue) : current;
  const available = godMode || (
    typeof abilities?.canSpendGemPower === "function"
      ? abilities.canSpendGemPower(required, context) === true
      : spendable >= required
  );
  return {
    available,
    unavailableReason: godMode ? "" : "Requires " + required + " GP. Current GP: "
      + Math.floor(current) + (hasSpendableValue
        ? ". Spendable GP: " + Math.floor(spendable) + "."
        : "."),
  };
}

function gpDescription(entryId, cost) {
  const description = getCelestialActionBarEntry(entryId)?.description || "Activate ability.";
  return `${description} Costs ${Math.max(0, Number(cost) || 0)} GP.`;
}

function getEngineState(scene, entryId) {
  const abilities = scene.playerController?.abilities;
  const talents = scene.celestialTalentProgressionSystem?.getSnapshot?.();
  const branch = talents?.branches?.find(current => current.id === entryId);
  const root = branch?.nodes?.[0];
  const heart = scene.starHeartProgressionSystem?.getSnapshot?.();
  const godMode = scene.upgradeSystem?.godModeActive === true || heart?.godMode === true;
  const gpCost = CELESTIAL_ENGINE_CONFIG.activation.gpCost;
  const gp = gpState(abilities, gpCost, godMode, {
    source: "celestial-engine",
    abilityId: entryId,
  });
  const unlocked = godMode || talents?.unlockedAbilityIds?.includes?.(entryId) === true;
  const active = scene.celestialEngineController?.isEngineActive?.(entryId) === true;
  const runtimeAvailable = scene.celestialEngineController?.isActivationAvailable?.() === true;
  let unavailableReason = "";
  if (!unlocked) unavailableReason = "Unlock this Engine at the Star Pillar.";
  else if (active) unavailableReason = "This Celestial power is already active.";
  else if (!runtimeAvailable) unavailableReason = "Celestial power runtime is busy.";
  else if (!gp.available) unavailableReason = gp.unavailableReason;
  return {
    unlocked,
    active,
    available: unlocked && runtimeAvailable && gp.available,
    description: gpDescription(entryId, godMode ? 0 : gpCost),
    unlockCondition: root
      ? "Star Pillar: " + describeCelestialTalentAvailability(root)
      : "Reach Level 3 and visit the Star Pillar.",
    unavailableReason,
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
      description: gpDescription(entryId, cost),
      unlockCondition: "Buy Quick Slash from Bobo.",
      ...gpState(abilities, cost, godMode, { source: "quickslash" }),
    };
  }
  if (entryId === CELESTIAL_ACTION_BAR_ENTRY_IDS.THUNDER_STRIKE) {
    const unlocked = abilities?.isThunderStrikeUnlocked?.() === true;
    const cost = abilities?.getThunderStrikeCost?.() || 0;
    const charging = abilities?.isThunderStrikeCharging?.() === true;
    const chainActive = scene.thunderStrikeActionRuntime?.isAnimating === true;
    const active = charging || chainActive;
    return {
      unlocked,
      active,
      description: gpDescription(entryId, cost),
      unlockCondition: "Buy Thunder Strike from Bobo.",
      ...(active
        ? { available: true, unavailableReason: "" }
        : gpState(abilities, cost, godMode, { source: "thunderStrike" })),
    };
  }
  if (entryId === CELESTIAL_ACTION_BAR_ENTRY_IDS.CAMPFIRE) {
    return scene.campfireSystem?.getActionBarState?.() || {
      unlocked: true,
      available: false,
      active: false,
      quantity: 0,
      unavailableReason: "Campfire is not ready.",
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
  if (entryId === CELESTIAL_ACTION_BAR_ENTRY_IDS.CAMPFIRE) {
    return scene.campfireSystem?.consumeSelectedBuff?.("actionbar")
      || { ok: false, reason: "missing-campfire-system" };
  }
  if (ENGINE_IDS.has(entryId)) {
    return scene.celestialEngineController?.activateEngine?.(entryId)
      || { ok: false, reason: "missing-engine-controller" };
  }
  return { ok: false, reason: "unknown-ability" };
}
