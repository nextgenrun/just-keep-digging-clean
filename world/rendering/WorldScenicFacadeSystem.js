import { ASSET_KEYS } from "../../values/assetKeys.js";
import { LEVEL_ONE_GROUND_FACADE } from "../../values/levelOneGroundFacade.js";
import { RESOURCE_BY_TILE_TYPE } from "../../values/resourceTypes.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import {
  WORLD_SCENIC_FACADE,
  resolveWorldScenicFacadeEnabled,
} from "../../values/worldScenicFacade.js";
import { getDamageStage } from "./tileRenderMap.js";
import { WorldScenicFacadeBandView } from "./WorldScenicFacadeBandView.js";
import {
  clamp01,
  mixScenicColor,
  resolveScenicFacadeMarker,
  scenicFacadeTextureKey,
  scenicMarkerVariant,
} from "./worldScenicFacadeHelpers.js";
export class WorldScenicFacadeSystem {
  constructor(scene, worldModel, config = WORLD_SCENIC_FACADE, markerConfig = LEVEL_ONE_GROUND_FACADE) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.markerConfig = markerConfig;
    this.maskGraphics = null;
    this.geometryMask = null;
    this.bandViews = new Map();
    this.markerPool = [];
    this.crackPool = [];
    this.pendingTextures = new Set();
    this.failedTextures = new Set();
    this.ownedTextures = new Set();
    this.enabled = false;
    this.destroyed = false;
    this.nextUpdateAt = 0;
    this.loading = false;
  }
  create() {
    const master = this.scene.worldBackgroundMasterSystem;
    this.enabled = resolveWorldScenicFacadeEnabled(this.config)
      && (!this.config.requiresMasterBackground || master?.enabled)
      && (!this.config.requiresDepthBackground || master?.depthEnabled);
    if (!this.enabled) {
      console.info("[WorldScenicFacadeSystem] Disabled; use ?worldFacade=1 with the v11 depth master");
      return false;
    }
    if (!this._installRecognitionFrames()) {
      console.warn("[WorldScenicFacadeSystem] Recognition atlas missing; facade was not enabled");
      this.enabled = false;
      return false;
    }
    this.maskGraphics = this.scene.make.graphics({ add: false });
    this.geometryMask = this.maskGraphics.createGeometryMask();
    this.destroyed = false;
    this.scene.load.on("loaderror", this._handleLoadError, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.update(this.scene.time?.now || 0, 0, true);
    console.info("[WorldScenicFacadeSystem] Camera-windowed continuous materials active; use ?worldFacade=0 to roll back");
    return true;
  }
  update(time, _delta, force = false) {
    if (!this.enabled || this.destroyed) return;
    const master = this.scene.worldBackgroundMasterSystem;
    if ((this.config.requiresMasterBackground && !master?.enabled)
      || (this.config.requiresDepthBackground && !master?.depthEnabled)) {
      this._hidePools();
      this.maskGraphics?.clear();
      return;
    }
    const fps = this.scene.game?.loop?.actualFps || 60;
    const reduced = fps > 0 && fps < this.config.performance.reduceBelowFps;
    const interval = reduced
      ? (this.config.performance.reducedUpdateIntervalMs || this.config.performance.updateIntervalMs * 2)
      : this.config.performance.updateIntervalMs;
    const now = Number.isFinite(time) ? time : (this.scene.time?.now || 0);
    if (!force && now < this.nextUpdateAt) return;
    this.nextUpdateAt = now + interval;
    const bounds = this._getVisibleTileBounds(this.config.performance.maskMarginTiles);
    this._syncMaterialBands(bounds);
    this._drawSolidMaskAndFeedback(bounds, reduced);
    this._updateBandTint(bounds);
  }
  invalidateCell(tx, ty) {
    const bounds = this._getVisibleTileBounds(0);
    if (tx < bounds.left || tx >= bounds.right || ty < bounds.top || ty >= bounds.bottom) return;
    this.update(this.scene.time?.now || 0, 0, true);
  }
  _getVisibleTileBounds(marginTiles) {
    const camera = this.scene.cameras.main;
    const view = camera.worldView;
    const tileSize = this.scene.config.tileSize;
    const left = Number.isFinite(view?.x) ? view.x : camera.scrollX;
    const top = Number.isFinite(view?.y) ? view.y : camera.scrollY;
    const width = Number.isFinite(view?.width) ? view.width : camera.width / (camera.zoom || 1);
    const height = Number.isFinite(view?.height) ? view.height : camera.height / (camera.zoom || 1);
    const span = this.config.span;
    return {
      left: Math.max(span.leftTile, Math.floor(left / tileSize) - marginTiles),
      right: Math.min(span.rightTileExclusive, Math.ceil((left + width) / tileSize) + marginTiles),
      top: Math.max(span.topTile, Math.floor(top / tileSize) - marginTiles),
      bottom: Math.min(span.bottomTileExclusive, Math.ceil((top + height) / tileSize) + marginTiles),
    };
  }
  _syncMaterialBands(bounds) {
    const margin = this.config.performance.preloadMarginTilesY;
    const needed = this.config.bands.filter(band => band.bottomTileExclusive > bounds.top - margin
      && band.topTile < bounds.bottom + margin);
    for (const band of needed) {
      const key = scenicFacadeTextureKey(band.material);
      const visible = band.bottomTileExclusive > bounds.top && band.topTile < bounds.bottom;
      if (visible && this.scene.textures.exists(key)) this._ensureBandView(band, key, bounds);
    }
    const keepMargin = this.config.performance.unloadMarginTilesY;
    for (const [id, view] of this.bandViews) {
      const band = this.config.bands.find(candidate => candidate.id === id);
      if (band.bottomTileExclusive > bounds.top - keepMargin && band.topTile < bounds.bottom + keepMargin) continue;
      view.destroy();
      this.bandViews.delete(id);
    }
    const retained = new Set([...this.bandViews.keys()].map(id => {
      const band = this.config.bands.find(candidate => candidate.id === id);
      return scenicFacadeTextureKey(band.material);
    }));
    for (const key of [...this.ownedTextures]) {
      if (retained.has(key) || this.pendingTextures.has(key)) continue;
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
      this.ownedTextures.delete(key);
    }
    this._queueMaterials(needed);
  }
  _ensureBandView(band, key, bounds) {
    let view = this.bandViews.get(band.id);
    if (view?.key !== key) {
      view?.destroy();
      view = new WorldScenicFacadeBandView(this.scene, band, key, this.config, this.geometryMask);
      this.bandViews.set(band.id, view);
    }
    view.sync(bounds);
  }

  _queueMaterials(bands) {
    if (this.loading || this.scene.load.isLoading()) return;
    const missing = [];
    for (const band of bands) {
      const key = scenicFacadeTextureKey(band.material);
      if (this.scene.textures.exists(key) || this.pendingTextures.has(key) || this.failedTextures.has(key)) continue;
      missing.push({ key, path: this.config.materials[band.material] });
    }
    if (missing.length === 0) return;
    this.loading = true;
    for (const item of missing) {
      if (!item.path) throw new Error(`Missing scenic facade path for ${item.key}`);
      this.pendingTextures.add(item.key);
      this.ownedTextures.add(item.key);
      this.scene.load.image(item.key, item.path);
    }
    this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
      missing.forEach(item => this.pendingTextures.delete(item.key));
      this.loading = false;
      if (!this.destroyed) this.update(this.scene.time?.now || 0, 0, true);
    });
    this.scene.load.start();
  }
  _drawSolidMaskAndFeedback(bounds, reduced) {
    this.maskGraphics.clear().fillStyle(0xffffff, 1);
    this._hidePools();
    if (bounds.right <= bounds.left || bounds.bottom <= bounds.top) return;
    const tileSize = this.scene.config.tileSize;
    let markerIndex = 0;
    let crackIndex = 0;
    for (let ty = bounds.top; ty < bounds.bottom; ty += 1) {
      for (let tx = bounds.left; tx < bounds.right; tx += 1) {
        const type = this.worldModel.getTileType(tx, ty);
        if (type === TILE_TYPES.AIR) continue;
        this.maskGraphics.fillRect(tx * tileSize, ty * tileSize, tileSize, tileSize);
        if (reduced && (tx + ty) % this.config.performance.reducedStride !== 0) continue;
        const hp = this.worldModel.getTileHp(tx, ty);
        const maxHp = this.worldModel.getTileMaxHp(tx, ty, type);
        const stage = getDamageStage(hp, maxHp);
        const resourceKey = RESOURCE_BY_TILE_TYPE[type];
        const marker = resolveScenicFacadeMarker(
          this.markerConfig,
          type,
          resourceKey,
          ty,
          this.worldModel.topAirRows
            ?? this.worldModel.config?.topAirRows
            ?? this.scene.config.topAirRows
            ?? 0
        );
        if (marker && markerIndex < this.config.performance.maxVisibleMarkers) {
          this._showMarker(markerIndex++, tx, ty, type, marker, stage);
        }
        if (hp > 0 && hp < maxHp && stage < 5 && crackIndex < this.config.performance.maxVisibleCracks) {
          this._showCrack(crackIndex++, tx, ty, stage);
        }
      }
    }
  }
  _showMarker(index, tx, ty, type, marker, stage) {
    const tileSize = this.scene.config.tileSize;
    const variant = scenicMarkerVariant(tx, ty, type, marker.variants);
    const frame = `level1-ground-recognition-${marker.frame + variant}`;
    const image = this.markerPool[index] || this._createMarker();
    image.setPosition((tx + 0.5) * tileSize, (ty + 0.5) * tileSize)
      .setTexture(ASSET_KEYS.background.levelOneGroundFacade.recognitionAtlas, frame)
      .setDisplaySize(tileSize * marker.scale, tileSize * marker.scale)
      .setAlpha(marker.alpha * (this.markerConfig.damage.recognitionAlphaByStage[stage] ?? 1))
      .setVisible(true);
  }
  _createMarker() {
    const image = this.scene.add.image(0, 0, ASSET_KEYS.background.levelOneGroundFacade.recognitionAtlas)
      .setDepth(this.config.render.recognitionDepth)
      .setVisible(false);
    this.markerPool.push(image);
    return image;
  }
  _showCrack(index, tx, ty, stage) {
    const tileSize = this.scene.config.tileSize;
    const image = this.crackPool[index] || this._createCrack();
    image.setPosition(tx * tileSize, ty * tileSize)
      .setTexture(ASSET_KEYS.tiles.dynamicSoil.cracks[stage - 1])
      .setDisplaySize(tileSize, tileSize)
      .setTint(this.markerConfig.damage.crackTint)
      .setAlpha(this.markerConfig.damage.crackAlphaByStage[stage] ?? 1)
      .setVisible(true);
  }
  _createCrack() {
    const image = this.scene.add.image(0, 0, ASSET_KEYS.tiles.dynamicSoil.cracks[0])
      .setOrigin(0, 0)
      .setDepth(this.config.render.crackDepth)
      .setVisible(false);
    this.crackPool.push(image);
    return image;
  }

  _installRecognitionFrames() {
    const key = ASSET_KEYS.background.levelOneGroundFacade.recognitionAtlas;
    if (!this.scene.textures.exists(key)) return false;
    const atlas = this.scene.textures.get(key);
    const cfg = this.markerConfig.recognitionAtlas;
    const source = atlas.getSourceImage?.();
    const count = Math.floor(source.width / cfg.frameSizePx) * Math.floor(source.height / cfg.frameSizePx);
    for (let index = 0; index < count; index += 1) {
      const name = `level1-ground-recognition-${index}`;
      if (!atlas.has(name)) atlas.add(name, 0, index % cfg.columns * cfg.frameSizePx,
        Math.floor(index / cfg.columns) * cfg.frameSizePx, cfg.frameSizePx, cfg.frameSizePx);
    }
    return true;
  }

  _updateBandTint(bounds) {
    const weather = this.scene.weatherSystem;
    const rainKind = weather?.kind === "drizzle" || weather?.kind === "rain" || weather?.kind === "storm";
    const rain = rainKind ? clamp01(weather?.intensity || 0) : 0;
    const night = clamp01(this.scene.dayNightCycle?.getNightAmount?.() || 0);
    for (const band of this.config.bands) {
      const view = this.bandViews.get(band.id);
      if (!view) continue;
      const surfaceWeight = bounds.top < this.config.render.surfaceWeatherBottomTile
        ? clamp01((this.config.render.surfaceWeatherBottomTile - band.topTile) / 45) : 0;
      const cool = surfaceWeight * (rain * this.config.render.rainCoolAmount
        + night * this.config.render.nightCoolAmount);
      view.setTint(mixScenicColor(band.tint, 0x9bb8d2, cool));
    }
  }

  _hidePools() {
    this.markerPool.forEach(image => image.setVisible(false));
    this.crackPool.forEach(image => image.setVisible(false));
  }

  _handleLoadError(file) {
    if (!this.ownedTextures.has(file?.key)) return;
    this.failedTextures.add(file.key);
    this.pendingTextures.delete(file.key);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.enabled = false;
    this.scene.load.off("loaderror", this._handleLoadError, this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    for (const view of this.bandViews.values()) view.destroy();
    this.markerPool.forEach(image => image.destroy());
    this.crackPool.forEach(image => image.destroy());
    this.geometryMask?.destroy();
    this.maskGraphics?.destroy();
    for (const key of this.ownedTextures) {
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    }
    this.bandViews.clear();
    this.ownedTextures.clear();
    this.markerPool = [];
    this.crackPool = [];
  }
}
