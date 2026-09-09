import {
  LEVEL_ONE_LIVING_BACKDROP,
  resolveLevelOneLivingBackdropEnabled,
} from "../../values/levelOneLivingBackdrop.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { SKYLINE_WEATHER_VFX } from "../../values/skylineWeatherVfx.js";
import { SkylineWeatherVfxAtlas } from "../../systems/environment/SkylineWeatherVfxAtlas.js";

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

export class LevelOneLivingBackdropSystem {
  constructor(scene, config = LEVEL_ONE_LIVING_BACKDROP) {
    this.scene = scene;
    this.config = config;
    const sheetName = config.atlas.sheetName;
    this.textureKey = ASSET_KEYS.environment.skylineWeatherVfx[sheetName];
    this.atlas = new SkylineWeatherVfxAtlas(
      scene,
      { [sheetName]: this.textureKey },
      { sheets: { [sheetName]: SKYLINE_WEATHER_VFX.sheets[sheetName] } }
    );
    this.anchors = this._buildAnchors();
    this.anchorsByKind = Object.fromEntries(Object.keys(config.layers).map(kind => [
      kind,
      this.anchors.filter(anchor => anchor.kind === kind),
    ]));
    this.anchorSpatialIndexByKind = Object.fromEntries(
      Object.entries(this.anchorsByKind).map(([kind, anchors]) => [
        kind,
        this._buildAnchorSpatialIndex(kind, anchors),
      ])
    );
    this.pools = Object.fromEntries(Object.keys(config.layers).map(kind => [kind, []]));
    this.enabled = false;
    this.destroyed = false;
    this.nextUpdateAt = 0;
  }

  create() {
    if (!resolveLevelOneLivingBackdropEnabled(this.config)) {
      console.info("[LevelOneLivingBackdropSystem] Disabled; use ?worldLiving=1 to enable");
      return false;
    }
    if (!this._hasRequiredMaster()) {
      console.info("[LevelOneLivingBackdropSystem] Disabled; v11 master depth background is required");
      return false;
    }
    if (!this.atlas.register()) {
      console.warn("[LevelOneLivingBackdropSystem] Atmosphere atlas unavailable");
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
    console.info(
      `[LevelOneLivingBackdropSystem] ${this.anchors.length} deterministic anchors; `
      + "use ?worldLiving=0 to roll back"
    );
    return true;
  }

  update(time) {
    if (!this.enabled || this.destroyed) return;
    if (!this._hasRequiredMaster()) {
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

  _hasRequiredMaster() {
    const master = this.scene.worldBackgroundMasterSystem;
    if (this.config.requiresMasterBackground && !master?.enabled) return false;
    if (this.config.requiresDepthBackground && !master?.depthEnabled) return false;
    return true;
  }

  _buildAnchors() {
    const anchors = [];
    for (const [kind, layer] of Object.entries(this.config.layers)) {
      const region = this.config.regions?.[layer.region] || this.config.region;
      const padding = region.anchorPaddingTiles;
      const width = region.rightTileExclusive - region.leftTile - padding * 2;
      const height = region.bottomTileExclusive - region.topTile - padding * 2;
      const columns = Math.max(1, Math.ceil(width / layer.spacingTilesX));
      const rows = Math.max(1, Math.ceil(height / layer.spacingTilesY));
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const index = row * columns + column;
          const xJitter = seededUnit(layer.seed, index, 0) - 0.5;
          const yJitter = seededUnit(layer.seed, index, 1) - 0.5;
          const xTile = region.leftTile + padding
            + Math.min(width, (column + 0.5 + xJitter * 0.58) * layer.spacingTilesX);
          const yTile = region.topTile + padding
            + Math.min(height, (row + 0.5 + yJitter * 0.58) * layer.spacingTilesY);
          anchors.push({
            id: `${kind}-${index}`,
            kind,
            region: layer.region,
            xTile,
            yTile,
            phase: seededUnit(layer.seed, index, 2),
            periodMs: lerp(layer.periodMs.min, layer.periodMs.max, seededUnit(layer.seed, index, 3)),
            widthTiles: lerp(layer.widthTiles.min, layer.widthTiles.max, seededUnit(layer.seed, index, 4)),
            heightTiles: lerp(layer.heightTiles.min, layer.heightTiles.max, seededUnit(layer.seed, index, 5)),
            alpha: lerp(layer.alpha.min, layer.alpha.max, seededUnit(layer.seed, index, 6)),
            frame: layer.frames[Math.floor(seededUnit(layer.seed, index, 7) * layer.frames.length)],
          });
        }
      }
    }
    return anchors;
  }

  _createPoolActor(kind, layer, index) {
    const sheet = this.config.atlas.sheetName;
    const sprite = this.scene.add.image(
      0,
      0,
      this.textureKey,
      this.atlas.frame(sheet, layer.frames[0])
    ).setOrigin(0.5).setDepth(layer.depth).setAlpha(0).setVisible(false).setScrollFactor(1);
    const blendMode = globalThis.Phaser?.BlendModes?.[layer.blendMode];
    if (blendMode !== undefined) sprite.setBlendMode(blendMode);
    sprite.name = `level1-living-${kind}-pool-${index}`;
    return { sprite, anchorId: null };
  }

  _buildAnchorSpatialIndex(kind, anchors) {
    const spacingTilesY = Number(this.config.layers[kind]?.spacingTilesY) || 16;
    const bucketSizeTiles = Math.max(1, spacingTilesY * 2);
    const buckets = new Map();
    anchors.forEach((anchor, order) => {
      const bucketKey = Math.floor(anchor.yTile / bucketSizeTiles);
      const bucket = buckets.get(bucketKey) || [];
      bucket.push({ anchor, order });
      buckets.set(bucketKey, bucket);
    });
    return { bucketSizeTiles, buckets };
  }

  _getVisibleAnchors(kind, bounds, tileSize, cap) {
    if (cap <= 0) return [];
    const index = this.anchorSpatialIndexByKind[kind];
    if (!index) {
      return this.anchorsByKind[kind]
        .filter(anchor => this._isVisible(anchor, bounds, tileSize))
        .slice(0, cap);
    }

    const firstBucket = Math.floor(bounds.top / tileSize / index.bucketSizeTiles);
    const lastBucket = Math.floor(bounds.bottom / tileSize / index.bucketSizeTiles);
    const candidates = [];
    for (let bucketKey = firstBucket; bucketKey <= lastBucket; bucketKey += 1) {
      const bucket = index.buckets.get(bucketKey);
      if (bucket) candidates.push(...bucket);
    }
    candidates.sort((left, right) => left.order - right.order);

    const visible = [];
    for (const candidate of candidates) {
      if (!this._isVisible(candidate.anchor, bounds, tileSize)) continue;
      visible.push(candidate.anchor);
      if (visible.length >= cap) break;
    }
    return visible;
  }

  _renderLayer(kind, layer, cap, bounds, tileSize, time, environment) {
    const visible = this._getVisibleAnchors(kind, bounds, tileSize, cap);
    const pool = this.pools[kind];
    pool.forEach((actor, index) => {
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
    const crossWave = Math.cos(angle * 0.73 + anchor.phase * Math.PI);
    const depthTiles = Math.max(0, anchor.yTile - this.config.environment.surfaceTile);
    const surfaceInfluence = clamp01(
      1 - depthTiles / this.config.environment.weatherInfluenceDepthTiles
    );
    const windDepthScale = lerp(
      this.config.environment.deepWindScale,
      1,
      surfaceInfluence
    );
    const wind = environment.wind / this.config.environment.maxWindPxPerSecond
      * windDepthScale
      * (1 + environment.gust * layer.gustWindBoost);
    const x = anchor.xTile * tileSize
      + wave * layer.swayTiles * tileSize
      + wind * crossWave * layer.windTiles * tileSize;
    const y = anchor.yTile * tileSize + crossWave * layer.bobTiles * tileSize;
    const pulse = 1 + wave * layer.scalePulse;
    let alpha = anchor.alpha * (0.78 + 0.22 * (wave * 0.5 + 0.5));
    alpha *= 1
      + surfaceInfluence * (
        environment.fog * layer.fogAlphaBoost
        + environment.rain * layer.rainAlphaBoost
        + environment.night * layer.nightAlphaBoost
      )
      + environment.undergroundSignal * layer.undergroundSignalAlphaBoost;

    const frame = this.atlas.frame(this.config.atlas.sheetName, anchor.frame);
    if (sprite.frame?.name !== frame) sprite.setFrame(frame);
    sprite.setPosition(x, y)
      .setDisplaySize(anchor.widthTiles * tileSize * pulse, anchor.heightTiles * tileSize / pulse)
      .setRotation(crossWave * layer.rotationRadians)
      .setTint(layer.tint)
      .setAlpha(clamp01(alpha))
      .setVisible(true);
  }

  _getEnvironment() {
    const weatherSystem = this.scene.weatherSystem;
    const snapshot = weatherSystem?.getLightingSnapshot?.()
      || weatherSystem?.getSnapshot?.()
      || {};
    const maxWind = this.config.environment.maxWindPxPerSecond;
    return {
      night: clamp01(this.scene.dayNightCycle?.getNightAmount?.() || 0),
      fog: clamp01(snapshot.fogAmount || 0),
      rain: clamp01(snapshot.rainAmount || 0),
      gust: clamp01(snapshot.windGustAmount ?? snapshot.gustAmount ?? 0),
      undergroundSignal: clamp01(snapshot.undergroundSignal || 0),
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
    const regions = Object.values(this.config.regions || { level1: this.config.region });
    return regions.some(region => bounds.right > region.leftTile * tileSize
      && bounds.left < region.rightTileExclusive * tileSize
      && bounds.bottom > region.topTile * tileSize
      && bounds.top < region.bottomTileExclusive * tileSize);
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
