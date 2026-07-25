import { RUNTIME_CANARY_CONFIG } from "../../values/runtimeCanaryConfig.js";

export class RuntimeCanaryReporter {
  constructor({
    globalRef = globalThis,
    config = RUNTIME_CANARY_CONFIG,
  } = {}) {
    this.globalRef = globalRef;
    this.config = config;
    this.lastCritical = this._readLastCritical();
  }

  getLastCritical() {
    return this.lastCritical;
  }

  clearLastCritical() {
    this.lastCritical = null;
    try {
      this.globalRef.localStorage?.removeItem?.(this.config.storage.lastCriticalKey);
    } catch (_) {
      // Storage is optional and may be blocked by browser privacy settings.
    }
  }

  handle(event, snapshot) {
    const ranks = this.config.severity.ranks;
    const minimum = ranks[this.config.reporting.minimumSeverity] ?? ranks.error;
    if ((ranks[event.severity] ?? ranks.info) < minimum) return;

    const report = {
      schemaVersion: this.config.schemaVersion,
      event,
      snapshot,
    };
    this.lastCritical = report;
    this._persist(report);
    this._post(report);
  }

  _readLastCritical() {
    try {
      const raw = this.globalRef.localStorage?.getItem?.(this.config.storage.lastCriticalKey);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  _persist(report) {
    try {
      this.globalRef.localStorage?.setItem?.(
        this.config.storage.lastCriticalKey,
        JSON.stringify(report),
      );
    } catch (_) {
      // The in-memory report remains available when storage is unavailable.
    }
  }

  _post(report) {
    const configured = this.config.reporting.endpoint;
    const injected = this.globalRef[this.config.globals.reportEndpoint];
    const endpoint = typeof injected === "string" && injected.trim() ? injected.trim() : configured;
    if (!endpoint || typeof this.globalRef.fetch !== "function") return;

    void this.globalRef.fetch(endpoint, {
      method: this.config.reporting.method,
      headers: { "Content-Type": this.config.reporting.contentType },
      body: JSON.stringify(report),
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {
      // Reporting must never create a second runtime failure.
    });
  }
}
