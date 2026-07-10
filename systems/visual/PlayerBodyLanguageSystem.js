/**
 * PlayerBodyLanguageSystem — squash & stretch micro-animation layer.
 * Gives the player sprite physical "weight": landing squash, fall stretch,
 * and a tiny pop on every dig impact. Applied as a scale multiplier on
 * POST_UPDATE so it composes safely with the game's own setDisplaySize calls.
 * All tunables live in values/gamefeel.js (bodyLanguage section).
 */
import { GAMEFEEL_CONFIG } from "../../values/gamefeel.js";

const clamp01 = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

export class PlayerBodyLanguageSystem {
  constructor(scene, player, config = GAMEFEEL_CONFIG.bodyLanguage) {
    this.scene = scene;
    this.player = player;
    this.config = config || {};
    this.enabled = Boolean(this.config.enabled);
    // Scale multipliers (1 = neutral). Tweened for squash/pop, lerped for stretch.
    this._squash = { x: 1, y: 1 };
    this._stretchY = 1;
    this._activeTween = null;
    this._wasGrounded = true;
    this._lastVy = 0;
    this._onPostUpdate = null;
  }

  create() {
    if (!this.enabled) return;
    if (!this.config.affectLivingDrill && this.scene.playerAssetProfile?.isLivingDrill) {
      this.enabled = false;
      return;
    }
    this._onPostUpdate = () => this._tick();
    this.scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this._onPostUpdate);
  }

  /** Called on every successful dig hit. */
  onDigImpact(destroyed = false) {
    if (!this.enabled) return;
    const amount = destroyed ? this.config.digPopDestroyAmount : this.config.digPopAmount;
    this._punch(1 + amount, 1 + amount, this.config.digPopMs, this.config.digPopEase);
  }

  _onLanded(fallVy) {
    const cfg = this.config;
    const heaviness = clamp01(
      (fallVy - cfg.landSquashMinVy) / Math.max(1, cfg.landSquashMaxVy - cfg.landSquashMinVy)
    );
    const squash = cfg.landSquashAmount + (cfg.landSquashMaxAmount - cfg.landSquashAmount) * heaviness;
    // Volume-preserving: compress Y, widen X
    this._punch(1 + squash * 0.7, 1 - squash, cfg.landRecoverMs, cfg.landRecoverEase);
  }

  _punch(toX, toY, recoverMs, ease) {
    this._activeTween?.stop();
    this._squash.x = toX;
    this._squash.y = toY;
    this._activeTween = this.scene.tweens.add({
      targets: this._squash,
      x: 1,
      y: 1,
      duration: recoverMs,
      ease: ease || "Sine.easeOut",
      onComplete: () => { this._activeTween = null; },
    });
  }

  _getBaseScale() {
    const scene = this.scene;
    const profile = scene.playerAssetProfile;
    if (profile?.isLivingDrill) {
      const s = profile.visualScale || 1;
      return { x: s, y: s };
    }
    const displaySize = profile?.displaySizePx || scene.config?.playerDisplaySizePx;
    const frame = this.player.frame;
    const fw = frame?.realWidth || this.player.width || 1;
    const fh = frame?.realHeight || this.player.height || 1;
    if (!Number.isFinite(displaySize) || displaySize <= 0) {
      return { x: this.player.scaleX, y: this.player.scaleY };
    }
    return { x: displaySize / fw, y: displaySize / fh };
  }

  _tick() {
    if (!this.enabled || !this.player?.active) return;
    const cfg = this.config;
    const controller = this.scene.playerController;
    const vy = controller?.physicsBody?.vy ?? 0;
    const grounded = controller?.isGrounded?.() === true;

    // Landing detection — use last airborne downward velocity
    if (grounded && !this._wasGrounded && this._lastVy > cfg.landSquashMinVy) {
      this._onLanded(this._lastVy);
    }
    this._wasGrounded = grounded;
    if (!grounded && vy > 0) this._lastVy = vy;
    else if (grounded) this._lastVy = 0;

    // Fall stretch — smooth, velocity-driven
    let targetStretch = 1;
    if (!grounded && vy > cfg.fallStretchMinVy) {
      const t = clamp01((vy - cfg.fallStretchMinVy) / Math.max(1, cfg.fallStretchMaxVy - cfg.fallStretchMinVy));
      targetStretch = 1 + cfg.fallStretchAmount * t;
    }
    this._stretchY += (targetStretch - this._stretchY) * cfg.fallStretchLerp;

    // Compose: base display scale × squash × stretch
    const mx = this._squash.x * (2 - this._stretchY); // slight narrowing while stretching
    const my = this._squash.y * this._stretchY;
    if (Math.abs(mx - 1) < 0.002 && Math.abs(my - 1) < 0.002) return; // neutral — leave game's scale alone
    const base = this._getBaseScale();
    this.player.setScale(base.x * mx, base.y * my);
  }

  destroy() {
    if (this._onPostUpdate) {
      this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this._onPostUpdate);
      this._onPostUpdate = null;
    }
    this._activeTween?.stop();
    this._activeTween = null;
    this.enabled = false;
  }
}