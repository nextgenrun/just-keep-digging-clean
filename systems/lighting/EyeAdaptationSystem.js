import {
  advanceEyeAdaptation,
  computeEyeAdaptationTarget,
} from "./fireLightMath.js";

export class EyeAdaptationSystem {
  constructor(scene, config, enabled = true) {
    this.scene = scene;
    this.config = config;
    this.enabled = Boolean(enabled);
    this.available = false;
    this.darkVeil = null;
    this.bloom = null;
    this._width = 0;
    this._height = 0;
    this._effectScale = 1;
    this._state = {
      targetLuminance: config.eyeAdaptation.initialLuminance,
      perceivedLuminance: config.eyeAdaptation.initialLuminance,
      darkVeilAlpha: 0,
      bloomAlpha: 0,
    };
    this._create();
  }

  _create() {
    if (!this.enabled || !this.scene.add?.rectangle) return;
    const cfg = this.config.eyeAdaptation;
    try {
      this.darkVeil = this.scene.add.rectangle(0, 0, 1, 1, cfg.darkVeilColor, 1)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(this.config.renderDepth.eyeDarkVeil)
        .setVisible(false)
        .setAlpha(0);

      if (this.scene.textures?.exists?.(this.config.assetKeys.lightVolume)) {
        this.bloom = this.scene.add.image(
          0,
          0,
          this.config.assetKeys.lightVolume,
          cfg.bloomFrame
        )
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(this.config.renderDepth.eyeBloom)
          .setTint(cfg.bloomTint)
          .setVisible(false)
          .setAlpha(0);
        const blend = globalThis.Phaser?.BlendModes?.ADD;
        if (blend !== undefined) this.bloom.setBlendMode(blend);
      }
      this.resize();
      this.available = true;
    } catch (error) {
      console.warn("[EyeAdaptationSystem] Exposure overlays unavailable.", error);
      this.destroy();
    }
  }

  render({ deltaMs, lighting, torch, reducedFlicker, effectScale = 1 }) {
    if (!this.enabled || !this.available) return false;
    this._ensureLayout();
    const target = computeEyeAdaptationTarget(
      lighting,
      torch,
      this.config.eyeAdaptation
    );
    this._state = advanceEyeAdaptation(
      this._state,
      target,
      deltaMs,
      this.config.eyeAdaptation,
      reducedFlicker
    );
    this._effectScale = Math.max(0, Math.min(1, Number(effectScale) || 0));
    this._applyAlpha(
      this.darkVeil,
      this._state.darkVeilAlpha * this._effectScale,
      this.config.eyeAdaptation.inactiveAlphaThreshold
    );
    this._applyAlpha(
      this.bloom,
      this._state.bloomAlpha * this._effectScale,
      this.config.eyeAdaptation.inactiveAlphaThreshold
    );
    return true;
  }

  _applyAlpha(image, alpha, threshold) {
    if (!image) return;
    const visible = alpha > threshold;
    image.setVisible(visible).setAlpha(visible ? alpha : 0);
  }

  _ensureLayout() {
    const camera = this.scene.cameras?.main;
    const width = camera?.width || this.scene.config?.viewportWidth || 1280;
    const height = camera?.height || this.scene.config?.viewportHeight || 720;
    if (width !== this._width || height !== this._height) this.resize();
  }

  resize() {
    const camera = this.scene.cameras?.main;
    const width = camera?.width || this.scene.config?.viewportWidth || 1280;
    const height = camera?.height || this.scene.config?.viewportHeight || 720;
    this._width = width;
    this._height = height;
    this.darkVeil
      ?.setPosition(0, 0)
      ?.setDisplaySize(width, height);
    this.bloom
      ?.setPosition(width * 0.5, height * 0.5)
      ?.setDisplaySize(
        width * this.config.eyeAdaptation.bloomScale,
        height * this.config.eyeAdaptation.bloomScale
      );
  }

  hide() {
    this.darkVeil?.setVisible(false)?.setAlpha(0);
    this.bloom?.setVisible(false)?.setAlpha(0);
  }

  getSnapshot() {
    return {
      enabled: this.enabled,
      available: this.available,
      ...this._state,
      effectScale: this._effectScale,
      appliedDarkVeilAlpha: this._state.darkVeilAlpha * this._effectScale,
      appliedBloomAlpha: this._state.bloomAlpha * this._effectScale,
    };
  }

  destroy() {
    this.darkVeil?.destroy?.();
    this.bloom?.destroy?.();
    this.darkVeil = null;
    this.bloom = null;
    this.available = false;
  }
}
