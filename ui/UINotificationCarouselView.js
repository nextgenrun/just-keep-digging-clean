import { ASSET_KEYS } from "../values/assetKeys.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { UI_COLORS } from "../values/uiColors.js";
import { UI_FONTS } from "../values/uiLayout.js";
import { UI_NOTIFICATION_CAROUSEL_CONFIG } from "../values/uiNotificationCarousel.js";
import { hasApprovedHudSkin } from "../systems/visual/ApprovedHudSkin.js";
import { createNotificationCarouselLayout } from "./notificationCarouselLayout.js";

/**
 * Renders one approved-art notification card and its invisible input hit zones.
 */
export class UINotificationCarouselView {
  constructor(scene, callbacks = {}) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.approved = hasApprovedHudSkin(scene);
    this.root = null;
    this.background = null;
    this.title = null;
    this.message = null;
    this.counter = null;
    this.controls = {};
    this.entryVisible = false;
    this.canCycle = false;
    this.suspended = false;
    this.cardHeight = 0;
    this._resolveLayout();
    this._create();
  }

  _resolveLayout() {
    this.layout = createNotificationCarouselLayout(this.scene, this.approved);
    this.scale = this.layout.scale;
  }

  _create() {
    const layout = this.layout;
    const config = UI_NOTIFICATION_CAROUSEL_CONFIG;
    this.root = this.scene.add.container(this.centerX, this.baseY)
      .setDepth(config.depth)
      .setScrollFactor(0)
      .setVisible(false);

    this.background = this.approved
      ? this.scene.add.image(0, 0, ASSET_KEYS.ui.approvedHud.notification).setOrigin(0.5)
      : this.scene.add.graphics();

    this.title = this.scene.add.text(layout.messageX, 0, "", {
      fontFamily: this.approved ? APPROVED_HUD_SKIN.font.family : UI_FONTS.mono,
      fontSize: `${layout.titleFontSize}px`,
      fontStyle: "bold",
      color: APPROVED_HUD_SKIN.font.gold,
      stroke: this.approved ? APPROVED_HUD_SKIN.font.shadow : undefined,
      strokeThickness: this.approved ? APPROVED_HUD_SKIN.font.strokeThickness : 0,
    }).setOrigin(0, 0.5);

    this.message = this.scene.add.text(layout.messageX, 0, "", {
      fontFamily: this.approved ? APPROVED_HUD_SKIN.font.family : UI_FONTS.mono,
      fontSize: `${layout.messageFontSize}px`,
      fontStyle: "bold",
      color: UI_COLORS.white,
      stroke: this.approved ? APPROVED_HUD_SKIN.font.shadow : undefined,
      strokeThickness: this.approved ? APPROVED_HUD_SKIN.font.strokeThickness : 0,
      lineSpacing: layout.lineSpacing,
      wordWrap: { width: layout.messageWidth, useAdvancedWrap: true },
    }).setOrigin(0, 0.5);

    this.counter = this.scene.add.text(0, 0, "", {
      fontFamily: this.approved ? APPROVED_HUD_SKIN.font.family : UI_FONTS.mono,
      fontSize: `${layout.counterFontSize}px`,
      fontStyle: "bold",
      color: APPROVED_HUD_SKIN.font.secondary,
      stroke: this.approved ? APPROVED_HUD_SKIN.font.shadow : undefined,
      strokeThickness: this.approved ? APPROVED_HUD_SKIN.font.strokeThickness : 0,
    }).setOrigin(0.5);

    this.controls.previous = this._createControl(
      ASSET_KEYS.ui.notificationControls.previous,
      () => this.callbacks.onPrevious?.(),
      "cycle",
    );
    this.controls.next = this._createControl(
      ASSET_KEYS.ui.notificationControls.next,
      () => this.callbacks.onNext?.(),
      "cycle",
    );
    this.controls.dismiss = this._createControl(
      ASSET_KEYS.ui.notificationControls.clear,
      () => this.callbacks.onDismiss?.(),
      "dismiss",
    );

    this.root.add([
      this.background,
      this.title,
      this.message,
      this.counter,
      this.controls.previous.zone,
      this.controls.previous.image,
      this.controls.next.zone,
      this.controls.next.image,
      this.controls.dismiss.zone,
      this.controls.dismiss.image,
    ]);
    this._layoutCard(layout.minHeight);
  }

  _createControl(asset, onActivate, role) {
    const cfg = UI_NOTIFICATION_CAROUSEL_CONFIG.controls;
    const image = this.scene.add.image(0, 0, asset.key)
      .setOrigin(0.5)
      .setAlpha(cfg.idleAlpha);
    const zone = this.scene.add.zone(
      0,
      0,
      this.layout.controlHitWidth,
      this.layout.controlHitHeight,
    ).setOrigin(0.5).setScrollFactor(0);
    const control = { image, zone, enabled: false, role };
    this._setControlVisualScale(control);
    const activate = (_pointer, _localX, _localY, event) => {
      event?.stopPropagation?.();
      if (!control.enabled || this.suspended || !this.entryVisible) return;
      onActivate();
    };
    const hover = () => {
      if (!control.enabled) return;
      image.setAlpha(cfg.hoverAlpha);
      this._setControlVisualScale(control, cfg.hoverScale);
    };
    const unhover = () => {
      image.setAlpha(control.enabled ? cfg.idleAlpha : cfg.disabledAlpha);
      this._setControlVisualScale(control);
    };
    [zone, image].forEach(target => {
      target.on("pointerdown", activate);
      target.on("pointerover", hover);
      target.on("pointerout", unhover);
    });
    return control;
  }

  render(entry, position, total) {
    if (!entry) {
      this.entryVisible = false;
      this.setVisible(false);
      return;
    }

    this.entryVisible = true;
    this.title.setText(entry.title || "");
    this.title.setColor(entry.accentColor || APPROVED_HUD_SKIN.font.gold);
    this.message.setText(entry.message || "");
    this.message.setColor(entry.color || UI_COLORS.white);
    this.message.setFontSize(entry.fontSize || this.layout.messageFontSize);
    const height = Math.max(
      this.layout.minHeight,
      this.message.height + this.layout.verticalPadding,
    );
    this._layoutCard(height);
    this.canCycle = total > 1;
    this.counter.setText(this.canCycle ? `${position} / ${total}` : "");
    this._setControlEnabled(this.controls.previous, this.canCycle);
    this._setControlEnabled(this.controls.next, this.canCycle);
    this._setControlEnabled(this.controls.dismiss, true);
    this.setVisible(!this.suspended);
  }

  _layoutCard(height) {
    this.cardHeight = height;
    const layout = this.layout;
    const fallback = UI_NOTIFICATION_CAROUSEL_CONFIG.fallback;
    if (this.approved) {
      this.background.setDisplaySize(layout.width, height);
    } else {
      this.background.clear();
      this.background.fillStyle(UI_COLORS.bg, fallback.backgroundAlpha);
      this.background.fillRoundedRect(
        -layout.width / 2,
        -height / 2,
        layout.width,
        height,
        fallback.cornerRadiusPx,
      );
      this.background.lineStyle(
        fallback.borderWidthPx,
        UI_COLORS.borderDim,
        fallback.borderAlpha,
      );
      this.background.strokeRoundedRect(
        -layout.width / 2,
        -height / 2,
        layout.width,
        height,
        fallback.cornerRadiusPx,
      );
    }

    this.title.setPosition(layout.messageX, -height / 2 + layout.titleTopInset);
    this.message.setPosition(layout.messageX, 0);
    this.counter.setPosition(0, height / 2 - layout.counterBottomInset);
    this._positionControl(
      this.controls.previous,
      -layout.width / 2 + layout.previousInsetX,
      layout.cycleOffsetY,
    );
    this._positionControl(
      this.controls.next,
      layout.width / 2 - layout.nextInsetX,
      layout.cycleOffsetY,
    );
    this._positionControl(
      this.controls.dismiss,
      layout.width / 2 - layout.dismissInsetX,
      -height / 2 + layout.dismissInsetY,
    );
  }

  _positionControl(control, x, y) {
    control.image.setPosition(x, y);
    control.zone.setPosition(x, y);
  }

  _setControlVisualScale(control, multiplier = 1) {
    const size = control.role === "dismiss"
      ? this.layout.dismissSize
      : this.layout.controlSize;
    control.image.setDisplaySize(size * multiplier, size * multiplier);
  }

  _setControlEnabled(control, enabled) {
    const cfg = UI_NOTIFICATION_CAROUSEL_CONFIG.controls;
    control.enabled = Boolean(enabled);
    control.image
      .setVisible(true)
      .setAlpha(control.enabled ? cfg.idleAlpha : cfg.disabledAlpha);
    this._setControlVisualScale(control);
    control.zone.setVisible(true);
    if (control.enabled && this.root.visible && !this.suspended) {
      control.zone.setInteractive({ useHandCursor: true });
      control.image.setInteractive({ useHandCursor: true });
    } else {
      if (control.zone?.scene?.sys) control.zone.disableInteractive();
      if (control.image?.scene?.sys) control.image.disableInteractive();
    }
  }

  setVisible(visible) {
    const resolved = Boolean(visible && this.entryVisible && !this.suspended);
    this.root.setVisible(resolved);
    if (!resolved) {
      Object.values(this.controls).forEach(control => {
        if (control.zone?.scene?.sys) control.zone.disableInteractive();
        if (control.image?.scene?.sys) control.image.disableInteractive();
      });
    } else {
      this._setControlEnabled(this.controls.previous, this.canCycle);
      this._setControlEnabled(this.controls.next, this.canCycle);
      this._setControlEnabled(this.controls.dismiss, true);
    }
  }

  setSuspended(suspended) {
    this.suspended = Boolean(suspended);
    this.setVisible(!this.suspended);
  }

  resize(baseY) {
    this._resolveLayout();
    this.root.setPosition(this.centerX, baseY);
    this.title.setFontSize(this.layout.titleFontSize);
    this.message.setFontSize(this.layout.messageFontSize);
    this.counter.setFontSize(this.layout.counterFontSize);
    this.message.setWordWrapWidth(this.layout.messageWidth, true);
    Object.values(this.controls).forEach(control => {
      this._setControlVisualScale(control);
      control.zone.setSize(
        this.layout.controlHitWidth,
        this.layout.controlHitHeight,
      );
    });
    const height = Math.max(
      this.layout.minHeight,
      this.message.height + this.layout.verticalPadding,
    );
    this._layoutCard(height);
    this.setVisible(!this.suspended);
  }

  destroy() {
    Object.values(this.controls).forEach(control => {
      control.zone.removeAllListeners();
      control.image.removeAllListeners();
      if (control.zone?.scene?.sys) control.zone.disableInteractive();
      if (control.image?.scene?.sys) control.image.disableInteractive();
    });
    this.root?.destroy(true);
    this.scene = null;
    this.callbacks = null;
  }

  get baseY() {
    return (
      APPROVED_HUD_SKIN.layout.notification.y * this.scale
    );
  }

  get centerX() {
    return (
      this.scene.scale?.width
      || this.scene.config?.viewportWidth
      || APPROVED_HUD_SKIN.referenceViewport.width
    ) / 2;
  }

}
