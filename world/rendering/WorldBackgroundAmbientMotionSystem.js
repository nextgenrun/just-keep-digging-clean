import {
  WORLD_BACKGROUND_AMBIENT_MOTION,
  resolveWorldBackgroundAmbientMotionEnabled,
} from "../../values/worldBackgroundAmbientMotion.js";
import {
  GAMEPLAY_FEATURE_IDS,
  isGameplayFeatureEnabled,
} from "../../values/gameplayDevFlags.js";

const TAU = Math.PI * 2;
const clamp01 = value => Math.max(0, Math.min(1, value));
const ATLAS_WISP_KINDS = new Set(["townSmoke", "steam"]);

export class WorldBackgroundAmbientMotionSystem {
  constructor(scene, config = WORLD_BACKGROUND_AMBIENT_MOTION) {
    this.scene = scene;
    this.config = config;
    this.graphics = null;
    this.enabled = false;
    this.destroyed = false;
    this.nextDrawAt = 0;
    this.anchors = this._buildAnchors();
  }

  create() {
    this.enabled = this._resolveEnabled();
    if (!this.enabled) {
      console.info("[WorldBackgroundAmbientMotionSystem] Disabled; use ?worldMotion=1 to enable");
      return false;
    }

    this.destroyed = false;
    this.graphics = this.scene.add.graphics()
      .setDepth(this.config.render.depth)
      .setVisible(false);
    this.graphics.name = "v11-world-background-ambient-motion";
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    console.info(
      `[WorldBackgroundAmbientMotionSystem] ${this.anchors.length} culled anchors active; `
      + "use ?worldMotion=0 to roll back"
    );
    return true;
  }

  update(time) {
    if (!this.enabled || this.destroyed || !this.graphics) return;
    if (this.config.requiresMasterBackground && !this.scene.worldBackgroundMasterSystem?.enabled) {
      this._clear();
      return;
    }

    const fps = this.scene.game?.loop?.actualFps || 0;
    if (fps > 0 && fps < this.config.performance.disableBelowFps) {
      this._clear();
      return;
    }

    const reduced = fps > 0 && fps < this.config.performance.reduceBelowFps;
    const interval = reduced
      ? this.config.performance.reducedUpdateIntervalMs
      : this.config.performance.updateIntervalMs;
    const now = Number.isFinite(time) ? time : (this.scene.time?.now || 0);
    if (now < this.nextDrawAt) return;
    this.nextDrawAt = now + interval;

    const tileSize = this.scene.config?.tileSize || this.config.tileSize;
    const bounds = this._getCameraBounds(tileSize);
    const { top, bottom } = this.config.rows;
    if (bounds.bottom < top * tileSize || bounds.top > bottom * tileSize) {
      this._clear();
      return;
    }

    const maxAnchors = reduced
      ? this.config.performance.reducedMaxVisibleAnchors
      : this.config.performance.maxVisibleAnchors;
    const weather = this._getWeatherState();
    const nightAmount = clamp01(this.scene.dayNightCycle?.getNightAmount?.() || 0);
    const atlasWispsActive = this._hasAtlasWispOwner();
    let drawn = 0;

    this.graphics.clear();
    for (const anchor of this.anchors) {
      if (drawn >= maxAnchors) break;
      if (reduced && anchor.order % this.config.performance.reducedAnchorStride !== 0) continue;
      if (atlasWispsActive && ATLAS_WISP_KINDS.has(anchor.kind)) continue;
      const x = anchor.xTile * tileSize;
      const y = anchor.yTile * tileSize;
      if (!this._isVisible(x, y, bounds)) continue;
      this._drawAnchor(anchor, x, y, tileSize, now, nightAmount, weather);
      drawn += 1;
    }
    this.graphics.setVisible(drawn > 0);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.enabled = false;
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.graphics?.destroy();
    this.graphics = null;
  }

  _resolveEnabled() {
    return resolveWorldBackgroundAmbientMotionEnabled(this.config);
  }

  _hasAtlasWispOwner() {
    const skylineVfx = this.scene.atmosphereSystem?.skylineWeatherVfx;
    return skylineVfx?.enabled === true && skylineVfx?.worldWispsEnabled === true;
  }

  _buildAnchors() {
    const groups = [
      ["townLight", this.config.anchors.townLights],
      ["townSmoke", this.config.anchors.townSmoke],
      ["crystal", this.config.anchors.level1Crystals],
      ["drip", this.config.anchors.level1Drips],
    ];
    if (isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.LEVEL_TWO)) {
      groups.push(
        ["ember", this.config.anchors.level2Embers],
        ["steam", this.config.anchors.level2Steam],
      );
    }
    let order = 0;
    return groups.flatMap(([kind, anchors]) => anchors.map(anchor => ({
      ...anchor,
      kind,
      order: order++,
    })));
  }

  _getCameraBounds(tileSize) {
    const camera = this.scene.cameras.main;
    const view = camera.worldView;
    const zoom = camera.zoom || 1;
    const left = Number.isFinite(view?.x) ? view.x : camera.scrollX;
    const top = Number.isFinite(view?.y) ? view.y : camera.scrollY;
    const width = Number.isFinite(view?.width) ? view.width : camera.width / zoom;
    const height = Number.isFinite(view?.height) ? view.height : camera.height / zoom;
    const margin = this.config.performance.cullMarginTiles * tileSize;
    return {
      left: left - margin,
      right: left + width + margin,
      top: top - margin,
      bottom: top + height + margin,
    };
  }

  _isVisible(x, y, bounds) {
    return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
  }

  _getWeatherState() {
    const system = this.scene.weatherSystem;
    const kind = system?.kind || "clear";
    const rain = kind === "drizzle" || kind === "rain" || kind === "storm";
    const maxWind = this.config.performance.maxWindPxPerSecond;
    return {
      rainAmount: rain ? clamp01(system?.intensity || 0) : 0,
      wind: Math.max(-maxWind, Math.min(maxWind, system?.wind || 0)),
    };
  }

  _drawAnchor(anchor, x, y, size, time, night, weather) {
    if (anchor.kind === "townLight") this._drawTownLight(anchor, x, y, size, time, night, weather);
    else if (anchor.kind === "townSmoke") this._drawWisp(anchor, x, y, size, time, weather, false);
    else if (anchor.kind === "crystal") this._drawCrystal(anchor, x, y, size, time);
    else if (anchor.kind === "drip") this._drawDrip(anchor, x, y, size, time);
    else if (anchor.kind === "ember") this._drawEmber(anchor, x, y, size, time, weather);
    else if (anchor.kind === "steam") this._drawWisp(anchor, x, y, size, time, weather, true);
  }

  _drawTownLight(anchor, x, y, size, time, night, weather) {
    const cfg = this.config.townLight;
    const wave = Math.sin(time * cfg.flickerHz * TAU / 1000 + anchor.phase * TAU);
    const flicker = cfg.flickerBase + wave * cfg.flickerRange;
    const rainDim = 1 - weather.rainAmount * cfg.rainDimming;
    const alpha = (cfg.dayAlpha + (cfg.nightAlpha - cfg.dayAlpha) * night)
      * flicker * anchor.scale * rainDim;
    if (alpha < this.config.render.minVisibleAlpha) return;
    const radius = cfg.radiusTiles * size * anchor.scale;
    this.graphics.fillStyle(cfg.color, alpha);
    this.graphics.fillCircle(x, y, radius);
    this.graphics.fillStyle(cfg.coreColor, cfg.coreAlpha * flicker * rainDim);
    this.graphics.fillCircle(x, y, radius * cfg.coreRadiusScale);
  }

  _drawWisp(anchor, x, y, size, time, weather, isSteam) {
    const cfg = isSteam ? this.config.steam : this.config.smoke;
    const age = (time / cfg.periodMs + anchor.phase) % 1;
    const envelope = Math.sin(age * Math.PI);
    const weatherScale = isSteam
      ? 1 + weather.rainAmount * cfg.rainBoost
      : 1 - weather.rainAmount * cfg.rainSuppression;
    const drift = weather.wind * cfg.windSeconds * age;
    const wobble = Math.sin(age * TAU + anchor.phase * TAU) * cfg.widthTiles * size;
    const alpha = cfg.alpha * envelope * weatherScale * anchor.scale;
    if (alpha < this.config.render.minVisibleAlpha) return;
    this.graphics.fillStyle(cfg.color, alpha);
    this.graphics.fillEllipse(
      x + drift + wobble,
      y - cfg.riseTiles * size * age,
      cfg.widthTiles * size * anchor.scale,
      cfg.heightTiles * size * anchor.scale
    );
  }

  _drawCrystal(anchor, x, y, size, time) {
    const cfg = this.config.crystal;
    const pulse = cfg.pulseBase
      + Math.sin(time * cfg.pulseHz * TAU / 1000 + anchor.phase * TAU) * cfg.pulseRange;
    const radius = cfg.radiusTiles * size * anchor.scale;
    this.graphics.fillStyle(cfg.color, cfg.alpha * pulse);
    this.graphics.fillCircle(x, y, radius);
    this.graphics.fillStyle(cfg.coreColor, cfg.coreAlpha * pulse);
    this.graphics.fillCircle(x, y, radius * cfg.coreRadiusScale);
    const orbit = time * cfg.moteHz * TAU / 1000 + anchor.phase * TAU;
    this.graphics.fillCircle(
      x + Math.cos(orbit) * cfg.moteOrbitTiles * size,
      y + Math.sin(orbit) * cfg.moteOrbitTiles * size * cfg.moteYScale,
      cfg.moteRadiusTiles * size
    );
  }

  _drawDrip(anchor, x, y, size, time) {
    const cfg = this.config.drip;
    const age = (time / cfg.periodMs + anchor.phase) % 1;
    const dropY = y + cfg.fallTiles * size * age * age;
    const alpha = cfg.alpha * Math.sin(age * Math.PI);
    if (alpha < this.config.render.minVisibleAlpha) return;
    this.graphics.lineStyle(
      Math.max(cfg.minLineWidthPx, cfg.radiusTiles * size),
      cfg.color,
      alpha * cfg.lineAlphaScale
    );
    this.graphics.lineBetween(x, dropY - cfg.lengthTiles * size, x, dropY);
    this.graphics.fillStyle(cfg.color, alpha);
    this.graphics.fillCircle(x, dropY, cfg.radiusTiles * size);
  }

  _drawEmber(anchor, x, y, size, time, weather) {
    const cfg = this.config.ember;
    const age = (time / cfg.periodMs + anchor.phase) % 1;
    const alpha = cfg.alpha * Math.sin(age * Math.PI) * anchor.scale;
    if (alpha < this.config.render.minVisibleAlpha) return;
    const drift = Math.sin(age * TAU + anchor.phase * TAU) * cfg.driftTiles * size;
    const windDrift = weather.wind * cfg.windSeconds * age;
    const emberX = x + drift + windDrift;
    const emberY = y - cfg.riseTiles * size * age;
    this.graphics.fillStyle(cfg.color, alpha);
    this.graphics.fillCircle(emberX, emberY, cfg.radiusTiles * size * anchor.scale);
    this.graphics.fillStyle(cfg.hotColor, alpha * cfg.hotAlphaScale);
    this.graphics.fillCircle(
      emberX,
      emberY,
      cfg.radiusTiles * size * anchor.scale * cfg.hotRadiusScale
    );
  }

  _clear() {
    if (!this.graphics?.visible) return;
    this.graphics.clear().setVisible(false);
  }
}
