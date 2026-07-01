const clamp01 = (value) => Math.max(0, Math.min(1, value));

export class WeatherLightningController {
  constructor(scene, weatherConfig, audioController) {
    this.scene = scene;
    this.weatherConfig = weatherConfig;
    this.audioController = audioController;
    this._nextLightningAt = 0;
    this._lightningAlpha = 0;
    this._cavePulse = 0;
    this._timers = [];
    this._createOverlays();
  }

  update(time, delta, state) {
    this._lightningAlpha = Math.max(0, this._lightningAlpha - delta / 170);
    this._cavePulse = Math.max(0, this._cavePulse - delta / 480);
    this._syncOverlays(state.depth);

    if (state.kind !== "storm" || state.intensity < 0.55 || time < this._nextLightningAt) return;
    const lightningCfg = this.weatherConfig.lightning;
    const flashAlpha = this._randomRange(lightningCfg.flashAlpha) * state.intensity;
    this._lightningAlpha = Math.max(this._lightningAlpha, flashAlpha * (0.45 + state.depth.surfaceAmount * 0.55));
    this._cavePulse = Math.max(this._cavePulse, state.intensity * (0.45 + state.depth.undergroundAmount * 0.55));

    const thunderDelay = this._randomRange(lightningCfg.thunderDelayMs);
    const thunderShake = this._pickWeatherThunderShake(lightningCfg, flashAlpha, state.intensity);
    const timer = this.scene.time.delayedCall(thunderDelay, () => {
      if (state.destroyed) return;
      this.scene.shakeSystem?.shake(
        thunderShake.signature,
        thunderShake.intensityScale,
        { durationScale: thunderShake.durationScale }
      );
      this.audioController.playThunder(state.depth, thunderShake.intensityScale);
    });
    this._timers.push(timer);

    if (Math.random() < lightningCfg.clusterChance) {
      this._nextLightningAt = time + this._randomRange(lightningCfg.clusterGapMs);
    } else {
      this.schedule(time, false, state.kind);
    }
  }

  schedule(time, allowSoon, kind) {
    const cfg = this.weatherConfig.lightning;
    const delay = kind === "storm"
      ? this._randomRange(cfg.intervalMs)
      : this._randomRange(cfg.intervalMs) + 5000;
    this._nextLightningAt = time + (allowSoon && kind === "storm" ? Math.min(delay, 1800) : delay);
  }

  resize() {
    const { width, height } = this._getViewport();
    this._lightningOverlay?.setPosition(width / 2, height / 2).setSize(width, height);
    this._cavePulseOverlay?.setPosition(width / 2, height / 2).setSize(width, height);
  }

  getLightningFlashAmount() {
    const configuredRange = this.weatherConfig?.lightning?.flashAlpha;
    const maxFlash = Array.isArray(configuredRange) ? Math.max(0.001, ...configuredRange) : 1;
    return clamp01(this._lightningAlpha / maxFlash);
  }

  destroy() {
    this._timers.forEach((timer) => timer?.remove?.());
    this._timers = [];
    this._lightningOverlay?.destroy();
    this._cavePulseOverlay?.destroy();
  }

  _createOverlays() {
    const { width, height } = this._getViewport();
    const depths = this.weatherConfig.renderDepths;
    this._cavePulseOverlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x8bc8ff, 0)
      .setScrollFactor(0)
      .setDepth(depths.tint + 1)
      .setVisible(false);
    this._lightningOverlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0xeaf7ff, 0)
      .setScrollFactor(0)
      .setDepth(depths.lightning)
      .setVisible(false);
  }

  _syncOverlays(depth) {
    const cavePulseAlpha = this._cavePulse * depth.undergroundAmount * 0.036;
    this._cavePulseOverlay.setVisible(cavePulseAlpha > 0.004);
    this._cavePulseOverlay.setAlpha(cavePulseAlpha);
    this._lightningOverlay.setVisible(this._lightningAlpha > 0.004);
    this._lightningOverlay.setAlpha(this._lightningAlpha);
  }

  _pickWeatherThunderShake(lightningCfg, flashAlpha, intensity) {
    const configuredFlash = Array.isArray(lightningCfg.flashAlpha)
      ? lightningCfg.flashAlpha
      : [0, Math.max(0.001, Number(lightningCfg.flashAlpha) || 1)];
    const flashSpan = Math.max(0.001, configuredFlash[1] - configuredFlash[0]);
    const flashStrength = clamp01((flashAlpha - configuredFlash[0]) / flashSpan);
    const closeness = clamp01(flashStrength * 0.65 + intensity * 0.35);
    const roll = Math.random();
    if (closeness > 0.74 && roll > 0.58) {
      return { signature: "weatherThunder.close", intensityScale: this._randomRange([1.10, 1.45]), durationScale: this._randomRange([1.00, 1.35]) };
    }
    if (closeness > 0.36 || roll > 0.28) {
      return { signature: "weatherThunder.mid", intensityScale: this._randomRange([0.90, 1.25]), durationScale: this._randomRange([0.85, 1.15]) };
    }
    return { signature: "weatherThunder.far", intensityScale: this._randomRange([0.75, 1.05]), durationScale: this._randomRange([0.75, 1.05]) };
  }

  _getViewport() {
    const cam = this.scene.cameras.main;
    return { width: cam.width || 1280, height: cam.height || 720 };
  }

  _randomRange(range) {
    if (!Array.isArray(range)) return Number(range) || 0;
    return range[0] + Math.random() * (range[1] - range[0]);
  }
}
