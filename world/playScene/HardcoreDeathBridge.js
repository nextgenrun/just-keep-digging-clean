import { startPlayerDeathCinematic } from "./PlayerDeathCinematic.js";
import { HardcoreMemorialStore } from "../../systems/hardcore/HardcoreMemorialStore.js";
import {
  buildHardcoreDeathRecapPages,
  sanitizeHardcoreMemorialRecord,
} from "../../systems/hardcore/hardcoreMemorialRecord.js";
import { isHardcoreModeArmed } from "../../values/hardcoreMode.js";
import { HARDCORE_MEMORIAL_CONFIG } from "../../values/hardcoreMemorials.js";
import { MUSIC_CUE_IDS } from "../../values/musicDirector.js";
import { SCENE_BASE_PHASES } from "../../values/sceneRuntime.js";

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
  if (scene.townRestSystem) {
    // Keep death authorization in memory; expeditions cannot create resume checkpoints.
    scene.dugTileSaveStore?.recordLiveArmedRun?.(runtime.system.getSaveData());
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

function waitForSceneDelay(scene, delayMs) {
  return new Promise(resolve => {
    scene.time.delayedCall(delayMs, resolve);
  });
}

function withTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeoutId = globalThis.setTimeout?.(
      () => reject(new Error("life-state-save-timeout")),
      timeoutMs,
    );
    Promise.resolve(promise).then(
      value => {
        globalThis.clearTimeout?.(timeoutId);
        resolve(value);
      },
      error => {
        globalThis.clearTimeout?.(timeoutId);
        reject(error);
      },
    );
  });
}

function buildDeathPresentation() {
  return {
    title: "YOUR HARDCORE RUN ENDED",
    subtitlePrefix: "YOUR ONLY LIFE IS LOST",
    readyStatus: "RUN ENDED • SAVE AND RECORD INTACT",
    readyDetail: "EXPORT OR CLEAR THIS RUN FROM SAVE SLOTS",
    primaryLabel: "BACK TO SAVE SLOTS",
    secondaryLabel: "MAIN MENU",
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
  scene.gameSaveCoordinator?.discardPending?.();
  scene.hidePauseMenu?.();
  scene.lightSystem?.forceTorchOff?.();
  scene.sceneModeController.clearSuspensions();
  scene.setSceneBasePhase(SCENE_BASE_PHASES.DEAD, { owner: "hardcore-death" });
  scene.playerController?.setControlsEnabled?.(false);
  scene.isDigAnimating = false;
  scene.player?.anims?.stop?.();
  scene.aimBox?.setVisible?.(false);

  const source = context.source || "unknown";
  const result = runtime.system.recordDeath(source);
  scene.soundSystem?.playMusicCue?.(
    MUSIC_CUE_IDS.deathFinal,
    {
      dedupeKey: `hardcore-${scene.saveSlot}-${source}`,
    },
  );
  const presentation = buildDeathPresentation();
  scene.hardcoreModeData = runtime.system.getSaveData();
  const memorial = captureHardcoreDeathRecord(scene, {
    ...context,
    persistMemorial: result.outcome === "exhausted",
  });
  const { record } = memorial;
  let lifeStateSaved = false;
  let saveInFlight = false;
  const continueFromDeath = async () => {
    if (!lifeStateSaved) {
      const saved = await persistLifeState();
      if (!saved) return false;
    }
    scene.scene.start("StartMenuScene");
    return true;
  };
  const deferReveal = startPlayerDeathCinematic(scene, () => runtime.modal.revealDeath?.());
  runtime.modal.showDeath({
    deferReveal,
    reason: record.reason,
    depth: record.depth,
    pages: memorial.pages,
    presentation,
    onRetry: continueFromDeath,
    onReturn: () => scene.scene.start("MainMenuScene"),
  });
  runtime.lastDeath = {
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
    try {
      runtime.modal.setDeathSaving(presentation);
      scene._hardcoreLifeStateSaveInProgress = true;
      const saveReason = "hardcore-death-life-state";
      const saveCoordinator = scene.gameSaveCoordinator;
      if (saveCoordinator?.requestSnapshot) {
        saveCoordinator.requestSnapshot(saveReason);
      } else {
        scene.queueDugTilesSave?.(saveReason);
      }
      const saved = await withTimeout(
        saveCoordinator?.flush?.({ scheduled: false, force: true, reason: saveReason })
          ?? scene.flushDugTilesSave?.({ scheduled: false, force: true, reason: saveReason }),
        runtime.config.death.lifeStateSaveTimeoutMs,
      );
      if (saved === false) throw new Error("flush-returned-false");
      await waitForSceneDelay(scene, runtime.config.death.returnDelayMs);
      lifeStateSaved = true;
      runtime.lastDeath.saveError = null;
      runtime.modal.setDeathReady(
        `${HARDCORE_MEMORIAL_CONFIG.copy.slotPrefix} ${scene.saveSlot}  •  YOUR SAVE IS SAFE`,
        presentation,
      );
      runtime.updateDiagnostics?.();
      return true;
    } catch (error) {
      console.error("[HardcoreDeathBridge] Life-state save failed:", error);
      runtime.lastDeath.saveError = String(error?.message || "unknown");
      runtime.modal.setError("PROGRESS NOT SAVED  •  PRESS RETRY SAVE");
      runtime.updateDiagnostics?.();
      return false;
    } finally {
      scene._hardcoreLifeStateSaveInProgress = false;
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
