import {
  RUNTIME_ASSET_LOADING,
  resolveRuntimeFeatureAssetDeferralEnabled,
} from "../../values/runtimeAssetLoading.js";
import { getRuntimeFeatureAssetGroup } from "./runtimeFeatureAssetGroups.js";
import {
  getRuntimeFeatureGroupProgress,
  getRuntimeFeatureManagerSnapshot,
} from "./runtimeFeatureAssetProgress.js";
import { RuntimeAssetPressureGate } from "./RuntimeAssetPressureGate.js";
import { RuntimeFeatureResidency } from "./RuntimeFeatureResidency.js";

function defaultNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}

export class RuntimeFeatureAssetManager {
  constructor(
    scene,
    config = RUNTIME_ASSET_LOADING,
    search = globalThis.location?.search || "",
    dependencies = {},
  ) {
    this.scene = scene;
    this.config = config;
    this.enabled = resolveRuntimeFeatureAssetDeferralEnabled(config, search);
    this.coordinator = scene.runtimeAssetLoadCoordinator?.enabled
      ? scene.runtimeAssetLoadCoordinator
      : null;
    this.now = dependencies.now || defaultNow;
    this.setTimer = dependencies.setTimer || globalThis.setTimeout?.bind(globalThis);
    this.clearTimer = dependencies.clearTimer || globalThis.clearTimeout?.bind(globalThis);
    this.records = new Map();
    this.destroyed = false;
    this.evictions = 0;
    this.failedGroups = 0;
    this.cancelledGroups = 0;
    this.residency = new RuntimeFeatureResidency(
      scene,
      this.coordinator,
      this.records,
      () => { this.evictions += 1; },
    );
    this.pressureGate = new RuntimeAssetPressureGate({
      memory: this.coordinator?.textureMemory,
      trim: () => this.trimToBudget(),
      now: this.now,
      setTimer: this.setTimer,
      clearTimer: this.clearTimer,
      config: this.config.featureResidency,
    });
  }

  isReady(groupId) {
    const definition = getRuntimeFeatureAssetGroup(groupId, this.config);
    return Boolean(definition?.assets.length)
      && definition.assets.every(asset => this._exists(asset));
  }

  ensureGroup(groupId, { consumer = null, adoptExisting = false } = {}) {
    if (!this.enabled || this.destroyed) {
      return Promise.resolve({
        groupId,
        ready: this.isReady(groupId),
        deferred: false,
      });
    }
    const record = this._getRecord(groupId);
    if (!record || !this.coordinator) {
      return Promise.resolve({ groupId, ready: false, unavailable: true });
    }
    if (consumer) record.consumers.add(consumer);
    record.lastUsedAtMs = this.now();
    this._clearReleaseTimer(record);

    if (this.isReady(groupId)) {
      record.status = "ready";
      if (adoptExisting) this.residency.adoptExistingTextures(record, this.config.types.image);
      for (const asset of record.definition.assets) {
        this.coordinator.textureMemory?.touch?.(asset.key);
      }
      return Promise.resolve(this._result(record, true));
    }
    if (["loading", "deferred"].includes(record.status) && record.promise) return record.promise;
    return this._startOrDefer(record);
  }

  releaseGroup(groupId, consumer = null) {
    const record = this.records.get(groupId);
    if (!record) return false;
    if (consumer) record.consumers.delete(consumer);
    else record.consumers.clear();
    record.lastUsedAtMs = this.now();
    if (record.consumers.size > 0 || !record.definition.releaseWhenUnused) {
      return false;
    }
    if (["loading", "deferred"].includes(record.status)) {
      this._cancel(record);
      return true;
    }
    if (record.status !== "ready") return false;
    const release = () => {
      record.releaseTimer = null;
      if (record.consumers.size === 0) this._evict(record);
    };
    if (this.setTimer && this.config.featureResidency.releaseDelayMs > 0) {
      record.releaseTimer = this.setTimer(
        release,
        this.config.featureResidency.releaseDelayMs,
      );
    } else {
      release();
    }
    return true;
  }

  trimToBudget() {
    return this.residency.trimToBudget();
  }

  getGroupProgress(groupId) {
    return getRuntimeFeatureGroupProgress(this, groupId);
  }

  getSnapshot() {
    return getRuntimeFeatureManagerSnapshot(this);
  }

  _getRecord(groupId) {
    if (this.records.has(groupId)) return this.records.get(groupId);
    const definition = getRuntimeFeatureAssetGroup(groupId, this.config);
    if (!definition?.assets.length) return null;
    const record = {
      definition,
      status: "idle",
      consumers: new Set(),
      handles: new Set(),
      loadedKeys: new Set(),
      pendingAssets: 0,
      promise: null,
      settle: null,
      releaseTimer: null,
      pressureTimer: null,
      deferredAtMs: null,
      lastUsedAtMs: this.now(),
    };
    this.records.set(groupId, record);
    return record;
  }

  _startOrDefer(record) {
    const promise = new Promise(resolve => { record.settle = resolve; });
    record.promise = promise;
    const deferred = this.pressureGate.begin(record, {
      ready: () => this._start(record),
      timeout: () => this._timeout(record),
    });
    if (!deferred) this._start(record);
    return promise;
  }

  _start(record) {
    record.status = "loading";
    const missing = record.definition.assets.filter(asset => !this._exists(asset));
    record.pendingAssets = missing.length;
    const promise = record.promise;
    if (missing.length === 0) {
      this._complete(record);
      return promise;
    }

    for (const asset of missing) {
      const handle = this.coordinator.request(asset, {
        owner: record.definition.owner,
        priority: record.definition.priority,
        capability: record.definition.capability,
        residencyClass: record.definition.residencyClass,
        packId: record.definition.id,
        consumers: [...record.consumers],
        onReady: () => this._assetReady(record, asset),
        onError: (_failedAsset, error) => this._fail(record, error),
      });
      if (handle && record.status === "loading") record.handles.add(handle);
      else {
        this._fail(record, new Error(`Feature asset queue unavailable: ${asset.key}`));
        break;
      }
    }
    return promise;
  }

  _timeout(record) {
    if (record.status !== "deferred") return;
    record.status = "idle";
    record.pressureTimer = null;
    const settle = record.settle;
    record.settle = null;
    record.promise = null;
    settle?.({ ...this._result(record, false), timedOut: true, memoryDeferred: true });
  }

  _assetReady(record, asset) {
    if (record.status !== "loading") return;
    record.loadedKeys.add(asset.key);
    record.pendingAssets = Math.max(0, record.pendingAssets - 1);
    if (record.pendingAssets === 0) this._complete(record);
  }

  _complete(record) {
    record.status = "ready";
    record.pendingAssets = 0;
    record.handles.clear();
    const settle = record.settle;
    record.settle = null;
    record.promise = null;
    settle?.(this._result(record, true));
    this.trimToBudget();
  }

  _fail(record, error) {
    if (record.status !== "loading") return;
    record.status = "failed";
    record.error = error;
    this.failedGroups += 1;
    for (const handle of record.handles) handle.cancel?.();
    record.handles.clear();
    record.pendingAssets = 0;
    this.residency.removeManagedTextures(record);
    const settle = record.settle;
    record.settle = null;
    record.promise = null;
    settle?.({ ...this._result(record, false), error });
  }

  _cancel(record) {
    if (!["loading", "deferred"].includes(record.status)) return false;
    this.pressureGate.cancel(record);
    for (const handle of record.handles) handle.cancel?.();
    record.handles.clear();
    record.pendingAssets = 0;
    record.status = "idle";
    this.cancelledGroups += 1;
    this.residency.removeManagedTextures(record);
    const settle = record.settle;
    record.settle = null;
    record.promise = null;
    settle?.({ ...this._result(record, false), cancelled: true });
    return true;
  }

  _evict(record) {
    this._clearReleaseTimer(record);
    return this.residency.evict(record);
  }

  _clearReleaseTimer(record) {
    if (record.releaseTimer === null) return;
    this.clearTimer?.(record.releaseTimer);
    record.releaseTimer = null;
  }

  _exists(asset) {
    return Boolean(this.scene?.textures?.exists?.(asset.key));
  }

  _result(record, ready) {
    return {
      groupId: record.definition.id,
      ready,
      deferred: true,
      assetCount: record.definition.assets.length,
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const record of this.records.values()) {
      this._clearReleaseTimer(record);
      if (["loading", "deferred"].includes(record.status)) this._cancel(record);
      record.consumers.clear();
      this.residency.removeManagedTextures(record);
    }
    this.records.clear();
    this.scene = null;
    this.coordinator = null;
  }
}
