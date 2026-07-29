import {
  WORLD_VISUAL_TERRAIN_VARIATION,
  getWorldVisualTerrainVariationRuntimeAssets,
  isWorldVisualTerrainVariationRegionReady,
  resolveWorldVisualTerrainCohesionEnabled,
  resolveWorldVisualTerrainVariationEnabled,
  resolveWorldVisualTerrainVariationRegions,
} from "../../../values/worldVisualTerrainVariation.js?rev=20260729-whole-world-expansion-v5-lineless-v10";
import {
  WORLD_VISUAL_RUNTIME,
  resolveScenicDemandAssetStreamingEnabled,
} from "../../../values/worldVisualRuntime.js?rev=20260729-whole-world-expansion-v5-lineless-v10";
import { WorldVisualAssetCache } from "./WorldVisualAssetCache.js";
import { WorldVisualTerrainVariationRegionView } from
  "./WorldVisualTerrainVariationRegionView.js?rev=20260729-whole-world-expansion-v5-lineless-v10";

function regionAssets(region, includeCohesion = false) {
  return [
    ...region.plates,
    ...(region.capAtlases || [region.capAtlas]),
    ...(includeCohesion && region.cohesionPlate ? [region.cohesionPlate] : []),
  ];
}

export class WorldVisualTerrainVariationLayer {
  constructor(
    scene,
    worldModel,
    terrainMask,
    config = WORLD_VISUAL_TERRAIN_VARIATION,
    search = globalThis.location?.search || ""
  ) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.terrainMask = terrainMask;
    this.config = config;
    this.search = search;
    this.enabled = resolveWorldVisualTerrainVariationEnabled(config, search);
    this.cohesionEnabled = resolveWorldVisualTerrainCohesionEnabled(config, search);
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
    this.assetCache = new WorldVisualAssetCache(this.scene);
    return true;
  }

  sync(bounds, lighting, force = false) {
    if (!this.enabled || !bounds) return false;
    this.activeBounds = bounds;
    this.lastLighting = lighting;
    if (force) this._destroyRegionViews();
    const transitionTiles = (
      Number(this.config.segment.crossBiomeOverlapYPx) || 0
    ) / this.scene.config.tileSize;
    const regions = resolveWorldVisualTerrainVariationRegions(
      bounds.top,
      bounds.bottom + transitionTiles,
      this.config,
      this.search
    ).filter(region => (
      bounds.right > region.leftTile && bounds.left < region.rightTileExclusive
    ));
    this.activeRegionIds = new Set(regions.map(region => region.id));
    const activeAssets = new Map();
    for (const region of regions) {
      const view = this._getOrCreateRegionView(region);
      const allAssets = regionAssets(region, this.cohesionEnabled);
      const requiredAssets = this.demandStreamingEnabled
        ? view.resolveRequiredAssets(
          bounds,
          this.demandStreamingConfig.neighborSegments
        )
        : allAssets;
      for (const asset of requiredAssets) activeAssets.set(asset.key, asset);
      if (this._isRegionReady(region, requiredAssets)) {
        this._syncRegion(region, bounds, lighting, force);
      }
      this._requestRegionAssets(region, requiredAssets);
      for (const asset of view.getActiveAssets()) activeAssets.set(asset.key, asset);
    }
    this.activeAssetKeys = new Set(activeAssets.keys());
    this._pruneRegionViews();
    this._releaseUnusedAssets();
    this.update(lighting);
    return regions.length > 0;
  }

  invalidateCell(tx, ty, lighting = this.lastLighting) {
    const bounds = this.activeBounds;
    if (
      !bounds
      || tx < bounds.left - 1
      || tx >= bounds.right + 1
      || ty < bounds.top - 1
      || ty >= bounds.bottom + 1
    ) return false;
    return this.sync(bounds, lighting, false);
  }

  _isRegionReady(
    region,
    assets = regionAssets(region, this.cohesionEnabled)
  ) {
    const blockingAssets = assets.filter(
      asset => asset.key !== region.cohesionPlate?.key
    );
    if (this.demandStreamingEnabled) {
      return blockingAssets.every(asset => this.scene.textures.exists(asset.key));
    }
    return isWorldVisualTerrainVariationRegionReady(
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
    view = new WorldVisualTerrainVariationRegionView(
      this.scene,
      this.worldModel,
      region,
      this.config,
      this.terrainMask,
      this.cohesionEnabled
    );
    this.regionViews.set(region.id, view);
    return view;
  }

  _requestRegionAssets(
    region,
    assets = regionAssets(region, this.cohesionEnabled)
  ) {
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
    for (const asset of getWorldVisualTerrainVariationRuntimeAssets(
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
