import {
  PLAYER_ANIMATION_POLISH,
  isPlayerAnimationFeatureEnabled,
} from "../../values/playerAnimationPolish.js";

export function shouldUseLegacyPostActionRecovery(
  profile,
  authoredRecoveryStarted = false,
) {
  return profile?.preferAuthoredActionRecovery !== true
    || authoredRecoveryStarted !== true;
}

export class UalActionRecoverySelector {
  constructor(
    profile,
    search = globalThis.location?.search || "",
  ) {
    this.profile = profile;
    this.config = profile?.animationPolishConfig || PLAYER_ANIMATION_POLISH;
    this.feature = this.config.actionRecovery;
    this.enabled = Boolean(
      profile?.actionRecoveryAnimationByCompletedAnimation
      && isPlayerAnimationFeatureEnabled(this.feature, search, this.config),
    );
    this.reset();
  }

  reset() {
    this._active = null;
    return this;
  }

  begin(completedAnimationKey, flipX = false, {
    holdUntilMs = null,
    holdCompletedAnimation = false,
  } = {}) {
    if (!this.enabled) return false;
    const recoveryAnimationKey = this.profile
      ?.actionRecoveryAnimationByCompletedAnimation
      ?.[completedAnimationKey];
    if (!recoveryAnimationKey) return false;
    const holdsCompletedAnimation = holdCompletedAnimation === true;
    const animationKey = holdsCompletedAnimation
      ? completedAnimationKey
      : recoveryAnimationKey;
    const finiteHoldUntilMs = Number(holdUntilMs);
    this._active = {
      animationKey,
      flipX: flipX === true,
      observedPlaying: holdsCompletedAnimation,
      completed: holdsCompletedAnimation,
      holdsCompletedAnimation,
      holdUntilMs: Number.isFinite(finiteHoldUntilMs)
        ? finiteHoldUntilMs
        : -Infinity,
    };
    return true;
  }

  resolve({
    moving = false,
    currentAnimationKey = null,
    isPlaying = false,
    nowMs = Number.POSITIVE_INFINITY,
  } = {}) {
    const active = this._active;
    if (!this.enabled || !active) return null;
    if (moving) {
      this._active = null;
      return null;
    }
    if (currentAnimationKey === active.animationKey && isPlaying) {
      active.observedPlaying = true;
    }
    if (
      active.observedPlaying
      && currentAnimationKey === active.animationKey
      && isPlaying !== true
    ) {
      active.completed = true;
    }
    if (active.completed) {
      if (currentAnimationKey !== active.animationKey) {
        this._active = null;
        return null;
      }
      if (Number.isFinite(nowMs) && nowMs < active.holdUntilMs) {
        return {
          animationKey: active.animationKey,
          flipX: active.flipX,
          kind: active.holdsCompletedAnimation
            ? "action-cooldown-hold"
            : "action-settle-hold",
          restart: false,
          holdCompleted: true,
        };
      }
      this._active = null;
      return null;
    }
    if (
      active.observedPlaying
      && (
        currentAnimationKey !== active.animationKey
        || isPlaying !== true
      )
    ) {
      this._active = null;
      return null;
    }
    return {
      animationKey: active.animationKey,
      flipX: active.flipX,
      kind: "action-settle",
      restart: !active.observedPlaying,
    };
  }

  onAnimationComplete(animationKey, nowMs = Number.POSITIVE_INFINITY) {
    if (this._active?.animationKey !== animationKey) return false;
    this._active.observedPlaying = true;
    this._active.completed = true;
    if (Number.isFinite(nowMs) && nowMs < this._active.holdUntilMs) return true;
    this._active = null;
    return true;
  }

  get animationKeys() {
    if (!this.enabled) return [];
    return Array.from(new Set(
      Object.values(this.profile.actionRecoveryAnimationByCompletedAnimation),
    ));
  }
}
