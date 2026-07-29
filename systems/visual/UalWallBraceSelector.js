import {
  PLAYER_ANIMATION_POLISH,
  isPlayerAnimationFeatureEnabled,
} from "../../values/playerAnimationPolish.js";

const finiteTime = (value) => (Number.isFinite(value) ? value : 0);

export class UalWallBraceSelector {
  constructor(
    profile,
    motionConfig,
    search = globalThis.location?.search || "",
  ) {
    this.profile = profile;
    this.motionConfig = motionConfig?.wallPush || {};
    this.config = profile?.animationPolishConfig || PLAYER_ANIMATION_POLISH;
    this.feature = this.config.wallBrace;
    this.enabled = Boolean(
      profile?.wallPushAnim
      && profile?.wallBraceEnterAnim
      && profile?.wallBraceExitAnim
      && isPlayerAnimationFeatureEnabled(this.feature, search, this.config),
    );
    this.legacyEnabled = Boolean(profile?.wallPushAnim && !this.enabled);
    this.reset();
  }

  reset() {
    this._blockedStartedAt = null;
    this._lastBlockedAt = -Infinity;
    this._phase = null;
    this._flipX = false;
    this._observedPlaying = false;
    this._legacyStartedAt = null;
    this._legacyLastSeenAt = -Infinity;
    this._legacyActive = false;
    this._pendingRunResumeFrame = null;
    return this;
  }

  resolve({
    now = 0,
    blocked = false,
    movingAway = false,
    flipX = false,
    currentAnimationKey = null,
    isPlaying = false,
  } = {}) {
    const time = finiteTime(now);
    if (!this.enabled) {
      return this.legacyEnabled
        ? this._resolveLegacy(time, blocked, flipX)
        : null;
    }
    if (blocked) {
      this._lastBlockedAt = time;
      this._flipX = flipX === true;
      if (this._blockedStartedAt === null) this._blockedStartedAt = time;
      if (this._phase === "exit") this._begin("entry");
      if (
        this._phase === null
        && time - this._blockedStartedAt >= (this.motionConfig.enterDelayMs || 0)
      ) this._begin("entry");
      return this._resolvePhase(currentAnimationKey, isPlaying);
    }

    if (this._phase === null) {
      this._blockedStartedAt = null;
      return null;
    }
    const inReleaseGrace = time - this._lastBlockedAt
      <= (this.motionConfig.releaseGraceMs || 0);
    if (inReleaseGrace) return this._resolvePhase(currentAnimationKey, isPlaying);
    if (movingAway) {
      this.reset();
      this._pendingRunResumeFrame = this.feature.resumeJogFrame ?? 13;
      return null;
    }
    if (this._phase !== "exit") this._begin("exit");
    return this._resolvePhase(currentAnimationKey, isPlaying);
  }

  onAnimationComplete(animationKey) {
    if (this._phase === "entry" && animationKey === this.profile.wallBraceEnterAnim) {
      this._phase = "loop";
      this._observedPlaying = false;
      return true;
    }
    if (this._phase === "exit" && animationKey === this.profile.wallBraceExitAnim) {
      this.reset();
      return true;
    }
    return false;
  }

  get oneShotAnimationKeys() {
    if (!this.enabled) return [];
    return [this.profile.wallBraceEnterAnim, this.profile.wallBraceExitAnim];
  }

  consumeRunResumeFrame() {
    const frame = this._pendingRunResumeFrame;
    this._pendingRunResumeFrame = null;
    return frame;
  }

  _begin(phase) {
    this._phase = phase;
    this._observedPlaying = false;
  }

  _resolvePhase(currentAnimationKey, isPlaying) {
    if (this._phase === null) return null;
    if (this._phase === "loop") {
      return this._selection(this.profile.wallPushAnim, "wall-push", false, true);
    }
    const entry = this._phase === "entry";
    const key = entry ? this.profile.wallBraceEnterAnim : this.profile.wallBraceExitAnim;
    if (currentAnimationKey === key && isPlaying) this._observedPlaying = true;
    if (
      this._observedPlaying
      && currentAnimationKey === key
      && !isPlaying
    ) {
      if (entry) {
        this._phase = "loop";
        this._observedPlaying = false;
        return this._selection(this.profile.wallPushAnim, "wall-push", true, true);
      }
      this.reset();
      return null;
    }
    return this._selection(
      key,
      entry ? "wall-brace-enter" : "wall-brace-exit",
      !this._observedPlaying,
      false,
    );
  }

  _selection(animationKey, kind, restart, loop) {
    return {
      animationKey,
      flipX: this._flipX,
      kind,
      restart,
      loop,
    };
  }

  _resolveLegacy(now, blocked, flipX) {
    if (blocked) {
      this._legacyLastSeenAt = now;
      this._flipX = flipX === true;
      if (this._legacyStartedAt === null) this._legacyStartedAt = now;
      if (now - this._legacyStartedAt >= (this.motionConfig.enterDelayMs || 0)) {
        this._legacyActive = true;
        return this._selection(this.profile.wallPushAnim, "wall-push", false, true);
      }
      return null;
    }
    if (
      this._legacyActive
      && now - this._legacyLastSeenAt <= (this.motionConfig.releaseGraceMs || 0)
    ) return this._selection(this.profile.wallPushAnim, "wall-push", false, true);
    this._legacyStartedAt = null;
    this._legacyActive = false;
    return null;
  }
}
