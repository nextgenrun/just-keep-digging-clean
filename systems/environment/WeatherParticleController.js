import { createWeatherParticleTextures } from "./WeatherParticleTextures.js";

const TEXTURE_KEYS = Object.freeze({
  rain: "_weather_rain_streak",
  rainSoft: "_weather_rain_soft_streak",
  sheet: "_weather_rain_sheet",
  drip: "_weather_cave_drip",
  mist: "_weather_mist_puff",
  splash: "_weather_splash_ring",
  dust: "_weather_wind_dust",
  ripple: "_weather_puddle_ripple",
});

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const lerp = (a, b, t) => a + (b - a) * t;

export class WeatherParticleController {
  constructor(scene, config, weatherConfig) {
    this.scene = scene;
    this.config = config;
    this.weatherConfig = weatherConfig;
    this._accumulators = {
      foreground: 0,
      midground: 0,
      sheet: 0,
      splash: 0,
      drip: 0,
      mist: 0,
      dust: 0,
      steam: 0,
      ripple: 0,
    };

    this._createTextures();
    this._createEmitters();
  }

  update(time, delta, state) {
    const dt = Math.min(Math.max(delta || 0, 0), 100) / 1000;
    const surfaceRain = this._isRainKind(state.kind)
      ? clamp01(state.intensity * state.depth.surfaceAmount * state.occlusion.openSkyAmount)
      : 0;
    const caveRain = clamp01(state.depth.undergroundSignal);
    const coveredRain = clamp01(state.intensity * state.depth.surfaceAmount * state.occlusion.coveredAmount);
    const gustAmount = clamp01(Math.abs(state.gust) / Math.max(1, this.weatherConfig.gusts.stormMax));

    this._emitSplashes(surfaceRain, gustAmount, dt, state.occlusion.landingSamples);
    this._emitDrips(Math.max(caveRain, coveredRain * this.weatherConfig.underground.coverDripScale), dt, state);
    this._emitMist(Math.max(caveRain, surfaceRain * 0.32 + gustAmount * surfaceRain * 0.18), dt, state.occlusion.landingSamples);
    this._emitPreStormDust(dt, state, gustAmount);
    this._emitWetSurfaceRipples(dt, state);
    this._emitPostRainSteam(dt, state);
  }

  resize() {}

  destroy() {
    [
      this._rainEmitter,
      this._softRainEmitter,
      this._sheetEmitter,
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
  }

  _emitRainLayer(name, emitter, amount, dt, state, samples) {
    if (!emitter || amount <= 0.025 || samples.length === 0) return;
    const layer = this.weatherConfig.rain.layers[name];
    this._accumulators[name] += layer.ratePerSecond * amount * dt;
    const count = Math.min(layer.maxBurst, Math.floor(this._accumulators[name]));
    if (count <= 0) return;
    this._accumulators[name] -= count;

    const speedY = lerp(layer.minSpeedY, layer.maxSpeedY, amount);
    const wind = state.wind + state.gust;
    emitter.ops.speedX.onChange({ min: wind * layer.windScale - layer.windSpread, max: wind * layer.windScale + layer.windSpread });
    emitter.ops.speedY.onChange({ min: speedY * 0.86, max: speedY * 1.14 });
    emitter.ops.rotate.onChange({ min: -8 + wind * 0.028, max: 10 + wind * 0.028 });
    emitter.setAlpha(layer.alpha * amount * (1 + state.lightningFlashAmount * layer.flashBoost));

    for (let i = 0; i < count; i += 1) {
      const sample = this._pick(samples);
      const startY = layer.spawnY;
      const fallDistance = Math.max(64, sample.landingScreenY - startY);
      const lifespan = Math.max(layer.minLifespanMs, Math.min(layer.maxLifespanMs, (fallDistance / speedY) * 1000));
      emitter.ops.lifespan.onChange({ min: lifespan * 0.82, max: lifespan * 1.12 });
      emitter.emitParticleAt(sample.screenX + this._randomRange([-layer.xJitterPx, layer.xJitterPx]), startY, 1);
    }
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
        sample.screenX + this._randomRange([-cfg.jitterPx, cfg.jitterPx]),
        sample.landingScreenY + this._randomRange([-cfg.yJitterPx, cfg.yJitterPx]),
        quantity
      );
    }
  }

  _emitDrips(amount, dt, state) {
    if (!this._dripEmitter || amount <= 0.045) return;
    const cfg = this.weatherConfig.underground;
    const candidates = state.occlusion.coveredSamples.length > 0
      ? state.occlusion.coveredSamples
      : state.occlusion.samples.filter((sample) => sample.blockerScreenY > -40 && sample.blockerScreenY < this._getViewport().height * 0.55);
    this._accumulators.drip += cfg.dripRatePerSecond * amount * dt;
    const count = Math.min(cfg.dripMaxBurst, Math.floor(this._accumulators.drip));
    if (count <= 0) return;
    this._accumulators.drip -= count;
    this._dripEmitter.setAlpha(cfg.dripAlpha * amount);
    for (let i = 0; i < count; i += 1) {
      const sample = candidates.length > 0 ? this._pick(candidates) : null;
      const x = sample ? sample.screenX + this._randomRange([-18, 18]) : this._randomRange([0, this._getViewport().width]);
      const y = sample ? Math.max(-12, sample.blockerScreenY + cfg.dripUndersideOffsetPx) : this._randomRange([-20, this._getViewport().height * 0.36]);
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
    for (let i = 0; i < count; i += 1) {
      const sample = samples.length > 0 ? this._pick(samples) : null;
      const x = sample ? sample.screenX + this._randomRange([-42, 42]) : this._randomRange([-80, this._getViewport().width + 80]);
      const y = sample ? sample.landingScreenY - this._randomRange([0, 38]) : this._randomRange([this._getViewport().height * 0.42, this._getViewport().height + 70]);
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
    for (let i = 0; i < count; i += 1) {
      const sample = state.occlusion.landingSamples.length > 0 ? this._pick(state.occlusion.landingSamples) : null;
      this._dustEmitter.emitParticleAt(
        sample ? sample.screenX + this._randomRange([-60, 60]) : this._randomRange([0, this._getViewport().width]),
        sample ? sample.landingScreenY - this._randomRange([5, 36]) : this._getViewport().height * 0.76,
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
        sample.screenX + this._randomRange([-30, 30]),
        sample.landingScreenY + this._randomRange([-2, 8]),
        1
      );
    }
  }

  _emitPostRainSteam(dt, state) {
    const cfg = this.weatherConfig.rain.steam;
    const wetness = state.world?.worldWetnessAmount || 0;
    const rainActive = this._isRainKind(state.kind) && state.intensity > 0.12;
    if (!this._steamEmitter || rainActive || wetness < cfg.minWetness) return;
    this._accumulators.steam += cfg.ratePerSecond * wetness * state.depth.surfaceAmount * dt;
    const count = Math.min(cfg.maxBurst, Math.floor(this._accumulators.steam));
    if (count <= 0) return;
    this._accumulators.steam -= count;
    this._steamEmitter.setAlpha(cfg.alpha * wetness);
    for (let i = 0; i < count; i += 1) {
      const sample = state.occlusion.landingSamples.length > 0 ? this._pick(state.occlusion.landingSamples) : null;
      this._steamEmitter.emitParticleAt(
        sample ? sample.screenX + this._randomRange([-48, 48]) : this._randomRange([0, this._getViewport().width]),
        sample ? sample.landingScreenY - this._randomRange([8, 44]) : this._getViewport().height * 0.70,
        1
      );
    }
  }

  _createTextures() {
    createWeatherParticleTextures(this.scene, TEXTURE_KEYS);
  }

  _createEmitters() {
    const depths = this.weatherConfig.renderDepths;
    this._rainEmitter = this._makeEmitter(TEXTURE_KEYS.rain, depths.rain, { scale: { min: 0.88, max: 1.35 }, alpha: { start: 0.58, end: 0.05 }, maxParticles: this.weatherConfig.rain.maxParticlesForeground });
    this._softRainEmitter = this._makeEmitter(TEXTURE_KEYS.rainSoft, depths.rain - 1, { scale: { min: 0.58, max: 1.02 }, alpha: { start: 0.34, end: 0.03 }, maxParticles: this.weatherConfig.rain.maxParticlesMidground });
    this._sheetEmitter = this._makeEmitter(TEXTURE_KEYS.sheet, depths.rain - 2, { scale: { min: 1.2, max: 1.8 }, alpha: { start: 0.22, end: 0.02 }, maxParticles: this.weatherConfig.rain.maxParticlesSheet });
    this._splashEmitter = this._makeEmitter(TEXTURE_KEYS.splash, depths.rain - 1, { speedX: { min: -18, max: 18 }, speedY: { min: -18, max: 0 }, scale: { start: 0.24, end: 1.08 }, alpha: { start: 0.28, end: 0 }, lifespan: { min: 240, max: 420 }, maxParticles: this.weatherConfig.splashes.maxParticles });
    this._dripEmitter = this._makeEmitter(TEXTURE_KEYS.drip, depths.mist, { speedX: { min: -12, max: 12 }, speedY: { min: 150, max: 320 }, scale: { min: 0.55, max: 1.08 }, alpha: { start: 0.48, end: 0.06 }, lifespan: { min: 900, max: 1500 }, maxParticles: this.weatherConfig.underground.maxDripParticles });
    this._mistEmitter = this._makeEmitter(TEXTURE_KEYS.mist, depths.mist, { speedX: { min: -20, max: 26 }, speedY: { min: -28, max: -4 }, scale: { start: 0.35, end: 1.75 }, alpha: { start: 0, end: 0.16 }, lifespan: { min: 1800, max: 3600 }, maxParticles: this.weatherConfig.underground.maxMistParticles });
    this._dustEmitter = this._makeEmitter(TEXTURE_KEYS.dust, depths.mist - 1, { speedX: { min: -45, max: 60 }, speedY: { min: -18, max: -3 }, scale: { start: 0.38, end: 1.35 }, alpha: { start: 0.18, end: 0 }, lifespan: { min: 900, max: 1800 }, maxParticles: this.weatherConfig.rain.maxParticlesDust });
    this._steamEmitter = this._makeEmitter(TEXTURE_KEYS.mist, depths.mist, { speedX: { min: -18, max: 18 }, speedY: { min: -34, max: -7 }, scale: { start: 0.25, end: 1.55 }, alpha: { start: 0.10, end: 0 }, lifespan: { min: 1400, max: 2600 }, maxParticles: this.weatherConfig.rain.maxParticlesSteam });
    this._rippleEmitter = this._makeEmitter(TEXTURE_KEYS.ripple, depths.rain - 2, { speedX: { min: -3, max: 3 }, speedY: { min: -1, max: 1 }, scale: { start: 0.35, end: 1.12 }, alpha: { start: 0.24, end: 0 }, lifespan: { min: 420, max: 760 }, maxParticles: this.weatherConfig.rain.maxParticlesRipple });
  }

  _makeEmitter(textureKey, depth, options) {
    const emitter = this.scene.add.particles(0, 0, textureKey, {
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
      blendMode: Phaser.BlendModes.ADD,
    }).setScrollFactor(0).setDepth(depth).setAlpha(0);
    emitter.stop(true);
    return emitter;
  }

  _getViewport() {
    const cam = this.scene.cameras.main;
    return { width: cam.width || this.config.viewportWidth || 1280, height: cam.height || this.config.viewportHeight || 720 };
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
