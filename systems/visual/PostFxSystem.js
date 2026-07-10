/**
 * PostFxSystem — cinematic camera post-processing layer.
 * Applies a soft vignette + depth-based color grading to the main camera
 * using Phaser's built-in PostFX pipelines (WebGL only).
 * All tunables live in values/postFxConfig.js.
 */
import { POSTFX_CONFIG } from "../../values/postFxConfig.js";

const clamp01 = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
const lerp = (a, b, t) => a + (b - a) * t;

export class PostFxSystem {
  constructor(scene, config = POSTFX_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.enabled = Boolean(config.enabled);
    this.available = false;
    this.vignetteFx = null;
    this.colorMatrixFx = null;
    this._lastUpdateAt = 0;
    this._lowFpsChecks = 0;
    // Smoothed 0..1 depth blend (0 = surface look, 1 = full deep look)
    this._depthBlend = 0;
    this._onUpdate = null;
  }

  create() {
    if (!this.enabled) return false;
    const camera = this.scene.cameras?.main;
    const isWebGL = this.scene.game?.renderer?.type === Phaser.WEBGL;
    if (!camera || !isWebGL || !camera.postFX) {
      this.enabled = false;
      return false;
    }

    try {
      const v = this.config.vignette;
      if (v?.enabled) {
        this.vignetteFx = camera.postFX.addVignette(v.x, v.y, v.surfaceRadius, v.surfaceStrength);
      }
      if (this.config.grading?.enabled) {
        this.colorMatrixFx = camera.postFX.addColorMatrix();
      }
      this.available = Boolean(this.vignetteFx || this.colorMatrixFx);
    } catch (error) {
      console.warn("[PostFxSystem] Failed to create postFX, disabling:", error);
      this._removeFx();
      this.enabled = false;
      this.available = false;
      return false;
    }

    if (this.available) {
      this._onUpdate = (time) => this._tick(time);
      this.scene.events.on(Phaser.Scenes.Events.UPDATE, this._onUpdate);
    }
    return this.available;
  }

  /** Current depth of the player in meters (tiles below the surface). */
  _getDepthMeters() {
    const scene = this.scene;
    const ts = scene.config?.tileSize;
    const topAirRows = scene.config?.topAirRows;
    const playerY = scene.player?.y;
    if (!Number.isFinite(ts) || !Number.isFinite(playerY)) return 0;
    return Math.max(0, Math.floor(playerY / ts) - (topAirRows || 0));
  }

  _tick(time) {
    if (!this.available) return;
    if (time - this._lastUpdateAt < this.config.updateIntervalMs) return;
    this._lastUpdateAt = time;

    // Auto-disable on sustained low FPS — polish must never cost playability.
    const fps = this.scene.game?.loop?.actualFps || 60;
    if (fps < this.config.disableBelowFps) {
      this._lowFpsChecks++;
      if (this._lowFpsChecks >= this.config.lowFpsChecksToDisable) {
        console.warn("[PostFxSystem] Sustained low FPS — disabling postFX for this session.");
        this.destroy();
        return;
      }
    } else {
      this._lowFpsChecks = 0;
    }

    const depthCfg = this.config.depth;
    const depthMeters = this._getDepthMeters();
    const target = clamp01(
      (depthMeters - depthCfg.startMeters) / Math.max(1, depthCfg.fullMeters - depthCfg.startMeters)
    );
    this._depthBlend = lerp(this._depthBlend, target, this.config.lerpFactor);
    this._apply(this._depthBlend);
  }

  _apply(blend) {
    const v = this.config.vignette;
    if (this.vignetteFx && v?.enabled) {
      this.vignetteFx.radius = lerp(v.surfaceRadius, v.deepRadius, blend);
      this.vignetteFx.strength = lerp(v.surfaceStrength, v.deepStrength, blend);
    }
    const g = this.config.grading;
    if (this.colorMatrixFx && g?.enabled) {
      const saturation = lerp(g.surfaceSaturation, g.deepSaturation, blend);
      const brightness = lerp(g.surfaceBrightness, g.deepBrightness, blend);
      this.colorMatrixFx.reset();
      this.colorMatrixFx.saturate(saturation, true);
      this.colorMatrixFx.brightness(brightness, true);
    }
  }

  _removeFx() {
    const camera = this.scene.cameras?.main;
    try {
      if (camera?.postFX) {
        if (this.vignetteFx) camera.postFX.remove(this.vignetteFx);
        if (this.colorMatrixFx) camera.postFX.remove(this.colorMatrixFx);
      }
    } catch (_) { /* camera may already be gone during shutdown */ }
    this.vignetteFx = null;
    this.colorMatrixFx = null;
  }

  destroy() {
    if (this._onUpdate) {
      this.scene.events.off(Phaser.Scenes.Events.UPDATE, this._onUpdate);
      this._onUpdate = null;
    }
    this._removeFx();
    this.available = false;
  }
}