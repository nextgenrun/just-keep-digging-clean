import { PERFORMANCE_TELEMETRY_CONFIG } from "../../values/performanceTelemetryConfig.js";

const phaseSampleCounters = new WeakMap();

export function performanceNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}

export function shouldSamplePerformancePhases(owner) {
  if (
    (typeof owner !== "object" && typeof owner !== "function")
    || owner === null
    || !globalThis[PERFORMANCE_TELEMETRY_CONFIG.globals.monitor]?.recordSpan
  ) {
    return false;
  }
  const cadence = Math.max(
    1,
    Math.floor(PERFORMANCE_TELEMETRY_CONFIG.samples.phaseEveryFrames)
  );
  const next = (phaseSampleCounters.get(owner) || 0) + 1;
  if (next < cadence) {
    phaseSampleCounters.set(owner, next);
    return false;
  }
  phaseSampleCounters.set(owner, 0);
  return true;
}

export function recordPerformanceSpan(name, startedAtMs, context = null) {
  const durationMs = Math.max(0, performanceNow() - startedAtMs);
  globalThis[PERFORMANCE_TELEMETRY_CONFIG.globals.monitor]?.recordSpan?.(
    name,
    durationMs,
    context,
  );
  return durationMs;
}
