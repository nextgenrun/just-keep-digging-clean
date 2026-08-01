import { SAVE_SCHEDULING_CONFIG } from "../../values/saveScheduling.js";

function defaultNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function percentile95(samples) {
  if (!samples.length) return 0;
  const sorted = [...samples].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
}

function summarize(samples) {
  return Object.freeze({
    lastMs: samples.at(-1) || 0,
    maxMs: samples.length ? Math.max(...samples) : 0,
    p95Ms: percentile95(samples),
  });
}

export class PlaySceneSaveScheduler {
  constructor(scene, config = SAVE_SCHEDULING_CONFIG, dependencies = {}) {
    this.scene = scene;
    this.config = config;
    this.now = dependencies.now || defaultNow;
    this.setTimer = dependencies.setTimer || globalThis.setTimeout?.bind(globalThis);
    this.clearTimer = dependencies.clearTimer || globalThis.clearTimeout?.bind(globalThis);
    this.requestIdle = dependencies.requestIdle
      || globalThis.requestIdleCallback?.bind(globalThis);
    this.cancelIdle = dependencies.cancelIdle
      || globalThis.cancelIdleCallback?.bind(globalThis);
    this.documentRef = dependencies.documentRef ?? globalThis.document;
    this.windowRef = dependencies.windowRef ?? globalThis.window;
    this.timer = null;
    this.idleHandle = null;
    this.firstQueuedAtMs = null;
    this.destroyed = false;
    this.metrics = {
      scheduledRequests: 0,
      coalescedRequests: 0,
      scheduledFlushes: 0,
      forcedFlushes: 0,
      failedFlushes: 0,
      captureSamples: [],
      writeSamples: [],
      totalSamples: [],
    };
    this._onVisibilityChange = () => {
      if (this.documentRef?.visibilityState === this.config.events.hiddenState) {
        void this.flushNow();
      }
    };
    this._onPageHide = () => { void this.flushNow(); };
    this.documentRef?.addEventListener?.(
      this.config.events.visibilityChange,
      this._onVisibilityChange,
    );
    this.windowRef?.addEventListener?.(
      this.config.events.pageHide,
      this._onPageHide,
    );
  }

  schedule() {
    if (this.destroyed || !this.scene) return false;
    const now = this.now();
    const alreadyPending = this.firstQueuedAtMs !== null;
    this.metrics.scheduledRequests += 1;
    if (alreadyPending) this.metrics.coalescedRequests += 1;
    else this.firstQueuedAtMs = now;
    this._cancelHandles();
    const elapsed = Math.max(0, now - this.firstQueuedAtMs);
    const delay = Math.max(0, Math.min(
      this.config.debounceMs,
      this.config.maxDelayMs - elapsed,
    ));
    this.timer = this.setTimer?.(() => {
      this.timer = null;
      this._queueIdleFlush();
    }, delay) ?? null;
    if (this.timer === null) void this._runScheduledFlush();
    return true;
  }

  async flushNow() {
    if (this.destroyed || !this.scene) return false;
    this.metrics.forcedFlushes += 1;
    this.scene.pendingDugTileSave = true;
    this.cancelPending();
    return this.scene.flushDugTilesSave?.({ scheduled: false, force: true });
  }

  cancelPending() {
    this._cancelHandles();
    this.firstQueuedAtMs = null;
  }

  recordTiming({ captureMs = 0, writeMs = 0, totalMs = 0 } = {}) {
    this._pushSample(this.metrics.captureSamples, captureMs);
    this._pushSample(this.metrics.writeSamples, writeMs);
    this._pushSample(this.metrics.totalSamples, totalMs);
  }

  getSnapshot() {
    return Object.freeze({
      schemaVersion: this.config.schemaVersion,
      pending: this.firstQueuedAtMs !== null,
      scheduledRequests: this.metrics.scheduledRequests,
      coalescedRequests: this.metrics.coalescedRequests,
      scheduledFlushes: this.metrics.scheduledFlushes,
      forcedFlushes: this.metrics.forcedFlushes,
      failedFlushes: this.metrics.failedFlushes,
      capture: summarize(this.metrics.captureSamples),
      write: summarize(this.metrics.writeSamples),
      total: summarize(this.metrics.totalSamples),
    });
  }

  _queueIdleFlush() {
    if (this.destroyed || this.firstQueuedAtMs === null) return;
    const elapsed = Math.max(0, this.now() - this.firstQueuedAtMs);
    const remaining = Math.max(0, this.config.maxDelayMs - elapsed);
    if (remaining === 0) {
      void this._runScheduledFlush();
      return;
    }
    if (this.requestIdle) {
      this.idleHandle = this.requestIdle(() => {
        this.idleHandle = null;
        void this._runScheduledFlush();
      }, { timeout: Math.max(1, Math.min(this.config.idleTimeoutMs, remaining)) });
      return;
    }
    const delay = Math.min(this.config.fallbackDelayMs, remaining);
    this.timer = this.setTimer?.(() => {
      this.timer = null;
      void this._runScheduledFlush();
    }, delay) ?? null;
    if (this.timer === null) void this._runScheduledFlush();
  }

  async _runScheduledFlush() {
    if (this.destroyed || !this.scene || this.firstQueuedAtMs === null) return false;
    this._cancelHandles();
    this.firstQueuedAtMs = null;
    this.metrics.scheduledFlushes += 1;
    const result = await this.scene.flushDugTilesSave?.({ scheduled: true });
    if (result === false) this.metrics.failedFlushes += 1;
    return result;
  }

  _pushSample(samples, value) {
    samples.push(Math.max(0, Number(value) || 0));
    if (samples.length > this.config.recentSampleLimit) {
      samples.splice(0, samples.length - this.config.recentSampleLimit);
    }
  }

  _cancelHandles() {
    if (this.timer !== null) this.clearTimer?.(this.timer);
    if (this.idleHandle !== null) this.cancelIdle?.(this.idleHandle);
    this.timer = null;
    this.idleHandle = null;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.cancelPending();
    this.documentRef?.removeEventListener?.(
      this.config.events.visibilityChange,
      this._onVisibilityChange,
    );
    this.windowRef?.removeEventListener?.(
      this.config.events.pageHide,
      this._onPageHide,
    );
    this.scene = null;
  }
}
