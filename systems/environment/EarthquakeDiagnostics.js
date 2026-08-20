import { EARTHQUAKE_FEEDBACK_CONFIG } from "../../values/earthquakeFeedback.js";
import { GAME_CONFIG } from "../../values/gameConfig.js";
import { selectDeterministicEarthquakeEpicenter } from "./earthquakeDeterministicEpicenter.js";

export function inspectEarthquakeAssetHealth(
  scene,
  feedbackConfig = EARTHQUAKE_FEEDBACK_CONFIG,
) {
  const entries = Object.entries(feedbackConfig.assets || {});
  const missing = entries
    .filter(([, asset]) => scene.textures?.exists?.(asset.key) !== true)
    .map(([name, asset]) => Object.freeze({ name, key: asset.key }));
  return Object.freeze({
    ready: entries.length > 0 && missing.length === 0,
    checked: entries.length,
    missing: Object.freeze(missing),
  });
}

export function resolveEarthquakeLifecycleStage(state, fallback = "armed") {
  if (state === "warning") return "telegraphing";
  if (state === "earthquake") return "active";
  if (state === "aftermath") return "aftermath";
  return fallback;
}

export class EarthquakeDiagnostics {
  constructor(scene, system, config) {
    this.scene = scene;
    this.system = system;
    this.config = config;
    this.enabled = config.debugFlags?.Earthquakes === true
      || GAME_CONFIG.debugMode === true;
    this.history = [];
    this.gate = Object.freeze({
      reason: config.enabled === true ? "armed" : "disabled",
      stage: config.enabled === true ? "armed" : "disabled",
      at: Date.now(),
      details: Object.freeze({}),
    });
    this.api = null;
    this._installApi();
  }

  assetHealth() {
    return inspectEarthquakeAssetHealth(this.scene);
  }

  recordInitial() {
    if (this.config.enabled !== true) return this.record("disabled");
    if (this.system.suppressed) return this.record("suppressed");
    const assets = this.assetHealth();
    if (!assets.ready) return this.record("asset-missing", { missing: assets.missing });
    return this.record("armed");
  }

  prepareStart(options = {}) {
    if (this.config.enabled !== true) {
      this.record("disabled");
      return null;
    }
    if (this.system.paused) {
      this.record("paused");
      return null;
    }
    if (this.system.syncSuppression()) {
      this.record("suppressed");
      return null;
    }
    const assets = this.assetHealth();
    if (!assets.ready) {
      this.record("asset-missing", { missing: assets.missing });
      return null;
    }
    const epicenter = this.selectEpicenter(options);
    if (epicenter) return epicenter;
    this.system._scheduleNext();
    this.record("no-valid-epicenter", {
      nextEventMs: Math.round(this.system.nextEventMs),
    });
    return null;
  }

  prepareDebris(config, options = {}) {
    if (this.config.enabled !== true || config?.enabled !== true) {
      this.system._scheduleNextDebrisEvent();
      this.record("disabled", { source: "debris" });
      return null;
    }
    if (this.system.paused) {
      this.record("paused", { source: "debris" });
      return null;
    }
    if (this.system.syncSuppression()) {
      this.record("suppressed", { source: "debris" });
      return null;
    }
    const assets = this.assetHealth();
    if (!assets.ready) {
      this.record("asset-missing", { source: "debris", missing: assets.missing });
      return null;
    }
    const depth = this.system._getDepth();
    if (depth < config.minimumDepthTiles) {
      this.system._scheduleNextDebrisEvent();
      this.record("too-shallow", {
        source: "debris",
        depth,
        minimumDepth: config.minimumDepthTiles,
      });
      return null;
    }
    const epicenter = this.selectEpicenter(options);
    if (epicenter) return epicenter;
    this.system._scheduleNextDebrisEvent();
    this.record("no-valid-epicenter", { source: "debris" });
    return null;
  }

  selectEpicenter(options = {}) {
    const requested = options.epicenter;
    if (
      Number.isInteger(requested?.tx)
      && Number.isInteger(requested?.ty)
      && this.scene.worldModel?.inBounds?.(requested.tx, requested.ty)
    ) {
      return this.system._makeEpicenter(requested.tx, requested.ty);
    }
    return options.deterministic === true
      ? selectDeterministicEarthquakeEpicenter(this.scene, this.system, this.config)
      : this.system._selectWorldEpicenter();
  }

  showFirstResponseCaption() {
    if (this.captionShown) return false;
    this.captionShown = true;
    const labels = EARTHQUAKE_FEEDBACK_CONFIG.labels;
    this.scene.uiNotifications?.warning?.(labels.firstResponseCaption, {
      key: labels.firstResponseKey,
      durationMs: labels.firstResponseDurationMs,
      priority: 9,
    });
    return true;
  }

  recordWarning(intensity, epicenter, forced, options = {}) {
    return this.record("telegraphing", {
      intensity,
      epicenter: { ...epicenter },
      forced: forced === true,
      deterministic: options.deterministic === true,
    });
  }

  recordPause(paused) {
    return this.record(
      paused ? "paused" : "armed",
      {},
      paused ? "paused" : resolveEarthquakeLifecycleStage(this.system.state, "armed"),
    );
  }

  recordNoCeiling(source, epicenter) {
    return this.record("no-valid-ceiling", { source, epicenter: { ...epicenter } });
  }

  recordDebrisTelegraph(epicenter, candidate, options = {}) {
    return this.record("telegraphing", {
      source: "debris",
      epicenter: { ...epicenter },
      ceiling: { tx: candidate.tx, ty: candidate.ty },
      deterministic: options.deterministic === true,
    });
  }

  recordQuake(requestedCaveIns, candidates) {
    return this.record(
      requestedCaveIns > 0 && candidates.length === 0
        ? "no-valid-ceiling"
        : "active",
      { requestedCaveIns, candidateCount: candidates.length },
      "active",
    );
  }

  recordResolved(intensity, passagesOpened, distanceEndured) {
    return this.record("resolved", { intensity, passagesOpened, distanceEndured });
  }

  statusFields() {
    return {
      gate: this.getGate(),
      stage: resolveEarthquakeLifecycleStage(
        this.system.state,
        this.getGate()?.stage || "armed",
      ),
      assets: this.assetHealth(),
    };
  }

  record(reason, details = {}, stage = reason) {
    const entry = Object.freeze({
      reason,
      stage,
      at: Date.now(),
      details: Object.freeze({ ...details }),
    });
    this.gate = entry;
    this.history.push(entry);
    if (this.history.length > 24) this.history.shift();
    return entry;
  }

  getGate() {
    return this.gate;
  }

  snapshot() {
    return {
      ...this.system.getStatus(),
      assets: this.assetHealth(),
      history: this.history.map(entry => ({ ...entry })),
    };
  }

  destroy() {
    if (
      typeof globalThis.window !== "undefined"
      && globalThis.window.earthquakeDebug === this.api
    ) {
      delete globalThis.window.earthquakeDebug;
    }
    this.api = null;
  }

  _installApi() {
    if (!this.enabled || typeof globalThis.window === "undefined") return;
    const system = this.system;
    this.api = Object.freeze({
      system,
      status: () => system.getStatus(),
      snapshot: () => this.snapshot(),
      force: (intensity = "minor", epicenter = null) => {
        const selected = String(intensity).toLowerCase();
        if (!system.config.intensities[selected]) {
          throw new Error(`Unknown intensity: ${selected}`);
        }
        system.start(selected, { deterministic: true, epicenter });
        return system.getStatus();
      },
      forceDebris: (epicenter = null) => {
        system.triggerDebrisEvent({ deterministic: true, epicenter });
        return system.getStatus();
      },
      cancel: () => {
        system.cancelActiveHazards("debug-cancelled");
        return system.getStatus();
      },
    });
    globalThis.window.earthquakeDebug = this.api;
  }

}
