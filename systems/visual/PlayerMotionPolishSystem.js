import { PLAYER_MOTION_POLISH_CONFIG } from "../../values/playerMotionPolish.js";

const finiteTime = (value) => Number.isFinite(value) ? value : 0;

export class PlayerMotionPolishSystem {
  constructor(profile, config = PLAYER_MOTION_POLISH_CONFIG) {
    this.profile = profile;
    this.config = config;
    this.idleFidgets = profile?.idleFidgets || config.idle.fidgets;
    this.enabled = config.enabled === true && profile?.isUalNative === true;
    this.reset(0);
  }

  reset(now = 0) {
    const time = finiteTime(now);
    this._idleStartedAt = null;
    this._nextFidgetAt = null;
    this._fidgetIndex = 0;
    this._repeatDelayIndex = 0;
    this._activeFidget = null;
    this._wallStartedAt = null;
    this._wallLastSeenAt = -Infinity;
    this._wallActive = false;
    this._wallFlipX = false;
    this._impactQueuedUntil = -Infinity;
    this._impactActive = false;
    this._nextImpactAllowedAt = time;
  }

  destroy() {
    this.reset(0);
    this.enabled = false;
  }

  get oneShotAnimationKeys() {
    if (!this.enabled) return [];
    return [
      ...this.idleFidgets.map((fidget) => fidget.key),
      this.profile.earthquakeReactAnim,
    ].filter(Boolean);
  }

  getPostActionRecoverDurationMs() {
    return this.config.postActionRecoverMs;
  }

  isFallingDownward(velocityY) {
    return (Number.isFinite(velocityY) ? velocityY : 0) > this.config.fallingVyThresholdPxPerSec;
  }

  getIdleTimeScale(now) {
    if (!this.enabled) return 1;
    const idle = this.config.idle;
    const midpoint = (idle.breathTimeScaleMin + idle.breathTimeScaleMax) / 2;
    const amplitude = (idle.breathTimeScaleMax - idle.breathTimeScaleMin) / 2;
    const phase = (finiteTime(now) % idle.breathCycleMs) / idle.breathCycleMs;
    return midpoint + Math.sin(phase * Math.PI * 2) * amplitude;
  }

  interruptForAction(now = 0) {
    if (!this.enabled) return;
    this._clearAmbient();
    this._impactActive = false;
    if (finiteTime(now) > this._impactQueuedUntil) this._impactQueuedUntil = -Infinity;
  }

  queueImpactReaction(now = 0) {
    if (!this.enabled || !this.profile.earthquakeReactAnim) return false;
    const time = finiteTime(now);
    if (time < this._nextImpactAllowedAt) return false;
    this._impactQueuedUntil = time + this.config.hitReaction.queueWindowMs;
    this._nextImpactAllowedAt = time + this.config.hitReaction.cooldownMs;
    return true;
  }

  onAnimationComplete(animationKey, now = 0) {
    const time = finiteTime(now);
    if (this._impactActive && animationKey === this.profile.earthquakeReactAnim) {
      this._impactActive = false;
      return true;
    }
    if (this._activeFidget?.key === animationKey) {
      this._activeFidget = null;
      this._idleStartedAt = time;
      this._scheduleRepeatFidget(time);
      return true;
    }
    return false;
  }

  resolveOverride(context = {}) {
    if (!this.enabled) return null;
    const now = finiteTime(context.now);
    if (context.actionLocked) {
      this.interruptForAction(now);
      return null;
    }

    if (!this._impactActive && now <= this._impactQueuedUntil) {
      this._impactActive = true;
      this._impactQueuedUntil = -Infinity;
      this._clearAmbient();
    } else if (!this._impactActive && now > this._impactQueuedUntil) {
      this._impactQueuedUntil = -Infinity;
    }
    if (this._impactActive) {
      return this._override(this.profile.earthquakeReactAnim, context.facingFlipX, "impact");
    }

    const wallOverride = this._resolveWallOverride(now, context);
    if (wallOverride) return wallOverride;

    const verticalAim = context.verticalAim || {};
    const idleEligible = context.idleFidgetAllowed !== false
      && context.motionState === "idle"
      && context.grounded === true
      && verticalAim.up !== true
      && verticalAim.down !== true;
    if (!idleEligible) {
      this._clearIdle();
      return null;
    }

    if (this._activeFidget) {
      return this._override(this._activeFidget.key, context.facingFlipX, "idle-fidget");
    }
    if (this._idleStartedAt === null) {
      this._idleStartedAt = now;
      this._nextFidgetAt = now + this.config.idle.firstFidgetDelayMs;
    }
    if (now < this._nextFidgetAt || this.idleFidgets.length === 0) return null;

    this._activeFidget = this.idleFidgets[this._fidgetIndex % this.idleFidgets.length];
    this._fidgetIndex += 1;
    return this._override(this._activeFidget.key, context.facingFlipX, "idle-fidget");
  }

  _resolveWallOverride(now, context) {
    if (context.wallBlocked === true) {
      this._clearIdle();
      this._wallLastSeenAt = now;
      this._wallFlipX = context.wallFlipX === true;
      if (this._wallStartedAt === null) this._wallStartedAt = now;
      if (now - this._wallStartedAt >= this.config.wallPush.enterDelayMs) {
        this._wallActive = true;
        return this._override(this.profile.wallPushAnim, this._wallFlipX, "wall-push");
      }
      return null;
    }

    const inReleaseGrace = this._wallActive
      && now - this._wallLastSeenAt <= this.config.wallPush.releaseGraceMs;
    if (inReleaseGrace) {
      return this._override(this.profile.wallPushAnim, this._wallFlipX, "wall-push");
    }
    this._wallStartedAt = null;
    this._wallActive = false;
    return null;
  }

  _scheduleRepeatFidget(now) {
    const delays = this.config.idle.repeatDelaysMs;
    const delay = delays[this._repeatDelayIndex % delays.length];
    this._repeatDelayIndex += 1;
    this._nextFidgetAt = now + delay;
  }

  _clearAmbient() {
    this._clearIdle();
    this._wallStartedAt = null;
    this._wallActive = false;
    this._wallLastSeenAt = -Infinity;
  }

  _clearIdle() {
    this._idleStartedAt = null;
    this._nextFidgetAt = null;
    this._activeFidget = null;
  }

  _override(animationKey, flipX, kind) {
    return animationKey ? { animationKey, flipX: flipX === true, kind } : null;
  }
}
