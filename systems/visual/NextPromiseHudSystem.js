import { RETENTION_CONFIG } from "../../values/retentionConfig.js";
import { getCargoSellValue } from "../../values/resourcePrices.js";
import { USER_SETTINGS } from "../UserSettings.js";

function formatMoney(value) {
  return `${Math.max(0, Math.floor(Number(value) || 0)).toLocaleString()} M`;
}

export class NextPromiseHudSystem {
  constructor(scene) {
    this.scene = scene;
    this.config = RETENTION_CONFIG.hud;
    this.lastRefreshAt = -Infinity;
    this.lastSignature = "";

    this.root = scene.add.container(this.config.x, 0)
      .setScrollFactor(0)
      .setDepth(this.config.depth);
    this.background = scene.add.graphics();
    this.promiseText = scene.add.text(
      this.config.paddingX,
      this.config.promiseY,
      "",
      {
        fontFamily: "Bahnschrift SemiCondensed, Trebuchet MS, sans-serif",
        fontSize: this.config.promiseFontSize,
        fontStyle: "bold",
        color: this.config.promiseColor,
      }
    ).setOrigin(0, 0.5);
    this.detailText = scene.add.text(
      this.config.paddingX,
      this.config.detailY,
      "",
      {
        fontFamily: "Consolas, monospace",
        fontSize: this.config.detailFontSize,
        color: this.config.detailColor,
      }
    ).setOrigin(0, 0.5);
    this.root.add([this.background, this.promiseText, this.detailText]);
    this._layout();
  }

  _layout() {
    const height = this.config.height;
    const viewportHeight = this.scene.scale?.height || 720;
    this.root.setPosition(this.config.x, viewportHeight - this.config.bottom - height);
    this.background.clear();
    this.background.fillStyle(this.config.backgroundColor, this.config.backgroundAlpha);
    this.background.fillRoundedRect(0, 0, this.config.width, height, 7);
    this.background.lineStyle(1, this.config.borderColor, this.config.borderAlpha);
    this.background.strokeRoundedRect(0, 0, this.config.width, height, 7);
  }

  update(nowMs) {
    if (!this.root?.active || nowMs - this.lastRefreshAt < this.config.refreshMs) return;
    this.lastRefreshAt = nowMs;
    const tutorialPromise = this.scene.townSquareTutorialSystem
      ?.getNextPromiseOverride?.() || null;
    const hidden = this.scene.gameState !== "playing"
      || this.scene.shopOverlay?.isVisible
      || this.scene.levelUpPopup?.visible
      || this.scene.milestoneBoardSystem?._isBoardOpen
      || this.scene.campfireSystem?.isSelecting?.()
      || this.scene._pillarViewActive
      || (this.scene.townSquareTutorialSystem?.isShowingGuide?.()
        && !tutorialPromise);
    this.root.setVisible(!hidden);
    if (hidden) return;

    const eventPromise = this.scene.randomEventBridge?.getNextPromiseOverride?.() || null;
    const systemPromise = this.scene.systemIntroductionSystem?.getNextPromiseOverride?.() || null;
    const priorityPromise = tutorialPromise || eventPromise || systemPromise;
    const retention = this.scene.retentionProgressSystem;
    if (!retention && !priorityPromise) {
      this.root.setVisible(false);
      return;
    }

    const now = this.scene.time?.now || nowMs;
    const chestSeconds = Math.ceil(retention.getChestCritBuffRemaining(now) / 1000);
    const objective = retention.getObjective();
    const showObjective = USER_SETTINGS.getDisplay().showSessionObjective !== false;
    const nextMilestone = this.scene.milestoneBoardSystem?.getNextMilestone?.();
    const deepestPortal = this.scene.specialTileSystem?.getDeepestPortal?.();
    const playerTile = this.scene.playerController?.getPlayerTile?.();
    const atTown = playerTile
      && playerTile.ty >= this.scene.config.topAirRows - 4
      && playerTile.ty <= this.scene.config.topAirRows;

    let promise = "";
    if (priorityPromise) {
      promise = priorityPromise.promise;
    } else if (chestSeconds > 0) {
      promise = `TREASURE FURY  •  ${chestSeconds}s ultra crit damage`;
    } else if (showObjective && !objective.complete) {
      promise = `SESSION  •  ${objective.label}  ${Math.floor(objective.progress)}/${objective.target}`;
    } else if (atTown && deepestPortal) {
      promise = `QUICK RESUME  •  ${deepestPortal.label}`;
    } else if (nextMilestone) {
      const remaining = Math.max(0, nextMilestone.depth - retention.getBestDepth());
      promise = `NEXT MILESTONE  •  ${nextMilestone.name} in ${remaining}m`;
    } else {
      const level = this.scene.playerLevelSystem?.level || 1;
      promise = `NEXT PROMISE  •  Reach level ${level + 1}`;
    }

    const resources = this.scene.digSystem?.getResourceTotals?.() || {};
    const effects = this.scene.upgradeSystem?.getUpgradeEffects?.() || {};
    const cargoValue = this.scene.randomEventBridge?.quoteCargoValue?.(resources, effects)
      ?? getCargoSellValue(resources, effects);
    const detail = priorityPromise?.detail || (
      `${this.config.cargoPrefix}  ${formatMoney(cargoValue)}`
      + (deepestPortal ? `  •  DEEPEST ${deepestPortal.depth}m` : "")
    );
    const signature = `${promise}|${detail}`;
    if (signature !== this.lastSignature) {
      this.lastSignature = signature;
      this.promiseText.setText(promise);
      this.detailText.setText(detail);
    }
  }

  resize() {
    this._layout();
  }

  destroy() {
    this.root?.destroy(true);
    this.root = null;
    this.scene = null;
  }
}
