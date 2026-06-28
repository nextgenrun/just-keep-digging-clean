/**
 * CameraShakeSystem
 * ─────────────────
 * A unified camera-shake dispatcher that gives every event a distinct feel.
 *
 * Replaces scattered Phaser camera shake calls
 * so that:
 *   - Mining hits, earthquakes, thunder, combo milestones, and one-shot
 *     events each have a unique shake "signature" (duration, intensity,
 *     frequency, decay, optional color flash).
 *   - Players can tell them apart at a glance, not get a generic blur.
 *   - We can later add directional shake (earthquake = vertical, thunder =
 *     horizontal) without rewriting every callsite.
 *
 * The shake is implemented via `camera.setFollowOffset(x, y)` which offsets
 * the follow target (Phaser 3.60+). The actual offset is recomputed each
 * frame from the active signature so the amplitude naturally decays and the
 * motion is multi-frequency (organic) rather than Phaser's pure random noise.
 *
 * Usage:
 *   scene.shakeSystem.shake('mining.crit')            // by signature path
 *   scene.shakeSystem.shake('earthquake.major')       // long deep rumble
 *   scene.shakeSystem.shake('weatherThunder.mid', 0.8) // scaled intensity
 *
 * Falls back to offsetting camera scroll if `setFollowOffset`
 * isn't available (Phaser < 3.60).
 */

import { CAMERA_SHAKE_SIGNATURES } from "../../values/cameraShake.js";

export class CameraShakeSystem {
  /**
   * @param {Phaser.Scene} scene
   * @param {Object} [config] - signature map; defaults to CAMERA_SHAKE_SIGNATURES
   */
  constructor(scene, config = CAMERA_SHAKE_SIGNATURES) {
    this.scene = scene;
    this.config = config;

    // Active shake state — only one at a time, priority decides replacement.
    // { name, startTime, duration, intensity, freqX, freqY, decay, priority }
    this._active = null;

    // Fallback detection: Phaser 3.60+ has camera.setFollowOffset
    this._hasFollowOffset = typeof scene.cameras.main.setFollowOffset === "function";
  }

  /**
   * Trigger a shake by signature name.
   * @param {string} signatureName  e.g. 'mining.crit', 'earthquake.major'
   * @param {number} [intensityScale=1]  multiplier on signature intensity
   * @param {Object} [options]
   * @param {number} [options.durationScale=1] multiplier on signature duration
   * @param {boolean} [options.force=false] bypass priority replacement rules
   * @returns {boolean} true if signature was found and shake started
   */
  shake(signatureName, intensityScale = 1, options = {}) {
    const sig = this._lookup(signatureName);
    if (!sig) {
      // Fail loudly in dev, fail silently in prod
      if (typeof console !== "undefined") {
        console.warn(`[CameraShakeSystem] Unknown signature: ${signatureName}`);
      }
      return false;
    }

    const nextPriority = sig.priority ?? 0;
    const activePriority = this._active?.priority ?? -Infinity;
    if (this._active && !options.force && activePriority > nextPriority) {
      return false;
    }

    // Stop any in-flight Phaser shake so it doesn't fight our offset
    const cam = this.scene.cameras?.main;
    if (cam && cam.shakeEffect?.isRunning) {
      try { cam.shakeEffect.stop(); } catch (_) { /* ignore */ }
    }

    const safeIntensityScale = Number.isFinite(intensityScale) ? intensityScale : 1;
    const safeDurationScale = Number.isFinite(options.durationScale) ? options.durationScale : 1;
    const duration = Math.max(20, sig.duration * Math.max(0.2, safeDurationScale));

    this._active = {
      name: signatureName,
      startTime: this.scene.time?.now ?? performance.now(),
      duration,
      intensity: Math.max(0, sig.intensity * Math.max(0, safeIntensityScale)),
      freqX: sig.freqX ?? 0.05,
      freqY: sig.freqY ?? 0.06,
      decay: sig.decay ?? "exp",
      priority: nextPriority,
    };

    // Companion screen flash if the signature has a color
    if (sig.color && this.scene.screenFlashSystem) {
      this.scene.screenFlashSystem._flash(
        sig.color,
        sig.flashAlpha ?? 0.03,
        Math.min(180, duration * 0.6)
      );
    }
    return true;
  }

  /**
   * Cancel any active shake immediately. Restores camera follow offset to zero.
   */
  stop() {
    this._active = null;
    const cam = this.scene.cameras?.main;
    if (!cam) return;
    if (this._hasFollowOffset) {
      try { cam.setFollowOffset(0, 0); } catch (_) { /* ignore */ }
    }
    if (cam.shakeEffect?.isRunning) {
      try { cam.shakeEffect.stop(); } catch (_) { /* ignore */ }
    }
  }

  /**
   * Per-frame update. Should be called from the scene's main update loop
   * (after the camera has computed its follow position).
   * @param {number} time    Phaser game time (ms)
   * @param {number} delta   ms since last frame
   */
  update(time, delta) {
    if (!this._active) return;
    const cam = this.scene.cameras?.main;
    if (!cam) return;

    const shake = this._active;
    const elapsedMs = time - shake.startTime;
    const t = elapsedMs / shake.duration;

    if (t >= 1) {
      // End the shake cleanly
      this._active = null;
      if (this._hasFollowOffset) {
        try { cam.setFollowOffset(0, 0); } catch (_) { /* ignore */ }
      }
      return;
    }

    // Decay factor
    let factor;
    if (shake.decay === "linear") {
      factor = 1 - t;
    } else if (shake.decay === "none") {
      factor = 1;
    } else {
      // 'exp' (default) — fast initial decay, gentle tail
      factor = Math.exp(-t * 3.2);
    }

    // Multi-frequency organic motion: sin + low-freq cos for each axis
    const omegaX = shake.freqX * Math.PI * 2;
    const omegaY = shake.freqY * Math.PI * 2;
    const amp = shake.intensity * factor;

    // Use a small per-axis phase offset so motion isn't perfectly symmetric
    const offsetX = Math.sin(time * omegaX) * amp
                  + Math.sin(time * omegaX * 0.43 + 1.7) * amp * 0.3;
    const offsetY = Math.cos(time * omegaY) * amp
                  + Math.cos(time * omegaY * 0.37 + 0.9) * amp * 0.3;

    if (this._hasFollowOffset) {
      try { cam.setFollowOffset(offsetX, offsetY); } catch (_) { /* fallback below */ }
    } else {
      // Old Phaser: apply offset directly to camera scroll
      // Only works while camera is following
      try {
        cam.scrollX += offsetX;
        cam.scrollY += offsetY;
      } catch (_) { /* ignore */ }
    }
  }

  /** Lookup signature by dotted path, e.g. 'mining.crit' or 'weatherThunder.mid' */
  _lookup(name) {
    if (!name) return null;
    const parts = name.split(".");
    let node = this.config;
    for (const p of parts) {
      if (node == null) return null;
      node = node[p];
    }
    return node;
  }

  /** For debugging / status. */
  getStatus() {
    return {
      active: !!this._active,
      signature: this._active ? this._active.name : null,
      priority: this._active ? this._active.priority : null,
      hasFollowOffset: this._hasFollowOffset,
    };
  }
}
