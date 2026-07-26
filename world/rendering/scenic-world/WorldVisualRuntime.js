import { WORLD_VISUAL_RUNTIME } from "../../../values/worldVisualRuntime.js";
import { validateWorldVisualMaterialCoverage } from "../../../values/worldVisualMaterials.js";
import { TitanDiscoverySystem } from "../../../systems/visual/TitanDiscoverySystem.js";
import {
  WORLD_VISUAL_LANDMARKS,
  resolveWorldVisualLandmarksEnabled,
} from "../../../values/worldVisualLandmarks.js";
import { WorldVisualFeedbackLayer } from "./WorldVisualFeedbackLayer.js";
import { WorldVisualGameplayEffectLayer } from "./WorldVisualGameplayEffectLayer.js";
import { WorldVisualLandmarkLayer } from "./WorldVisualLandmarkLayer.js";
import { WorldVisualLightingBridge } from "./WorldVisualLightingBridge.js";
import { WorldVisualMaterialField } from "./WorldVisualMaterialField.js";
import { WorldVisualSemanticAssetLayer } from "./WorldVisualSemanticAssetLayer.js";
import { WorldVisualDepthBackdropStage } from "./WorldVisualDepthBackdropStage.js";
import { WorldVisualSurfaceStage } from "./WorldVisualSurfaceStage.js";

export class WorldVisualRuntime {
  constructor(scene, worldModel, config, runtimeConfig = WORLD_VISUAL_RUNTIME) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.runtimeConfig = runtimeConfig;
    this.surfaceStage = null;
    this.depthBackdropStage = null;
    this.titanDiscoverySystem = null;
    this.materialField = null;
    this.semanticAssetLayer = null;
    this.feedbackLayer = null;
    this.gameplayEffectLayer = null;
    this.landmarkLayer = null;
    this.lightingBridge = null;
    this.lastBounds = null;
    this.lastSignature = "";
    this.nextUpdateAt = 0;
    this.created = false;
    this._onResize = () => this.resize();
  }

  create() {
    if (!validateWorldVisualMaterialCoverage(this.config.topAirRows, this.worldModel.depth)) {
      throw new Error("[WorldVisualRuntime] Material bands do not cover the complete gameplay depth");
    }
    this.lightingBridge = new WorldVisualLightingBridge(this.scene);
    this.surfaceStage = new WorldVisualSurfaceStage(this.scene, this.runtimeConfig);
    this.surfaceStage.create();
    this.depthBackdropStage = new WorldVisualDepthBackdropStage(this.scene);
    this.depthBackdropStage.create();
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
    this.surfaceStage.bindTerrainMask(this.materialField.geometryMask);
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
    const signature = this._boundsSignature(bounds);
    if (signature === this.lastSignature) return false;
    this._sync(playerTile, false, bounds, signature);
    return true;
  }

  update(time, delta, context = {}) {
    if (!this.created) return;
    const now = Number.isFinite(time) ? time : (this.scene.time?.now || 0);
    const lighting = this.lightingBridge.sample();
    this.surfaceStage.update(now, lighting);
    this.depthBackdropStage?.update(now, lighting);
    this.landmarkLayer?.update(now, lighting);
    this.semanticAssetLayer?.update(now, lighting);
    this.titanDiscoverySystem?.update(now, delta, context);
    if (now < this.nextUpdateAt) return;
    this.nextUpdateAt = now + this.runtimeConfig.streaming.updateIntervalMs;
    const bounds = this._getVisibleBounds(context.playerTile);
    const signature = this._boundsSignature(bounds);
    const fps = this.scene.game?.loop?.actualFps || 60;
    this._sync(context.playerTile, false, bounds, signature, fps < this.runtimeConfig.streaming.reduceBelowFps);
  }

  _sync(playerTile, force = false, suppliedBounds = null, suppliedSignature = "", reduced = false) {
    const bounds = suppliedBounds || this._getVisibleBounds(playerTile);
    const signature = suppliedSignature || this._boundsSignature(bounds);
    const lighting = this.lightingBridge.sample();
    this.depthBackdropStage?.sync(bounds, lighting, force);
    this.materialField.sync(bounds, lighting, force);
    this.semanticAssetLayer?.sync(bounds, lighting, reduced);
    this.feedbackLayer.sync(bounds, reduced);
    this.gameplayEffectLayer.sync(bounds);
    this.surfaceStage.update(this.scene.time?.now || 0, lighting);
    this.depthBackdropStage?.update(this.scene.time?.now || 0, lighting);
    this.landmarkLayer?.update(this.scene.time?.now || 0, lighting);
    this.lastBounds = bounds;
    this.lastSignature = signature;
  }

  _getVisibleBounds(playerTile = null) {
    const camera = this.scene.cameras.main;
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
    const lighting = this.lightingBridge.sample();
    this.materialField.invalidateCell(tx, ty, lighting);
    this.semanticAssetLayer?.invalidateCell(tx, ty);
    if (this.lastBounds) this.feedbackLayer.sync(this.lastBounds, false);
    this.gameplayEffectLayer.invalidateCell(tx, ty);
    this.titanDiscoverySystem?.invalidateTile(tx, ty);
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
    if (!this.created) return false;
    this.lastSignature = "";
    this._sync(null, true);
    return true;
  }

  destroy() {
    this.created = false;
    this.scene.scale?.off?.("resize", this._onResize);
    this.gameplayEffectLayer?.destroy();
    this.titanDiscoverySystem?.destroy();
    this.feedbackLayer?.destroy();
    this.semanticAssetLayer?.destroy();
    // Surface-pack ground cards share the material field's geometry mask. They
    // must detach before that mask is destroyed during hot restart/shutdown.
    this.surfaceStage?.destroy();
    this.materialField?.destroy();
    this.depthBackdropStage?.destroy();
    this.landmarkLayer?.destroy();
    this.feedbackLayer = null;
    this.semanticAssetLayer = null;
    this.gameplayEffectLayer = null;
    this.materialField = null;
    this.depthBackdropStage = null;
    this.titanDiscoverySystem = null;
    this.landmarkLayer = null;
    this.surfaceStage = null;
    this.lightingBridge = null;
  }
}
