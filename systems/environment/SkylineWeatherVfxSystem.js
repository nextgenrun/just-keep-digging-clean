import { ASSET_KEYS } from "../../values/assetKeys.js";
import { SKYLINE_WEATHER_VFX } from "../../values/skylineWeatherVfx.js";
import { SkylineWeatherVfxAtlas } from "./SkylineWeatherVfxAtlas.js";
import { SkylineWeatherVfxWorldWisps } from "./SkylineWeatherVfxWorldWisps.js";

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

export class SkylineWeatherVfxSystem {
  constructor(scene, config = SKYLINE_WEATHER_VFX) {
    this.scene = scene;
    this.config = config;
    this.keys = ASSET_KEYS.environment.skylineWeatherVfx;
    this.atlas = new SkylineWeatherVfxAtlas(scene, this.keys, config);
    this.clouds = [];
    this.precipitation = [];
    this.impacts = [];
    this.fog = [];
    this.lightning = [];
    this.worldWisps = new SkylineWeatherVfxWorldWisps(scene, config, this.atlas);
    this.worldWispsEnabled = false;
    this.enabled = false;
    this._nextUpdateAt = 0;
    this._impactCursor = 0;
  }

  create() {
    if (!this._resolveEnabled() || !this.atlas.register()) {
      console.info("[SkylineWeatherVfxSystem] Procedural fallback active; use ?skylineVfx=1 to enable atlases");
      return false;
    }
    this.enabled = true;
    this._createClouds();
    this._createPrecipitation();
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
    const occlusion = this.scene.weatherSystem?.getOcclusionSnapshot?.() || {};
    const dayNight = this.scene.dayNightCycle;
    const dt = Math.min(0.1, Math.max(0, delta || 0) / 1000);
    const tint = weather.sunTint ?? weather.tint ?? 0xffffff;
    const surface = clamp01(weather.surfaceAmount ?? 1);
    const rain = clamp01(weather.rainAmount ?? 0) * surface;
    const fog = clamp01(weather.fogAmount ?? 0) * surface;
    const winter = dayNight?.getSeason?.() === "winter";
    const temperature = dayNight?.getCurrentTemperature?.() ?? 10;
    const snowMix = winter ? clamp01((this.config.precipitation.winterSnowTemperatureC - temperature + 1) / 5) : 0;
    const night = clamp01(dayNight?.getNightAmount?.() ?? 0);

    this._updateClouds(dt, weather, tint, night, surface);
    this._updatePrecipitation(dt, rain, snowMix, weather, occlusion, tint, reduced);
    this._updateImpacts(delta, rain, tint);
    this._updateFog(dt, fog, weather, tint);
    this.worldWisps.update(time, rain, surface, weather, tint, night);
    this._updateLightning(time, weather, tint);
  }

  resize() {
    this.precipitation.forEach(actor => { actor.y = -actor.seed * 280; });
  }

  destroy() {
    [...this.clouds, ...this.precipitation, ...this.impacts, ...this.fog, ...this.lightning]
      .forEach(actor => actor.sprite?.destroy?.());
    this.clouds = [];
    this.precipitation = [];
    this.impacts = [];
    this.fog = [];
    this.lightning = [];
    this.worldWisps.destroy();
    this.worldWispsEnabled = false;
    this.enabled = false;
  }

  _resolveEnabled() {
    const value = new URLSearchParams(globalThis.location?.search || "")
      .get(this.config.queryParam)?.toLowerCase();
    if (value && this.config.queryDisableValues.includes(value)) return false;
    if (value && this.config.queryEnableValues.includes(value)) return true;
    return this.config.enabled;
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

  _createPrecipitation() {
    const precipitation = this.config.precipitation;
    if (!precipitation.rainAtlasEnabled && !precipitation.snowAtlasEnabled) return;
    const initialSheet = precipitation.rainAtlasEnabled ? "rain" : "snow";
    for (let index = 0; index < this.config.precipitation.count; index += 1) {
      this.precipitation.push({
        index,
        seed: ((index * 73 + 19) % 101) / 101,
        x: null,
        y: -((index * 61) % 620),
        mode: "rain",
        sprite: this._image(initialSheet, index % 8, this.config.renderDepths.precipitation, true),
      });
    }
    if (precipitation.rainAtlasEnabled) {
      for (let index = 0; index < precipitation.impactCount; index += 1) {
        this.impacts.push({
          life: 0,
          duration: 380,
          kind: "splash",
          sprite: this._image("water", 0, this.config.renderDepths.impacts, true),
        });
      }
    }
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
      : (weather.kind === "rain" || weather.kind === "drizzle") ? this.config.frames.clouds.midground
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

  _updatePrecipitation(dt, rain, snowMix, weather, occlusion, tint, reduced) {
    const snowing = snowMix > 0.5;
    const atlasEnabled = snowing
      ? this.config.precipitation.snowAtlasEnabled
      : this.config.precipitation.rainAtlasEnabled;
    if (!atlasEnabled) {
      this.precipitation.forEach(actor => actor.sprite.setVisible(false));
      return;
    }
    const camera = this.scene.cameras.main;
    const width = camera.width;
    const height = camera.height;
    const maxCount = reduced ? this.config.precipitation.reducedCount : this.precipitation.length;
    const activeCount = Math.round(maxCount * clamp01(rain * 1.35));
    this.precipitation.forEach((actor, index) => {
      if (index >= activeCount || rain < 0.02) { actor.sprite.setVisible(false); return; }
      if (actor.x === null) actor.x = actor.seed * width;
      actor.x += (weather.wind || 0) * dt * (snowing ? 0.18 : 0.10);
      if (actor.x < -80) actor.x += width + 160;
      if (actor.x > width + 80) actor.x -= width + 160;
      const speed = snowing ? 42 + (index % 8) * 7 : 520 + (index % 7) * 92;
      actor.y += speed * dt;
      const impact = occlusion.nearestImpactForScreenX?.(actor.x);
      if (!impact) { actor.sprite.setVisible(false); actor.y = Math.min(actor.y, height + 80); return; }
      const landingY = impact.impactScreenY ?? impact.landingScreenY ?? height + 96;
      const halfHeight = snowing ? this.config.precipitation.snowSizePx / 2 : this.config.precipitation.rainHeightPx / 2;
      if (actor.y + halfHeight >= landingY || actor.y > height + 80) {
        if (!snowing && landingY >= 0 && landingY <= height + 24) this._spawnImpact(actor.x, landingY, index);
        actor.y = -80 - actor.seed * 260;
      }
      const sheet = snowing ? "snow" : "rain";
      const frames = snowing ? this.config.frames.snow.flakes
        : (index % 3 === 0 ? this.config.frames.rain.distant : this.config.frames.rain.foreground);
      this._setFrame(actor, sheet, frames[index % frames.length]);
      const size = snowing ? this.config.precipitation.snowSizePx + index % 5 * 3 : null;
      actor.sprite.setPosition(actor.x, Math.min(actor.y, landingY - halfHeight))
        .setDisplaySize(size || this.config.precipitation.rainWidthPx, size || this.config.precipitation.rainHeightPx)
        .setRotation(snowing ? actor.seed * 6.28 : -(weather.wind || 0) * 0.00035)
        .setTint(tint)
        .setAlpha(Math.min(this.config.precipitation.maxAccentAlpha, 0.18 + rain * 0.28))
        .setVisible(true);
    });
  }

  _spawnImpact(x, y, seed) {
    const actor = this.impacts[this._impactCursor++ % this.impacts.length];
    actor.life = 1;
    actor.duration = 300 + (seed % 4) * 55;
    actor.kind = seed % 3 === 0 ? "ripple" : "splash";
    actor.sprite.setPosition(x, y - (actor.kind === "splash" ? 8 : 2)).setVisible(true);
  }

  _updateImpacts(delta, rain, tint) {
    this.impacts.forEach(actor => {
      if (actor.life <= 0) { actor.sprite.setVisible(false); return; }
      actor.life -= Math.max(0, delta || 0) / actor.duration;
      const frames = this.config.frames.water[actor.kind];
      const progress = 1 - Math.max(0, actor.life);
      this._setFrame(actor, "water", frames[Math.min(frames.length - 1, Math.floor(progress * frames.length))]);
      actor.sprite.setDisplaySize(actor.kind === "splash" ? 72 : 94, actor.kind === "splash" ? 42 : 28)
        .setTint(tint)
        .setAlpha(clamp01(actor.life) * rain * 0.62);
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
