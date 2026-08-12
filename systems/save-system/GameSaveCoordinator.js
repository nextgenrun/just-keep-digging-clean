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

export class GameSaveCoordinator {
  constructor(ports, config = SAVE_SCHEDULING_CONFIG, dependencies = {}) {
    if (typeof ports?.capture !== "function" || typeof ports?.write !== "function") {
      throw new TypeError("GameSaveCoordinator requires capture and write ports");
    }
    this.ports = ports;
    this.config = config;
    this.now = dependencies.now || defaultNow;
    this.setTimer = dependencies.setTimer || globalThis.setTimeout?.bind(globalThis);
    this.clearTimer = dependencies.clearTimer || globalThis.clearTimeout?.bind(globalThis);
    this.requestIdle = dependencies.requestIdle || globalThis.requestIdleCallback?.bind(globalThis);
    this.cancelIdle = dependencies.cancelIdle || globalThis.cancelIdleCallback?.bind(globalThis);
    this.documentRef = dependencies.documentRef ?? globalThis.document;
    this.windowRef = dependencies.windowRef ?? globalThis.window;
    this.timer = null;
    this.idleHandle = null;
    this.firstQueuedAtMs = null;
    this.destroyed = false;
    this._dirty = false;
    this._tail = Promise.resolve(true);
    this._committedRevision = Math.max(0, Math.floor(Number(ports.initialRevision) || 0));
    this._completedTransactions = new Set();
    this.metrics = {
      scheduledRequests: 0,
      coalescedRequests: 0,
      scheduledFlushes: 0,
      forcedFlushes: 0,
      failedFlushes: 0,
      rejectedSnapshots: 0,
      captureSamples: [],
      writeSamples: [],
      totalSamples: [],
    };
    this._onVisibilityChange = () => {
      if (this.documentRef?.visibilityState === this.config.events.hiddenState) {
        void this.flush({ force: true, reason: "visibility-hidden" });
      }
    };
    this._onPageHide = () => { void this.flush({ force: true, reason: "page-hide" }); };
    this.documentRef?.addEventListener?.(this.config.events.visibilityChange, this._onVisibilityChange);
    this.windowRef?.addEventListener?.(this.config.events.pageHide, this._onPageHide);
  }

  requestSnapshot(reason = "mutation") {
    if (this.destroyed || this.ports.isBlocked?.()) return false;
    const now = this.now();
    const alreadyPending = this._dirty;
    this._dirty = true;
    this.metrics.scheduledRequests += 1;
    if (alreadyPending) this.metrics.coalescedRequests += 1;
    else this.firstQueuedAtMs = now;
    this._cancelHandles();
    const elapsed = Math.max(0, now - (this.firstQueuedAtMs ?? now));
    const delay = Math.max(0, Math.min(this.config.debounceMs, this.config.maxDelayMs - elapsed));
    this.timer = this.setTimer?.(() => {
      this.timer = null;
      this._queueIdleFlush(reason);
    }, delay) ?? null;
    if (this.timer === null) void this.flush({ scheduled: true, reason });
    return true;
  }

  schedule(reason) { return this.requestSnapshot(reason); }

  flush({ force = false, scheduled = false, reason = "flush" } = {}) {
    if (this.destroyed || this.ports.isBlocked?.()) return Promise.resolve(false);
    if (force) {
      this.metrics.forcedFlushes += 1;
      this._dirty = true;
    } else if (scheduled) {
      this.metrics.scheduledFlushes += 1;
    }
    this._cancelHandles();
    this.firstQueuedAtMs = null;
    return this._enqueue(async () => {
      let result = true;
      do {
        if (!this._dirty) break;
        result = await this._captureAndWrite({ reason, transactionId: null });
        if (!result) break;
      } while (force && this._dirty);
      return result;
    });
  }

  flushNow() { return this.flush({ force: true, reason: "legacy-flush-now" }); }

  transaction({ id, mutate, rollback = null, reason = "transaction" } = {}) {
    const transactionId = typeof id === "string" ? id.trim().slice(0, 128) : "";
    if (!transactionId || typeof mutate !== "function") {
      return Promise.reject(new TypeError("Save transaction requires a stable id and mutate callback"));
    }
    if (this.destroyed || this.ports.isBlocked?.()) return Promise.resolve(false);
    this._cancelHandles();
    return this._enqueue(async () => {
      if (this._completedTransactions.has(transactionId)) {
        return Object.freeze({ success: false, duplicate: true, transactionId });
      }
      let mutated = false;
      try {
        const value = await mutate();
        if (value === false) return false;
        mutated = true;
        this._dirty = true;
        const saved = await this._captureAndWrite({ reason, transactionId });
        if (!saved) throw new Error(`Save transaction failed: ${transactionId}`);
        this._completedTransactions.add(transactionId);
        return Object.freeze({ success: true, transactionId, value });
      } catch (error) {
        if (mutated && typeof rollback === "function") {
          await rollback(error);
          this._dirty = true;
          await this._captureAndWrite({ reason: `${reason}-rollback`, transactionId: `${transactionId}:rollback` });
        }
        throw error;
      }
    });
  }

  cancelPending() {
    this._cancelHandles();
    this.firstQueuedAtMs = null;
  }

  discardPending() {
    this.cancelPending();
    this._dirty = false;
  }

  recordTiming({ captureMs = 0, writeMs = 0, totalMs = 0 } = {}) {
    this._pushSample(this.metrics.captureSamples, captureMs);
    this._pushSample(this.metrics.writeSamples, writeMs);
    this._pushSample(this.metrics.totalSamples, totalMs);
  }

  getSnapshot() {
    return Object.freeze({
      schemaVersion: this.config.schemaVersion,
      pending: this._dirty,
      committedRevision: this._committedRevision,
      scheduledRequests: this.metrics.scheduledRequests,
      coalescedRequests: this.metrics.coalescedRequests,
      scheduledFlushes: this.metrics.scheduledFlushes,
      forcedFlushes: this.metrics.forcedFlushes,
      failedFlushes: this.metrics.failedFlushes,
      rejectedSnapshots: this.metrics.rejectedSnapshots,
      capture: summarize(this.metrics.captureSamples),
      write: summarize(this.metrics.writeSamples),
      total: summarize(this.metrics.totalSamples),
    });
  }

  _enqueue(operation) {
    const run = this._tail.then(operation, operation);
    this._tail = run.catch(() => false);
    return run;
  }

  async _captureAndWrite({ reason, transactionId }) {
    if (!this._dirty || this.destroyed || this.ports.isBlocked?.()) return false;
    this._dirty = false;
    const totalStartedAtMs = this.now();
    const revision = this._committedRevision + 1;
    const revisionMetadata = Object.freeze({
      revision,
      parentRevision: this._committedRevision,
      transactionId,
      reason,
      capturedAt: new Date().toISOString(),
    });
    try {
      const captureStartedAtMs = this.now();
      const snapshot = await this.ports.capture(revisionMetadata);
      const captureMs = Math.max(0, this.now() - captureStartedAtMs);
      const validation = this.ports.validate?.(snapshot) ?? { ok: true };
      if (!validation.ok) {
        this.metrics.rejectedSnapshots += 1;
        this.ports.onRejected?.({ id: "game-save-validation", validation });
        return false;
      }
      const writeStartedAtMs = this.now();
      const saved = await this.ports.write(snapshot);
      const writeMs = Math.max(0, this.now() - writeStartedAtMs);
      this.recordTiming({ captureMs, writeMs, totalMs: Math.max(0, this.now() - totalStartedAtMs) });
      if (saved === false) throw new Error(`Save revision ${revision} was not committed`);
      this._committedRevision = revision;
      return true;
    } catch (error) {
      this.metrics.failedFlushes += 1;
      this.ports.onRejected?.({ id: "game-save-write", error });
      return false;
    }
  }

  _queueIdleFlush(reason) {
    if (this.destroyed || !this._dirty) return;
    const elapsed = Math.max(0, this.now() - (this.firstQueuedAtMs ?? this.now()));
    const remaining = Math.max(0, this.config.maxDelayMs - elapsed);
    if (remaining === 0) { void this.flush({ scheduled: true, reason }); return; }
    if (this.requestIdle) {
      this.idleHandle = this.requestIdle(() => {
        this.idleHandle = null;
        void this.flush({ scheduled: true, reason });
      }, { timeout: Math.max(1, Math.min(this.config.idleTimeoutMs, remaining)) });
      return;
    }
    this.timer = this.setTimer?.(() => {
      this.timer = null;
      void this.flush({ scheduled: true, reason });
    }, Math.min(this.config.fallbackDelayMs, remaining)) ?? null;
    if (this.timer === null) void this.flush({ scheduled: true, reason });
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
    this.documentRef?.removeEventListener?.(this.config.events.visibilityChange, this._onVisibilityChange);
    this.windowRef?.removeEventListener?.(this.config.events.pageHide, this._onPageHide);
    this.ports = null;
  }
}
