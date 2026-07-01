import { WEATHER_CONFIG } from "../../values/weatherConfig.js";
import { WeatherAudioController } from "./WeatherAudioController.js";
import { WeatherDirector } from "./WeatherDirector.js";
import { WeatherGameplayController } from "./WeatherGameplayController.js";
import { WeatherLightningController } from "./WeatherLightningController.js";
import { WeatherOcclusionSampler } from "./WeatherOcclusionSampler.js";
import { WeatherParticleController } from "./WeatherParticleController.js";
import { WeatherWorldState } from "./WeatherWorldState.js";

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const lerp = (a, b, t) => a + (b - a) * t;

export class WeatherSystem {
  constructor(scene, config = {}, weatherConfig = WEATHER_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.weatherConfig = weatherConfig;

    this.kind = weatherConfig.initialKind || "clear";
    this.intensity = 0;
    this.targetIntensity = 0;
    this.wind = 0;
    this.targetWind = 0;
    this.gust = 0;
    this.targetGust = 0;
    this.surfaceWetness = 0;

    this._destroyed = false;

    this.director = new WeatherDirector(scene, weatherConfig);
    this.occlusionSampler = new WeatherOcclusionSampler(scene, config, weatherConfig);
    this.worldState = new WeatherWorldState(scene, config, weatherConfig);
    this.gameplayController = new WeatherGameplayController(weatherConfig);
    this.particleController = new WeatherParticleController(scene, config, weatherConfig);
    this.audioController = new WeatherAudioController(scene, weatherConfig);
    this.lightningController = new WeatherLightningController(scene, weatherConfig, this.audioController);

    this._createTintOverlay();
    this._applyDirectorPatch(this.director.start(this.scene.time.now || 0, true), true);
  }

  update(time, delta) {
    if (!this.weatherConfig.enabled || this._destroyed) return;

    const dt = Math.min(Math.max(delta || 0, 0), 100);
    const directorPatch = this.director.update(time);
    this._applyDirectorPatch(directorPatch, false);

    const transitionT = 1 - Math.exp(-(this.weatherConfig.transitionRatePerSecond || 0.4) * dt / 1000);
    const windT = 1 - Math.exp(-(this.weatherConfig.windRatePerSecond || 0.3) * dt / 1000);
    const gustT = 1 - Math.exp(-(this.weatherConfig.gusts?.ratePerSecond || 0.7) * dt / 1000);
    this.intensity = lerp(this.intensity, this.targetIntensity, transitionT);
    this.wind = lerp(this.wind, this.targetWind, windT);
    this.gust = lerp(this.gust, this.targetGust, gustT);

    const depth = this._getDepthFactors();
    const occlusion = this.occlusionSampler.update(time, {
      intensity: this.intensity,
      depth,
    });
    const director = this.director.getSnapshot();
    const world = this.worldState.update(dt, {
      kind: this.kind,
      intensity: this.intensity,
      depth,
      occlusion,
      isRainKind: this._isRainKind(),
    });
    this.surfaceWetness = world.worldWetnessAmount;
    const gameplay = this.gameplayController.update({
      kind: this.kind,
      intensity: this.intensity,
      depth,
      world,
    });

    this._updateTintOverlay(depth, dt);
    this.lightningController.update(time, dt, {
      kind: this.kind,
      intensity: this.intensity,
      depth,
      stormDistance: director.stormDistance,
      destroyed: this._destroyed,
    });
    this.particleController.update(time, dt, {
      kind: this.kind,
      intensity: this.intensity,
      wind: this.wind,
      gust: this.gust,
      depth,
      occlusion,
      world,
      gameplay,
      director,
      surfaceWetness: world.worldWetnessAmount,
      lightningFlashAmount: this.getLightningFlashAmount(),
    });
    this.audioController.update({
      intensity: this.intensity,
      depth,
      occlusion,
      world,
      director,
    });
  }

  resize() {
    const { width, height } = this._getViewport();
    this._tintOverlay?.setPosition(width / 2, height / 2).setSize(width, height);
    this.occlusionSampler.resize();
    this.particleController.resize();
    this.lightningController.resize();
  }

  getLightningFlashAmount() {
    return this.lightningController.getLightningFlashAmount();
  }

  forceWeather(kind, intensity = 1, durationMs = 20000) {
    if (!this.weatherConfig.phases[kind]) {
      console.warn(`[WeatherSystem] Unknown weather kind: ${kind}`);
      return;
    }

    const now = this.scene.time.now || 0;
    this.kind = kind;
    this.targetIntensity = clamp01(intensity);
    this._applyDirectorPatch(this.director.force(kind, intensity, durationMs, now), false);
    this.lightningController.schedule(now, true, this.kind);
  }

  getPlayerWeatherState() {
    return {
      ...this.worldState.getPlayerWeatherState(),
      ...this.gameplayController.getSnapshot(),
    };
  }

  getWeatherAtWorldPoint(x, y) {
    return this.worldState.getWeatherAtWorldPoint(x, y);
  }

  setWeatherDebugEnabled(enabled) {
    this.occlusionSampler.setDebugEnabled(Boolean(enabled));
  }

  getSnapshot() {
    const depth = this._getDepthFactors();
    const occlusion = this.occlusionSampler.getSnapshot();
    const director = this.director.getSnapshot();
    const world = this.worldState.getSnapshot();
    const gameplay = this.gameplayController.getSnapshot();
    return {
      kind: this.kind,
      intensity: this.intensity,
      targetIntensity: this.targetIntensity,
      wind: this.wind,
      forecastKind: director.forecastKind,
      forecastProgress: director.forecastProgress,
      stormDistance: director.stormDistance,
      windGustAmount: this._getWindGustAmount(),
      gustAmount: this._getWindGustAmount(),
      surfaceAmount: depth.surfaceAmount,
      undergroundAmount: depth.undergroundAmount,
      undergroundSignal: depth.undergroundSignal,
      coveredAmount: occlusion.coveredAmount,
      openSkyAmount: occlusion.openSkyAmount,
      playerShelterAmount: world.playerShelterAmount,
      visibilityPenalty: gameplay.visibilityPenalty,
      movementWetnessPenalty: gameplay.movementWetnessPenalty,
      campfireExposure: gameplay.campfireExposure,
      worldWetnessAmount: world.worldWetnessAmount,
      surfaceWetness: world.worldWetnessAmount,
      isStorming: this.kind === "storm" && this.intensity > 0.55,
    };
  }

  getLightingSnapshot() {
    const depth = this._getDepthFactors();
    const occlusion = this.occlusionSampler.getSnapshot();
    const director = this.director.getSnapshot();
    const world = this.worldState.getSnapshot();
    const gameplay = this.gameplayController.getSnapshot();
    const lightningFlashAmount = this.getLightningFlashAmount();
    const rainAmount = this._isRainKind() ? clamp01(this.intensity) : 0;
    const stormAmount = this.kind === "storm" ? clamp01(this.intensity) : 0;

    return {
      kind: this.kind,
      intensity: clamp01(this.intensity),
      targetIntensity: clamp01(this.targetIntensity),
      wind: this.wind,
      forecastKind: director.forecastKind,
      forecastProgress: director.forecastProgress,
      stormDistance: director.stormDistance,
      windGustAmount: this._getWindGustAmount(),
      gustAmount: this._getWindGustAmount(),
      rainAmount,
      stormAmount,
      surfaceAmount: depth.surfaceAmount,
      undergroundAmount: depth.undergroundAmount,
      undergroundSignal: depth.undergroundSignal,
      coveredAmount: occlusion.coveredAmount,
      openSkyAmount: occlusion.openSkyAmount,
      playerShelterAmount: world.playerShelterAmount,
      visibilityPenalty: gameplay.visibilityPenalty,
      movementWetnessPenalty: gameplay.movementWetnessPenalty,
      campfireExposure: gameplay.campfireExposure,
      worldWetnessAmount: world.worldWetnessAmount,
      surfaceWetness: world.worldWetnessAmount,
      lightningFlashAmount,
      isStorming: stormAmount > 0.55,
    };
  }

  destroy() {
    this._destroyed = true;
    this.occlusionSampler.destroy();
    this.particleController.destroy();
    this.lightningController.destroy();
    this.audioController.destroy();
    this._tintOverlay?.destroy();
  }

  _createTintOverlay() {
    const { width, height } = this._getViewport();
    this._tintOverlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(this.weatherConfig.renderDepths.tint)
      .setVisible(false);
  }

  _applyDirectorPatch(patch, immediate) {
    if (!patch) return;
    this.kind = patch.kind || this.kind;
    if (Number.isFinite(patch.targetIntensity)) this.targetIntensity = clamp01(patch.targetIntensity);
    if (Number.isFinite(patch.targetWind)) this.targetWind = patch.targetWind;
    if (patch.gustRetarget) this._retargetGust();
    if (immediate) {
      this.intensity = this.targetIntensity;
      this.wind = this.targetWind;
      this.gust = this.targetGust;
    }
    if (patch.entered) {
      this.lightningController.schedule(this.scene.time.now || 0, true, this.kind);
    }
  }

  _retargetGust() {
    const cfg = this.weatherConfig.gusts;
    const max = this.kind === "storm" ? cfg.stormMax : this.kind === "rain" ? cfg.rainMax : cfg.drizzleMax;
    this.targetGust = (Math.random() * 2 - 1) * max * this.intensity;
  }

  _getDepthFactors() {
    const cam = this.scene.cameras.main;
    const view = cam.worldView;
    const cameraMidY = (view?.y ?? cam.scrollY ?? 0) + (view?.height ?? cam.height ?? this.config.viewportHeight) * 0.5;
    const surfaceY = (this.config.topAirRows || 65) * (this.config.tileSize || 94);
    const depthTiles = Math.max(0, (cameraMidY - surfaceY) / (this.config.tileSize || 94));
    const cfg = this.weatherConfig.depth;
    const surfaceAmount = clamp01(1 - depthTiles / cfg.surfaceFadeTiles);
    const undergroundAmount = clamp01(depthTiles / cfg.undergroundFullTiles);
    const deepFade = 1 - clamp01((depthTiles - cfg.deepFadeStartTiles) / Math.max(1, cfg.deepFadeEndTiles - cfg.deepFadeStartTiles));
    const stormFloor = this.kind === "storm" ? cfg.stormMinimumSignal : 0;
    const undergroundSignal = Math.max(stormFloor, this.intensity * undergroundAmount) * deepFade;
    return { depthTiles, surfaceAmount, undergroundAmount, deepFade, undergroundSignal: clamp01(undergroundSignal) };
  }

  _updateTintOverlay(depth) {
    const nightAmount = this.scene.dayNightCycle?.getNightAmount?.() ?? (this.scene.dayNightCycle?.isNightTime?.() ? 1 : 0);
    const lighting = this.weatherConfig.lighting;
    const surfaceWeather = this.intensity * depth.surfaceAmount;
    const stormAmount = this.kind === "storm" ? this.intensity : 0;
    const visibilityPenalty = this.gameplayController.getSnapshot().visibilityPenalty || 0;
    const tintAlpha = clamp01(
      nightAmount * depth.surfaceAmount * lighting.nightAlpha +
      surfaceWeather * lighting.rainAlpha +
      stormAmount * depth.surfaceAmount * lighting.stormAlpha +
      depth.undergroundSignal * lighting.undergroundAlpha +
      visibilityPenalty
    );
    const tintColor = depth.undergroundAmount > 0.45
      ? lighting.caveTint
      : stormAmount > 0.6 ? lighting.stormTint : nightAmount > 0.45 ? lighting.nightTint : this.intensity > 0.2 ? lighting.rainTint : lighting.clearTint;
    this._tintOverlay.setVisible(tintAlpha > 0.005);
    this._tintOverlay.setFillStyle(tintColor, tintAlpha);
  }

  _getWindGustAmount() {
    return clamp01(Math.abs(this.gust) / Math.max(1, this.weatherConfig.gusts?.stormMax || 1));
  }

  _isRainKind() {
    return this.kind === "drizzle" || this.kind === "rain" || this.kind === "storm";
  }

  _getViewport() {
    const cam = this.scene.cameras.main;
    return { width: cam.width || this.config.viewportWidth || 1280, height: cam.height || this.config.viewportHeight || 720 };
  }

}
