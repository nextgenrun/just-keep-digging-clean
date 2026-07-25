import {
  WORLD_BACKGROUND_MASTER_TEST,
  resolveWorldBackgroundMasterEnabled,
} from "../../values/worldBackgroundMasterTest.js";
import { V11_POLISHED_SURFACE_RUNTIME_MANIFEST } from "../../values/v11PolishedSurfaceRuntimeManifest.js";
import { V11_DEPTH_BACKGROUND_RUNTIME_MANIFEST } from "../../values/v11DepthBackgroundRuntimeManifest.js";
import { WORLD_SCENIC_FACADE } from "../../values/worldScenicFacade.js";
import { buildWorldDepthContinuationEntries } from "./WorldDepthContinuationBuilder.js";
import { createWorldBackgroundImage } from "./createWorldBackgroundImage.js";

export class WorldBackgroundMasterSystem {
  constructor(
    scene,
    config = WORLD_BACKGROUND_MASTER_TEST,
    manifest = V11_POLISHED_SURFACE_RUNTIME_MANIFEST,
    depthManifest = V11_DEPTH_BACKGROUND_RUNTIME_MANIFEST
  ) {
    this.scene = scene;
    this.config = config;
    this.manifest = manifest;
    const continuation = buildWorldDepthContinuationEntries(
      depthManifest,
      config.depthContinuation,
      WORLD_SCENIC_FACADE
    );
    const entries = [...(manifest.objects || []), ...(depthManifest.objects || []), ...continuation];
    this.objects = entries.map((entry, index) => ({
      entry,
      index,
      runtimeId: entry.id || `v11-background-${index}`,
    }));
    this.activeObjects = [];
    this.enabled = false;
    this.depthEnabled = false;
    this.universeSkyEnabled = false;
    this.images = new Map();
    this.pendingTextures = new Set();
    this.failedTextures = new Set();
    this.ownedTextures = new Set();
    this.filteredTextures = new Set();
    this.runtimeCropFill = null;
    this._loadBatchActive = false;
    this._destroyed = false;
  }
  create() {
    this.enabled = this.resolveEnabled();
    this.depthEnabled = this.resolveDepthEnabled();
    this.universeSkyEnabled = this.resolveUniverseSkyEnabled();
    this.activeObjects = this.objects.filter(({ entry }) =>
      entry.active !== false
      && (entry.scope !== "underground-depth" || this.depthEnabled)
      && (!this.universeSkyEnabled || !entry.name?.startsWith(this.config.replacedSkyObjectPrefix)));
    if (!this.enabled || this.activeObjects.length === 0) {
      const reason = this.activeObjects.length === 0 ? "manifest has no active objects" : "rollback selected";
      console.info(`[WorldBackgroundMasterSystem] Disabled (${reason}); use ?worldMaster=1 to enable`);
      return false;
    }

    const cropBounds = this.getRuntimeCropBounds();
    const fill = this.config.runtimeCropFill;
    if (cropBounds && fill?.enabled) {
      this.runtimeCropFill = this.scene.add.rectangle(
        cropBounds.left, cropBounds.top,
        cropBounds.right - cropBounds.left, cropBounds.bottom - cropBounds.top,
        fill.color, fill.alpha
      ).setOrigin(0, 0).setDepth(fill.depth);
    }
    this._destroyed = false;
    this.scene.load.on("loaderror", this.handleLoadError, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.update();
    console.info(
      `[WorldBackgroundMasterSystem] Streaming ${this.activeObjects.length} polished v11 objects; `
      + `depth ${this.depthEnabled ? "enabled" : "disabled"}; `
      + `universe sky ${this.universeSkyEnabled ? "enabled" : "legacy"}; `
      + "use ?worldMaster=0, ?worldDepthMaster=0, or ?universeSky=0 to roll back"
    );
    return true;
  }
  resolveEnabled() {
    return resolveWorldBackgroundMasterEnabled(this.config);
  }
  resolveDepthEnabled() {
    const search = globalThis.location?.search || "";
    const value = new URLSearchParams(search).get(this.config.depthQueryParam)?.toLowerCase();
    if (value && this.config.queryDisableValues.includes(value)) return false;
    if (value && this.config.queryEnableValues.includes(value)) return true;
    return this.config.depthEnabled;
  }
  resolveUniverseSkyEnabled() {
    const search = globalThis.location?.search || "";
    const value = new URLSearchParams(search).get(this.config.universeSkyQueryParam)?.toLowerCase();
    if (value && this.config.queryDisableValues.includes(value)) return false;
    if (value && this.config.queryEnableValues.includes(value)) return true;
    return this.config.universeSkyEnabled;
  }
  update() {
    if (!this.enabled || this._destroyed) return;

    const loadBounds = this.getCameraBounds(
      this.config.preloadMarginTilesX,
      this.config.preloadMarginTilesY
    );
    const keepBounds = this.getCameraBounds(
      this.config.unloadMarginTilesX,
      this.config.unloadMarginTilesY
    );
    const needed = this.activeObjects.filter((item) => this.intersects(item.entry, loadBounds));

    this.syncLoadedObjects(needed);
    this.queueMissingTextures(needed);
    this.unloadDistantObjects(keepBounds);
  }
  getCameraBounds(marginTilesX, marginTilesY) {
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
    const cropBounds = this.getRuntimeCropBounds();
    if (!cropBounds) return bounds;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    return {
      left: clamp(bounds.left, cropBounds.left, cropBounds.right),
      right: clamp(bounds.right, cropBounds.left, cropBounds.right),
      top: clamp(bounds.top, cropBounds.top, cropBounds.bottom),
      bottom: clamp(bounds.bottom, cropBounds.top, cropBounds.bottom),
    };
  }
  getRuntimeCropBounds() {
    const crop = this.manifest.runtimeCrop;
    if (!crop) return null;
    const tileSize = this.manifest.tileSize;
    const offsetX = this.manifest.xOffsetPx ?? (this.manifest.xOffsetTiles ?? 0) * tileSize;
    const offsetY = this.manifest.yOffsetPx ?? (this.manifest.yOffsetTiles ?? 0) * tileSize;
    const bounds = {
      left: crop.sourceLeftTile * tileSize + offsetX,
      right: crop.sourceRightTileExclusive * tileSize + offsetX,
      top: crop.sourceTopTile * tileSize + offsetY,
      bottom: crop.sourceBottomTileExclusive * tileSize + offsetY,
    };
    for (const { entry } of this.activeObjects) {
      const rect = this.getObjectRect(entry);
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
    const offsetX = this.manifest.xOffsetPx ?? (this.manifest.xOffsetTiles ?? 0) * tileSize;
    const offsetY = (this.manifest.yOffsetPx ?? (this.manifest.yOffsetTiles ?? 0) * tileSize)
      + style.yOffsetTiles * tileSize;
    const left = (entry.xPx ?? entry.xTile * tileSize) + offsetX;
    const top = (entry.yPx ?? entry.yTile * tileSize) + offsetY;
    const width = entry.widthPx ?? entry.widthTiles * tileSize;
    const height = entry.heightPx ?? entry.heightTiles * tileSize;
    return { left, right: left + width, top, bottom: top + height, width, height };
  }
  getObjectStyle(entry) {
    const cfg = this.config.surfaceArtAlignment;
    if (!cfg?.enabled) return { yOffsetTiles: 0, alphaMultiplier: 1, tint: null };
    const name = entry.name || "";
    const isGround = cfg.groundPrefixes.some(prefix => name.startsWith(prefix));
    const isTown = name.startsWith(cfg.townPrefix);
    return {
      yOffsetTiles: isGround ? cfg.groundDownshiftTiles : 0,
      alphaMultiplier: isTown ? cfg.townAlphaMultiplier : 1,
      tint: isTown ? cfg.townTint : null,
    };
  }

  intersects(entry, bounds) {
    const rect = this.getObjectRect(entry);
    return rect.right > bounds.left && rect.left < bounds.right
      && rect.bottom > bounds.top && rect.top < bounds.bottom;
  }

  syncLoadedObjects(items) {
    for (const item of items) {
      const { entry, runtimeId } = item;
      if (this.images.has(runtimeId) || !this.scene.textures.exists(entry.textureKey)) continue;
      this.applyLinearFiltering(entry.textureKey);
      const rect = this.getObjectRect(entry);
      const style = this.getObjectStyle(entry);
      const depth = Number.isFinite(entry.depth)
        ? entry.depth
        : this.config.fallbackRenderDepth + this.config.fallbackObjectDepthStep * entry.drawOrder;
      const image = createWorldBackgroundImage(
        this.scene, entry, runtimeId, rect, style, depth
      );
      this.images.set(runtimeId, image);
    }
  }

  applyLinearFiltering(textureKey) {
    if (!this.config.linearFiltering || this.filteredTextures.has(textureKey)) return;
    const texture = this.scene.textures.get(textureKey);
    const linear = globalThis.Phaser?.Textures?.FilterMode?.LINEAR;
    if (texture?.setFilter && linear !== undefined) texture.setFilter(linear);
    this.filteredTextures.add(textureKey);
  }

  queueMissingTextures(items) {
    if (this._loadBatchActive || this.scene.load.isLoading()) return;

    const batchByTexture = new Map();
    for (const item of items) {
      const { entry } = item;
      if (!entry.path || !entry.textureKey || this.scene.textures.exists(entry.textureKey)) continue;
      if (this.pendingTextures.has(entry.textureKey) || this.failedTextures.has(entry.textureKey)) continue;
      batchByTexture.set(entry.textureKey, entry);
    }
    const batch = [...batchByTexture.values()];
    if (batch.length === 0) return;

    this._loadBatchActive = true;
    for (const entry of batch) {
      this.pendingTextures.add(entry.textureKey);
      this.ownedTextures.add(entry.textureKey);
      this.scene.load.image(entry.textureKey, entry.path);
    }
    this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
      batch.forEach((entry) => this.pendingTextures.delete(entry.textureKey));
      this._loadBatchActive = false;
      if (this._destroyed) {
        batch.forEach((entry) => this.removeOwnedTexture(entry.textureKey));
        return;
      }
      this.update();
    });
    this.scene.load.start();
  }

  handleLoadError(file) {
    const textureKey = file?.key;
    if (!textureKey || !this.ownedTextures.has(textureKey)) return;
    this.failedTextures.add(textureKey);
    this.pendingTextures.delete(textureKey);
    const item = this.activeObjects.find(({ entry }) => entry.textureKey === textureKey);
    console.warn(`[WorldBackgroundMasterSystem] Failed to load ${item?.entry.path || textureKey}`);
  }

  unloadDistantObjects(bounds) {
    const retainedTextureKeys = new Set();
    for (const item of this.activeObjects) {
      const { entry, runtimeId } = item;
      if (this.intersects(entry, bounds)) {
        retainedTextureKeys.add(entry.textureKey);
        continue;
      }
      const image = this.images.get(runtimeId);
      if (image) image.destroy();
      this.images.delete(runtimeId);
    }

    for (const textureKey of [...this.ownedTextures]) {
      if (retainedTextureKeys.has(textureKey) || this.pendingTextures.has(textureKey)) continue;
      const stillDisplayed = this.activeObjects.some((item) =>
        item.entry.textureKey === textureKey && this.images.has(item.runtimeId));
      if (!stillDisplayed) this.removeOwnedTexture(textureKey);
    }
  }

  removeOwnedTexture(textureKey) {
    if (!this.ownedTextures.has(textureKey)) return;
    if (this.scene.textures.exists(textureKey)) this.scene.textures.remove(textureKey);
    this.ownedTextures.delete(textureKey);
    this.filteredTextures.delete(textureKey);
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.enabled = false;
    this.scene.load.off("loaderror", this.handleLoadError, this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.runtimeCropFill?.destroy();
    this.runtimeCropFill = null;
    for (const image of this.images.values()) image.destroy();
    this.images.clear();
    for (const textureKey of [...this.ownedTextures]) {
      if (!this.pendingTextures.has(textureKey)) this.removeOwnedTexture(textureKey);
    }
    this.failedTextures.clear();
    this.filteredTextures.clear();
  }
}
