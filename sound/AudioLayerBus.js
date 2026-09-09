import { REVIEWED_AUDIO_MIX } from "../values/reviewedAudioMix.js";
import { installLayerSpatialFilter, updateLayerSpatialFilter } from "./AudioLayerSpatialFilter.js";

/** Bounded, linear-gain crossfades. Loading warms cache; callbacks never play. */
export class AudioLayerBus {
  constructor(system, config) {
    this.system = system;
    this.scene = system.scene;
    this.config = config;
    this.tracks = new Map();
    this.pending = new Map();
    this.failedAt = new Map();
    this.targets = new Map();
    this.destroyed = false;
  }

  update(requested = [], delta = 16) {
    if (this.destroyed) return;
    if (!this.system.audioInitialized || !this.system.sfxEnabled || this.system.audioSuspended) {
      this.stop();
      return;
    }
    const ids = new Set(requested.map(layer => layer.asset.id));
    const incompleteMix = requested.some(layer => layer.asset.mixOnly
      && !layer.asset.approvedBy.some(mix => REVIEWED_AUDIO_MIX.composites[mix]?.every(id => ids.has(id))));
    const targets = new Map((incompleteMix ? [] : requested).map(layer => [layer.instanceKey || layer.asset.key, layer]));
    let ready = true;
    for (const layer of targets.values()) {
      if (!this.scene.cache.audio.exists(layer.asset.key)) {
        ready = false;
        this._ensure(layer.asset);
      }
    }
    // A composite starts atomically, never as a rejected solo stem while its
    // siblings are still loading. Keep the previous mix until all are ready.
    if (ready) this.targets = targets;
    else if (this.config.holdWhileLoading === false) this.targets.clear();
    for (const [key, layer] of this.targets) {
      if (!this.tracks.has(key)) this._start(layer, key);
    }
    const dt = Math.max(0, Math.min(100, Number(delta) || 0));
    for (const [key, track] of this.tracks) {
      updateLayerSpatialFilter(track, this.targets.get(key), this.scene.sound);
      const target = this.targets.get(key)?.gain || 0;
      track.referenceGain = Math.max(track.referenceGain, target);
      const step = track.referenceGain * dt / (track.fadeMs || this.config.fadeMs);
      track.gain += Math.sign(target - track.gain) * Math.min(Math.abs(target - track.gain), step);
      if (target === 0 && track.gain <= REVIEWED_AUDIO_MIX.loopStopEpsilon) {
        this._dispose(track);
        this.tracks.delete(key);
      }
    }
    this.refreshVolume();
  }

  refreshVolume() {
    const peak = [...this.tracks.values()].reduce((sum, track) => sum + track.gain * track.asset.peak, 0);
    const scale = Math.min(1, this.config.peakBudget / Math.max(peak, 1e-9));
    const bus = this.system.getSfxMixVolume?.() ?? this.system.sfxVolume;
    for (const track of this.tracks.values()) {
      track.effectiveGain = track.gain * scale;
      try { track.sound.volume = track.effectiveGain * bus; } catch (_) {}
    }
  }

  _ensure(asset) {
    if (this.pending.has(asset.key)) return;
    const now = Number(this.system.reviewedClock?.() ?? this.scene.time?.now) || 0;
    if (now - (this.failedAt.get(asset.key) ?? -Infinity) < REVIEWED_AUDIO_MIX.loadRetryMs) return;
    this.pending.set(asset.key, null);
    const loader = this.system.reviewedAssetManager || this.system.runtimeAudioAssetManager;
    const handle = loader.ensure(asset, {
      onReady: () => this.pending.delete(asset.key),
      onError: () => {
        this.pending.delete(asset.key);
        this.failedAt.set(asset.key, Number(this.system.reviewedClock?.() ?? this.scene.time?.now) || 0);
      },
    });
    if (this.pending.has(asset.key)) {
      if (handle) this.pending.set(asset.key, handle);
      else this.pending.delete(asset.key);
    }
  }

  _start(layer, instanceKey = layer.asset.key) {
    if (!this.scene.cache.audio.exists(layer.asset.key)) return;
    const now = Number(this.system.reviewedClock?.() ?? this.scene.time?.now) || 0;
    if (now - (this.failedAt.get(instanceKey) ?? -Infinity) < REVIEWED_AUDIO_MIX.loadRetryMs) return;
    if (this.tracks.size >= this.config.maxVoices) {
      const oldest = [...this.tracks.values()]
        .filter(track => !this.targets.has(track.instanceKey))
        .sort((a, b) => a.gain - b.gain)[0];
      if (!oldest) return;
      this._dispose(oldest);
      this.tracks.delete(oldest.instanceKey);
    }
    let sound, track;
    try {
      sound = this.scene.sound.add(layer.asset.key, { loop: layer.loop !== false, volume: 0, pan: layer.pan || 0 });
      track = { asset: layer.asset, sound, instanceKey, ownerKey: layer.ownerKey, gain: 0, referenceGain: layer.gain,
        effectiveGain: 0, fadeMs: layer.fadeMs || this.config.fadeMs,
        filter: installLayerSpatialFilter(sound, this.scene.sound, layer.cutoff) };
      this.tracks.set(instanceKey, track);
      const release = completed => {
        if (this.tracks.get(instanceKey) !== track) return;
        this.tracks.delete(instanceKey);
        if (completed) this.targets.delete(instanceKey);
        try { track.filter?.disconnect(); } catch (_) {}
        queueMicrotask(() => { try { if (sound.manager) sound.destroy(); } catch (_) {} });
      };
      sound.once?.("complete", () => release(true));
      sound.once?.("stop", () => release(false));
      sound.once?.("destroy", () => release(false));
      if (sound.play() === false) throw Error("Layer playback declined");
    } catch (_) {
      this.failedAt.set(instanceKey, now);
      this.tracks.delete(instanceKey);
      if (track) this._dispose(track);
      else { try { sound?.destroy(); } catch (_) {} }
    }
  }

  stop() {
    this.targets.clear();
    for (const handle of this.pending.values()) handle?.cancel?.();
    this.pending.clear();
    for (const track of this.tracks.values()) this._dispose(track);
    this.tracks.clear();
  }

  retainOwners(owners) {
    for (const [key, track] of this.tracks) {
      if (!track.ownerKey || owners.includes(track.ownerKey)) continue;
      this._dispose(track);
      this.tracks.delete(key);
      this.targets.delete(key);
    }
  }

  _dispose(track) {
    try { track.filter?.disconnect(); } catch (_) {}
    try { track.sound.stop(); } catch (_) {}
    try { track.sound.destroy(); } catch (_) {}
  }

  snapshot() {
    return { active: [...this.tracks.values()].map(track => ({
      id: track.asset.id, key: track.asset.key, gain: track.effectiveGain,
      target: this.targets.get(track.instanceKey)?.gain || 0, owner: track.ownerKey || null,
      peakContribution: track.effectiveGain * track.asset.peak,
      pan: track.sound.pan || 0, cutoff: track.filter?.frequency?.value ?? null,
    })), pending: [...this.pending.keys()] };
  }

  destroy() {
    this.stop();
    this.destroyed = true;
  }
}
