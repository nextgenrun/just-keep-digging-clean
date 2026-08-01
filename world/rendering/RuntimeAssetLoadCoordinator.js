import {
  RUNTIME_ASSET_LOADING,
  resolveRuntimeAssetBitmapDecodeEnabled,
  resolveRuntimeAssetQueueEnabled,
} from "../../values/runtimeAssetLoading.js";
import { RuntimeAssetActivationScheduler } from "./RuntimeAssetActivationScheduler.js";
import { RuntimeAssetLoadMetrics } from "./RuntimeAssetLoadMetrics.js";
import { RuntimeTextureMemoryTracker } from "./RuntimeTextureMemoryTracker.js";

function defaultNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}
export class RuntimeAssetLoadCoordinator {
  constructor(
    scene,
    config = RUNTIME_ASSET_LOADING,
    search = globalThis.location?.search || "",
    dependencies = {}
  ) {
    this.scene = scene;
    this.config = config;
    this.enabled = resolveRuntimeAssetQueueEnabled(config, search);
    this.fetchAsset = dependencies.fetchAsset
      || (typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : null);
    this.decodeBitmap = dependencies.decodeBitmap
      || (typeof globalThis.createImageBitmap === "function"
        ? globalThis.createImageBitmap.bind(globalThis)
        : null);
    this.now = dependencies.now || defaultNow;
    this.bitmapDecodeEnabled = (
      this.enabled
      && resolveRuntimeAssetBitmapDecodeEnabled(config, search)
      && Boolean(this.fetchAsset && this.decodeBitmap && scene.textures?.addImage)
    );
    this.records = new Map();
    this.queue = [];
    this.activeRecords = new Set();
    this.sequence = 0;
    this.subscriberSequence = 0;
    this.destroyed = false;
    this.pumpScheduled = false;
    this.bitmapSources = new Map();
    this.scheduler = new RuntimeAssetActivationScheduler(scene, config, dependencies);
    this.metrics = new RuntimeAssetLoadMetrics(config, this.now);
    this.textureMemory = new RuntimeTextureMemoryTracker(scene, config, this.now);
  }
  request(asset, {
    owner = this.config.owners.default,
    priority = this.config.priorities.default,
    videoNoAudio = true,
    onStart = null,
    onReady = null,
    onError = null,
  } = {}) {
    if (!this.enabled || this.destroyed || !asset?.key || !asset?.path) return null;
    const type = asset.type === this.config.types.video
      ? this.config.types.video
      : asset.type === this.config.types.audio
        ? this.config.types.audio
        : this.config.types.image;
    if (this._assetExists(asset, type)) {
      if (type === this.config.types.image) this._registerTexture({ asset, type, owner }, false);
      onStart?.(asset);
      onReady?.(asset);
      return { cancel: () => false };
    }

    const id = `${type}:${asset.key}`;
    let record = this.records.get(id);
    if (!record) {
      record = {
        id,
        asset,
        type,
        owner,
        priority,
        videoNoAudio,
        sequence: this.sequence += 1,
        subscribers: new Map(),
        startedAtMs: null,
        decodeMs: null,
        activationMs: null,
        backend: null,
        abortController: null,
        loaderComplete: null,
        loaderError: null,
      };
      this.records.set(id, record);
      this.queue.push(record);
    } else {
      this.metrics.deduplicated += 1;
      record.priority = Math.max(record.priority, priority);
    }

    const subscriberId = this.subscriberSequence += 1;
    record.subscribers.set(subscriberId, { onStart, onReady, onError });
    this._sortQueue();
    this.metrics.recordQueueDepth(this.queue.length);
    this._pump();
    return {
      cancel: () => this._cancelSubscriber(record, subscriberId),
    };
  }
  _sortQueue() {
    this.queue.sort((left, right) => (
      right.priority - left.priority || left.sequence - right.sequence
    ));
  }
  _cancelSubscriber(record, subscriberId) {
    if (!record?.subscribers.delete(subscriberId)) return false;
    if (record.subscribers.size > 0) return true;
    this.metrics.cancelled += 1;
    if (!this.activeRecords.has(record)) {
      this.queue = this.queue.filter(candidate => candidate !== record);
      this.records.delete(record.id);
    }
    return true;
  }
  _getMaxConcurrentLoads() {
    return Math.max(
      1,
      Math.trunc(Number(this.config.scheduling.maxConcurrentLoads) || 1)
    );
  }
  _pump() {
    if (!this.enabled || this.destroyed || this.pumpScheduled) return;
    const maximum = this._getMaxConcurrentLoads();
    while (this.activeRecords.size < maximum) {
      let record = this.queue.shift();
      while (record && record.subscribers.size === 0) {
        this.records.delete(record.id);
        record = this.queue.shift();
      }
      if (!record) return;
      this.activeRecords.add(record);
      record.startedAtMs = this.now();
      record.backend = this.bitmapDecodeEnabled && record.type === this.config.types.image
        ? "bitmap"
        : "phaser";
      this.metrics.started += 1;
      for (const subscriber of record.subscribers.values()) {
        subscriber.onStart?.(record.asset);
      }
      if (record.backend === "bitmap") {
        this._loadBitmap(record);
      } else {
        this._loadWithPhaser(record);
      }
    }
  }
  async _loadBitmap(record) {
    let bitmap = null;
    try {
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      record.abortController = controller;
      const response = await this.fetchAsset(record.asset.path, {
        cache: this.config.bitmapDecode.fetchCache,
        credentials: this.config.bitmapDecode.fetchCredentials,
        signal: controller?.signal,
      });
      if (response?.ok === false || typeof response?.blob !== "function") {
        throw new Error(`Asset fetch failed: ${record.asset.key}`);
      }
      const blob = await response.blob();
      const decodeStartedAtMs = this.now();
      bitmap = await this.decodeBitmap(blob, this.config.bitmapDecode.options);
      record.decodeMs = Math.max(0, this.now() - decodeStartedAtMs);
      if (!this._isCurrent(record) || record.subscribers.size === 0) {
        bitmap?.close?.();
        this._finish(record, null, true);
        return;
      }
      await this.scheduler.waitForActivationWindow();
      if (!this._isCurrent(record) || record.subscribers.size === 0) {
        bitmap?.close?.();
        this._finish(record, null, true);
        return;
      }
      if (this._assetExists(record.asset, record.type)) {
        bitmap?.close?.();
        this._finish(record);
        return;
      }
      const activationStartedAtMs = this.now();
      const texture = this.scene.textures.addImage(record.asset.key, bitmap);
      record.activationMs = Math.max(0, this.now() - activationStartedAtMs);
      if (!texture && !this._assetExists(record.asset, record.type)) {
        throw new Error(`Texture activation failed: ${record.asset.key}`);
      }
      record.width = bitmap.width;
      record.height = bitmap.height;
      this.bitmapSources.set(record.asset.key, bitmap);
      bitmap = null;
      this._finish(record);
    } catch (error) {
      bitmap?.close?.();
      if (!this._isCurrent(record) || this.destroyed) return;
      this.metrics.bitmapFallbacks += 1;
      record.backend = "phaser-fallback";
      this._loadWithPhaser(record, error);
    }
  }
  async _loadWithPhaser(record, bitmapError = null) {
    try {
      if (record.type === this.config.types.audio) {
        await this.scheduler.waitForActivationWindow();
      } else {
        await this.scheduler.waitForLoaderIdle();
      }
      if (!this._isCurrent(record) || record.subscribers.size === 0) {
        this._finish(record, null, true);
        return;
      }
      if (this._assetExists(record.asset, record.type)) {
        this._finish(record);
        return;
      }
      const loader = this.scene.load;
      if (!loader) {
        throw bitmapError || new Error(`Loader unavailable: ${record.asset.key}`);
      }
      const eventName = `filecomplete-${record.type}-${record.asset.key}`;
      record.loaderComplete = () => {
        this._clearLoaderListeners(record, eventName);
        if (this._assetExists(record.asset, record.type)) this._finish(record);
        else this._finish(record, new Error(`Asset was not cached: ${record.asset.key}`));
      };
      record.loaderError = file => {
        if (file?.key !== record.asset.key) return;
        this._clearLoaderListeners(record, eventName);
        this._finish(record, file || bitmapError || new Error(`Asset failed: ${record.asset.key}`));
      };
      loader.once?.(eventName, record.loaderComplete);
      loader.on?.(this.config.phaserLoader.errorEvent, record.loaderError);
      if (record.type === this.config.types.video) {
        loader.video?.(record.asset.key, record.asset.path, record.videoNoAudio);
      } else if (record.type === this.config.types.audio) {
        loader.audio?.(record.asset.key, record.asset.path);
      } else {
        loader.image?.(record.asset.key, record.asset.path);
      }
      if (!loader.isLoading?.()) loader.start?.();
    } catch (error) {
      if (this._isCurrent(record)) this._finish(record, error);
    }
  }
  _clearLoaderListeners(record, eventName) {
    const loader = this.scene.load;
    loader?.off?.(eventName, record.loaderComplete);
    loader?.off?.(this.config.phaserLoader.errorEvent, record.loaderError);
    record.loaderComplete = null;
    record.loaderError = null;
  }
  _finish(record, error = null, cancelled = false) {
    if (!record || (!this._isCurrent(record) && !this.records.has(record.id))) return;
    const eventName = `filecomplete-${record.type}-${record.asset.key}`;
    this._clearLoaderListeners(record, eventName);
    record.abortController = null;
    this.records.delete(record.id);
    this.activeRecords.delete(record);
    this.metrics.recordCompletion(record, error, cancelled);
    if (!error && !cancelled) {
      this._registerTexture(record, true);
    }
    for (const subscriber of record.subscribers.values()) {
      if (cancelled) continue;
      if (error) subscriber.onError?.(record.asset, error);
      else subscriber.onReady?.(record.asset);
    }
    record.subscribers.clear();
    this._deferPump();
  }
  _deferPump() {
    if (this.destroyed || this.pumpScheduled || this.queue.length === 0) return;
    this.pumpScheduled = true;
    this.scheduler.defer(() => {
      this.pumpScheduled = false;
      this._pump();
    });
  }

  _assetExists(asset, type) {
    if (type === this.config.types.video) {
      return Boolean(this.scene.cache?.video?.exists?.(asset.key));
    }
    if (type === this.config.types.audio) {
      return Boolean(this.scene.cache?.audio?.exists?.(asset.key));
    }
    return Boolean(this.scene.textures?.exists?.(asset.key));
  }

  _isCurrent(record) {
    return !this.destroyed
      && this.activeRecords.has(record)
      && this.records.get(record.id) === record;
  }

  releaseDecodedSource(key) {
    if (this.scene.textures?.exists?.(key)) return false;
    const bitmap = this.bitmapSources.get(key);
    const tracked = this.textureMemory.release(key);
    bitmap?.close?.();
    if (bitmap) this.bitmapSources.delete(key);
    return Boolean(bitmap || tracked);
  }

  _registerTexture(record, managed = true) {
    if (record?.type !== this.config.types.image) return false;
    const texture = this.scene.textures?.get?.(record.asset.key);
    const source = texture?.source?.[0]?.image
      || texture?.getSourceImage?.()
      || null;
    const width = Number(record.width || source?.width || source?.naturalWidth || 0);
    const height = Number(record.height || source?.height || source?.naturalHeight || 0);
    return this.textureMemory.register(record.asset.key, {
      owner: record.owner,
      width,
      height,
      managed,
    });
  }

  getSnapshot() {
    return this.metrics.snapshot({
      schemaVersion: this.config.schemaVersion,
      enabled: this.enabled,
      bitmapDecodeEnabled: this.bitmapDecodeEnabled,
      queue: this.queue,
      active: [...this.activeRecords],
      decodedSources: this.bitmapSources.size,
      textureMemory: this.textureMemory.sample(),
      externalLoaderWaits: this.scheduler.externalLoaderWaits,
    });
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const record of this.activeRecords) {
      record.abortController?.abort?.();
      const eventName = `filecomplete-${record.type}-${record.asset.key}`;
      this._clearLoaderListeners(record, eventName);
    }
    this.scheduler.destroy();
    this.queue.length = 0;
    this.records.clear();
    this.activeRecords.clear();
  }
}
