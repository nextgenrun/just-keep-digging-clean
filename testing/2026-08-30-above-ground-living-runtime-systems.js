import { ASSET_KEYS } from "../values/assetKeys.js";
import {
  GAMEPLAY_PROFILE_IDS,
  createGameplayCapabilities,
} from "../values/gameplayCapabilities.js";
import { HEAVENBLOCKS_VISUAL_CONFIG } from "../values/heavenblocksVisualConfig.js";
import { SKYLINE_WEATHER_VFX } from "../values/skylineWeatherVfx.js";
import { V11_SKY_ISLAND_LAYOUT } from "../values/v11SkyIslandLayout.js";
import {
  WORLD_VISUAL_PROP_ATLASES_V3,
  WORLD_VISUAL_SKY_PROP_PLACEMENTS_V3,
} from
  "../values/generated/worldVisualPropLibraryV3/index.js";
import { WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS } from
  "../values/worldVisualSurfaceHeroLandmarks.js";
import {
  getWorldVisualPreloadAssets,
} from "../values/worldVisualRuntime.js";
import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  resolveWorldVisualDepthBackdropBlendMask,
} from "../values/worldVisualDepthBackdrops.js";
import { AtmosphereSystem } from "../systems/environment/AtmosphereSystem.js";
import { DayNightCycle } from "../systems/environment/DayNightCycle.js";
import { V11SkyIslandVisualSystem } from
  "../systems/environment/V11SkyIslandVisualSystem.js";
import { WeatherSystem } from "../systems/environment/WeatherSystem.js";
import { WorldVisualSkyCohesionLayer } from
  "../world/rendering/scenic-world/WorldVisualSkyCohesionLayer.js";
import { WorldVisualSurfaceAtmosphereLayer } from
  "../world/rendering/scenic-world/WorldVisualSurfaceAtmosphereLayer.js";
import { createWorldVisualSurfaceHeroOwner } from
  "../world/rendering/scenic-world/WorldVisualSurfaceHeroRuntime.js";
import { WorldVisualSurfacePropLayer } from
  "../world/rendering/scenic-world/WorldVisualSurfacePropLayer.js";
import { WorldVisualSurfaceStage } from
  "../world/rendering/scenic-world/WorldVisualSurfaceStage.js";

const SKY_ISLAND_ASSET_ROOT = "sprites/backgrounds/world-v11-sky-islands-v1";

export function preloadAboveGroundLivingAssets(scene, surfaceConfig) {
  scene.load.setBaseURL("../");
  for (const asset of getWorldVisualPreloadAssets(surfaceConfig, "?surfaceMotion=town-air")) {
    if (asset.type === "video") scene.load.video(asset.key, asset.path, true);
    else scene.load.image(asset.key, asset.path);
  }
  const blendMask = resolveWorldVisualDepthBackdropBlendMask(
    WORLD_VISUAL_DEPTH_BACKDROPS,
    "?surfaceMotion=town-air",
  );
  scene.load.image(blendMask.key, blendMask.path);
  for (const atlas of WORLD_VISUAL_PROP_ATLASES_V3) {
    scene.load.atlas(atlas.key, atlas.path, atlas.dataPath);
  }
  for (const definitions of Object.values(ASSET_KEYS.environment.surfaceProps)) {
    for (const asset of Object.values(definitions)) scene.load.image(asset.key, asset.path);
  }
  for (const asset of Object.values(WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS)) {
    scene.load.image(asset.key, asset.path);
  }
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
  const islandAssets = [
    [ASSET_KEYS.background.skyIslands.level1Platform, "level1-platform.webp"],
    [ASSET_KEYS.background.skyIslands.level1Portal, "level1-eclipse-gate.webp"],
    [ASSET_KEYS.background.skyIslands.level2Platform, "level2-platform.webp"],
    [ASSET_KEYS.background.skyIslands.level2Portal, "level2-eclipse-gate.webp"],
  ];
  islandAssets.forEach(([key, file]) => scene.load.image(key, `${SKY_ISLAND_ASSET_ROOT}/${file}`));
  HEAVENBLOCKS_VISUAL_CONFIG.regions
    .flatMap(region => region.layers)
    .forEach(asset => scene.load.image(asset.key, asset.path));
}

function flatSurfaceWorld(review) {
  return Object.freeze({
    width: 280,
    depth: review.map.bottomTileExclusive,
    tileSize: review.tileSize,
    isSolid: (tx, ty) => tx >= 0 && tx < 280 && ty >= review.surfaceTileY,
  });
}

function boundsFromCamera(camera, tileSize) {
  const view = camera.worldView;
  return {
    left: view.left / tileSize,
    right: view.right / tileSize,
    top: view.top / tileSize,
    bottom: view.bottom / tileSize,
  };
}

export class AboveGroundLivingRuntimeSystems {
  constructor(scene, review, livingReview, backgroundConfigs) {
    this.scene = scene;
    this.review = review;
    this.config = livingReview;
    this.backgroundConfigs = backgroundConfigs;
    this.excludedFloatingLibraryIds = new Set(
      WORLD_VISUAL_SKY_PROP_PLACEMENTS_V3
        .filter(item => item.floating)
        .map(item => item.id),
    );
    this.lighting = this._emptyLighting();
  }

  create() {
    const capabilities = createGameplayCapabilities(
      GAMEPLAY_PROFILE_IDS.FULL_REVIEW,
      { enableDevelopmentTools: true },
    );
    this.scene.gameplayCapabilities = capabilities;
    this.scene.registry.set("gameplayCapabilities", capabilities);
    this.scene.worldModel = flatSurfaceWorld(this.review);
    this.scene.worldVisualRuntimeMode = "scenic-v2";

    this.sky = new WorldVisualSkyCohesionLayer(
      this.scene,
      this.backgroundConfigs.sky,
      "?skyComposition=ordered",
    );
    this.sky.create();
    this.surface = new WorldVisualSurfaceStage(this.scene, this.backgroundConfigs.surface);
    this.surface.create();
    // The cohesion sky is the sole wide backdrop owner. The repeated moonlit
    // plate would otherwise repeat its baked moon at every horizontal segment.
    this.surface.far.forEach(image => image.setVisible(false));

    const heroOwner = createWorldVisualSurfaceHeroOwner(
      this.scene,
      this.scene.worldModel,
      globalThis.location.search,
    );
    this.surfaceProps = new WorldVisualSurfacePropLayer(this.scene, this.scene.worldModel);
    this.surfaceProps.create(globalThis.location.search, {
      suppressedPlacementIds: heroOwner.suppression.retained,
    });
    this.surfacePropExpansion = heroOwner.createExpansion(heroOwner.suppression.expansion);
    this.surfaceHeroes = heroOwner.create();
    this.surfaceAtmosphere = new WorldVisualSurfaceAtmosphereLayer(this.scene);
    this.surfaceAtmosphere.create(globalThis.location.search);

    this.skyIslands = new V11SkyIslandVisualSystem(this.scene);
    this.skyIslands.create();
    this._ensureFullReviewSkyIslandSupport();
    this._applyExclusiveHeavenblockSkyOwnership();

    this.scene.dayNightCycle = new DayNightCycle(this.scene, {
      ...this.scene.config,
      dayDurationMs: this.config.nightCycle.dayDurationMs,
      starCount: this.config.nightCycle.starCount,
      starTwinkleSpeed: this.config.nightCycle.starTwinkleSpeed,
    });
    this.scene.dayNightCycle.currentTime = this.config.nightCycle.startTime;
    // The checked-in sky cards own celestial silhouettes and stars.
    this.scene.dayNightCycle.sunSprite.setVisible(false);
    this.scene.dayNightCycle.moonSprite.setVisible(false);
    this.scene.dayNightCycle.starContainer.setVisible(false);
    this.scene.weatherSystem = new WeatherSystem(this.scene, this.scene.config);
    this.scene.atmosphereSystem = new AtmosphereSystem(this.scene, this.scene.config);
    this.setWeather(this.config.initialWeatherId);
  }

  sync(force = false) {
    const bounds = boundsFromCamera(this.scene.cameras.main, this.review.tileSize);
    this.sky.sync(bounds, this.lighting, force);
    this.surfaceProps?.sync(bounds, this.lighting, force);
    this.surfacePropExpansion?.sync(bounds, this.lighting, force);
    this.surfaceHeroes?.sync(bounds, this.lighting, force);
    this.surfaceAtmosphere?.sync(bounds, this.lighting);
  }

  update(time, delta, motionEnabled) {
    if (motionEnabled) {
      this.scene.dayNightCycle.update(delta);
      if (this.scene.dayNightCycle.currentTime > this.config.nightCycle.endTime) {
        this.scene.dayNightCycle.currentTime = this.config.nightCycle.startTime;
      }
      this.scene.weatherSystem.update(time, delta);
      this.scene.atmosphereSystem.update(time, delta);
      this.skyIslands.update(time, delta);
    }
    this.lighting = this._sampleLighting();
    this.surface.update(time, this.lighting);
    if (!motionEnabled) this._setTownMotionPaused(true);
    this.sky.update(time, this.lighting);
    this.surfaceProps?.update(time, this.lighting);
    this.surfacePropExpansion?.update(time, this.lighting);
    this.surfaceHeroes?.update(time, this.lighting);
    if (motionEnabled) this.surfaceAtmosphere?.update(time, this.lighting);
    return this.lighting;
  }

  setWeather(id) {
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
    this._setTownMotionPaused(!enabled);
  }

  isReady() {
    const sky = this.sky.getSnapshot();
    const motion = this.surface.surfacePack?.getMotionSnapshot?.();
    return Boolean(sky.coverageReady && sky.activeFeatureCards > 0 && motion?.ready);
  }

  snapshot() {
    const weather = this.scene.weatherSystem.getSnapshot();
    const props = [
      this.surfaceProps?.active?.size || 0,
      this.surfacePropExpansion?.active?.size || 0,
      this.surfaceHeroes?.active?.size || 0,
      [...(this.skyIslands?.skyPropSystem?.active?.values?.() || [])]
        .filter(sprite => sprite.visible).length,
    ];
    return {
      ready: this.isReady(),
      weather,
      clock: {
        phase: this.scene.dayNightCycle.getCurrentPhaseName(),
        time: this.scene.dayNightCycle.getTimeString24(),
      },
      activePropCount: props.reduce((sum, count) => sum + count, 0),
      excludedFloatingLibraryCandidates: this.excludedFloatingLibraryIds.size,
      productionSkyPropsGrounded: true,
      activeSkySupports: this.skyIslands.sprites.filter(sprite => sprite.visible).length,
      sky: this.sky.getSnapshot(),
      townMotion: this.surface.surfacePack?.getMotionSnapshot?.() || null,
      repeatedMoonPlatesVisible: this.surface.far.filter(image => image.visible).length,
      overlappingHeavenblockBackdropsVisible: this.skyIslands.sprites.filter(sprite => (
        sprite.visible && String(sprite.texture?.key || "").includes("backdrop")
      )).length,
      celestialSpritesVisible: Number(this.scene.dayNightCycle.sunSprite.visible)
        + Number(this.scene.dayNightCycle.moonSprite.visible),
      atmosphereAtlasActive: this.scene.atmosphereSystem.imagegenVfxEnabled,
      productionSystems: Object.freeze([
        "WorldVisualSkyCohesionLayer",
        "WorldVisualSurfaceStage",
        "WeatherSystem",
        "DayNightCycle",
        "AtmosphereSystem",
        "WorldVisualSurfaceAtmosphereLayer",
        "V11SkyIslandVisualSystem",
      ]),
    };
  }

  destroy() {
    this.scene.atmosphereSystem?.destroy();
    this.scene.weatherSystem?.destroy();
    this.skyIslands?.destroy();
    this.surfaceAtmosphere?.destroy();
    this.surfaceHeroes?.destroy();
    this.surfacePropExpansion?.destroy();
    this.surfaceProps?.destroy();
    this.surface?.destroy();
    this.sky?.destroy();
  }

  _ensureFullReviewSkyIslandSupport() {
    for (const level of V11_SKY_ISLAND_LAYOUT.levels) {
      if (this.skyIslands.sprites.some(sprite => sprite.texture?.key === level.platformKey)) continue;
      const add = ({ key, leftTile, bottomTile, widthTiles, heightTiles, depth }) => (
        this.skyIslands.addAuthoredImage({
          key,
          left: leftTile * this.review.tileSize,
          bottom: bottomTile * this.review.tileSize,
          width: widthTiles * this.review.tileSize,
          height: heightTiles * this.review.tileSize,
          depth,
        })
      );
      add({ ...level, key: level.platformKey, depth: V11_SKY_ISLAND_LAYOUT.platformDepth });
      level.portalSlots.forEach(slot => add({
        ...slot,
        key: level.portalKey,
        depth: V11_SKY_ISLAND_LAYOUT.portalDepth,
      }));
    }
  }

  _applyExclusiveHeavenblockSkyOwnership() {
    this.skyIslands.sprites
      .filter(sprite => String(sprite.texture?.key || "").includes("backdrop"))
      .forEach(sprite => sprite.setVisible(false));
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
      night: this.scene.dayNightCycle.getNightAmount(),
    };
  }

  _setTownMotionPaused(paused) {
    const motionView = this.surface?.surfacePack?.motionView;
    motionView?.video?.setPaused?.(paused);
    if (motionView) motionView.paused = paused;
  }

  _emptyLighting() {
    return { terrainTint: 0xffffff, farTint: 0xffffff, wet: 0, lightning: 0, fog: 0, wind: 0, night: 1 };
  }
}
