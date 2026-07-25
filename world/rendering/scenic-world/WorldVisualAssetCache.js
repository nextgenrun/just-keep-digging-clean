export class WorldVisualAssetCache {
  constructor(scene, { retainKeys = [] } = {}) {
    this.scene = scene;
    this.retainKeys = new Set(retainKeys);
    this.pending = new Map();
    this.loadedByCache = new Set();
    this.destroyed = false;
    this._handleLoadError = this._handleLoadError.bind(this);
    this.scene.load.on("loaderror", this._handleLoadError);
  }

  ensure(asset, { onReady = null, onError = null } = {}) {
    if (this.destroyed || !asset?.key || !asset?.path) return false;
    if (this.scene.textures.exists(asset.key)) {
      onReady?.(asset);
      return true;
    }

    const existing = this.pending.get(asset.key);
    if (existing) {
      if (onReady) existing.ready.add(onReady);
      if (onError) existing.error.add(onError);
      return false;
    }

    const eventName = `filecomplete-image-${asset.key}`;
    const record = {
      asset,
      eventName,
      ready: new Set(onReady ? [onReady] : []),
      error: new Set(onError ? [onError] : []),
      complete: null,
    };
    record.complete = () => this._finish(asset.key);
    this.pending.set(asset.key, record);
    this.scene.load.once(eventName, record.complete);
    this.scene.load.image(asset.key, asset.path);
    if (!this.scene.load.isLoading()) this.scene.load.start();
    console.info(`[WorldVisualAssetCache] Streaming ${asset.key}`);
    return false;
  }

  release(key) {
    if (!key || this.retainKeys.has(key) || this.pending.has(key)) return false;
    if (!this.scene.textures.exists(key)) return false;
    this.scene.textures.remove(key);
    this.loadedByCache.delete(key);
    return true;
  }

  _finish(key) {
    const record = this.pending.get(key);
    if (!record || this.destroyed) return;
    this.pending.delete(key);
    this.loadedByCache.add(key);
    for (const callback of record.ready) callback(record.asset);
  }

  _handleLoadError(file) {
    const key = file?.key;
    const record = this.pending.get(key);
    if (!record) return;
    this.scene.load.off(record.eventName, record.complete);
    this.pending.delete(key);
    console.error(`[WorldVisualAssetCache] Failed to stream ${key}`);
    for (const callback of record.error) callback(record.asset, file);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.load.off("loaderror", this._handleLoadError);
    for (const record of this.pending.values()) {
      this.scene.load.off(record.eventName, record.complete);
    }
    this.pending.clear();
    for (const key of this.loadedByCache) this.release(key);
    this.loadedByCache.clear();
  }
}
