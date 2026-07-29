import { createWeatherParticleTextures } from "./WeatherParticleTextures.js";
import { WeatherImpactParticleController } from "./WeatherImpactParticleController.js";

const TEXTURE_KEYS = Object.freeze({
  drip: "_weather_cave_drip",
  mist: "_weather_mist_puff",
  splash: "_weather_splash_ring",
  dust: "_weather_wind_dust",
  ripple: "_weather_puddle_ripple",
});

import { clamp01 } from "../../values/mathUtils.js";

export class WeatherParticleController {
  constructor(scene, config, weatherConfig, visualAssets = null) {
    this.scene = scene;
    this.config = config;
    this.weatherConfig = weatherConfig;
    this.visualAssets = visualAssets;
    this._accumulators = {
      splash: 0,
      drip: 0,
      mist: 0,
      dust: 0,
      steam: 0,
      ripple: 0,
    };

    if (!visualAssets) this._createTextures();
    this._createEmitters();
    this.impactController = new WeatherImpactParticleController(
      scene,
      weatherConfig,
      visualAssets,
    );
  }

  update(time, delta, state) {
    const dt = Math.min(Math.max(delta || 0, 0), 100) / 1000;
    const surfaceRain = this._isRainKind(state.kind)
      ? clamp01(state.intensity * state.depth.surfaceAmount * state.occlusion.openSkyAmount)
      : 0;
    const caveRain = clamp01(state.depth.undergroundSignal);
    const coveredRain = this._isRainKind(state.kind)
      ? clamp01(state.intensity * state.depth.surfaceAmount * state.occlusion.coveredAmount)
      : 0;
    const gustAmount = clamp01(Math.abs(state.gust) / Math.max(1, this.weatherConfig.gusts.stormMax));

    if (this.visualAssets) {
      this.impactController.update(delta, state.precipitationImpacts);
    } else {
      this._emitSplashes(surfaceRain, gustAmount, dt, state.occlusion.landingSamples);
    }
    this._emitDrips(Math.max(caveRain, coveredRain * this.weatherConfig.underground.coverDripScale), dt, state);
    this._emitMist(Math.max(caveRain, surfaceRain * 0.32 + gustAmount * surfaceRain * 0.18), dt, state.occlusion.landingSamples);
    this._emitPreStormDust(dt, state, gustAmount);
    this._emitWetSurfaceRipples(dt, state);
    this._emitPostRainSteam(dt, state);
  }

  resize() {}

  destroy() {
    [
      this._splashEmitter,
      this._dripEmitter,
      this._mistEmitter,
      this._dustEmitter,
      this._steamEmitter,
      this._rippleEmitter,
    ].forEach((emitter) => {
      emitter?.stop?.(true);
      emitter?.destroy?.();
    });
    this.impactController.destroy();
  }

  _emitSplashes(amount, gustAmount, dt, samples) {
    if (!this._splashEmitter || amount <= 0.08 || samples.length === 0) return;
    const cfg = this.weatherConfig.splashes;
    this._accumulators.splash += cfg.ratePerSecond * amount * (1 + gustAmount * cfg.gustBoost) * dt;
    const count = Math.min(cfg.maxBurst, Math.floor(this._accumulators.splash));
    if (count <= 0) return;
    this._accumulators.splash -= count;
    this._splashEmitter.setAlpha(cfg.alpha * amount);
    for (let i = 0; i < count; i += 1) {
      const sample = this._pick(samples);
      const isRoof = sample.source === "townRoof" || sample.source === "cover";
      const quantity = isRoof && amount > 0.55 ? 2 : 1;
      this._splashEmitter.emitParticleAt(
        sample.worldX + this._randomRange([-cfg.jitterPx, cfg.jitterPx]),
        sample.impactWorldY + this._randomRange([-cfg.yJitterPx, cfg.yJitterPx]),
        quantity
      );
    }
  }

  _emitDrips(amount, dt, state) {
    if (!this._dripEmitter || amount <= 0.045) return;
    const cfg = this.weatherConfig.underground;
    const view = this._getWorldView();
    const candidates = state.occlusion.coveredSamples.length > 0
      ? state.occlusion.coveredSamples
      : state.occlusion.samples.filter((sample) => (
        sample.blockerWorldY > view.y - 40
        && sample.blockerWorldY < view.y + view.height * 0.55
      ));
    this._accumulators.drip += cfg.dripRatePerSecond * amount * dt;
    const count = Math.min(cfg.dripMaxBurst, Math.floor(this._accumulators.drip));
    if (count <= 0) return;
    this._accumulators.drip -= count;
    this._dripEmitter.setAlpha(cfg.dripAlpha * amount);
    for (let i = 0; i < count; i += 1) {
      const sample = candidates.length > 0 ? this._pick(candidates) : null;
      const x = sample
        ? sample.worldX + this._randomRange([-18, 18])
        : this._randomRange([view.x, view.x + view.width]);
      const underside = sample?.blockerUndersideWorldY ?? sample?.impactWorldY;
      const y = Number.isFinite(underside)
        ? underside + cfg.dripUndersideOffsetPx
        : this._randomRange([view.y - 20, view.y + view.height * 0.36]);
      this._dripEmitter.emitParticleAt(x, y, amount > 0.72 ? 2 : 1);
    }
  }

  _emitMist(amount, dt, samples) {
    if (!this._mistEmitter || amount <= 0.08) return;
    const cfg = this.weatherConfig.underground;
    this._accumulators.mist += cfg.mistRatePerSecond * amount * dt;
    const count = Math.min(cfg.mistMaxBurst, Math.floor(this._accumulators.mist));
    if (count <= 0) return;
    this._accumulators.mist -= count;
    this._mistEmitter.setAlpha(cfg.mistAlpha * amount);
    const view = this._getWorldView();
    for (let i = 0; i < count; i += 1) {
      const sample = samples.length > 0 ? this._pick(samples) : null;
      const x = sample
        ? sample.worldX + this._randomRange([-42, 42])
        : this._randomRange([view.x - 80, view.x + view.width + 80]);
      const y = sample
        ? sample.impactWorldY - this._randomRange([0, 38])
        : this._randomRange([view.y + view.height * 0.42, view.y + view.height + 70]);
      this._mistEmitter.emitParticleAt(x, y, 1);
    }
  }

  _emitPreStormDust(dt, state, gustAmount) {
    const cfg = this.weatherConfig.rain.dust;
    const stormDistance = state.director?.stormDistance ?? 1;
    const approaching = state.director?.forecastKind === "storm"
      && stormDistance <= cfg.stormDistanceStart
      && stormDistance >= cfg.stormDistanceEnd;
    if (!this._dustEmitter || !approaching || gustAmount <= 0.08) return;

    const amount = (1 - stormDistance) * gustAmount * state.depth.surfaceAmount;
    this._accumulators.dust += cfg.ratePerSecond * amount * dt;
    const count = Math.min(cfg.maxBurst, Math.floor(this._accumulators.dust));
    if (count <= 0) return;
    this._accumulators.dust -= count;
    this._dustEmitter.setAlpha(cfg.alpha * amount);
    const view = this._getWorldView();
    for (let i = 0; i < count; i += 1) {
      const sample = state.occlusion.landingSamples.length > 0 ? this._pick(state.occlusion.landingSamples) : null;
      this._dustEmitter.emitParticleAt(
        sample
          ? sample.worldX + this._randomRange([-60, 60])
          : this._randomRange([view.x, view.x + view.width]),
        sample
          ? sample.impactWorldY - this._randomRange([5, 36])
          : view.y + view.height * 0.76,
        1
      );
    }
  }

  _emitWetSurfaceRipples(dt, state) {
    const cfg = this.weatherConfig.rain.ripples;
    const wetness = state.world?.worldWetnessAmount || 0;
    if (!this._rippleEmitter || wetness < cfg.minWetness || state.occlusion.landingSamples.length === 0) return;
    this._accumulators.ripple += cfg.ratePerSecond * wetness * dt;
    const count = Math.min(cfg.maxBurst, Math.floor(this._accumulators.ripple));
    if (count <= 0) return;
    this._accumulators.ripple -= count;
    this._rippleEmitter.setAlpha(cfg.alpha * wetness);
    for (let i = 0; i < count; i += 1) {
      const sample = this._pick(state.occlusion.landingSamples);
      this._rippleEmitter.emitParticleAt(
        sample.worldX + this._randomRange([-30, 30]),
        sample.impactWorldY + this._randomRange([-2, 8]),
        1
      );
    }
  }

  _emitPostRainSteam(dt, state) {
    const cfg = this.weatherConfig.rain.steam;
    const wetness = state.world?.worldWetnessAmount || 0;
    const rainActive = this._isRainKind(state.kind) && state.intensity > 0.12;
    if (!this._steamEmitter || rainActive || state.kind === "snow" || wetness < cfg.minWetness) return;
    this._accumulators.steam += cfg.ratePerSecond * wetness * state.depth.surfaceAmount * dt;
    const count = Math.min(cfg.maxBurst, Math.floor(this._accumulators.steam));
    if (count <= 0) return;
    this._accumulators.steam -= count;
    this._steamEmitter.setAlpha(cfg.alpha * wetness);
    const view = this._getWorldView();
    for (let i = 0; i < count; i += 1) {
      const sample = state.occlusion.landingSamples.length > 0 ? this._pick(state.occlusion.landingSamples) : null;
      this._steamEmitter.emitParticleAt(
        sample
          ? sample.worldX + this._randomRange([-48, 48])
          : this._randomRange([view.x, view.x + view.width]),
        sample
          ? sample.impactWorldY - this._randomRange([8, 44])
          : view.y + view.height * 0.70,
        1
      );
    }
  }

  _createTextures() {
    createWeatherParticleTextures(this.scene, TEXTURE_KEYS);
  }

  _createEmitters() {
    const depths = this.weatherConfig.renderDepths;
    if (this.visualAssets) {
      const presentation = this.visualAssets.presentation;
      this._dripEmitter = this._makeEmitter(
        this._imagegenAsset(presentation.drip.frameGroup),
        depths.mist,
        { ...presentation.drip, maxParticles: this.weatherConfig.underground.maxDripParticles },
      );
      this._mistEmitter = this._makeEmitter(
        this._imagegenAsset(presentation.mist.frameGroup),
        depths.mist,
        { ...presentation.mist, maxParticles: this.weatherConfig.underground.maxMistParticles },
      );
      this._dustEmitter = this._makeEmitter(
        this._imagegenAsset(presentation.dust.frameGroup),
        depths.mist - 1,
        { ...presentation.dust, maxParticles: this.weatherConfig.rain.maxParticlesDust },
      );
      this._steamEmitter = this._makeEmitter(
        this._imagegenAsset(presentation.steam.frameGroup),
        depths.mist,
        { ...presentation.steam, maxParticles: this.weatherConfig.rain.maxParticlesSteam },
      );
      this._rippleEmitter = this._makeEmitter(
        this._imagegenAsset(presentation.ripple.frameGroup),
        depths.rain - 2,
        { ...presentation.ripple, maxParticles: this.weatherConfig.rain.maxParticlesRipple },
      );
      return;
    }

    this._splashEmitter = this._makeEmitter(TEXTURE_KEYS.splash, depths.rain - 1, { speedX: { min: -18, max: 18 }, speedY: { min: -18, max: 0 }, scale: { start: 0.24, end: 1.08 }, alpha: { start: 0.28, end: 0 }, lifespan: { min: 240, max: 420 }, maxParticles: this.weatherConfig.splashes.maxParticles });
    this._dripEmitter = this._makeEmitter(TEXTURE_KEYS.drip, depths.mist, { speedX: { min: -12, max: 12 }, speedY: { min: 150, max: 320 }, scale: { min: 0.55, max: 1.08 }, alpha: { start: 0.48, end: 0.06 }, lifespan: { min: 900, max: 1500 }, maxParticles: this.weatherConfig.underground.maxDripParticles });
    this._mistEmitter = this._makeEmitter(TEXTURE_KEYS.mist, depths.mist, { speedX: { min: -20, max: 26 }, speedY: { min: -28, max: -4 }, scale: { start: 0.35, end: 1.75 }, alpha: { start: 0, end: 0.16 }, lifespan: { min: 1800, max: 3600 }, maxParticles: this.weatherConfig.underground.maxMistParticles });
    this._dustEmitter = this._makeEmitter(TEXTURE_KEYS.dust, depths.mist - 1, { speedX: { min: -45, max: 60 }, speedY: { min: -18, max: -3 }, scale: { start: 0.38, end: 1.35 }, alpha: { start: 0.18, end: 0 }, lifespan: { min: 900, max: 1800 }, maxParticles: this.weatherConfig.rain.maxParticlesDust });
    this._steamEmitter = this._makeEmitter(TEXTURE_KEYS.mist, depths.mist, { speedX: { min: -18, max: 18 }, speedY: { min: -34, max: -7 }, scale: { start: 0.25, end: 1.55 }, alpha: { start: 0.10, end: 0 }, lifespan: { min: 1400, max: 2600 }, maxParticles: this.weatherConfig.rain.maxParticlesSteam });
    this._rippleEmitter = this._makeEmitter(TEXTURE_KEYS.ripple, depths.rain - 2, { speedX: { min: -3, max: 3 }, speedY: { min: -1, max: 1 }, scale: { start: 0.35, end: 1.12 }, alpha: { start: 0.24, end: 0 }, lifespan: { min: 420, max: 760 }, maxParticles: this.weatherConfig.rain.maxParticlesRipple });
  }

  _makeEmitter(asset, depth, options) {
    const textureKey = typeof asset === "string" ? asset : asset.textureKey;
    const emitterConfig = {
      x: 0,
      y: 0,
      lifespan: options.lifespan || { min: 430, max: 780 },
      speedX: options.speedX || { min: -120, max: 90 },
      speedY: options.speedY || { min: 760, max: 1280 },
      rotate: options.rotate || { min: -7, max: 11 },
      scale: options.scale,
      alpha: options.alpha,
      frequency: -1,
      quantity: 1,
      maxParticles: options.maxParticles,
      blendMode: this._resolveBlendMode(options.blendMode),
    };
    if (typeof asset !== "string") emitterConfig.frame = asset.frames;
    const emitter = this.scene.add.particles(0, 0, textureKey, emitterConfig)
      .setScrollFactor(1)
      .setDepth(depth)
      .setAlpha(0);
    emitter.stop(true);
    return emitter;
  }

  _imagegenAsset(frameGroup) {
    return {
      textureKey: this.visualAssets.textureKey,
      frames: this.visualAssets.frames[frameGroup],
    };
  }

  _resolveBlendMode(name) {
    if (name === "normal") return Phaser.BlendModes.NORMAL;
    if (name === "screen") return Phaser.BlendModes.SCREEN;
    return Phaser.BlendModes.ADD;
  }

  _getWorldView() {
    const cam = this.scene.cameras.main;
    const view = cam.worldView;
    return {
      x: view?.x ?? cam.scrollX ?? 0,
      y: view?.y ?? cam.scrollY ?? 0,
      width: view?.width ?? cam.width ?? this.config.viewportWidth,
      height: view?.height ?? cam.height ?? this.config.viewportHeight,
    };
  }

  _isRainKind(kind) {
    return kind === "drizzle" || kind === "rain" || kind === "storm";
  }

  _pick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  _randomRange(range) {
    return range[0] + Math.random() * (range[1] - range[0]);
  }
}
