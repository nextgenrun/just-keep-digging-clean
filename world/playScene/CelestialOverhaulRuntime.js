// Owns PlayScene integration for Stars, talent saves, legacy migration, and loadout state.

import { CelestialTalentProgressionSystem } from
  "../../systems/progression/CelestialTalentProgressionSystem.js";
import {
  CELESTIAL_OVERHAUL_SAVE_CONFIG,
  createCelestialOverhaulSaveData,
  sanitizeCelestialOverhaulData,
} from "../../values/celestialOverhaulSave.js";

function resolveTalentSource(savedData, envelope) {
  if (Number(savedData?.version || 0) >= 14) return envelope.talents;
  return {
    unlockedEngines: savedData?.starHeartData?.unlockedEngines || [],
  };
}

function syncTalentEngines(scene, snapshot, silent = true) {
  return scene.starHeartProgressionSystem?.syncTalentUnlockedEngines?.(
    snapshot?.unlockedAbilityIds || [],
    { silent },
  );
}

export function initializeCelestialOverhaulRuntime(scene, savedData = null) {
  scene._celestialOverhaulRuntimeReady = false;
  scene.celestialTalentProgressionSystem?.destroy?.();
  scene.celestialTalentProgressionSystem = new CelestialTalentProgressionSystem({
    getPlayerLevel: () => scene.playerLevelSystem?.level || 1,
    isGodModeActive: () => scene.upgradeSystem?.godModeActive === true,
    onChanged: (snapshot) => {
      syncTalentEngines(scene, snapshot, false);
      scene.starPillarSystem?.syncTalentProgress?.(snapshot, true);
      scene.celestialActionBarSystem?.sync?.();
      scene.celestialCurrencyHudSystem?.update?.(true);
      if (scene._celestialOverhaulRuntimeReady) scene.queueDugTilesSave?.();
    },
  });

  const envelope = sanitizeCelestialOverhaulData(
    savedData?.celestialOverhaulData,
  );
  const snapshot = scene.celestialTalentProgressionSystem.loadSaveData(
    resolveTalentSource(savedData, envelope),
  );
  scene._celestialActionBarOrder = [...envelope.actionbar.order];
  scene._celestialLegacyRarityMigrationVersion = savedData
    ? envelope.legacyRarityMigrationVersion
    : CELESTIAL_OVERHAUL_SAVE_CONFIG.legacyRarityMigrationVersion;
  syncTalentEngines(scene, snapshot, true);
  scene._celestialOverhaulRuntimeReady = true;
  return snapshot;
}

export function applyCelestialOverhaulState(scene, savedData, {
  migrateLegacyRarity = true,
} = {}) {
  if (!scene.celestialTalentProgressionSystem || !savedData) return null;
  scene._celestialOverhaulRuntimeReady = false;
  const envelope = sanitizeCelestialOverhaulData(
    savedData.celestialOverhaulData,
  );
  scene.celestialTalentProgressionSystem.loadSaveData(
    resolveTalentSource(savedData, envelope),
  );
  scene._celestialActionBarOrder = [...envelope.actionbar.order];
  scene._celestialLegacyRarityMigrationVersion =
    envelope.legacyRarityMigrationVersion;

  let migrated = false;
  const isLegacySave = Number(savedData.version || 0) < 14;
  if (
    migrateLegacyRarity
    && isLegacySave
    && scene._celestialLegacyRarityMigrationVersion
      < CELESTIAL_OVERHAUL_SAVE_CONFIG.legacyRarityMigrationVersion
  ) {
    const rarityCounts = scene.floatingTextSystem?.getStarRarityCounts?.() || [];
    rarityCounts.forEach((count, rarity) => {
      scene.celestialTalentProgressionSystem.grantStarsFromRarity(rarity, count);
    });
    scene._celestialLegacyRarityMigrationVersion =
      CELESTIAL_OVERHAUL_SAVE_CONFIG.legacyRarityMigrationVersion;
    migrated = true;
  }

  const snapshot = scene.celestialTalentProgressionSystem.getSnapshot();
  syncTalentEngines(scene, snapshot, true);
  scene.celestialActionBarSystem?.loadLoadout?.(scene._celestialActionBarOrder);
  scene.celestialCurrencyHudSystem?.update?.(true);
  scene._celestialOverhaulRuntimeReady = true;
  if (migrated) scene.queueDugTilesSave?.();
  return snapshot;
}

export function captureCelestialOverhaulState(scene) {
  return createCelestialOverhaulSaveData({
    talents: scene.celestialTalentProgressionSystem?.getSaveData?.(),
    actionbarOrder: scene.celestialActionBarSystem?.getLoadout?.()
      || scene._celestialActionBarOrder,
    legacyRarityMigrationVersion:
      scene._celestialLegacyRarityMigrationVersion,
  });
}
