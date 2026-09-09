import {
  SHADOW_MINER_CONFIG,
  SHADOW_MINER_ENCOUNTER_BANDS,
  SHADOW_MINER_REPELLENTS,
} from "../../values/shadowMiner.js";

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Number(value) || 0));
}

export function resolveShadowMinerEnvironment(scene, provided = {}, playerTile = null) {
  const stressSnapshot = provided.stressSnapshot
    || scene?._hardcoreRuntime?.system?.getSnapshot?.()
    || {};
  const starSnapshot = provided.starSnapshot
    || scene?.starSanctuarySnapshot
    || {};
  const torchActive = provided.torchActive
    ?? scene?.lightSystem?.isTorchActive?.()
    ?? false;
  const torchIntensity = provided.torchIntensity
    ?? scene?.lightSystem?.getTorchIntensity?.()
    ?? 0;
  const topAirRows = Number(scene?.config?.topAirRows) || 0;
  const depthMeters = provided.depthMeters
    ?? (Number.isFinite(playerTile?.ty)
      ? Math.max(0, playerTile.ty - topAirRows + 1)
      : 0);
  return Object.freeze({
    stressSnapshot,
    stressBand: stressSnapshot.stressBand || null,
    stressRatio: Number(stressSnapshot.stressRatio) || 0,
    hardcoreArmed: stressSnapshot.armed === true,
    torchActive: torchActive === true,
    torchIntensity: Math.max(0, Number(torchIntensity) || 0),
    depthMeters: Math.max(0, Number(depthMeters) || 0),
    nearIntactStarLight: provided.nearIntactStarLight
      ?? starSnapshot.nearIntactStar
      ?? false,
  });
}

export function resolveShadowMinerDepthProfile(
  depthMeters,
  config = SHADOW_MINER_CONFIG,
) {
  const bands = config.depthIntensity?.bands || [];
  const depth = Math.max(0, Number(depthMeters) || 0);
  let selected = bands[0] || null;
  for (const band of bands) {
    if (depth >= band.minimumDepthMeters) selected = band;
    else break;
  }
  return selected;
}

export function resolveShadowMinerLightResponse(
  environment,
  depthProfile,
  config = SHADOW_MINER_CONFIG,
) {
  const response = config.interaction.lightResponse;
  const resistance = Math.max(
    0.1,
    Number(depthProfile?.lightResistanceMultiplier) || 1,
  );
  if (config.interaction.fleeOnIntactStar && environment.nearIntactStarLight) {
    return Object.freeze({
      source: SHADOW_MINER_REPELLENTS.STAR,
      pressure: response.star.pressure,
      visualPressure: 1,
      repelDelayMs: response.star.baseRepelDelayMs * resistance,
      depthBandId: depthProfile?.id || null,
      torchIntensity: 0,
    });
  }
  if (
    !config.interaction.fleeOnTorch
    || !environment.torchActive
    || environment.torchIntensity < config.interaction.torchFleeMinimumIntensity
  ) {
    return null;
  }

  const torch = response.torch;
  const intensity = Math.max(0, Number(environment.torchIntensity) || 0);
  const standardPressure = Math.pow(
    Math.min(1, intensity),
    torch.intensityExponent,
  );
  const overdrivePressure = Math.max(0, intensity - 1)
    * torch.overdrivePressurePerUnit;
  const pressure = clamp(
    Math.max(torch.minimumPressure, standardPressure + overdrivePressure),
    torch.minimumPressure,
    torch.maximumPressure,
  );
  return Object.freeze({
    source: SHADOW_MINER_REPELLENTS.TORCH,
    pressure,
    visualPressure: clamp(
      Math.max(torch.minimumVisualPressure, pressure),
      0,
      1,
    ),
    repelDelayMs: clamp(
      torch.baseRepelDelayMs * resistance / pressure,
      torch.minimumRepelDelayMs,
      torch.maximumRepelDelayMs,
    ),
    depthBandId: depthProfile?.id || null,
    torchIntensity: intensity,
  });
}

export function resolveShadowMinerEncounterBand(
  environment,
  config = SHADOW_MINER_CONFIG,
) {
  if (!environment.hardcoreArmed) return SHADOW_MINER_ENCOUNTER_BANDS.AMBIENT;
  if (environment.stressBand === config.panic.criticalBandKey) {
    return SHADOW_MINER_ENCOUNTER_BANDS.CRITICAL;
  }
  if (environment.stressBand === config.panic.warningBandKey) {
    return SHADOW_MINER_ENCOUNTER_BANDS.WARNING;
  }
  return SHADOW_MINER_ENCOUNTER_BANDS.AMBIENT;
}

export function resolveShadowMinerRepellent(
  environment,
  config = SHADOW_MINER_CONFIG,
) {
  return resolveShadowMinerLightResponse(environment, null, config)?.source || null;
}
