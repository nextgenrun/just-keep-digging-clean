/** Owns reversible music/SFX ducking while one voice line has the channel. */
export class VoiceLineVolumeDucker {
  constructor(soundSystem) {
    this.soundSystem = soundSystem;
    this.active = false;
  }

  duck() {
    if (this.active) return;
    this.active = true;
    (this.soundSystem.voiceDuckOwners ??= new Set()).add(this);
    this.soundSystem.voiceDucked = true;
    this.soundSystem.refreshMixVolumes();
  }

  restore() {
    if (!this.active) return;
    this.active = false;
    this.soundSystem.voiceDuckOwners?.delete(this);
    this.soundSystem.voiceDucked = this.soundSystem.voiceDuckOwners?.size > 0;
    this.soundSystem.refreshMixVolumes();
  }
}
