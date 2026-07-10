/**
 * DepthMilestoneCinematic — cinematic "moment" system for major depth thresholds.
 *
 * When the player crosses a curated depth (100m, 300m, 500m, 750m, 1000m, 1500m, 2000m),
 * this system plays a short cinematic sequence:
 *   1. Letterbox bars slide in (top + bottom)
 *   2. Brief golden vignette flash
 *   3. Title card slides up showing the milestone name + depth
 *   4. Title holds, then fades out
 *   5. Letterbox bars slide out
 *
 * Camera zoom + time-scale slow are intentionally omitted (see comments in
 * updateCameraSystems — zooming the main camera breaks HUD layout, and
 * time-scale would desync tween timing). These are Phase 3 items pending a
 * two-camera system. The letterbox + title + flash alone feel distinctly AAA.
 *
 * SSOT: all tunables in values/depthCinematicConfig.js
 */
import { DEPTH_CINEMATIC_CONFIG } from "../../values/depthCinematicConfig.js";

const STATES = Object.freeze({
  IDLE: 'idle',
  BARS_IN: 'barsIn',
  HOLD: 'hold',
  TITLE_IN: 'titleIn',
  TITLE_HOLD: 'titleHold',
  TITLE_OUT: 'titleOut',
  BARS_OUT: 'barsOut',
});

export class DepthMilestoneCinematic {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} config - DEPTH_CINEMATIC_CONFIG
   */
  constructor(scene, config = DEPTH_CINEMATIC_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.state = STATES.IDLE;
    this.stateStartMs = 0;
    this._triggeredDepths = new Set();
    this._lastTriggerMs = 0;

    // Visual elements (created lazily on first trigger, reused after)
    this._topBar = null;
    this._bottomBar = null;
    this._titleText = null;
    this._subtitleText = null;
    this._depthText = null;
    this._flashRect = null;
    this._active = false;

    // Bind update
    this._update = this._update.bind(this);
  }

  create() {
    if (!this.config.enabled) return;
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this._update);
  }

  destroy() {
    this.scene?.events?.off?.(Phaser.Scenes.Events.UPDATE, this._update);
    this._destroyVisuals();
  }

  /**
   * Attempt to trigger a cinematic for the given depth.
   * Called from PlaySceneUpdate when a depth milestone is reached.
   * @param {number} depth - current player depth in meters
   * @param {object} milestoneData - { depth, name, reward } from DEPTH_MILESTONES
   * @returns {boolean} true if cinematic was triggered
   */
  trigger(depth, milestoneData) {
    if (!this.config.enabled) return false;
    if (this._active) return false;
    if (!this.config.cinematicDepths.includes(depth)) return false;
    if (this._triggeredDepths.has(depth)) return false;

    // Cooldown guard
    const now = this.scene.time?.now ?? Date.now();
    if (now - this._lastTriggerMs < this.config.cooldownMs) return false;

    // FPS guard
    if (this.config.minFps > 0) {
      const fps = this.scene.game?.loop?.actualFps ?? 60;
      if (fps < this.config.minFps) return false;
    }

    // Overlay guard
    if (this.config.blockDuringOverlays && this._hasBlockingOverlay()) return false;

    this._triggeredDepths.add(depth);
    this._lastTriggerMs = now;
    this._milestoneData = milestoneData;
    this._beginCinematic();
    return true;
  }

  // ── Internal ────────────────────────────────────────────────────────────

  _hasBlockingOverlay() {
    const s = this.scene;
    return Boolean(
      s.shopOverlay?.isVisible ||
      s.levelUpPopup?.visible ||
      s.campfireSystem?.isSelecting?.() ||
      s.milestoneBoardSystem?._isBoardOpen ||
      s.depthGateSystem?.isOpen?.() ||
      s._pillarViewActive ||
      s.uiInventoryPopup?.isOpen
    );
  }

  _beginCinematic() {
    this._active = true;
    this._createVisuals();
    this._setState(STATES.BARS_IN);

    // Golden flash
    if (this._flashRect) {
      this._flashRect.setAlpha(this.config.flashAlpha);
      this.scene.tweens.add({
        targets: this._flashRect,
        alpha: 0,
        duration: this.config.flashDurationMs,
        ease: 'Sine.easeOut',
      });
    }

    // Subtle camera shake for impact (uses existing shake system if available)
    this.scene.shakeSystem?.shake?.("misc.depthMilestone");
  }

  _createVisuals() {
    const cam = this.scene.cameras.main;
    const vw = cam.width;
    const vh = cam.height;
    const barH = Math.round(vh * this.config.barHeightPct);
    const cfg = this.config;

    // Letterbox bars (scrollFactor 0 so they stay fixed on screen)
    if (!this._topBar) {
      this._topBar = this.scene.add.rectangle(vw / 2, -barH / 2, vw, barH, cfg.barColor, cfg.barAlpha)
        .setScrollFactor(0).setDepth(cfg.barDepth).setOrigin(0.5, 0.5);
    }
    if (!this._bottomBar) {
      this._bottomBar = this.scene.add.rectangle(vw / 2, vh + barH / 2, vw, barH, cfg.barColor, cfg.barAlpha)
        .setScrollFactor(0).setDepth(cfg.barDepth).setOrigin(0.5, 0.5);
    }

    // Flash rect
    if (!this._flashRect) {
      this._flashRect = this.scene.add.rectangle(vw / 2, vh / 2, vw, vh, cfg.flashColor, 0)
        .setScrollFactor(0).setDepth(cfg.barDepth - 1).setOrigin(0.5, 0.5);
    }

    // Title card texts
    const m = this._milestoneData || {};
    const titleY = vh * 0.38;

    if (!this._titleText) {
      this._titleText = this.scene.add.text(vw / 2, titleY, '', {
        fontFamily: cfg.titleFont,
        fontSize: cfg.titleFontSize,
        color: cfg.titleColor,
        stroke: cfg.titleStroke,
        strokeThickness: cfg.titleStrokeThickness,
        shadow: { offsetX: cfg.titleShadowX, offsetY: cfg.titleShadowY, color: cfg.titleShadowColor, blur: cfg.titleShadowBlur, fill: true },
      }).setScrollFactor(0).setDepth(cfg.titleDepth).setOrigin(0.5, 0.5).setAlpha(0);
    }

    if (!this._subtitleText) {
      this._subtitleText = this.scene.add.text(vw / 2, titleY + cfg.subtitleOffsetY, '', {
        fontFamily: cfg.titleFont,
        fontSize: cfg.subtitleFontSize,
        color: cfg.subtitleColor,
      }).setScrollFactor(0).setDepth(cfg.titleDepth).setOrigin(0.5, 0.5).setAlpha(0);
    }

    if (!this._depthText) {
      this._depthText = this.scene.add.text(vw / 2, titleY + cfg.depthOffsetY, '', {
        fontFamily: cfg.titleFont,
        fontSize: cfg.depthFontSize,
        color: cfg.depthColor,
      }).setScrollFactor(0).setDepth(cfg.titleDepth).setOrigin(0.5, 0.5).setAlpha(0);
    }

    // Set content
    this._titleText.setText(m.name || 'Milestone');
    this._subtitleText.setText(m.reward || '');
    this._depthText.setText(`${m.depth}m`);

    // Reset positions for animation
    this._titleText.setY(titleY + 30).setAlpha(0);
    this._subtitleText.setAlpha(0);
    this._depthText.setAlpha(0);

    // Position bars off-screen
    this._topBar.setY(-barH / 2);
    this._bottomBar.setY(vh + barH / 2);
  }

  _destroyVisuals() {
    this._topBar?.destroy(); this._topBar = null;
    this._bottomBar?.destroy(); this._bottomBar = null;
    this._titleText?.destroy(); this._titleText = null;
    this._subtitleText?.destroy(); this._subtitleText = null;
    this._depthText?.destroy(); this._depthText = null;
    this._flashRect?.destroy(); this._flashRect = null;
  }

  _setState(newState) {
    this.state = newState;
    this.stateStartMs = this.scene.time?.now ?? Date.now();
  }

  _stateElapsed() {
    return (this.scene.time?.now ?? Date.now()) - this.stateStartMs;
  }

  _update(time, delta) {
    if (!this._active) return;
    const elapsed = this._stateElapsed();
    const cfg = this.config;
    const cam = this.scene.cameras.main;
    const vh = cam.height;
    const barH = Math.round(vh * cfg.barHeightPct);

    switch (this.state) {
      case STATES.BARS_IN: {
        const t = Math.min(1, elapsed / cfg.barsInMs);
        const eased = this._easeOutCubic(t);
        this._topBar.setY(-barH / 2 + eased * barH);
        this._bottomBar.setY(vh + barH / 2 - eased * barH);
        if (t >= 1) this._setState(STATES.HOLD);
        break;
      }
      case STATES.HOLD: {
        if (elapsed >= cfg.holdMs) this._setState(STATES.TITLE_IN);
        break;
      }
      case STATES.TITLE_IN: {
        const t = Math.min(1, elapsed / cfg.titleInMs);
        const eased = this._easeOutCubic(t);
        const titleY = vh * 0.38;
        this._titleText.setY(titleY + 30 - eased * 30).setAlpha(eased);
        if (t >= 1) {
          this._titleText.setY(titleY).setAlpha(1);
          this._setState(STATES.TITLE_HOLD);
        }
        break;
      }
      case STATES.TITLE_HOLD: {
        // Fade in subtitle + depth text shortly after title appears
        const subT = Math.min(1, Math.max(0, (elapsed - 150) / 400));
        this._subtitleText.setAlpha(this._easeOutCubic(subT));
        this._depthText.setAlpha(this._easeOutCubic(subT));
        if (elapsed >= cfg.titleHoldMs) this._setState(STATES.TITLE_OUT);
        break;
      }
      case STATES.TITLE_OUT: {
        const t = Math.min(1, elapsed / cfg.titleOutMs);
        const faded = 1 - t;
        this._titleText.setAlpha(faded);
        this._subtitleText.setAlpha(faded);
        this._depthText.setAlpha(faded);
        if (t >= 1) this._setState(STATES.BARS_OUT);
        break;
      }
      case STATES.BARS_OUT: {
        const t = Math.min(1, elapsed / cfg.barsOutMs);
        const eased = this._easeOutCubic(t);
        this._topBar.setY(barH / 2 - eased * barH * 1.5);
        this._bottomBar.setY(vh - barH / 2 + eased * barH * 1.5);
        if (t >= 1) {
          this._endCinematic();
        }
        break;
      }
    }
  }

  _endCinematic() {
    this._active = false;
    this.state = STATES.IDLE;
    // Hide visuals (keep objects for reuse)
    this._topBar?.setY(-9999);
    this._bottomBar?.setY(-9999);
    this._titleText?.setAlpha(0);
    this._subtitleText?.setAlpha(0);
    this._depthText?.setAlpha(0);
    this._flashRect?.setAlpha(0);
  }

  _easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // ── Public API ───────────────────────────────────────────────────────────

  isActive() { return this._active; }
  getTriggeredDepths() { return [...this._triggeredDepths]; }
}