import { eventScreenPoint } from "./eventScreenLayout.js";
import { fitBakedUiImage, fitLiveUiText } from "./bakedUiArt.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { EARTHQUAKE_FEEDBACK_CONFIG } from "../../values/earthquakeFeedback.js";
import {
  resolveEarthquakeFeedbackMode,
  resolveEarthquakeFeedbackPresentation,
} from "./earthquakeFeedbackPresentation.js";
const hexColor = value => `#${Number(value).toString(16).padStart(6, "0")}`;
export class EarthquakeFeedbackUI {
  constructor(scene, earthquakeSystem, config = EARTHQUAKE_FEEDBACK_CONFIG) {
    this.scene = scene;
    this.source = earthquakeSystem;
    this.config = config;
    this.escapeActive = false;
    this.escapeExpiresAt = 0;
    this.aftershockActive = false;
    this.aftershockExpiresAt = 0;
    this.mode = null;
    this.hiding = false;
    this.modeExpiresAt = 0;
    this.hideDeadline = 0;
    this.suppressedSourceState = null;
    this._lastSourceState = this.source?.state || "idle";
    this.destroyed = false;
    this._transitionToken = 0;
    this._notificationsShifted = false;
    this._notificationBaseY = scene.uiNotifications?.baseY;
    this._create();
  }

  _create() {
    const card = this.config.card;
    const font = APPROVED_HUD_SKIN.font;
    this.root = this.scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(this.config.hudDepth)
      .setVisible(false);
    this.panelArt = this.scene.add.image(
      0,
      0,
      this.config.assets.statusFrame.key,
    ).setDisplaySize(card.width, card.height);
    this.iconArt = this.scene.add.image(
      card.iconX,
      0,
      this.config.assets.medallion.key,
    ).setDisplaySize(card.iconSize, card.iconSize);
    fitBakedUiImage(this.iconArt, card.iconSize, card.iconSize);
    this._iconBaseScaleX = this.iconArt.scaleX;
    this._iconBaseScaleY = this.iconArt.scaleY;
    this.title = this.scene.add.text(card.textX, card.titleY, "", {
      fontFamily: font.family,
      fontSize: card.titleFontSize,
      fontStyle: "bold",
      color: font.gold,
      stroke: font.shadow,
      strokeThickness: font.strokeThickness,
    }).setOrigin(0, 0.5);
    this.detail = this.scene.add.text(card.textX, card.detailY, "", {
      fontFamily: font.family,
      fontSize: card.detailFontSize,
      color: font.secondary,
      stroke: font.shadow,
      strokeThickness: 1,
      wordWrap: { width: card.textWidth, useAdvancedWrap: false },
    }).setOrigin(0, 0.5);
    this.root.add([this.panelArt, this.iconArt, this.title, this.detail]);

    this._onResize = () => this._layout();
    this.scene.scale?.on?.("resize", this._onResize);
    this._layout();
  }

  beginEvent() {
    this.escapeActive = false;
    this.escapeExpiresAt = 0;
    this.aftershockActive = false;
    this.aftershockExpiresAt = 0;
    this.suppressedSourceState = null;
  }

  activateAftershockWarning() {
    this.aftershockActive = true;
    this.aftershockExpiresAt = this._now()
      + this.config.timing.aftershockVisibleMs;
    this.update();
  }

  activateEscapeObjective() {
    const sourceState = this.source?.state || "idle";
    if (sourceState !== "idle") this.suppressedSourceState = sourceState;
    this.escapeActive = true;
    this.escapeExpiresAt = this._now() + this.config.timing.escapeVisibleMs;
    this.update();
  }

  clearEscapeObjective() {
    this.escapeActive = false;
    this.escapeExpiresAt = 0;
    this.update();
  }

  reset() {
    this.escapeActive = false;
    this.escapeExpiresAt = 0;
    this.aftershockActive = false;
    this.aftershockExpiresAt = 0;
    this.mode = null;
    this.hiding = false;
    this.modeExpiresAt = 0;
    this.hideDeadline = 0;
    this.suppressedSourceState = null;
    this._lastSourceState = this.source?.state || "idle";
    this._transitionToken += 1;
    this.scene.tweens?.killTweensOf?.([this.root, this.iconArt]);
    this._setVisible(false);
  }

  update() {
    if (this.destroyed || !this.config.enabled) return;
    const now = this._now();
    if (this.hiding && now >= this.hideDeadline) this._setVisible(false);
    const sourceState = this.source?.state || "idle";
    if (sourceState !== this._lastSourceState) {
      this._lastSourceState = sourceState;
      this.suppressedSourceState = null;
    }
    if (this.escapeActive && now >= this.escapeExpiresAt) {
      this.escapeActive = false;
      this.escapeExpiresAt = 0;
    }
    if (this.aftershockActive && now >= this.aftershockExpiresAt) {
      this.aftershockActive = false;
      this.aftershockExpiresAt = 0;
    }
    if (
      this.mode === sourceState
      && Number.isFinite(this.modeExpiresAt)
      && now >= this.modeExpiresAt
    ) {
      this.suppressedSourceState = sourceState;
      this._hide();
      return;
    }

    const nextMode = resolveEarthquakeFeedbackMode({
      escapeActive: this.escapeActive,
      aftershockActive: this.aftershockActive,
      state: sourceState,
      suppressedSourceState: this.suppressedSourceState,
      source: this.source,
    });
    if (!nextMode) {
      this._hide();
      return;
    }
    if (nextMode !== this.mode) this._enterMode(nextMode);
    this._render(nextMode, now);
  }

  _enterMode(mode) {
    this.mode = mode;
    this.hiding = false;
    const visibleMs = this.config.timing.phaseVisibleMs?.[mode];
    this.modeExpiresAt = Number.isFinite(visibleMs)
      ? this._now() + visibleMs
      : Number.POSITIVE_INFINITY;
    const token = ++this._transitionToken;
    this.scene.tweens?.killTweensOf?.([this.root, this.iconArt]);
    this._layout();
    this._setVisible(true);
    this.root.setAlpha?.(0);
    this.root.y += this.config.card.enterOffsetY;
    if (!this.scene.tweens?.add) {
      this.root.setAlpha?.(1);
      this._layout();
      this._restoreIconScale();
      return;
    }
    const finalY = this._modeY(mode);
    this.scene.tweens.add({
      targets: this.root,
      alpha: 1,
      y: finalY,
      duration: this.config.timing.enterMs,
      ease: "Sine.easeOut",
      onComplete: () => {
        if (token === this._transitionToken) this.root.setPosition(this._viewportWidth() / 2, finalY);
      },
    });
  }

  _hide() {
    if (this.hiding || (!this.mode && !this.root?.visible)) return;
    this.mode = null;
    this.hiding = true;
    this.hideDeadline = this._now()
      + this.config.timing.exitMs
      + this.config.timing.hideFailsafePaddingMs;
    const token = ++this._transitionToken;
    this.scene.tweens?.killTweensOf?.([this.root, this.iconArt]);
    if (!this.scene.tweens?.add || !this.root?.visible) {
      this._setVisible(false);
      return;
    }
    this.scene.tweens.add({
      targets: this.root,
      alpha: 0,
      y: this.root.y + this.config.card.exitOffsetY,
      duration: this.config.timing.exitMs,
      ease: "Sine.easeIn",
      onComplete: () => {
        if (token === this._transitionToken) {
          this.hiding = false;
          this._setVisible(false);
        }
      },
    });
  }

  _render(mode, now) {
    const presentation = resolveEarthquakeFeedbackPresentation({
      mode,
      source: this.source,
      escapeExpiresAt: this.escapeExpiresAt,
      now,
      scene: this.scene,
      config: this.config,
    });
    if (!presentation) {
      this._hide();
      return;
    }
    this.title.setText(presentation.title).setColor(hexColor(presentation.accent));
    this.detail.setText(presentation.detail);
    fitLiveUiText(this.title, this.config.card.textWidth, this.config.card.titleHeight);
    fitLiveUiText(this.detail, this.config.card.textWidth, this.config.card.detailHeight);
    const pulse = 1 + Math.sin(now / this.config.timing.iconPulsePeriodMs * Math.PI * 2)
      * this.config.card.iconPulseScale;
    this.iconArt.setScale?.(
      this._iconBaseScaleX * pulse,
      this._iconBaseScaleY * pulse,
    );
  }

  _layout() {
    if (!this.root) return;
    this.root.setScale?.(eventScreenPoint(this.scene, 0, 0).scale);
    this.root.setPosition(this._viewportWidth() / 2, this._modeY(this.mode));
  }

  _modeY(mode) {
    const y = mode === "escape" ? this._viewportHeight() - this.config.card.bottomMargin
      : this.config.card.topY;
    return eventScreenPoint(this.scene, this._viewportWidth() / 2, y).y;
  }

  _setVisible(visible) {
    this.root?.setVisible(visible);
    if (!visible) {
      this.hiding = false;
      this.hideDeadline = 0;
      this.modeExpiresAt = 0;
      this.root?.setAlpha?.(0);
      this._restoreIconScale();
    }
    if (visible !== this._notificationsShifted) {
      this._notificationsShifted = visible;
      const y = visible ? this.config.notificationActiveBaseY : this._notificationBaseY;
      if (Number.isFinite(y)) this.scene.uiNotifications?.setBaseY?.(y);
    }
  }

  _restoreIconScale() { this.iconArt?.setScale?.(this._iconBaseScaleX, this._iconBaseScaleY); }
  _now() { return Number.isFinite(this.scene?.time?.now) ? this.scene.time.now : 0; }
  _viewportWidth() { return this.scene.scale?.width || this.scene.config?.viewportWidth; }
  _viewportHeight() { return this.scene.scale?.height || this.scene.config?.viewportHeight; }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.reset();
    this.scene.scale?.off?.("resize", this._onResize);
    this.root?.destroy(true);
    this.scene = null;
    this.source = null;
  }
}
