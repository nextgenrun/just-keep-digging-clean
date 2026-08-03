// Image-backed, always-visible Money + Stars HUD. No gameplay authority lives here.

import {
  CELESTIAL_CURRENCY_HUD_CONFIG,
  formatCelestialMoney,
  formatCelestialStars,
} from "../../values/celestialCurrencyHud.js";
import { UI_FONTS } from "../../values/uiLayout.js";

function readProvider(provider) {
  try {
    return typeof provider === "function" ? provider() : 0;
  } catch {
    return 0;
  }
}

export class CelestialCurrencyHudSystem {
  constructor(scene, { getMoney = null, getStars = null } = {}) {
    this.scene = scene;
    this.getMoney = getMoney;
    this.getStars = getStars;
    this.config = CELESTIAL_CURRENCY_HUD_CONFIG;
    this.visible = true;
    this.destroyed = false;
    this.lastMoneyText = null;
    this.lastStarsText = null;
    this._resizeHandler = () => this.resize();
    this._build();
    this.scene.scale?.on?.("resize", this._resizeHandler);
    this.resize();
    this.update(true);
  }

  _build() {
    const { assets, layout, presentation } = this.config;
    this.root = this.scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(presentation.depth);
    this.foundation = this.scene.add.image(0, 0, assets.foundation.key)
      .setOrigin(0, 0.5)
      .setDisplaySize(layout.widthPx, layout.heightPx)
      .setAlpha(presentation.foundationAlpha);
    this.moneyIcon = this.scene.add.sprite(
      layout.widthPx * layout.moneyIconXFraction,
      0,
      assets.moneyIcon.key,
      assets.moneyIcon.frame,
    ).setDisplaySize(layout.iconSizePx, layout.iconSizePx);
    this.starsIcon = this.scene.add.image(
      layout.widthPx * layout.starsIconXFraction,
      0,
      assets.starsIcon.key,
    ).setDisplaySize(layout.starIconSizePx, layout.starIconSizePx);
    this.moneyText = this._createValueText(
      layout.widthPx * layout.moneyValueXFraction,
      presentation.moneyColor,
    );
    this.starsText = this._createValueText(
      layout.widthPx * layout.starsValueXFraction,
      presentation.starsColor,
    );
    this.root.add([
      this.foundation,
      this.moneyIcon,
      this.moneyText,
      this.starsText,
      this.starsIcon,
    ]);
  }

  _createValueText(x, color) {
    const { layout, presentation } = this.config;
    return this.scene.add.text(x, layout.valueOffsetYPx, "0", {
      fontFamily: UI_FONTS.display,
      fontSize: `${presentation.valueFontSizePx}px`,
      fontStyle: "bold",
      color,
      stroke: presentation.shadowColor,
      strokeThickness: presentation.shadowThicknessPx,
      align: "center",
    }).setOrigin(0.5);
  }

  update(force = false) {
    if (this.destroyed) return false;
    const moneyText = formatCelestialMoney(readProvider(this.getMoney));
    const starsText = formatCelestialStars(readProvider(this.getStars));
    let changed = false;
    if (force || moneyText !== this.lastMoneyText) {
      this.moneyText.setText(moneyText);
      this.lastMoneyText = moneyText;
      changed = true;
    }
    if (force || starsText !== this.lastStarsText) {
      this.starsText.setText(starsText);
      this.lastStarsText = starsText;
      changed = true;
    }
    return changed;
  }

  pulseStars() {
    if (this.destroyed) return;
    const { pulseScale, pulseDurationMs } = this.config.presentation;
    const baseScaleX = this.starsIcon.scaleX;
    const baseScaleY = this.starsIcon.scaleY;
    this.scene.tweens?.killTweensOf?.(this.starsIcon);
    this.scene.tweens?.add?.({
      targets: this.starsIcon,
      scaleX: baseScaleX * pulseScale,
      scaleY: baseScaleY * pulseScale,
      duration: pulseDurationMs,
      yoyo: true,
      ease: "Back.out",
      onComplete: () => this.starsIcon?.setScale(baseScaleX, baseScaleY),
    });
  }

  resize() {
    if (this.destroyed) return false;
    const { layout } = this.config;
    const width = this.scene.scale?.width || layout.referenceWidthPx;
    const height = this.scene.scale?.height || layout.referenceHeightPx;
    const scale = Math.max(layout.minimumScale, Math.min(
      layout.maximumScale,
      width / layout.referenceWidthPx,
      height / layout.referenceHeightPx,
    ));
    this.root.setPosition(
      layout.leftPx * scale,
      height - (layout.bottomPx + layout.heightPx / 2) * scale,
    ).setScale(scale);
    return true;
  }

  setVisible(visible) {
    this.visible = visible === true;
    this.root?.setVisible(this.visible);
  }

  getHealthSnapshot() {
    return Object.freeze({
      ready: !this.destroyed
        && this.scene.textures?.exists?.(this.config.assets.foundation.key) === true,
      destroyed: this.destroyed,
      visible: this.visible,
      money: this.lastMoneyText,
      stars: this.lastStarsText,
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.scale?.off?.("resize", this._resizeHandler);
    this.scene.tweens?.killTweensOf?.(this.starsIcon);
    this.root?.destroy(true);
    this.getMoney = null;
    this.getStars = null;
  }
}
