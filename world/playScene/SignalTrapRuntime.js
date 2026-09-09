import { SIGNAL_EVENT } from "../../values/signalEvent.js";
import { SIGNAL_TRAP as cfg } from "../../values/signalRisk.js";
import { signalBlastHits, signalHasCover } from "../../systems/events/signalRiskRules.js";
import { SignalTrapView } from "../../systems/visual/SignalTrapView.js";

// Arms on approach, samples the blast once, and commits through Signal's outcome authority.
export class SignalTrapRuntime {
  constructor(bridge) {
    this.bridge = bridge; this.scene = bridge.scene; this.view = new SignalTrapView(this.scene);
    this.id = null; this.pending = false; this.retryInMs = 0;
  }
  start(active) {
    this.id = active.id; this.pending = false; this.retryInMs = 0; this.view.reset();
    if (active.signal.explosive) void this.view.prepare();
  }
  update(active, tile, distance, delta, time) {
    const state = active.signal;
    if (!state.explosive) return false;
    if (state.pendingDeath) return true;
    if (state.blastPhase === "spent") {
      this.retryInMs = Math.max(0, this.retryInMs - delta);
      if (!this.pending && !this.retryInMs) void this.resolve(active);
      return true;
    }
    if (!this.view.ready || !this.bridge.view.sprite) return false;
    if (state.blastPhase === "dormant") {
      if (distance > cfg.triggerDistance || signalHasCover(this.scene.worldModel, active.anchors[0], tile)) return false;
      state.discovered = true; state.blastPhase = "fuse";
      state.fuseRemainingMs = cfg.fuseMs;
      this.bridge.voice.stop(); this.bridge.cueRemaining = 0;
      this.scene.queueDugTilesSave?.();
      // The first visible frame always shows the complete warning; no hidden loader time is charged.
      this.present(active, tile, time); return true;
    }
    state.fuseRemainingMs = Math.max(0, state.fuseRemainingMs - Math.max(0, delta));
    if (state.fuseRemainingMs > 0) { this.present(active, tile, time); return true; }
    state.blastPhase = "spent";
    state.blastFatal = signalBlastHits(this.scene.worldModel, active.anchors[0], tile);
    this.bridge.voice.stop();
    this.bridge.view.clearSurvivor();
    this.bridge.view.camp?.setTint(cfg.art.tint).setAlpha(cfg.art.fuseAlpha);
    this.bridge.view.cue(cfg.copy.explosion, SIGNAL_EVENT.copy.title);
    this.view.detonate(active);
    this.scene.queueDugTilesSave?.();
    void this.resolve(active);
    return true;
  }
  present(active, tile, time) {
    this.bridge.view.setPose(SIGNAL_EVENT.art.pose.guard);
    this.bridge.view.sprite?.setTint(cfg.art.tint);
    this.view.fuse(active, active.signal.fuseRemainingMs);
    this.bridge.view.cue(cfg.copy.tell, cfg.copy.tellLabel);
    this.bridge.view.update(active, tile, true, time);
    this.bridge.view.prompt.setVisible(false);
  }
  async resolve(active) {
    if (this.pending || this.id !== active.id) return;
    this.pending = true;
    try {
      const result = await this.bridge.outcome.choose(active.id, "blast");
      if (this.id !== active.id) return;
      this.bridge.view.clear(); this.bridge.cueRemaining = 0;
      if (result.afterClose) void result.afterClose();
      else if (result.fatal) this.scene.uiNotifications?.warning?.(result.message, { key: "signal-blast" });
      else this.scene.uiNotifications?.success?.(result.message, { key: "signal-blast" });
    } catch {
      // Keep the sampled hit and zero fuse; a failed save cannot reroll or resurrect the trap.
      this.retryInMs = cfg.retryMs;
      this.bridge.view.cue(cfg.copy.retry, SIGNAL_EVENT.copy.title);
    } finally { this.pending = false; }
  }
  suspend() { this.view.suspend(); }
  reset() { this.id = null; this.pending = false; this.view.reset(); }
  destroy() { this.id = null; this.view.destroy(); this.scene = null; }
}
