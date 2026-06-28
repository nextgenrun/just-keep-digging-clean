/**
 * BiomeSystem - Applies a full-screen color overlay based on player depth.
 * Smoothly transitions between biome tint zones as the player descends.
 * No new sprites needed — purely a screen-space color overlay.
 */
import { LIGHT_CONFIG } from "../../values/lightConfig.js";

export default class BiomeSystem {
  constructor(scene, config, worldModel) {
    this.scene = scene;
    this.config = config;
    this.worldModel = worldModel;

    // Biome zone definitions
    this.biomes = [
      { minDepth: 0,    maxDepth: 200,  color: 0x000000, alpha: 0,     name: 'surface' },
      { minDepth: 200,  maxDepth: 500,  color: 0x1A2A44, alpha: 0.15, name: 'blueCavern' },
      { minDepth: 500,  maxDepth: 900,  color: 0x442A0A, alpha: 0.18, name: 'amberDepths' },
      { minDepth: 900,  maxDepth: 1300, color: 0x2A0A44, alpha: 0.2,  name: 'crystalVoid' },
      { minDepth: 1300, maxDepth: 1600, color: 0x444466, alpha: 0.12, name: 'silverVein' },
      { minDepth: 1600, maxDepth: 2000, color: 0x44110A, alpha: 0.22, name: 'theCore' },
    ];

    // Current overlay state (lerp targets)
    this._currentColor = 0x000000;
    this._currentAlpha = 0;

    // Create overlay rectangle covering the full screen
    this._overlay = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      this._currentColor,
      this._currentAlpha
    );
    this._overlay.setScrollFactor(0).setDepth(LIGHT_CONFIG.biomeRenderDepth);
    this._overlay.setAlpha(0);

    // Track biome depth for smooth transitions
    this._targetColor = 0x000000;
    this._targetAlpha = 0;
  }

  /**
   * Update the biome overlay based on player depth
   * @param {number} depth - Current player depth in tiles
   */
  update(depth) {
    if (!this._overlay || !this._overlay.active) return;

    // Find the current biome zone
    let targetColor = 0x000000;
    let targetAlpha = 0;

    for (const biome of this.biomes) {
      if (depth >= biome.minDepth && depth < biome.maxDepth) {
        targetColor = biome.color;
        targetAlpha = biome.alpha;
        break;
      }
    }

    // Edge case: at or beyond max depth
    if (depth >= this.biomes[this.biomes.length - 1].maxDepth) {
      const last = this.biomes[this.biomes.length - 1];
      targetColor = last.color;
      targetAlpha = last.alpha;
    }

    // Smooth lerp toward target
    const lerpFactor = 0.02;
    this._currentColor = this._lerpColor(this._currentColor, targetColor, lerpFactor);
    this._currentAlpha = this._currentAlpha + (targetAlpha - this._currentAlpha) * lerpFactor;

    // Apply to overlay
    this._overlay.setFillStyle(this._currentColor, this._currentAlpha);
  }

  /**
   * Clean up all resources
   */
  destroy() {
    if (this._overlay) {
      this._overlay.destroy();
      this._overlay = null;
    }
  }

  /**
   * Linearly interpolate between two hex colors
   * @private
   */
  _lerpColor(a, b, t) {
    const ar = (a >> 16) & 0xff;
    const ag = (a >> 8) & 0xff;
    const ab = a & 0xff;
    const br = (b >> 16) & 0xff;
    const bg = (b >> 8) & 0xff;
    const bb = b & 0xff;
    const rr = Math.round(ar + (br - ar) * t);
    const rg = Math.round(ag + (bg - ag) * t);
    const rb = Math.round(ab + (bb - ab) * t);
    return (rr << 16) | (rg << 8) | rb;
  }
}
