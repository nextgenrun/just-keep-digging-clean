import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { LIGHT_CONFIG } from "../../values/lightConfig.js";
import { STAR_CONSTELLATION_CONFIG } from "../../values/starConstellations.js";

const clampRarityIndex = (rarity, assets, fallbackIndex = 0) => {
  if (!Array.isArray(assets) || assets.length === 0) return -1;
  const fallback = Math.max(0, Math.min(assets.length - 1, fallbackIndex || 0));
  if (!Number.isFinite(rarity)) return fallback;
  return Math.max(0, Math.min(assets.length - 1, Math.floor(rarity)));
};

const randomBetween = (min, max) => Phaser.Math.FloatBetween(min, max);

export class SkyStarReleaseView {
  constructor(
    scene,
    releaseFx = STAR_CONSTELLATION_CONFIG.collectedStarReleaseFx,
    pulseVisuals = LIGHT_CONFIG.skyTileLights?.beaconPulse?.visuals
  ) {
    this.scene = scene;
    this.releaseFx = releaseFx;
    this.pulseVisuals = pulseVisuals;
    this._images = new Set();
    this._disposed = false;
    this._onComplete = null;
  }

  play({ entry, startWorldX, startWorldY, onComplete }) {
    if (!entry?.graphic?.active || this._disposed) return false;

    const fx = this.releaseFx;
    const star = entry.graphic;
    const rarity = clampRarityIndex(
      entry.rarity,
      fx.coreAssets,
      fx.fallbackRarityIndex
    );
    if (rarity < 0) return false;

    const fractureAsset = fx.fractureAssets?.[rarity]
      || fx.fractureAssets?.[fx.fallbackRarityIndex];
    const pulseAsset = this.pulseVisuals?.rarityAssets?.[rarity]
      || this.pulseVisuals?.rarityAssets?.[this.pulseVisuals?.fallbackRarityIndex || 0];
    const duration = fx.durationMs
      + Math.min(5, rarity) * fx.rarityDurationBonusMs;
    const riseDistance = randomBetween(fx.riseMinPx, fx.riseMaxPx);
    const lateralDrift = randomBetween(
      -fx.lateralDriftMaxPx,
      fx.lateralDriftMaxPx
    );
    const rotation = randomBetween(-fx.maxRotationDeg, fx.maxRotationDeg);
    const swayAmplitude = randomBetween(
      fx.swayAmplitudeMinPx,
      fx.swayAmplitudeMaxPx
    );
    const swayCycles = randomBetween(fx.swayCyclesMin, fx.swayCyclesMax);

    this._onComplete = onComplete;
    this._images.add(star);
    this._playSourceFracture(fractureAsset, rarity, startWorldX, startWorldY);
    this._playSourcePulse(pulseAsset, rarity, startWorldX, startWorldY);
    this._playEchoes({
      entry,
      startWorldX,
      startWorldY,
      riseDistance,
      lateralDrift,
      rotation,
      swayAmplitude,
      swayCycles,
      duration,
    });
    this._playCore({
      entry,
      startWorldX,
      startWorldY,
      riseDistance,
      lateralDrift,
      rotation,
      swayAmplitude,
      swayCycles,
      duration,
    });
    return true;
  }

  _playSourceFracture(asset, rarity, x, y) {
    const fx = this.releaseFx;
    const size = fx.sourceFractureDisplaySizePx
      + rarity * fx.sourceFractureRarityBonusPx;
    const burst = this._createImage(
      x,
      y + fx.sourceFractureOffsetYPx,
      asset?.key,
      HUD_LAYOUT.hudDepth - 7,
      size,
      fx.sourceFractureAlpha,
      Phaser.BlendModes.ADD
    );
    if (!burst) return;

    const baseScaleX = burst.scaleX;
    const baseScaleY = burst.scaleY;
    burst.setScale(
      baseScaleX * fx.sourceFractureStartScale,
      baseScaleY * fx.sourceFractureStartScale
    );
    this.scene.tweens.add({
      targets: burst,
      alpha: 0,
      scaleX: baseScaleX * fx.sourceFractureEndScale,
      scaleY: baseScaleY * fx.sourceFractureEndScale,
      angle: randomBetween(-fx.maxRotationDeg, fx.maxRotationDeg) * 0.4,
      duration: fx.sourceFractureDurationMs,
      ease: "Cubic.out",
      onComplete: () => this._destroyImage(burst),
    });
  }

  _playSourcePulse(asset, rarity, x, y) {
    const fx = this.releaseFx;
    const size = fx.sourcePulseDisplaySizePx + rarity * fx.sourcePulseRarityBonusPx;
    const pulse = this._createImage(
      x,
      y,
      asset?.key,
      HUD_LAYOUT.hudDepth - 8,
      size,
      fx.sourcePulseAlpha,
      Phaser.BlendModes.ADD
    );
    if (!pulse) return;

    const baseScaleX = pulse.scaleX;
    const baseScaleY = pulse.scaleY;
    pulse.setScale(
      baseScaleX * fx.sourcePulseStartScale,
      baseScaleY * fx.sourcePulseStartScale
    );
    this.scene.tweens.add({
      targets: pulse,
      alpha: 0,
      scaleX: baseScaleX * fx.sourcePulseEndScale,
      scaleY: baseScaleY * fx.sourcePulseEndScale,
      duration: fx.sourcePulseDurationMs,
      ease: "Sine.out",
      onComplete: () => this._destroyImage(pulse),
    });
  }

  _playEchoes(motion) {
    const fx = this.releaseFx;
    for (let index = 0; index < fx.echoCount; index += 1) {
      const echo = this._createImage(
        motion.startWorldX,
        motion.startWorldY,
        motion.entry.textureKey,
        HUD_LAYOUT.hudDepth - 6,
        motion.entry.displaySize,
        0,
        Phaser.BlendModes.SCREEN
      );
      if (!echo) continue;

      const delayOffset = fx.echoLeadDelayMs + index * fx.echoStepDelayMs;
      const delay = fx.liftDelayMs + delayOffset;
      const duration = Math.max(1, motion.duration - delayOffset);
      const alpha = Math.max(
        0,
        fx.echoStartAlpha - index * fx.echoAlphaDecay
      );
      const startScale = Math.max(
        0,
        fx.echoStartScale - index * fx.echoScaleDecay
      );
      const riseRatio = Math.max(
        0,
        fx.echoRiseRatioStart - index * fx.echoRiseRatioDecay
      );
      const baseScaleX = echo.scaleX;
      const baseScaleY = echo.scaleY;
      echo.setScale(baseScaleX * startScale, baseScaleY * startScale);

      this.scene.tweens.add({
        targets: echo,
        x: motion.startWorldX + motion.lateralDrift * fx.echoDriftRatio,
        y: motion.startWorldY - motion.riseDistance * riseRatio,
        angle: motion.rotation * (0.45 + index * 0.12),
        delay,
        duration,
        ease: "Sine.inOut",
        onUpdate: tween => {
          const progress = Math.max(0, Math.min(1, tween.progress || 0));
          const baseX = motion.startWorldX
            + motion.lateralDrift * fx.echoDriftRatio * progress;
          echo.x = baseX
            + Math.sin(progress * Math.PI * motion.swayCycles)
              * motion.swayAmplitude
              * fx.echoSwayRatio
              * (1 - progress);
        },
      });
      this.scene.tweens.add({
        targets: echo,
        alpha: { from: alpha, to: 0 },
        scaleX: baseScaleX * fx.echoEndScale,
        scaleY: baseScaleY * fx.echoEndScale,
        delay,
        duration,
        ease: "Sine.in",
        onComplete: () => this._destroyImage(echo),
      });
    }
  }

  _playCore(motion) {
    const fx = this.releaseFx;
    const star = motion.entry.graphic;
    const fadeDuration = Math.max(
      1,
      motion.duration
        + fx.liftDelayMs
        - fx.flashInMs
        - fx.fadeHoldMs
    );

    star
      .setAlpha(0)
      .setScale(
        motion.entry.baseScaleX * fx.startScale,
        motion.entry.baseScaleY * fx.startScale
      );
    star.setBlendMode?.(Phaser.BlendModes.SCREEN);

    this.scene.tweens.add({
      targets: star,
      x: motion.startWorldX + motion.lateralDrift,
      y: motion.startWorldY - motion.riseDistance,
      angle: motion.rotation,
      delay: fx.liftDelayMs,
      duration: motion.duration,
      ease: "Sine.inOut",
      onUpdate: tween => {
        const progress = Math.max(0, Math.min(1, tween.progress || 0));
        const baseX = motion.startWorldX + motion.lateralDrift * progress;
        star.x = baseX
          + Math.sin(progress * Math.PI * motion.swayCycles)
            * motion.swayAmplitude
            * (1 - progress);
      },
    });
    this.scene.tweens.add({
      targets: star,
      alpha: 1,
      scaleX: motion.entry.baseScaleX * fx.flashScale,
      scaleY: motion.entry.baseScaleY * fx.flashScale,
      duration: fx.flashInMs,
      ease: "Back.out",
      onComplete: () => {
        if (this._disposed || !star.active) return;
        this.scene.tweens.add({
          targets: star,
          scaleX: motion.entry.baseScaleX * fx.peakScale,
          scaleY: motion.entry.baseScaleY * fx.peakScale,
          duration: fx.settleMs,
          ease: "Sine.out",
        });
        this.scene.tweens.add({
          targets: star,
          alpha: 0,
          scaleX: motion.entry.baseScaleX * fx.endScale,
          scaleY: motion.entry.baseScaleY * fx.endScale,
          delay: fx.fadeHoldMs,
          duration: fadeDuration,
          ease: "Sine.in",
          onComplete: () => this._complete(),
        });
      },
    });
  }

  _createImage(x, y, textureKey, depth, displaySize, alpha, blendMode) {
    if (!textureKey) return null;
    if (this.scene.textures?.exists && !this.scene.textures.exists(textureKey)) {
      return null;
    }
    const image = this.scene.add.image(x, y, textureKey);
    image
      .setDepth(depth)
      .setDisplaySize(displaySize, displaySize)
      .setAlpha(alpha);
    image.setBlendMode?.(blendMode);
    this._images.add(image);
    return image;
  }

  _destroyImage(image) {
    if (!image) return;
    this._images.delete(image);
    if (image.active !== false) image.destroy();
  }

  _complete() {
    if (this._disposed) return;
    const onComplete = this._onComplete;
    this.destroy();
    onComplete?.();
  }

  destroy() {
    if (this._disposed) return;
    this._disposed = true;
    for (const image of this._images) {
      this.scene.tweens.killTweensOf(image);
      if (image?.active !== false) image?.destroy();
    }
    this._images.clear();
  }
}
