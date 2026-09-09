import { TOWN_REST } from '../../values/townRest.js';
const unit = value => Math.max(0, Math.min(1, Number(value) || 0));
// Advance the existing weather authority; particles and audio still render once per frame.
export function advanceSleepWeather(system, delta, clock) {
  let remaining = Math.max(0, Number(delta) || 0);
  const depth = system._getDepthFactors();
  const occlusion = system.occlusionSampler.getSnapshot();
  const cfg = system.weatherConfig;
  while (remaining > 0) {
    const step = Math.min(remaining, TOWN_REST.timing.simulationStepMs);
    clock.advanceTime(step);
    system._simulationTime += step;
    if (cfg.enabled) {
      const patch = system.director.update(system._simulationTime);
      if (patch.entered) system.sleepWeatherTransitions = (system.sleepWeatherTransitions || 0) + 1;
      system._applyDirectorPatch(patch, false);
      for (const [field, target, rate] of [
        ['intensity', 'targetIntensity', cfg.transitionRatePerSecond],
        ['wind', 'targetWind', cfg.windRatePerSecond],
        ['gust', 'targetGust', cfg.gusts.ratePerSecond],
      ]) system[field] += (system[target] - system[field]) * (1 - Math.exp(-rate * step / 1000));
      system.cloudFront?.update(step);
      const rainAmount = ['drizzle', 'rain', 'storm'].includes(system.kind) ? system.intensity : 0;
      system.worldState.update(step, { kind: system.kind, intensity: system.intensity,
        rainAmount, depth, occlusion }, true);
      system.surfaceWetness = system.worldState.worldWetnessAmount;
    }
    remaining -= step;
  }
}
export function captureSleepWeather(system) {
  const now = system._simulationTime;
  const director = system.director;
  return { version: 1, kind: system.kind, intensity: system.intensity,
    targetIntensity: system.targetIntensity, wind: system.wind, targetWind: system.targetWind,
    gust: system.gust, targetGust: system.targetGust, surfaceWetness: system.surfaceWetness,
    wetColumns: [...system.worldState._wetColumns.entries()],
    cloudSeconds: system.cloudFront?.seconds || 0,
    precipitation: system.precipitationEnvelope.getSnapshot(),
    director: { forecastKind: director.forecastKind,
      phaseRemaining: Math.max(0, director._phaseEndsAt - now),
      retargetRemaining: Math.max(0, director._nextRetargetAt - now),
      gustRemaining: Math.max(0, director._nextGustAt - now),
      overrideRemaining: Math.max(0, director._overrideUntil - now),
      recentKinds: [...director._recentKinds] } };
}
export function restoreSleepWeather(system, data) {
  if (!data || !system.weatherConfig.phases[data.kind]) return false;
  const now = system._simulationTime, director = system.director;
  system.kind = director.kind = data.kind;
  for (const key of ['intensity', 'targetIntensity', 'surfaceWetness']) system[key] = unit(data[key]);
  for (const key of ['wind', 'targetWind', 'gust', 'targetGust']) {
    if (Number.isFinite(data[key])) system[key] = Math.max(-1, Math.min(1, data[key]));
  }
  const state = data.director || {};
  if (system.weatherConfig.phases[state.forecastKind]) director.forecastKind = state.forecastKind;
  for (const [field, key] of [['_phaseEndsAt', 'phaseRemaining'], ['_nextRetargetAt', 'retargetRemaining'],
    ['_nextGustAt', 'gustRemaining'], ['_overrideUntil', 'overrideRemaining']]) {
    if (Number.isFinite(state[key])) director[field] = now + Math.max(0,
      Math.min(TOWN_REST.persistence.maxTimerMs, state[key]));
  }
  director._recentKinds = (Array.isArray(state.recentKinds) ? state.recentKinds : [])
    .filter(kind => system.weatherConfig.phases[kind]).slice(-system.weatherConfig.director.recentHistorySize);
  system.worldState.worldWetnessAmount = system.surfaceWetness;
  system.worldState._wetColumns = new Map((Array.isArray(data.wetColumns) ? data.wetColumns : [])
    .slice(0, TOWN_REST.persistence.maxWetColumns).filter(pair => Array.isArray(pair)
      && Number.isInteger(pair[0]) && Number.isFinite(pair[1])).map(([x, amount]) => [x, unit(amount)]));
  if (system.cloudFront && Number.isFinite(data.cloudSeconds)) system.cloudFront.seconds = Math.max(0, data.cloudSeconds);
  for (const key of ['rainAmount', 'snowAmount', 'stormAmount']) {
    if (Number.isFinite(data.precipitation?.[key])) system.precipitationEnvelope[key] = unit(data.precipitation[key]);
  }
  system._lightingSnapshot = system._getLightingTarget();
  return true;
}
