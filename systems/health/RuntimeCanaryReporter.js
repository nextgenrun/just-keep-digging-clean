import { RUNTIME_CANARY_CONFIG } from "../../values/runtimeCanaryConfig.js";
import { BrowserStorageRepository } from "../save-system/BrowserStorageRepository.js";

export class RuntimeCanaryReporter {
  constructor({
    globalRef = globalThis,
    config = RUNTIME_CANARY_CONFIG,
    storageRepository = null,
  } = {}) {
    this.globalRef = globalRef;
    this.config = config;
    this.storageRepository = storageRepository
      ?? new BrowserStorageRepository(globalRef.localStorage);
    this.lastCritical = this._readLastCritical();
  }

  getLastCritical() {
    return this.lastCritical;
  }

  clearLastCritical() {
    this.lastCritical = null;
    this.storageRepository.remove(this.config.storage.lastCriticalKey);
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
    return this.storageRepository.readJson(this.config.storage.lastCriticalKey);
  }

  _persist(report) {
    this.storageRepository.writeJson(this.config.storage.lastCriticalKey, report);
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
