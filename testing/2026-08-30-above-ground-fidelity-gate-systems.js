import { ASSET_KEYS } from "../values/assetKeys.js";
import {
  GAMEPLAY_PROFILE_IDS,
  createGameplayCapabilities,
} from "../values/gameplayCapabilities.js";
import { SKYLINE_WEATHER_VFX } from "../values/skylineWeatherVfx.js";
import { WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS } from
  "../values/worldVisualSurfaceHeroLandmarks.js";
import { getWorldVisualPreloadAssets } from "../values/worldVisualRuntime.js";
import { AtmosphereSystem } from "../systems/environment/AtmosphereSystem.js";
import { DayNightCycle } from "../systems/environment/DayNightCycle.js";
import { WeatherSystem } from "../systems/environment/WeatherSystem.js";
import { WorldVisualSurfaceAtmosphereLayer } from
  "../world/rendering/scenic-world/WorldVisualSurfaceAtmosphereLayer.js";
import { createWorldVisualSurfaceHeroOwner } from
  "../world/rendering/scenic-world/WorldVisualSurfaceHeroRuntime.js";
import { WorldVisualSurfaceStage } from
  "../world/rendering/scenic-world/WorldVisualSurfaceStage.js";

export function preloadAboveGroundFidelityGateAssets(
  scene,
  surfaceConfig,
  plateAsset,
  fidelityConfig,
) {
  scene.load.setBaseURL("../");
  for (const asset of getWorldVisualPreloadAssets(surfaceConfig, globalThis.location.search)) {
    if (asset.type === "video") scene.load.video(asset.key, asset.path, true);
    else scene.load.image(asset.key, asset.path);
  }
  scene.load.image(plateAsset.key, plateAsset.path);
  const hero = WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS.observatoryTelescope;
  scene.load.image(hero.key, hero.path);
  for (const [name, sheet] of Object.entries(SKYLINE_WEATHER_VFX.sheets)) {
    scene.load.image(
      ASSET_KEYS.environment.skylineWeatherVfx[name],
      SKYLINE_WEATHER_VFX.assetBasePath + sheet.file,
    );
  }
  scene.load.spritesheet(
    ASSET_KEYS.environment.skylineWeatherVfx.particles,
    SKYLINE_WEATHER_VFX.assetBasePath + SKYLINE_WEATHER_VFX.particleSheet.file,
    {
      frameWidth: SKYLINE_WEATHER_VFX.particleSheet.frameWidth,
      frameHeight: SKYLINE_WEATHER_VFX.particleSheet.frameHeight,
    },
  );
  scene.load.on("loaderror", file => {
    const message = `[AboveGroundFidelityGate] Asset failed: ${file?.src || "unknown"}`;
    globalThis.__aboveGroundFidelityIssues?.push?.(message);
    console.error(message);
  });
  scene.fidelityConfig = fidelityConfig;
}

function flatSurfaceWorld(review) {
  return Object.freeze({
    width: 280,
    depth: review.map.bottomTileExclusive,
    tileSize: review.tileSize,
    isSolid: (tx, ty) => tx >= 0 && tx < 280 && ty >= review.surfaceTileY,
  });
}

function cameraBounds(scene, tileSize) {
  const view = scene.cameras.main.worldView;
  return {
    left: view.left / tileSize,
    right: view.right / tileSize,
    top: view.top / tileSize,
    bottom: view.bottom / tileSize,
  };
}

export class AboveGroundFidelityGateSystems {
  constructor(scene, review, config, surfaceConfig, plateAsset, runtimeEnabled) {
    this.scene = scene;
    this.review = review;
    this.config = config;
    this.surfaceConfig = surfaceConfig;
    this.plateAsset = plateAsset;
    this.runtimeEnabled = runtimeEnabled;
    this.motionEnabled = config.runtime.defaultMotionEnabled;
    this.lighting = this._emptyLighting();
  }

  create() {
    const cameraZoom = this.scene.cameras.main.zoom;
    const fixedZoomOffsetX = -this.review.width * (1 - cameraZoom) / (2 * cameraZoom);
    const fixedZoomOffsetY = -this.review.height * (1 - cameraZoom) / (2 * cameraZoom);
    this.plate = this.scene.add.image(
      fixedZoomOffsetX,
      fixedZoomOffsetY,
      this.plateAsset.key,
    )
      .setOrigin(0)
      .setDepth(this.config.plate.depth)
      .setScrollFactor(this.config.plate.scrollFactor)
      // Fixed-to-camera objects still inherit camera zoom in Phaser. Compensate
      // once so the untouched plate fills the logical 16:9 viewport exactly.
      .setDisplaySize(
        this.review.width / cameraZoom,
        this.review.height / cameraZoom,
      )
      .setTint(this.config.plate.tint)
      .setAlpha(this.config.plate.alpha);
    this.plate.name = "fidelity-gate-authoritative-imagegen-plate";
    if (!this.runtimeEnabled) return;

    const capabilities = createGameplayCapabilities(
      GAMEPLAY_PROFILE_IDS.FULL_REVIEW,
      { enableDevelopmentTools: true },
    );
    this.scene.gameplayCapabilities = capabilities;
    this.scene.registry.set("gameplayCapabilities", capabilities);
    this.scene.worldModel = flatSurfaceWorld(this.review);
    this.scene.worldVisualRuntimeMode = "scenic-v2";

    this.surface = new WorldVisualSurfaceStage(this.scene, this.surfaceConfig);
    this.surface.create();
    this.surface.far.forEach(image => image.setVisible(false));
    this.surface.town?.setVisible(false);

    const heroOwner = createWorldVisualSurfaceHeroOwner(
      this.scene,
      this.scene.worldModel,
      this.config.heroQuery,
    );
    this.hero = heroOwner.create();
    this.surfaceAtmosphere = new WorldVisualSurfaceAtmosphereLayer(this.scene);
    this.surfaceAtmosphere.create(globalThis.location.search);

    this.scene.dayNightCycle = new DayNightCycle(this.scene, {
      ...this.scene.config,
      dayDurationMs: this.config.clock.dayDurationMs,
      starCount: this.config.clock.starCount,
      starTwinkleSpeed: this.config.clock.starTwinkleSpeed,
    });
    this.scene.dayNightCycle.currentTime = this.config.clock.fixedTime;
    this.scene.dayNightCycle.sunSprite.setVisible(false);
    this.scene.dayNightCycle.moonSprite.setVisible(false);
    this.scene.dayNightCycle.starContainer.setVisible(false);
    this.scene.weatherSystem = new WeatherSystem(this.scene, this.scene.config);
    this.scene.atmosphereSystem = new AtmosphereSystem(this.scene, this.scene.config);
    this.setWeather(this.config.initialWeatherId);
    this.sync(true);
  }

  sync(force = false) {
    if (!this.runtimeEnabled) return;
    const bounds = cameraBounds(this.scene, this.review.tileSize);
    const signature = [bounds.left, bounds.right, bounds.top, bounds.bottom].join(":");
    if (!force && signature === this.lastSyncSignature) return;
    this.lastSyncSignature = signature;
    this.hero?.sync(bounds, this.lighting, force);
    this.surfaceAtmosphere?.sync(bounds, this.lighting);
  }

  update(time, delta) {
    if (!this.runtimeEnabled) return;
    if (this.motionEnabled) {
      this.scene.weatherSystem.update(time, delta);
      this.scene.atmosphereSystem.update(time, delta);
      this.surfaceAtmosphere?.update(time, this.lighting);
    }
    this.lighting = this._sampleLighting();
    this.surface.update(time, this.lighting);
    this.hero?.update(time, this.lighting);
  }

  setWeather(id) {
    if (!this.runtimeEnabled) return this.config.initialWeatherId;
    const preset = this.config.weatherPresets.find(item => item.id === id)
      || this.config.weatherPresets[0];
    this.scene.weatherSystem.forceWeather(
      preset.id,
      preset.intensity,
      this.config.forcedWeatherDurationMs,
      false,
    );
    return preset.id;
  }

  setMotion(enabled) {
    this.motionEnabled = Boolean(enabled);
  }

  isReady() {
    return Boolean(this.plate?.texture?.getSourceImage?.());
  }

  snapshot() {
    const source = this.plate?.texture?.getSourceImage?.();
    const heroCount = this.hero?.active?.size || 0;
    const atmosphere = this.surfaceAtmosphere?.getSnapshot?.() || null;
    const skyline = this.scene.atmosphereSystem?.skylineWeatherVfx;
    const hazeActor = this.surfaceAtmosphere?.active?.get?.("observatory-haze");
    return {
      ready: this.isReady(),
      view: this.runtimeEnabled ? this.config.comparison.runtimeValue : this.config.comparison.sourceValue,
      plateAssetId: this.config.plate.assetId,
      plateTextureKey: this.plateAsset.key,
      plateSourceWidth: source?.width || 0,
      plateSourceHeight: source?.height || 0,
      plateDisplayWidth: this.plate?.displayWidth || 0,
      plateDisplayHeight: this.plate?.displayHeight || 0,
      plateRenderedWidth: (this.plate?.displayWidth || 0) * this.scene.cameras.main.zoom,
      plateRenderedHeight: (this.plate?.displayHeight || 0) * this.scene.cameras.main.zoom,
      plateTint: this.plate?.tintTopLeft,
      plateAlpha: this.plate?.alpha,
      plateScrollFactorX: this.plate?.scrollFactorX,
      backgroundOwners: 1,
      repeatedSkyCards: 0,
      generatedCelestialSprites: 0,
      decorativePropCount: 0,
      heroLandmarks: heroCount,
      atmosphere,
      motionSamples: this.runtimeEnabled ? {
        skylineCloudActors: skyline?.clouds?.length || 0,
        skylineCloudX: skyline?.clouds?.[0]?.x || 0,
        observatoryHazeX: hazeActor?.sprite?.x || 0,
      } : null,
      weather: this.scene.weatherSystem?.getSnapshot?.() || null,
      motionEnabled: this.motionEnabled,
      townVideoChanged: false,
      productionChanged: false,
      runtimeIssues: Object.freeze([
        ...(globalThis.__aboveGroundFidelityIssues || []),
      ]),
    };
  }

  destroy() {
    this.scene.atmosphereSystem?.destroy();
    this.scene.weatherSystem?.destroy();
    this.surfaceAtmosphere?.destroy();
    this.hero?.destroy();
    this.surface?.destroy();
    this.plate?.destroy();
  }

  _sampleLighting() {
    const weather = this.scene.weatherSystem.getLightingSnapshot();
    return {
      terrainTint: weather.sunTint || 0xffffff,
      farTint: weather.sunTint || 0xffffff,
      wet: weather.surfaceWetness || 0,
      lightning: weather.lightningFlashAmount || 0,
      fog: weather.fogAmount || 0,
      wind: weather.wind || 0,
      night: 1,
    };
  }

  _emptyLighting() {
    return { terrainTint: 0xffffff, farTint: 0xffffff, wet: 0, lightning: 0, fog: 0, wind: 0, night: 1 };
  }
}
