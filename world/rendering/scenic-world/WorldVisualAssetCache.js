import {
  WORLD_VISUAL_RUNTIME,
  resolveScenicAssetSchedulerEnabled,
} from "../../../values/worldVisualRuntime.js";
import { RUNTIME_ASSET_LOADING } from "../../../values/runtimeAssetLoading.js";

export class WorldVisualAssetCache {
  constructor(scene, {
    retainKeys = [],
    videoNoAudio = true,
    schedulerConfig = WORLD_VISUAL_RUNTIME.streaming.assetLoadScheduler,
    owner = RUNTIME_ASSET_LOADING.owners.default,
    priority = RUNTIME_ASSET_LOADING.priorities.default,
  } = {}) {
    this.scene = scene;
    this.retainKeys = new Set(retainKeys);
    this.videoNoAudio = videoNoAudio;
    this.schedulerConfig = schedulerConfig;
    this.schedulerEnabled = resolveScenicAssetSchedulerEnabled(schedulerConfig);
    this.owner = owner;
    this.priority = priority;
    this.coordinator = scene.runtimeAssetLoadCoordinator?.enabled
      ? scene.runtimeAssetLoadCoordinator
      : null;
    this.pending = new Map();
    this.waiting = [];
    this.activeKeys = new Set();
    this.loadedByCache = new Set();
    this.assetsByKey = new Map();
    this.destroyed = false;
    this.loaderWaitArmed = false;
    this.cancelledLoads = 0;
    this._handleLoadError = this._handleLoadError.bind(this);
    this._handleLoaderComplete = this._handleLoaderComplete.bind(this);
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
      started: false,
      coordinated: false,
      coordinatorHandle: null,
    };
    record.complete = () => this._finish(asset.key);
    this.pending.set(asset.key, record);
    if (this.coordinator) {
      this._queueCoordinated(record);
    } else if (this.schedulerEnabled) {
      this.waiting.push(record);
      this._pump();
    } else {
      this._startRecord(record);
    }
    return false;
  }

  _queueCoordinated(record) {
    record.coordinated = true;
    record.coordinatorHandle = this.coordinator.request(record.asset, {
      owner: this.owner,
      priority: this.priority,
      videoNoAudio: this.videoNoAudio,
      onStart: () => {
        if (this.destroyed || !this.pending.has(record.asset.key)) return;
        record.started = true;
        this.activeKeys.add(record.asset.key);
        console.info(`[WorldVisualAssetCache] Streaming ${record.asset.key}`);
      },
      onReady: () => this._finish(record.asset.key),
      onError: (_asset, error) => this._fail(record.asset.key, error),
    });
    if (record.coordinatorHandle) return;
    record.coordinated = false;
    if (this.schedulerEnabled) {
      this.waiting.push(record);
      this._pump();
    } else {
      this._startRecord(record);
    }
  }

  _startRecord(record) {
    if (!record || record.started || this.destroyed) return;
    const { asset, eventName } = record;
    const type = asset.type === "video" ? "video" : "image";
    record.started = true;
    this.activeKeys.add(asset.key);
    this.scene.load.once(eventName, record.complete);
    if (type === "video") {
      this.scene.load.video(asset.key, asset.path, this.videoNoAudio);
    } else {
      this.scene.load.image(asset.key, asset.path);
    }
    if (!this.scene.load.isLoading()) this.scene.load.start();
    console.info(`[WorldVisualAssetCache] Streaming ${asset.key}`);
  }

  _pump() {
    if (!this.schedulerEnabled || this.destroyed) return;
    const loader = this.scene.load;
    if (loader.isLoading()) {
      if (!this.loaderWaitArmed) {
        this.loaderWaitArmed = true;
        loader.once(this.schedulerConfig.loaderCompleteEvent, this._handleLoaderComplete);
      }
      return;
    }
    if (this.loaderWaitArmed) {
      loader.off(this.schedulerConfig.loaderCompleteEvent, this._handleLoaderComplete);
      this.loaderWaitArmed = false;
    }
    let started = 0;
    while (this.waiting.length > 0 && started < this.schedulerConfig.maxAssetsPerBatch) {
      this._startRecord(this.waiting.shift());
      started += 1;
    }
  }

  _handleLoaderComplete() {
    this.loaderWaitArmed = false;
    this._pump();
  }

  _exists(asset, key = asset?.key) {
    if (!key) return false;
    return asset?.type === "video"
      ? Boolean(this.scene.cache?.video?.exists(key))
      : this.scene.textures.exists(key);
  }

  release(key, asset = this.assetsByKey.get(key)) {
    if (!key || this.retainKeys.has(key)) return false;
    const pendingRecord = this.pending.get(key);
    if (pendingRecord) {
      if (!pendingRecord.started) return this._cancelWaitingRecord(pendingRecord);
      return false;
    }
    if (!this._exists(asset, key)) return false;
    if (asset?.type === "video") {
      this.scene.cache.video.remove(key);
    } else {
      this.scene.textures.remove(key);
    }
    this.coordinator?.releaseDecodedSource?.(key);
    this.loadedByCache.delete(key);
    this.assetsByKey.delete(key);
    return true;
  }

  _cancelWaitingRecord(record) {
    if (record.coordinated) {
      record.coordinatorHandle?.cancel?.();
    } else {
      const index = this.waiting.indexOf(record);
      if (index >= 0) this.waiting.splice(index, 1);
    }
    this.pending.delete(record.asset.key);
    this.assetsByKey.delete(record.asset.key);
    this.cancelledLoads += 1;
    const cancellation = { cancelled: true };
    for (const callback of record.error) {
      callback(record.asset, cancellation);
    }
    return true;
  }

  getPerformanceSnapshot() {
    return {
      pendingAssets: this.pending.size,
      waitingAssets: this.waiting.length + [...this.pending.values()].filter(
        record => record.coordinated && !record.started
      ).length,
      activeAssets: this.activeKeys.size,
      loadedAssets: this.loadedByCache.size,
      retainedAssets: this.retainKeys.size,
      knownAssets: this.assetsByKey.size,
      cancelledLoads: this.cancelledLoads,
    };
  }

  _finish(key) {
    const record = this.pending.get(key);
    if (!record?.started || this.destroyed) return;
    this.pending.delete(key);
    this.activeKeys.delete(key);
    this.loadedByCache.add(key);
    for (const callback of record.ready) callback(record.asset);
    this._pump();
  }

  _handleLoadError(file) {
    const key = file?.key;
    const record = this.pending.get(key);
    if (!record?.started || record.coordinated) return;
    this.scene.load.off(record.eventName, record.complete);
    this._fail(key, file);
  }

  _fail(key, error) {
    const record = this.pending.get(key);
    if (!record) return;
    this.pending.delete(key);
    this.activeKeys.delete(key);
    console.error(`[WorldVisualAssetCache] Failed to stream ${key}`);
    for (const callback of record.error) callback(record.asset, error);
    this._pump();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.load.off("loaderror", this._handleLoadError);
    this.scene.load.off(this.schedulerConfig.loaderCompleteEvent, this._handleLoaderComplete);
    for (const record of this.pending.values()) {
      if (record.coordinated) record.coordinatorHandle?.cancel?.();
      else if (record.started) this.scene.load.off(record.eventName, record.complete);
    }
    this.pending.clear();
    this.waiting.length = 0;
    this.activeKeys.clear();
    for (const key of this.loadedByCache) this.release(key);
    this.loadedByCache.clear();
    this.assetsByKey.clear();
  }
}
