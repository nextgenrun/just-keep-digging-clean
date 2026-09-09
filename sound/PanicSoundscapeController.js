import { FREESOUND_AUDIO } from "../values/freesoundAudio.js";
import { AudioLayerBus } from "./AudioLayerBus.js";

/** A single stable heartbeat follows real warning, critical, and recovery states. */
export class PanicSoundscapeController {
  constructor(director, config = FREESOUND_AUDIO.panic) {
    this.director = director;
    this.config = config;
    this.bus = new AudioLayerBus(director.system, config);
    this.band = "calm";
    this.role = null;
    this.asset = null;
    this.episode = 0;
    this.changedAt = -Infinity;
    this.recoveryUntil = 0;
  }

  update(snapshot) {
    const { active, context, time, delta } = snapshot;
    if (!active) { this.stop(); return; }
    let band = context.hardcoreArmed ? context.hardcoreStressBand : "calm";
    if (!["warning", "critical"].includes(band)) band = "calm";
    if (band !== this.band && band !== "critical" && band !== "calm"
      && time - this.changedAt < this.config.minimumBandHoldMs) band = this.band;
    if (band !== this.band) {
      if (this.band === "calm") this.episode++;
      if (band === "calm") this.recoveryUntil = time + this.config.recoveryMs;
      this.band = band;
      this.changedAt = time;
    }
    const role = band === "critical" ? "panicFast" : band === "warning" ? "panicPulse"
      : time < this.recoveryUntil ? "panicSlow" : null;
    if (role !== this.role) {
      this.role = role;
      this.asset = role ? this.director.palette.stable(role, `${this.episode}:${context.biome || "mine"}`) : null;
    }
    const palette = this.director.palette;
    palette.warm(this.asset);
    const weight = band === "critical" ? this.config.criticalGain : band === "warning"
      ? this.config.warningGain : this.config.recoveryGain;
    this.bus.update(palette.ready(this.asset)
      ? [{ asset: this.asset, gain: this.asset.gain * weight }] : [], delta);
  }

  stop(reset = false) {
    this.bus.stop();
    if (reset) { this.band = "calm"; this.role = null; this.asset = null; this.recoveryUntil = 0; }
  }
  snapshot() { return { band: this.band, role: this.role, ...this.bus.snapshot() }; }
  destroy() { this.stop(true); this.bus.destroy(); }
}
