import {
  INTERACTIVE_WORLD_STATES,
  getInteractiveWorldStateFrameName,
} from "../../values/interactiveWorldStates.js";

function currentTime(scene) {
  return scene?.time?.now
    ?? globalThis.performance?.now?.()
    ?? Date.now();
}

export class InteractiveWorldStateTextureBank {
  constructor(scene, config = INTERACTIVE_WORLD_STATES) {
    this.scene = scene;
    this.config = config;
    this.records = new Map();
    this.destroyed = false;
  }

  ensure(asset, consumerId) {
    if (this.destroyed || !asset?.key || !consumerId) return false;
    const record = this._getRecord(asset);
    record.consumers.add(consumerId);
    record.unusedSinceMs = null;

    if (this.scene.textures?.exists?.(asset.key)) {
      if (record.status !== "ready") {
        record.status = "ready";
        this._prepareFrames(asset.key);
      }
      this.scene.runtimeAssetLoadCoordinator?.textureMemory?.touch?.(asset.key);
      return true;
    }
    if (record.status === "loading" || record.status === "failed") return false;

    const coordinator = this.scene.runtimeAssetLoadCoordinator;
    if (!coordinator?.enabled) {
      record.status = "unavailable";
      return false;
    }

    record.status = "loading";
    record.managed = true;
    record.handle = coordinator.request(asset, {
      owner: this.config.streaming.owner,
      priority: this.config.streaming.priority,
      onReady: () => this._onReady(record),
      onError: (_failedAsset, error) => this._onError(record, error),
    });
    if (!record.handle) record.status = "unavailable";
    return false;
  }

  isReady(assetKey) {
    return Boolean(
      assetKey
      && this.scene?.textures?.exists?.(assetKey)
      && this.records.get(assetKey)?.status === "ready"
    );
  }

  release(assetKey, consumerId) {
    const record = this.records.get(assetKey);
    if (!record || !consumerId) return false;
    const removed = record.consumers.delete(consumerId);
    if (record.consumers.size === 0 && record.unusedSinceMs === null) {
      record.unusedSinceMs = currentTime(this.scene);
    }
    return removed;
  }

  update(nowMs = currentTime(this.scene)) {
    if (this.destroyed) return;
    for (const record of this.records.values()) {
      if (
        record.status === "ready"
        && record.consumers.size === 0
        && record.unusedSinceMs !== null
        && nowMs - record.unusedSinceMs >= this.config.streaming.releaseDelayMs
      ) {
        this._evict(record);
      }
    }
  }

  getSnapshot() {
    const records = [...this.records.values()].map(record => ({
      key: record.asset.key,
      status: record.status,
      consumers: record.consumers.size,
      managed: record.managed,
    }));
    return {
      ready: records.filter(record => record.status === "ready").length,
      loading: records.filter(record => record.status === "loading").length,
      records,
    };
  }

  _getRecord(asset) {
    let record = this.records.get(asset.key);
    if (record) return record;
    const alreadyPresent = Boolean(this.scene.textures?.exists?.(asset.key));
    record = {
      asset,
      status: alreadyPresent ? "ready" : "idle",
      managed: false,
      consumers: new Set(),
      unusedSinceMs: null,
      handle: null,
      error: null,
    };
    this.records.set(asset.key, record);
    if (alreadyPresent) this._prepareFrames(asset.key);
    return record;
  }

  _onReady(record) {
    if (this.destroyed) return;
    record.handle = null;
    record.status = "ready";
    record.error = null;
    this._prepareFrames(record.asset.key);
    if (record.consumers.size === 0) {
      record.unusedSinceMs = currentTime(this.scene);
    }
  }

  _onError(record, error) {
    if (this.destroyed) return;
    record.handle = null;
    record.status = "failed";
    record.error = error;
    console.warn(
      `[InteractiveWorldStateTextureBank] Failed to load ${record.asset.key}`,
      error,
    );
  }

  _prepareFrames(textureKey) {
    const texture = this.scene.textures?.get?.(textureKey);
    if (!texture?.add) return false;
    const atlas = this.config.atlas;
    const filterMode = globalThis.Phaser?.Textures?.FilterMode?.[atlas.textureFilter];
    if (filterMode !== undefined) texture.setFilter?.(filterMode);

    for (let index = 0; index < atlas.frameCount; index += 1) {
      const frameName = getInteractiveWorldStateFrameName(index);
      if (texture.has?.(frameName) || texture.frames?.[frameName]) continue;
      const column = index % atlas.columns;
      const row = Math.floor(index / atlas.columns);
      texture.add(
        frameName,
        0,
        column * atlas.frameWidthPx,
        row * atlas.frameHeightPx,
        atlas.frameWidthPx,
        atlas.frameHeightPx,
      );
    }
    return true;
  }

  _evict(record) {
    if (record.consumers.size > 0) return false;
    if (record.managed && this.scene.textures?.exists?.(record.asset.key)) {
      this.scene.textures.remove(record.asset.key);
      this.scene.runtimeAssetLoadCoordinator?.releaseDecodedSource?.(
        record.asset.key,
      );
    }
    record.status = "idle";
    record.managed = false;
    record.unusedSinceMs = null;
    return true;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const record of this.records.values()) {
      record.handle?.cancel?.();
      record.consumers.clear();
      this._evict(record);
    }
    this.records.clear();
    this.scene = null;
  }
}
