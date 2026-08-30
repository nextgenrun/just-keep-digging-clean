/**
 * CameraShakeSystem
 * ─────────────────
 * Unified signature dispatcher for mining, earthquakes, thunder, combos, and
 * one-shot impacts. Each event owns its duration, intensity, frequency, decay,
 * priority, and optional companion flash.
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

import {
  CAMERA_SHAKE_DEFAULT_ENABLED_BY_GROUP,
  CAMERA_SHAKE_DEFAULT_FLASH_ENABLED,
  CAMERA_SHAKE_SIGNATURES,
  CAMERA_SHAKE_EVENT_GROUPS,
} from "../../values/cameraShake.js";
import { GAMEFEEL_CONFIG } from "../../values/gamefeel.js";
import { resolveCameraShakeOffset } from "./cameraShakeMath.js";

export class CameraShakeSystem {
  /**
   * @param {Phaser.Scene} scene
   * @param {Object} [config] - signature map; defaults to CAMERA_SHAKE_SIGNATURES
   * @param {Object} [options]
   * @param {Function} [options.getDisplaySettings] - optional lazy settings getter
   */
  constructor(scene, config = CAMERA_SHAKE_SIGNATURES, options = {}) {
    this.scene = scene;
    this.config = config;
    this._options = options || {};

    // Active shake state — only one at a time, priority decides replacement.
    // { name, group, startTime, duration, intensity, freqX, freqY, decay, priority }
    this._active = null;
    this._getDisplaySettings = typeof this._options.getDisplaySettings === "function"
      ? this._options.getDisplaySettings
      : null;
    this._defaultGroups = CAMERA_SHAKE_DEFAULT_ENABLED_BY_GROUP;
    this._runtimeConfig = GAMEFEEL_CONFIG.shake;

    // Fallback detection: Phaser 3.60+ has camera.setFollowOffset
    this._hasFollowOffset = typeof scene.cameras.main.setFollowOffset === "function";
  }

  _readDisplaySettings() {
    try {
      return this._getDisplaySettings?.();
    } catch (_) {
      return null;
    }
  }

  _resolveEventGroup(signatureName) {
    if (!signatureName) return "";
    const root = String(signatureName).split(".")[0];
    return CAMERA_SHAKE_EVENT_GROUPS[root] || root;
  }

  _getGroupEnabled(displaySettings, group) {
    const defaults = this._defaultGroups;
    const fallback = defaults[group];
    if (typeof fallback !== "boolean") return true;

    const groups = displaySettings?.cameraShakeGroups;
    if (!groups || typeof groups !== "object" || !(group in groups)) {
      return fallback;
    }
    return Boolean(groups[group]);
  }

  _getMasterEnabled(displaySettings) {
    if (displaySettings == null) return true;
    return displaySettings.cameraShakeEnabled !== false;
  }

  _getIntensityMultiplier(displaySettings) {
    const raw = displaySettings?.cameraShakeIntensity;
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return 1;
    return Math.max(0, numeric);
  }

  _getFlashEnabled(displaySettings) {
    if (displaySettings == null) return CAMERA_SHAKE_DEFAULT_FLASH_ENABLED;
    return displaySettings.cameraShakeFlashEnabled !== false;
  }

  _isFrameRateSafe() {
    const minFps = Number(this._runtimeConfig?.minFps);
    const actualFps = Number(this.scene.game?.loop?.actualFps);
    return !Number.isFinite(minFps)
      || minFps <= 0
      || !Number.isFinite(actualFps)
      || actualFps <= 0
      || actualFps >= minFps;
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

    const displaySettings = this._readDisplaySettings();
    if (!this._getMasterEnabled(displaySettings)) {
      return false;
    }
    if (!this._isFrameRateSafe()) return false;

    const group = this._resolveEventGroup(signatureName);
    if (!this._getGroupEnabled(displaySettings, group)) {
      return false;
    }

    const safeIntensityScale = Number.isFinite(intensityScale) ? intensityScale : 1;
    const safeDurationScale = Number.isFinite(options.durationScale) ? options.durationScale : 1;
    const safeMasterScale = this._getIntensityMultiplier(displaySettings);
    const duration = Math.max(
      this._runtimeConfig.minimumDurationMs,
      sig.duration * Math.max(this._runtimeConfig.minimumDurationScale, safeDurationScale),
    );
    const intensity = Math.max(
      0,
      sig.intensity * safeMasterScale * Math.max(0, safeIntensityScale),
    );
    if (!Number.isFinite(intensity) || intensity <= 0) {
      return false;
    }

    const now = this.scene.time?.now ?? globalThis.performance?.now?.() ?? Date.now();
    const nextPriority = sig.priority ?? 0;
    const activePriority = this._active?.priority ?? -Infinity;
    const duplicateElapsedMs = now - (this._active?.startTime ?? -Infinity);
    if (
      this._active
      && !options.force
      && this._active.name === signatureName
      && duplicateElapsedMs >= 0
      && duplicateElapsedMs <= this._runtimeConfig.duplicateMergeWindowMs
      && duplicateElapsedMs < this._active.duration
    ) {
      this._active.duration = Math.max(this._active.duration, duration);
      this._active.intensity = Math.max(this._active.intensity, intensity);
      return true;
    }
    if (this._active && !options.force && activePriority > nextPriority) {
      return false;
    }

    // Stop any in-flight Phaser shake so it doesn't fight our offset.
    const cam = this.scene.cameras?.main;
    if (cam && cam.shakeEffect?.isRunning) {
      try { cam.shakeEffect.stop(); } catch (_) { /* ignore */ }
    }

    this._active = {
      name: signatureName,
      group,
      startTime: now,
      duration,
      intensity,
      freqX: sig.freqX ?? this._runtimeConfig.defaultFrequencyXHz,
      freqY: sig.freqY ?? this._runtimeConfig.defaultFrequencyYHz,
      decay: sig.decay ?? "exp",
      priority: nextPriority,
    };

    // Companion screen flash if the signature has a color
    if (sig.color && this._getFlashEnabled(displaySettings) && this.scene.screenFlashSystem) {
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
    const displaySettings = this._readDisplaySettings();
    if (!this._getMasterEnabled(displaySettings)) {
      this.stop();
      return;
    }
    if (!this._isFrameRateSafe()) {
      this.stop();
      return;
    }
    if (!this._getGroupEnabled(displaySettings, this._active.group)) {
      this.stop();
      return;
    }

    const cam = this.scene.cameras?.main;
    if (!cam) return;

    const shake = this._active;
    const elapsedMs = Math.max(0, time - shake.startTime);
    const t = elapsedMs / shake.duration;

    if (t >= 1) {
      // End the shake cleanly
      this._active = null;
      if (this._hasFollowOffset) {
        try { cam.setFollowOffset(0, 0); } catch (_) { /* ignore */ }
      }
      return;
    }

    const { offsetX, offsetY } = resolveCameraShakeOffset(
      shake,
      elapsedMs,
      t,
      this._runtimeConfig,
    );

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
      group: this._active ? this._active.group : null,
      priority: this._active ? this._active.priority : null,
      intensity: this._active ? this._active.intensity : 0,
      durationMs: this._active ? this._active.duration : 0,
      hasFollowOffset: this._hasFollowOffset,
    };
  }
}
