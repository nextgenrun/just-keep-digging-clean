import {
  CINEMATIC_VIDEO_CONFIG,
  resolveCinematicVideosEnabled,
} from "../../values/cinematicVideoConfig.js";
import { SCENE_SUSPENSION_KINDS } from "../../values/sceneRuntime.js";
import { CinematicVideoView } from "./CinematicVideoView.js";
import { USER_SETTINGS } from "../UserSettings.js";

export class CinematicVideoPlayer {
  constructor(scene, config = CINEMATIC_VIDEO_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.asset = null;
    this.options = null;
    this.view = null;
    this.video = null;
    this.suspension = null;
    this.pausedMusicTrack = null;
    this.startupTimer = null;
    this.completionTimer = null;
    this.skipHoldTimer = null;
    this.skipHoldCode = null;
    this.skipHoldStartedAtMs = 0;
    this.startGestureKeyCode = null;
    this.playRequested = false;
    this.playing = false;
    this.finished = false;
    this.startedAtMs = 0;
    this._onKeyDown = event => this._handleKeyDown(event);
    this._onKeyUp = event => this._handleKeyUp(event);
    this._onPointerDown = () => this._handlePointerDown();
    this._onUpdate = () => this._updateSkipHold();
    this._onResize = () => this.view?.layout?.();
    this._onShutdown = () => this.destroy();
  }

  play(asset, options = {}) {
    if (this.asset || !asset || !resolveCinematicVideosEnabled(this.config)) return false;
    this.asset = asset;
    this.options = options;
    this.finished = false;
    this._createPresentation();
    this._bindInput();
    this._suspendGameplay();
    this._pauseMusic();
    this._publish(
      options.autoStart ? this.config.health.states.ready : this.config.health.states.waiting,
    );
    if (options.autoStart) this._beginPlayback();
    return true;
  }

  _createPresentation() {
    this.view = new CinematicVideoView(this.scene, this.asset, this.config).create();
    this.video = this.view.video;
    this.video.on("created", this._onVideoCreated, this);
    this.video.on("play", this._onVideoPlaying, this);
    this.video.on("playing", this._onVideoPlaying, this);
    this.video.on("complete", this._onVideoComplete, this);
    this.video.on("locked", this._onVideoLocked, this);
    this.video.on("stalled", this._onVideoStalled, this);
    this.video.on("error", this._onVideoError, this);
    this.video.on("unsupported", this._onVideoError, this);
  }

  _bindInput() {
    this._unsubscribeAudio = USER_SETTINGS.subscribe(() => this._applyAudioSettings());
    this.scene.input.keyboard?.on?.("keydown", this._onKeyDown);
    this.scene.input.keyboard?.on?.("keyup", this._onKeyUp);
    this.scene.input?.on?.("pointerdown", this._onPointerDown);
    this.scene.events?.on?.("update", this._onUpdate);
    this.scene.scale?.on?.("resize", this._onResize);
    this.scene.events?.once?.("shutdown", this._onShutdown);
  }

  _unbindInput() {
    this._unsubscribeAudio?.();
    this._unsubscribeAudio = null;
    this.scene.input.keyboard?.off?.("keydown", this._onKeyDown);
    this.scene.input.keyboard?.off?.("keyup", this._onKeyUp);
    this.scene.input?.off?.("pointerdown", this._onPointerDown);
    this.scene.events?.off?.("update", this._onUpdate);
    this.scene.scale?.off?.("resize", this._onResize);
    this.scene.events?.off?.("shutdown", this._onShutdown);
  }

  _handleKeyDown(event) {
    const code = event?.code || "";
    if (!this.playRequested) {
      if (this.config.playback.preStartSkipKeyCodes.includes(code)) {
        event?.preventDefault?.();
        this._beginSkipHold(code, true);
      } else if (!event?.repeat) {
        event?.preventDefault?.();
        this.startGestureKeyCode = code;
        this._beginPlayback();
      }
      return;
    }
    if (!this.playing) {
      if (!event?.repeat) {
        event?.preventDefault?.();
        this.startGestureKeyCode = code;
        this.video?.play?.(false);
      }
      return;
    }
    if (code === this.startGestureKeyCode) return;
    if (!this.config.playback.skipKeyCodes.includes(code)) return;
    event?.preventDefault?.();
    this._beginSkipHold(code);
  }

  _handleKeyUp(event) {
    const code = event?.code || "";
    if (code === this.startGestureKeyCode) this.startGestureKeyCode = null;
    if (code !== this.skipHoldCode) return;
    event?.preventDefault?.();
    this._cancelSkipHold(code);
  }

  _handlePointerDown() {
    if (!this.playRequested) {
      this._beginPlayback();
      return;
    }
    if (!this.playing) {
      this.video?.play?.(false);
    }
  }

  _beginPlayback() {
    if (this.finished || this.playRequested) return;
    this.playRequested = true;
    this.view?.showPrompt?.(this.config.copy.loading);
    this._publish(this.config.health.states.loading);
    this._applyAudioSettings();
    this.video?.play?.(false);
    this.startupTimer = this.scene.time?.delayedCall?.(
      this.config.playback.startupTimeoutMs,
      () => this._finish(this.config.health.states.failed, "startup-timeout"),
    );
  }

  _onVideoCreated() {
    this.view?.layout?.();
    this._applyAudioSettings();
  }

  _applyAudioSettings() {
    // HTML video has its own output, so Phaser's WebAudio master cannot scale it.
    // The film's baked dialogue/music mix follows Voice as a single recording.
    const audio = USER_SETTINGS.getAudio();
    const gain = audio.sfxEnabled ? audio.masterVolume * audio.voiceVolume : 0;
    this.video?.setVolume?.(this.config.playback.volume * gain);
  }

  _onVideoPlaying() {
    if (this.finished) return;
    this.playing = true;
    this.startedAtMs = this.scene.time?.now || 0;
    this.startupTimer?.remove?.();
    this.startupTimer = null;
    this.view?.showPlaying?.();
    if (!this.completionTimer) {
      this.completionTimer = this.scene.time?.delayedCall?.(
        this.asset.durationSeconds * 1000 + this.config.playback.completionGraceMs,
        () => this._finish(this.config.health.states.failed, "completion-timeout"),
      );
    }
    this._publish(this.config.health.states.playing);
  }

  _onVideoLocked() {
    this.view?.showPrompt?.(this.config.copy.locked);
    this._publish(this.config.health.states.waiting, "autoplay-locked");
  }

  _onVideoStalled() {
    if (!this.playing) this.view?.showPrompt?.(this.config.copy.stalled);
  }

  _onVideoComplete() {
    this._finish(this.config.health.states.complete);
  }

  _onVideoError(_video, error) {
    this._finish(this.config.health.states.failed, error?.message || "video-error");
  }

  _canSkip() {
    const now = this.scene.time?.now || 0;
    return now - this.startedAtMs >= this.config.playback.skipInputDelayMs;
  }

  _beginSkipHold(code, allowBeforePlayback = false) {
    if (this.finished || this.skipHoldCode) return false;
    if (!allowBeforePlayback && (!this.playing || !this._canSkip())) return false;
    this.skipHoldCode = code;
    this.skipHoldStartedAtMs = this.scene.time?.now || 0;
    this.view?.setSkipHoldProgress?.(0, true);
    this.skipHoldTimer = this.scene.time?.delayedCall?.(
      this.config.playback.skipHoldDurationMs,
      () => this._finish(this.config.health.states.skipped),
    ) || null;
    return true;
  }

  _updateSkipHold() {
    if (!this.skipHoldCode) return;
    const elapsed = (this.scene.time?.now || 0) - this.skipHoldStartedAtMs;
    const progress = elapsed / this.config.playback.skipHoldDurationMs;
    this.view?.setSkipHoldProgress?.(progress, true);
  }

  _cancelSkipHold(code = null) {
    if (code && code !== this.skipHoldCode) return false;
    this.skipHoldTimer?.remove?.();
    this.skipHoldTimer = null;
    this.skipHoldCode = null;
    this.skipHoldStartedAtMs = 0;
    this.view?.setSkipHoldProgress?.(0, false);
    return true;
  }

  _suspendGameplay() {
    if (this.options.suspendGameplay !== true) return;
    this.suspension = this.scene.acquireSceneSuspension?.(
      SCENE_SUSPENSION_KINDS.DIALOG,
      `cinematic:${this.asset.id}`,
    ) || null;
    this.scene.playerController?.setControlsEnabled?.(false);
    this.scene.uiNotifications?.setPaused?.(true);
  }

  _restoreGameplay() {
    if (this.options?.suspendGameplay !== true) return;
    this.suspension?.release?.();
    this.suspension = null;
    this.scene.playerController?.setControlsEnabled?.(
      this.scene.sceneModeController?.isGameplayActive === true,
    );
    this.scene.uiNotifications?.setPaused?.(false);
  }

  _pauseMusic() {
    const track = this.options.audioSystem?.currentTrack;
    if (track?.isPlaying !== true || typeof track.pause !== "function") return;
    try {
      track.pause();
      this.pausedMusicTrack = track;
    } catch (error) {
      console.warn("[CinematicVideoPlayer] Music pause failed", error);
    }
  }

  _resumeMusic() {
    if (!this.pausedMusicTrack || typeof this.pausedMusicTrack.resume !== "function") return;
    try {
      this.pausedMusicTrack.resume();
    } catch (error) {
      console.warn("[CinematicVideoPlayer] Music resume failed", error);
    }
    this.pausedMusicTrack = null;
  }

  _publish(status, detail = "") {
    globalThis[this.config.health.globalKey] = Object.freeze({
      status,
      assetId: this.asset?.id || null,
      detail,
      playing: this.playing,
    });
  }

  _finish(status, detail = "", notify = true) {
    if (this.finished) return false;
    this.finished = true;
    this._cancelSkipHold();
    this.startGestureKeyCode = null;
    this.startupTimer?.remove?.();
    this.completionTimer?.remove?.();
    this.startupTimer = null;
    this.completionTimer = null;
    this._unbindInput();
    this.view?.destroy?.();
    this.view = null;
    this.video = null;
    this.playing = false;
    this._restoreGameplay();
    this._resumeMusic();
    this._publish(status, detail);
    const onComplete = this.options?.onComplete;
    this.asset = null;
    this.options = null;
    if (notify) onComplete?.({ status, detail });
    return true;
  }

  destroy() {
    if (!this.asset) return;
    this._finish(this.config.health.states.destroyed, "scene-shutdown", false);
  }
}
