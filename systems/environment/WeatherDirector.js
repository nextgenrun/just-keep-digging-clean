const clamp01 = (value) => Math.max(0, Math.min(1, value));

export class WeatherDirector {
  constructor(scene, weatherConfig) {
    this.scene = scene;
    this.weatherConfig = weatherConfig;
    this.kind = weatherConfig.initialKind || "clear";
    this.forecastKind = this.kind;
    this.forecastProgress = 0;
    this.stormDistance = 1;
    this._phaseEndsAt = 0;
    this._nextRetargetAt = 0;
    this._nextGustAt = 0;
    this._recentKinds = [];
    this._overrideUntil = 0;
  }

  start(time, immediate = true) {
    const phase = this._phase(this.kind);
    const next = this._chooseNextKind(this.kind);
    this.forecastKind = next;
    this.forecastProgress = immediate ? 0 : this.forecastProgress;
    this._phaseEndsAt = time + this._randomRange(phase.durationMs);
    this._nextRetargetAt = time + this._randomRange(this.weatherConfig.intensityRetargetMs);
    this._nextGustAt = time;
    return {
      kind: this.kind,
      targetIntensity: this._randomRange(phase.intensity),
      targetWind: this._randomRange(phase.wind),
      retarget: true,
      gustRetarget: true,
      entered: true,
    };
  }

  update(time) {
    const patch = {
      kind: this.kind,
      targetIntensity: null,
      targetWind: null,
      retarget: false,
      gustRetarget: false,
      entered: false,
    };

    if (time >= this._phaseEndsAt && time >= this._overrideUntil) {
      this._enterForecast(time, patch);
    }

    if (time >= this._nextRetargetAt) {
      const phase = this._phase(this.kind);
      patch.targetIntensity = this._randomRange(phase.intensity);
      patch.targetWind = this._randomRange(phase.wind);
      patch.retarget = true;
      this._nextRetargetAt = time + this._randomRange(this.weatherConfig.intensityRetargetMs);
    }

    if (time >= this._nextGustAt) {
      patch.gustRetarget = true;
      this._nextGustAt = time + this._randomRange(this.weatherConfig.gusts.retargetMs);
    }

    this.forecastProgress = clamp01(1 - (this._phaseEndsAt - time) / Math.max(1, this._forecastWindowMs()));
    this.stormDistance = this._computeStormDistance();
    return patch;
  }

  force(kind, intensity, durationMs, time) {
    if (!this.weatherConfig.phases[kind]) return null;
    this.kind = kind;
    this.forecastKind = this._chooseNextKind(kind);
    this.forecastProgress = 0;
    this._phaseEndsAt = time + Math.max(1000, durationMs);
    this._overrideUntil = this._phaseEndsAt;
    this._nextRetargetAt = time + this._randomRange(this.weatherConfig.intensityRetargetMs);
    this._nextGustAt = time;
    return {
      kind,
      targetIntensity: clamp01(intensity),
      targetWind: this._randomRange(this._phase(kind).wind),
      retarget: true,
      gustRetarget: true,
      entered: true,
    };
  }

  getSnapshot() {
    return {
      forecastKind: this.forecastKind,
      forecastProgress: this.forecastProgress,
      stormDistance: this.stormDistance,
    };
  }

  _enterForecast(time, patch) {
    this._recentKinds.push(this.kind);
    if (this._recentKinds.length > this.weatherConfig.director.recentHistorySize) {
      this._recentKinds.shift();
    }
    this.kind = this.forecastKind;
    const phase = this._phase(this.kind);
    this.forecastKind = this._chooseNextKind(this.kind);
    this.forecastProgress = 0;
    this._phaseEndsAt = time + this._randomRange(phase.durationMs);
    patch.kind = this.kind;
    patch.targetIntensity = this._randomRange(phase.intensity);
    patch.targetWind = this._randomRange(phase.wind);
    patch.retarget = true;
    patch.gustRetarget = true;
    patch.entered = true;
  }

  _chooseNextKind(kind) {
    const phase = this._phase(kind);
    const baseWeights = { ...(phase.next || this.weatherConfig.phases.clear.next) };
    const season = this.scene.dayNightCycle?.getSeason?.();
    const seasonal = season ? this.weatherConfig.director.seasonWeights?.[season] : null;
    Object.entries(seasonal || {}).forEach(([weatherKind, multiplier]) => {
      if (baseWeights[weatherKind] !== undefined) baseWeights[weatherKind] *= multiplier;
    });
    this._recentKinds.forEach((recent) => {
      if (baseWeights[recent] !== undefined) {
        baseWeights[recent] *= this.weatherConfig.director.repeatPenalty;
      }
    });
    return this._weightedPick(baseWeights);
  }

  _computeStormDistance() {
    if (this.kind === "storm") return 0;
    if (this.forecastKind !== "storm") return 1;
    return 1 - this.forecastProgress;
  }

  _forecastWindowMs() {
    return this.weatherConfig.forecast?.windowMs || 12000;
  }

  _phase(kind) {
    return this.weatherConfig.phases[kind] || this.weatherConfig.phases.clear;
  }

  _weightedPick(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0);
    let roll = Math.random() * Math.max(0.001, total);
    for (const [kind, weight] of entries) {
      roll -= Math.max(0, weight);
      if (roll <= 0) return kind;
    }
    return entries[entries.length - 1]?.[0] || "clear";
  }

  _randomRange(range) {
    if (!Array.isArray(range)) return Number(range) || 0;
    return range[0] + Math.random() * (range[1] - range[0]);
  }
}
