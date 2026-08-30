import {
  WORLD_VISUAL_UNDERGROUND_DETAILS,
  getWorldVisualUndergroundDetailAssets,
  resolveWorldVisualUndergroundDetailRegions,
  resolveWorldVisualUndergroundDetailsEnabled,
} from "../../../values/worldVisualUndergroundDetails.js";
import {
  LEVEL_ONE_BIOME_FIELD,
  getLevelOneBiomeBoundaryAssets,
} from "../../../values/levelOneBiomeField.js";
import {
  LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  getLevelOneBiomeGeneratedRoleAssets,
} from "../../../values/levelOneBiomeVisualFamilies.js";
import { RUNTIME_ASSET_LOADING } from "../../../values/runtimeAssetLoading.js";
import { WorldVisualAssetCache } from "./WorldVisualAssetCache.js";
import { WorldVisualUndergroundDetailRegionView } from
  "./WorldVisualUndergroundDetailRegionView.js?rev=20260729-native-density-v14";
import { WorldVisualLevelOneBiomeBoundaryView } from
  "./WorldVisualLevelOneBiomeBoundaryView.js";
import { WorldVisualLevelOneBiomeGeneratedRoleView } from
  "./WorldVisualLevelOneBiomeGeneratedRoleView.js";

export class WorldVisualUndergroundDetailLayer {
  constructor(
    scene,
    terrainMask,
    config = WORLD_VISUAL_UNDERGROUND_DETAILS,
    search = globalThis.location?.search || ""
  ) {
    this.scene = scene;
    this.terrainMask = terrainMask;
    this.config = config;
    this.search = search;
    this.enabled = resolveWorldVisualUndergroundDetailsEnabled(config, search);
    this.regionViews = new Map();
    this.activeRegionIds = new Set();
    this.activeAssetKeys = new Set();
    this.pendingAssetKeys = new Set();
    this.activeBounds = null;
    this.lastLighting = null;
    this.assetCache = null;
    this.biomeBoundaryView = null;
    this.biomeGeneratedRoleView = null;
  }

  create() {
    if (!this.enabled || !this.terrainMask) return false;
    this.assetCache = new WorldVisualAssetCache(this.scene, {
      owner: RUNTIME_ASSET_LOADING.owners.undergroundDetail,
      priority: RUNTIME_ASSET_LOADING.priorities.undergroundDetail,
    });
    this.biomeBoundaryView = new WorldVisualLevelOneBiomeBoundaryView(
      this.scene,
      this.terrainMask,
      LEVEL_ONE_BIOME_FIELD,
      this.search
    );
    this.biomeGeneratedRoleView = new WorldVisualLevelOneBiomeGeneratedRoleView(
      this.scene,
      this.terrainMask,
      LEVEL_ONE_BIOME_FIELD,
      LEVEL_ONE_BIOME_VISUAL_FAMILIES,
      this.search
    );
    return true;
  }

  sync(bounds, lighting, force = false) {
    if (!this.enabled || !bounds) return false;
    this.activeBounds = bounds;
    this.lastLighting = lighting;
    if (force) this._destroyRegionViews();
    const regions = resolveWorldVisualUndergroundDetailRegions(
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
      const requiredAssets = view.resolveRequiredAssets(bounds);
      for (const asset of requiredAssets) activeAssets.set(asset.key, asset);
      if (requiredAssets.every(asset => this.scene.textures.exists(asset.key))) {
        view.sync(bounds, lighting, force);
      } else {
        this._requestRegionAssets(region, requiredAssets);
      }
      for (const asset of view.getActiveAssets()) activeAssets.set(asset.key, asset);
    }
    const boundaryAssets = this.biomeBoundaryView?.resolveRequiredAssets(bounds) || [];
    boundaryAssets.forEach(asset => activeAssets.set(asset.key, asset));
    if (boundaryAssets.every(asset => this.scene.textures.exists(asset.key))) {
      this.biomeBoundaryView?.sync(bounds, lighting, force);
    } else {
      this._requestBiomeAssets(boundaryAssets);
    }
    this.biomeBoundaryView?.getActiveAssets().forEach(asset => {
      activeAssets.set(asset.key, asset);
    });
    const generatedAssets = this.biomeGeneratedRoleView?.resolveRequiredAssets(bounds) || [];
    generatedAssets.forEach(asset => activeAssets.set(asset.key, asset));
    if (generatedAssets.every(asset => this.scene.textures.exists(asset.key))) {
      this.biomeGeneratedRoleView?.sync(bounds, lighting, force);
    } else {
      this._requestBiomeAssets(generatedAssets);
    }
    this.biomeGeneratedRoleView?.getActiveAssets().forEach(asset => {
      activeAssets.set(asset.key, asset);
    });
    this.activeAssetKeys = new Set(activeAssets.keys());
    this._pruneRegionViews();
    this._releaseUnusedAssets();
    this.update(lighting);
    return regions.length > 0;
  }

  _getOrCreateRegionView(region) {
    let view = this.regionViews.get(region.id);
    if (view) return view;
    view = new WorldVisualUndergroundDetailRegionView(
      this.scene,
      region,
      this.config,
      this.terrainMask
    );
    this.regionViews.set(region.id, view);
    return view;
  }

  _requestRegionAssets(region, assets) {
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

  _requestBiomeAssets(assets) {
    for (const asset of assets) {
      if (this.scene.textures.exists(asset.key) || this.pendingAssetKeys.has(asset.key)) {
        continue;
      }
      this.pendingAssetKeys.add(asset.key);
      this.assetCache.ensure(asset, {
        onReady: () => {
          this.pendingAssetKeys.delete(asset.key);
          if (
            this.biomeBoundaryView?.intersects(this.activeBounds)
            || this.biomeGeneratedRoleView?.intersects(this.activeBounds)
          ) {
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
    for (const asset of getWorldVisualUndergroundDetailAssets(
      this.config,
      this.search
    ).concat(
      getLevelOneBiomeBoundaryAssets(),
      getLevelOneBiomeGeneratedRoleAssets(
        LEVEL_ONE_BIOME_VISUAL_FAMILIES,
        this.search
      )
    )) {
      if (!this.activeAssetKeys.has(asset.key)) {
        this.assetCache.release(asset.key, asset);
      }
    }
  }

  update(lighting) {
    if (!this.enabled || !lighting) return;
    this.regionViews.forEach(view => view.update(lighting));
    this.biomeBoundaryView?.update(lighting);
    this.biomeGeneratedRoleView?.update(lighting);
  }

  _destroyRegionViews() {
    this.regionViews.forEach(view => view.destroy());
    this.regionViews.clear();
  }

  destroy() {
    this._destroyRegionViews();
    this.biomeBoundaryView?.destroy();
    this.biomeGeneratedRoleView?.destroy();
    this.assetCache?.destroy();
    this.assetCache = null;
    this.biomeBoundaryView = null;
    this.biomeGeneratedRoleView = null;
    this.activeRegionIds.clear();
    this.activeAssetKeys.clear();
    this.pendingAssetKeys.clear();
    this.activeBounds = null;
    this.lastLighting = null;
    this.terrainMask = null;
  }
}
