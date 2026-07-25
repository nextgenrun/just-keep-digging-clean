const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function smoothstep(min, max, value) {
  const t = clamp((value - min) / Math.max(0.0001, max - min), 0, 1);
  return t * t * (3 - (2 * t));
}

function pingPongIndex(index, length) {
  if (length <= 1) return 0;
  const period = (length * 2) - 2;
  const cursor = index % period;
  return cursor < length ? cursor : period - cursor;
}

function resolveFrame(action, motion, elapsedMs) {
  const from = clamp(Math.round(motion.from ?? 0), 0, action.frame_count - 1);
  const to = clamp(Math.round(motion.to ?? action.frame_count - 1), from, action.frame_count - 1);
  const length = (to - from) + 1;
  const raw = Math.floor((elapsedMs / 1000) * action.fps * motion.rate);
  if (motion.mode === "once") return from + Math.min(length - 1, raw);
  if (motion.mode === "pingpong") return from + pingPongIndex(raw, length);
  return from + (raw % length);
}

function resolveSequence(config, elapsedMs) {
  const totalMs = config.sequence.reduce((total, segment) => total + segment.durationMs, 0);
  const cycleMs = elapsedMs % totalMs;
  let cursorMs = 0;
  for (const segment of config.sequence) {
    const endMs = cursorMs + segment.durationMs;
    if (cycleMs < endMs) {
      return {
        phase: segment.phase,
        elapsedMs: cycleMs - cursorMs,
        progress: (cycleMs - cursorMs) / segment.durationMs,
        cycleProgress: cycleMs / totalMs,
      };
    }
    cursorMs = endMs;
  }
  return { phase: "hover", elapsedMs: 0, progress: 0, cycleProgress: 0 };
}

function resolveBoardOpacity(variant, phase, progress) {
  if (variant.boardMode === "off") return 0;
  const target = variant.boardOpacityByPhase[phase] ?? 1;
  if (variant.boardMode === "hybrid") {
    if (phase === "cruise") return 1 + ((target - 1) * smoothstep(0, 0.42, progress));
    if (phase === "boost") return 0.32 * (1 - smoothstep(0, 0.28, progress));
    if (phase === "brake") return target * smoothstep(0, 0.3, progress);
  }
  if (phase === "takeoff") return target * smoothstep(0.05, 0.4, progress);
  if (phase === "land") return target * (1 - smoothstep(0.55, 0.96, progress));
  return target;
}

export class FlightTimeline {
  constructor(config) {
    this.config = config;
    this.elapsedMs = 0;
    this.playing = true;
    this.phaseMode = config.defaultPhaseId;
  }

  update(deltaMs, playbackRate) {
    if (this.playing) this.elapsedMs += Math.min(deltaMs, 80) * playbackRate;
  }

  restart() { this.elapsedMs = 0; }

  step(milliseconds = 1000 / 30) {
    this.playing = false;
    this.elapsedMs += milliseconds;
  }

  setPhase(phaseId) {
    this.phaseMode = phaseId;
    this.restart();
  }

  sample(variant, pack, boostHeld = false) {
    let phaseSample;
    if (this.phaseMode === "sequence") {
      phaseSample = resolveSequence(this.config, this.elapsedMs);
    } else {
      const durationMs = this.config.phasePreviewDurationMs;
      const elapsedMs = this.elapsedMs % durationMs;
      phaseSample = {
        phase: this.phaseMode,
        elapsedMs,
        progress: elapsedMs / durationMs,
        cycleProgress: elapsedMs / durationMs,
      };
    }

    if (boostHeld && !["takeoff", "land"].includes(phaseSample.phase)) {
      phaseSample = {
        phase: "boost",
        elapsedMs: this.elapsedMs % this.config.phasePreviewDurationMs,
        progress: (this.elapsedMs % this.config.phasePreviewDurationMs) / this.config.phasePreviewDurationMs,
        cycleProgress: phaseSample.cycleProgress,
      };
    }

    const motion = this.config.sharedMotion[phaseSample.phase]
      || variant.motionByPhase[phaseSample.phase]
      || variant.motionByPhase.hover;
    const action = pack.actions[motion.action];
    const frameIndex = resolveFrame(action, motion, phaseSample.elapsedMs);
    return {
      ...phaseSample,
      action,
      motion,
      frameIndex,
      boardOpacity: resolveBoardOpacity(variant, phaseSample.phase, phaseSample.progress),
    };
  }
}
