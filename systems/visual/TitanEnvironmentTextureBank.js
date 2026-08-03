import { RUNTIME_ASSET_LOADING } from "../../values/runtimeAssetLoading.js";
import { TitanChamberTextureReleases } from "./TitanChamberTextureReleases.js";

export class TitanEnvironmentTextureBank {
  constructor(
    scene,
    {
      onAssetReady = null,
      onChanged = null,
    } = {}
  ) {
    this.scene = scene;
    this.onAssetReady = onAssetReady;
    this.onChanged = onChanged;
    this.states = new Map();
    this.pending = new Map();
    this.failedAssets = new Set();
    this.loadedByStream = new Set();
    this.destroyed = false;
    this.assetCoordinator = scene.runtimeAssetLoadCoordinator?.enabled
      ? scene.runtimeAssetLoadCoordinator
      : null;
    this.releases = new TitanChamberTextureReleases(scene, {
      canRelease: state => this._canRelease(state),
      release: state => this._release(state),
      onChanged: () => this._notifyChanged(),
    });
    this._handleLoadError = this._handleLoadError.bind(this);
    scene.load?.on?.("loaderror", this._handleLoadError);
  }

  register(asset) {
    if (!this.states.has(asset.key)) {
      this.states.set(asset.key, {
        asset,
        desiredCount: 0,
        layerCount: 0,
      });
    }
    return this.states.get(asset.key);
  }

  beginSync() {
    for (const state of this.states.values()) state.desiredCount = 0;
  }

  request(asset) {
    const state = this.register(asset);
    state.desiredCount += 1;
    this._ensure(state);
    return this.has(asset.key);
  }

  endSync() {
    for (const state of this.states.values()) {
      if (state.desiredCount === 0) this._releaseIfUnused(state);
    }
  }

  addLayer(key) {
    const state = this.states.get(key);
    if (state) state.layerCount += 1;
  }

  removeLayer(key) {
    const state = this.states.get(key);
    if (state) state.layerCount = Math.max(0, state.layerCount - 1);
  }

  has(key) {
    return Boolean(key && this.scene.textures?.exists?.(key));
  }

  _ensure(state) {
    this.releases.cancel(state);
    const { asset } = state;
    if (
      this.has(asset.key)
      || this.pending.has(asset.key)
      || this.failedAssets.has(asset.key)
      || !this.scene.load?.image
    ) {
      return this.has(asset.key);
    }
    if (this.assetCoordinator) {
      const pending = { state, coordinated: true, handle: null };
      this.pending.set(asset.key, pending);
      pending.handle = this.assetCoordinator.request(asset, {
        owner: RUNTIME_ASSET_LOADING.owners.titanEnvironment,
        priority: RUNTIME_ASSET_LOADING.priorities.titanEnvironment,
        onReady: () => this._finish(state),
        onError: () => {
          if (this.pending.get(asset.key) !== pending) return;
          this.pending.delete(asset.key);
          this._fail(state);
        },
      });
      if (pending.handle) {
        this._notifyChanged();
        return false;
      }
      this.pending.delete(asset.key);
    }
    const eventName = `filecomplete-image-${asset.key}`;
    const complete = () => this._finish(state, eventName);
    this.pending.set(asset.key, { state, eventName, complete });
    this.scene.load.once(eventName, complete);
    this.scene.load.image(asset.key, asset.path);
    if (!this.scene.load.isLoading?.()) this.scene.load.start?.();
    this._notifyChanged();
    return false;
  }

  _finish(state, eventName = null) {
    const key = state.asset.key;
    const pending = this.pending.get(key);
    if (pending && !pending.coordinated && eventName) {
      this.scene.load?.off?.(eventName, pending.complete);
    }
    this.pending.delete(key);
    if (!this.has(key)) {
      this._fail(state);
      return;
    }
    this.loadedByStream.add(key);
    this.onAssetReady?.(state.asset);
    this._releaseIfUnused(state);
    this._notifyChanged();
  }

  _handleLoadError(file) {
    const pending = this.pending.get(file?.key);
    if (!pending || pending.coordinated) return;
    this.scene.load?.off?.(pending.eventName, pending.complete);
    this.pending.delete(file.key);
    this._fail(pending.state);
  }

  _fail(state) {
    this.failedAssets.add(state.asset.key);
    this._notifyChanged();
  }

  _releaseIfUnused(state) {
    const key = state.asset.key;
    const pending = this.pending.get(key);
    if (state.desiredCount > 0) {
      this.releases.cancel(state);
      return false;
    }
    if (pending?.coordinated) {
      pending.handle?.cancel?.();
      this.pending.delete(key);
      this._notifyChanged();
      return true;
    }
    if (
      pending
      || state.layerCount > 0
      || !this.loadedByStream.has(key)
      || !this.has(key)
    ) {
      return false;
    }
    return this.releases.schedule(state);
  }

  _canRelease(state) {
    const key = state.asset.key;
    return !this.destroyed
      && state.desiredCount === 0
      && state.layerCount === 0
      && !this.pending.has(key)
      && this.loadedByStream.has(key)
      && !this._isWorldRuntimeUsing(key);
  }

  _release(state) {
    const key = state.asset.key;
    if (this._isWorldRuntimeUsing(key)) return false;
    if (this.has(key)) this.scene.textures.remove?.(key);
    this.assetCoordinator?.releaseDecodedSource?.(key);
    this.loadedByStream.delete(key);
    return true;
  }

  _isWorldRuntimeUsing(key) {
    const layers = [
      this.scene.worldRenderer?.backdropEnhancerLayer,
      this.scene.worldVisualRuntime?.backdropEnhancerLayer,
      this.scene.worldRenderer?.worldVisualRuntime?.backdropEnhancerLayer,
    ];
    return layers.some(layer => layer?.activeAssetKeys?.has?.(key));
  }

  _notifyChanged() {
    this.onChanged?.();
  }

  getSnapshot() {
    return {
      pending: this.pending.size,
      releasePending: this.releases.size,
      loaded: this.loadedByStream.size,
      failedAssets: [...this.failedAssets],
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.load?.off?.("loaderror", this._handleLoadError);
    for (const pending of this.pending.values()) {
      if (pending.coordinated) pending.handle?.cancel?.();
      else this.scene.load?.off?.(pending.eventName, pending.complete);
    }
    this.pending.clear();
    this.releases.destroy();
    for (const state of this.states.values()) {
      if (this.loadedByStream.has(state.asset.key)) this._release(state);
    }
    this.loadedByStream.clear();
    this.failedAssets.clear();
    this.states.clear();
    this.assetCoordinator = null;
  }
}

