import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  getWorldVisualDepthBackdropPreloadAssets,
  isWorldVisualDepthBackdropRegionReady,
  resolveWorldVisualDepthBackdropRegions,
  resolveWorldVisualDepthBackdropsEnabled,
} from "../../../values/worldVisualDepthBackdrops.js";
import { WorldVisualAssetCache } from "./WorldVisualAssetCache.js";
import { WorldVisualDepthBackdropRegionView } from "./WorldVisualDepthBackdropRegionView.js";

export class WorldVisualDepthBackdropStage {
  constructor(
    scene,
    config = WORLD_VISUAL_DEPTH_BACKDROPS,
    search = globalThis.location?.search || ""
  ) {
    this.scene = scene;
    this.config = config;
    this.search = search;
    this.enabled = resolveWorldVisualDepthBackdropsEnabled(config, search);
    this.regionViews = new Map();
    this.activeRegionIds = new Set();
    this.activeAssetKeys = new Set();
    this.pendingAssetKeys = new Set();
    this.activeBounds = null;
    this.lastLighting = null;
    this.assetCache = null;
  }

  get segments() {
    const segments = new Map();
    for (const [regionId, view] of this.regionViews) {
      for (const [segmentId, segment] of view.segments) {
        segments.set(`${regionId}:${segmentId}`, segment);
      }
    }
    return segments;
  }

  create() {
    if (!this.enabled) return false;
    if (!this.scene.textures.exists(this.config.assets.mist.key)) {
      throw new Error(`[WorldVisualDepthBackdropStage] Shared texture was not preloaded: ${this.config.assets.mist.key}`);
    }
    const startupAssets = getWorldVisualDepthBackdropPreloadAssets(this.config, this.search);
    for (const asset of startupAssets) {
      if (!this.scene.textures.exists(asset.key)) {
        throw new Error(`[WorldVisualDepthBackdropStage] Startup texture was not preloaded: ${asset.key}`);
      }
    }
    this.assetCache = new WorldVisualAssetCache(this.scene, {
      retainKeys: [...startupAssets.map(asset => asset.key), this.config.assets.mist.key],
    });
    return true;
  }

  sync(bounds, lighting, force = false) {
    if (!this.enabled || !bounds) return false;
    this.activeBounds = bounds;
    this.lastLighting = lighting;
    if (force) this._destroyRegionViews();

    const regions = resolveWorldVisualDepthBackdropRegions(
      bounds.top,
      bounds.bottom,
      this.config,
      this.search
    ).filter(region => bounds.right > region.leftTile && bounds.left < region.rightTileExclusive);
    this.activeRegionIds = new Set(regions.map(region => region.id));
    this.activeAssetKeys = new Set(regions.flatMap(region => region.backwalls.map(asset => asset.key)));

    for (const region of regions) {
      if (this._isRegionReady(region)) {
        this._syncRegionView(region, bounds, lighting, force);
      } else {
        this._requestRegionAssets(region);
      }
    }
    this._pruneRegionViews();
    this._releaseUnusedAssets();
    this.update(this.scene.time?.now || 0, lighting);
    return regions.length > 0;
  }

  _isRegionReady(region) {
    return isWorldVisualDepthBackdropRegionReady(
      region,
      key => this.scene.textures.exists(key)
    );
  }

  _syncRegionView(region, bounds, lighting, force) {
    let view = this.regionViews.get(region.id);
    if (!view) {
      view = new WorldVisualDepthBackdropRegionView(this.scene, region, this.config);
      this.regionViews.set(region.id, view);
    }
    view.sync(bounds, lighting, force);
  }

  _requestRegionAssets(region) {
    for (const asset of region.backwalls) {
      if (this.scene.textures.exists(asset.key) || this.pendingAssetKeys.has(asset.key)) continue;
      this.pendingAssetKeys.add(asset.key);
      this.assetCache.ensure(asset, {
        onReady: () => {
          this.pendingAssetKeys.delete(asset.key);
          if (this.activeRegionIds.has(region.id) && this._isRegionReady(region)) {
            this._syncRegionView(region, this.activeBounds, this.lastLighting, false);
          } else if (!this.activeAssetKeys.has(asset.key)) {
            this.assetCache.release(asset.key);
          }
        },
        onError: () => this.pendingAssetKeys.delete(asset.key),
      });
    }
  }

  _pruneRegionViews() {
    for (const [regionId, view] of this.regionViews) {
      if (this.activeRegionIds.has(regionId)) continue;
      view.destroy();
      this.regionViews.delete(regionId);
    }
  }

  _releaseUnusedAssets() {
    for (const region of this.config.regions) {
      for (const asset of region.backwalls) {
        if (!this.activeAssetKeys.has(asset.key)) this.assetCache.release(asset.key);
      }
    }
  }

  update(time, lighting) {
    if (!this.enabled || !lighting) return;
    this.regionViews.forEach(view => view.update(time, lighting));
  }

  _destroyRegionViews() {
    this.regionViews.forEach(view => view.destroy());
    this.regionViews.clear();
  }

  destroy() {
    this._destroyRegionViews();
    this.assetCache?.destroy();
    this.assetCache = null;
    this.activeRegionIds.clear();
    this.activeAssetKeys.clear();
    this.pendingAssetKeys.clear();
    this.activeBounds = null;
    this.lastLighting = null;
  }
}
