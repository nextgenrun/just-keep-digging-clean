import { RUNTIME_CANARY_CONFIG } from "../../values/runtimeCanaryConfig.js";
import { buildRuntimeHealthWorkerSource } from "./RuntimeHealthWorkerSource.js";

export class RuntimeHealthWorkerBridge {
  constructor({
    globalRef = globalThis,
    documentRef = globalThis.document,
    config = RUNTIME_CANARY_CONFIG,
    onFinding = null,
  } = {}) {
    this.globalRef = globalRef;
    this.documentRef = documentRef;
    this.config = config;
    this.onFinding = onFinding;
    this.worker = null;
    this.workerUrl = null;
    this._onVisibility = () => this.heartbeat();
  }

  start() {
    if (this.worker) return true;
    const WorkerCtor = this.globalRef.Worker;
    const BlobCtor = this.globalRef.Blob;
    const URLApi = this.globalRef.URL;
    if (!WorkerCtor || !BlobCtor || !URLApi?.createObjectURL) return false;

    try {
      const blob = new BlobCtor([buildRuntimeHealthWorkerSource()], {
        type: "text/javascript",
      });
      this.workerUrl = URLApi.createObjectURL(blob);
      this.worker = new WorkerCtor(this.workerUrl, { name: "jkd-runtime-health" });
      this.worker.addEventListener("message", event => {
        if (event.data?.type !== "runtime-health-finding") return;
        const finding = event.data.finding || {};
        this.onFinding?.({
          key: `${this.config.events.workerFrozen}:worker`,
          code: this.config.events.workerFrozen,
          severity: this.config.severity.error,
          message: finding.message || this.config.messages.workerFrozen,
          context: finding.context || {},
        });
      });
      this.worker.postMessage({
        type: "start",
        frozenAfterMs: this.config.timing.workerFrozenMs,
        sampleEveryMs: this.config.timing.workerHeartbeatMs,
        reporting: {
          endpoint: this._reportEndpoint(),
          method: this.config.reporting.method,
          contentType: this.config.reporting.contentType,
          schemaVersion: this.config.schemaVersion,
          buildId: this.globalRef[this.config.globals.buildId] || this.config.build.developmentId,
        },
      });
      this.documentRef?.addEventListener?.("visibilitychange", this._onVisibility);
      this.heartbeat();
      return true;
    } catch {
      this.destroy();
      return false;
    }
  }

  heartbeat() {
    this.worker?.postMessage?.({
      type: "heartbeat",
      paused: this.documentRef?.hidden === true,
    });
  }

  reportFindings(findings = []) {
    if (!this.worker) return;
    this.worker.postMessage({
      type: "system-findings",
      findings: Array.isArray(findings) ? findings : [],
    });
  }

  _reportEndpoint() {
    const injected = this.globalRef[this.config.globals.reportEndpoint];
    return typeof injected === "string" && injected.trim()
      ? injected.trim()
      : this.config.reporting.endpoint;
  }

  destroy() {
    this.documentRef?.removeEventListener?.("visibilitychange", this._onVisibility);
    this.worker?.postMessage?.({ type: "stop" });
    this.worker?.terminate?.();
    this.worker = null;
    if (this.workerUrl) this.globalRef.URL?.revokeObjectURL?.(this.workerUrl);
    this.workerUrl = null;
  }
}
