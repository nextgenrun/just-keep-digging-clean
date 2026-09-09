import { SESSION_AWAKENING as C } from "../values/sessionAwakening.js";

const ease = (from, to, value) => {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/** Short approved body sounds and a reversible, settings-aware entry mix. */
export class SessionAwakeningAudio {
  constructor(scene, selection) {
    this.scene = scene;
    this.system = scene.soundSystem;
    this.selection = selection;
    this.voices = [];
    this.beats = 0;
    this.breathStarted = false;
    this.played = [];
    this.previousMix = this.system?.sessionAwakeningMix;
    this.mix = { sfx: selection.dozing ? 1 : C.audio.worldFloor,
      music: selection.dozing ? 1 : C.audio.musicFloor };
    if (this.system) this.system.sessionAwakeningMix = this.mix;
  }

  play(asset, volume, options = {}) {
    if (!asset?.approved || !this.system?.sfxEnabled || this.scene.sound.locked
      || !this.scene.cache.audio.exists(asset.key)) return;
    const sound = this.scene.sound.add(asset.key);
    if (options.duration) sound.addMarker({ name: "awakening-beat", start: 0, duration: options.duration,
      config: { volume: 0, loop: false } });
    const config = { loop: false, volume: 0, ...options };
    delete config.duration;
    const started = options.duration ? sound.play("awakening-beat", config) : sound.play(config);
    if (!started) { sound.destroy(); return; }
    this.voices.push({ sound, volume });
    this.played.push(asset.id);
  }

  update(progress, allowNewSounds = true) {
    if (!this.system) return;
    if (allowNewSounds && !this.breathStarted && progress >= C.audio.breathDelay) {
      this.breathStarted = true;
      this.play(C.audio.breath, this.selection.dozing ? C.sleep.breathGain : C.audio.breathGain, {
        seek: C.audio.breathStartSeconds, rate: this.selection.breathRate,
      });
    }
    while (!this.selection.dozing && allowNewSounds && this.beats < C.audio.heartbeatTimes.length && progress >= C.audio.heartbeatTimes[this.beats]) {
      this.beats++;
      this.play(C.audio.heartbeat, C.audio.heartbeatGain, { duration: C.audio.heartbeatWindowSeconds });
    }
    const envelope = ease(0, C.audio.fadeIn, progress) * (1 - ease(C.audio.fadeOutFrom, 1, progress));
    const gain = this.system.sfxEnabled ? this.system.sfxVolume : 0;
    for (const { sound, volume } of this.voices) sound.setVolume(volume * gain * envelope);
    this.mix.sfx = C.audio.worldFloor + (1 - C.audio.worldFloor) * ease(C.audio.worldFrom, C.audio.worldTo, progress);
    this.mix.music = C.audio.musicFloor + (1 - C.audio.musicFloor) * ease(C.audio.musicFrom, C.audio.musicTo, progress);
    if (this.selection.dozing) {
      const close = ease(C.sleep.mixFrom, C.sleep.mixTo, progress);
      this.mix.sfx = 1 - (1 - C.audio.worldFloor) * close;
      this.mix.music = 1 - (1 - C.audio.musicFloor) * close;
    }
    this.system.refreshMixVolumes();
  }

  destroy() {
    for (const { sound } of this.voices) { sound.stop(); sound.destroy(); }
    this.voices.length = 0;
    if (this.system?.sessionAwakeningMix === this.mix) {
      this.system.sessionAwakeningMix = this.previousMix;
      this.system.refreshMixVolumes();
    }
  }
}
