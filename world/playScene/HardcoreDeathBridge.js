import { HardcoreMemorialStore } from "../../systems/hardcore/HardcoreMemorialStore.js";
import {
  buildHardcoreDeathRecapPages,
  sanitizeHardcoreMemorialRecord,
} from "../../systems/hardcore/hardcoreMemorialRecord.js";
import {
  createHardcoreModeData,
  isHardcoreModeArmed,
} from "../../values/hardcoreMode.js";
import { HARDCORE_MEMORIAL_CONFIG } from "../../values/hardcoreMemorials.js";
import { TOWN_TUTORIAL_CHOICES } from "../../values/retentionConfig.js";

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

async function settleWithSceneTimeout(scene, promise, timeoutMs, fallbackValue) {
  let timeoutEvent = null;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise(resolve => {
        timeoutEvent = scene.time.delayedCall(timeoutMs, () => {
          resolve(fallbackValue);
        });
      }),
    ]);
  } finally {
    timeoutEvent?.remove?.(false);
  }
}

function waitForSceneDelay(scene, delayMs) {
  return new Promise(resolve => {
    scene.time.delayedCall(delayMs, resolve);
  });
}

function createRetryPayload(scene) {
  return {
    saveSlot: scene.saveSlot,
    worldIdentity: scene.worldIdentity || `save-slot-${scene.saveSlot}`,
    playerCharacterId: scene.playerCharacterId,
    hardcoreModeData: createHardcoreModeData("hardcore"),
    isNewSave: true,
    tutorialChoice: TOWN_TUTORIAL_CHOICES.NO,
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

  scene._hardcoreDeathInProgress = true;
  scene._saveWritesBlocked = true;
  scene.pendingDugTileSave = false;
  scene.hidePauseMenu?.();
  scene.lightSystem?.forceTorchOff?.();
  scene.gameState = "dead";
  scene.playerController?.setControlsEnabled?.(false);
  scene.isDigAnimating = false;
  scene.player?.anims?.stop?.();
  scene.aimBox?.setVisible?.(false);

  const memorial = captureHardcoreDeathRecord(scene, context);
  const { record } = memorial;
  scene.dugTileSaveStore.saveHardcoreCheckpoint(
    scene.worldModel.getWorldIdentity(),
    runtime.system.getSaveData(),
    scene.playerController?.getPersistenceData?.(),
  );
  const authorization = {
    mode: "hardcore",
    armed: true,
    source: record.source,
    depth: record.depth,
    memorialId: record.id,
  };
  let prepared = { success: false, backupsDeleted: 0 };
  try {
    prepared = scene.dugTileSaveStore.preparePermanentDeath(authorization);
  } catch (error) {
    console.error("[HardcoreDeathBridge] Immediate erase failed:", error);
  }
  if (!memorial.persisted && prepared.success) {
    memorial.persisted = scene.hardcoreMemorialStore
      .append(record)
      .persisted;
  }

  const retryPayload = createRetryPayload(scene);
  runtime.modal.showDeath({
    reason: record.reason,
    depth: record.depth,
    pages: memorial.pages,
    onRetry: () => scene.scene.start("WorldLoadScene", retryPayload),
    onReturn: () => scene.scene.start("StartMenuScene"),
  });
  runtime.lastDeath = {
    source: record.source,
    depth: record.depth,
    memorialId: record.id,
    memorialPersisted: memorial.persisted,
    startedAt: record.diedAt,
    localPurge: prepared,
  };
  runtime.updateDiagnostics?.();

  try {
    const inFlightSave = scene._dugTileSavePromise;
    if (inFlightSave) {
      await settleWithSceneTimeout(
        scene,
        inFlightSave.catch(() => false),
        runtime.config.death.inFlightSaveWaitMs,
        false,
      );
    }
    const purgeFallback = {
      success: scene.dugTileSaveStore.isDeathTombstoned(),
      remoteDeleted: false,
      backupsDeleted: prepared.backupsDeleted,
      timedOut: true,
    };
    const purge = await settleWithSceneTimeout(
      scene,
      scene.dugTileSaveStore.purgePermanentDeath(
        scene.worldModel.getWorldIdentity(),
        { ...authorization, backupsDeleted: prepared.backupsDeleted },
      ),
      runtime.config.death.remotePurgeWaitMs,
      purgeFallback,
    );
    runtime.lastDeath.purge = purge;
    await waitForSceneDelay(scene, runtime.config.death.returnDelayMs);
    const copy = HARDCORE_MEMORIAL_CONFIG.copy;
    runtime.modal.setDeathReady(
      `${copy.slotPrefix} ${scene.saveSlot}  •  `
        + `${purge.backupsDeleted} ${copy.backupsErasedSuffix}`,
    );
    runtime.updateDiagnostics?.();
    return purge.success === true;
  } catch (error) {
    console.error("[HardcoreDeathBridge] Permadeath purge failed:", error);
    const copy = HARDCORE_MEMORIAL_CONFIG.copy;
    runtime.modal.setDeathReady(
      `${copy.slotPrefix} ${scene.saveSlot}  •  ${copy.eraseForcedSuffix}`,
    );
    return false;
  }
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
