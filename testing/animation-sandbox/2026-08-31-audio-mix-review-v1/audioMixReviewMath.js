export function resolveAudioMixReviewSourceId(sourceId, ambienceId) {
  return sourceId === "$ambience" ? ambienceId : sourceId;
}

export function estimateAudioMixReviewPeak(
  config,
  scenarioId,
  masterTrim = 1,
  ambienceId = config.defaultAmbience,
) {
  const scenario = config.scenarios[scenarioId];
  if (!scenario) return 0;
  const estimateEntry = entry => {
    const resolved = resolveAudioMixReviewSourceId(entry.sourceId, ambienceId);
    const source = config.sources[resolved];
    return source ? entry.volume * (source.peakLinear ?? 1) : 0;
  };
  const loopSum = scenario.loops.reduce(
    (sum, entry) => sum + estimateEntry(entry),
    0,
  );
  const oneShotPeaks = scenario.oneShots.map(estimateEntry);
  const oneShotSum = scenario.sequentialOneShots
    ? Math.max(0, ...oneShotPeaks)
    : oneShotPeaks.reduce((sum, peak) => sum + peak, 0);
  const rawSum = loopSum + oneShotSum;
  return rawSum * config.output.masterSafetyCap
    * Math.max(0, Math.min(1, masterTrim));
}

export function estimateAudioMixReviewTransitionPeak(
  config,
  fromScenarioId,
  toScenarioId,
  masterTrim = 1,
  ambienceId = config.defaultAmbience,
) {
  if (fromScenarioId === toScenarioId) {
    return estimateAudioMixReviewPeak(config, toScenarioId, masterTrim, ambienceId);
  }
  const fromScenario = config.scenarios[fromScenarioId];
  if (!fromScenario) {
    return estimateAudioMixReviewPeak(config, toScenarioId, masterTrim, ambienceId);
  }
  const fadingRaw = fromScenario.loops.reduce((sum, entry) => {
    const resolved = resolveAudioMixReviewSourceId(entry.sourceId, ambienceId);
    const source = config.sources[resolved];
    return source ? sum + entry.volume * (source.peakLinear ?? 1) : sum;
  }, 0);
  const carryRatio = Math.exp(
    -config.output.transitionTransientDelayMs / config.output.loopFadeMs,
  );
  const carriedOutput = fadingRaw * carryRatio
    * config.output.masterSafetyCap
    * Math.max(0, Math.min(1, masterTrim));
  return carriedOutput
    + estimateAudioMixReviewPeak(config, toScenarioId, masterTrim, ambienceId);
}

export function getAudioMixReviewPreloadAssets(config) {
  return Object.values(config.sources).map(({ key, previewPath }) => ({
    key,
    path: previewPath,
  }));
}
