import { PERFORMANCE_TELEMETRY_CONFIG } from "../../values/performanceTelemetryConfig.js";

function defaultNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function pushBounded(values, value, limit) {
  values.push(value);
  while (values.length > limit) values.shift();
}

function round(value, digits) {
  if (!Number.isFinite(value)) return null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function percentile(sortedValues, fraction) {
  if (sortedValues.length === 0) return null;
  const index = Math.max(0, Math.ceil(sortedValues.length * fraction) - 1);
  return sortedValues[Math.min(index, sortedValues.length - 1)];
}

function summarize(values, config) {
  if (values.length === 0) {
    return {
      sampleCount: 0,
      last: null,
      median: null,
      p95: null,
      p99: null,
      max: null,
    };
  }
  const sorted = [...values].sort((left, right) => left - right);
  const digits = config.formatting.precisionDigits;
  return {
    sampleCount: values.length,
    last: round(values[values.length - 1], digits),
    median: round(percentile(sorted, config.percentiles.median), digits),
    p95: round(percentile(sorted, config.percentiles.p95), digits),
    p99: round(percentile(sorted, config.percentiles.p99), digits),
    max: round(sorted[sorted.length - 1], digits),
  };
}

export class PerformanceTelemetrySystem {
  constructor({
    globalRef = globalThis,
    config = PERFORMANCE_TELEMETRY_CONFIG,
    now = defaultNow,
  } = {}) {
    this.globalRef = globalRef;
    this.config = config;
    this.now = now;
    this.game = null;
    this.emitter = null;
    this.frameStartedAtMs = null;
    this.stepStartedAtMs = null;
    this.renderStartedAtMs = null;
    this.frameDurations = [];
    this.stepDurations = [];
    this.renderDurations = [];
    this.spanDurations = new Map();
    this.spanContexts = new Map();
    this.totalLongFrames = 0;
    this.onPreStep = () => this._handlePreStep();
    this.onPostStep = () => this._handlePostStep();
    this.onPreRender = () => this._handlePreRender();
    this.onPostRender = () => this._handlePostRender();
  }

  install() {
    if (this.config.enabled) this.globalRef[this.config.globals.monitor] = this;
    return this;
  }

  attachGame(game) {
    if (!this.config.enabled || !game || this.game === game) return this;
    this._detachEmitter();
    this.game = game;
    this.emitter = game.events || null;
    const events = this.config.events;
    this.emitter?.on?.(events.preStep, this.onPreStep);
    this.emitter?.on?.(events.postStep, this.onPostStep);
    this.emitter?.on?.(events.preRender, this.onPreRender);
    this.emitter?.on?.(events.postRender, this.onPostRender);
    return this;
  }

  recordSpan(name, durationMs, context = null) {
    if (!this.config.enabled || !name || !Number.isFinite(durationMs) || durationMs < 0) {
      return false;
    }
    const values = this.spanDurations.get(name) || [];
    pushBounded(values, durationMs, this.config.samples.spanWindowSize);
    this.spanDurations.set(name, values);
    if (context) this.spanContexts.set(name, { ...context });
    return true;
  }

  snapshot() {
    const frameMs = summarize(this.frameDurations, this.config);
    const millisecondsPerSecond = this.config.formatting.millisecondsPerSecond;
    const digits = this.config.formatting.precisionDigits;
    const spans = {};
    for (const [name, values] of this.spanDurations.entries()) {
      spans[name] = {
        ...summarize(values, this.config),
        context: this.spanContexts.get(name) || null,
      };
    }
    const activeScene = this._getActivePlayScene();
    const worldRenderer = activeScene?.worldRenderer?.getPerformanceSnapshot?.() || null;
    return {
      schemaVersion: this.config.schemaVersion,
      frameMs,
      stepMs: summarize(this.stepDurations, this.config),
      renderMs: summarize(this.renderDurations, this.config),
      medianFps: frameMs.median
        ? round(millisecondsPerSecond / frameMs.median, digits)
        : null,
      onePercentLowFps: frameMs.p99
        ? round(millisecondsPerSecond / frameMs.p99, digits)
        : null,
      longFramesInWindow: this.frameDurations.filter(
        value => value >= this.config.thresholds.longFrameMs
      ).length,
      totalLongFrames: this.totalLongFrames,
      spans,
      streaming: {
        worldRenderer,
        backgrounds: activeScene?.worldBackgroundMasterSystem?.getPerformanceSnapshot?.() || null,
        tileWindow: worldRenderer,
      },
    };
  }

  destroy() {
    this._detachEmitter();
    if (this.globalRef[this.config.globals.monitor] === this) {
      delete this.globalRef[this.config.globals.monitor];
    }
    this.game = null;
    this.frameDurations.length = 0;
    this.stepDurations.length = 0;
    this.renderDurations.length = 0;
    this.spanDurations.clear();
    this.spanContexts.clear();
  }

  _handlePreStep() {
    const nowMs = this.now();
    if (this.frameStartedAtMs !== null) {
      const durationMs = nowMs - this.frameStartedAtMs;
      if (durationMs > 0 && durationMs <= this.config.samples.maxTrackedFrameMs) {
        pushBounded(
          this.frameDurations,
          durationMs,
          this.config.samples.frameWindowSize,
        );
        if (durationMs >= this.config.thresholds.longFrameMs) this.totalLongFrames += 1;
      }
    }
    this.frameStartedAtMs = nowMs;
    this.stepStartedAtMs = nowMs;
  }

  _handlePostStep() {
    if (this.stepStartedAtMs === null) return;
    pushBounded(
      this.stepDurations,
      Math.max(0, this.now() - this.stepStartedAtMs),
      this.config.samples.frameWindowSize,
    );
  }

  _handlePreRender() {
    this.renderStartedAtMs = this.now();
  }

  _handlePostRender() {
    if (this.renderStartedAtMs === null) return;
    pushBounded(
      this.renderDurations,
      Math.max(0, this.now() - this.renderStartedAtMs),
      this.config.samples.frameWindowSize,
    );
  }

  _getActivePlayScene() {
    const scenes = this.game?.scene?.getScenes?.(true)
      || this.game?.scene?.scenes
      || [];
    return scenes.find(
      scene => scene?.sys?.settings?.key === this.config.sceneKeys.play
    ) || null;
  }

  _detachEmitter() {
    if (!this.emitter) return;
    const events = this.config.events;
    this.emitter.off?.(events.preStep, this.onPreStep);
    this.emitter.off?.(events.postStep, this.onPostStep);
    this.emitter.off?.(events.preRender, this.onPreRender);
    this.emitter.off?.(events.postRender, this.onPostRender);
    this.emitter = null;
  }
}
