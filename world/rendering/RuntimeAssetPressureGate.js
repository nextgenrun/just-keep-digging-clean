import { RUNTIME_ASSET_RESIDENCY_CLASSES } from
  "../../values/runtimeAssetLoading.js";

const OPTIONAL_CLASSES = new Set([
  RUNTIME_ASSET_RESIDENCY_CLASSES.unlock,
  RUNTIME_ASSET_RESIDENCY_CLASSES.threshold,
  RUNTIME_ASSET_RESIDENCY_CLASSES.onDemand,
  RUNTIME_ASSET_RESIDENCY_CLASSES.optional,
]);

export class RuntimeAssetPressureGate {
  constructor({
    memory,
    trim,
    now,
    setTimer,
    clearTimer,
    config,
  }) {
    this.memory = memory;
    this.trim = trim;
    this.now = now;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.config = config;
    this.deferredGroups = 0;
    this.timedOutGroups = 0;
  }

  isOptional(definition) {
    return OPTIONAL_CLASSES.has(definition?.residencyClass);
  }

  isUnderHighWatermark() {
    const snapshot = this.memory?.sample?.(true);
    return !snapshot?.overBudget;
  }

  begin(record, { ready, timeout }) {
    if (!this.isOptional(record?.definition)) return false;
    this.trim?.();
    if (this.isUnderHighWatermark()) return false;
    record.status = "deferred";
    record.deferredAtMs = this.now();
    this.deferredGroups += 1;
    const poll = () => {
      record.pressureTimer = null;
      this.trim?.();
      if (this.isUnderHighWatermark()) {
        ready();
        return;
      }
      if (this.now() - record.deferredAtMs >= this.config.optionalLoadTimeoutMs) {
        this.timedOutGroups += 1;
        timeout();
        return;
      }
      record.pressureTimer = this.setTimer?.(poll, this.config.pressureRetryMs) ?? null;
      if (record.pressureTimer === null) timeout();
    };
    record.pressureTimer = this.setTimer?.(poll, this.config.pressureRetryMs) ?? null;
    if (record.pressureTimer === null) timeout();
    return true;
  }

  cancel(record) {
    if (record?.pressureTimer === null || record?.pressureTimer === undefined) return false;
    this.clearTimer?.(record.pressureTimer);
    record.pressureTimer = null;
    return true;
  }

  getSnapshot() {
    return Object.freeze({
      deferredGroups: this.deferredGroups,
      timedOutGroups: this.timedOutGroups,
    });
  }
}
