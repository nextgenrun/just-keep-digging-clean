import { MOVING_SIDE_DIG_ANIMATION } from "../../values/movingSideDigAnimation.js";
import {
  PLAYER_ANIMATION_POLISH,
  isPlayerAnimationFeatureEnabled,
} from "../../values/playerAnimationPolish.js";
import { UAL_NATIVE_LOCOMOTION_PHASES as PHASE } from "../../values/ualNativeLocomotionTransitions.js";

function isDisabledByQuery(search, config) {
  if (typeof search !== "string" || search.length === 0) return false;
  return new URLSearchParams(search).get(config.rollbackQuery) === config.disabledQueryValue;
}

function normalizedFrame(value, count) {
  if (!Number.isFinite(value)) return null;
  return ((Math.floor(value) % count) + count) % count;
}

export class UalGroundPhaseHandoffSelector {
  constructor(
    profile,
    config = profile?.movingSideDigConfig?.phaseHandoff
      || MOVING_SIDE_DIG_ANIMATION.phaseHandoff,
    search = globalThis.location?.search || "",
  ) {
    this.runAnimationKey = profile?.walkRunAnim || null;
    this.idleAnimationKey = profile?.idleAnim || null;
    this.config = config;
    this.phaseEnabled = Boolean(
      this.runAnimationKey
      && config?.enabledByDefault === true
      && !isDisabledByQuery(search, config),
    );
    this.polish = profile?.animationPolishConfig || PLAYER_ANIMATION_POLISH;
    this.bridge = this.polish.groundHandoff;
    this.bridgeEnabled = Boolean(
      this.runAnimationKey
      && this.idleAnimationKey
      && isPlayerAnimationFeatureEnabled(this.bridge, search, this.polish),
    );
    this.enabled = this.phaseEnabled || this.bridgeEnabled;
    this.reset();
  }

  reset() {
    this._pendingResumeFrame = null;
    this._pivotStartFrame = null;
    this._bridgeTransition = null;
    this._wasMoving = false;
    return this;
  }

  requestRunResume(frame) {
    const resolved = normalizedFrame(frame, this.config?.runFrameCount || 1);
    if (!this.phaseEnabled || resolved === null) return false;
    this._pendingResumeFrame = resolved;
    return true;
  }

  resolve({
    moving,
    horizontalSpeed,
    currentAnimationKey,
    currentFrameIndex,
    isPlaying,
    currentTextureFrame,
    previousFacingFlipX,
    nextFacingFlipX,
  } = {}) {
    if (!this.enabled) return null;
    const wasMoving = this._wasMoving;
    this._wasMoving = moving === true;
    const bridgeSelection = this._resolveBridge({
      moving,
      wasMoving,
      currentAnimationKey,
      currentFrameIndex,
      currentTextureFrame,
      isPlaying,
    });
    if (bridgeSelection) return bridgeSelection;
    if (moving !== true) {
      this._pendingResumeFrame = null;
      this._pivotStartFrame = null;
      return null;
    }
    if (!this.phaseEnabled) return null;

    const count = this.config.runFrameCount;
    const currentFrame = normalizedFrame(currentTextureFrame, count);
    const facingChanged = typeof previousFacingFlipX === "boolean"
      && typeof nextFacingFlipX === "boolean"
      && previousFacingFlipX !== nextFacingFlipX;
    const pivotAllowed = Math.abs(Number(horizontalSpeed) || 0)
      >= this.config.pivot.minimumSpeedPxPerSec;

    if (this._pendingResumeFrame !== null) {
      const resumeFrame = this._pendingResumeFrame;
      this._pendingResumeFrame = null;
      if (facingChanged && pivotAllowed) {
        return this._beginPivot((resumeFrame - 1 + count) % count);
      }
      this._pivotStartFrame = null;
      return {
        phase: PHASE.RUN,
        restart: true,
        startFrame: resumeFrame,
      };
    }

    if (
      facingChanged
      && pivotAllowed
      && currentAnimationKey === this.runAnimationKey
      && currentFrame !== null
    ) {
      return this._beginPivot(currentFrame);
    }

    if (this._pivotStartFrame === null) return null;
    if (currentAnimationKey !== this.runAnimationKey || currentFrame === null) {
      this._pivotStartFrame = null;
      return null;
    }
    if (currentFrame === this._pivotStartFrame) {
      return { phase: PHASE.PIVOT_STOP, restart: false, startFrame: null };
    }
    if (currentFrame === (this._pivotStartFrame + 1) % count) {
      return { phase: PHASE.PIVOT_START, restart: false, startFrame: null };
    }
    this._pivotStartFrame = null;
    return null;
  }

  _beginPivot(outgoingFrame) {
    const pivotFrame = this.config.pivot.frameByOutgoingJogFrame[outgoingFrame];
    this._pivotStartFrame = normalizedFrame(pivotFrame, this.config.runFrameCount);
    if (this._pivotStartFrame === null) return null;
    return {
      phase: PHASE.PIVOT_STOP,
      restart: true,
      startFrame: this._pivotStartFrame,
    };
  }

  _resolveBridge({
    moving,
    wasMoving,
    currentAnimationKey,
    currentTextureFrame,
    isPlaying,
  }) {
    if (!this.bridgeEnabled) return null;
    if (this._bridgeTransition) {
      const transition = this._bridgeTransition;
      const contradicted = (transition.kind === "start" && moving !== true)
        || (transition.kind === "stop" && moving === true);
      if (contradicted) {
        this._bridgeTransition = null;
      } else {
        if (currentAnimationKey === transition.animationKey && isPlaying === true) {
          transition.observedPlaying = true;
        }
        if (
          transition.observedPlaying
          && currentAnimationKey === transition.animationKey
          && isPlaying !== true
        ) {
          this._bridgeTransition = null;
          if (transition.kind === "start" && moving === true) {
            return {
              phase: PHASE.RUN,
              restart: true,
              startFrame: this.bridge.resumeJogFrame,
            };
          }
          return null;
        }
        return {
          animationKey: transition.animationKey,
          phase: transition.kind === "start" ? PHASE.WALK_START : PHASE.WALK_STOP,
          restart: !transition.observedPlaying,
          startFrame: null,
          loop: false,
        };
      }
    }

    if (moving === true) {
      if (
        this._pendingResumeFrame !== null
        || currentAnimationKey === this.runAnimationKey
        || wasMoving
      ) return null;
      return this._beginBridge("start", this.bridge.start.key);
    }
    const count = this.bridge.runFrameCount;
    const outgoing = normalizedFrame(currentTextureFrame, count);
    if (
      currentAnimationKey === this.runAnimationKey
      && outgoing !== null
      && (wasMoving || isPlaying === true)
    ) {
      return this._beginBridge(
        "stop",
        this.bridge.stopAnimationKeyByOutgoingJogFrame[outgoing],
      );
    }
    return null;
  }

  _beginBridge(kind, animationKey) {
    if (!animationKey) return null;
    this._bridgeTransition = {
      kind,
      animationKey,
      observedPlaying: false,
    };
    return {
      animationKey,
      phase: kind === "start" ? PHASE.WALK_START : PHASE.WALK_STOP,
      restart: true,
      startFrame: null,
      loop: false,
    };
  }
}
