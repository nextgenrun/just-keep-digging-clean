import {
  clampFireLight01,
  mixFireLight,
  traceFireRayToSolid,
} from "./fireLightMath.js";

const radians = degrees => Number(degrees) * Math.PI / 180;

export class OldSchoolLampRayRenderer {
  constructor(scene, config, enabled = true) {
    this.scene = scene;
    this.config = config;
    this.enabled = Boolean(enabled);
    this.available = false;
    this.rays = [];
    this._lengths = [];
    this._lastRefreshAt = Number.NEGATIVE_INFINITY;
    this._lastTraceKey = "";
    this._snapshot = {
      available: false,
      enabled: this.enabled,
      active: false,
      visibleRayCount: 0,
      lengthsWorld: [],
    };
    this._create();
  }

  _create() {
    const cfg = this.config.rays;
    const key = this.config.assetKeys.rays;
    if (!this.enabled || !this.scene.textures?.exists?.(key)) return;
    try {
      const blend = globalThis.Phaser?.BlendModes?.ADD;
      this.rays = cfg.relativeAnglesDegrees.map(() => {
        const image = this.scene.add.image(0, 0, key, 0)
          .setOrigin(cfg.textureOriginX, cfg.textureOriginY)
          .setDepth(this.config.renderDepth.rays)
          .setVisible(false)
          .setAlpha(0);
        if (blend !== undefined) image.setBlendMode(blend);
        return image;
      });
      this._lengths = this.rays.map(() => 0);
      this.available = this.rays.length > 0;
      this._snapshot.available = this.available;
    } catch (error) {
      console.warn("[OldSchoolLampRayRenderer] Authored reflector rays unavailable.", error);
      this.destroy();
    }
  }

  render({
    time,
    active,
    source,
    tileSize,
    strength,
    lighting,
    worldModel,
  }) {
    if (!this.available) return false;
    if (!active || !source) {
      this.hide();
      return true;
    }
    const cfg = this.config.rays;
    const tile = Math.max(1, Number(tileSize) || 1);
    const sourceTile = worldModel?.worldToTile?.(source.x, source.y) || {
      tx: Math.floor(source.x / tile),
      ty: Math.floor(source.y / tile),
    };
    const facing = source.facingSign < 0 ? -1 : 1;
    const traceKey = `${sourceTile.tx},${sourceTile.ty},${facing}`;
    if (
      traceKey !== this._lastTraceKey
      || time - this._lastRefreshAt >= cfg.refreshIntervalMs
    ) {
      this._refreshLengths(source, tile, worldModel, facing);
      this._lastTraceKey = traceKey;
      this._lastRefreshAt = time;
    }
    const surface = clampFireLight01(lighting?.surfaceLightInfluence);
    const underground = clampFireLight01(lighting?.undergroundDarknessInfluence);
    const night = clampFireLight01(lighting?.nightAmount);
    const rain = clampFireLight01(lighting?.weather?.rainAmount) * surface;
    const surfaceAlpha = mixFireLight(cfg.surfaceDayAlpha, cfg.surfaceNightAlpha, night);
    const environmentAlpha = surface * surfaceAlpha + underground * cfg.undergroundAlpha;
    const frameBase = Math.floor(
      Math.max(0, time) * cfg.framesPerSecond / 1000
    ) % this.config.atlas.frameCount;
    let visibleRayCount = 0;

    this.rays.forEach((ray, index) => {
      const length = this._lengths[index] || 0;
      const lengthRatio = clampFireLight01(length / (cfg.maxLengthTiles * tile));
      const alpha = clampFireLight01(
        cfg.alpha[index]
        * strength
        * environmentAlpha
        * (1 + underground * cfg.dustAlphaMultiplier)
        * mixFireLight(1, cfg.rainAlphaMultiplier, rain)
        * lengthRatio
      );
      if (alpha <= 0 || length <= 0) {
        ray.setVisible(false).setAlpha(0);
        return;
      }
      const relative = radians(cfg.relativeAnglesDegrees[index]);
      const targetAngle = facing > 0 ? relative : Math.PI - relative;
      const frame = (frameBase + cfg.frameOffsets[index]) % this.config.atlas.frameCount;
      const extent = length * cfg.textureExtentScale;
      ray
        .setFrame(frame)
        .setPosition(source.x, source.y)
        .setRotation(targetAngle - radians(cfg.baseTextureAngleDegrees))
        .setDisplaySize(extent, extent)
        .setAlpha(alpha)
        .setVisible(true);
      visibleRayCount += 1;
    });
    this._snapshot = {
      available: true,
      active: visibleRayCount > 0,
      visibleRayCount,
      lengthsWorld: [...this._lengths],
    };
    return true;
  }

  _refreshLengths(source, tileSize, worldModel, facing) {
    const cfg = this.config.rays;
    this._lengths = cfg.relativeAnglesDegrees.map(relativeDegrees => {
      const relative = radians(relativeDegrees);
      const angle = facing > 0 ? relative : Math.PI - relative;
      return traceFireRayToSolid({
        worldModel,
        sourceX: source.x,
        sourceY: source.y,
        angleRadians: angle,
        tileSize,
        maxLengthTiles: cfg.maxLengthTiles,
        minimumLengthTiles: cfg.minimumLengthTiles,
        collisionPaddingTiles: cfg.collisionPaddingTiles,
        sampleStepTiles: cfg.sampleStepTiles,
      });
    });
  }

  hide() {
    for (const ray of this.rays) ray?.setVisible(false)?.setAlpha(0);
    this._snapshot = {
      ...this._snapshot,
      active: false,
      visibleRayCount: 0,
    };
  }

  getSnapshot() {
    return {
      ...this._snapshot,
      lengthsWorld: [...this._snapshot.lengthsWorld],
    };
  }

  destroy() {
    for (const ray of this.rays) ray?.destroy?.();
    this.rays = [];
    this._lengths = [];
    this.available = false;
  }
}
