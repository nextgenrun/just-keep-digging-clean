import { buildTimeline, resolveTimelineFrame } from "./labScenarios.js";
import { adjacentFrameTime, frameStartUnits } from "./labFrameTiming.js";

export class LabPlayback {
  constructor(state, assets) {
    this.state = state;
    this.assets = assets;
    this.elapsedSeconds = 0;
    this.lastTimestamp = performance.now();
    this.timeline = buildTimeline(state, assets);
    this.wrapped = false;
  }

  rebuild({ preserveProgress = true } = {}) {
    const previous = preserveProgress && this.timeline.duration > 0 ? this.snapshot() : null;
    const progress = this.timeline.duration > 0 ? this.elapsedSeconds / this.timeline.duration : 0;
    this.timeline = buildTimeline(this.state, this.assets);
    const anchor = previous && (this.timeline.segments.find((segment) => (
      segment.phase === previous.segment.phase
      && segment.clip.actionId === previous.segment.clip.actionId
      && segment.clip.frames.includes(previous.sourceFrame)
    )) || this.timeline.segments.find((segment) => (
      segment.clip.actionId === previous.segment.clip.actionId
      && segment.clip.frames.includes(previous.sourceFrame)
    )));
    if (anchor) {
      const sameClipOccurrence = anchor.clip.id === previous.segment.clip.id
        && previous.sequenceIndex < anchor.clip.frames.length
        && anchor.clip.frames[previous.sequenceIndex] === previous.sourceFrame;
      const index = sameClipOccurrence ? previous.sequenceIndex : anchor.clip.frames.indexOf(previous.sourceFrame);
      this.elapsedSeconds = anchor.start
        + frameStartUnits(anchor.frameHolds, index) / 30 / Math.max(0.01, anchor.timeScale)
        + 0.00001;
    } else this.elapsedSeconds = preserveProgress ? progress * this.timeline.duration : 0;
    this.elapsedSeconds = Math.min(this.elapsedSeconds, this.timeline.duration);
    this.lastTimestamp = performance.now();
  }

  tick(timestamp) {
    const delta = Math.min(0.1, Math.max(0, (timestamp - this.lastTimestamp) / 1000));
    this.lastTimestamp = timestamp;
    this.wrapped = false;
    if (this.state.playing) {
      this.elapsedSeconds += delta * this.state.playbackRate;
      if (this.elapsedSeconds >= this.timeline.duration) {
        this.elapsedSeconds %= this.timeline.duration;
        this.wrapped = true;
      }
    }
    return this.snapshot();
  }

  snapshot() {
    return {
      ...resolveTimelineFrame(this.timeline, this.elapsedSeconds),
      elapsedSeconds: this.elapsedSeconds,
      totalSeconds: this.timeline.duration,
      wrapped: this.wrapped,
    };
  }

  seek(seconds) {
    this.elapsedSeconds = Math.min(this.timeline.duration, Math.max(0, Number(seconds) || 0));
    this.lastTimestamp = performance.now();
    return this.snapshot();
  }

  restart() {
    return this.seek(0);
  }

  step(direction) {
    this.state.playing = false;
    return this.seek(adjacentFrameTime(this.timeline, this.elapsedSeconds, direction));
  }
}
