import { REVIEWED_AUDIO_MIX } from "../values/reviewedAudioMix.js";

/** One tracked SFX bus, including legacy cues; master lives in Phaser only. */
export class ActiveSfxMixer {
  constructor(system) { this.system = system; this.active = new Map(); }

  add(sound, gain, peak = 1, priority = REVIEWED_AUDIO_MIX.defaultPriority) {
    while (this.active.size >= REVIEWED_AUDIO_MIX.maxOneShots) {
      const quietest = [...this.active].sort((a, b) => a[1].priority - b[1].priority)[0];
      if (quietest[1].priority > priority) return false;
      this.stop(quietest[0]);
    }
    this.active.set(sound, { gain, peak: Math.max(0, peak), priority });
    sound.once?.("complete", () => this.remove(sound));
    sound.once?.("stop", () => this.remove(sound));
    sound.once?.("destroy", () => this.remove(sound));
    this.refresh();
    return true;
  }

  remove(sound) { if (this.active.delete(sound)) this.refresh(); }

  refresh() {
    const requestedPeak = [...this.active.values()].reduce((sum, entry) => sum + entry.gain * entry.peak, 0);
    this.scale = Math.min(1, REVIEWED_AUDIO_MIX.oneShotPeakBudget / Math.max(requestedPeak, 1e-9));
    const bus = this.system.getSfxMixVolume();
    for (const [sound, entry] of this.active) {
      try { sound.volume = entry.gain * this.scale * bus; } catch (_) { this.active.delete(sound); }
    }
  }

  stop(sound) {
    if (!sound) return;
    this.active.delete(sound);
    try { sound.stop(); } catch (_) {}
    try { sound.destroy(); } catch (_) {}
    this.refresh();
  }

  stopAll() { for (const sound of [...this.active.keys()]) this.stop(sound); }

  snapshot() {
    return { count: this.active.size, scale: this.scale ?? 1,
      peakBudget: REVIEWED_AUDIO_MIX.oneShotPeakBudget,
      sources: [...this.active].map(([sound, entry]) => ({
        key: sound.key, gain: entry.gain * (this.scale ?? 1), peak: entry.peak, priority: entry.priority,
      })) };
  }
}
