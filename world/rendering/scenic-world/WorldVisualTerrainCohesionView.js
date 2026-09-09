import { resolveScenicFocusAlpha } from "../../../values/gameplayPresentation.js";
import { resolveWorldVisualTerrainCohesionPlacement } from
  "../../../values/worldVisualTerrainVariation.js?rev=20260729-underground-seam-v6";
import {
  setAlphaIfChanged,
  setTintIfChanged,
} from "./worldVisualRenderState.js";

function intersects(bounds, placement) {
  return bounds.right > placement.leftTile
    && bounds.left < placement.rightTileExclusive
    && bounds.bottom > placement.topTile
    && bounds.top < placement.bottomTileExclusive;
}

export class WorldVisualTerrainCohesionView {
  constructor(scene, region, config, terrainMask, enabled) {
    this.scene = scene;
    this.region = region;
    this.config = config;
    this.terrainMask = terrainMask;
    this.enabled = enabled;
    this.placement = enabled
      ? resolveWorldVisualTerrainCohesionPlacement(
        region,
        scene.config.tileSize,
        config
      )
      : null;
    this.image = null;
  }

  resolveRequiredAsset(bounds) {
    return this.placement && intersects(bounds, this.placement)
      ? this.placement.asset
      : null;
  }

  sync(bounds, lighting) {
    if (!this.placement || !intersects(bounds, this.placement)) {
      this.destroyImage();
      return false;
    }
    if (!this.scene.textures.exists(this.placement.asset.key)) return false;
    if (!this.image) this.image = this._createImage();
    this.update(lighting);
    return Boolean(this.image);
  }

  _createImage() {
    const placement = this.placement;
    const tileSize = this.scene.config.tileSize;
    const image = this.scene.add.image(
      placement.leftTile * tileSize,
      placement.topTile * tileSize,
      placement.asset.key
    )
      .setOrigin(0)
      .setDepth(this.config.render.cohesionDepth)
      .setAlpha(resolveScenicFocusAlpha(placement.asset.key, this.config.render.cohesionAlpha))
      .setScale(placement.displayScale)
      .setMask(this.terrainMask);
    image.name = `world-visual-terrain-cohesion-${this.region.id}`;
    image._worldVisualAsset = placement.asset;
    return image;
  }

  getActiveAsset() {
    return this.image?._worldVisualAsset || null;
  }

  update(lighting) {
    if (!this.image || !lighting) return;
    setTintIfChanged(this.image, lighting.terrainTint);
    setAlphaIfChanged(this.image, resolveScenicFocusAlpha(this.image.texture.key, this.config.render.cohesionAlpha));
  }

  destroyImage() {
    if (!this.image) return;
    this.image.clearMask?.(false);
    this.image.destroy();
    this.image = null;
  }

  destroy() {
    this.destroyImage();
    this.terrainMask = null;
    this.placement = null;
  }
}
