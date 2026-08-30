// Canonical save envelope for Stars, Celestial talents, and actionbar ordering.

import {
  CELESTIAL_ACTION_BAR_CONFIG,
  sanitizeCelestialActionBarOrder,
} from "./celestialActionBar.js";
import {
  sanitizeCelestialTalentProgressionData,
} from "./celestialTalentProgression.js";

export const CELESTIAL_OVERHAUL_SAVE_CONFIG = Object.freeze({
  version: 1,
  legacyRarityMigrationVersion: 1,
});

export function sanitizeCelestialOverhaulData(value) {
  const source = value && typeof value === "object" ? value : {};
  const talentSource = source.talents
    || source.progression
    || source.celestialTalents
    || null;
  const actionbarSource = source.actionbar && typeof source.actionbar === "object"
    ? source.actionbar
    : {};
  const requestedOrder = actionbarSource.order
    || source.actionbarOrder
    || source.loadout
    || null;
  const migrationVersion = Math.max(0, Math.min(
    CELESTIAL_OVERHAUL_SAVE_CONFIG.legacyRarityMigrationVersion,
    Math.floor(Number(
      source.legacyRarityMigrationVersion
      ?? source.migrations?.legacyRarityCounts
      ?? 0,
    ) || 0),
  ));

  return {
    version: CELESTIAL_OVERHAUL_SAVE_CONFIG.version,
    talents: sanitizeCelestialTalentProgressionData(talentSource),
    actionbar: {
      version: CELESTIAL_ACTION_BAR_CONFIG.saveVersion,
      order: sanitizeCelestialActionBarOrder(requestedOrder),
    },
    legacyRarityMigrationVersion: migrationVersion,
  };
}

export function createCelestialOverhaulSaveData({
  talents = null,
  actionbarOrder = null,
  legacyRarityMigrationVersion = 0,
} = {}) {
  return sanitizeCelestialOverhaulData({
    version: CELESTIAL_OVERHAUL_SAVE_CONFIG.version,
    talents,
    actionbar: { order: actionbarOrder },
    legacyRarityMigrationVersion,
  });
}
