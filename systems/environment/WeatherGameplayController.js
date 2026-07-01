const clamp01 = (value) => Math.max(0, Math.min(1, value));

export class WeatherGameplayController {
  constructor(weatherConfig) {
    this.weatherConfig = weatherConfig;
    this._snapshot = this._emptySnapshot();
  }

  update(state) {
    const cfg = this.weatherConfig.gameplay;
    const visibilityCfg = this.weatherConfig.visibility;
    const wetSurface = state.world.playerWeatherState.onWetSurface ? state.world.playerWeatherState.wetness : 0;
    const surfaceStorm = state.kind === "storm" ? state.intensity * state.depth.surfaceAmount : 0;
    const shelterRelief = 1 - state.world.playerShelterAmount;

    const movementWetnessPenalty = cfg.enabled
      ? clamp01(wetSurface * cfg.maxWetMovementPenalty)
      : 0;
    const visibilityPenalty = visibilityCfg.enabled
      ? clamp01(surfaceStorm * shelterRelief * visibilityCfg.maxStormPenalty)
      : 0;
    this._snapshot = {
      movementWetnessPenalty,
      visibilityPenalty,
      campfireExposure: 0,
      miningAmbienceBonus: cfg.enabled && state.kind === "storm" ? cfg.stormMiningAmbienceBonus : 0,
      xpAmbienceBonus: cfg.enabled && state.kind === "storm" ? cfg.stormXpAmbienceBonus : 0,
    };
    return this._snapshot;
  }

  getSnapshot() {
    return this._snapshot;
  }

  _emptySnapshot() {
    return {
      movementWetnessPenalty: 0,
      visibilityPenalty: 0,
      campfireExposure: 0,
      miningAmbienceBonus: 0,
      xpAmbienceBonus: 0,
    };
  }
}
