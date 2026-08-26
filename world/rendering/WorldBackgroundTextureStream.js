import { createWorldBackgroundImage } from "./createWorldBackgroundImage.js";

export class WorldBackgroundTextureStream {
  constructor(scene, config, visibility, {
    getActiveObjects,
    isDestroyed,
    onBatchComplete,
    onTexturesQueued,
  }) {
    this.scene = scene;
    this.config = config;
    this.visibility = visibility;
    this.getActiveObjects = getActiveObjects;
    this.isDestroyed = isDestroyed;
    this.onBatchComplete = onBatchComplete;
    this.onTexturesQueued = onTexturesQueued;
    this.images = new Map();
    this.pendingTextures = new Set();
    this.failedTextures = new Set();
    this.ownedTextures = new Set();
    this.filteredTextures = new Set();
    this.loadBatchActive = false;
  }

  syncLoadedObjects(items) {
    for (const item of items) {
      const { entry, runtimeId } = item;
      if (this.images.has(runtimeId) || !this.scene.textures.exists(entry.textureKey)) continue;
      this.applyLinearFiltering(entry.textureKey);
      const rect = item.runtimeRect || this.visibility.getObjectRect(entry);
      const style = item.runtimeStyle || this.visibility.getObjectStyle(entry);
      const depth = Number.isFinite(entry.depth)
        ? entry.depth
        : this.config.fallbackRenderDepth
          + this.config.fallbackObjectDepthStep * entry.drawOrder;
      const image = createWorldBackgroundImage(
        this.scene,
        entry,
        runtimeId,
        rect,
        style,
        depth,
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

  queueMissingTextures(items, optimized) {
    if (this.loadBatchActive || this.scene.load.isLoading()) return;
    const maxTextures = optimized
      ? this.config.streamScheduler.maxTexturesPerBatch
      : Number.POSITIVE_INFINITY;
    const batchByTexture = new Map();
    for (const item of items) {
      const { entry } = item;
      if (!entry.path || !entry.textureKey || this.scene.textures.exists(entry.textureKey)) continue;
      if (this.pendingTextures.has(entry.textureKey) || this.failedTextures.has(entry.textureKey)) {
        continue;
      }
      batchByTexture.set(entry.textureKey, entry);
      if (batchByTexture.size >= maxTextures) break;
    }
    const batch = [...batchByTexture.values()];
    if (batch.length === 0) return;

    this.loadBatchActive = true;
    for (const entry of batch) {
      this.pendingTextures.add(entry.textureKey);
      this.ownedTextures.add(entry.textureKey);
      this.scene.load.image(entry.textureKey, entry.path);
    }
    this.onTexturesQueued(batch.length);
    this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
      batch.forEach(entry => this.pendingTextures.delete(entry.textureKey));
      this.loadBatchActive = false;
      if (this.isDestroyed()) {
        batch.forEach(entry => this.removeOwnedTexture(entry.textureKey, { force: true }));
        return;
      }
      this.onBatchComplete();
    });
    this.scene.load.start();
  }

  handleLoadError(file) {
    const textureKey = file?.key;
    if (!textureKey || !this.ownedTextures.has(textureKey)) return;
    this.failedTextures.add(textureKey);
    this.pendingTextures.delete(textureKey);
    const item = this.visibility.getByTextureKey(textureKey)[0]
      || this.getActiveObjects().find(({ entry }) => entry.textureKey === textureKey);
    console.warn(`[WorldBackgroundMasterSystem] Failed to load ${item?.entry.path || textureKey}`);
  }

  unloadDistantObjects(bounds, retainedCandidates) {
    const retainedTextureKeys = new Set();
    for (const item of retainedCandidates) {
      if (this.visibility.intersectsItem(item, bounds)) {
        retainedTextureKeys.add(item.entry.textureKey);
      }
    }

    for (const [runtimeId, image] of [...this.images.entries()]) {
      const item = this.visibility.getByRuntimeId(runtimeId);
      if (item && this.visibility.intersectsItem(item, bounds)) continue;
      image.destroy();
      this.images.delete(runtimeId);
    }

    for (const textureKey of [...this.ownedTextures]) {
      if (retainedTextureKeys.has(textureKey) || this.pendingTextures.has(textureKey)) continue;
      const stillDisplayed = this.visibility.getByTextureKey(textureKey).some(
        item => this.images.has(item.runtimeId)
      );
      if (!stillDisplayed) this.removeOwnedTexture(textureKey);
    }
  }

  hasLiveTextureConsumer(textureKey) {
    const pending = [...(this.scene.children?.list || [])];
    const visited = new Set();
    while (pending.length > 0) {
      const gameObject = pending.pop();
      if (!gameObject || visited.has(gameObject)) continue;
      visited.add(gameObject);
      if (
        gameObject.active !== false
        && gameObject.destroyed !== true
        && (
          gameObject.texture?.key === textureKey
          || gameObject.frame?.texture?.key === textureKey
        )
      ) {
        return true;
      }
      if (Array.isArray(gameObject.list)) pending.push(...gameObject.list);
    }
    return false;
  }

  removeOwnedTexture(textureKey, { force = false } = {}) {
    if (!this.ownedTextures.has(textureKey)) return;
    // Phaser frames keep a live reference to their TextureSource. Removing a
    // texture while any Image (including one nested in a Container) still owns
    // such a frame leaves Frame.glTexture null and stops the whole render loop.
    if (!force && this.hasLiveTextureConsumer(textureKey)) return false;
    if (this.scene.textures.exists(textureKey)) this.scene.textures.remove(textureKey);
    this.ownedTextures.delete(textureKey);
    this.filteredTextures.delete(textureKey);
    return true;
  }

  snapshot() {
    return {
      activeImages: this.images.size,
      pendingTextures: this.pendingTextures.size,
      ownedTextures: this.ownedTextures.size,
    };
  }

  destroy() {
    for (const image of this.images.values()) image.destroy();
    this.images.clear();
    for (const textureKey of [...this.ownedTextures]) {
      if (!this.pendingTextures.has(textureKey)) {
        this.removeOwnedTexture(textureKey, { force: true });
      }
    }
    this.failedTextures.clear();
    this.filteredTextures.clear();
  }
}
