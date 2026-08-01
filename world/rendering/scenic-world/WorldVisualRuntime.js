import { WORLD_VISUAL_RUNTIME } from
  "../../../values/worldVisualRuntime.js?rev=20260729-native-density-v14";
import { ASSET_KEYS } from "../../../values/assetKeys.js";
import { TILE_TYPES } from "../../../values/tileTypes.js";
import { PERFORMANCE_TELEMETRY_CONFIG } from "../../../values/performanceTelemetryConfig.js";
import {
  performanceNow,
  recordPerformanceSpan,
  shouldSamplePerformancePhases,
} from "../../../systems/health/performanceTelemetryBridge.js";
import { validateWorldVisualMaterialCoverage } from "../../../values/worldVisualMaterials.js";
import { TitanDiscoverySystem } from "../../../systems/visual/TitanDiscoverySystem.js?rev=20260729-native-density-v14";
import {
  WORLD_VISUAL_LANDMARKS,
  resolveWorldVisualLandmarksEnabled,
} from "../../../values/worldVisualLandmarks.js";
import { resolveWorldVisualSurfaceHeroLandmarkSuppression } from
  "../../../values/worldVisualSurfaceHeroLandmarks.js";
import { WorldVisualFeedbackLayer } from "./WorldVisualFeedbackLayer.js";
import { WorldVisualGameplayEffectLayer } from "./WorldVisualGameplayEffectLayer.js";
import { WorldVisualLandmarkLayer } from "./WorldVisualLandmarkLayer.js";
import { WorldVisualLightingBridge } from "./WorldVisualLightingBridge.js";
import { WorldVisualMaterialField } from "./WorldVisualMaterialField.js";
import { WorldVisualSemanticAssetLayer } from "./WorldVisualSemanticAssetLayer.js";
import { WorldVisualDepthBackdropStage } from
  "./WorldVisualDepthBackdropStage.js?rev=20260729-native-density-v14";
import { WorldVisualBackdropEnhancerLayer } from
  "./WorldVisualBackdropEnhancerLayer.js?rev=20260729-backdrop-enhancers-v7";
import { WorldVisualGroundStructureLayer } from
  "./WorldVisualGroundStructureLayer.js?rev=20260729-native-density-v14";
import { WorldVisualUndergroundDetailLayer } from
  "./WorldVisualUndergroundDetailLayer.js?rev=20260729-native-density-v14";
import { WorldVisualSurfaceStage } from
  "./WorldVisualSurfaceStage.js?rev=20260730-surface-transition-v1";
import { WorldVisualSurfaceAtmosphereLayer } from "./WorldVisualSurfaceAtmosphereLayer.js";
import { WorldVisualSurfacePropExpansionLayer } from
  "./WorldVisualSurfacePropExpansionLayer.js";
import { WorldVisualSurfaceHeroLandmarkLayer } from
  "./WorldVisualSurfaceHeroLandmarkLayer.js";
import { WorldVisualSurfacePropLayer } from "./WorldVisualSurfacePropLayer.js";
import { WorldVisualSkyCohesionLayer } from
  "./WorldVisualSkyCohesionLayer.js?rev=20260730-sky-order-v2";
import { WorldVisualPerformanceTracker } from "./WorldVisualPerformanceTracker.js";
import { WorldVisualTerrainVariationLayer } from
  "./WorldVisualTerrainVariationLayer.js?rev=20260729-native-density-v14";

export class WorldVisualRuntime {
  constructor(scene, worldModel, config, runtimeConfig = WORLD_VISUAL_RUNTIME) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.runtimeConfig = runtimeConfig;
    this.surfaceStage = null;
    this.skyCohesionLayer = null;
    this.surfacePropLayer = null;
    this.surfacePropExpansionLayer = null;
    this.surfaceHeroLandmarkLayer = null;
    this.surfaceAtmosphereLayer = null;
    this.depthBackdropStage = null;
    this.backdropEnhancerLayer = null;
    this.titanDiscoverySystem = null;
    this.materialField = null;
    this.terrainVariationLayer = null;
    this.groundStructureLayer = null;
    this.undergroundDetailLayer = null;
    this.semanticAssetLayer = null;
    this.feedbackLayer = null;
    this.gameplayEffectLayer = null;
    this.landmarkLayer = null;
    this.lightingBridge = null;
    this.lastBounds = null;
    this.lastSignature = "";
    this.lastReduced = false;
    this.nextUpdateAt = 0;
    this.created = false;
    this.tutorialTileVisual = null;
    this.tutorialTileKey = null;
    this.performanceTracker = new WorldVisualPerformanceTracker(runtimeConfig);
    this._onResize = () => this.resize();
  }

  create() {
    if (!validateWorldVisualMaterialCoverage(this.config.topAirRows, this.worldModel.depth)) {
      throw new Error("[WorldVisualRuntime] Material bands do not cover the complete gameplay depth");
    }
    this.lightingBridge = new WorldVisualLightingBridge(this.scene);
    this.surfaceStage = new WorldVisualSurfaceStage(this.scene, this.runtimeConfig);
    this.surfaceStage.create();
    this.skyCohesionLayer = new WorldVisualSkyCohesionLayer(this.scene);
    this.skyCohesionLayer.create();
    const search = globalThis.location?.search || "";
    const heroSuppression = resolveWorldVisualSurfaceHeroLandmarkSuppression(
      undefined,
      search,
    );
    this.surfacePropLayer = new WorldVisualSurfacePropLayer(this.scene, this.worldModel);
    this.surfacePropLayer.create(search, {
      suppressedPlacementIds: heroSuppression.retained,
    });
    this.surfacePropExpansionLayer = new WorldVisualSurfacePropExpansionLayer(
      this.scene,
      this.worldModel,
    );
    this.surfacePropExpansionLayer.create(search, {
      suppressedPlacementIds: heroSuppression.expansion,
    });
    this.surfaceHeroLandmarkLayer = new WorldVisualSurfaceHeroLandmarkLayer(
      this.scene,
      this.worldModel,
    );
    this.surfaceHeroLandmarkLayer.create(search);
    this.surfaceAtmosphereLayer = new WorldVisualSurfaceAtmosphereLayer(this.scene);
    this.surfaceAtmosphereLayer.create();
    this.depthBackdropStage = new WorldVisualDepthBackdropStage(this.scene);
    this.depthBackdropStage.create();
    this.backdropEnhancerLayer = new WorldVisualBackdropEnhancerLayer(this.scene);
    this.backdropEnhancerLayer.create();
    this.titanDiscoverySystem = new TitanDiscoverySystem(this.scene, this.worldModel);
    this.titanDiscoverySystem.create();
    if (resolveWorldVisualLandmarksEnabled()) {
      this.landmarkLayer = new WorldVisualLandmarkLayer(
        this.scene,
        this.worldModel,
        WORLD_VISUAL_LANDMARKS
      );
      this.landmarkLayer.create();
    }
    this.materialField = new WorldVisualMaterialField(this.scene, this.worldModel, this.runtimeConfig);
    this.materialField.create();
    this.terrainVariationLayer = new WorldVisualTerrainVariationLayer(
      this.scene,
      this.worldModel,
      this.materialField.geometryMask
    );
    this.terrainVariationLayer.create();
    this.surfaceStage.bindTerrainMask(this.materialField.geometryMask);
    this.groundStructureLayer = new WorldVisualGroundStructureLayer(
      this.scene,
      this.materialField.geometryMask
    );
    this.groundStructureLayer.create();
    this.undergroundDetailLayer = new WorldVisualUndergroundDetailLayer(
      this.scene,
      this.materialField.geometryMask
    );
    this.undergroundDetailLayer.create();
    this.semanticAssetLayer = new WorldVisualSemanticAssetLayer(
      this.scene,
      this.worldModel,
      this.materialField.geometryMask
    );
    this.semanticAssetLayer.create();
    this.feedbackLayer = new WorldVisualFeedbackLayer(
      this.scene,
      this.worldModel,
      this.materialField.geometryMask,
      this.runtimeConfig
    );
    this.feedbackLayer.create();
    this.gameplayEffectLayer = new WorldVisualGameplayEffectLayer(
      this.scene,
      this.worldModel,
      this.materialField.geometryMask,
      this.runtimeConfig
    );
    this.gameplayEffectLayer.create();
    this.created = true;
    this.scene.scale?.on?.("resize", this._onResize);
    this._sync(null, true);
    console.info("[WorldVisualRuntime] Scenic v2 is authoritative; use ?worldVisualRuntime=legacy to roll back");
    return true;
  }

  updateRenderWindow(playerTile) {
    if (!this.created) return false;
    const bounds = this._getVisibleBounds(playerTile);
    if (!bounds) return false;
    const signature = this._boundsSignature(bounds);
    const reduced = this.performanceTracker.isReduced(
      this.scene,
      this.runtimeConfig.streaming.reduceBelowFps,
      this.runtimeConfig.streaming.recoverReducedAboveFps
    );
    if (signature === this.lastSignature && reduced === this.lastReduced) {
      this.performanceTracker.recordSkip(signature, reduced);
      return false;
    }
    this._sync(playerTile, false, bounds, signature, reduced);
    return true;
  }

  update(time, delta, context = {}) {
    if (!this.created || this.scene?._isShuttingDown || !this.scene?.cameras?.main) return;
    const samplePerformancePhases = shouldSamplePerformancePhases(this);
    const continuousStartedAtMs = samplePerformancePhases ? performanceNow() : null;
    const now = Number.isFinite(time) ? time : (this.scene.time?.now || 0);
    const lighting = this.lightingBridge.sample();
    this.surfaceStage.update(now, lighting);
    this.skyCohesionLayer?.update(now, lighting);
    this.surfacePropLayer?.update(now, lighting);
    this.surfacePropExpansionLayer?.update(now, lighting);
    this.surfaceHeroLandmarkLayer?.update(now, lighting);
    this.surfaceAtmosphereLayer?.update(now, lighting);
    this.depthBackdropStage?.update(now, lighting);
    this.backdropEnhancerLayer?.update(lighting);
    this.terrainVariationLayer?.update(lighting);
    this.groundStructureLayer?.update(lighting);
    this.undergroundDetailLayer?.update(lighting);
    this.landmarkLayer?.update(now, lighting);
    this.semanticAssetLayer?.update(now, lighting);
    this.titanDiscoverySystem?.update(now, delta, context, lighting);
    if (samplePerformancePhases) {
      recordPerformanceSpan(
        PERFORMANCE_TELEMETRY_CONFIG.phases.scenicContinuous,
        continuousStartedAtMs
      );
    }
    if (now < this.nextUpdateAt) return;
    this.nextUpdateAt = now + this.runtimeConfig.streaming.updateIntervalMs;
    this.materialField?.setLighting(lighting);
    this.semanticAssetLayer?.setLighting(lighting);
    const bounds = this._getVisibleBounds(context.playerTile);
    if (!bounds) return;
    const signature = this._boundsSignature(bounds);
    const reduced = this.performanceTracker.isReduced(
      this.scene,
      this.runtimeConfig.streaming.reduceBelowFps,
      this.runtimeConfig.streaming.recoverReducedAboveFps
    );
    if (
      this.performanceTracker.schedulerEnabled
      && signature === this.lastSignature
      && reduced === this.lastReduced
    ) {
      this.performanceTracker.recordSkip(signature, reduced);
      return;
    }
    this._sync(
      context.playerTile,
      false,
      bounds,
      signature,
      reduced,
      lighting,
      true
    );
  }

  _sync(
    playerTile,
    force = false,
    suppliedBounds = null,
    suppliedSignature = "",
    reduced = false,
    suppliedLighting = null,
    continuousLayersAlreadyUpdated = false
  ) {
    if (!this.created || this.scene?._isShuttingDown) return false;
    const bounds = suppliedBounds || this._getVisibleBounds(playerTile);
    if (!bounds) return false;
    const signature = suppliedSignature || this._boundsSignature(bounds);
    const startedAtMs = this.performanceTracker.beginSync();
    const lighting = suppliedLighting || this.lightingBridge.sample();
    this.depthBackdropStage?.sync(bounds, lighting, force);
    this.backdropEnhancerLayer?.sync(bounds, lighting, force);
    this.skyCohesionLayer?.sync(bounds, lighting, force);
    this.surfacePropLayer?.sync(bounds, lighting, force);
    this.surfacePropExpansionLayer?.sync(bounds, lighting, force);
    this.surfaceHeroLandmarkLayer?.sync(bounds, lighting, force);
    this.surfaceAtmosphereLayer?.sync(bounds, lighting);
    this.materialField.sync(bounds, lighting, force);
    this.terrainVariationLayer?.sync(bounds, lighting, force);
    this.groundStructureLayer?.sync(bounds, lighting, force);
    this.undergroundDetailLayer?.sync(bounds, lighting, force);
    this.semanticAssetLayer?.sync(bounds, lighting, reduced);
    this.feedbackLayer.sync(bounds, reduced);
    this.gameplayEffectLayer.sync(bounds);
    if (!continuousLayersAlreadyUpdated) {
      const now = this.scene.time?.now || 0;
      this.surfaceStage.update(now, lighting);
      this.skyCohesionLayer?.update(now, lighting);
      this.depthBackdropStage?.update(now, lighting);
      this.backdropEnhancerLayer?.update(lighting);
      this.landmarkLayer?.update(now, lighting);
    }
    this.lastBounds = bounds;
    this.lastSignature = signature;
    this.lastReduced = reduced;
    this.performanceTracker.recordSync(startedAtMs, {
      bounds,
      signature,
      reduced,
      force,
    });
    return true;
  }

  _getVisibleBounds(playerTile = null) {
    const camera = this.scene?.cameras?.main;
    if (!camera) return null;
    const view = camera.worldView;
    const tileSize = this.config.tileSize;
    const margin = this.runtimeConfig.streaming.maskMarginTiles;
    let left = Number.isFinite(view?.x) ? view.x : camera.scrollX;
    let top = Number.isFinite(view?.y) ? view.y : camera.scrollY;
    const width = Number.isFinite(view?.width) && view.width > 0 ? view.width : camera.width / (camera.zoom || 1);
    const height = Number.isFinite(view?.height) && view.height > 0 ? view.height : camera.height / (camera.zoom || 1);
    if (playerTile && (
      playerTile.tx * tileSize < left - tileSize
      || playerTile.tx * tileSize > left + width + tileSize
      || playerTile.ty * tileSize < top - tileSize
      || playerTile.ty * tileSize > top + height + tileSize
    )) {
      left = (playerTile.tx + 0.5) * tileSize - width / 2;
      top = (playerTile.ty + 0.5) * tileSize - height / 2;
    }
    return {
      left: Math.max(0, Math.floor(left / tileSize) - margin),
      right: Math.min(this.worldModel.width, Math.ceil((left + width) / tileSize) + margin),
      top: Math.max(0, Math.floor(top / tileSize) - margin),
      bottom: Math.min(this.worldModel.depth, Math.ceil((top + height) / tileSize) + margin),
    };
  }

  _boundsSignature(bounds) {
    const snap = this.runtimeConfig.streaming.signatureSnapTiles;
    return [bounds.left, bounds.right, bounds.top, bounds.bottom]
      .map(value => Math.floor(value / snap) * snap)
      .join(":");
  }

  applyTileUpdate(tx, ty) {
    if (!this.created) return;
    this._syncTutorialTileVisual(tx, ty);
    this.performanceTracker.recordTileInvalidation();
    const lighting = this.lightingBridge.sample();
    this.materialField.invalidateCell(tx, ty, lighting);
    this.terrainVariationLayer?.invalidateCell(tx, ty, lighting);
    this.semanticAssetLayer?.invalidateCell(tx, ty);
    if (this.lastBounds) this.feedbackLayer.sync(this.lastBounds, false);
    this.gameplayEffectLayer.invalidateCell(tx, ty);
    this.titanDiscoverySystem?.invalidateTile(tx, ty);
  }

  setTutorialTileVisual(tx, ty, tileType, visible = true) {
    const key = `${tx},${ty}`;
    if (
      !visible
      || tileType !== TILE_TYPES.DIRT
      || !this.created
      || !this.scene.textures.exists(ASSET_KEYS.tiles.dirtHp5)
    ) {
      if (!visible || this.tutorialTileKey === key) this.clearTutorialTileVisual();
      return false;
    }

    const tileSize = this.scene.config.tileSize;
    if (!this.tutorialTileVisual) {
      this.tutorialTileVisual = this.scene.add.image(
        0,
        0,
        ASSET_KEYS.tiles.dirtHp5,
      )
        .setOrigin(0.5)
        .setDepth(this.runtimeConfig.render.physicalEffectDepth + 0.01);
    }
    this.tutorialTileVisual
      .setPosition((tx + 0.5) * tileSize, (ty + 0.5) * tileSize)
      .setDisplaySize(tileSize, tileSize)
      .setVisible(true);
    this.tutorialTileKey = key;
    return true;
  }

  clearTutorialTileVisual() {
    this.tutorialTileVisual?.setVisible(false);
    this.tutorialTileKey = null;
  }

  _syncTutorialTileVisual(tx, ty) {
    const key = `${tx},${ty}`;
    if (this.tutorialTileKey !== key) return;
    if (
      this.worldModel.dugTiles?.has?.(key)
      || this.worldModel.getTileType(tx, ty) === TILE_TYPES.AIR
    ) {
      this.clearTutorialTileVisual();
    }
  }

  refreshAllTiles() {
    if (this.created) {
      this._sync(null, true);
      this.titanDiscoverySystem?.refresh();
    }
  }

  getTitanDiscoverySnapshot() {
    return this.titanDiscoverySystem?.getSnapshot() || null;
  }

  getPerformanceSnapshot() {
    return this.performanceTracker.snapshotRuntime(this);
  }

  getTitanArchiveAssetProvider() {
    return this.titanDiscoverySystem?.getArchiveAssetProvider() || null;
  }

  getTitanSurfaceInspectionDistance(playerTile) {
    return this.titanDiscoverySystem?.getSurfaceInspectionDistance(playerTile)
      ?? Number.POSITIVE_INFINITY;
  }

  updateTitanSurfaceInspection(playerTile, keys, options = {}) {
    return this.titanDiscoverySystem?.updateSurfaceInspection(
      playerTile,
      keys,
      options
    ) === true;
  }

  getTitanClueDirectionProvider() {
    return this.titanDiscoverySystem?.getClueDirectionProvider() || null;
  }

  setEmissiveRenderDepth(depth) {
    // Terrain feedback stays at terrain depth; only luminous semantic cues move
    // beneath LightSystem's darkness compositor.
    this.gameplayEffectLayer?.setEmissiveDepth(depth);
    this.semanticAssetLayer?.setEmissiveDepth(depth);
  }

  updateSkyTileGlow(playerTile, viewRange) {
    return this.gameplayEffectLayer?.updateSkyTileGlow(playerTile, viewRange) || false;
  }

  updateChestGlow(playerTile, viewRange) {
    return this.gameplayEffectLayer?.updateChestGlow(playerTile, viewRange) || false;
  }

  updateGlowCrystals(playerTile, viewRange) {
    return this.gameplayEffectLayer?.updateGlowCrystals(playerTile, viewRange) || false;
  }

  updateRootOverlays() {
    return this.gameplayEffectLayer?.updateRootOverlays() || false;
  }

  updateSpecialBlockGlow() {
    return this.gameplayEffectLayer?.updateSpecialBlockGlow() || false;
  }

  playerTileToPixel(playerTile) {
    return { x: playerTile.tx * this.config.tileSize, y: playerTile.ty * this.config.tileSize };
  }

  resize() {
    if (!this.created || this.scene?._isShuttingDown || !this.scene?.cameras?.main) {
      return false;
    }
    this.lastSignature = "";
    return this._sync(null, true);
  }

  destroy() {
    this.created = false;
    this.tutorialTileVisual?.destroy();
    this.tutorialTileVisual = null;
    this.tutorialTileKey = null;
    this.scene?.scale?.off?.("resize", this._onResize);
    this.gameplayEffectLayer?.destroy();
    this.titanDiscoverySystem?.destroy();
    this.feedbackLayer?.destroy();
    this.semanticAssetLayer?.destroy();
    this.undergroundDetailLayer?.destroy();
    this.groundStructureLayer?.destroy();
    this.terrainVariationLayer?.destroy();
    this.skyCohesionLayer?.destroy();
    // Surface-pack ground cards share the material field's geometry mask. They
    // must detach before that mask is destroyed during hot restart/shutdown.
    this.surfaceStage?.destroy();
    this.surfaceAtmosphereLayer?.destroy();
    this.surfaceHeroLandmarkLayer?.destroy();
    this.surfacePropExpansionLayer?.destroy();
    this.surfacePropLayer?.destroy();
    this.materialField?.destroy();
    this.backdropEnhancerLayer?.destroy();
    this.depthBackdropStage?.destroy();
    this.landmarkLayer?.destroy();
    this.feedbackLayer = null;
    this.semanticAssetLayer = null;
    this.undergroundDetailLayer = null;
    this.groundStructureLayer = null;
    this.terrainVariationLayer = null;
    this.skyCohesionLayer = null;
    this.gameplayEffectLayer = null;
    this.materialField = null;
    this.backdropEnhancerLayer = null;
    this.depthBackdropStage = null;
    this.titanDiscoverySystem = null;
    this.landmarkLayer = null;
    this.surfaceStage = null;
    this.surfaceAtmosphereLayer = null;
    this.surfaceHeroLandmarkLayer = null;
    this.surfacePropExpansionLayer = null;
    this.surfacePropLayer = null;
    this.lightingBridge = null;
  }
}
