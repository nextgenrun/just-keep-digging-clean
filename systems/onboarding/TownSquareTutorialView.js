import { ASSET_KEYS } from "../../values/assetKeys.js";
import { RETENTION_CONFIG } from "../../values/retentionConfig.js";
import { hasUiInputPriority } from "../UiInputPriorityRegistry.js";

export class TownSquareTutorialView {
  constructor(scene) {
    this.scene = scene;
    this.config = RETENTION_CONFIG.tutorial.ui;
    this.marker = null;
    this.keyLabel = null;
    this.edgeMarker = null;
    this.target = null;
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
    this.target = { x, y };
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
    this.update();
  }

  clearMarker() {
    if (this.marker) this.marker.setVisible(false);
    this.keyLabel?.setVisible?.(false);
    this.edgeMarker?.setVisible?.(false);
    this.target = null;
  }

  update() {
    const visible = Boolean(this.target)
      && this.scene?.gameState !== "paused"
      && !hasUiInputPriority(this.scene);
    this.marker?.setVisible(visible);
    this.keyLabel?.setVisible(visible && Boolean(this.keyLabel.text));
    if (!visible) {
      this.edgeMarker?.setVisible?.(false);
      return;
    }
    const camera = this.scene?.cameras?.main;
    const worldView = camera?.worldView;
    if (!camera || !worldView) return;

    const zoom = camera.zoom || 1;
    const screenX = camera.x + (this.target.x - worldView.x) * zoom;
    const screenY = camera.y + (this.target.y - worldView.y) * zoom;
    const markerHalfWidth = this.marker.displayWidth * zoom * 0.5;
    const markerHeight = this.marker.displayHeight * zoom;
    const fullyVisible = screenX - markerHalfWidth >= camera.x
      && screenX + markerHalfWidth <= camera.x + camera.width
      && screenY - markerHeight >= camera.y
      && screenY <= camera.y + camera.height;
    if (fullyVisible) {
      this.edgeMarker?.setVisible?.(false);
      return;
    }

    this._ensureEdgeMarker();
    const centerX = camera.x + camera.width * 0.5;
    const centerY = camera.y + camera.height * 0.5;
    const dx = screenX - centerX;
    const dy = screenY - centerY;
    const maxX = Math.max(1, camera.width * 0.5
      - this.config.offscreenMarkerMarginPx);
    const maxY = Math.max(1, camera.height * 0.5
      - this.config.offscreenMarkerMarginPx);
    const scale = Math.min(
      Math.abs(dx) > 0 ? maxX / Math.abs(dx) : Number.POSITIVE_INFINITY,
      Math.abs(dy) > 0 ? maxY / Math.abs(dy) : Number.POSITIVE_INFINITY,
    );
    this.edgeMarker
      .setPosition(centerX + dx * scale, centerY + dy * scale)
      .setRotation(
        Math.atan2(dy, dx) + this.config.offscreenMarkerRotationOffsetRad,
      )
      .setVisible(true);
  }

  _ensureEdgeMarker() {
    if (this.edgeMarker) return;
    const key = ASSET_KEYS.onboarding.openingFlightV2.shaftMarker;
    this.edgeMarker = this.scene.add.image(0, 0, key)
      .setOrigin(0.5)
      .setDepth(this.config.offscreenMarkerDepth)
      .setScrollFactor(0)
      .setDisplaySize(
        this.config.offscreenMarkerHeightPx * 0.53,
        this.config.offscreenMarkerHeightPx,
      );
  }

  resize() {
    this.update();
  }

  destroy() {
    this.scene?.tweens?.killTweensOf?.(this.marker);
    this.marker?.destroy();
    this.keyLabel?.destroy();
    this.edgeMarker?.destroy();
    this.marker = null;
    this.keyLabel = null;
    this.edgeMarker = null;
    this.target = null;
    this.scene = null;
  }
}
