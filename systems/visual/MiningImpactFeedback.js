import { MINING_IMPACT_POLISH_CONFIG as CONFIG, resolveMiningImpactPolish } from "../../values/miningImpactPolish.js";
import { GAMEFEEL_CONFIG } from "../../values/gamefeel.js";
import { CAMERA_SHAKE_SIGNATURES } from "../../values/cameraShake.js";
import { getMaterialFeedback, getMineShakeSignature } from "../../values/materialFeedback.js";
import { resolveTileDestructionFamily } from "../../values/tileDestructionFx.js";

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

/** Own a brief contact-pose hold and dispatch exactly one same-frame camera impulse. */
export class MiningImpactFeedback {
  constructor(scene, player, controller, options = {}) {
    this.scene = scene;
    this.player = player;
    this.controller = controller;
    this.flags = resolveMiningImpactPolish(options.search);
    this.reducedMotion = options.reducedMotion
      ?? globalThis.matchMedia?.(CONFIG.reducedMotionMediaQuery)?.matches === true;
    this.hold = null;
    this.lastHoldAt = -Infinity;
    this._update = time => this.update(time);
    this._cancel = () => this.release();
    scene.events?.on(CONFIG.events.preUpdate, this._update);
    scene.events?.on(CONFIG.events.pause, this._cancel);
    scene.events?.on(CONFIG.events.sleep, this._cancel);
  }

  get enabled() { return this.flags.enabled; }
  get holding() { return this.hold !== null; }
  now() { return this.frameTime ?? this.scene.time?.now ?? this.scene.game?.loop?.now ?? 0; }
  safe() {
    const fps = Number(this.scene.game?.loop?.actualFps);
    return this.flags.enabled && !this.reducedMotion
      && (!Number.isFinite(fps) || fps <= 0 || fps >= GAMEFEEL_CONFIG.shake.minFps);
  }

  prepare(event, tileType, destroyed) {
    const state = this.player?.anims;
    const now = this.now(), cfg = CONFIG.hitstop;
    // Never manufacture/rewind a pose for a watchdog or skipped-frame contact.
    const frame = state?.currentFrame;
    const actualFrame = state?.currentAnim?.frames?.[event.contactSequenceIndex]?.textureFrame
      ?? event.contactFrame;
    if (!this.safe() || !this.flags.hitstop || this.holding
      || (event.trigger && event.trigger !== CONFIG.hitstop.authoredTrigger)
      || now - this.lastHoldAt < cfg.minimumIntervalMs
      || state?.currentAnim?.key !== event.animationKey
      || Number(frame?.textureFrame) !== Number(actualFrame)
      || state.isPlaying !== true || state.isPaused === true
      || typeof state.pause !== "function" || typeof state.resume !== "function") return 0;
    const family = resolveTileDestructionFamily(tileType);
    const movement = Math.abs(this.controller?.physicsBody?.vx || 0) > cfg.movingThresholdPxPerSec
      ? cfg.movingScale : 1;
    const frameMs = (state.msPerFrame || state.currentAnim?.msPerFrame || cfg.fallbackFrameMs)
      / Math.max(Number.EPSILON, state.timeScale || 1);
    const durationMs = Math.min(cfg.maximumMs, frameMs * cfg.maximumFrameRatio,
      Math.max(cfg.minimumMs, ((cfg.durationByFamily[family] || cfg.minimumMs)
        + (destroyed ? cfg.breakBonusMs : 0)) * movement));
    this.hold = { state, animation: state.currentAnim, frame, until: now + durationMs, durationMs };
    this.lastHoldAt = now;
    state.pause();
    return durationMs;
  }

  present(impact, { tileType, destroyed, hitstopMs = 0 }) {
    const family = resolveTileDestructionFamily(tileType);
    const signature = getMineShakeSignature(tileType);
    const material = getMaterialFeedback(tileType);
    const baseIntensity = CAMERA_SHAKE_SIGNATURES.mining[signature.split(".")[1]]?.intensity || 1;
    const scale = Math.min(CONFIG.shake.maximumIntensityPx / baseIntensity,
      (destroyed ? CONFIG.shake.breakScale : CONFIG.shake.hitScale)
      * (material.shakeScale || 1) * clamp(impact.strength, 0, 1));
    const shake = this.safe() && this.flags.shake
      && this.scene.shakeSystem?.shake?.(signature, scale, {
        renderImpulse: true, direction: impact.normal, applyImmediately: true,
      }) === true;
    return { family, hitstopMs, holding: this.holding, shake, signature,
      intensityPx: shake ? (this.scene.shakeSystem?.getStatus?.().intensity ?? baseIntensity * scale) : 0,
      reducedMotion: this.reducedMotion };
  }

  update(time) {
    if (Number.isFinite(time)) this.frameTime = time;
    if (!this.hold) return;
    if (!this.safe() || this.now() >= this.hold.until
      || this.player?.anims !== this.hold.state
      || this.hold.state.currentAnim !== this.hold.animation
      || this.hold.state.currentFrame !== this.hold.frame) this.release();
  }

  release() {
    const hold = this.hold;
    this.hold = null;
    // Own only our pause. Never resume a replacement action or the Phaser scene.
    if (hold && this.player?.anims === hold.state
      && hold.state.currentAnim === hold.animation && hold.state.currentFrame === hold.frame
      && hold.state.isPaused === true) hold.state.resume();
  }

  destroy() {
    this.release();
    this.scene?.events?.off(CONFIG.events.preUpdate, this._update);
    this.scene?.events?.off(CONFIG.events.pause, this._cancel);
    this.scene?.events?.off(CONFIG.events.sleep, this._cancel);
  }
}
