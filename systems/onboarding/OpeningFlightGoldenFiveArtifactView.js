import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  applyOpeningFlightScreenBlend,
  setOpeningFlightImageLongEdge,
} from "./openingFlightGoldenFiveImage.js";

export class OpeningFlightGoldenFiveArtifactView {
  constructor(scene, config, fx) {
    this.scene = scene;
    this.config = config;
    this.fx = fx;
    this.artifact = null;
    this.artifactGlow = null;
    this.marker = null;
    this.entranceHalo = null;
    this.artifactBaseScaleX = 1;
    this.artifactBaseScaleY = 1;
  }

  createBuriedGuidance(artifactBottomWorld, entranceBottomWorld) {
    const scene = this.scene;
    const view = this.config.presentation;
    const keys = ASSET_KEYS.onboarding.openingFlightV2;
    if (!this.artifact) {
      this.artifactGlow = scene.add.ellipse(
        artifactBottomWorld.x,
        artifactBottomWorld.y - view.artifactHeightPx * view.artifactGlowOffsetRatio,
        view.artifactHeightPx * view.artifactGlowWidthRatio,
        view.artifactHeightPx * view.artifactGlowHeightRatio,
        this.config.palette.violet,
        view.artifactGlowBuriedAlpha,
      ).setDepth(view.worldDepth + view.artifactGlowDepthOffset);
      this.artifact = setOpeningFlightImageLongEdge(
        scene.add.image(
          artifactBottomWorld.x,
          artifactBottomWorld.y,
          keys.artifact,
        )
          .setOrigin(0.5, 1)
          .setDepth(view.worldDepth)
          .setAlpha(view.artifactBuriedAlpha),
        view.artifactHeightPx,
      );
      this.artifactBaseScaleX = this.artifact.scaleX;
      this.artifactBaseScaleY = this.artifact.scaleY;
      applyOpeningFlightScreenBlend(this.artifact);
      scene.tweens.add({
        targets: [this.artifact, this.artifactGlow],
        alpha: {
          from: view.artifactBuriedAlpha * view.artifactPulseAlphaRatio,
          to: view.artifactBuriedAlpha,
        },
        duration: view.pulseDurationMs,
        yoyo: true,
        repeat: -1,
        ease: view.pulseEase,
      });
    }
    if (!this.marker) this._createMarker(entranceBottomWorld, keys.shaftMarker);
  }

  _createMarker(entranceBottomWorld, key) {
    const scene = this.scene;
    const view = this.config.presentation;
    const markerBottomY = entranceBottomWorld.y - Math.max(
      view.markerMinLiftPx,
      (scene.config?.tileSize || 1) * view.markerLiftTiles,
    );
    this.entranceHalo = scene.add.ellipse(
      entranceBottomWorld.x,
      entranceBottomWorld.y + view.entranceHaloOffsetYPx,
      (scene.config?.tileSize || 1) * view.entranceHaloWidthTiles,
      view.entranceHaloHeightPx,
      this.config.palette.cyan,
      view.entranceHaloAlphaTo,
    ).setDepth(view.worldDepth + view.artifactGlowDepthOffset);
    this.marker = setOpeningFlightImageLongEdge(
      scene.add.image(entranceBottomWorld.x, markerBottomY, key)
        .setOrigin(0.5, 1)
        .setDepth(view.worldDepth + view.markerDepthOffset),
      view.markerHeightPx,
    );
    scene.tweens.add({
      targets: this.marker,
      y: markerBottomY - view.bobDistancePx,
      scaleX: this.marker.scaleX * view.markerPulseScale,
      scaleY: this.marker.scaleY * view.markerPulseScale,
      duration: view.pulseDurationMs * view.markerPulseDurationRatio,
      yoyo: true,
      repeat: -1,
      ease: view.pulseEase,
    });
    scene.tweens.add({
      targets: this.entranceHalo,
      alpha: {
        from: view.entranceHaloAlphaFrom,
        to: view.entranceHaloAlphaTo,
      },
      scaleX: {
        from: view.entranceHaloScaleFrom,
        to: view.entranceHaloScaleTo,
      },
      duration: view.pulseDurationMs * view.haloPulseDurationRatio,
      yoyo: true,
      repeat: -1,
      ease: view.pulseEase,
    });
  }

  setBuriedProximity(distanceTiles) {
    if (!this.artifact?.active) return;
    const view = this.config.presentation;
    const ratio = Math.max(
      0,
      Math.min(1, 1 - distanceTiles / Math.max(1, view.artifactRevealDistanceTiles)),
    );
    this.artifact.setAlpha(
      view.artifactBuriedAlpha
        + (view.artifactNearAlpha - view.artifactBuriedAlpha) * ratio,
    );
    this.artifactGlow?.setAlpha(
      view.artifactGlowNearAlphaBase + ratio * view.artifactGlowNearAlphaGain,
    );
  }

  revealArtifact(world, { instant = false } = {}) {
    const view = this.config.presentation;
    if (!this.artifact) {
      this.createBuriedGuidance(
        world,
        { x: world.x, y: world.y - view.artifactHeightPx },
      );
    }
    this.scene.tweens?.killTweensOf?.(this.artifact);
    this.scene.tweens?.killTweensOf?.(this.artifactGlow);
    this._hideMarker(instant);
    if (instant) {
      this.artifact?.setAlpha(view.artifactRestoreAlpha);
      this.artifactGlow?.setAlpha(view.artifactRestoreGlowAlpha);
      return;
    }
    const scaleX = this.artifact?.scaleX || 1;
    const scaleY = this.artifact?.scaleY || 1;
    this.artifact?.setAlpha(1).setScale(
      scaleX * view.artifactRevealStartScale,
      scaleY * view.artifactRevealStartScale,
    );
    this.artifactGlow?.setAlpha(1).setScale(view.artifactRevealGlowStartScale);
    this.scene.cameras?.main?.flash?.(
      view.cameraFlashDurationMs,
      ...view.cameraFlashRgb,
    );
    this.scene.tweens.add({
      targets: this.artifact,
      scaleX,
      scaleY,
      duration: view.artifactRevealDurationMs,
      ease: view.revealEase,
    });
    this.scene.tweens.add({
      targets: this.artifactGlow,
      scaleX: view.artifactRevealGlowEndScale,
      scaleY: view.artifactRevealGlowEndScale,
      alpha: view.artifactRevealGlowAlpha,
      duration: view.artifactGlowRevealDurationMs,
      ease: view.exitEase,
    });
    this.fx.burst(
      world,
      [
        this.config.palette.cyan,
        this.config.palette.gold,
        this.config.palette.violet,
      ],
      this.config.fx.artifactSparkCount,
      this.config.fx.artifactTravelPx,
    );
  }

  settleAfterClaim({ instant = false } = {}) {
    if (!this.artifact?.active) return;
    const view = this.config.presentation;
    const target = {
      scaleX: this.artifactBaseScaleX * view.artifactEscapeScale,
      scaleY: this.artifactBaseScaleY * view.artifactEscapeScale,
      alpha: view.artifactEscapeAlpha,
    };
    this.scene.tweens?.killTweensOf?.(this.artifact);
    this.scene.tweens?.killTweensOf?.(this.artifactGlow);
    if (instant) {
      this.artifact.setScale(target.scaleX, target.scaleY).setAlpha(target.alpha);
      this.artifactGlow?.setAlpha(view.artifactEscapeGlowAlpha);
      return;
    }
    this.scene.tweens.add({
      targets: this.artifact,
      ...target,
      duration: view.artifactEscapeSettleDurationMs,
      ease: view.settleEase,
    });
    this.scene.tweens.add({
      targets: this.artifactGlow,
      alpha: view.artifactEscapeGlowAlpha,
      duration: view.artifactEscapeSettleDurationMs,
      ease: view.settleEase,
    });
  }

  _hideMarker(instant = false) {
    if (!this.marker?.active) return;
    const view = this.config.presentation;
    this.scene.tweens?.killTweensOf?.(this.marker);
    this.scene.tweens?.killTweensOf?.(this.entranceHalo);
    this.entranceHalo?.destroy();
    this.entranceHalo = null;
    if (instant) {
      this.marker.destroy();
      this.marker = null;
      return;
    }
    const marker = this.marker;
    this.scene.tweens.add({
      targets: marker,
      y: marker.y - view.markerExitDistancePx,
      alpha: 0,
      duration: view.markerExitDurationMs,
      ease: view.exitEase,
      onComplete: () => marker.destroy(),
    });
    this.marker = null;
  }

  destroy() {
    [
      this.artifact,
      this.artifactGlow,
      this.marker,
      this.entranceHalo,
    ].forEach(target => {
      this.scene?.tweens?.killTweensOf?.(target);
      target?.destroy?.();
    });
    this.artifact = null;
    this.artifactGlow = null;
    this.marker = null;
    this.entranceHalo = null;
    this.artifactBaseScaleX = 1;
    this.artifactBaseScaleY = 1;
    this.scene = null;
  }
}
