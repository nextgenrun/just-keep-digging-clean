import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  DEEP_WORLD_LIVING_BACKDROP,
  resolveDeepWorldLivingBackdropEnabled,
} from "../../values/deepWorldLivingBackdrop.js";
import { SKYLINE_WEATHER_VFX } from "../../values/skylineWeatherVfx.js";
import { WORLD_SCENIC_FACADE } from "../../values/worldScenicFacade.js";
import { SkylineWeatherVfxAtlas } from "../../systems/environment/SkylineWeatherVfxAtlas.js";
import {
  GAMEPLAY_FEATURE_IDS,
  isGameplayFeatureEnabled,
} from "../../values/gameplayDevFlags.js";

const TAU = Math.PI * 2;
const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
const lerp = (start, end, amount) => start + (end - start) * amount;

function seededUnit(seed, index, salt) {
  let value = (seed + Math.imul(index + 1, 0x6d2b79f5)
    + Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

export class DeepWorldLivingBackdropSystem {
  constructor(scene, config = DEEP_WORLD_LIVING_BACKDROP, facade = WORLD_SCENIC_FACADE) {
    this.scene = scene;
    this.config = config;
    this.facade = facade;
    const sheetName = config.atlas.sheetName;
    this.textureKey = ASSET_KEYS.environment.skylineWeatherVfx[sheetName];
    this.atlas = new SkylineWeatherVfxAtlas(
      scene,
      { [sheetName]: this.textureKey },
      { sheets: { [sheetName]: SKYLINE_WEATHER_VFX.sheets[sheetName] } }
    );
    this.anchorsByKind = this._buildAnchors();
    this.pools = Object.fromEntries(Object.keys(config.layers).map(kind => [kind, []]));
    this.enabled = false;
    this.destroyed = false;
    this.nextUpdateAt = 0;
  }

  create() {
    if (!isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.LEVEL_TWO)) return false;
    if (!resolveDeepWorldLivingBackdropEnabled(this.config)) {
      console.info("[DeepWorldLivingBackdropSystem] Disabled; use ?deepWorldLiving=1 to enable");
      return false;
    }
    if (!this._hasRequirements()) {
      console.info("[DeepWorldLivingBackdropSystem] Disabled; depth master and world facade are required");
      return false;
    }
    if (!this.atlas.register()) {
      console.warn("[DeepWorldLivingBackdropSystem] Atmosphere atlas unavailable");
      return false;
    }
    this.destroyed = false;
    for (const [kind, layer] of Object.entries(this.config.layers)) {
      const count = this.config.performance.maxVisible[kind] || 0;
      this.pools[kind] = Array.from({ length: count }, (_, index) =>
        this._createPoolActor(kind, layer, index));
    }
    this.enabled = true;
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    console.info("[DeepWorldLivingBackdropSystem] Level Two ambience active; use ?deepWorldLiving=0 to roll back");
    return true;
  }

  update(time) {
    if (!this.enabled || this.destroyed) return;
    if (!this._hasRequirements()) {
      this._hideAll();
      return;
    }
    const fps = this.scene.game?.loop?.actualFps || 0;
    if (fps > 0 && fps < this.config.performance.disableBelowFps) {
      this._hideAll();
      return;
    }
    const reduced = fps > 0 && fps < this.config.performance.reduceBelowFps;
    const now = Number.isFinite(time) ? time : (this.scene.time?.now || 0);
    if (now < this.nextUpdateAt) return;
    this.nextUpdateAt = now + (reduced
      ? this.config.performance.reducedUpdateIntervalMs
      : this.config.performance.updateIntervalMs);
    const tileSize = this.scene.config?.tileSize || this.config.tileSize;
    const bounds = this._getCameraBounds(tileSize);
    if (!this._intersectsRegion(bounds, tileSize)) {
      this._hideAll();
      return;
    }
    const environment = this._getEnvironment();
    const caps = reduced
      ? this.config.performance.reducedMaxVisible
      : this.config.performance.maxVisible;
    for (const [kind, layer] of Object.entries(this.config.layers)) {
      this._renderLayer(kind, layer, caps[kind] || 0, bounds, tileSize, now, environment);
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.enabled = false;
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    Object.values(this.pools).flat().forEach(actor => actor.sprite.destroy());
    for (const kind of Object.keys(this.pools)) this.pools[kind] = [];
  }

  _hasRequirements() {
    const master = this.scene.worldBackgroundMasterSystem;
    if (this.config.requiresMasterBackground && !master?.enabled) return false;
    if (this.config.requiresDepthBackground && !master?.depthEnabled) return false;
    if (this.config.requiresWorldFacade && !this.scene.worldScenicFacadeSystem?.enabled) return false;
    return true;
  }

  _buildAnchors() {
    const byKind = Object.fromEntries(Object.keys(this.config.layers).map(kind => [kind, []]));
    for (const [kind, layer] of Object.entries(this.config.layers)) {
      let ordinal = 0;
      for (const [bandId, treatment] of Object.entries(layer.bands)) {
        const band = this.facade.bands.find(candidate => candidate.id === bandId);
        if (!band) throw new Error(`Unknown deep-world facade band: ${bandId}`);
        ordinal = this._appendBandAnchors(byKind[kind], kind, layer, band, treatment, ordinal);
      }
    }
    return byKind;
  }

  _appendBandAnchors(target, kind, layer, band, treatment, ordinal) {
    const region = this.config.region;
    const padding = region.anchorPaddingTiles;
    const left = region.leftTile + padding;
    const right = region.rightTileExclusive - padding;
    const top = Math.max(region.topTile, band.topTile) + padding;
    const bottom = Math.min(region.bottomTileExclusive, band.bottomTileExclusive) - padding;
    if (right <= left || bottom <= top) return ordinal;
    const columns = Math.max(1, Math.ceil((right - left) / layer.spacingTilesX));
    const rows = Math.max(1, Math.ceil((bottom - top) / layer.spacingTilesY));
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = ordinal++;
        const jitter = this.config.anchorJitterFactor;
        target.push({
          id: `${kind}-${band.id}-${index}`,
          bandId: band.id,
          xTile: Math.min(right, left + (column + 0.5
            + (seededUnit(layer.seed, index, 0) - 0.5) * jitter) * layer.spacingTilesX),
          yTile: Math.min(bottom, top + (row + 0.5
            + (seededUnit(layer.seed, index, 1) - 0.5) * jitter) * layer.spacingTilesY),
          phase: seededUnit(layer.seed, index, 2),
          periodMs: lerp(layer.periodMs.min, layer.periodMs.max, seededUnit(layer.seed, index, 3)),
          widthTiles: lerp(layer.widthTiles.min, layer.widthTiles.max, seededUnit(layer.seed, index, 4)),
          heightTiles: lerp(layer.heightTiles.min, layer.heightTiles.max, seededUnit(layer.seed, index, 5)),
          alpha: lerp(layer.alpha.min, layer.alpha.max, seededUnit(layer.seed, index, 6)) * treatment.alphaScale,
          frame: layer.frames[Math.floor(seededUnit(layer.seed, index, 7) * layer.frames.length)],
          tint: treatment.tint,
        });
      }
    }
    return ordinal;
  }

  _createPoolActor(kind, layer, index) {
    const sheet = this.config.atlas.sheetName;
    const sprite = this.scene.add.image(0, 0, this.textureKey, this.atlas.frame(sheet, layer.frames[0]))
      .setOrigin(0.5).setDepth(layer.depth).setAlpha(0).setVisible(false).setScrollFactor(1);
    const blendMode = globalThis.Phaser?.BlendModes?.[layer.blendMode];
    if (blendMode !== undefined) sprite.setBlendMode(blendMode);
    sprite.name = `deep-world-living-${kind}-pool-${index}`;
    return { sprite, anchorId: null };
  }

  _renderLayer(kind, layer, cap, bounds, tileSize, time, environment) {
    const visible = this.anchorsByKind[kind]
      .filter(anchor => this._isVisible(anchor, bounds, tileSize)).slice(0, cap);
    this.pools[kind].forEach((actor, index) => {
      const anchor = visible[index];
      if (!anchor) {
        actor.anchorId = null;
        actor.sprite.setVisible(false);
        return;
      }
      actor.anchorId = anchor.id;
      this._applyPose(actor.sprite, anchor, layer, tileSize, time, environment);
    });
  }

  _applyPose(sprite, anchor, layer, tileSize, time, environment) {
    const angle = time / anchor.periodMs * TAU + anchor.phase * TAU;
    const wave = Math.sin(angle);
    const crossWave = Math.cos(angle * this.config.motion.crossWaveRate + anchor.phase * Math.PI);
    const wind = environment.wind / this.config.environment.maxWindPxPerSecond
      * this.config.environment.deepWindScale
      * (1 + environment.gust * this.config.environment.gustWindBoost);
    const x = anchor.xTile * tileSize + wave * layer.swayTiles * tileSize
      + wind * crossWave * layer.windTiles * tileSize;
    const y = anchor.yTile * tileSize + crossWave * layer.bobTiles * tileSize;
    const pulse = 1 + wave * layer.scalePulse;
    const envelope = this.config.motion.minAlphaEnvelope
      + (1 - this.config.motion.minAlphaEnvelope) * (wave * 0.5 + 0.5);
    const weather = this.config.environment.deepWeatherScale
      * (environment.rain * layer.rainAlphaBoost + environment.fog * layer.fogAlphaBoost);
    const alpha = anchor.alpha * envelope * (1 + weather + environment.night * layer.nightAlphaBoost);
    const frame = this.atlas.frame(this.config.atlas.sheetName, anchor.frame);
    if (sprite.frame?.name !== frame) sprite.setFrame(frame);
    sprite.setPosition(x, y)
      .setDisplaySize(anchor.widthTiles * tileSize * pulse, anchor.heightTiles * tileSize / pulse)
      .setRotation(crossWave * layer.rotationRadians).setTint(anchor.tint)
      .setAlpha(clamp01(alpha)).setVisible(true);
  }

  _getEnvironment() {
    const weatherSystem = this.scene.weatherSystem;
    const snapshot = weatherSystem?.getLightingSnapshot?.() || weatherSystem?.getSnapshot?.() || {};
    const maxWind = this.config.environment.maxWindPxPerSecond;
    return {
      night: clamp01(this.scene.dayNightCycle?.getNightAmount?.() || 0),
      fog: clamp01(snapshot.fogAmount || 0),
      rain: clamp01(snapshot.rainAmount || 0),
      gust: clamp01(snapshot.windGustAmount ?? snapshot.gustAmount ?? 0),
      wind: Math.max(-maxWind, Math.min(maxWind, snapshot.wind ?? weatherSystem?.wind ?? 0)),
    };
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
    return { left: left - margin, right: left + width + margin, top: top - margin, bottom: top + height + margin };
  }

  _intersectsRegion(bounds, tileSize) {
    const region = this.config.region;
    return bounds.right > region.leftTile * tileSize && bounds.left < region.rightTileExclusive * tileSize
      && bounds.bottom > region.topTile * tileSize && bounds.top < region.bottomTileExclusive * tileSize;
  }

  _isVisible(anchor, bounds, tileSize) {
    const x = anchor.xTile * tileSize;
    const y = anchor.yTile * tileSize;
    return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
  }

  _hideAll() {
    Object.values(this.pools).flat().forEach(actor => {
      actor.anchorId = null;
      actor.sprite.setVisible(false);
    });
  }
}
