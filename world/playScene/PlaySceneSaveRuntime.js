import { canPersistTownRest } from './TownRestSavePolicy.js';
import { isHardcoreModeExhausted } from "../../values/hardcoreMode.js";
import { validateSaveSnapshotIntegrity } from "../../values/progressionInvariants.js";
import { GameSaveCoordinator } from "./PlaySceneSaveScheduler.js";
import { captureCelestialOverhaulState } from "./CelestialOverhaulRuntime.js";
import { getGraveborerWurmSaveData } from "./GraveborerWurmBridge.js";
import { getHardcoreModeSaveData } from "./HardcoreModeBridge.js";

export function isPlaySceneSaveBlocked(scene) {
  return scene?._saveWritesBlocked === true
    || (
      scene?._hardcoreDeathInProgress === true
      && scene?._hardcoreLifeStateSaveInProgress !== true
    );
}

export function capturePlaySceneSaveSnapshot(scene, revisionMetadata) {
  const baseSpecialTileData = scene.specialTileSystem?.getSaveData?.() ?? null;
  return Object.freeze({
    revisionMetadata,
    worldIdentity: scene.worldModel.getWorldIdentity(),
    dugTileKeys: scene.worldModel.getDugTileKeys(),
    rubbleTiles: scene.worldModel.getRubbleTiles(),
    resources: scene.digSystem.getResourceTotals(),
    upgrades: scene.upgradeSystem.toJSON(),
    levelData: scene.playerLevelSystem?.toJSON?.() ?? null,
    specialTileData: baseSpecialTileData ? {
      ...baseSpecialTileData,
      randomWorldEvents: scene.randomEventBridge?.getSaveData?.() ?? null,
    } : null,
    depthGateData: scene.depthGateSystem?.getSaveData?.() ?? null,
    dayNightData: scene.dayNightCycle ? {
      ...scene.dayNightCycle.toJSON(), weather: scene.weatherSystem?.toJSON?.() ?? null,
    } : null,
    playerCharacterId: scene.playerCharacterId,
    caveSceneData: scene.caveEntryController?.getSaveData?.() ?? null,
    ancientRelicData: scene.ancientRelicSystem?.getSaveData?.() ?? null,
    openingFlightArtifactData: scene.openingFlightArtifactSystem?.getSaveData?.() ?? null,
    starHeartData: scene.starHeartProgressionSystem?.getSaveData?.() ?? null,
    retentionData: scene.retentionProgressSystem?.getSaveData?.() ?? null,
    heavenblocksData: scene.heavenblocksProgressionSystem?.getSaveData?.() ?? null,
    hardcoreModeData: getHardcoreModeSaveData(scene),
    graveborerWurmData: getGraveborerWurmSaveData(scene),
    playerStateData: scene.playerController?.getPersistenceData?.() ?? null,
    campfireData: scene.campfireSystem?.getSaveData?.() ?? null,
    journeyData: scene.journeySystem?.getSaveData?.() ?? null,
    celestialOverhaulData: captureCelestialOverhaulState(scene),
    milestoneData: scene.milestoneBoardSystem?.getSaveData?.() ?? null,
    starCollectionData: scene.floatingTextSystem?.getSaveData?.() ?? null,
    understarEndingData: scene.understarEndingSystem?.getSaveData?.() ?? null,
  });
}

export function createPlaySceneSaveCoordinator(scene) {
  const initialRevision = scene._cachedSaveData?.revisionMetadata?.revision || 0;
  return new GameSaveCoordinator({
    initialRevision,
    isBlocked: () => isPlaySceneSaveBlocked(scene),
    canPersist: () => canPersistTownRest(scene) || (
      scene._hardcoreDeathInProgress === true
      && scene._hardcoreLifeStateSaveInProgress === true
      && isHardcoreModeExhausted(scene.hardcoreModeData)
    ),
    capture: metadata => capturePlaySceneSaveSnapshot(scene, metadata),
    validate: validateSaveSnapshotIntegrity,
    write: async snapshot => {
      const saved = await scene.dugTileSaveStore.saveSnapshot(snapshot);
      if (saved !== false) {
        try {
          scene.game?.events?.emit('player-data-save-committed', {
            slot: Number(scene.saveSlot), store: scene.dugTileSaveStore,
            revision: snapshot.revisionMetadata?.revision,
          });
        } catch { /* Observers cannot turn a committed local save into a failure. */ }
      }
      return saved;
    },
    onRejected: finding => {
      if (scene._saveWritesBlocked) return;
      if (
        (scene._townRestCommit || scene._hardcoreLifeStateSaveInProgress)
        && finding.id === 'game-save-write'
      ) return;
      const issues = finding.validation?.issues?.join(", ");
      const error = finding.error || new Error(issues || "Save snapshot validation failed");
      scene._handleAuthorityFailure?.({
        id: finding.id || "game-save-coordinator",
        phase: "persistence",
        criticality: "persistence",
        error,
      });
    },
  });
}
