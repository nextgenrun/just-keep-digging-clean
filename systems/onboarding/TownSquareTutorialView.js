import { ASSET_KEYS } from "../../values/assetKeys.js";
import { RETENTION_CONFIG } from "../../values/retentionConfig.js";

export class TownSquareTutorialView {
  constructor(scene) {
    this.scene = scene;
    this.config = RETENTION_CONFIG.tutorial.ui;
    this.marker = null;
    this.keyLabel = null;
  }

  pointAt(x, y, keyLabel = "") {
    const key = ASSET_KEYS.onboarding.openingFlightV2.shaftMarker;
    if (!this.marker) {
      this.marker = this.scene.add.image(x, y, key)
        .setOrigin(0.5, 1)
        .setDepth(this.config.markerDepth)
        .setDisplaySize(
          this.config.markerHeightPx * 0.53,
          this.config.markerHeightPx,
        );
      this.scene.tweens.add({
        targets: this.marker,
        scaleX: this.marker.scaleX * this.config.markerPulseScale,
        scaleY: this.marker.scaleY * this.config.markerPulseScale,
        alpha: { from: 0.82, to: 1 },
        duration: this.config.markerPulseMs,
        ease: "Sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    }
    this.marker.setPosition(x, y).setVisible(true);
    if (!this.keyLabel) {
      this.keyLabel = this.scene.add.text(x, y, "", {
        fontFamily: "Barlow Semi Condensed, Arial, sans-serif",
        fontSize: this.config.markerKeyFontSize,
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#07131d",
        strokeThickness: this.config.markerKeyStrokePx,
      }).setOrigin(0.5, 1).setDepth(this.config.markerDepth + 1);
    }
    this.keyLabel
      .setText(String(keyLabel || ""))
      .setPosition(x, y - this.config.markerKeyOffsetYPx)
      .setVisible(Boolean(keyLabel));
  }

  clearMarker() {
    if (this.marker) this.marker.setVisible(false);
    this.keyLabel?.setVisible?.(false);
  }

  resize() {}

  destroy() {
    this.scene?.tweens?.killTweensOf?.(this.marker);
    this.marker?.destroy();
    this.keyLabel?.destroy();
    this.marker = null;
    this.keyLabel = null;
    this.scene = null;
  }
}
