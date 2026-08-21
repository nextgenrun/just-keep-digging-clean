import { HardcoreModeSystem } from "../../systems/hardcore/HardcoreModeSystem.js";
import { HardcoreStatusHud } from "../../systems/visual/HardcoreStatusHud.js";
import {
  HARDCORE_MODE_CONFIG,
  isHardcoreMode,
  isHardcoreModeArmed,
  resolveHardcoreUpkeepGpFloor,
  sanitizeHardcoreModeData,
} from "../../values/hardcoreMode.js";
import {
  beginHardcorePermanentDeath,
  getHardcoreDepth as getDepth,
  handleHardcoreGpChanged,
  persistHardcoreLiveCheckpoint,
} from "./HardcoreDeathBridge.js";
import {
  enterHardcoreBlockingModal,
  leaveHardcoreBlockingModal,
  requestHardcoreMemorialInspection,
} from "./HardcoreModalStateBridge.js";
import { requestHardcoreConversion } from "./HardcoreConversionRuntime.js";
import {
  GAMEPLAY_FEATURE_IDS,
  isGameplayFeatureEnabled,
} from "../../values/gameplayDevFlags.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { getCargoSellValue } from "../../values/resourcePrices.js";
import { RETURN_ROUTE_KINDS } from "../../values/returnRouteTelemetry.js";

function isFlightUnlocked(scene) {
  return scene.upgradeSystem?.isGemPowerUnlocked?.() === true;
}

function syncSceneModeData(scene) {
  const saveData = scene._hardcoreRuntime?.system?.getSaveData?.()
    ?? sanitizeHardcoreModeData(scene.hardcoreModeData);
  scene.hardcoreModeData = saveData;
  return saveData;
}

function flash(scene, text, color, duration) {
  scene.hudSystem?.flashStatus?.(text, color, duration);
}

function isNearIntactStarLight(scene, playerTile, radiusTiles) {
  if (!playerTile || !scene.worldModel || !(radiusTiles > 0)) return false;
  const radiusSquared = radiusTiles * radiusTiles;
  for (let offsetY = -radiusTiles; offsetY <= radiusTiles; offsetY += 1) {
    for (let offsetX = -radiusTiles; offsetX <= radiusTiles; offsetX += 1) {
      if (offsetX * offsetX + offsetY * offsetY > radiusSquared) continue;
      const tx = playerTile.tx + offsetX;
      const ty = playerTile.ty + offsetY;
      if (scene.worldModel.inBounds?.(tx, ty) === false) continue;
      if (scene.worldModel.getTileType?.(tx, ty) === TILE_TYPES.SKY_TILE) return true;
    }
  }
  return false;
}

function processSystemEvents(scene) {
  const runtime = scene._hardcoreRuntime;
  if (!runtime) return;
  for (const event of runtime.system.drainEvents()) {
    if (event.type !== "stress-band") continue;
    scene.soundSystem?.playHardcoreStressWarning?.(event.band);
    flash(
      scene,
      event.band === "critical"
        ? runtime.config.feedback.stressCriticalText
        : runtime.config.feedback.stressWarningText,
      runtime.config.feedback.dangerColor,
      runtime.config.feedback.dangerFlashMs,
    );
  }
}

async function persistNow(scene) {
  scene.queueDugTilesSave?.();
  const saved = await scene.flushDugTilesSave?.();
  return saved !== false;
}

function armAfterFlightUnlock(scene, source = "flight") {
  const runtime = scene._hardcoreRuntime;
  if (!runtime || !isFlightUnlocked(scene)) return false;
  if (!runtime.system.arm(source)) return false;
  syncSceneModeData(scene);
  runtime.lastPersistedStress = runtime.system.state.stress;
  runtime.lastStressPersistAt = scene.time?.now || 0;
  processSystemEvents(scene);
  flash(
    scene,
    runtime.config.feedback.armedText,
    runtime.config.feedback.armedColor,
    runtime.config.feedback.armedFlashMs,
  );
  scene.queueDugTilesSave?.();
  return true;
}

function requestUnstuck(scene) {
  const runtime = scene._hardcoreRuntime;
  if (!runtime || runtime.modal.isVisible || scene._hardcoreDeathInProgress) return false;
  const remainingMs = runtime.system.getUnstuckCooldownRemaining();
  if (remainingMs > 0) return false;

  enterHardcoreBlockingModal(scene);
  return runtime.modal.showConfirmation({
    title: runtime.config.copy.unstuckTitle,
    subtitle: "50% OF EVERY CARRIED RESOURCE WILL BE LOST",
    body: runtime.config.copy.unstuckBody,
    onCancel: () => leaveHardcoreBlockingModal(scene),
    onConfirm: async () => {
      if (!runtime.system.canUseUnstuck()) {
        leaveHardcoreBlockingModal(scene);
        return false;
      }
      const resources = scene.digSystem?.getResourceTotals?.() || {};
      const remaining = {};
      const lost = {};
      for (const [resource, rawAmount] of Object.entries(resources)) {
        const amount = Math.max(0, Math.floor(Number(rawAmount) || 0));
        const nextAmount = Math.floor(
          amount * (1 - runtime.config.unstuck.resourceLossRatio),
        );
        remaining[resource] = nextAmount;
        lost[resource] = amount - nextAmount;
      }
      const cargoLossUnits = Object.values(lost).reduce((sum, amount) => sum + amount, 0);
      const failureLoss = getCargoSellValue(lost);
      const fromDepth = Math.max(0, Math.floor(getDepth(scene)));
      scene.digSystem?.setResourceTotals?.(remaining);
      scene.uiResourceBar?.setResources?.(scene.digSystem?.getResourceTotals?.() || remaining);
      runtime.system.recordUnstuck();
      scene.retentionProgressSystem?.recordReturnRoute?.({
        kind: RETURN_ROUTE_KINDS.ABANDON,
        fromDepth,
        toDepth: 0,
        distanceTiles: fromDepth,
        cargoLossUnits,
      });
      scene.retentionProgressSystem?.recordExpeditionCost?.({ failureLoss });
      syncSceneModeData(scene);
      scene._resetPlayerToSpawn?.();
      scene.earthquakeFeedbackUI?.clearEscapeObjective?.();
      scene.earthquakeHazardOverlay?.clear?.();
      const saved = await persistNow(scene);
      if (!saved) {
        flash(
          scene,
          "Unstuck penalty save failed • retry SAVE GAME",
          runtime.config.feedback.errorColor,
          runtime.config.feedback.errorFlashMs,
        );
      }
      leaveHardcoreBlockingModal(scene);
      return true;
    },
  });
}

function tryPayTeleport(scene, options = {}) {
  const runtime = scene._hardcoreRuntime;
  if (!runtime || !isHardcoreModeArmed(runtime.system.state)) {
    return { success: true, cost: 0 };
  }
  const depth = Math.max(0, Number(options.depth) || getDepth(scene));
  const kind = String(options.kind || "undergroundToSky");
  const cost = runtime.system.getTeleportCost(depth, kind);
  if (cost <= 0) return { success: true, cost: 0 };
  if (!scene.upgradeSystem?.spendMoney?.(cost)) {
    return { success: false, cost };
  }
  scene.uiResourceBar?.setMoney?.(scene.upgradeSystem.getMoney());
  runtime.system.recordTeleport(cost);
  syncSceneModeData(scene);
  scene.queueDugTilesSave?.();
  return { success: true, cost };
}

function rescueAtCasualBoundary(scene) {
  const runtime = scene._hardcoreRuntime;
  if (runtime && isHardcoreModeArmed(runtime.system.state)) {
    return beginHardcorePermanentDeath(scene, { source: "crushDepth" });
  }
  scene._resetPlayerToSpawn?.();
  scene.earthquakeFeedbackUI?.clearEscapeObjective?.();
  scene.earthquakeHazardOverlay?.clear?.();
  scene.queueDugTilesSave?.();
  return true;
}

function updateDiagnostics(scene) {
  const runtime = scene._hardcoreRuntime;
  if (!runtime || typeof window === "undefined") return;
  if (!isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.DEV_CHEATS)) {
    delete window[runtime.config.diagnostics.globalKey];
    return;
  }
  window[runtime.config.diagnostics.globalKey] = {
    mode: runtime.system.getSnapshot(),
    deathInProgress: scene._hardcoreDeathInProgress === true,
    saveWritesBlocked: scene._saveWritesBlocked === true,
    lastDeath: runtime.lastDeath || null,
    forceDrainGp: (amount = 1, source = "unknown") => (
      scene.playerController?.consumeGemPower?.(Number(amount) || 0, { source })
    ),
  };
}

export function createHardcoreModeRuntime(scene) {
  if (scene._hardcoreRuntime) return scene._hardcoreRuntime;
  const config = HARDCORE_MODE_CONFIG, createModal = scene.uiPorts?.createHardcoreModalOverlay;
  if (typeof createModal !== "function") throw new Error("Hardcore mode requires an injected modal overlay port");
  const system = new HardcoreModeSystem(scene.hardcoreModeData, config);
  const runtime = {
    config,
    system,
    hud: new HardcoreStatusHud(scene, config),
    modal: createModal(scene, config),
    oneGpWarned: false,
    lowGpCueActive: false,
    lastPersistedStress: system.state.stress,
    lastStressPersistAt: 0,
    lastCheckpointAt: scene.time?.now || 0,
    lastCheckpointGp: scene.playerController?.getGemPowerExact?.() || 0,
    lastDeath: null,
    bindings: {},
  };
  runtime.flash = (text, color, duration) => flash(
    scene,
    text,
    color,
    duration,
  );
  runtime.updateDiagnostics = () => updateDiagnostics(scene);
  runtime.gpFloorProvider = context => resolveHardcoreUpkeepGpFloor(
    runtime.system.state,
    context?.source,
  );
  scene.playerController?.setGemPowerFloorProvider?.(
    runtime.gpFloorProvider,
  );
  scene._hardcoreRuntime = runtime;
  scene._hardcoreDeathInProgress = false;
  scene._hardcoreDeathTransactionId = null;
  scene._saveWritesBlocked = false;
  syncSceneModeData(scene);

  runtime.bindings.handlePlayerGemPowerChanged = event => (
    handleHardcoreGpChanged(scene, event)
  );
  runtime.bindings.handleHardcoreGpDepleted = context => (
    beginHardcorePermanentDeath(scene, context)
  );
  runtime.bindings.armHardcoreAfterFlightUnlock = (source) => armAfterFlightUnlock(scene, source);
  runtime.bindings.syncHardcoreArmingFromFlight = () => (
    armAfterFlightUnlock(scene, "restored-flight-unlock")
  );
  runtime.bindings.canOfferHardcoreConversion = () => (
    !isHardcoreMode(runtime.system.state) && isFlightUnlocked(scene)
  );
  runtime.bindings.requestHardcoreConversion = () => requestHardcoreConversion(
    scene,
    { isFlightUnlocked, syncSceneModeData, processSystemEvents, persistNow, flash },
  );
  runtime.bindings.requestHardcoreUnstuck = () => requestUnstuck(scene);
  runtime.bindings.inspectHardcoreMemorial = record => (
    requestHardcoreMemorialInspection(scene, record)
  );
  runtime.bindings.getHardcoreTeleportCost = (options = {}) => (
    isHardcoreModeArmed(runtime.system.state)
      ? runtime.system.getTeleportCost(
          Math.max(0, Number(options.depth) || getDepth(scene)),
          options.kind || "undergroundToSky",
        )
      : 0
  );
  runtime.bindings.tryPayHardcoreTeleport = (options) => tryPayTeleport(scene, options);
  runtime.bindings.handleCasualBoundaryRescue = () => rescueAtCasualBoundary(scene);
  for (const [name, handler] of Object.entries(runtime.bindings)) scene[name] = handler;

  runtime.hud.update(system.getSnapshot(), scene.time?.now || 0, scene.playerController?.getGemPowerExact?.() || 0);
  updateDiagnostics(scene);
  return runtime;
}

export function loadHardcoreModeSaveData(scene, data) {
  const runtime = scene._hardcoreRuntime;
  if (!runtime) {
    scene.hardcoreModeData = sanitizeHardcoreModeData(data);
    return scene.hardcoreModeData;
  }
  runtime.system.loadSaveData(data);
  runtime.lastPersistedStress = runtime.system.state.stress;
  syncSceneModeData(scene);
  updateDiagnostics(scene);
  return scene.hardcoreModeData;
}

export function getHardcoreModeSaveData(scene) {
  return syncSceneModeData(scene);
}

export function updateHardcoreModeRuntime(scene, time, delta, playerTile = null) {
  const runtime = scene._hardcoreRuntime;
  if (!runtime) return null;
  if (
    isHardcoreMode(runtime.system.state)
    && !isHardcoreModeArmed(runtime.system.state)
    && isFlightUnlocked(scene)
  ) {
    armAfterFlightUnlock(scene, "flight-unlock-runtime-guard");
  }
  const gp = scene.playerController?.getGemPowerExact?.() || 0;
  if (scene._hardcoreDeathInProgress) {
    runtime.hud.update(runtime.system.getSnapshot(), time, gp);
    return runtime.system.getSnapshot();
  }

  const light = scene.lightSystem?.getShaderSnapshot?.() || {};
  const body = scene.playerController?.physicsBody;
  const starLightRadius = runtime.config.stress.intactStarLightRadiusTiles;
  const nearIntactStarLight = isNearIntactStarLight(
    scene,
    playerTile,
    starLightRadius,
  );
  const snapshot = runtime.system.update(delta, {
    gameplayActive: scene.gameState === "playing",
    nowMs: time,
    depth: getDepth(scene, playerTile),
    darknessAlpha: light.darknessAlpha,
    torchActive: light.torchActive,
    nearIntactStarLight,
    playerLevel: scene.playerLevelSystem?.level || 1,
    descentTilesPerSecond: body && scene.config.tileSize > 0
      ? Math.max(0, body.vy / scene.config.tileSize)
      : 0,
  });
  syncSceneModeData(scene);
  processSystemEvents(scene);

  if (snapshot.requestedStressGpDrain > 0) {
    scene.playerController?.consumeGemPower?.(
      snapshot.requestedStressGpDrain,
      { source: "stress", stress: snapshot.stress },
    );
  }
  const currentGp = scene.playerController?.getGemPowerExact?.() || 0;
  const nearDeath = snapshot.armed
    && currentGp > runtime.config.death.zeroGpEpsilon
    && currentGp <= runtime.config.stress.nearDeathGpThreshold;
  if (nearDeath && runtime.nearDeathActive !== true) {
    const lastCueAt = Number(runtime.lastNearDeathCueAt) || 0;
    if (lastCueAt === 0 || time - lastCueAt >= runtime.config.stress.nearDeathCueCooldownMs) {
      runtime.lastNearDeathCueAt = time;
      scene.soundSystem?.playHardcoreNearDeath?.();
      flash(
        scene,
        "HARDCORE DANGER  •  GP NEAR ZERO",
        runtime.config.feedback.dangerColor,
        runtime.config.feedback.dangerFlashMs,
      );
    }
  }
  runtime.nearDeathActive = nearDeath;
  if (
    snapshot.armed
    && currentGp <= runtime.config.death.zeroGpEpsilon
  ) {
    void beginHardcorePermanentDeath(scene, { source: "unknown" });
  }
  if (
    snapshot.armed
    && scene.gameState === "playing"
    && !scene._hardcoreDeathInProgress
  ) {
    persistHardcoreLiveCheckpoint(scene, time);
  }

  const stressDelta = Math.abs(snapshot.stress - runtime.lastPersistedStress);
  const persistenceDue = time - runtime.lastStressPersistAt
    >= runtime.config.stress.persistenceIntervalMs;
  if (
    scene.gameState === "playing"
    && !scene._hardcoreDeathInProgress
    && (stressDelta >= runtime.config.stress.persistenceDelta
      || (persistenceDue && stressDelta > Number.EPSILON))
  ) {
    runtime.lastPersistedStress = snapshot.stress;
    runtime.lastStressPersistAt = time;
    scene.queueDugTilesSave?.();
  }

  runtime.hud.update(snapshot, time, currentGp);
  updateDiagnostics(scene);
  return snapshot;
}

export function destroyHardcoreModeRuntime(scene) {
  const runtime = scene._hardcoreRuntime;
  if (!runtime) return;
  for (const [name, handler] of Object.entries(runtime.bindings)) {
    if (scene[name] === handler) scene[name] = undefined;
  }
  runtime.hud?.destroy();
  runtime.modal?.destroy();
  scene.playerController?.setGemPowerFloorProvider?.(null);
  runtime.gpFloorProvider = null;
  if (typeof window !== "undefined") {
    delete window[runtime.config.diagnostics.globalKey];
  }
  scene._hardcoreDeathTransactionId = null;
  scene._hardcoreRuntime = null;
}
