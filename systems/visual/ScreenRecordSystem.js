import { SCREEN_RECORD_CONFIG } from "../../values/screenRecordConfig.js";
import { ScreenRecordUiVisibility } from "./ScreenRecordUiVisibility.js";
import {
  GAMEPLAY_FEATURE_IDS,
  isGameplayFeatureEnabled,
} from "../../values/gameplayDevFlags.js";

export function selectSupportedMimeType(mediaRecorder, preferredMimeTypes) {
  if (!mediaRecorder?.isTypeSupported) return "";
  return preferredMimeTypes.find(type => mediaRecorder.isTypeSupported(type)) || "";
}

export function canCaptureCanvas(canvas, mediaRecorder = globalThis.MediaRecorder) {
  return Boolean(canvas?.captureStream && mediaRecorder);
}

export function normalizeCaptureMode(value, config = SCREEN_RECORD_CONFIG) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return Object.values(config.modes).find(mode => mode.aliases.includes(normalized))?.id || null;
}

export class ScreenRecordSystem {
  constructor(scene, config = SCREEN_RECORD_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.enabled = isGameplayFeatureEnabled(
      GAMEPLAY_FEATURE_IDS.SCREEN_CAPTURE,
      scene?.gameplayCapabilities,
    );
    this.recorder = null;
    this.stream = null;
    this.chunks = [];
    this.saving = false;
    this.discardOnStop = false;
    this.recordingCanvas = null;
    this.recordingContext = null;
    this.renderFrameId = 0;
    this.audioCapture = null;
    this.lastToggleAt = 0;
    this.indicator = null;
    this.activeMode = null;
    this.pendingStart = false;
    this.uiVisibility = null;
    this.preRenderHandler = null;
    this.postRenderHandler = null;
  }

  async toggle() {
    if (!this.enabled) return false;
    const now = Date.now();
    if (now - this.lastToggleAt < 250) return false;
    this.lastToggleAt = now;
    if (this.saving || this.pendingStart) return false;
    if (this.recorder?.state === "recording") {
      this._stop();
      return true;
    }

    this.pendingStart = true;
    try {
      const modeId = this._requestCaptureMode();
      if (!modeId) return false;
      const mode = this.config.modes[modeId];
      if (mode.requireFullscreen && !(await this._ensureFullscreen())) return false;
      return this._start(mode);
    } catch (error) {
      console.warn("[ScreenRecord] Could not prepare recording:", error);
      this._notify(this.config.notices.failed, "danger");
      return false;
    } finally {
      this.pendingStart = false;
    }
  }

  destroy() {
    this.discardOnStop = true;
    if (this.recorder?.state === "recording") this.recorder.stop();
    this._releaseStream();
    this.indicator?.remove?.();
    this.indicator = null;
    this.recorder = null;
    this.chunks = [];
    this.activeMode = null;
    this.scene = null;
  }

  _requestCaptureMode() {
    if (typeof globalThis.prompt !== "function") return this.config.defaultMode;
    const response = globalThis.prompt(
      this.config.modePrompt.message,
      this.config.modePrompt.defaultValue,
    );
    if (response === null) return null;
    const modeId = normalizeCaptureMode(response, this.config);
    if (!modeId) this._notify(this.config.notices.invalidMode, "warning");
    return modeId;
  }

  async _ensureFullscreen() {
    const globalRef = globalThis.window || globalThis;
    const isFullscreen = globalRef.__isGameFullscreen;
    if (typeof isFullscreen === "function" && isFullscreen()) return true;
    if (typeof globalRef.__toggleGameFullscreen !== "function") {
      this._notify(this.config.notices.fullscreenRequired, "warning");
      return false;
    }

    const active = await globalRef.__toggleGameFullscreen();
    if (active !== true && !(typeof isFullscreen === "function" && isFullscreen())) {
      this._notify(this.config.notices.fullscreenRequired, "warning");
      return false;
    }
    await new Promise(resolve => globalRef.setTimeout(resolve, this.config.fullscreen.settleMs));
    return typeof isFullscreen !== "function" || isFullscreen();
  }

  _start(mode) {
    if (!this.enabled) return false;
    const canvas = this.scene?.game?.canvas;
    const mediaRecorder = globalThis.MediaRecorder;
    if (!canCaptureCanvas(canvas, mediaRecorder)) {
      this._notify(this.config.notices.unsupported, "warning");
      return false;
    }

    try {
      this.discardOnStop = false;
      this.chunks = [];
      this.activeMode = mode.id;
      this.uiVisibility = mode.hideUi
        ? new ScreenRecordUiVisibility(this.scene, this.config.shortUi)
        : null;
      this.uiVisibility?.hide();
      this.recordingCanvas = document.createElement("canvas");
      this.recordingCanvas.width = mode.captureSourceSize
        ? Math.max(1, canvas.width)
        : mode.width;
      this.recordingCanvas.height = mode.captureSourceSize
        ? Math.max(1, canvas.height)
        : mode.height;
      this.recordingContext = this.recordingCanvas.getContext("2d", { alpha: false });
      if (!this.recordingContext) throw new Error("2D recording context unavailable");
      this._clearCaptureFrame();
      if (!mode.hideUi) this._drawCaptureFrame(canvas, mode);
      this.stream = this.recordingCanvas.captureStream(this.config.frameRate);
      this._attachGameAudio();
      const mimeType = selectSupportedMimeType(mediaRecorder, this.config.preferredMimeTypes);
      this.recorder = mimeType
        ? new mediaRecorder(this.stream, { mimeType })
        : new mediaRecorder(this.stream);
      this.recorder.addEventListener("dataavailable", event => {
        if (event.data?.size > 0) this.chunks.push(event.data);
      });
      this.recorder.addEventListener("stop", () => this._finish());
      this.recorder.start();
      this._attachFrameCapture(canvas, mode);
      this._setIndicator(mode.indicator, true);
      return true;
    } catch (error) {
      console.warn("[ScreenRecord] Could not start recording:", error);
      this._releaseStream();
      this.recorder = null;
      this.activeMode = null;
      this._notify(this.config.notices.failed, "danger");
      return false;
    }
  }

  _stop() {
    if (this.recorder?.state !== "recording") return;
    this._setIndicator("SAVING RECORDING…", false);
    this.recorder.stop();
  }

  async _finish() {
    const recorder = this.recorder;
    const chunks = this.chunks;
    const modeId = this.activeMode;
    this.recorder = null;
    this.chunks = [];
    this._releaseStream();
    if (this.discardOnStop || !chunks.length) {
      this.indicator?.remove?.();
      this.indicator = null;
      this.activeMode = null;
      return;
    }

    this.saving = true;
    try {
      const mimeType = recorder?.mimeType || "video/webm";
      const recording = new Blob(chunks, { type: mimeType });
      const fileName = this._fileName(modeId);
      if (this.config.saveToBrowser) {
        const url = URL.createObjectURL(recording);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        (document.fullscreenElement || document.body).appendChild(link);
        try { link.click(); } finally {
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), this.config.downloadRevokeDelayMs);
        }
      } else {
        const formData = new FormData();
        formData.append(this.config.uploadField, recording, fileName);
        const response = await fetch(this.config.endpoint, { method: "POST", body: formData });
        if (!response.ok) throw new Error(`Upload failed (${response.status})`);
        const result = await response.json();
        if (!result?.ok || !result.file) throw new Error("Upload response was incomplete");
        this._notify(this.config.notices.saved.replace("{file}", result.file), "success");
      }
      this.indicator?.remove?.();
      this.indicator = null;
    } catch (error) {
      console.warn("[ScreenRecord] Could not save recording:", error);
      this._notify(this.config.notices.failed, "danger");
      this.indicator?.remove?.();
      this.indicator = null;
    } finally {
      this.saving = false;
      this.activeMode = null;
    }
  }

  _fileName(modeId = this.activeMode) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const token = this.config.modes[modeId]?.fileNameToken || this.config.defaultMode;
    return `${this.config.fileNamePrefix}-${token}-${timestamp}.${this.config.fileExtension}`;
  }

  _releaseStream() {
    this._detachFrameCapture();
    this.uiVisibility?.restore();
    this.uiVisibility = null;
    if (this.audioCapture?.source && this.audioCapture.destination) {
      try { this.audioCapture.source.disconnect(this.audioCapture.destination); } catch {}
    }
    this.audioCapture = null;
    this.stream?.getTracks?.().forEach(track => track.stop());
    this.stream = null;
    this.recordingCanvas = null;
    this.recordingContext = null;
  }

  _clearCaptureFrame() {
    if (!this.recordingContext || !this.recordingCanvas) return;
    this.recordingContext.fillStyle = this.config.captureBackground;
    this.recordingContext.fillRect(0, 0, this.recordingCanvas.width, this.recordingCanvas.height);
  }

  _drawCaptureFrame(sourceCanvas, mode) {
    if (!this.recordingContext || !this.recordingCanvas || !sourceCanvas) return;
    const ctx = this.recordingContext;
    const width = this.recordingCanvas.width;
    const height = this.recordingCanvas.height;
    this._clearCaptureFrame();
    const scale = mode.fit === "cover"
      ? Math.max(width / sourceCanvas.width, height / sourceCanvas.height)
      : Math.min(width / sourceCanvas.width, height / sourceCanvas.height);
    const drawWidth = Math.round(sourceCanvas.width * scale);
    const drawHeight = Math.round(sourceCanvas.height * scale);
    const focusX = mode.fit === "cover"
      ? Math.max(0, Math.min(1, Number(this.config.captureFocusX ?? 0.5)))
      : 0.5;
    const drawX = Math.round(width / 2 - drawWidth * focusX);
    ctx.drawImage(sourceCanvas, drawX, Math.round((height - drawHeight) / 2), drawWidth, drawHeight);
  }

  _attachFrameCapture(sourceCanvas, mode) {
    const events = this.scene?.game?.events;
    if (events?.on) {
      this.preRenderHandler = () => this.uiVisibility?.hide();
      this.postRenderHandler = () => this._drawCaptureFrame(sourceCanvas, mode);
      events.on(this.config.renderEvents.preRender, this.preRenderHandler);
      events.on(this.config.renderEvents.postRender, this.postRenderHandler);
      return;
    }

    const render = () => {
      this.uiVisibility?.hide();
      this._drawCaptureFrame(sourceCanvas, mode);
      this.renderFrameId = globalThis.requestAnimationFrame?.(render) || 0;
    };
    this.renderFrameId = globalThis.requestAnimationFrame?.(render) || 0;
  }

  _detachFrameCapture() {
    const events = this.scene?.game?.events;
    if (this.preRenderHandler) {
      events?.off?.(this.config.renderEvents.preRender, this.preRenderHandler);
      this.preRenderHandler = null;
    }
    if (this.postRenderHandler) {
      events?.off?.(this.config.renderEvents.postRender, this.postRenderHandler);
      this.postRenderHandler = null;
    }
    if (this.renderFrameId) globalThis.cancelAnimationFrame?.(this.renderFrameId);
    this.renderFrameId = 0;
  }

  _attachGameAudio() {
    const sound = this.scene?.sound;
    const context = sound?.context;
    const source = sound?.destination;
    if (!context?.createMediaStreamDestination || !source?.connect) return;
    try {
      const destination = context.createMediaStreamDestination();
      source.connect(destination);
      destination.stream.getAudioTracks().forEach(track => this.stream.addTrack(track));
      this.audioCapture = { source, destination };
    } catch (error) {
      console.warn("[ScreenRecord] Game audio capture unavailable:", error);
    }
  }

  _notify(message, kind) {
    this.scene?.uiNotifications?.[kind]?.(message, { key: "screen-record" });
  }

  _setIndicator(label, recording) {
    if (typeof document === "undefined") return;
    if (!this.indicator) {
      this.indicator = document.createElement("div");
      this.indicator.setAttribute("data-screen-record-indicator", "true");
      Object.assign(this.indicator.style, {
        position: "fixed", top: "16px", right: "16px", zIndex: "2147483647",
        padding: "9px 14px", borderRadius: "999px", color: "#fff",
        font: "700 13px system-ui, sans-serif", letterSpacing: "0.08em",
        boxShadow: "0 3px 14px rgba(0,0,0,.45)", pointerEvents: "none",
      });
    }
    const host = document.fullscreenElement
      || document.querySelector(this.config.fullscreen.gameRootSelector)
      || document.body;
    if (host && this.indicator.parentElement !== host) host.appendChild(this.indicator);
    this.indicator.textContent = label;
    this.indicator.style.background = recording ? "#c62828" : "#8a5a16";
  }
}
