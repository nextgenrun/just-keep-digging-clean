import {
  FULL_WORLD_MATERIAL_CONFIG,
  isFullWorldMaterialReviewEnabled,
  resolveFullWorldMaterialDepthBlend,
} from "../../values/fullWorldMaterialConfig.js";
import { FullWorldMaterialPipeline } from "./FullWorldMaterialPipeline.js";

function lerp(from, to, amount) {
  return from + (to - from) * Math.max(0, Math.min(1, amount));
}

function blendProfile(from, to, amount) {
  return {
    sharpness: lerp(from.sharpness, to.sharpness, amount),
    reliefStrength: lerp(from.reliefStrength, to.reliefStrength, amount),
    reliefRadiusPx: lerp(from.reliefRadiusPx, to.reliefRadiusPx, amount),
    vibrance: lerp(from.vibrance, to.vibrance, amount),
    shadowLift: lerp(from.shadowLift, to.shadowLift, amount),
  };
}

export class FullWorldMaterialSystem {
  constructor(scene, config = FULL_WORLD_MATERIAL_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.enabled = isFullWorldMaterialReviewEnabled(globalThis.location?.search || "", config);
    this.available = false;
    this.pipeline = null;
    this._lastCheckAt = 0;
    this._lowFpsChecks = 0;
    this._onUpdate = null;
  }

  create() {
    if (!this.enabled) return false;
    const renderer = this.scene.game?.renderer;
    const camera = this.scene.cameras?.main;
    if (!renderer || renderer.type !== Phaser.WEBGL || !camera?.setPostPipeline) {
      this.enabled = false;
      return false;
    }

    try {
      renderer.pipelines.addPostPipeline(this.config.pipelineKey, FullWorldMaterialPipeline);
      camera.setPostPipeline(this.config.pipelineKey);
      this.pipeline = camera.getPostPipeline(this.config.pipelineKey);
      if (Array.isArray(this.pipeline)) this.pipeline = this.pipeline.at(-1) || null;
      this.available = Boolean(this.pipeline);
    } catch (error) {
      console.warn("[FullWorldMaterialSystem] Pipeline creation failed; review pass disabled:", error);
      this.destroy();
      return false;
    }

    if (!this.available) return false;
    this._applyDepthProfile();
    this._onUpdate = time => this._tick(time);
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this._onUpdate);
    globalThis.__jkdFullWorldMaterials = this.getDiagnostics();
    return true;
  }

  _getDepthMeters() {
    const tileSize = this.scene.config?.tileSize;
    const playerY = this.scene.player?.y;
    if (!Number.isFinite(tileSize) || !Number.isFinite(playerY)) return 0;
    return Math.max(0, Math.floor(playerY / tileSize) - (this.scene.config?.topAirRows || 0));
  }

  _applyDepthProfile() {
    if (!this.pipeline) return;
    const profiles = this.config.profiles;
    const blend = resolveFullWorldMaterialDepthBlend(this._getDepthMeters(), this.config);
    const shallowProfile = blendProfile(profiles.surface, profiles.shallow, blend.shallow);
    this.pipeline.setMaterialProfile(blendProfile(shallowProfile, profiles.deep, blend.deep));
  }

  _tick(time) {
    const performance = this.config.performance;
    if (time - this._lastCheckAt < performance.updateIntervalMs) return;
    this._lastCheckAt = time;
    const fps = this.scene.game?.loop?.actualFps || 60;
    this._lowFpsChecks = fps < performance.disableBelowFps ? this._lowFpsChecks + 1 : 0;
    if (this._lowFpsChecks >= performance.lowFpsChecksToDisable) {
      console.warn("[FullWorldMaterialSystem] Sustained low FPS; review pass disabled for this session.");
      this.destroy();
      return;
    }
    this._applyDepthProfile();
    globalThis.__jkdFullWorldMaterials = this.getDiagnostics();
  }

  getDiagnostics() {
    return Object.freeze({
      requested: this.enabled,
      active: this.available,
      depthMeters: this._getDepthMeters(),
      profile: this.pipeline?.materialProfile || null,
      lowFpsChecks: this._lowFpsChecks,
    });
  }

  destroy() {
    if (this._onUpdate) {
      this.scene.events.off(Phaser.Scenes.Events.UPDATE, this._onUpdate);
      this._onUpdate = null;
    }
    try {
      if (this.pipeline) this.scene.cameras?.main?.removePostPipeline?.(this.pipeline);
    } catch (_) { /* camera may already be disposed */ }
    this.pipeline = null;
    this.available = false;
    if (globalThis.__jkdFullWorldMaterials) {
      globalThis.__jkdFullWorldMaterials = Object.freeze({ requested: this.enabled, active: false });
    }
  }
}
