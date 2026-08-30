import {
  SHADOW_MINER_CONFIG,
  SHADOW_MINER_ENCOUNTER_BANDS,
  SHADOW_MINER_REPELLENTS,
} from "../../values/shadowMiner.js";

export function resolveShadowMinerEnvironment(scene, provided = {}) {
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
  return Object.freeze({
    stressSnapshot,
    stressBand: stressSnapshot.stressBand || null,
    stressRatio: Number(stressSnapshot.stressRatio) || 0,
    hardcoreArmed: stressSnapshot.armed === true,
    torchActive: torchActive === true,
    torchIntensity: Math.max(0, Number(torchIntensity) || 0),
    nearIntactStarLight: provided.nearIntactStarLight
      ?? starSnapshot.nearIntactStar
      ?? false,
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
  if (config.interaction.fleeOnIntactStar && environment.nearIntactStarLight) {
    return SHADOW_MINER_REPELLENTS.STAR;
  }
  if (
    config.interaction.fleeOnTorch
    && environment.torchActive
    && environment.torchIntensity >= config.interaction.torchFleeMinimumIntensity
  ) {
    return SHADOW_MINER_REPELLENTS.TORCH;
  }
  return null;
}
