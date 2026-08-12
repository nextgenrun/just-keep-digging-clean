import { OPENING_FLIGHT_STAGES } from "../../values/openingFlightArtifact.js";
import { interpolateOpeningFlightCopy } from "./openingFlightGoldenFiveCopy.js";
import { validateRewardMutation } from "../../values/progressionInvariants.js";
import { reportProgressionInvariantFailure } from "../health/progressionInvariantReporter.js";

export class OpeningFlightGoldenFiveRewardController {
  constructor(runtime) {
    this.runtime = runtime;
  }

  recoverInterruptedReward() {
    const { state } = this.runtime;
    if (state.cacheCollected && !state.rewardGranted) this.grantCacheReward();
  }

  grantCacheReward() {
    const runtime = this.runtime;
    const { scene, config, state, view } = runtime;
    if (state.rewardGranted) return false;
    const cache = config.cache;
    const rewardValidation = validateRewardMutation({
      id: "opening-flight-cache",
      amounts: {
        money: cache.money,
        levels: cache.minimumPlayerLevel,
        ...cache.resources,
      },
    });
    if (!rewardValidation.ok) {
      reportProgressionInvariantFailure({
        authority: "opening-flight-reward",
        reason: rewardValidation.reason,
        value: cache.money,
      });
      return false;
    }
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

    // Cache pickup completes the guided route. Discard any banked tutorial
    // time so the free-flight provider cannot stay active after its updater
    // exits through the cacheCollected branch.
    state.trialRemainingMs = 0;
    state.trialComplete = true;
    state.rewardGranted = true;
    state.onboardingComplete = true;
    state.stage = OPENING_FLIGHT_STAGES.COMPLETE;
    scene.playerController?.abilities?.fillGemPower?.();
    const resources = scene.digSystem?.getResourceTotals?.() || next;
    scene.uiResourceBar?.setResources?.(resources);
    scene.uiInventoryPopup?.setResources?.(resources);
    const rewardTokens = {
      gpCapacity: cache.gpCapacityAmount,
      money: cache.money,
      minimumLevel: cache.minimumPlayerLevel,
      ...cache.resources,
    };
    view.celebrateCache();
    view.hideHud();
    view.hideRewardReveal({ instant: true });
    scene.soundSystem?.playUiConfirm?.();
    scene.uiNotifications?.success?.(
      [
        interpolateOpeningFlightCopy(config.copy.cacheReward, rewardTokens),
        interpolateOpeningFlightCopy(
          config.copy.rewardRevealResources,
          rewardTokens,
        ),
        interpolateOpeningFlightCopy(
          config.copy.rewardRevealFooter,
          rewardTokens,
        ),
      ].join("  •  "),
      {
        title: config.copy.rewardRevealTitle,
        key: config.feedback.cacheNotificationKey,
      },
    );
    scene.queueDugTilesSave?.();
    return true;
  }

  destroy() {
    this.runtime = null;
  }
}
