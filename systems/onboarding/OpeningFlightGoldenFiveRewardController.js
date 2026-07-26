import { OPENING_FLIGHT_STAGES } from "../../values/openingFlightArtifact.js";
import { getOpeningFlightCacheCenterWorld } from "./openingFlightGoldenFiveGeometry.js";

export class OpeningFlightGoldenFiveRewardController {
  constructor(runtime) {
    this.runtime = runtime;
    this.completionTimer = null;
  }

  recoverInterruptedReward() {
    const { state } = this.runtime;
    if (state.cacheCollected && !state.rewardGranted) this.grantCacheReward();
  }

  grantCacheReward() {
    const runtime = this.runtime;
    const { scene, config, state, view } = runtime;
    if (state.rewardGranted) return;
    const cache = config.cache;
    scene.upgradeSystem?.grantUpgrade?.(
      cache.tankUpgradeId,
      cache.tankUpgradeLevel,
    );
    scene.upgradeSystem?.addMoney?.(cache.money);

    const current = scene.digSystem?.getResourceTotals?.() || {};
    const next = { ...current };
    for (const [resource, amount] of Object.entries(cache.resources)) {
      next[resource] = Math.max(0, Number(next[resource]) || 0) + amount;
    }
    scene.digSystem?.setResourceTotals?.(next);
    const level = Math.max(1, Number(scene.playerLevelSystem?.level) || 1);
    if (level < cache.minimumPlayerLevel) {
      scene.playerLevelSystem?.gainLevel?.(cache.minimumPlayerLevel - level);
    }

    state.rewardGranted = true;
    state.onboardingComplete = true;
    state.stage = OPENING_FLIGHT_STAGES.COMPLETE;
    scene.playerController?.abilities?.fillGemPower?.();
    const resources = scene.digSystem?.getResourceTotals?.() || next;
    scene.uiResourceBar?.setResources?.(resources);
    scene.uiInventoryPopup?.setResources?.(resources);
    view.celebrateCache();
    view.showHud({
      phase: config.copy.phaseComplete,
      title: config.copy.completeTitle,
      body: config.copy.completeBody,
      progress: 1,
      accent: "gold",
    });
    scene.soundSystem?.playUiConfirm?.();
    scene.uiNotifications?.success?.(
      config.copy.cacheReward,
      { durationMs: config.feedback.cacheToastDurationMs },
    );
    const cacheWorld = getOpeningFlightCacheCenterWorld(scene, config);
    scene.floatingTextSystem?.showFloatingText?.(
      cacheWorld.x,
      cacheWorld.y,
      config.copy.cacheFloatingReward,
      config.feedback.gold,
      config.feedback.cacheDurationMs,
      config.feedback.cacheFontSize,
    );
    scene.hudSystem?.flashStatus?.(
      config.copy.completeBody,
      config.feedback.cyan,
      config.feedback.completeStatusDurationMs,
    );
    this.completionTimer = scene.time?.delayedCall?.(
      config.presentation.completionHideDelayMs,
      () => view?.hideHud(),
    ) || null;
    scene.queueDugTilesSave?.();
  }

  destroy() {
    this.completionTimer?.remove?.(false);
    this.completionTimer = null;
    this.runtime = null;
  }
}
