import { RUNTIME_CANARY_CONFIG } from "../../values/runtimeCanaryConfig.js";
import { RuntimeCanaryReporter } from "./RuntimeCanaryReporter.js";
import { RuntimeHealthWorkerBridge } from "./RuntimeHealthWorkerBridge.js";
import { evaluateRuntimeCanaries } from "./runtimeCanaryChecks.js";

let activeMonitor = null;

function detailMessage(detail, fallback) {
  return detail?.message || String(detail || fallback);
}

export class RuntimeCanarySystem {
  constructor({
    globalRef = globalThis,
    documentRef = globalThis.document,
    config = RUNTIME_CANARY_CONFIG,
    now = () => Date.now(),
    setIntervalFn = globalThis.setInterval?.bind(globalThis),
    clearIntervalFn = globalThis.clearInterval?.bind(globalThis),
    reporter = null,
    workerBridge = null,
  } = {}) {
    this.globalRef = globalRef;
    this.documentRef = documentRef;
    this.config = config;
    this.now = now;
    this.setIntervalFn = setIntervalFn;
    this.clearIntervalFn = clearIntervalFn;
    this.reporter = reporter || new RuntimeCanaryReporter({ globalRef, config });
    this.workerBridge = workerBridge || new RuntimeHealthWorkerBridge({
      globalRef,
      documentRef,
      config,
      onFinding: finding => this.captureSystemFinding(finding, true),
    });
    this.startedAtMs = this.now();
    this.game = null;
    this.timer = null;
    this.sequence = 0;
    this.events = [];
    this.activeFindings = new Map();
    this.stickyFindingKeys = new Set();
    this.subscribers = new Set();
    this.sceneCleanups = [];
    this.instrumentedScenes = new WeakSet();
    this.legacyErrors = globalRef[config.globals.legacyErrors] || [];
    this.telemetry = {
      activeScenes: [],
      frame: null,
      fps: null,
      loopRunning: false,
      pageFocused: true,
    };
    this.sampleState = {
      noActiveSinceMs: null,
      lastFrame: null,
      lastFrameChangedAtMs: this.startedAtMs,
      activeSinceByScene: new Map(),
    };
  }

  install() {
    this.globalRef[this.config.globals.monitor] = this;
    this.globalRef[this.config.globals.legacyErrors] = this.legacyErrors;
    activeMonitor = this;
    this.markLifecycle("installed");
    return this;
  }

  attachGame(game) {
    if (!game || this.game === game) return this;
    this.game = game;
    this.sampleState.lastFrame = Number.isFinite(game?.loop?.frame) ? game.loop.frame : null;
    this.sampleState.lastFrameChangedAtMs = this.now();
    this.markLifecycle("phaser-postboot");
    this.workerBridge?.start?.();
    this.sample();
    if (this.setIntervalFn) {
      this.timer = this.setIntervalFn(
        () => this.sample(),
        this.config.timing.sampleIntervalMs,
      );
    }
    return this;
  }

  captureError(kind, detail, context = {}) {
    const isRejection = kind === this.config.events.unhandledRejection || kind === "unhandledrejection";
    const code = isRejection ? this.config.events.unhandledRejection : this.config.events.runtimeError;
    const fallback = isRejection
      ? this.config.messages.unhandledRejection
      : this.config.messages.runtimeError;
    const legacyEntry = {
      kind,
      message: detailMessage(detail, fallback),
      stack: detail?.stack || "",
      at: new Date(this.now()).toISOString(),
    };
    this.legacyErrors.push(legacyEntry);
    while (this.legacyErrors.length > this.config.limits.legacyErrors) this.legacyErrors.shift();
    this._activateFinding({
      key: `${code}:${legacyEntry.message}`,
      code,
      severity: this.config.severity.error,
      message: `${fallback}: ${legacyEntry.message}`,
      context: { ...context, stack: legacyEntry.stack },
    }, true);
    return legacyEntry;
  }

  capturePlaySceneSetupFailure(detail) {
    const message = detailMessage(detail, this.config.messages.playSceneSetupFatal);
    this._activateFinding({
      key: this.config.events.playSceneSetupFatal,
      code: this.config.events.playSceneSetupFatal,
      severity: this.config.severity.error,
      message: `${this.config.messages.playSceneSetupFatal}: ${message}`,
      context: { stack: detail?.stack || "" },
    }, true);
  }

  captureSystemFinding(finding, sticky = true) {
    if (!finding?.key || !finding?.code) return false;
    this._activateFinding(finding, sticky);
    this._notify();
    return true;
  }

  markLifecycle(stage, context = {}) {
    this._pushEvent({
      code: this.config.events.lifecycle,
      severity: this.config.severity.info,
      message: `${this.config.messages.lifecycle}: ${stage}`,
      context,
    });
  }

  sample() {
    if (!this.game) return this.snapshot();
    this.workerBridge?.heartbeat?.();
    this._instrumentScenes();
    const result = evaluateRuntimeCanaries(
      this.game,
      this.sampleState,
      this.now(),
      this.documentRef?.hidden === true,
      this.config,
    );
    this.telemetry = result.telemetry;
    const sampledKeys = new Set(result.findings.map(item => item.key));
    for (const key of this.activeFindings.keys()) {
      if (!this.stickyFindingKeys.has(key) && !sampledKeys.has(key)) {
        this.activeFindings.delete(key);
      }
    }
    result.findings.forEach(item => this._activateFinding(item, false));
    this._notify();
    return this.snapshot();
  }

  snapshot() {
    const findings = [...this.activeFindings.values()];
    const highestRank = findings.reduce(
      (rank, item) => Math.max(rank, this.config.severity.ranks[item.severity] ?? 0),
      0,
    );
    const status = highestRank >= this.config.severity.ranks.error
      ? this.config.status.critical
      : highestRank >= this.config.severity.ranks.warning
        ? this.config.status.degraded
        : this.config.status.healthy;
    const production = this.globalRef[this.config.globals.production] === true;
    return {
      schemaVersion: this.config.schemaVersion,
      status,
      buildId: this.globalRef[this.config.globals.buildId] || this.config.build.developmentId,
      mode: production ? this.config.build.productionMode : this.config.build.developmentMode,
      startedAt: new Date(this.startedAtMs).toISOString(),
      sampledAt: new Date(this.now()).toISOString(),
      telemetry: { ...this.telemetry },
      findings: findings.map(item => ({ ...item })),
      events: this.events.map(item => ({ ...item })),
      previousCritical: this.reporter.getLastCritical(),
    };
  }

  subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    this.subscribers.add(listener);
    listener(this.snapshot());
    return () => this.subscribers.delete(listener);
  }

  destroy() {
    if (this.timer !== null && this.clearIntervalFn) this.clearIntervalFn(this.timer);
    this.timer = null;
    this.sceneCleanups.splice(0).forEach(cleanup => cleanup());
    this.workerBridge?.destroy?.();
    this.subscribers.clear();
    if (this.globalRef[this.config.globals.monitor] === this) {
      delete this.globalRef[this.config.globals.monitor];
    }
    if (activeMonitor === this) activeMonitor = null;
  }

  _instrumentScenes() {
    const scenes = Array.isArray(this.game?.scene?.scenes) ? this.game.scene.scenes : [];
    for (const scene of scenes) {
      if (!scene || this.instrumentedScenes.has(scene)) continue;
      this.instrumentedScenes.add(scene);
      const key = scene?.sys?.settings?.key || scene?.constructor?.name || "UnknownScene";
      const loader = scene.load;
      const events = scene.events;
      const onLoadError = file => this._activateFinding({
        key: `${this.config.events.assetLoadFailure}:${file?.key || file?.src || key}`,
        code: this.config.events.assetLoadFailure,
        severity: this.config.severity.error,
        message: `${this.config.messages.assetLoadFailure}: ${file?.key || file?.src || key}`,
        context: { sceneKey: key, assetKey: file?.key || null, source: file?.src || null },
      }, true);
      const onStart = () => this.markLifecycle(`${key}:${this.config.sceneEvents.start}`);
      const onShutdown = () => this.markLifecycle(`${key}:${this.config.sceneEvents.shutdown}`);
      loader?.on?.(this.config.sceneEvents.loadError, onLoadError);
      events?.on?.(this.config.sceneEvents.start, onStart);
      events?.on?.(this.config.sceneEvents.shutdown, onShutdown);
      this.sceneCleanups.push(() => {
        loader?.off?.(this.config.sceneEvents.loadError, onLoadError);
        events?.off?.(this.config.sceneEvents.start, onStart);
        events?.off?.(this.config.sceneEvents.shutdown, onShutdown);
      });
    }
  }

  _activateFinding(finding, sticky) {
    const existing = this.activeFindings.get(finding.key);
    this.activeFindings.set(finding.key, finding);
    if (sticky) this.stickyFindingKeys.add(finding.key);
    if (!existing || existing.message !== finding.message) this._pushEvent(finding);
  }

  _pushEvent(event) {
    const entry = {
      id: ++this.sequence,
      at: new Date(this.now()).toISOString(),
      ...event,
    };
    this.events.push(entry);
    while (this.events.length > this.config.limits.eventHistory) this.events.shift();
    if (event.severity === this.config.severity.error) {
      const reportSnapshot = this.snapshot();
      reportSnapshot.previousCritical = null;
      this.reporter.handle(entry, reportSnapshot);
    }
    this._notify();
  }

  _notify() {
    if (this.subscribers.size === 0) return;
    const snapshot = this.snapshot();
    this.subscribers.forEach(listener => listener(snapshot));
  }
}

export function installRuntimeCanarySystem(options = {}) {
  const globalRef = options.globalRef || globalThis;
  const config = options.config || RUNTIME_CANARY_CONFIG;
  const existing = globalRef[config.globals.monitor];
  if (existing instanceof RuntimeCanarySystem) return existing;
  return new RuntimeCanarySystem(options).install();
}

export function reportPlaySceneSetupFailure(error) {
  activeMonitor?.capturePlaySceneSetupFailure(error);
}
