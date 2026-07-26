import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  applyOpeningFlightScreenBlend,
  setOpeningFlightImageLongEdge,
} from "./openingFlightGoldenFiveImage.js";

export class OpeningFlightGoldenFiveRouteView {
  constructor(scene, config, fx) {
    this.scene = scene;
    this.config = config;
    this.fx = fx;
    this.rings = [];
    this.cacheRoot = null;
  }

  showEscapeRings(ringWorlds, passedCount = 0) {
    const view = this.config.presentation;
    const key = ASSET_KEYS.onboarding.openingFlightV2.flightRing;
    ringWorlds.forEach((world, index) => {
      if (index < passedCount || this.rings[index]?.active) return;
      const ring = setOpeningFlightImageLongEdge(
        this.scene.add.image(world.x, world.y, key)
          .setOrigin(0.5)
          .setDepth(view.worldDepth + view.ringDepthOffset)
          .setAlpha(view.ringAlphaTo),
        view.ringDiameterPx,
        "width",
      );
      applyOpeningFlightScreenBlend(ring);
      const scaleX = ring.scaleX;
      const scaleY = ring.scaleY;
      this.scene.tweens.add({
        targets: ring,
        scaleX: scaleX * view.ringPulseScale,
        scaleY: scaleY * view.ringPulseScale,
        alpha: view.ringAlphaFrom,
        duration: view.pulseDurationMs,
        yoyo: true,
        repeat: -1,
        ease: view.pulseEase,
      });
      this.rings[index] = ring;
    });
  }

  passRing(index) {
    const ring = this.rings[index];
    if (!ring?.active) return;
    const view = this.config.presentation;
    this.scene.tweens?.killTweensOf?.(ring);
    this.fx.burst(
      { x: ring.x, y: ring.y },
      [this.config.palette.cyan, this.config.palette.gold],
      this.config.fx.ringSparkCount,
      this.config.fx.ringTravelPx,
    );
    this.scene.tweens.add({
      targets: ring,
      scaleX: ring.scaleX * view.ringExitScale,
      scaleY: ring.scaleY * view.ringExitScale,
      alpha: 0,
      duration: view.ringExitDurationMs,
      ease: view.exitEase,
      onComplete: () => ring.destroy(),
    });
  }

  showCache(cacheBottomWorld) {
    if (this.cacheRoot?.active) return;
    const view = this.config.presentation;
    const glow = this.scene.add.ellipse(
      0,
      -view.cacheWidthPx * view.cacheGlowOffsetRatio,
      view.cacheWidthPx * view.cacheGlowWidthRatio,
      view.cacheWidthPx * view.cacheGlowHeightRatio,
      this.config.palette.gold,
      view.cacheGlowAlphaTo,
    );
    const groundShadow = this.scene.add.ellipse(
      0,
      view.cacheShadowOffsetYPx,
      view.cacheWidthPx * view.cacheShadowWidthRatio,
      view.cacheShadowHeightPx,
      this.config.palette.groundShadow,
      view.cacheShadowAlpha,
    );
    const cacheImage = setOpeningFlightImageLongEdge(
      this.scene.add.image(
        0,
        view.cacheGroundInsetPx,
        ASSET_KEYS.onboarding.openingFlightV2.ascentCache,
      ).setOrigin(0.5, 1),
      view.cacheWidthPx,
      "width",
    );
    const type = this.config.typography;
    const label = this.scene.add.text(
      0,
      view.cacheLabelOffsetYPx,
      this.config.copy.cacheTitle,
      {
        fontFamily: type.titleFamily,
        fontSize: type.cacheLabelSize,
        fontStyle: "bold",
        color: this.config.palette.goldText,
        stroke: type.cacheLabelStroke,
        strokeThickness: type.cacheLabelStrokeThickness,
      },
    ).setOrigin(0.5, 1);
    this.cacheRoot = this.scene.add.container(
      cacheBottomWorld.x,
      cacheBottomWorld.y - view.cacheSpawnLiftPx,
      [glow, groundShadow, cacheImage, label],
    ).setDepth(view.worldDepth + view.cacheDepthOffset);
    this.scene.tweens.add({
      targets: this.cacheRoot,
      y: cacheBottomWorld.y,
      duration: view.cacheSettleDurationMs,
      ease: view.revealEase,
    });
    this.scene.tweens.add({
      targets: glow,
      alpha: {
        from: view.cacheGlowAlphaFrom,
        to: view.cacheGlowAlphaTo,
      },
      scaleX: {
        from: view.cacheGlowScaleFrom,
        to: view.cacheGlowScaleTo,
      },
      scaleY: {
        from: view.cacheGlowScaleFrom,
        to: view.cacheGlowScaleTo,
      },
      duration: view.pulseDurationMs * view.cacheGlowPulseDurationRatio,
      yoyo: true,
      repeat: -1,
      ease: view.pulseEase,
    });
  }

  celebrateCache() {
    if (!this.cacheRoot?.active) return;
    const view = this.config.presentation;
    const world = {
      x: this.cacheRoot.x,
      y: this.cacheRoot.y - view.cacheWidthPx * view.cacheGlowOffsetRatio,
    };
    this.fx.burst(
      world,
      [
        this.config.palette.gold,
        this.config.palette.cyan,
        this.config.palette.violet,
      ],
      this.config.fx.cacheSparkCount,
      this.config.fx.cacheTravelPx,
    );
    this.scene.tweens?.killTweensOf?.(this.cacheRoot);
    this.scene.tweens.add({
      targets: this.cacheRoot,
      scaleX: view.cacheExitScale,
      scaleY: view.cacheExitScale,
      alpha: 0,
      duration: view.cacheExitDurationMs,
      ease: view.cacheExitEase,
      onComplete: () => this.hideCache(),
    });
  }

  hideCache() {
    this.scene?.tweens?.killTweensOf?.(this.cacheRoot);
    this.cacheRoot?.destroy(true);
    this.cacheRoot = null;
  }

  destroy() {
    [...this.rings, this.cacheRoot].forEach(target => {
      this.scene?.tweens?.killTweensOf?.(target);
      target?.destroy?.(true);
    });
    this.rings = [];
    this.cacheRoot = null;
    this.scene = null;
  }
}
