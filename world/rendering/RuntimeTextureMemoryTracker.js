import { RUNTIME_ASSET_LOADING } from "../../values/runtimeAssetLoading.js";

function defaultNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function getTextureSources(texture) {
  if (Array.isArray(texture?.source) && texture.source.length > 0) {
    return texture.source;
  }
  const image = texture?.getSourceImage?.();
  return image ? [{ image }] : [];
}

function getSourceMetrics(source) {
  const image = source?.image || source;
  const width = Number(source?.width || image?.width || image?.naturalWidth || 0);
  const height = Number(source?.height || image?.height || image?.naturalHeight || 0);
  return {
    identity: image || source,
    width: Number.isFinite(width) ? Math.max(0, width) : 0,
    height: Number.isFinite(height) ? Math.max(0, height) : 0,
  };
}

export class RuntimeTextureMemoryTracker {
  constructor(scene, config = RUNTIME_ASSET_LOADING, now = defaultNow) {
    this.scene = scene;
    this.config = config.textureMemory;
    this.now = now;
    this.records = new Map();
    this.lastSampleAtMs = Number.NEGATIVE_INFINITY;
    this.cached = this._emptySnapshot();
  }

  register(key, { owner = "runtime", width = 0, height = 0, managed = true } = {}) {
    if (!key) return false;
    this.records.set(key, {
      key,
      owner,
      width: Math.max(0, Number(width) || 0),
      height: Math.max(0, Number(height) || 0),
      managed,
      lastUsedAtMs: this.now(),
    });
    return true;
  }

  touch(key) {
    const record = this.records.get(key);
    if (!record) return false;
    record.lastUsedAtMs = this.now();
    return true;
  }

  release(key) {
    return this.records.delete(key);
  }

  sample(force = false) {
    const sampledAtMs = this.now();
    if (
      !force
      && sampledAtMs - this.lastSampleAtMs < this.config.sampleIntervalMs
    ) return this.cached;

    const textureManager = this.scene?.textures;
    const keys = textureManager?.getTextureKeys?.();
    const snapshot = Array.isArray(keys)
      ? this._scanTextureManager(keys, textureManager)
      : this._scanRegisteredRecords();
    this.lastSampleAtMs = sampledAtMs;
    this.cached = Object.freeze({ ...snapshot, sampledAtMs });
    return this.cached;
  }

  _scanTextureManager(keys, textureManager) {
    const seenSources = new Set();
    const bytesByOwner = new Map();
    let estimatedBytes = 0;
    let sourceCount = 0;

    for (const key of keys) {
      const texture = textureManager.get?.(key);
      const owner = this.records.get(key)?.owner || "boot-or-untracked";
      for (const source of getTextureSources(texture)) {
        const metrics = getSourceMetrics(source);
        if (!metrics.identity || seenSources.has(metrics.identity)) continue;
        seenSources.add(metrics.identity);
        const bytes = metrics.width * metrics.height
          * this.config.estimatedBytesPerPixel;
        estimatedBytes += bytes;
        sourceCount += 1;
        bytesByOwner.set(owner, (bytesByOwner.get(owner) || 0) + bytes);
      }
    }
    return this._makeSnapshot(estimatedBytes, sourceCount, bytesByOwner);
  }

  _scanRegisteredRecords() {
    const bytesByOwner = new Map();
    let estimatedBytes = 0;
    for (const record of this.records.values()) {
      const bytes = record.width * record.height
        * this.config.estimatedBytesPerPixel;
      estimatedBytes += bytes;
      bytesByOwner.set(record.owner, (bytesByOwner.get(record.owner) || 0) + bytes);
    }
    return this._makeSnapshot(estimatedBytes, this.records.size, bytesByOwner);
  }

  _makeSnapshot(estimatedBytes, sourceCount, bytesByOwner) {
    const bytesPerMiB = this.config.bytesPerMiB;
    return {
      estimatedBytes,
      estimatedMiB: estimatedBytes / bytesPerMiB,
      highWatermarkBytes: this.config.highWatermarkBytes,
      highWatermarkMiB: this.config.highWatermarkBytes / bytesPerMiB,
      lowWatermarkBytes: this.config.lowWatermarkBytes,
      lowWatermarkMiB: this.config.lowWatermarkBytes / bytesPerMiB,
      overBudget: estimatedBytes > this.config.highWatermarkBytes,
      sourceCount,
      registeredRuntimeTextures: this.records.size,
      bytesByOwner: Object.fromEntries(bytesByOwner),
    };
  }

  _emptySnapshot() {
    return this._makeSnapshot(0, 0, new Map());
  }
}
