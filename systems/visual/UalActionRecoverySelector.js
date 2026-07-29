import {
  PLAYER_ANIMATION_POLISH,
  isPlayerAnimationFeatureEnabled,
} from "../../values/playerAnimationPolish.js";

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

  begin(completedAnimationKey, flipX = false) {
    if (!this.enabled) return false;
    const animationKey = this.profile
      ?.actionRecoveryAnimationByCompletedAnimation
      ?.[completedAnimationKey];
    if (!animationKey) return false;
    this._active = {
      animationKey,
      flipX: flipX === true,
      observedPlaying: false,
    };
    return true;
  }

  resolve({
    moving = false,
    currentAnimationKey = null,
    isPlaying = false,
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

  onAnimationComplete(animationKey) {
    if (this._active?.animationKey !== animationKey) return false;
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
