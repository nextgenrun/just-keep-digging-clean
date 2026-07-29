import { ASSET_KEYS } from "../../values/assetKeys.js";
import { SKYLINE_WEATHER_VFX } from "../../values/skylineWeatherVfx.js";
import { SkylineWeatherVfxAtlas } from "./SkylineWeatherVfxAtlas.js";
import { SkylineWeatherVfxWorldWisps } from "./SkylineWeatherVfxWorldWisps.js";

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

export function resolveSkylineWeatherVfxEnabled(config = SKYLINE_WEATHER_VFX) {
  const value = new URLSearchParams(globalThis.location?.search || "")
    .get(config.queryParam)?.toLowerCase();
  if (value && config.queryDisableValues.includes(value)) return false;
  if (value && config.queryEnableValues.includes(value)) return true;
  return config.enabled;
}

export class SkylineWeatherVfxSystem {
  constructor(scene, config = SKYLINE_WEATHER_VFX) {
    this.scene = scene;
    this.config = config;
    this.keys = ASSET_KEYS.environment.skylineWeatherVfx;
    this.atlas = new SkylineWeatherVfxAtlas(scene, this.keys, config);
    this.clouds = [];
    this.fog = [];
    this.lightning = [];
    this.worldWisps = new SkylineWeatherVfxWorldWisps(scene, config, this.atlas);
    this.worldWispsEnabled = false;
    this.enabled = false;
    this._nextUpdateAt = 0;
  }

  create() {
    if (!this._resolveEnabled() || !this.atlas.register()) {
      console.info("[SkylineWeatherVfxSystem] Procedural fallback active; use ?skylineVfx=1 to enable atlases");
      return false;
    }
    this.enabled = true;
    this._createClouds();
    this._createFog();
    this.worldWispsEnabled = this.worldWisps.create();
    this._createLightning();
    console.info("[SkylineWeatherVfxSystem] Approved v11 atlases active; use ?skylineVfx=0 to roll back");
    return true;
  }

  update(time, delta) {
    if (!this.enabled || time < this._nextUpdateAt) return;
    const fps = this.scene.game?.loop?.actualFps || 60;
    const reduced = fps < this.config.performance.reducedBelowFps;
    this._nextUpdateAt = time + (reduced
      ? this.config.performance.reducedUpdateIntervalMs
      : this.config.performance.updateIntervalMs);

    const weather = this.scene.weatherSystem?.getLightingSnapshot?.() || {};
    const dayNight = this.scene.dayNightCycle;
    const dt = Math.min(0.1, Math.max(0, delta || 0) / 1000);
    const tint = weather.sunTint ?? weather.tint ?? 0xffffff;
    const surface = clamp01(weather.surfaceAmount ?? 1);
    const rain = clamp01(weather.rainAmount ?? 0) * surface;
    const fog = clamp01(weather.fogAmount ?? 0) * surface;
    const night = clamp01(dayNight?.getNightAmount?.() ?? 0);

    this._updateClouds(dt, weather, tint, night, surface);
    this._updateFog(dt, fog, weather, tint);
    this.worldWisps.update(time, rain, surface, weather, tint, night);
    this._updateLightning(time, weather, tint);
  }

  resize() {}

  destroy() {
    [...this.clouds, ...this.fog, ...this.lightning]
      .forEach(actor => actor.sprite?.destroy?.());
    this.clouds = [];
    this.fog = [];
    this.lightning = [];
    this.worldWisps.destroy();
    this.worldWispsEnabled = false;
    this.enabled = false;
  }

  _resolveEnabled() {
    return resolveSkylineWeatherVfxEnabled(this.config);
  }

  _createClouds() {
    const tileSize = this.scene.config?.tileSize || 94;
    const worldWidthTiles = this.scene.config?.worldWidthTiles || 280;
    const spacingTiles = Math.max(1, this.config.clouds.spacingTiles || 8);
    const actorCount = Math.ceil(worldWidthTiles / spacingTiles);
    const definitions = this.config.clouds.actors;
    this.clouds = Array.from({ length: actorCount }, (_, index) => {
      const definition = definitions[index % definitions.length];
      const seed = ((index * 47 + 13) % 101) / 101;
      return {
        definition,
        index,
        x: (index + 0.16 + seed * 0.36) * spacingTiles * tileSize,
        bobPhase: seed * Math.PI * 2,
        sprite: this._image("clouds", index % 3, definition.layer === "far"
          ? this.config.renderDepths.cloudsFar : this.config.renderDepths.clouds, false),
      };
    });
  }

  _createFog() {
    for (let index = 0; index < this.config.fog.count; index += 1) {
      this.fog.push({
        index,
        x: null,
        sprite: this._image("atmosphere", this.config.frames.atmosphere.fog[index], this.config.renderDepths.fog, true),
      });
    }
  }

  _createLightning() {
    const flash = this._image("lightning", this.config.frames.lightning.flashes[0], this.config.renderDepths.lightning, true);
    const bolt = this._image("lightning", this.config.frames.lightning.bolts[0], this.config.renderDepths.lightning + 0.01, true);
    const screenBlend = globalThis.Phaser?.BlendModes?.SCREEN;
    if (screenBlend !== undefined) { flash.setBlendMode(screenBlend); bolt.setBlendMode(screenBlend); }
    this.lightning = [{ kind: "flash", sprite: flash }, { kind: "bolt", sprite: bolt }];
  }

  _image(sheet, frame, depth, screenSpace) {
    const sprite = this.scene.add.image(0, 0, this.atlas.textureKey(sheet), this.atlas.frame(sheet, frame))
      .setDepth(depth)
      .setOrigin(0.5)
      .setAlpha(0)
      .setVisible(false);
    sprite.setScrollFactor(screenSpace ? 0 : 1);
    return sprite;
  }

  _setFrame(actor, sheet, frame) {
    const name = this.atlas.frame(sheet, frame);
    if (actor.sprite.texture.key !== this.atlas.textureKey(sheet)) actor.sprite.setTexture(this.atlas.textureKey(sheet), name);
    else if (actor.sprite.frame.name !== name) actor.sprite.setFrame(name);
  }

  _updateClouds(dt, weather, tint, night, surface) {
    const tileSize = this.scene.config?.tileSize || 94;
    const worldWidth = (this.scene.config?.worldWidthTiles || 280) * tileSize;
    const surfaceWorldY = (this.scene.config?.topAirRows || 65) * tileSize;
    const wrapMargin = (this.config.clouds.wrapMarginTiles || 8) * tileSize;
    const cover = Math.max(this.config.clouds.minimumClearCover, clamp01(weather.cloudCoverAmount ?? 0));
    const group = weather.kind === "storm" ? this.config.frames.clouds.storm
      : (weather.kind === "rain" || weather.kind === "drizzle" || weather.kind === "snow")
        ? this.config.frames.clouds.midground
        : this.config.frames.clouds.distant;
    const direction = weather.wind === 0 ? 1 : Math.sign(weather.wind);
    this.clouds.forEach(actor => {
      if (!Number.isFinite(actor.x)) actor.x = actor.index / this.clouds.length * worldWidth;
      const displayW = actor.definition.widthTiles * tileSize;
      const displayH = actor.definition.heightTiles * tileSize;
      actor.bobPhase += dt * Math.PI * 2 / this.config.clouds.bobPeriodSeconds;
      const worldY = surfaceWorldY - actor.definition.altitudeTiles * tileSize
        + Math.sin(actor.bobPhase) * this.config.clouds.bobAmplitudeTiles * tileSize;
      actor.x += actor.definition.speed * direction * (0.45 + Math.abs(weather.wind || 0) / 110) * dt;
      if (direction >= 0 && actor.x > worldWidth + wrapMargin) actor.x = -wrapMargin;
      if (direction < 0 && actor.x < -wrapMargin) actor.x = worldWidth + wrapMargin;
      this._setFrame(actor, "clouds", group[actor.index % group.length]);
      actor.sprite.setPosition(actor.x, worldY)
        .setDisplaySize(displayW, displayH)
        .setTint(tint)
        .setAlpha(actor.definition.alpha * cover * surface * (1 + night * this.config.clouds.nightAlphaBoost))
        .setVisible(surface > 0.01);
    });
  }

  _updateFog(dt, fogAmount, weather, tint) {
    const camera = this.scene.cameras.main;
    this.fog.forEach(actor => {
      const width = this.config.fog.widthFraction * camera.width;
      if (actor.x === null) actor.x = actor.index * camera.width / this.fog.length;
      actor.x += (5 + actor.index * 2) * Math.sign(weather.wind || 1) * dt;
      if (actor.x > camera.width + width) actor.x = -width;
      if (actor.x < -width) actor.x = camera.width + width;
      actor.sprite.setPosition(actor.x, camera.height * (this.config.fog.yFraction + actor.index * 0.035))
        .setDisplaySize(width, camera.height * this.config.fog.heightFraction)
        .setTint(tint)
        .setAlpha(fogAmount * this.config.fog.maxAlpha)
        .setVisible(fogAmount > 0.01);
    });
  }

  _updateLightning(time, weather, tint) {
    const amount = clamp01(weather.lightningFlashAmount ?? 0);
    const camera = this.scene.cameras.main;
    const frame = Math.floor(time / 90);
    this.lightning.forEach(actor => {
      const frames = this.config.frames.lightning[actor.kind === "bolt" ? "bolts" : "flashes"];
      this._setFrame(actor, "lightning", frames[frame % frames.length]);
      const bolt = actor.kind === "bolt";
      actor.sprite.setPosition(camera.width * (bolt ? 0.68 : 0.62), camera.height * (bolt ? 0.23 : 0.26))
        .setDisplaySize(bolt ? this.config.lightning.boltWidthPx : this.config.lightning.flashWidthPx, bolt ? this.config.lightning.boltHeightPx : this.config.lightning.flashHeightPx)
        .setTint(tint)
        .setAlpha(amount * (bolt ? this.config.lightning.maxBoltAlpha : this.config.lightning.maxFlashAlpha))
        .setVisible(amount > 0.01);
    });
  }
}
