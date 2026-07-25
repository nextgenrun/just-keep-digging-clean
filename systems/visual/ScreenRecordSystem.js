import { SCREEN_RECORD_CONFIG } from "../../values/screenRecordConfig.js";

export function selectSupportedMimeType(mediaRecorder, preferredMimeTypes) {
  if (!mediaRecorder?.isTypeSupported) return "";
  return preferredMimeTypes.find(type => mediaRecorder.isTypeSupported(type)) || "";
}

export function canCaptureCanvas(canvas, mediaRecorder = globalThis.MediaRecorder) {
  return Boolean(canvas?.captureStream && mediaRecorder);
}

export class ScreenRecordSystem {
  constructor(scene, config = SCREEN_RECORD_CONFIG) {
    this.scene = scene;
    this.config = config;
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
    this._onKeydown = event => {
      const isF10 = event?.code === "F10" || event?.key === "F10" || event?.keyCode === 121 || event?.which === 121;
      if (!isF10 || event.repeat) return;
      event.preventDefault?.();
      this.toggle();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", this._onKeydown, true);
      globalThis.document?.addEventListener?.("keydown", this._onKeydown, true);
    }
  }

  toggle() {
    const now = Date.now();
    if (now - this.lastToggleAt < 250) return false;
    this.lastToggleAt = now;
    if (this.saving) {
      this._notify(this.config.notices.stopping, "info");
      return false;
    }
    if (this.recorder?.state === "recording") {
      this._stop();
      return true;
    }
    return this._start();
  }

  destroy() {
    this.discardOnStop = true;
    if (this.recorder?.state === "recording") this.recorder.stop();
    this._releaseStream();
    if (typeof window !== "undefined" && this._onKeydown) {
      window.removeEventListener("keydown", this._onKeydown, true);
      globalThis.document?.removeEventListener?.("keydown", this._onKeydown, true);
    }
    this.indicator?.remove?.();
    this.indicator = null;
    this.recorder = null;
    this.chunks = [];
    this.scene = null;
  }

  _start() {
    const canvas = this.scene?.game?.canvas;
    const mediaRecorder = globalThis.MediaRecorder;
    if (!canCaptureCanvas(canvas, mediaRecorder)) {
      this._notify(this.config.notices.unsupported, "warning");
      return false;
    }

    try {
      this.discardOnStop = false;
      this.chunks = [];
      this.recordingCanvas = document.createElement("canvas");
      this.recordingCanvas.width = this.config.captureWidth;
      this.recordingCanvas.height = this.config.captureHeight;
      this.recordingContext = this.recordingCanvas.getContext("2d", { alpha: false });
      this._renderPortraitFrame(canvas);
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
      this._setIndicator("REC • F10 TO STOP", true);
      this._notify(this.config.notices.started, "success");
      return true;
    } catch (error) {
      console.warn("[ScreenRecord] Could not start recording:", error);
      this._releaseStream();
      this.recorder = null;
      this._notify(this.config.notices.failed, "danger");
      return false;
    }
  }

  _stop() {
    if (this.recorder?.state !== "recording") return;
    this._setIndicator("SAVING RECORDING…", false);
    this._notify(this.config.notices.stopping, "info");
    this.recorder.stop();
  }

  async _finish() {
    const recorder = this.recorder;
    const chunks = this.chunks;
    this.recorder = null;
    this.chunks = [];
    if (this.renderFrameId) cancelAnimationFrame(this.renderFrameId);
    this.renderFrameId = 0;
    this._releaseStream();
    if (this.discardOnStop || !chunks.length) return;

    this.saving = true;
    try {
      const mimeType = recorder?.mimeType || "video/webm";
      const recording = new Blob(chunks, { type: mimeType });
      const formData = new FormData();
      formData.append(this.config.uploadField, recording, this._fileName());
      const response = await fetch(this.config.endpoint, { method: "POST", body: formData });
      if (!response.ok) throw new Error(`Upload failed (${response.status})`);
      const result = await response.json();
      if (!result?.ok || !result.file) throw new Error("Upload response was incomplete");
      this._notify(this.config.notices.saved.replace("{file}", result.file), "success");
      this.indicator?.remove?.();
      this.indicator = null;
    } catch (error) {
      console.warn("[ScreenRecord] Could not save recording:", error);
      this._notify(this.config.notices.failed, "danger");
      this.indicator?.remove?.();
      this.indicator = null;
    } finally {
      this.saving = false;
    }
  }

  _fileName() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `${this.config.fileNamePrefix}-${timestamp}.${this.config.fileExtension}`;
  }

  _releaseStream() {
    if (this.audioCapture?.source && this.audioCapture.destination) {
      try { this.audioCapture.source.disconnect(this.audioCapture.destination); } catch {}
    }
    this.audioCapture = null;
    this.stream?.getTracks?.().forEach(track => track.stop());
    this.stream = null;
    this.recordingCanvas = null;
    this.recordingContext = null;
  }

  _renderPortraitFrame(sourceCanvas) {
    if (!this.recordingContext || !this.recordingCanvas || !sourceCanvas) return;
    const ctx = this.recordingContext;
    const width = this.recordingCanvas.width;
    const height = this.recordingCanvas.height;
    ctx.fillStyle = this.config.captureBackground;
    ctx.fillRect(0, 0, width, height);
    // Fill the mobile frame. This intentionally crops the landscape edges instead of
    // letterboxing a tiny widescreen game window inside a portrait export.
    const scale = Math.max(width / sourceCanvas.width, height / sourceCanvas.height);
    const drawWidth = Math.round(sourceCanvas.width * scale);
    const drawHeight = Math.round(sourceCanvas.height * scale);
    const focusX = Math.max(0, Math.min(1, Number(this.config.captureFocusX ?? 0.5)));
    const drawX = Math.round(width / 2 - drawWidth * focusX);
    ctx.drawImage(sourceCanvas, drawX, Math.round((height - drawHeight) / 2), drawWidth, drawHeight);
    this.renderFrameId = requestAnimationFrame(() => this._renderPortraitFrame(sourceCanvas));
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
    this.scene?.notificationSystem?.[kind]?.(message, { key: "screen-record" });
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
      document.body?.appendChild(this.indicator);
    }
    this.indicator.textContent = label;
    this.indicator.style.background = recording ? "#c62828" : "#8a5a16";
  }
}
