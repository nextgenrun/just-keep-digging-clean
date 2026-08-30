import {
  WORLD_VISUAL_GROUND_STRUCTURES,
  getWorldVisualGroundStructureRuntimeAssets,
  isWorldVisualGroundStructureRegionReady,
  resolveWorldVisualGroundStructureRuntimeRegions,
  resolveWorldVisualGroundStructuresEnabled,
} from "../../../values/worldVisualGroundStructures.js?rev=20260729-underground-seam-v6";
import {
  WORLD_VISUAL_RUNTIME,
  resolveScenicDemandAssetStreamingEnabled,
} from "../../../values/worldVisualRuntime.js?rev=20260826-surface-motion-v2";
import { RUNTIME_ASSET_LOADING } from "../../../values/runtimeAssetLoading.js";
import { WorldVisualAssetCache } from "./WorldVisualAssetCache.js";
import { WorldVisualGroundStructureRegionView } from
  "./WorldVisualGroundStructureRegionView.js?rev=20260729-native-density-v14";

function regionAssets(region) {
  const sourceRegions = region.biomeFieldRegionsById
    ? Object.values(region.biomeFieldRegionsById)
    : [region];
  const assets = new Map();
  sourceRegions.forEach(sourceRegion => {
    sourceRegion.assets.forEach(asset => assets.set(asset.key, asset));
  });
  return [...assets.values()];
}

export class WorldVisualGroundStructureLayer {
  constructor(
    scene,
    terrainMask,
    config = WORLD_VISUAL_GROUND_STRUCTURES,
    search = globalThis.location?.search || ""
  ) {
    this.scene = scene;
    this.terrainMask = terrainMask;
    this.config = config;
    this.search = search;
    this.enabled = resolveWorldVisualGroundStructuresEnabled(config, search);
    this.demandStreamingConfig = WORLD_VISUAL_RUNTIME.streaming.demandAssetStreaming;
    this.demandStreamingEnabled = resolveScenicDemandAssetStreamingEnabled(
      this.demandStreamingConfig,
      search
    );
    this.regionViews = new Map();
    this.activeRegionIds = new Set();
    this.activeAssetKeys = new Set();
    this.pendingAssetKeys = new Set();
    this.activeBounds = null;
    this.lastLighting = null;
    this.assetCache = null;
  }

  create() {
    if (!this.enabled || !this.terrainMask) return false;
    this.assetCache = new WorldVisualAssetCache(this.scene, {
      owner: RUNTIME_ASSET_LOADING.owners.groundStructure,
      priority: RUNTIME_ASSET_LOADING.priorities.groundStructure,
    });
    return true;
  }

  sync(bounds, lighting, force = false) {
    if (!this.enabled || !bounds) return false;
    this.activeBounds = bounds;
    this.lastLighting = lighting;
    if (force) this._destroyRegionViews();

    const regions = resolveWorldVisualGroundStructureRuntimeRegions(
      bounds.top,
      bounds.bottom,
      this.config,
      this.search
    ).filter(region => (
      bounds.right > region.leftTile && bounds.left < region.rightTileExclusive
    ));
    this.activeRegionIds = new Set(regions.map(region => region.id));
    const activeAssets = new Map();

    for (const region of regions) {
      const view = this._getOrCreateRegionView(region);
      const requiredAssets = this.demandStreamingEnabled
        ? view.resolveRequiredAssets(
          bounds,
          this.demandStreamingConfig.neighborSegments
        )
        : regionAssets(region);
      for (const asset of requiredAssets) activeAssets.set(asset.key, asset);
      if (this._isRegionReady(region, requiredAssets)) {
        this._syncRegion(region, bounds, lighting, force);
      } else {
        this._requestRegionAssets(region, requiredAssets);
      }
      for (const asset of view.getActiveAssets()) activeAssets.set(asset.key, asset);
    }
    this.activeAssetKeys = new Set(activeAssets.keys());
    this._pruneRegionViews();
    this._releaseUnusedAssets();
    this.update(lighting);
    return regions.length > 0;
  }

  _isRegionReady(region, assets = regionAssets(region)) {
    if (this.demandStreamingEnabled) {
      return assets.every(asset => this.scene.textures.exists(asset.key));
    }
    return isWorldVisualGroundStructureRegionReady(
      region,
      asset => this.scene.textures.exists(asset.key)
    );
  }

  _syncRegion(region, bounds, lighting, force) {
    const view = this._getOrCreateRegionView(region);
    view.sync(bounds, lighting, force);
  }

  _getOrCreateRegionView(region) {
    let view = this.regionViews.get(region.id);
    if (view) return view;
    view = new WorldVisualGroundStructureRegionView(
      this.scene,
      region,
      this.config,
      this.terrainMask
    );
    this.regionViews.set(region.id, view);
    return view;
  }

  _requestRegionAssets(region, assets = regionAssets(region)) {
    for (const asset of assets) {
      if (this.scene.textures.exists(asset.key) || this.pendingAssetKeys.has(asset.key)) {
        continue;
      }
      this.pendingAssetKeys.add(asset.key);
      this.assetCache.ensure(asset, {
        onReady: () => {
          this.pendingAssetKeys.delete(asset.key);
          if (this.activeRegionIds.has(region.id)) {
            this.sync(this.activeBounds, this.lastLighting, false);
          } else if (!this.activeAssetKeys.has(asset.key)) {
            this.assetCache.release(asset.key, asset);
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
    for (const asset of getWorldVisualGroundStructureRuntimeAssets(
      this.config,
      this.search
    )) {
      if (!this.activeAssetKeys.has(asset.key)) {
        this.assetCache.release(asset.key, asset);
      }
    }
  }

  update(lighting) {
    if (!this.enabled || !lighting) return;
    this.regionViews.forEach(view => view.update(lighting));
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
    this.terrainMask = null;
  }
}
