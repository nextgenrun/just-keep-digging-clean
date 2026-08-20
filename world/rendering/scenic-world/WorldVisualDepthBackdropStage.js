import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  getWorldVisualDepthBackdropAllAssets,
  getWorldVisualDepthBackdropFallbackAsset,
  getWorldVisualDepthBackdropPreloadAssets,
  isWorldVisualDepthBackdropRegionReady,
  resolveWorldVisualDepthBackdropBlendMask,
  resolveWorldVisualDepthBackdropMotionEnabled,
  resolveWorldVisualDepthBackdropRegionAssets,
  resolveWorldVisualDepthBackdropRegions,
  resolveWorldVisualDepthBackdropsEnabled,
  resolveWorldVisualShallowMaterialLightingEnabled,
} from "../../../values/worldVisualDepthBackdrops.js?rev=20260815-normal-map-lighting-v1";
import { WORLD_VISUAL_DEPTH_CAMERA_MOTION } from
  "../../../values/worldVisualDepthCameraMotion.js";
import {
  WORLD_VISUAL_RUNTIME,
  resolveScenicDemandAssetStreamingEnabled,
} from "../../../values/worldVisualRuntime.js?rev=20260729-native-density-v14";
import { RUNTIME_ASSET_LOADING } from "../../../values/runtimeAssetLoading.js";
import { WorldVisualAssetCache } from "./WorldVisualAssetCache.js";
import { WorldVisualDepthBackdropRegionView } from
  "./WorldVisualDepthBackdropRegionView.js?rev=20260815-normal-map-lighting-v1";
import { WorldVisualDepthCameraMotion } from "./WorldVisualDepthCameraMotion.js";

export class WorldVisualDepthBackdropStage {
  constructor(
    scene,
    config = WORLD_VISUAL_DEPTH_BACKDROPS,
    search = globalThis.location?.search || "",
    cameraMotionConfig = WORLD_VISUAL_DEPTH_CAMERA_MOTION
  ) {
    this.scene = scene;
    this.config = config;
    this.search = search;
    this.enabled = resolveWorldVisualDepthBackdropsEnabled(config, search);
    this.motionEnabled = resolveWorldVisualDepthBackdropMotionEnabled(config, search);
    this.materialLightingEnabled = resolveWorldVisualShallowMaterialLightingEnabled(
      config,
      search
    );
    this.blendMaskAsset = resolveWorldVisualDepthBackdropBlendMask(config, search);
    this.fallbackAsset = getWorldVisualDepthBackdropFallbackAsset(config, search);
    this.demandStreamingConfig = WORLD_VISUAL_RUNTIME.streaming.demandAssetStreaming;
    this.demandStreamingEnabled = resolveScenicDemandAssetStreamingEnabled(
      this.demandStreamingConfig,
      search
    );
    this.cameraMotionConfig = cameraMotionConfig;
    this.regionViews = new Map();
    this.activeRegions = [];
    this.activeRegionIds = new Set();
    this.activeAssetKeys = new Set();
    this.pendingAssetKeys = new Set();
    this.activeBounds = null;
    this.lastLighting = null;
    this.assetCache = null;
    this.cameraMotion = null;
    this.matte = null;
    this.materialLights = [];
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
    const startupAssets = getWorldVisualDepthBackdropPreloadAssets(this.config, this.search);
    for (const asset of startupAssets) {
      if (!this.scene.textures.exists(asset.key)) {
        throw new Error(`[WorldVisualDepthBackdropStage] Startup texture was not preloaded: ${asset.key}`);
      }
    }
    this.assetCache = new WorldVisualAssetCache(this.scene, {
      retainKeys: startupAssets.map(asset => asset.key),
      videoNoAudio: this.config.motion.smoothVideo.noAudio,
      owner: RUNTIME_ASSET_LOADING.owners.depthBackdrop,
      priority: RUNTIME_ASSET_LOADING.priorities.depthBackdrop,
      deferTextureRelease: true,
    });
    this.cameraMotion = new WorldVisualDepthCameraMotion(
      this.scene,
      this.cameraMotionConfig,
      this.motionEnabled
    );
    this._createMaterialLights();
    const tileSize = this.scene.config.tileSize;
    const leftTile = Math.min(...this.config.regions.map(region => region.leftTile));
    const rightTile = Math.max(
      ...this.config.regions.map(region => region.rightTileExclusive)
    );
    const topTile = Math.min(...this.config.regions.map(region => region.topTile));
    const bottomTile = Math.max(
      ...this.config.regions.map(region => region.bottomTileExclusive)
    );
    this.matte = this.scene.add.rectangle(
      leftTile * tileSize,
      topTile * tileSize,
      (rightTile - leftTile) * tileSize,
      (bottomTile - topTile) * tileSize,
      this.config.blend.matteColor,
      1
    )
      .setOrigin(0)
      .setDepth(this.config.render.matteDepth);
    this.matte.name = "world-visual-depth-normalized-blend-matte";
    return true;
  }

  sync(bounds, lighting, force = false) {
    if (!this.enabled || !bounds) return false;
    this.activeBounds = bounds;
    this.lastLighting = lighting;
    if (force) this._destroyRegionViews();

    const transitionTiles = (
      Number(this.config.blend?.crossBiomeOverlapYPx) || 0
    ) / this.scene.config.tileSize;
    const regions = resolveWorldVisualDepthBackdropRegions(
      bounds.top,
      bounds.bottom + transitionTiles,
      this.config,
      this.search
    ).filter(region => bounds.right > region.leftTile && bounds.left < region.rightTileExclusive);
    this.activeRegions = regions;
    this.activeRegionIds = new Set(regions.map(region => region.id));
    this.cameraMotion?.update(this.scene.time?.now || 0, regions);
    const activeAssets = new Map();
    if (this.fallbackAsset) {
      activeAssets.set(this.fallbackAsset.key, this.fallbackAsset);
    }

    for (const region of regions) {
      const backwalls = this._getRegionAssets(region);
      const view = this._getOrCreateRegionView(region, backwalls);
      const requiredAssets = this.demandStreamingEnabled
        ? view.resolveRequiredAssets(
          bounds,
          this.demandStreamingConfig.neighborSegments
        )
        : backwalls;
      for (const asset of requiredAssets) activeAssets.set(asset.key, asset);
      // Always render visible cards. Each card uses the preloaded surface
      // backdrop until its requested biome texture is ready, then replaces
      // itself on the asset-cache callback without exposing a black interval.
      this._syncRegionView(region, backwalls, bounds, lighting, force);
      this._requestRegionAssets(region, requiredAssets);
      for (const asset of view.getActiveAssets()) activeAssets.set(asset.key, asset);
    }
    this.activeAssetKeys = new Set(activeAssets.keys());
    this._pruneRegionViews();
    this._releaseUnusedAssets();
    this.update(this.scene.time?.now || 0, lighting);
    return regions.length > 0;
  }

  _getRegionAssets(region) {
    return resolveWorldVisualDepthBackdropRegionAssets(region, this.config, this.search);
  }

  _isRegionReady(region, backwalls = this._getRegionAssets(region)) {
    if (this.demandStreamingEnabled) {
      return backwalls.every(asset => this._isAssetReady(asset));
    }
    return isWorldVisualDepthBackdropRegionReady(
      region,
      asset => this._isAssetReady(asset),
      backwalls
    );
  }

  _isAssetReady(asset) {
    return asset.type === "video"
      ? Boolean(this.scene.cache?.video?.exists(asset.key))
      : this.scene.textures.exists(asset.key);
  }

  _syncRegionView(region, backwalls, bounds, lighting, force) {
    const view = this._getOrCreateRegionView(region, backwalls);
    view.sync(bounds, lighting, force, this.cameraMotion?.current);
  }

  _getOrCreateRegionView(region, backwalls) {
    let view = this.regionViews.get(region.id);
    if (view) return view;
    view = new WorldVisualDepthBackdropRegionView(
      this.scene,
      region,
      this.config,
      backwalls,
      this.motionEnabled,
      this.blendMaskAsset,
      this.fallbackAsset,
      this.materialLightingEnabled
    );
    this.regionViews.set(region.id, view);
    return view;
  }

  _requestRegionAssets(region, backwalls) {
    for (const asset of backwalls) {
      if (this._isAssetReady(asset) || this.pendingAssetKeys.has(asset.key)) continue;
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
    for (const asset of getWorldVisualDepthBackdropAllAssets(this.config, this.search)) {
      if (!this.activeAssetKeys.has(asset.key)) this.assetCache.release(asset.key, asset);
    }
  }

  update(time, lighting) {
    if (!this.enabled || !lighting) return;
    this._updateMaterialLights();
    const cameraOffset = this.cameraMotion?.update(time, this.activeRegions);
    this.regionViews.forEach(view => view.update(time, lighting, cameraOffset));
  }

  _destroyRegionViews() {
    this.regionViews.forEach(view => view.destroy());
    this.regionViews.clear();
  }

  _createMaterialLights() {
    if (!this.materialLightingEnabled || !this.scene.lights) return;
    const feature = this.config.materialLighting;
    this.scene.lights.enable().setAmbientColor(feature.ambientColor);
    this.materialLights = [feature.coolFill, feature.warmPlayerLight].map(spec => ({
      light: this.scene.lights.addLight(
        0,
        0,
        spec.radiusPx,
        spec.color,
        spec.intensity
      ),
      spec,
    }));
    this._updateMaterialLights();
  }

  _updateMaterialLights() {
    if (!this.materialLightingEnabled || this.materialLights.length === 0) return;
    const player = this.scene.player || this.scene.playerController?.sprite;
    if (!player) return;
    for (const entry of this.materialLights) {
      entry.light.setPosition(
        player.x + entry.spec.offsetXPx,
        player.y + entry.spec.offsetYPx
      );
    }
  }

  destroy() {
    this._destroyRegionViews();
    this.assetCache?.destroy();
    this.assetCache = null;
    this.fallbackAsset = null;
    this.cameraMotion?.destroy();
    this.cameraMotion = null;
    this.matte?.destroy?.();
    this.matte = null;
    for (const entry of this.materialLights) {
      this.scene.lights?.removeLight?.(entry.light);
    }
    this.materialLights = [];
    this.activeRegions = [];
    this.activeRegionIds.clear();
    this.activeAssetKeys.clear();
    this.pendingAssetKeys.clear();
    this.activeBounds = null;
    this.lastLighting = null;
  }
}
