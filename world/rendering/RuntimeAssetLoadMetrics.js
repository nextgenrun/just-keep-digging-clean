function pushBounded(values, value, limit) {
  values.push(value);
  while (values.length > limit) values.shift();
}

function summarize(values) {
  if (values.length === 0) return { last: null, p95: null, max: null };
  const sorted = [...values].sort((left, right) => left - right);
  const p95Index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  const round = value => Math.round(value * 10) / 10;
  return {
    last: round(values[values.length - 1]),
    p95: round(sorted[p95Index]),
    max: round(sorted[sorted.length - 1]),
  };
}

export class RuntimeAssetLoadMetrics {
  constructor(config, now) {
    this.config = config;
    this.now = now;
    this.totalDurations = [];
    this.decodeDurations = [];
    this.activationDurations = [];
    this.started = 0;
    this.completed = 0;
    this.failed = 0;
    this.cancelled = 0;
    this.deduplicated = 0;
    this.bitmapFallbacks = 0;
    this.maxQueueDepth = 0;
    this.lastLoad = null;
  }

  recordQueueDepth(depth) {
    this.maxQueueDepth = Math.max(this.maxQueueDepth, depth);
  }

  recordCompletion(record, error, cancelled) {
    if (cancelled || record.startedAtMs === null) return;
    const totalMs = Math.max(0, this.now() - record.startedAtMs);
    const limit = this.config.scheduling.recentSampleLimit;
    pushBounded(this.totalDurations, totalMs, limit);
    if (Number.isFinite(record.decodeMs)) {
      pushBounded(this.decodeDurations, record.decodeMs, limit);
    }
    if (Number.isFinite(record.activationMs)) {
      pushBounded(this.activationDurations, record.activationMs, limit);
    }
    this.lastLoad = {
      key: record.asset.key,
      owner: record.owner,
      backend: record.backend,
      totalMs: Math.round(totalMs * 10) / 10,
      decodeMs: Number.isFinite(record.decodeMs)
        ? Math.round(record.decodeMs * 10) / 10
        : null,
      activationMs: Number.isFinite(record.activationMs)
        ? Math.round(record.activationMs * 10) / 10
        : null,
    };
    if (error) this.failed += 1;
    else this.completed += 1;
  }

  snapshot({
    queue,
    active,
    bitmapDecodeEnabled,
    decodedSources,
    textureMemory,
    externalLoaderWaits,
    schemaVersion,
    enabled,
  }) {
    const queuedByOwner = {};
    for (const record of queue) {
      queuedByOwner[record.owner] = (queuedByOwner[record.owner] || 0) + 1;
    }
    const activeRecords = Array.isArray(active)
      ? active
      : active
        ? [active]
        : [];
    const primaryActive = activeRecords[0] || null;
    const activeElapsedMs = activeRecords
      .filter(record => record.startedAtMs !== null)
      .map(record => Math.max(0, this.now() - record.startedAtMs));
    return {
      schemaVersion,
      enabled,
      bitmapDecodeEnabled,
      queued: queue.length,
      active: activeRecords.length,
      activeKey: primaryActive?.asset.key || null,
      activeKeys: activeRecords.map(record => record.asset.key),
      activeOwner: primaryActive?.owner || null,
      activeOwners: activeRecords.map(record => record.owner),
      activeBackend: primaryActive?.backend || null,
      activeElapsedMs: activeElapsedMs.length === 0
        ? null
        : Math.round(Math.max(...activeElapsedMs) * 10) / 10,
      queuedByOwner,
      maxQueueDepth: this.maxQueueDepth,
      started: this.started,
      completed: this.completed,
      failed: this.failed,
      cancelled: this.cancelled,
      deduplicated: this.deduplicated,
      bitmapFallbacks: this.bitmapFallbacks,
      externalLoaderWaits,
      decodedSources,
      textureMemory,
      totalMs: summarize(this.totalDurations),
      decodeMs: summarize(this.decodeDurations),
      activationMs: summarize(this.activationDurations),
      lastLoad: this.lastLoad,
    };
  }
}
