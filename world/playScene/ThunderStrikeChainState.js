import {
  THUNDER_STRIKE_CHAIN_CONFIG,
  THUNDER_STRIKE_CHAIN_PHASES,
  getThunderStrikeStage,
} from "../../values/thunderStrikeChain.js";

const clamp01 = (value) => Math.max(0, Math.min(1, value));

export class ThunderStrikeChainState {
  constructor(config = THUNDER_STRIKE_CHAIN_CONFIG) {
    this.config = config;
    this.reset();
  }

  reset() {
    this.phase = THUNDER_STRIKE_CHAIN_PHASES.IDLE;
    this.currentStageIndex = 0;
    this.completedStageIndex = -1;
    this.challengeStageIndex = null;
    this.challengeStartMs = 0;
    this.challengeTargetMs = 0;
    this.challengeEndMs = 0;
    this.lastTimingErrorMs = null;
  }

  beginCharge(nowMs = 0) {
    this.reset();
    this.phase = THUNDER_STRIKE_CHAIN_PHASES.CHARGE;
    this.startedAtMs = nowMs;
    return this.getSnapshot(nowMs);
  }

  markSlamStarted(stageIndex, nowMs = 0) {
    const validInitial = stageIndex === 0
      && this.phase === THUNDER_STRIKE_CHAIN_PHASES.CHARGE;
    const validFollowUp = stageIndex === this.challengeStageIndex
      && this.phase === THUNDER_STRIKE_CHAIN_PHASES.READY;
    if (!validInitial && !validFollowUp) return false;
    this.currentStageIndex = stageIndex;
    this.phase = THUNDER_STRIKE_CHAIN_PHASES.STRIKE;
    this.slamStartedAtMs = nowMs;
    return true;
  }

  beginContinuation(nowMs = 0) {
    this.completedStageIndex = Math.max(this.completedStageIndex, this.currentStageIndex);
    const nextStageIndex = this.currentStageIndex + 1;
    if (nextStageIndex >= this.config.stages.length) {
      this.phase = THUNDER_STRIKE_CHAIN_PHASES.COMPLETE;
      this.challengeStageIndex = null;
      return { complete: true, snapshot: this.getSnapshot(nowMs) };
    }

    const timing = getThunderStrikeStage(nextStageIndex).timing;
    this.challengeStageIndex = nextStageIndex;
    this.challengeStartMs = nowMs;
    this.challengeTargetMs = nowMs + timing.durationMs * timing.targetProgress;
    this.challengeEndMs = nowMs + timing.durationMs;
    this.lastTimingErrorMs = null;
    this.phase = THUNDER_STRIKE_CHAIN_PHASES.TIMING;
    return { complete: false, snapshot: this.getSnapshot(nowMs) };
  }

  attemptContinuation(nowMs = 0) {
    if (this.phase !== THUNDER_STRIKE_CHAIN_PHASES.TIMING) {
      return { success: false, reason: "not-timing", snapshot: this.getSnapshot(nowMs) };
    }
    const stage = getThunderStrikeStage(this.challengeStageIndex);
    const errorMs = nowMs - this.challengeTargetMs;
    this.lastTimingErrorMs = errorMs;
    if (Math.abs(errorMs) > stage.timing.windowMs / 2) {
      this.phase = THUNDER_STRIKE_CHAIN_PHASES.FAILED;
      return { success: false, reason: "miss", errorMs, snapshot: this.getSnapshot(nowMs) };
    }
    this.phase = THUNDER_STRIKE_CHAIN_PHASES.READY;
    return {
      success: true,
      stageIndex: this.challengeStageIndex,
      errorMs,
      snapshot: this.getSnapshot(nowMs),
    };
  }

  update(nowMs = 0) {
    if (
      this.phase === THUNDER_STRIKE_CHAIN_PHASES.TIMING
      && nowMs > this.challengeEndMs
    ) {
      this.phase = THUNDER_STRIKE_CHAIN_PHASES.FAILED;
      this.lastTimingErrorMs = nowMs - this.challengeTargetMs;
      return { failed: true, reason: "timeout", snapshot: this.getSnapshot(nowMs) };
    }
    return { failed: false, snapshot: this.getSnapshot(nowMs) };
  }

  getSnapshot(nowMs = 0) {
    const challengeStage = this.challengeStageIndex === null
      ? null
      : getThunderStrikeStage(this.challengeStageIndex);
    const durationMs = challengeStage?.timing?.durationMs || 1;
    const progress = clamp01((nowMs - this.challengeStartMs) / durationMs);
    const halfWindowProgress = challengeStage
      ? (challengeStage.timing.windowMs / durationMs) / 2
      : 0;
    const targetProgress = challengeStage?.timing?.targetProgress || 0;
    return {
      phase: this.phase,
      currentStageIndex: this.currentStageIndex,
      completedStageIndex: this.completedStageIndex,
      challengeStageIndex: this.challengeStageIndex,
      progress,
      targetProgress,
      windowStartProgress: clamp01(targetProgress - halfWindowProgress),
      windowEndProgress: clamp01(targetProgress + halfWindowProgress),
      lastTimingErrorMs: this.lastTimingErrorMs,
      stages: this.config.stages,
    };
  }
}
