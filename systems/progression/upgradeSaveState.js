import {
  UPGRADES,
  UPGRADE_PROGRESSION_VERSION,
} from "../../values/upgradeDefinitions.js";
import {
  getLegacyUpgradeEffect,
  getCompressedV2UpgradeEffect,
  getUpgradeEffect,
} from "../../values/upgradeFormulas.js";

function normalizeStoredLevel(value) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function clampUpgradeLevel(upgradeId, value) {
  const upgrade = UPGRADES[upgradeId];
  if (!upgrade) return 0;
  const level = normalizeStoredLevel(value);
  if (upgrade.oneTimePurchase) return Math.min(1, level);
  if (Number.isFinite(upgrade.maxLevel)) {
    return Math.min(upgrade.maxLevel, level);
  }
  return level;
}

export function migrateLegacyUpgradeLevel(upgradeId, value) {
  const upgrade = UPGRADES[upgradeId];
  const legacyLevel = normalizeStoredLevel(value);
  if (!upgrade || legacyLevel === 0) return 0;
  if (!upgrade.legacyEffect || !upgrade.legacyMaxLevel || !upgrade.maxLevel) {
    return clampUpgradeLevel(upgradeId, legacyLevel);
  }

  return migrateEffectToRank(upgradeId, getLegacyUpgradeEffect(upgradeId, legacyLevel));
}

function migrateEffectToRank(upgradeId, legacyEffect) {
  const upgrade = UPGRADES[upgradeId];
  for (let level = 1; level <= upgrade.maxLevel; level += 1) {
    if (getUpgradeEffect(upgradeId, level) + Number.EPSILON * Math.max(1, legacyEffect) >= legacyEffect) {
      return level;
    }
  }
  return upgrade.maxLevel;
}

export function migrateCompressedV2UpgradeLevel(upgradeId, value) {
  const upgrade = UPGRADES[upgradeId];
  const level = normalizeStoredLevel(value);
  if (!upgrade || level === 0) return 0;
  if (upgrade.oneTimePurchase || !upgrade.maxLevel) return clampUpgradeLevel(upgradeId, level);
  return migrateEffectToRank(upgradeId, getCompressedV2UpgradeEffect(upgradeId, level));
}

export function normalizeUpgradeLevels(levels, { legacy = false, compressedV2 = false } = {}) {
  const normalized = {};
  for (const upgradeId in UPGRADES) {
    normalized[upgradeId] = legacy
      ? migrateLegacyUpgradeLevel(upgradeId, levels?.[upgradeId])
      : compressedV2 ? migrateCompressedV2UpgradeLevel(upgradeId, levels?.[upgradeId])
        : clampUpgradeLevel(upgradeId, levels?.[upgradeId]);
  }
  return normalized;
}

export function resolveUpgradeSaveState(data) {
  if (!data?.upgradeLevels || typeof data.upgradeLevels !== "object") {
    return null;
  }

  const upgradeLevels = { ...data.upgradeLevels };
  // Saves created before the opening artifact always had Flight. Preserve
  // those players while allowing newer saves to persist an explicit zero.
  if (!Object.hasOwn(upgradeLevels, "gemPowerUnlock")) {
    upgradeLevels.gemPowerUnlock = 1;
  }

  const persistedVersion = Number(data.upgradeProgressionVersion);
  const legacy = !Number.isFinite(persistedVersion)
    || persistedVersion < 2;
  const compressedV2 = persistedVersion === 2 && persistedVersion < UPGRADE_PROGRESSION_VERSION;
  return {
    legacy,
    upgradeLevels: normalizeUpgradeLevels(upgradeLevels, { legacy, compressedV2 }),
  };
}
