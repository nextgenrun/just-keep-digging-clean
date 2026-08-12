import { RUNTIME_CANARY_CONFIG } from "../../values/runtimeCanaryConfig.js";

export function reportSceneRuntimeFailure(finding, authority = false, globalRef = globalThis) {
  const monitor = globalRef[RUNTIME_CANARY_CONFIG.globals.monitor];
  if (!monitor || !finding) return false;
  const id = finding.id || "unknown-subsystem";
  const error = finding.error || finding.disposeError;
  return monitor.captureSystemFinding({
    key: `scene-runtime:${id}`,
    code: authority ? "scene-authority-failure" : "scene-presentation-quarantine",
    severity: authority ? monitor.config.severity.error : monitor.config.severity.warning,
    message: authority
      ? `Gameplay authority stopped safely: ${id}`
      : `Presentation subsystem quarantined: ${id}`,
    context: {
      phase: finding.phase || null,
      criticality: finding.criticality || null,
      message: error?.message || String(error || "unknown failure"),
      stack: error?.stack || "",
    },
  }, true);
}
