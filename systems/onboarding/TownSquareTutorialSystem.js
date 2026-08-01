import { USER_SETTINGS } from "../UserSettings.js";
import {
  RETENTION_CONFIG,
  TOWN_TUTORIAL_CHOICES,
  TOWN_TUTORIAL_STAGES,
} from "../../values/retentionConfig.js";
import {
  getTownTutorialDigSite,
  prepareTownTutorialDigSite,
} from "./TownSquareTutorialDigSite.js";
import { FirstFiveMinutesTutorialBridge } from "./FirstFiveMinutesTutorialBridge.js";
import { TownSquareTutorialView } from "./TownSquareTutorialView.js";

function interpolateText(value, replacements = {}) {
  const labels = {
    left: USER_SETTINGS.getKeyLabel("moveLeft"),
    right: USER_SETTINGS.getKeyLabel("moveRight"),
    down: USER_SETTINGS.getKeyLabel("aimDown"),
    mine: USER_SETTINGS.getKeyLabel("dig"),
    interact: USER_SETTINGS.getKeyLabel("interact"),
    fly: USER_SETTINGS.getKeyLabel("fly"),
    ...replacements,
  };
  return String(value).replace(
    /\{(\w+)\}/g,
    (_, token) => labels[token] ?? token,
  );
}

function interpolateCopy(copy, replacements = {}) {
  return Object.fromEntries(
    Object.entries(copy).map(([key, value]) => [
      key,
      interpolateText(value, replacements),
    ]),
  );
}

export class TownSquareTutorialSystem {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.retention = scene.retentionProgressSystem;
    this.view = new TownSquareTutorialView(scene);
    this.firstFive = new FirstFiveMinutesTutorialBridge(
      scene,
      this.retention,
      this.view,
      interpolateCopy,
      options,
    );
    this.lastStage = null;
    this.moveOriginX = null;
    this._flightSaveElapsedMs = 0;
  }

  create() {
    this.scene.playerController?.abilities?.setFreeFlightProvider?.(
      () => this.isFreeFlightActive(),
    );
    this._syncStage(true);
    this.firstFive.create();
  }

  update(deltaMs) {
    const state = this.retention?.getTutorialState?.();
    if (!state) return;

    if (state.stage === TOWN_TUTORIAL_STAGES.MOVE) {
      const bodyX = this.scene.playerController?.physicsBody?.x;
      if (Number.isFinite(bodyX)) {
        if (!Number.isFinite(this.moveOriginX)) this.moveOriginX = bodyX;
        const distanceTiles = Math.abs(bodyX - this.moveOriginX)
          / this.scene.config.tileSize;
        if (this.retention.recordTutorialMovement(distanceTiles)) {
          this.scene.queueDugTilesSave?.();
        }
      }
    }

    this._syncStage(false);
    this._updateFreeFlight(deltaMs);
    this.firstFive.update();
  }

  isShowingGuide() {
    return this.retention?.isTutorialActive?.() === true
      || this.firstFive.hasPersistentGuide();
  }

  isFreeFlightActive() {
    return this.retention?.isTutorialFreeFlightActive?.() === true;
  }

  isFirstFiveEnabled() {
    return this.firstFive.isEnabled();
  }

  getNextPromiseOverride() {
    return this.firstFive.getNextPromiseOverride();
  }

  getFocusedUpgradeId(merchantId) {
    return this.firstFive.getFocusedUpgradeId(merchantId);
  }

  isUpgradeAvailable(upgradeId) {
    return this.firstFive.isUpgradeAvailable(upgradeId);
  }

  getPreferredMerchantMode(merchantId) {
    return this.firstFive.getPreferredMerchantMode(merchantId);
  }

  getUpgradePreview(upgradeId) {
    return this.firstFive.getUpgradePreview(upgradeId);
  }

  isDescentBlocked() {
    return this.firstFive.isDescentBlocked();
  }

  handleDescentBlocked() {
    this.firstFive.handleDescentBlocked();
  }

  enforceSurfaceSafety() {
    return this.firstFive.enforceSurfaceSafety();
  }

  getHealthSnapshot() {
    return this.firstFive.getHealthSnapshot();
  }

  resize() {
    this.view?.resize();
  }

  _syncStage(initial) {
    const state = this.retention?.getTutorialState?.();
    const stage = state?.stage;
    if (!stage || stage === this.lastStage) return;
    const previous = this.lastStage;
    this.lastStage = stage;
    this._enterStage(stage, {
      celebrate: !initial
        && RETENTION_CONFIG.tutorial.activeStages.includes(previous),
    });
  }

  _enterStage(stage, { celebrate = false } = {}) {
    const copy = RETENTION_CONFIG.tutorial.copy[stage];
    if (RETENTION_CONFIG.tutorial.activeStages.includes(stage) && copy) {
      if (this.firstFive.isEnabled()) this.view.closeGuideNotification();
      else this.view.showGuide(interpolateCopy(copy));
    } else {
      if (this.firstFive.isEnabled()) this.view.closeGuideNotification();
      else this.view.hideGuide();
    }
    const firstFiveHandled = this.firstFive.onStageEntered(stage);

    if (stage === TOWN_TUTORIAL_STAGES.MOVE) {
      this.moveOriginX = this.scene.playerController?.physicsBody?.x ?? null;
      if (!firstFiveHandled) this.view.clearMarker();
      return;
    }
    if (stage === TOWN_TUTORIAL_STAGES.DIG) {
      const site = prepareTownTutorialDigSite(this.scene)
        || getTownTutorialDigSite(this.scene);
      const tileSize = this.scene.config.tileSize;
      this.view.pointAt(
        (site.tx + 0.5) * tileSize,
        site.ty * tileSize + RETENTION_CONFIG.tutorial.ui.digMarkerOffsetYPx,
      );
      return;
    }
    if (stage === TOWN_TUTORIAL_STAGES.SELL) {
      this._grantStarterReward();
      this._pointAtMerchant(RETENTION_CONFIG.tutorial.merchants.sell);
      return;
    }
    if (stage === TOWN_TUTORIAL_STAGES.UPGRADE) {
      this._pointAtMerchant(RETENTION_CONFIG.tutorial.merchants.upgrade);
      return;
    }
    if (
      stage === TOWN_TUTORIAL_STAGES.COMPLETE
      || stage === TOWN_TUTORIAL_STAGES.SKIPPED
    ) {
      this.view.clearMarker();
      this._grantCompletionReward(
        celebrate && stage === TOWN_TUTORIAL_STAGES.COMPLETE,
      );
      this._ensureLegacyFlight(stage);
    }
  }

  _grantStarterReward() {
    const reward = this.retention.claimTutorialStarterReward();
    if (!reward) return;
    const resources = this.scene.digSystem?.getResourceTotals?.() || {};
    Object.entries(reward.resources).forEach(([type, amount]) => {
      resources[type] = Math.max(0, Number(resources[type]) || 0) + amount;
    });
    this.scene.digSystem?.setResourceTotals?.(resources);
    this.scene.upgradeSystem?.addMoney?.(reward.money);
    this.retention.recordMoneyEarned(reward.money);
    this.scene.uiResourceBar?.setResources?.(resources);
    this.scene.uiResourceBar?.setMoney?.(this.scene.upgradeSystem?.getMoney?.() || 0);
    this.scene.queueDugTilesSave?.();
  }

  _grantCompletionReward(showReward) {
    const reward = this.retention.claimTutorialCompletionReward();
    if (!reward) return;
    this.scene.upgradeSystem?.grantUpgrade?.(reward.flightUpgradeId);
    this.scene.armHardcoreAfterFlightUnlock?.("town-tutorial-reward");
    this.scene.upgradeSystem?.addMoney?.(reward.money);
    this.retention.recordMoneyEarned(reward.money);
    this.scene.playerController?.abilities?.fillGemPower?.();
    this.scene.uiResourceBar?.setMoney?.(this.scene.upgradeSystem?.getMoney?.() || 0);
    if (showReward && !this.firstFive.isEnabled()) {
      this.view.showCompletion(
        interpolateCopy(RETENTION_CONFIG.tutorial.copy.complete),
      );
      const [red, green, blue] = RETENTION_CONFIG.tutorial.ui.rewardFlashRgb;
      this.scene.cameras?.main?.flash?.(
        RETENTION_CONFIG.tutorial.ui.rewardFlashDurationMs,
        red,
        green,
        blue,
      );
    }
    this.scene.queueDugTilesSave?.();
  }

  _ensureLegacyFlight(stage) {
    const state = this.retention.getTutorialState();
    if (
      state.choice !== TOWN_TUTORIAL_CHOICES.LEGACY
      || stage === TOWN_TUTORIAL_STAGES.UNSELECTED
      || this.scene.upgradeSystem?.isGemPowerUnlocked?.() === true
    ) {
      return;
    }
    const upgradeId = RETENTION_CONFIG.tutorial.completionReward.flightUpgradeId;
    this.scene.upgradeSystem?.grantUpgrade?.(upgradeId);
    this.scene.armHardcoreAfterFlightUnlock?.("legacy-tutorial-migration");
    this.scene.playerController?.abilities?.fillGemPower?.();
    this.scene.queueDugTilesSave?.();
  }

  _pointAtMerchant(merchantId) {
    const sprite = this.scene.npcManager?.getNPCSprite?.(merchantId);
    if (!sprite) {
      this.view.clearMarker();
      return;
    }
    this.view.pointAt(
      sprite.x,
      sprite.y - Math.max(
        RETENTION_CONFIG.tutorial.ui.merchantMinimumHeightPx,
        sprite.displayHeight || 0,
      ) - RETENTION_CONFIG.tutorial.ui.merchantMarkerGapPx,
    );
  }

  _updateFreeFlight(deltaMs) {
    if (
      !this.isFreeFlightActive()
      || this.scene.playerController?.abilities?.isFlying?.() !== true
    ) {
      this._flightSaveElapsedMs = 0;
      return;
    }
    const consumed = this.retention.consumeTutorialFreeFlight(deltaMs);
    if (consumed <= 0) return;
    this._flightSaveElapsedMs += consumed;
    if (
      this._flightSaveElapsedMs
        >= RETENTION_CONFIG.tutorial.ui.freeFlightSaveIntervalMs
      || !this.isFreeFlightActive()
    ) {
      this._flightSaveElapsedMs = 0;
      this.scene.queueDugTilesSave?.();
    }
  }

  destroy() {
    this.firstFive?.destroy();
    this.firstFive = null;
    this.scene?.playerController?.abilities?.setFreeFlightProvider?.(null);
    this.view?.destroy();
    this.view = null;
    this.retention = null;
    this.scene = null;
  }
}
