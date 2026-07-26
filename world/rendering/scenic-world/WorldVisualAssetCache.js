export class WorldVisualAssetCache {
  constructor(scene, { retainKeys = [], videoNoAudio = true } = {}) {
    this.scene = scene;
    this.retainKeys = new Set(retainKeys);
    this.videoNoAudio = videoNoAudio;
    this.pending = new Map();
    this.loadedByCache = new Set();
    this.assetsByKey = new Map();
    this.destroyed = false;
    this._handleLoadError = this._handleLoadError.bind(this);
    this.scene.load.on("loaderror", this._handleLoadError);
  }

  ensure(asset, { onReady = null, onError = null } = {}) {
    if (this.destroyed || !asset?.key || !asset?.path) return false;
    this.assetsByKey.set(asset.key, asset);
    if (this._exists(asset)) {
      onReady?.(asset);
      return true;
    }

    const existing = this.pending.get(asset.key);
    if (existing) {
      if (onReady) existing.ready.add(onReady);
      if (onError) existing.error.add(onError);
      return false;
    }

    const type = asset.type === "video" ? "video" : "image";
    const eventName = `filecomplete-${type}-${asset.key}`;
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
    if (type === "video") {
      this.scene.load.video(asset.key, asset.path, this.videoNoAudio);
    } else {
      this.scene.load.image(asset.key, asset.path);
    }
    if (!this.scene.load.isLoading()) this.scene.load.start();
    console.info(`[WorldVisualAssetCache] Streaming ${asset.key}`);
    return false;
  }

  _exists(asset, key = asset?.key) {
    if (!key) return false;
    return asset?.type === "video"
      ? Boolean(this.scene.cache?.video?.exists(key))
      : this.scene.textures.exists(key);
  }

  release(key, asset = this.assetsByKey.get(key)) {
    if (!key || this.retainKeys.has(key) || this.pending.has(key)) return false;
    if (!this._exists(asset, key)) return false;
    if (asset?.type === "video") {
      this.scene.cache.video.remove(key);
    } else {
      this.scene.textures.remove(key);
    }
    this.loadedByCache.delete(key);
    this.assetsByKey.delete(key);
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
    this.assetsByKey.clear();
  }
}
