import { DynamicEventHealthSystem } from "../../systems/health/DynamicEventHealthSystem.js";
import { DynamicEventAwarenessView } from "../../systems/visual/DynamicEventAwarenessView.js";
import { DynamicEventDevPanel } from "../../systems/visual/DynamicEventDevPanel.js";
import { DYNAMIC_EVENT_HEALTH as cfg } from "../../values/dynamicEventHealth.js";
import { GAME_CONFIG } from "../../values/gameConfig.js";
import { isLocalGameplayProfileHost } from "../../values/gameplayCapabilities.js";
import { USER_SETTINGS, normalizeKey } from "../../systems/UserSettings.js";
import { forceGraveborerWurmEncounter } from "./GraveborerWurmBridge.js";
import { hasEscapeClosableUi } from "./hasEscapeClosableUi.js";

export class DynamicEventRuntime {
  constructor(scene, { review = false } = {}) {
    this.scene = scene;
    this.review = review;
    this.health = new DynamicEventHealthSystem();
    this.awareness = new DynamicEventAwarenessView(scene);
    this.devEnabled = !review && GAME_CONFIG.debugMode === true
      && globalThis.__DIG_GAME_PRODUCTION__ !== true
      && isLocalGameplayProfileHost(globalThis.location?.hostname);
    this.panel = this.devEnabled ? new DynamicEventDevPanel(scene, this) : null;
    this.pendingShadow = null;
    this.lastUpdateAt = 0;
    this.nextSampleAt = 0;
    this.api = { snapshot: () => this.getHealthSnapshot(), trigger: (id, options) => this.request(id, options) };
    if (this.devEnabled && globalThis.window) globalThis.window[cfg.globalKey] = this.api;
  }
  canUseShortcut() {
    return !Object.values(USER_SETTINGS.getKeybinds?.() || {}).some(key => normalizeKey(key) === cfg.dev.key);
  }
  _shadow(time) {
    const system = this.scene.shadowMinerSystem;
    if (!system) return { phase: "missing", issue: cfg.labels.missing, pulse: null };
    const snap = system.getHealthSnapshot();
    const active = snap.active;
    const tile = this.scene.playerController?.getPlayerTile?.();
    const depth = (tile?.ty || 0) - this.scene.config.topAirRows;
    const blocked = !system.mode.enabled || depth < system.profile.minimumDepthTiles;
    const reason = !system.mode.enabled ? cfg.labels.disabled : depth < system.profile.minimumDepthTiles
      ? cfg.labels.depth : this.pendingShadow ? cfg.labels.pending
        : (snap.lastSpawnAttempt?.reason || cfg.labels.chance)
          + " · " + Math.ceil(Math.max(0, snap.nextCheckAtMs - time) / 1000) + "s";
    const anchor = system.view.anchor, player = this.scene.player;
    const distance = anchor && player ? Math.hypot(anchor.x - player.x, anchor.y - player.y) / this.scene.config.tileSize : null;
    const direction = anchor && player ? anchor.x < player.x ? cfg.labels.left : cfg.labels.right : cfg.labels.near;
    return { phase: snap.state, active, pulse: snap.lastUpdateAtMs, blocked, reason, pending: Boolean(this.pendingShadow),
      monitor: system.mode.enabled, source: snap,
      detail: direction + (distance === null ? "" : " · " + distance.toFixed(1) + "m") + " · " + cfg.actions.shadow,
      issue: active && !snap.view?.visible ? cfg.labels.textures
        : snap.state === "observing" && snap.work?.lastResult === "animation unavailable" ? cfg.labels.animation : null };
  }
  _wurm() {
    const runtime = this.scene.graveborerWurmRuntime, system = this.scene.graveborerWurmSystem;
    if (!system) return { phase: "missing", issue: cfg.labels.missing, pulse: null };
    const snap = system.getSnapshot(), gate = runtime?.lastGate || {};
    const active = ["warning", "burrowing"].includes(snap.phase);
    const blocked = !system.enabled || (!this.review && !gate.active);
    const reason = !system.enabled ? cfg.labels.disabled : !gate.hardcoreArmed ? cfg.labels.hardcore
      : !gate.flightUnlocked ? cfg.labels.flight : !gate.depthEligible ? cfg.labels.depth
        : snap.cooldownMs > 0 ? cfg.labels.cooldown + " · " + Math.ceil(snap.cooldownMs / 1000) + "s"
          : cfg.labels.noise + " · " + snap.noise.toFixed(1);
    const visual = runtime?.visual || this.scene.wurmView;
    return { phase: snap.phase, active, pulse: snap.heartbeat, blocked,
      monitor: !this.review || active, paused: active && !snap.active, reason, source: snap,
      encounterResult: runtime?.lastEncounterResult || null,
      detail: (snap.variant?.label || cfg.names.wurm) + " · " + snap.passIndex + "/" + snap.passCount
        + (snap.phase === "warning" ? " · " + (snap.warningRemainingMs / 1000).toFixed(1) + "s" : "")
        + " · " + (snap.phase === "warning" ? cfg.actions.wurmWarning : cfg.actions.wurm),
      issue: active && visual?.ready === false ? cfg.labels.textures : null };
  }
  _quake() {
    const system = this.scene.earthquakeSystem;
    if (!system) return { phase: "missing", issue: cfg.labels.missing, pulse: null };
    const snap = system.getStatus();
    const active = snap.state !== "idle" || snap.caveIns > 0 || snap.fallingRocks > 0;
    const blocked = snap.suppressed || snap.paused;
    const reason = snap.suppressed ? cfg.labels.suppressed : snap.paused ? cfg.labels.intro
      : Math.ceil(Math.max(0, snap.nextEventMs) / 1000) + "s · " + snap.nextEventSchedule;
    return { phase: snap.state, active, pulse: snap.heartbeat, blocked, reason, paused: snap.paused,
      monitor: !blocked && (!this.review || active), source: snap, detail: cfg.actions.earthquake };
  }
  update(time) {
    this.lastUpdateAt = time;
    if (this.pendingShadow) {
      if (this.scene.shadowMinerSystem?.state !== "dormant") this.pendingShadow = null;
      else if (time >= this.pendingShadow.deadline) {
        this.health.record("shadow", cfg.labels.blocked, cfg.labels.timeout, time);
        this.pendingShadow = null;
      } else if (time >= this.pendingShadow.nextTry) {
        this.pendingShadow.nextTry = time + cfg.retryMs;
        this.scene.shadowMinerSystem.forceSpawn();
      }
    }
    if (time < this.nextSampleAt) return;
    this.nextSampleAt = time + cfg.sampleIntervalMs;
    this.health.observe("shadow", this._shadow(time), time);
    this.health.observe("wurm", this._wurm(), time);
    this.health.observe("earthquake", this._quake(), time);
    const signal = this.scene.randomEventBridge?.signal?.snapshot();
    this.health.observe("signal", { phase: signal?.phase || "idle", active: signal?.active === true, pulse: time, monitor: false, source: signal, reason: "Sparse calls · most lead to an empty camp" }, time);
    const snap = this.getHealthSnapshot();
    this.awareness.update(snap, time); this.panel?.update(snap);
  }
  request(id, selection = {}) {
    if (!this.devEnabled || !cfg.ids.includes(id)) return false;
    const scene = this.scene, time = scene.time.now;
    const rows = this.getHealthSnapshot().events;
    if (scene.randomEventBridge?.signal?.snapshot().active || this.pendingShadow || scene.shadowMinerSystem?.state !== "dormant"
      || ["warning", "burrowing"].includes(scene.graveborerWurmSystem?.phase)
      || scene.earthquakeSystem?.state !== "idle" || scene.earthquakeSystem?.caveIns.length
      || scene.earthquakeSystem?.fallingRocks.length
      || scene.gameState !== "playing" || hasEscapeClosableUi(scene)) {
      this.health.record(id, cfg.labels.blocked, cfg.labels.busy, time); return false;
    }
    let result = false, reason = null;
    if (id === "signal") {
      result = scene.randomEventBridge?.signal?.force(selection);
    } else if (id === "shadow") {
      result = scene.shadowMinerSystem?.forceSpawn();
      if (!result && scene.shadowMinerSystem?.mode.enabled) {
        this.pendingShadow = { deadline: time + cfg.requestTimeoutMs, nextTry: time + cfg.retryMs };
        this.health.record(id, cfg.labels.queued, cfg.labels.pending, time); return true;
      }
    } else if (id === "wurm") {
      scene.graveborerWurmSystem.selection = { ...selection };
      result = forceGraveborerWurmEncounter(scene, selection);
    } else {
      const quake = scene.earthquakeSystem;
      reason = quake?.suppressed ? cfg.labels.suppressed : quake?.paused ? cfg.labels.intro : null;
      if (!reason) result = quake?.start(selection.intensity || cfg.dev.intensities[1]);
    }
    this.health.record(id, result ? cfg.labels.accepted : cfg.labels.blocked,
      reason || rows[id]?.reason || id, time);
    return result;
  }
  cancel() {
    if (!this.devEnabled) return;
    const scene = this.scene, time = scene.time.now;
    this.pendingShadow = null;
    scene.randomEventBridge?.signal?.cinema.close();
    if (scene.randomEventBridge?.signal?.active) scene.randomEventBridge.signal.finish(true);
    cfg.ids.forEach(id => this.health.markCancelled(id, time));
    if (scene.shadowMinerSystem?.state !== "dormant") scene.shadowMinerSystem._beginVanish(time);
    const wurm = scene.graveborerWurmSystem;
    if (wurm && ["warning", "burrowing"].includes(wurm.phase)) {
      wurm.offspring = []; wurm._completeEncounter(false);
      scene.graveborerWurmRuntime.forcedDevEncounter = false;
    }
    scene.earthquakeSystem?.cancelActiveHazards();
    this.health.record("all", cfg.labels.cancelled, null, time);
  }
  getHealthSnapshot() {
    const snapshot = this.health.snapshot();
    const stale = !this.review && this.lastUpdateAt > 0 && this.scene.gameState === "playing"
      && !hasEscapeClosableUi(this.scene) && this.scene.time.now - this.lastUpdateAt > cfg.stalledMs;
    return { ...snapshot, ready: snapshot.ready && !stale, stale,
      pendingShadow: this.pendingShadow ? { ...this.pendingShadow } : null, devEnabled: this.devEnabled };
  }
  destroy() {
    this.awareness.destroy(); this.panel?.destroy(); this.pendingShadow = null;
    if (globalThis.window?.[cfg.globalKey] === this.api) delete globalThis.window[cfg.globalKey];
    this.scene = null;
  }
}