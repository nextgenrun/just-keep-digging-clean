function randomUnit(random) {
  const value = Number(random?.());
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(0.999999999, value));
}

export function pickShadowMinerRange(range, random = Math.random) {
  const minimum = Number(range?.[0]);
  const maximum = Number(range?.[1]);
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return 0;
  const lower = Math.min(minimum, maximum);
  const upper = Math.max(minimum, maximum);
  return lower + (upper - lower) * randomUnit(random);
}

export function pickShadowMinerPersonality(
  personalities,
  encounterBand,
  random = Math.random,
  forcedBehaviorId = null,
) {
  const available = Array.isArray(personalities) ? personalities : [];
  const forced = available.find(profile => profile.id === forcedBehaviorId);
  if (forced) return forced;

  const totalWeight = available.reduce(
    (sum, profile) => sum + Math.max(0, Number(profile.weights?.[encounterBand]) || 0),
    0,
  );
  if (totalWeight <= 0) return available[0] || null;

  let threshold = randomUnit(random) * totalWeight;
  for (const profile of available) {
    threshold -= Math.max(0, Number(profile.weights?.[encounterBand]) || 0);
    if (threshold < 0) return profile;
  }
  return available.at(-1) || null;
}

export function createShadowMinerBehaviorPlan(
  config,
  encounterBand,
  encounterProfile,
  {
    random = Math.random,
    forcedBehaviorId = null,
    depthProfile = null,
    depthMeters = 0,
  } = {},
) {
  const personality = pickShadowMinerPersonality(
    config.behavior.personalities,
    encounterBand,
    random,
    forcedBehaviorId,
  );
  if (!personality) return null;

  const scale = (baseValue, range) => (
    Number(baseValue) * pickShadowMinerRange(range, random)
  );
  const depthMultiplier = key => Number(depthProfile?.[key]) || 1;
  return Object.freeze({
    id: personality.id,
    depthBandId: depthProfile?.id || null,
    depthMeters: Math.max(0, Number(depthMeters) || 0),
    lightResistanceMultiplier: depthMultiplier("lightResistanceMultiplier"),
    targetDistanceTiles: pickShadowMinerRange(
      personality.targetDistanceTiles,
      random,
    ),
    replayDelayMs: Math.round(scale(
      encounterProfile.replayDelayMs,
      personality.replayDelayMultiplier,
    )),
    approachPlaybackRate: scale(
      encounterProfile.approachPlaybackRate,
      personality.approachPlaybackRateMultiplier,
    ) * depthMultiplier("approachRateMultiplier"),
    approachHoldMs: Math.round(pickShadowMinerRange(
      personality.approachHoldMs,
      random,
    )),
    nearPlayerDistanceTiles: pickShadowMinerRange(
      personality.nearPlayerDistanceTiles,
      random,
    ),
    observeMs: Math.round(scale(
      encounterProfile.observeMs,
      personality.observeDurationMultiplier,
    ) * depthMultiplier("observeDurationMultiplier")),
    maximumEncounterMs: Math.round(scale(
      encounterProfile.maximumEncounterMs,
      personality.maximumEncounterMultiplier,
    )),
    fleePlaybackRate: scale(
      config.interaction.fleePlaybackRate,
      personality.fleePlaybackRateMultiplier,
    ) * depthMultiplier("fleeRateMultiplier"),
    fleeDurationMs: Math.round(scale(
      config.interaction.fleeDurationMs,
      personality.fleeDurationMultiplier,
    )),
    visualIntensity: scale(
      encounterProfile.visualIntensity,
      personality.visualIntensityMultiplier,
    ) * depthMultiplier("visualIntensityMultiplier"),
    audioRateMultiplier: pickShadowMinerRange(
      personality.audioRateMultiplier,
      random,
    ) * depthMultiplier("audioRateMultiplier"),
    preferActionPose: randomUnit(random) < personality.actionPoseChance,
    performObserveDig: randomUnit(random) < personality.observeDigChance,
  });
}
