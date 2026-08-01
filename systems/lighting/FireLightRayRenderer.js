import {
  clampFireLight01,
  mixFireLight,
  traceFireRayToSolid,
} from "./fireLightMath.js";

const degreesToRadians = degrees => Number(degrees) * Math.PI / 180;

export class FireLightRayRenderer {
  constructor(scene, config, enabled = true) {
    this.scene = scene;
    this.config = config;
    this.enabled = Boolean(enabled);
    this.available = false;
    this.rays = [];
    this._lengths = [];
    this._lastRefreshAt = Number.NEGATIVE_INFINITY;
    this._lastSourceTile = "";
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
    const key = this.config.assetKeys.rays;
    if (!this.enabled || !this.scene.textures?.exists?.(key)) return;
    try {
      const blend = globalThis.Phaser?.BlendModes?.ADD;
      this.rays = this.config.rays.anglesDegrees.map(() => {
        const image = this.scene.add.image(0, 0, key, 0)
          .setOrigin(0.5, 1)
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
      console.warn("[FireLightRayRenderer] Local ray sprites unavailable.", error);
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
    reducedFlicker,
  }) {
    if (!this.available || !this.enabled) return false;
    if (!active || !source) {
      this.hide();
      return true;
    }

    const cfg = this.config.rays;
    const safeTileSize = Math.max(1, Number(tileSize) || 1);
    const sourceTile = worldModel?.worldToTile?.(source.x, source.y) || {
      tx: Math.floor(source.x / safeTileSize),
      ty: Math.floor(source.y / safeTileSize),
    };
    const tileKey = `${sourceTile.tx},${sourceTile.ty}`;
    if (
      tileKey !== this._lastSourceTile
      || time - this._lastRefreshAt >= cfg.refreshIntervalMs
    ) {
      this._refreshLengths(source, safeTileSize, worldModel);
      this._lastSourceTile = tileKey;
      this._lastRefreshAt = time;
    }

    const surface = clampFireLight01(lighting?.surfaceLightInfluence);
    const underground = clampFireLight01(lighting?.undergroundDarknessInfluence);
    const night = clampFireLight01(lighting?.nightAmount);
    const rain = clampFireLight01(lighting?.weather?.rainAmount) * surface;
    const surfaceAlpha = mixFireLight(cfg.surfaceDayAlpha, cfg.surfaceNightAlpha, night);
    const environmentAlpha = surface * surfaceAlpha
      + underground * cfg.undergroundAlpha;
    const dustBoost = 1 + underground * cfg.dustAlphaMultiplier;
    const rainScale = mixFireLight(1, cfg.rainAlphaMultiplier, rain);
    const flickerScale = reducedFlicker ? cfg.reducedFlickerScale : 1;
    const frameBase = Math.floor(
      Math.max(0, time) * cfg.framesPerSecond / 1000
    ) % this.config.atlas.frameCount;
    let visibleRayCount = 0;

    this.rays.forEach((ray, index) => {
      const length = this._lengths[index] || 0;
      const lengthRatio = clampFireLight01(
        length / (cfg.maxLengthTiles * safeTileSize)
      );
      const phase = time * this.config.flicker.radiansPerMs
        + cfg.frameOffsets[index];
      const pulse = 1 + Math.sin(phase)
        * this.config.flicker.alphaAmount
        * flickerScale;
      const alpha = clampFireLight01(
        cfg.alpha[index]
        * strength
        * environmentAlpha
        * dustBoost
        * rainScale
        * lengthRatio
        * pulse
      );
      const visible = alpha > 0 && length > 0;
      if (!visible) {
        ray.setVisible(false).setAlpha(0);
        return;
      }

      const angle = degreesToRadians(cfg.anglesDegrees[index]);
      const frame = (frameBase + cfg.frameOffsets[index]) % this.config.atlas.frameCount;
      ray
        .setFrame(frame)
        .setPosition(source.x, source.y)
        .setRotation(angle + Math.PI / 2)
        .setDisplaySize(cfg.displayWidthTiles[index] * safeTileSize, length)
        .setAlpha(alpha)
        .setVisible(true);
      visibleRayCount += 1;
    });

    this._snapshot = {
      available: true,
      enabled: true,
      active: visibleRayCount > 0,
      visibleRayCount,
      lengthsWorld: [...this._lengths],
    };
    return true;
  }

  _refreshLengths(source, tileSize, worldModel) {
    const cfg = this.config.rays;
    this._lengths = cfg.anglesDegrees.map(angleDegrees => traceFireRayToSolid({
      worldModel,
      sourceX: source.x,
      sourceY: source.y,
      angleRadians: degreesToRadians(angleDegrees),
      tileSize,
      maxLengthTiles: cfg.maxLengthTiles,
      minimumLengthTiles: cfg.minimumLengthTiles,
      collisionPaddingTiles: cfg.collisionPaddingTiles,
      sampleStepTiles: cfg.sampleStepTiles,
    }));
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
