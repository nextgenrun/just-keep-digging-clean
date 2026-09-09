import { CORE_SFX_WINDOWS } from "../values/coreSfxWindows.js";
import { REVIEWED_AUDIO_ASSETS } from "../values/reviewedAudioAssets.js";
import { FREESOUND_RUNTIME_ASSETS as FREESOUND_AUDIO_ASSETS } from "../values/freesoundAudio.js";
import { REVIEWED_AUDIO_GROUP_LIMITS, REVIEWED_AUDIO_MIX } from "../values/reviewedAudioMix.js";

/** Approval-gated event routing; an unloaded transient is dropped, never late. */
export class ReviewedSfxController {
  constructor(system) {
    this.system = system;
    this.lastAt = new Map();
    this.lastChoice = new Map();
    this.choiceBags = new Map();
    this.groups = new Map();
    this.pending = new Map();
    this.destroyed = false;
    this.history = [];
  }

  choose(family, ids) {
    if (!ids.length) return null;
    let bag = (this.choiceBags.get(family) || []).filter(id => ids.includes(id));
    if (!bag.length) bag = [...new Set(ids)];
    const alternatives = bag.filter(id => id !== this.lastChoice.get(family));
    const available = alternatives.length ? alternatives : bag;
    const id = available[Math.floor(Math.random() * available.length)];
    this.choiceBags.set(family, bag.filter(candidate => candidate !== id));
    this.lastChoice.set(family, id);
    return id;
  }

  play(id, options = {}) {
    const asset = REVIEWED_AUDIO_ASSETS[id] || FREESOUND_AUDIO_ASSETS[id];
    const system = this.system;
    if (this.destroyed || !asset || !system.audioInitialized || !system.sfxEnabled || system.audioSuspended) return null;
    if (asset.mixOnly && (!options.mix || !asset.approvedBy.includes(options.mix))) return null;
    if (asset.mixOnly) {
      const companions = REVIEWED_AUDIO_MIX.composites[options.mix];
      const bus = options.mix === "deepCave" ? system.reviewedAmbience.bus
        : system.scene.weatherSystem?.audioController?.recordedAmbience?.bus;
      if (!companions?.every(id => bus?.tracks.get(REVIEWED_AUDIO_ASSETS[id].key)?.sound?.isPlaying)) return null;
    }
    const now = Number(system.reviewedClock?.() ?? system.scene.time?.now) || 0;
    const group = options.group || asset.group;
    const cooldownKey = options.cooldownKey || id;
    const elapsed = now - (this.lastAt.get(cooldownKey) ?? -Infinity);
    if (elapsed >= 0 && elapsed < asset.cooldownMs) return null;
    if (!system.scene.cache.audio.exists(asset.key)) {
      this.warm(id);
      return null;
    }
    const active = this.groups.get(group) || [];
    const limit = REVIEWED_AUDIO_GROUP_LIMITS[group] || 1;
    while (active.length >= limit) system.stopTrackedSfx(active.shift());
    this.lastAt.set(cooldownKey, now);
    const rate = Math.max(REVIEWED_AUDIO_MIX.minRate,
      Math.min(REVIEWED_AUDIO_MIX.maxRate, Number(options.rate) || 1));
    const sound = system.playSfx(asset.key, asset.gain * Math.max(0, options.gain ?? 1), {
      rate, sourcePeak: asset.peak, rawGain: true, pan: options.pan,
      window: CORE_SFX_WINDOWS[id],
      priority: options.priority ?? asset.priority ?? (group === "danger" ? REVIEWED_AUDIO_MIX.protectedPriority : undefined),
    });
    if (!sound) return null;
    active.push(sound);
    this.groups.set(group, active);
    const remove = () => {
      const index = active.indexOf(sound);
      if (index >= 0) active.splice(index, 1);
    };
    sound.once?.("complete", remove);
    sound.once?.("stop", remove);
    sound.once?.("destroy", remove);
    this.history.push({ id, group, at: now, gain: asset.gain * (options.gain ?? 1), rate });
    if (this.history.length > 40) this.history.shift();
    return sound;
  }

  warm(id) {
    const asset = REVIEWED_AUDIO_ASSETS[id] || FREESOUND_AUDIO_ASSETS[id];
    if (this.destroyed || !asset || this.pending.has(id) || this.system.scene.cache.audio.exists(asset.key)) return;
    this.pending.set(id, null);
    const finish = () => this.pending.delete(id);
    const loader = this.system.reviewedAssetManager || this.system.runtimeAudioAssetManager;
    const handle = loader.ensure(asset, { onReady: finish, onError: finish });
    if (this.pending.has(id)) {
      if (handle) this.pending.set(id, handle);
      else this.pending.delete(id);
    }
  }

  stop(group = null) {
    for (const [id, sounds] of this.groups) {
      if (group && group !== id) continue;
      for (const sound of [...sounds]) this.system.stopTrackedSfx(sound);
      this.groups.delete(id);
    }
    if (!group) {
      for (const handle of this.pending.values()) handle?.cancel?.();
      this.pending.clear();
    }
  }

  destroy() {
    this.stop();
    this.destroyed = true;
  }
}
