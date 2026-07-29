import { WorldBackgroundSpatialIndex } from "./WorldBackgroundSpatialIndex.js";

export class WorldBackgroundVisibilityIndex {
  constructor(scene, config, manifest) {
    this.scene = scene;
    this.config = config;
    this.manifest = manifest;
    this.spatialIndex = null;
    this.runtimeCropBounds = null;
    this.indexedItems = null;
    this.indexedItemCount = -1;
    this.lastCameraSignature = null;
  }

  shouldUpdate(items, optimized, force) {
    this.ensure(items);
    const signature = this.getCameraSignature();
    if (
      optimized
      && !force
      && this.cameraSignaturesMatch(signature, this.lastCameraSignature)
    ) {
      return false;
    }
    this.lastCameraSignature = signature;
    return true;
  }

  ensure(items) {
    if (
      this.indexedItems === items
      && this.indexedItemCount === items.length
      && this.spatialIndex
    ) {
      return;
    }
    this.rebuild(items);
  }

  rebuild(items) {
    const scheduler = this.config.streamScheduler;
    const bandHeightPx = this.manifest.tileSize * scheduler.spatialBandHeightTiles;
    this.spatialIndex = new WorldBackgroundSpatialIndex(bandHeightPx);
    this.spatialIndex.rebuild(items, entry => this.getObjectRect(entry));
    for (const item of items) item.runtimeStyle = this.getObjectStyle(item.entry);
    this.runtimeCropBounds = this.computeRuntimeCropBounds(items);
    this.indexedItems = items;
    this.indexedItemCount = items.length;
  }

  getCameraBounds(items, marginTilesX, marginTilesY) {
    this.ensure(items);
    const camera = this.scene.cameras.main;
    const view = camera.worldView;
    const zoom = camera.zoom || 1;
    const x = Number.isFinite(view?.x) ? view.x : camera.scrollX;
    const y = Number.isFinite(view?.y) ? view.y : camera.scrollY;
    const width = Number.isFinite(view?.width) ? view.width : camera.width / zoom;
    const height = Number.isFinite(view?.height) ? view.height : camera.height / zoom;
    const tileSize = this.manifest.tileSize;
    const marginX = marginTilesX * tileSize;
    const marginY = marginTilesY * tileSize;
    const bounds = {
      left: x - marginX,
      right: x + width + marginX,
      top: y - marginY,
      bottom: y + height + marginY,
    };
    if (!this.runtimeCropBounds) return bounds;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    return {
      left: clamp(bounds.left, this.runtimeCropBounds.left, this.runtimeCropBounds.right),
      right: clamp(bounds.right, this.runtimeCropBounds.left, this.runtimeCropBounds.right),
      top: clamp(bounds.top, this.runtimeCropBounds.top, this.runtimeCropBounds.bottom),
      bottom: clamp(bounds.bottom, this.runtimeCropBounds.top, this.runtimeCropBounds.bottom),
    };
  }

  getCameraSignature() {
    const camera = this.scene.cameras.main;
    const view = camera.worldView;
    const zoom = camera.zoom || 1;
    const x = Number.isFinite(view?.x) ? view.x : camera.scrollX;
    const y = Number.isFinite(view?.y) ? view.y : camera.scrollY;
    const width = Number.isFinite(view?.width) ? view.width : camera.width / zoom;
    const height = Number.isFinite(view?.height) ? view.height : camera.height / zoom;
    const scheduler = this.config.streamScheduler;
    const strideX = this.manifest.tileSize * scheduler.cameraStrideTilesX;
    const strideY = this.manifest.tileSize * scheduler.cameraStrideTilesY;
    return {
      x: Math.floor((x + width / 2) / strideX),
      y: Math.floor((y + height / 2) / strideY),
      width,
      height,
      zoom,
    };
  }

  cameraSignaturesMatch(left, right) {
    return Boolean(left && right)
      && left.x === right.x
      && left.y === right.y
      && left.width === right.width
      && left.height === right.height
      && left.zoom === right.zoom;
  }

  computeRuntimeCropBounds(items) {
    const crop = this.manifest.runtimeCrop;
    if (!crop) return null;
    const tileSize = this.manifest.tileSize;
    const offsetX = this.manifest.xOffsetPx
      ?? (this.manifest.xOffsetTiles ?? 0) * tileSize;
    const offsetY = this.manifest.yOffsetPx
      ?? (this.manifest.yOffsetTiles ?? 0) * tileSize;
    const bounds = {
      left: crop.sourceLeftTile * tileSize + offsetX,
      right: crop.sourceRightTileExclusive * tileSize + offsetX,
      top: crop.sourceTopTile * tileSize + offsetY,
      bottom: crop.sourceBottomTileExclusive * tileSize + offsetY,
    };
    for (const item of items) {
      const rect = item.runtimeRect;
      bounds.left = Math.min(bounds.left, rect.left);
      bounds.right = Math.max(bounds.right, rect.right);
      bounds.top = Math.min(bounds.top, rect.top);
      bounds.bottom = Math.max(bounds.bottom, rect.bottom);
    }
    return bounds;
  }

  getObjectRect(entry) {
    const tileSize = this.manifest.tileSize;
    const style = this.getObjectStyle(entry);
    const offsetX = this.manifest.xOffsetPx
      ?? (this.manifest.xOffsetTiles ?? 0) * tileSize;
    const offsetY = (
      this.manifest.yOffsetPx
      ?? (this.manifest.yOffsetTiles ?? 0) * tileSize
    ) + style.yOffsetTiles * tileSize;
    const left = (entry.xPx ?? entry.xTile * tileSize) + offsetX;
    const top = (entry.yPx ?? entry.yTile * tileSize) + offsetY;
    const width = entry.widthPx ?? entry.widthTiles * tileSize;
    const height = entry.heightPx ?? entry.heightTiles * tileSize;
    return { left, right: left + width, top, bottom: top + height, width, height };
  }

  getObjectStyle(entry) {
    const config = this.config.surfaceArtAlignment;
    if (!config?.enabled) return { yOffsetTiles: 0, alphaMultiplier: 1, tint: null };
    const name = entry.name || "";
    const isGround = config.groundPrefixes.some(prefix => name.startsWith(prefix));
    const isTown = name.startsWith(config.townPrefix);
    return {
      yOffsetTiles: isGround ? config.groundDownshiftTiles : 0,
      alphaMultiplier: isTown ? config.townAlphaMultiplier : 1,
      tint: isTown ? config.townTint : null,
    };
  }

  getCandidates(items, bounds, optimized) {
    this.ensure(items);
    return optimized ? this.spatialIndex.query(bounds) : items;
  }

  intersectsEntry(entry, bounds) {
    return this.rectIntersects(this.getObjectRect(entry), bounds);
  }

  intersectsItem(item, bounds) {
    return this.rectIntersects(item.runtimeRect || this.getObjectRect(item.entry), bounds);
  }

  rectIntersects(rect, bounds) {
    return rect.right > bounds.left && rect.left < bounds.right
      && rect.bottom > bounds.top && rect.top < bounds.bottom;
  }

  getByRuntimeId(runtimeId) {
    return this.spatialIndex?.getByRuntimeId(runtimeId) || null;
  }

  getByTextureKey(textureKey) {
    return this.spatialIndex?.getByTextureKey(textureKey) || [];
  }

  clear() {
    this.spatialIndex = null;
    this.runtimeCropBounds = null;
    this.indexedItems = null;
    this.lastCameraSignature = null;
  }
}
