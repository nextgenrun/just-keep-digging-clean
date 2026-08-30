import { clamp01, lerp } from "../../values/mathUtils.js";
import { WeatherRecordedAmbienceController } from "./WeatherRecordedAmbienceController.js";

export class WeatherAudioController {
  constructor(scene, weatherConfig) {
    this.scene = scene;
    this.weatherConfig = weatherConfig;
    this._rainNoise = null;
    this._windNoise = null;
    this.recordedAmbience = new WeatherRecordedAmbienceController(scene, weatherConfig);
    this._recordedSnapshot = this.recordedAmbience.getSnapshot();
  }

  update(state) {
    const soundSystem = this.scene.soundSystem;
    const canPlay = soundSystem?.audioInitialized && soundSystem?.sfxEnabled && this.scene.sound?.context;
    this._recordedSnapshot = this.recordedAmbience.update(state);
    if (!canPlay) {
      this._setRainNoiseVolume(0);
      this._setWindNoiseVolume(0);
      return this.getSnapshot();
    }

    const cfg = this.weatherConfig.audio;
    const isRainKind = state.isRainKind ?? (
      state.kind
        ? state.kind === "drizzle" || state.kind === "rain" || state.kind === "storm"
        : true
    );
    const rainIntensity = clamp01(
      state.rainAmount ?? (isRainKind ? state.intensity : 0),
    );
    const openRain = state.depth.surfaceAmount * state.occlusion.openSkyAmount;
    const roofRain = state.depth.surfaceAmount * state.occlusion.coveredAmount;
    const underground = state.depth.undergroundSignal;
    const amount = clamp01(
      rainIntensity * openRain +
      rainIntensity * roofRain * cfg.coverMuffle +
      underground * cfg.undergroundMuffle
    );
    const gustAmount = Math.max(0, 1 - (state.director?.stormDistance ?? 1));
    const windAmount = clamp01((Math.abs(state.wind || 0) / 190 + gustAmount * 0.35) * state.depth.surfaceAmount);

    if (amount < 0.035) {
      this._setRainNoiseVolume(0);
    } else {
      this._ensureRainNoise();
      const openVolume = rainIntensity * openRain * cfg.rainVolume;
      const roofVolume = rainIntensity * roofRain * cfg.roofRainVolume;
      const caveVolume = underground * cfg.caveDripVolume;
      const recordedFallback = this._recordedSnapshot.rainManaged
        ? 1 - this._recordedSnapshot.rainCoverage
        : 1;
      this._setRainNoiseVolume(
        (openVolume + roofVolume + caveVolume)
        * recordedFallback
        * (soundSystem?.sfxVolume ?? 1),
      );
      this._setRainLowpass(lerp(cfg.coverLowpassHz, cfg.openLowpassHz, state.occlusion.openSkyAmount));
    }

    if (windAmount < 0.04) {
      this._setWindNoiseVolume(0);
      return this.getSnapshot();
    }

    this._ensureWindNoise();
    const recordedFallback = this._recordedSnapshot.windManaged
      ? 1 - this._recordedSnapshot.windCoverage
      : 1;
    this._setWindNoiseVolume(
      windAmount * cfg.windVolume * recordedFallback * (soundSystem?.sfxVolume ?? 1),
    );
    return this.getSnapshot();
  }

  playThunder(depth, strength = 1) {
    const soundSystem = this.scene.soundSystem;
    const ctx = this.scene.sound?.context;
    if (!ctx || !soundSystem?.audioInitialized || !soundSystem?.sfxEnabled) return;

    const cfg = this.weatherConfig.audio;
    const duration = cfg.thunderDurationMs[0] / 1000 + Math.random() * ((cfg.thunderDurationMs[1] - cfg.thunderDurationMs[0]) / 1000);
    const bufferLength = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferLength, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let rumble = 0;
    for (let i = 0; i < bufferLength; i += 1) {
      const t = i / bufferLength;
      const envelope = Math.pow(1 - t, 2.2) * Math.min(1, t * 18);
      rumble = rumble * 0.94 + (Math.random() * 2 - 1) * 0.06;
      data[i] = rumble * envelope;
    }

    const source = ctx.createBufferSource();
    const lowpass = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const muffle = lerp(1, cfg.undergroundMuffle, depth.undergroundAmount);
    lowpass.type = "lowpass";
    lowpass.frequency.value = lerp(cfg.thunderOpenLowpassHz, cfg.thunderCaveLowpassHz, depth.undergroundAmount);
    lowpass.Q.value = 1.2;
    const recordedDuck = 1
      - this._recordedSnapshot.stormCoverage
        * this.recordedAmbience.config.proceduralThunderDuck;
    gain.gain.value = cfg.thunderVolume
      * (soundSystem.sfxVolume ?? 1)
      * muffle
      * clamp01(strength)
      * recordedDuck;

    source.buffer = buffer;
    source.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.scene.sound.destination || ctx.destination);
    source.start(0);
    source.onended = () => {
      try {
        source.disconnect();
        lowpass.disconnect();
        gain.disconnect();
      } catch (_) {
        // Audio nodes may already be disconnected by the browser.
      }
    };
  }

  destroy() {
    this.recordedAmbience.destroy();
    this._stopRainNoise();
    this._stopWindNoise();
  }

  getSnapshot() {
    return {
      ...this._recordedSnapshot,
      proceduralRainActive: Boolean(this._rainNoise),
      proceduralWindActive: Boolean(this._windNoise),
    };
  }

  _ensureRainNoise() {
    if (this._rainNoise || !this.scene.sound?.context) return;
    const ctx = this.scene.sound.context;
    const bufferLength = Math.max(1, Math.floor(ctx.sampleRate * 1.6));
    const buffer = ctx.createBuffer(1, bufferLength, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferLength; i += 1) {
      last = last * 0.86 + (Math.random() * 2 - 1) * 0.14;
      data[i] = last;
    }

    const source = ctx.createBufferSource();
    const lowpass = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    lowpass.type = "lowpass";
    lowpass.frequency.value = this.weatherConfig.audio.openLowpassHz;
    lowpass.Q.value = 0.8;
    gain.gain.value = 0;
    source.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.scene.sound.destination || ctx.destination);
    source.start(0);
    this._rainNoise = { source, lowpass, gain };
  }

  _ensureWindNoise() {
    if (this._windNoise || !this.scene.sound?.context) return;
    const ctx = this.scene.sound.context;
    const bufferLength = Math.max(1, Math.floor(ctx.sampleRate * 2.2));
    const buffer = ctx.createBuffer(1, bufferLength, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferLength; i += 1) {
      last = last * 0.96 + (Math.random() * 2 - 1) * 0.04;
      data[i] = last;
    }

    const source = ctx.createBufferSource();
    const lowpass = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    lowpass.type = "bandpass";
    lowpass.frequency.value = 620;
    lowpass.Q.value = 0.7;
    gain.gain.value = 0;
    source.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.scene.sound.destination || ctx.destination);
    source.start(0);
    this._windNoise = { source, lowpass, gain };
  }

  _setRainNoiseVolume(volume) {
    if (!this._rainNoise?.gain || !this.scene.sound?.context) return;
    const ctx = this.scene.sound.context;
    this._rainNoise.gain.gain.cancelScheduledValues(ctx.currentTime);
    this._rainNoise.gain.gain.setTargetAtTime(clamp01(volume), ctx.currentTime, 0.18);
  }

  _setRainLowpass(frequency) {
    if (!this._rainNoise?.lowpass || !this.scene.sound?.context) return;
    const ctx = this.scene.sound.context;
    this._rainNoise.lowpass.frequency.cancelScheduledValues(ctx.currentTime);
    this._rainNoise.lowpass.frequency.setTargetAtTime(frequency, ctx.currentTime, 0.25);
  }

  _setWindNoiseVolume(volume) {
    if (!this._windNoise?.gain || !this.scene.sound?.context) return;
    const ctx = this.scene.sound.context;
    this._windNoise.gain.gain.cancelScheduledValues(ctx.currentTime);
    this._windNoise.gain.gain.setTargetAtTime(clamp01(volume), ctx.currentTime, 0.35);
  }

  _stopRainNoise() {
    if (!this._rainNoise) return;
    try {
      this._rainNoise.source.stop(0);
    } catch (_) {
      // Already stopped.
    }
    try {
      this._rainNoise.source.disconnect();
      this._rainNoise.lowpass.disconnect();
      this._rainNoise.gain.disconnect();
    } catch (_) {
      // Best effort cleanup for browser audio nodes.
    }
    this._rainNoise = null;
  }

  _stopWindNoise() {
    if (!this._windNoise) return;
    try {
      this._windNoise.source.stop(0);
    } catch (_) {
      // Already stopped.
    }
    try {
      this._windNoise.source.disconnect();
      this._windNoise.lowpass.disconnect();
      this._windNoise.gain.disconnect();
    } catch (_) {
      // Best effort cleanup for browser audio nodes.
    }
    this._windNoise = null;
  }
}
