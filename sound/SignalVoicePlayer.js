import { SIGNAL_EVENT as cfg } from "../values/signalEvent.js";
import { SIGNAL_VOICE_CLIPS } from "../values/signalVoiceManifest.generated.js";
import { SIGNAL_DOG_CLIPS } from "../values/signalDogAudio.js";
import { VoiceLineVolumeDucker } from "./VoiceLineVolumeDucker.js";

const clips = { ...SIGNAL_VOICE_CLIPS, ...SIGNAL_DOG_CLIPS };
// Shared speech channel: local recordings, distance filtering, stereo bearing and occasional echoes.
export class SignalVoicePlayer {
  constructor(scene) {
    this.scene = scene; this.buffers = new Map(); this.files = new Map(); this.gains = new Map(); this.node = null;
    this.ducker = new VoiceLineVolumeDucker(scene.soundSystem);
    this.onVisibility = () => { if (globalThis.document?.hidden) this.stop(); };
    globalThis.document?.addEventListener("visibilitychange", this.onVisibility);
  }
  canStart() {
    const manager = this.scene?.soundSystem?.voiceLineManager;
    return !manager?.isBusy() || manager.externalVoiceOwner === this;
  }
  getClip(survivor, kind) {
    const id = survivor.id + "-" + kind;
    return clips[id] || { id, text: survivor.lines[kind],
      durationMs: Math.max(cfg.cinema.minimumLineMs, survivor.lines[kind].split(/\s+/).length * cfg.copy.captionFallbackMsPerWord) };
  }
  async preload(survivor) {
    const context = this.scene.sound?.context;
    if (!context) return;
    await Promise.allSettled(Object.values(clips).filter(c => c.survivor === survivor.id).map(async clip => {
      if (this.buffers.has(clip.id)) return;
      if (!this.files.has(clip.path)) this.files.set(clip.path, (async () => {
        const response = await fetch(clip.path, { signal: AbortSignal.timeout(cfg.audio.loadTimeoutMs) });
        if (!response.ok) throw new Error("Signal audio unavailable");
        return context.decodeAudioData(await response.arrayBuffer());
      })());
      try {
        const buffer = await this.files.get(clip.path);
        if (this.scene) {
          this.buffers.set(clip.id, buffer);
          const start = Math.floor((clip.offset || 0) * buffer.sampleRate);
          const end = Math.min(buffer.length, start + Math.ceil((clip.duration || buffer.duration) * buffer.sampleRate));
          let peak = 0;
          for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = start; i < end; i++) peak = Math.max(peak, Math.abs(data[i]));
          }
          this.gains.set(clip.id, Math.min(cfg.audio.maxGain, peak > 0 ? cfg.audio.peakTarget / peak : 1));
        }
      } catch { this.files.delete(clip.path); }
    }));
  }
  play(survivor, kind, distance = 0, pan = 0, eerie = false) {
    this.stop();
    const clip = this.getClip(survivor, kind), context = this.scene?.sound?.context;
    const buffer = this.buffers.get(clip.id);
    const offset = clip.offset || 0;
    const duration = buffer ? Math.max(0, Math.min(clip.duration || buffer.duration, buffer.duration - offset)) : clip.durationMs / 1000;
    const tail = eerie ? cfg.audio.echoDelay : 0;
    const result = { ...clip, durationMs: (duration + tail) * 1000 };
    if (!this.canStart()) return result;
    const manager = this.scene?.soundSystem?.voiceLineManager;
    if (manager) manager.externalVoiceOwner = this;
    this.releaseTimer = setTimeout(() => this.stop(), result.durationMs);
    if (!context || !buffer || !duration || this.muted()) return result;
    const source = context.createBufferSource(), gain = context.createGain(), envelope = context.createGain();
    const filter = context.createBiquadFilter(), stereo = context.createStereoPanner();
    source.buffer = buffer; filter.type = "lowpass";
    source.connect(envelope); envelope.connect(filter); filter.connect(stereo); stereo.connect(gain);
    gain.connect(this.scene.sound.destination || this.scene.sound.masterMuteNode || context.destination);
    this.node = { source, gain, envelope, filter, stereo, normalization: this.gains.get(clip.id) || 1 };
    if (eerie) {
      const delay = context.createDelay(), echo = context.createGain();
      delay.delayTime.value = cfg.audio.echoDelay; echo.gain.value = cfg.audio.echoGain;
      filter.connect(delay); delay.connect(echo); echo.connect(stereo);
      Object.assign(this.node, { delay, echo });
    }
    // Short edge fades avoid clicks at authored dog segment boundaries.
    const now = context.currentTime, fade = Math.min(cfg.audio.fadeSeconds, duration / 2);
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(1, now + fade);
    envelope.gain.setValueAtTime(1, now + duration - fade);
    envelope.gain.linearRampToValueAtTime(0, now + duration);
    this.ducker.duck(); this.position(distance, pan);
    if (context.state === "suspended") void context.resume();
    source.start(now, offset, duration);
    return result;
  }
  muted() {
    return !this.scene || this.scene.sound?.mute === true
      || this.scene.soundSystem?.sfxEnabled === false || globalThis.document?.hidden === true;
  }
  position(distance, pan) {
    this.distance = distance;
    this.pan = pan;
    if (!this.node) return;
    const closeness = Math.max(0, Math.min(1, 1 - distance / cfg.maxDistance));
    const reach = Math.max(0, Math.min(1, (cfg.hearingDistance - distance) / (cfg.hearingDistance - cfg.maxDistance)));
    const { gain, filter, stereo } = this.node;
    const sfx = this.scene.soundSystem?.getVoiceMixVolume?.(true) ?? 1;
    gain.gain.value = this.muted() ? 0 : cfg.audio.gain * (Number.isFinite(sfx) ? sfx : 1)
      * reach * this.node.normalization * (cfg.audio.farGain + closeness * (cfg.audio.nearGain - cfg.audio.farGain));
    filter.frequency.value = cfg.audio.farHz + closeness * (cfg.audio.nearHz - cfg.audio.farHz);
    stereo.pan.value = Math.max(-1, Math.min(1, pan));
  }
  refreshVolume() { this.position(this.distance ?? 0, this.pan ?? 0); }
  stop() {
    clearTimeout(this.releaseTimer);
    const manager = this.scene?.soundSystem?.voiceLineManager;
    if (manager?.externalVoiceOwner === this) manager.externalVoiceOwner = null;
    this.ducker.restore();
    if (!this.node) return;
    const current = this.node; this.node = null;
    try { current.source.stop(); } catch {}
    Object.values(current).forEach(node => node.disconnect?.());
  }
  destroy() {
    globalThis.document?.removeEventListener("visibilitychange", this.onVisibility);
    this.stop(); this.buffers.clear(); this.files.clear(); this.gains.clear(); this.scene = null;
  }
}
