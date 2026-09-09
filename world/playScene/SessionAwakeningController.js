import { SESSION_AWAKENING as C } from "../../values/sessionAwakening.js";
import { SCENE_BASE_PHASES } from "../../values/sceneRuntime.js";
import { SessionAwakeningAudio } from "../../sound/SessionAwakeningAudio.js";
import { chooseAwakening, sampleAwakening, sampleDozing, sampleSleepTimelapse, awakeningEase } from "./sessionAwakeningPresentation.js";

/** Owns entry/rest awakenings and the bed's reversible dozing presentation. */
export class SessionAwakeningController {
  constructor(scene, createView, { enabled = true } = {}) {
    this.scene = scene;
    this.createView = createView;
    const search = new URLSearchParams(globalThis.location?.search || "");
    this.enabled = enabled && C.enabled && search.get(C.query) !== "0";
    this.forced = search.get("jkd_e2e") === "1" ? search.get(C.reviewQuery) : null;
    this.forceBlur = search.get("jkd_e2e") === "1" ? search.get("awakeningBlur") : null;
    this.elapsedMs = 0;
    this.status = "idle";
    this.active = this.blocksGameplay = this.started = this.destroyed = false;
    this.source = "session";
    this._tick = (_time, delta) => {
      try { this.update(delta); } catch (error) { this.error = error.message; this.finish("unavailable"); }
    };
    this._key = event => { if (!event.repeat) this.skip(); };
    this._pointer = (_pointer, _x, _y, event) => { event?.stopPropagation?.(); this.skip(); };
    this._suspend = () => this.finish("suspended");
    this._visibility = () => { if (globalThis.document?.hidden) this.finish("hidden"); };
    if (this.enabled) this.view = createView?.(scene) || null;
  }

  begin() {
    if (!this.enabled || this.started || this.destroyed || !this.view) return false;
    this.started = true;
    return this._awaken("session");
  }

  awakenFromSleep() {
    if (!this.enabled || this.destroyed) return false;
    if (this.active) this.finish("rest-wake");
    return this._awaken("rest");
  }

  _reset(source) {
    this.source = source;
    this.elapsedMs = 0;
    this.skipStartedMs = this.skipFrame = this.frame = this.playedAudio = this.error = null;
    this.view ||= this.createView?.(this.scene) || null;
    return Boolean(this.view);
  }

  _watch() {
    this.scene.events.on("postupdate", this._tick);
    this.scene.events.on("pause", this._suspend);
    this.scene.events.on("sleep", this._suspend);
    this.scene.input.keyboard?.on("keydown", this._key);
    this.view.zone?.on("pointerdown", this._pointer);
    globalThis.document?.addEventListener("visibilitychange", this._visibility);
  }

  _awaken(source) {
    try {
      if (!this._reset(source)) return false;
      const reduced = globalThis.matchMedia?.(C.reducedMotionQuery)?.matches === true;
      this.selection = chooseAwakening(this.scene.registry.get(C.historyKey), { forced: this.forced, reduced });
      if (this.forceBlur === "0") this.selection.blurStrength = 0;
      if (this.forceBlur === "1" && !reduced) this.selection.blurStrength = C.variants.find(item => item.id === this.selection.id).blurStrength;
      this.scene.registry.set(C.historyKey, this.selection.id);
      this.active = this.blocksGameplay = true;
      this.status = "awakening";
      if (source === "session") this.scene.setSceneBasePhase(SCENE_BASE_PHASES.TRANSITIONING, { source: "session-awakening" });
      this.scene.playerController?.setControlsEnabled(false);
      this.view.begin(this.selection);
      this.audio = new SessionAwakeningAudio(this.scene, this.selection);
      if (source === "session" && !this.scene._teleportInAnimating) this.scene.playTeleportInAnimation?.();
      this._watch();
      this.update(0);
      return true;
    } catch (error) {
      this.error = error.message;
      this.finish("unavailable");
      return false;
    }
  }

  beginDozing(durationMs) {
    if (!this.enabled || this.destroyed) return false;
    if (this.active) this.finish("rest-start");
    try {
      if (!this._reset("dozing")) return false;
      const reduced = globalThis.matchMedia?.(C.reducedMotionQuery)?.matches === true;
      this.selection = { id: "dozing-off", dozing: true, reduced, durationMs,
        cameraScale: 0, breathRate: C.sleep.breathRate,
        blurStrength: !reduced && Math.random() < C.sleep.blurChance ? C.sleep.blurStrength : 0 };
      if (this.forceBlur === "0") this.selection.blurStrength = 0;
      if (this.forceBlur === "1" && !reduced) this.selection.blurStrength = C.sleep.blurStrength;
      this.active = true;
      this.blocksGameplay = false; // The bed retains its own suspension and clock.
      this.status = "dozing";
      this.view.begin(this.selection);
      this.audio = new SessionAwakeningAudio(this.scene, this.selection);
      this._watch();
      this.updateDozing(0);
      return true;
    } catch (error) {
      this.error = error.message;
      this.finish("unavailable");
      return false;
    }
  }

  beginSleepTimelapse(durationMs, fadeMs) {
    if (!this.active || this.source !== "dozing") return false;
    this.source = this.status = "sleep-timelapse";
    this.selection = { ...this.selection, id: "sleep-timelapse", timelapse: true,
      durationMs, fadeMs, blurStrength: 0 };
    this.view.restoreCamera(); // Remove soft focus before the outdoor shot is revealed.
    this.updateDozing(0);
    return true;
  }

  updateDozing(elapsedMs) {
    if (!this.active || !this.selection?.dozing) return;
    try {
      this.elapsedMs = elapsedMs;
      this.frame = this.selection.timelapse ? sampleSleepTimelapse(this.selection, elapsedMs)
        : sampleDozing(this.selection, elapsedMs);
      this.view.render(this.frame);
      this.audio?.update(this.selection.timelapse ? 1 : this.frame.progress, !this.selection.timelapse);
    } catch (error) { this.error = error.message; this.finish("unavailable"); }
  }

  update(delta = 0) {
    if (!this.active || this.destroyed || this.selection?.dozing) return;
    if (this.source === "session" && this.scene.sceneModeController.basePhase !== SCENE_BASE_PHASES.TRANSITIONING && this.blocksGameplay) {
      this.finish("interrupted");
      return;
    }
    this.elapsedMs += Math.max(0, Math.min(C.maxDeltaMs, Number(delta) || 0));
    let frame = sampleAwakening(this.selection, this.elapsedMs);
    if (this.skipStartedMs != null) {
      const skip = awakeningEase(0, C.skipFadeMs, this.elapsedMs - this.skipStartedMs);
      const start = this.skipFrame;
      frame = { ...frame, opening: start.opening + (1 - start.opening) * skip,
        lidAlpha: start.lidAlpha * (1 - skip), hudAlpha: start.hudAlpha + (1 - start.hudAlpha) * skip,
        blur: start.blur * (1 - skip), cameraY: start.cameraY * (1 - skip),
        cameraZoom: start.cameraZoom * (1 - skip), animationRate: 1,
        release: skip >= 1, complete: skip >= 1, progress: start.progress + (1 - start.progress) * skip };
    }
    this.frame = frame;
    this.view.render(frame);
    this.audio?.update(frame.progress, this.skipStartedMs == null);
    if (this.source === "session" && this.blocksGameplay && this.scene._teleportInAnimating) this.scene.player.anims.timeScale = frame.animationRate;
    if (frame.release) this.release();
    if (frame.complete) this.finish(this.skipStartedMs == null ? "complete" : "skipped");
  }

  skip() {
    if (!this.blocksGameplay || this.elapsedMs < C.minSkipMs || this.skipStartedMs != null) return false;
    this.skipStartedMs = this.elapsedMs;
    this.skipFrame = { ...this.frame };
    return true;
  }

  release() {
    if (!this.blocksGameplay) return;
    this.blocksGameplay = false;
    this.view?.release();
    this.scene.input.keyboard?.off("keydown", this._key);
    if (this.source === "session") {
      if (this.scene.player?.anims) this.scene.player.anims.timeScale = 1;
      if (this.scene._teleportInAnimating) {
        this.scene._teleportInAnimating = false;
        if (!this.destroyed && !this.scene._isShuttingDown) this.scene.updatePlayerVisualState?.(true);
      }
    }
    if (!this.destroyed && !this.scene._isShuttingDown) {
      if (this.source === "session" && this.scene.sceneModeController.basePhase === SCENE_BASE_PHASES.TRANSITIONING) {
        this.scene.setSceneBasePhase(SCENE_BASE_PHASES.ACTIVE, { source: "session-awakening-complete" });
      }
      this.scene.playerController?.setControlsEnabled(this.scene.sceneModeController.isGameplayActive);
    }
  }

  finish(status = "complete") {
    if (!this.active) return;
    this.active = false;
    this.status = status;
    this.playedAudio = [...(this.audio?.played || [])];
    this.release();
    this.scene.events.off("postupdate", this._tick);
    this.scene.events.off("pause", this._suspend);
    this.scene.events.off("sleep", this._suspend);
    this.scene.input.keyboard?.off("keydown", this._key);
    globalThis.document?.removeEventListener("visibilitychange", this._visibility);
    this.audio?.destroy();
    this.audio = null;
    this.view?.destroy();
    this.view = null;
  }

  snapshot() {
    return { active: this.active, blocksGameplay: this.blocksGameplay, source: this.source, status: this.status,
      variant: this.selection?.id || null, durationMs: this.selection?.durationMs || 0,
      elapsedMs: this.elapsedMs, blurStrength: this.selection?.blurStrength || 0,
      reduced: this.selection?.reduced || false, ...this.frame,
      playedAudio: this.playedAudio || this.audio?.played || [], error: this.error || null };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.active) this.finish("destroyed");
    this.view?.destroy();
    this.view = null;
  }
}
