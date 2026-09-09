import { SignalTrapRuntime } from "./SignalTrapRuntime.js";
import { SIGNAL_MIA } from "../../values/signalMia.js";
import { hash01 } from "../../values/deterministicMath.js";
import { SIGNAL_EVENT as cfg } from "../../values/signalEvent.js";
import { getSignalSurvivor } from "../../values/signalSurvivors.js";
import { signalDistance, selectSignalLine, nextSignalGap } from "../../systems/events/signalEventRules.js";
import { SignalWorldView } from "../../systems/visual/SignalWorldView.js";
import { SignalCinematicView } from "../../systems/visual/SignalCinematicView.js";
import { SignalVoicePlayer } from "../../sound/SignalVoicePlayer.js";
import { SignalEventOutcome } from "./SignalEventOutcome.js";
import { planSignalEvent } from "./SignalEventPlanner.js";
import { clearSignalMinicamp } from "./SignalMinicamp.js";

export class SignalEventBridge {
  constructor(scene, director) {
    this.scene = scene; this.director = director; this.voice = new SignalVoicePlayer(scene);
    this.view = new SignalWorldView(scene); this.outcome = new SignalEventOutcome(scene, director);
    this.trap = new SignalTrapRuntime(this);
    this.cinema = new SignalCinematicView(scene, this.voice, (choice, selected) => this.choose(choice, selected));
    this.currentId = null; this.cueRemaining = 0; this.emptyRemaining = 0; this.loading = false;
    this.onPause = () => this.suspend();
    this.onSceneMode = () => { if (this.scene.gameState !== "playing" && !this.cinema.isVisible) this.suspend(); };
    scene.events.on("postupdate", this.onSceneMode);
    scene.events.on("pause", this.onPause);
    scene.events.on("sleep", this.onPause);
  }
  get active() { return this.director.state.active?.type === cfg.type ? this.director.state.active : null; }
  start(active) {
    if (this.currentId === active.id) return;
    this.currentId = active.id; this.cueRemaining = 0; this.emptyRemaining = 0;
    this.voice.stop(); this.view.clear(); this.trap.start(active);
    if (active.signal.pendingDeath) { void this.outcome.finishDeath(); return; }
    if (!clearSignalMinicamp(this.scene, active.anchors[0])) { this.finish(true); return; }
    this.survivor = getSignalSurvivor(active.signal.survivorId);
    this.loading = true;
    const id = active.id;
    void this.voice.preload(this.survivor).finally(() => { if (this.currentId === id) this.loading = false; });
    void this.view.showCamp(active);
  }
  update(time, delta, tile, paused = false) {
    const active = this.active;
    if (!active) return;
    this.start(active);
    if (!this.active || this.cinema.isVisible) return;
    if (paused) { this.suspend(); return; }
    const state = active.signal, distance = signalDistance(tile, active.anchors[0]);
    if ((!state.explosive || state.blastPhase === "dormant") && !this.scene.worldModel.isSolid(active.anchors[0].tx, active.anchors[0].ty + 1)) { this.finish(true); return; }
    if (this.emptyRemaining > 0) {
      this.emptyRemaining -= delta;
      this.view.update(active, tile, true, time);
      if (this.emptyRemaining <= 0) this.finish();
      return;
    }
    if (state.real && state.blastPhase !== "spent" && distance <= cfg.nearDistance) {
      void this.view.showSurvivor(active, this.survivor);
      if (!state.discovered) { state.discovered = true; this.scene.queueDugTilesSave?.(); }
    } else if (!state.real && distance <= cfg.interactDistance) {
      this.voice.stop(); this.view.cue(cfg.copy.silence, cfg.copy.title);
      this.emptyRemaining = cfg.cinema.minimumLineMs + cfg.captionTailMs;
      return;
    }
    if (this.trap.update(active, tile, distance, delta, time)) return;
    if (distance > cfg.hearingDistance) {
      this.suspend(); state.callInMs = Math.max(0, state.callInMs - delta); return;
    }
    this.cueRemaining = Math.max(0, this.cueRemaining - delta);
    state.callInMs = Math.max(0, state.callInMs - delta);
    const pan = (active.anchors[0].tx - tile.tx) / Math.max(1, distance);
    if (!this.loading && this.voice.canStart() && state.callInMs <= 0 && !this.cueRemaining) {
      const kind = selectSignalLine(distance, state.callSerial, this.survivor);
      const eerie = distance > cfg.nearDistance && hash01(this.director.state.seed, state.callSerial, cfg.cadenceSalt, 3) < cfg.audio.echoChance;
      const clip = this.voice.play(this.survivor, kind, distance, pan, eerie);
      const proximity = distance <= cfg.nearDistance ? cfg.copy.near : distance <= cfg.middleDistance ? cfg.copy.middle : cfg.copy.far;
      const horizontal = Math.abs(active.anchors[0].tx - tile.tx) < 1 ? "" : pan < 0 ? "LEFT" : "RIGHT";
      const vertical = Math.abs(active.anchors[0].ty - tile.ty) < 2 ? "" : active.anchors[0].ty > tile.ty ? "BELOW" : "ABOVE";
      const dog = this.survivor.kind === "dog";
      this.view.cue(dog ? clip.text : '“' + clip.text + '”', "[" + (dog ? SIGNAL_MIA.copy.unknown : cfg.copy.unknown) + " · " + proximity + " · " + [vertical, horizontal].filter(Boolean).join(" ") + (eerie ? " · " + cfg.copy.echo : "") + "]");
      this.view.setPose(cfg.art.pose.call);
      this.cueRemaining = clip.durationMs + cfg.captionTailMs;
      state.callSerial++;
      state.callInMs = this.cueRemaining + nextSignalGap(this.director.state.seed, state.callSerial + this.director.state.serial);
      this.scene.queueDugTilesSave?.();
    }
    if (!this.cueRemaining) this.view.setPose(cfg.art.pose.rest);
    this.voice.position(distance, pan);
    this.view.update(active, tile, this.cueRemaining > 0, time);
  }
  getInteractionDistance(tile) {
    const active = this.active;
    if (!active || active.suspended || active.signal.explosive || !active.signal.real || !active.signal.discovered || !this.view.sprite) return Infinity;
    return signalDistance(tile, active.anchors[0]);
  }
  handleInteract() {
    const tile = this.scene.playerController.getPlayerTile();
    if (this.getInteractionDistance(tile) > cfg.interactDistance || this.loading) return false;
    const active = this.active;
    if (active.signal.pendingDeath) return false;
    this.voice.stop(); this.view.root.setVisible(false); this.view.ripples.clear(); this.view.prompt.setVisible(false);
    return this.cinema.open(active, this.survivor);
  }
  async choose(choice, amounts) {
    const result = await this.outcome.choose(this.currentId, choice, amounts);
    this.view.clear(); this.cueRemaining = 0;
    return result;
  }
  force(options = {}) {
    if (this.director.flags.master === false || this.director.flags.signal === false) return false;
    if (this.active || this.director.state.active || this.cinema.isVisible) return false;
    const tile = this.scene.playerController.getPlayerTile();
    const plan = planSignalEvent(this.scene, tile, this.director.state.serial + 1, { kind: "survivor", ...options });
    if (!plan) return false;
    const active = this.director.start(cfg.type, { ...plan, startedDepth: Math.max(0, tile.ty - this.scene.config.topAirRows) });
    if (!active) return false;
    this.start(active); this.scene.queueDugTilesSave?.(); return Boolean(this.active);
  }
  finish(interrupted = false) {
    if (this.cinema.isVisible || (!interrupted && this.active?.signal?.explosive && this.active.signal.blastPhase !== "dormant")) return false;
    this.trap.reset();
    this.director.finish({ interrupted }); this.voice.stop(); this.view.clear();
    this.currentId = null; this.scene.queueDugTilesSave?.(); return true;
  }
  suspend() {
    this.trap.suspend();
    this.voice.stop(); this.cueRemaining = 0;
    this.view.root.setVisible(false); this.view.ripples.clear(); this.view.prompt.setVisible(false);
  }
  snapshot() {
    return { phase: this.cinema.isVisible ? this.cinema.phase : this.active ? this.active.signal.explosive && this.active.signal.blastPhase !== "dormant" ? this.active.signal.blastPhase : this.emptyRemaining > 0 ? "fading" : "calling" : "idle",
      active: Boolean(this.active || this.cinema.isVisible), loading: this.loading, cueVisible: this.cueRemaining > 0,
      survivorVisible: Boolean(this.view.sprite), campVisible: Boolean(this.view.camp), cinema: this.cinema.phase,
      event: this.active ? JSON.parse(JSON.stringify(this.active)) : null };
  }
  destroy() {
    this.scene.events.off("postupdate", this.onSceneMode);
    this.scene.events.off("pause", this.onPause); this.scene.events.off("sleep", this.onPause);
    this.trap.destroy(); this.cinema.destroy(); this.voice.destroy(); this.view.destroy(); this.scene = null;
  }
}
