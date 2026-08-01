import { ASSET_KEYS } from "../values/assetKeys.js";
import {
  AUDIO_RUNTIME_LOADING,
  resolveRuntimeAudioStreamingEnabled,
} from "../values/audioConfig.js";
import { RUNTIME_ASSET_LOADING } from "../values/runtimeAssetLoading.js";
import { RuntimeAudioLoadQueue } from "./RuntimeAudioLoadQueue.js";

export class RuntimeAudioAssetManager {
  constructor(scene, config = AUDIO_RUNTIME_LOADING) {
    this.scene = scene;
    this.config = config;
    this.streamingEnabled = resolveRuntimeAudioStreamingEnabled(config);
    this.fallbackQueue = new RuntimeAudioLoadQueue(scene, config);
    this.handles = new Set();
    this.pendingKeys = new Set();
    this.musicResidentOrder = [];
    this.voiceResidentOrder = [];
    this.destroyed = false;
  }

  ensure(entry, {
    owner = RUNTIME_ASSET_LOADING.owners.audioVoice,
    priority = RUNTIME_ASSET_LOADING.priorities.audioVoice,
    onReady = null,
    onError = null,
  } = {}) {
    const asset = this._resolveEntry(entry);
    if (this.destroyed || !asset) return null;
    if (this._exists(asset.key)) {
      onReady?.(asset);
      return { cancel: () => false };
    }

    this.pendingKeys.add(asset.key);
    let handle = null;
    const finish = callback => (readyAsset, error) => {
      this.pendingKeys.delete(asset.key);
      if (handle) this.handles.delete(handle);
      callback?.(readyAsset || asset, error);
    };
    const options = {
      owner,
      priority,
      onReady: finish(onReady),
      onError: finish(onError),
    };
    const coordinator = this.scene.runtimeAssetLoadCoordinator;
    handle = coordinator?.enabled
      ? coordinator.request({ ...asset, type: RUNTIME_ASSET_LOADING.types.audio }, options)
      : this.fallbackQueue.request(asset, options);
    if (handle) this.handles.add(handle);
    return handle;
  }

  prefetchVoiceLine(library, selectedEntry) {
    if (!this.streamingEnabled || this.destroyed || !Array.isArray(library)) return null;
    const candidates = library.filter(entry => (
      entry?.key !== selectedEntry?.key
      && !this._exists(entry?.key)
      && !this.pendingKeys.has(entry?.key)
    ));
    if (candidates.length === 0) return null;
    const entry = candidates[Math.floor(Math.random() * candidates.length)];
    return this.ensure(entry, {
      owner: RUNTIME_ASSET_LOADING.owners.audioVoice,
      priority: RUNTIME_ASSET_LOADING.priorities.audioPrefetch,
      onReady: ready => this.noteVoiceUse(ready.key, selectedEntry?.key),
      onError: (_asset, error) => {
        console.warn(`[RuntimeAudioAssetManager] Voice prefetch failed: ${entry.key}`, error);
      },
    });
  }

  noteMusicUse(key, protectedKeys = []) {
    if (!this.streamingEnabled || !key) return;
    this._touch(this.musicResidentOrder, key);
    this._evict(
      this.musicResidentOrder,
      this.config.maxResidentMusicTracks,
      new Set([key, ...protectedKeys]),
    );
  }

  noteVoiceUse(key, currentKey = null) {
    if (!this.streamingEnabled || !key) return;
    this._touch(this.voiceResidentOrder, key);
    this._evict(
      this.voiceResidentOrder,
      this.config.maxResidentVoiceLines,
      new Set([key, currentKey].filter(Boolean)),
    );
  }

  trimMusic(protectedKeys = []) {
    if (!this.streamingEnabled) return;
    this._evict(
      this.musicResidentOrder,
      this.config.maxResidentMusicTracks,
      new Set(protectedKeys.filter(Boolean)),
    );
  }

  snapshot() {
    return {
      schemaVersion: this.config.schemaVersion,
      streamingEnabled: this.streamingEnabled,
      registered: Object.keys(ASSET_KEYS.audio.runtime.paths).length,
      bootQueued: ASSET_KEYS.audio.runtime.bootQueuedKeys.length,
      pending: this.pendingKeys.size,
      residentMusic: this.musicResidentOrder.length,
      residentVoices: this.voiceResidentOrder.length,
    };
  }

  _resolveEntry(entry) {
    const key = typeof entry === "string" ? entry : entry?.key;
    if (!key) return null;
    const fallbackPath = typeof entry === "string" ? "" : entry?.path;
    const path = ASSET_KEYS.audio.runtime.paths[key] || fallbackPath;
    return path ? { key, path } : null;
  }

  _exists(key) {
    return Boolean(key && this.scene.cache?.audio?.exists?.(key));
  }

  _touch(order, key) {
    const index = order.indexOf(key);
    if (index >= 0) order.splice(index, 1);
    order.push(key);
  }

  _evict(order, limit, protectedKeys) {
    let cursor = 0;
    while (order.length > limit && cursor < order.length) {
      const key = order[cursor];
      if (protectedKeys.has(key) || this.pendingKeys.has(key)) {
        cursor += 1;
        continue;
      }
      order.splice(cursor, 1);
      if (this._exists(key)) this.scene.cache.audio.remove?.(key);
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const handle of this.handles) handle.cancel?.();
    this.handles.clear();
    this.pendingKeys.clear();
    this.fallbackQueue.destroy();
  }
}
