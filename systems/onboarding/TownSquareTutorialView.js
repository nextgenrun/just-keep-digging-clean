import { ASSET_KEYS } from "../../values/assetKeys.js";
import { RETENTION_CONFIG } from "../../values/retentionConfig.js";

export class TownSquareTutorialView {
  constructor(scene) {
    this.scene = scene;
    this.config = RETENTION_CONFIG.tutorial.ui;
    this.marker = null;
  }

  pointAt(x, y) {
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
  }

  clearMarker() {
    if (this.marker) this.marker.setVisible(false);
  }

  resize() {}

  destroy() {
    this.scene?.tweens?.killTweensOf?.(this.marker);
    this.marker?.destroy();
    this.marker = null;
    this.scene = null;
  }
}
