/**
 * HitstopSystem — brief tween-time freeze on impactful events (crit, lucky).
 *
 * Slows scene.tweens.timeScale to near-zero for a few frames, then snaps
 * back to 1.0. Physics is intentionally NOT touched to avoid slide artifacts.
 */
export class HitstopSystem {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this._resumeTimer = null;
  }

  triggerCrit() {
    this._freeze(this.config.critDurationMs);
  }

  triggerLucky() {
    this._freeze(this.config.luckyDurationMs);
  }

  _freeze(durationMs) {
    // Cancel any in-progress freeze so re-entrant events don't stack
    if (this._resumeTimer) {
      this._resumeTimer.remove(false);
      this._resumeTimer = null;
    }
    this.scene.tweens.timeScale = this.config.slowTimeScale;
    this._resumeTimer = this.scene.time.delayedCall(durationMs, () => this._resume());
  }

  _resume() {
    this.scene.tweens.timeScale = this.config.resumeTimeScale;
    this._resumeTimer = null;
  }

  destroy() {
    if (this._resumeTimer) {
      this._resumeTimer.remove(false);
      this._resumeTimer = null;
    }
    // Always restore on cleanup so scene restart isn't left in slow-time
    if (this.scene && this.scene.tweens) {
      this.scene.tweens.timeScale = 1.0;
    }
  }
}
