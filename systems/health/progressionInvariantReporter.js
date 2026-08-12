import { RUNTIME_CANARY_CONFIG } from "../../values/runtimeCanaryConfig.js";

export function reportProgressionInvariantFailure(finding, globalRef = globalThis) {
  const monitor = globalRef[RUNTIME_CANARY_CONFIG.globals.monitor];
  if (!monitor || !finding) return false;
  return monitor.captureSystemFinding({
    key: `progression-invariant:${finding.authority || "unknown"}`,
    code: "progression-mutation-rejected",
    severity: monitor.config.severity.error,
    message: `Invalid ${finding.authority || "progression"} mutation was rejected`,
    context: {
      reason: finding.reason || "unknown",
      value: Number.isFinite(finding.value) ? finding.value : String(finding.value),
    },
  }, true);
}
