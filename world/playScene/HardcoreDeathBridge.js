import { HardcoreMemorialStore } from "../../systems/hardcore/HardcoreMemorialStore.js";
import {
  buildHardcoreDeathRecapPages,
  sanitizeHardcoreMemorialRecord,
} from "../../systems/hardcore/hardcoreMemorialRecord.js";
import { isHardcoreModeArmed } from "../../values/hardcoreMode.js";
import { buildHardcoreDeathPresentation } from
  "../../values/hardcoreDeathPresentation.js";
import { HARDCORE_MEMORIAL_CONFIG } from "../../values/hardcoreMemorials.js";
import { SCENE_BASE_PHASES } from "../../values/sceneRuntime.js";
import {
  createHardcoreDeathTransactionId,
  persistHardcoreDeathTransaction,
} from "./HardcoreDeathSaveTransaction.js";

export function getHardcoreDepth(scene, playerTile = null) {
  const tile = playerTile || scene.playerController?.getPlayerTile?.();
  return tile
    ? Math.max(0, tile.ty - scene.config.topAirRows + 1)
    : 0;
}

export function persistHardcoreLiveCheckpoint(
  scene,
  time = 0,
  force = false,
) {
  const runtime = scene._hardcoreRuntime;
  if (
    !runtime
    || scene._hardcoreDeathInProgress
    || scene._saveWritesBlocked
    || !isHardcoreModeArmed(runtime.system.state)
  ) {
    return false;
  }
  const now = Math.max(0, Number(time) || scene.time?.now || 0);
  if (
    !force
    && now - runtime.lastCheckpointAt < runtime.config.checkpoint.intervalMs
  ) {
    return false;
  }
  const saved = scene.dugTileSaveStore?.saveHardcoreCheckpoint?.(
    scene.worldModel?.getWorldIdentity?.(),
    runtime.system.getSaveData(),
    scene.playerController?.getPersistenceData?.(),
  ) === true;
  if (saved) {
    runtime.lastCheckpointAt = now;
    runtime.lastCheckpointGp = (
      scene.playerController?.getGemPowerExact?.() || 0
    );
  }
  return saved;
}

function sumCarriedResources(scene) {
  return Object.values(scene.digSystem?.getResourceTotals?.() || {})
    .reduce((total, value) => (
      total + Math.max(0, Math.floor(Number(value) || 0))
    ), 0);
}

export function captureHardcoreDeathRecord(scene, context = {}) {
  const runtime = scene._hardcoreRuntime;
  const source = String(
    context.source || HARDCORE_MEMORIAL_CONFIG.copy.unknownDeathSource,
  );
  const depth = getHardcoreDepth(scene);
  const diedAt = Date.now();
  const body = scene.playerController?.physicsBody;
  const tileSize = Math.max(1, Number(scene.config?.tileSize) || 1);
  const worldX = body ? body.x + body.w / 2 : 0;
  const worldY = body ? body.y + body.h : 0;
  const hardcore = runtime?.system?.getSnapshot?.() || {};
  const reason = runtime?.config?.death?.sourceLabels?.[source]
    || runtime?.config?.death?.sourceLabels?.unknown
    || HARDCORE_MEMORIAL_CONFIG.copy.unknownDeathReason;
  const record = sanitizeHardcoreMemorialRecord({
    id: `hardcore-${scene.saveSlot}-${diedAt}`,
    slotId: scene.saveSlot,
    worldIdentity: scene.worldIdentity || `save-slot-${scene.saveSlot}`,
    diedAt,
    source,
    reason,
    depth,
    position: {
      worldX,
      worldY,
      tileX: Math.floor(worldX / tileSize),
      tileY: Math.max(0, Math.floor((worldY - 1) / tileSize)),
    },
    player: {
      characterId: scene.playerCharacterId,
      level: scene.playerLevelSystem?.level,
      gemPowerMax: scene.playerController?.getGemPowerMax?.(),
      wallet: scene.upgradeSystem?.getMoney?.(),
      carriedResourceUnits: sumCarriedResources(scene),
    },
    hardcore: {
      activePlayMs: hardcore.activePlayMs,
      peakStress: hardcore.peakStress,
      unstuckUses: hardcore.unstuckUses,
      paidTeleports: hardcore.paidTeleports,
      teleportMoneySpent: hardcore.teleportMoneySpent,
      wurmEncounters:
        scene.graveborerWurmSystem?.getSnapshot?.()?.encounterCount,
    },
    stats: scene.retentionProgressSystem?.getJournalSnapshot?.()?.stats,
    achievements: scene.journeySystem?.getSaveData?.()?.events,
  });
  if (context.persistMemorial !== true) {
    return {
      record,
      persisted: false,
      pages: buildHardcoreDeathRecapPages(record),
    };
  }
  const store = scene.hardcoreMemorialStore || new HardcoreMemorialStore();
  scene.hardcoreMemorialStore = store;
  const appended = store.append(record);
  scene.hardcoreMemorialSystem?.addRecord?.(appended.record);
  return {
    record: appended.record,
    persisted: appended.persisted,
    pages: buildHardcoreDeathRecapPages(appended.record),
  };
}

export async function beginHardcorePermanentDeath(scene, context = {}) {
  const runtime = scene._hardcoreRuntime;
  if (
    !runtime
    || scene._hardcoreDeathInProgress
    || !isHardcoreModeArmed(runtime.system.state)
  ) {
    return false;
  }

  const transactionId = createHardcoreDeathTransactionId(scene, context);
  scene._hardcoreDeathTransactionId = transactionId;
  scene._hardcoreDeathInProgress = true;
  scene.gameSaveCoordinator?.discardPending?.();
  scene.hidePauseMenu?.();
  scene.lightSystem?.forceTorchOff?.();
  scene.sceneModeController?.clearSuspensions?.();
  scene.setSceneBasePhase?.(SCENE_BASE_PHASES.DEAD, {
    owner: "hardcore-death",
  });
  scene.playerController?.setControlsEnabled?.(false);
  scene.isDigAnimating = false;
  scene.player?.anims?.stop?.();
  scene.aimBox?.setVisible?.(false);

  const source = context.source || "unknown";
  const result = runtime.system.recordDeath(source);
  const presentation = buildHardcoreDeathPresentation(result);
  scene.hardcoreModeData = runtime.system.getSaveData();
  const memorial = captureHardcoreDeathRecord(scene, {
    ...context,
    persistMemorial: result.outcome === "exhausted",
  });
  const { record } = memorial;
  scene._resetPlayerToSpawn?.();
  scene.playerController?.abilities?.fillGemPower?.();
  let lifeStateSaved = false;
  let saveInFlight = false;
  const continueFromDeath = () => {
    if (!lifeStateSaved) {
      return persistLifeState();
    }
    if (result.outcome === "exhausted") {
      scene.scene.start("StartMenuScene");
      return true;
    }
    scene.scene.restart({
      autoStart: true,
      saveSlot: scene.saveSlot,
      worldIdentity: scene.worldIdentity || `save-slot-${scene.saveSlot}`,
      playerCharacterId: scene.playerCharacterId,
      hardcoreModeData: runtime.system.getSaveData(),
    });
    return true;
  };
  runtime.modal.showDeath({
    reason: record.reason,
    depth: record.depth,
    pages: memorial.pages,
    presentation,
    onRetry: continueFromDeath,
    onReturn: () => scene.scene.start("StartMenuScene"),
  });
  runtime.lastDeath = {
    transactionId,
    source: record.source,
    depth: record.depth,
    memorialId: record.id,
    memorialPersisted: memorial.persisted,
    startedAt: record.diedAt,
    outcome: result.outcome,
    livesRemaining: result.livesRemaining,
  };
  runtime.updateDiagnostics?.();

  async function persistLifeState() {
    if (saveInFlight || lifeStateSaved) return lifeStateSaved;
    saveInFlight = true;
    runtime.modal.setDeathSaving(presentation);
    try {
      const verification = await persistHardcoreDeathTransaction(scene, {
        transactionId,
        expectedData: runtime.system.getSaveData(),
        timeoutMs: runtime.config.death.lifeStateSaveTimeoutMs,
        returnDelayMs: runtime.config.death.returnDelayMs,
      });
      lifeStateSaved = true;
      runtime.lastDeath.saveRevision = verification.revision || null;
      runtime.lastDeath.readbackSkipped = verification.skipped === true;
      runtime.lastDeath.saveError = null;
      if (scene._hardcoreRuntime === runtime) {
        runtime.modal.setDeathReady(
          `${HARDCORE_MEMORIAL_CONFIG.copy.slotPrefix} ${scene.saveSlot}  •  SAVE INTACT`,
          presentation,
        );
      }
      runtime.updateDiagnostics?.();
      return true;
    } catch (error) {
      console.error("[HardcoreDeathBridge] Life-state save failed:", error);
      runtime.lastDeath.saveError = String(error?.message || "unknown");
      if (scene._hardcoreRuntime === runtime) {
        runtime.modal.setError("LIFE STATE NOT SAVED  •  PRESS RETRY SAVE");
      }
      runtime.updateDiagnostics?.();
      return false;
    } finally {
      saveInFlight = false;
    }
  }

  return persistLifeState();
}

export function handleHardcoreGpChanged(scene, event = {}) {
  const runtime = scene._hardcoreRuntime;
  if (!runtime) return;
  const current = Number.isFinite(event.current)
    ? event.current
    : scene.playerController?.getGemPowerExact?.() || 0;
  if (!isHardcoreModeArmed(runtime.system.state)) return;

  if (current > 1) {
    runtime.oneGpWarned = false;
  } else if (
    !runtime.oneGpWarned
    && current > runtime.config.death.zeroGpEpsilon
  ) {
    runtime.oneGpWarned = true;
    runtime.flash?.(
      runtime.config.feedback.oneGpText,
      runtime.config.feedback.dangerColor,
      runtime.config.feedback.dangerFlashMs,
    );
  }
  if (
    current > runtime.config.death.zeroGpEpsilon
    && current <= runtime.config.checkpoint.lowGpImmediateThreshold
    && Number(event.previous) > runtime.config.checkpoint.lowGpImmediateThreshold
  ) {
    persistHardcoreLiveCheckpoint(scene, scene.time?.now || 0, true);
  }
  if (current <= runtime.config.death.zeroGpEpsilon) {
    void beginHardcorePermanentDeath(scene, {
      source: event.source || event.context?.source,
    });
  }
}
