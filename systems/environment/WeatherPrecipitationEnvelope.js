import { clamp01, lerp } from "../../values/mathUtils.js";

export class WeatherPrecipitationEnvelope {
  constructor(weatherConfig, kind = "clear", intensity = 0) {
    this.config = weatherConfig.precipitationEnvelope;
    this.rainAmount = 0;
    this.snowAmount = 0;
    this.stormAmount = 0;
    this.snap(kind, intensity);
  }

  update(kind, intensity, delta) {
    const dt = Math.min(
      Math.max(delta || 0, 0),
      this.config.maxDeltaMs,
    );
    const amount = clamp01(intensity);
    this.rainAmount = this._damp(
      this.rainAmount,
      this._isRainKind(kind) ? amount : 0,
      this.config.rain,
      dt,
    );
    this.snowAmount = this._damp(
      this.snowAmount,
      kind === "snow" ? amount : 0,
      this.config.snow,
      dt,
    );
    this.stormAmount = this._damp(
      this.stormAmount,
      kind === "storm" ? amount : 0,
      this.config.storm,
      dt,
    );
    return this.getSnapshot();
  }

  snap(kind, intensity) {
    const amount = clamp01(intensity);
    this.rainAmount = this._isRainKind(kind) ? amount : 0;
    this.snowAmount = kind === "snow" ? amount : 0;
    this.stormAmount = kind === "storm" ? amount : 0;
    return this.getSnapshot();
  }

  getSnapshot() {
    return {
      rainAmount: this.rainAmount,
      snowAmount: this.snowAmount,
      stormAmount: this.stormAmount,
    };
  }

  _damp(current, target, rates, deltaMs) {
    const rate = target > current
      ? rates.riseRatePerSecond
      : rates.fallRatePerSecond;
    const blend = 1 - Math.exp(-rate * deltaMs / 1000);
    const next = lerp(current, target, blend);
    return Math.abs(next - target) <= this.config.settleEpsilon
      ? target
      : clamp01(next);
  }

  _isRainKind(kind) {
    return kind === "drizzle" || kind === "rain" || kind === "storm";
  }
}
