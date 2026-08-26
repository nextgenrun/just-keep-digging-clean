import { RETENTION_CONFIG } from "../../values/retentionConfig.js";
import { getCargoSellValue } from "../../values/resourcePrices.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
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
    this.background = scene.add.image(
      this.config.width / 2,
      this.config.height / 2,
      ASSET_KEYS.ui.approvedHud.tutorialCurrentAction,
    ).setDisplaySize(this.config.width, this.config.height);
    this.badgeKicker = scene.add.text(
      this.config.badgeX,
      this.config.badgeKickerY,
      "CURRENT",
      {
        fontFamily: APPROVED_HUD_SKIN.font.family,
        fontSize: this.config.badgeKickerFontSize,
        fontStyle: "bold",
        color: this.config.badgeKickerColor,
        stroke: APPROVED_HUD_SKIN.font.shadow,
        strokeThickness: APPROVED_HUD_SKIN.font.strokeThickness,
        align: "center",
      },
    ).setOrigin(0.5);
    this.badgeValue = scene.add.text(
      this.config.badgeX,
      this.config.badgeValueY,
      "GOAL",
      {
        fontFamily: APPROVED_HUD_SKIN.font.family,
        fontSize: this.config.badgeValueFontSize,
        fontStyle: "bold",
        color: this.config.badgeValueColor,
        stroke: APPROVED_HUD_SKIN.font.shadow,
        strokeThickness: APPROVED_HUD_SKIN.font.strokeThickness,
        align: "center",
      },
    ).setOrigin(0.5);
    this.promiseText = scene.add.text(
      this.config.paddingX,
      this.config.promiseY,
      "",
      {
        fontFamily: APPROVED_HUD_SKIN.font.family,
        fontSize: this.config.promiseFontSize,
        fontStyle: "bold",
        color: this.config.promiseColor,
        stroke: APPROVED_HUD_SKIN.font.shadow,
        strokeThickness: APPROVED_HUD_SKIN.font.strokeThickness,
      }
    ).setOrigin(0, 0.5);
    this.detailText = scene.add.text(
      this.config.paddingX,
      this.config.detailY,
      "",
      {
        fontFamily: APPROVED_HUD_SKIN.font.family,
        fontSize: this.config.detailFontSize,
        color: this.config.detailColor,
        stroke: APPROVED_HUD_SKIN.font.shadow,
        strokeThickness: APPROVED_HUD_SKIN.font.strokeThickness,
      }
    ).setOrigin(0, 0.5);
    this.root.add([
      this.background,
      this.badgeKicker,
      this.badgeValue,
      this.promiseText,
      this.detailText,
    ]);
    this._layout();
  }

  _resolveBadge(tutorialPromise, eventPromise, systemPromise, promise, priorityPromise) {
    if (tutorialPromise) {
      const step = /^STEP\s+(\d+)/i.exec(promise)?.[1];
      return { kicker: "GUIDE", value: step ? `${step} / 7` : "ROUTE" };
    }
    if (priorityPromise?.badgeKicker && priorityPromise?.badgeValue) {
      return {
        kicker: priorityPromise.badgeKicker,
        value: priorityPromise.badgeValue,
      };
    }
    if (eventPromise) return { kicker: "WORLD", value: "EVENT" };
    if (systemPromise) return { kicker: "NEXT", value: "UNLOCK" };
    return { kicker: "CURRENT", value: "GOAL" };
  }

  _fitText(textObject, value, baseFontSize, minimumFontSize) {
    const baseSize = Math.max(1, Number.parseFloat(baseFontSize) || 1);
    textObject.setFontSize(baseSize).setText(value);
    if (textObject.width <= this.config.textWidth) return;
    const fittedSize = Math.max(
      minimumFontSize,
      Math.floor(baseSize * this.config.textWidth / textObject.width),
    );
    textObject.setFontSize(fittedSize);
  }

  _layout() {
    const height = this.config.height;
    const viewportHeight = this.scene.scale?.height || 720;
    this.root.setPosition(this.config.x, viewportHeight - this.config.bottom - height);
    this.background
      .setPosition(this.config.width / 2, height / 2)
      .setDisplaySize(this.config.width, height);
  }

  update(nowMs) {
    if (!this.root?.active || nowMs - this.lastRefreshAt < this.config.refreshMs) return;
    this.lastRefreshAt = nowMs;
    const tutorialPromise = this.scene.townSquareTutorialSystem
      ?.getNextPromiseOverride?.() || null;
    const hidden = this.scene.gameState !== "playing"
      || this.scene.shopOverlay?.isVisible
      || this.scene.milestoneBoardSystem?._isBoardOpen
      || this.scene.campfireSystem?.isSelecting?.()
      || this.scene._pillarViewActive
      || (this.scene.townSquareTutorialSystem?.isShowingGuide?.()
        && !tutorialPromise);
    this.root.setVisible(!hidden);
    if (hidden) return;

    const eventPromise = this.scene.randomEventBridge?.getNextPromiseOverride?.() || null;
    const mechanicPromise = this.scene.contextualMechanicTutorialSystem
      ?.getNextPromiseOverride?.() || null;
    const systemPromise = this.scene.systemIntroductionSystem?.getNextPromiseOverride?.() || null;
    const priorityPromise = tutorialPromise || mechanicPromise || eventPromise || systemPromise;
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
    const badge = this._resolveBadge(
      tutorialPromise,
      eventPromise,
      systemPromise,
      promise,
      priorityPromise,
    );
    const signature = `${badge.kicker}|${badge.value}|${promise}|${detail}`;
    if (signature !== this.lastSignature) {
      this.lastSignature = signature;
      this.badgeKicker.setText(badge.kicker);
      this.badgeValue.setText(badge.value);
      this._fitText(
        this.promiseText,
        promise,
        this.config.promiseFontSize,
        this.config.promiseMinimumFontSizePx,
      );
      this._fitText(
        this.detailText,
        detail,
        this.config.detailFontSize,
        this.config.detailMinimumFontSizePx,
      );
    }
  }

  resize() {
    this._layout();
  }

  getHealthSnapshot() {
    return {
      active: this.root?.active === true,
      visible: this.root?.visible === true,
      x: this.root?.x || 0,
      y: this.root?.y || 0,
      width: this.background?.displayWidth || 0,
      height: this.background?.displayHeight || 0,
      textureKey: this.background?.texture?.key || null,
      badge: `${this.badgeKicker?.text || ""} ${this.badgeValue?.text || ""}`.trim(),
      promise: this.promiseText?.text || "",
      detail: this.detailText?.text || "",
    };
  }

  destroy() {
    this.root?.destroy(true);
    this.root = null;
    this.scene = null;
  }
}
