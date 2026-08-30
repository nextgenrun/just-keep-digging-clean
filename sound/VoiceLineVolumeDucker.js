import { AUDIO_CONFIG } from "../values/audioConfig.js";

/** Owns reversible music/SFX ducking while one voice line has the channel. */
export class VoiceLineVolumeDucker {
  constructor(soundSystem) {
    this.soundSystem = soundSystem;
    this.originalMusicVolume = null;
    this.originalSfxVolume = null;
  }

  duck() {
    if (this.originalMusicVolume !== null) return;
    this.originalMusicVolume = this.soundSystem.musicVolume;
    this.originalSfxVolume = this.soundSystem.sfxVolume;
    const config = this.soundSystem.config || {};
    const musicMultiplier = config.voiceMusicDuckMultiplier
      ?? AUDIO_CONFIG.voiceMusicDuckMultiplier;
    const sfxMultiplier = config.voiceSfxDuckMultiplier
      ?? AUDIO_CONFIG.voiceSfxDuckMultiplier;
    this.soundSystem.setMusicVolume(
      this.originalMusicVolume * musicMultiplier,
    );
    this.soundSystem.setSfxVolume(
      this.originalSfxVolume * sfxMultiplier,
    );
  }

  restore() {
    if (this.originalMusicVolume === null || this.originalSfxVolume === null) return;
    this.soundSystem.setMusicVolume(this.originalMusicVolume);
    this.soundSystem.setSfxVolume(this.originalSfxVolume);
    this.originalMusicVolume = null;
    this.originalSfxVolume = null;
  }
}
