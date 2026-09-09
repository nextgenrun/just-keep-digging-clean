import { StarSanctuarySystem } from
  "../../systems/environment/StarSanctuarySystem.js";
import { StarConsumptionAcknowledgementStore } from
  "../../systems/save-system/StarConsumptionAcknowledgementStore.js";
import { StarConsumptionHoldView } from
  "../../systems/visual/StarConsumptionHoldView.js";
import { StarlessScarView } from "../../systems/visual/StarlessScarView.js";
import { STAR_SANCTUARY_CONFIG } from "../../values/starSanctuary.js";
import { STAR_SANCTUARY_COPY } from "../../values/playerFacingCopy.js";
import { WorldVisualAssetCache } from
  "../rendering/scenic-world/WorldVisualAssetCache.js";
import {
  enterHardcoreBlockingModal,
  leaveHardcoreBlockingModal,
} from "./HardcoreModalStateBridge.js";

function formatCopy(template, profile = {}) {
  return String(template || "")
    .replaceAll("{name}", profile.identityName || "STAR")
    .replaceAll("{temperament}", profile.temperamentLabel || "STARLIGHT")
    .replaceAll("{rate}", (Number(profile.gpPerSecond) || 0).toFixed(1))
    .replaceAll("{cap}", String(Math.round(
      (Number(profile.gpCapRatio) || 0) * 100,
    )));
}

function showFeedback(scene, message, color, durationMs) {
  scene.hudSystem?.flashStatus?.(message, color, durationMs);
}

function resetKeyboardState(scene) {
  const keyboard = scene.input?.keyboard;
  if (typeof keyboard?.resetKeys === "function") {
    keyboard.resetKeys();
    return;
  }
  const keys = scene.inputHandler?.getKeys?.() || {};
  Object.values(keys).forEach(key => key?.reset?.());
}

function finishAcknowledgementModal(scene, runtime) {
  runtime.acknowledgementModalOpen = false;
  leaveHardcoreBlockingModal(scene);
  resetKeyboardState(scene);
}

function showAcknowledgementModal(scene, runtime) {
  const modal = scene._hardcoreRuntime?.modal;
  if (!modal || modal.isVisible) {
    runtime.system.cancelConsumptionAttempt();
    return false;
  }
  const copy = STAR_SANCTUARY_COPY.acknowledgement;
  enterHardcoreBlockingModal(scene);
  runtime.acknowledgementModalOpen = true;
  const shown = modal.showConfirmation({
    title: copy.title,
    subtitle: copy.subtitle,
    body: copy.body,
    footer: copy.footer,
    footerColor: copy.footerColor,
    confirmationWord: copy.confirmationWord,
    typedInstruction: copy.typedInstruction,
    onConfirm: () => {
      const accepted = runtime.system.acknowledgeConsumptionRisk();
      if (!accepted) return false;
      runtime.acknowledgementStore.acknowledge();
      finishAcknowledgementModal(scene, runtime);
      return true;
    },
    onCancel: () => {
      runtime.system.cancelConsumptionAttempt();
      finishAcknowledgementModal(scene, runtime);
    },
  });
  if (shown) return true;
  runtime.system.cancelConsumptionAttempt();
  finishAcknowledgementModal(scene, runtime);
  return false;
}

function resolveConsumptionInput(scene) {
  const keys = scene.inputHandler?.getKeys?.() || {};
  const mouse = scene.inputHandler?.getMouseDigSnapshot?.() || null;
  const consumptionHeld = keys.mine?.isDown === true
    || mouse?.pointerHeld === true;
  const consumptionTarget = consumptionHeld
    ? scene.inputHandler?.stableMineTarget
      || mouse?.committedTarget
      || scene.inputHandler?.resolveAimTargetTile?.()
      || null
    : null;
  return { consumptionHeld, consumptionTarget };
}

function processEvents(scene, runtime) {
  const feedback = runtime.config.feedback;
  for (const event of runtime.system.drainEvents()) {
    if (event.type === "star-consumption-acknowledgement-required") {
      showAcknowledgementModal(scene, runtime);
      continue;
    }
    if (event.type === "star-consumption-acknowledged") {
      showFeedback(
        scene,
        feedback.acknowledgementAccepted,
        feedback.warningColor,
        feedback.warningDurationMs,
      );
      continue;
    }
    if (event.type === "star-consumption-acknowledgement-cancelled") {
      showFeedback(
        scene,
        feedback.acknowledgementCancelled,
        feedback.refugeColor,
        feedback.messageDurationMs,
      );
      continue;
    }
    if (event.type === "star-refuge-entered") {
      showFeedback(
        scene,
        formatCopy(feedback.refugeEntered, event.profile),
        event.profile.identityPrimary || feedback.refugeColor,
        feedback.messageDurationMs,
      );
      continue;
    }
    if (event.type === "star-refuge-charging") {
      showFeedback(
        scene,
        formatCopy(feedback.charging, event.profile),
        feedback.chargingColor,
        feedback.messageDurationMs,
      );
      continue;
    }
    if (event.type === "star-consumption-warning") {
      showFeedback(
        scene,
        feedback.warning,
        feedback.warningColor,
        feedback.warningDurationMs,
      );
      continue;
    }
    if (event.type === "star-consumption-confirmed") {
      showFeedback(
        scene,
        feedback.confirmed,
        feedback.warningColor,
        feedback.messageDurationMs,
      );
      continue;
    }
    if (event.type === "star-consumed") {
      runtime.view.startSpread(event.profile, scene.time?.now || 0);
      continue;
    }
    if (event.type === "star-scar-entered") {
      showFeedback(
        scene,
        feedback.scarEntered,
        feedback.scarColor,
        feedback.messageDurationMs,
      );
    }
  }
}

function updateDiagnostics(scene, runtime) {
  if (typeof window === "undefined") return;
  const key = runtime.config.diagnostics.globalKey;
  if (scene.config?.debugMode !== true) {
    delete window[key];
    return;
  }
  window[key] = {
    ...runtime.system.getSnapshot(),
    view: runtime.view.getSnapshot(),
    holdView: runtime.holdView.getSnapshot(),
  };
}

function installComposedDamageGuard(scene, runtime) {
  const worldModel = scene.worldModel;
  if (!worldModel?.setTileDamageGuard) return;
  if (worldModel.tileDamageGuard === runtime.composedDamageGuard) return;
  runtime.downstreamDamageGuard = worldModel.tileDamageGuard;
  runtime.composedDamageGuard = context => (
    runtime.system.shouldBlockDamage(context, scene.time?.now || 0)
    || runtime.downstreamDamageGuard?.(context) === true
  );
  worldModel.setTileDamageGuard(runtime.composedDamageGuard);
}

export function createStarSanctuaryRuntime(scene) {
  if (scene._starSanctuaryRuntime) return scene._starSanctuaryRuntime;
  const config = STAR_SANCTUARY_CONFIG;
  const acknowledgementStore = new StarConsumptionAcknowledgementStore(
    scene.saveSlot,
  );
  const system = new StarSanctuarySystem(scene.worldModel, config, {
    consumptionAcknowledged: acknowledgementStore.isAcknowledged(),
    territorySystem: scene.worldMapStarTerritorySystem,
  });
  const resourceDepletionProvider = ({ tileX, tileY } = {}) => (
    system.isResourceDepletedAt(tileX, tileY)
  );
  scene.digSystem?.setResourceDepletionProvider?.(
    resourceDepletionProvider,
  );
  const scarAssetCache = scene.load?.on && scene.textures?.exists
    ? new WorldVisualAssetCache(scene, { deferTextureRelease: true })
    : null;
  const runtime = {
    config,
    system,
    acknowledgementStore,
    view: new StarlessScarView(
      scene,
      scene.worldModel,
      config,
      { assetCache: scarAssetCache },
    ),
    scarAssetCache,
    holdView: new StarConsumptionHoldView(scene, config),
    acknowledgementModalOpen: false,
    lastGpPulseAt: 0,
    downstreamDamageGuard: null,
    composedDamageGuard: null,
    resourceDepletionProvider,
  };
  scene._starSanctuaryRuntime = runtime;
  scene.starSanctuarySnapshot = system.getSnapshot();
  updateDiagnostics(scene, runtime);
  return runtime;
}

export function updateStarSanctuaryRuntime(
  scene,
  time,
  delta,
  playerTile = null,
) {
  const runtime = scene._starSanctuaryRuntime;
  if (!runtime) return null;
  installComposedDamageGuard(scene, runtime);
  const body = scene.playerController?.physicsBody;
  const tileSize = Math.max(1, Number(scene.config?.tileSize) || 1);
  const speedTilesPerSecond = body
    ? Math.hypot(Number(body.vx) || 0, Number(body.vy) || 0) / tileSize
    : 0;
  const abilities = scene.playerController?.abilities;
  const consumptionInput = resolveConsumptionInput(scene);
  const snapshot = runtime.system.update(delta, {
    nowMs: time,
    playerTile,
    gameplayActive: scene.gameState === "playing",
    speedTilesPerSecond,
    gpUnlocked: scene.upgradeSystem?.isGemPowerUnlocked?.() === true,
    gpCurrent: abilities?.getGemPowerExact?.() || 0,
    gpMaximum: abilities?.getGemPowerMax?.() || 0,
    restoreGemPower: (amount, context) => (
      abilities?.restoreGemPower?.(amount, context) || 0
    ),
    ...consumptionInput,
  });
  scene.starSanctuarySnapshot = snapshot;
  processEvents(scene, runtime);
  if (
    snapshot.gpRestored > 0
    && time - runtime.lastGpPulseAt >= runtime.config.refuge.gpPulseIntervalMs
  ) {
    runtime.lastGpPulseAt = time;
    scene.hudSystem?.pulseGemPower?.();
  }
  runtime.holdView.update(snapshot.pendingConsumption);
  runtime.view.update();
  updateDiagnostics(scene, runtime);
  return snapshot;
}

export function shouldProtectStarDamage(scene, context) {
  return scene._starSanctuaryRuntime?.system?.shouldBlockDamage?.(
    context,
    scene.time?.now || 0,
  ) === true;
}

export function destroyStarSanctuaryRuntime(scene) {
  const runtime = scene._starSanctuaryRuntime;
  if (!runtime) return;
  if (runtime.acknowledgementModalOpen) {
    scene._hardcoreRuntime?.modal?.close?.({ cancelled: true });
    if (runtime.acknowledgementModalOpen) {
      finishAcknowledgementModal(scene, runtime);
    }
  }
  scene._starSanctuaryRuntime = null;
  scene.starSanctuarySnapshot = null;
  if (typeof window !== "undefined") {
    delete window[runtime.config.diagnostics.globalKey];
  }
  if (scene.worldModel?.tileDamageGuard === runtime.composedDamageGuard) {
    scene.worldModel.setTileDamageGuard?.(runtime.downstreamDamageGuard);
  }
  if (
    scene.digSystem?.resourceDepletionProvider
    === runtime.resourceDepletionProvider
  ) {
    scene.digSystem.setResourceDepletionProvider?.(null);
  }
  runtime.holdView?.destroy();
  runtime.view?.destroy();
  runtime.scarAssetCache?.destroy();
  runtime.system?.destroy();
  runtime.acknowledgementStore = null;
}
