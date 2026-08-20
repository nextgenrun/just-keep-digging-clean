import {
  GRAVEBORER_WURM_CONFIG,
  GRAVEBORER_WURM_PHASES,
} from "../../values/graveborerWurm.js";
import { isHardcoreModeArmed } from "../../values/hardcoreMode.js";

function phaseStage(phase) {
  if (phase === GRAVEBORER_WURM_PHASES.warning) return "telegraphing";
  if (phase === GRAVEBORER_WURM_PHASES.burrowing) return "active";
  return null;
}

export function resolveGraveborerWurmAdmission({
  scene,
  playerTile,
  system,
  devForceActive = false,
  devToolsEnabled = false,
  visualReady = true,
}) {
  const config = GRAVEBORER_WURM_CONFIG;
  const hardcoreArmed = isHardcoreModeArmed(scene.hardcoreModeData);
  const flightUnlocked = scene.upgradeSystem?.isGemPowerUnlocked?.() === true;
  const topAirRows = Math.max(0, Number(scene.config?.topAirRows) || 0);
  const depth = Math.max(0, (playerTile?.ty || 0) - topAirRows + 1);
  const encounterStage = phaseStage(system.phase);
  const encounterCommitted = encounterStage !== null;
  const depthEligible = depth >= config.activation.minDepthTiles;
  const devOverride = devToolsEnabled
    && (system.devTest10x === true || devForceActive === true);
  const baseEligible = hardcoreArmed
    && (!config.activation.requiresFlightUnlock || flightUnlocked)
    && (depthEligible || encounterCommitted);
  const productionActive = system.enabled === true
    && visualReady === true
    && baseEligible;
  const active = system.enabled === true
    && visualReady === true
    && (devOverride || baseEligible);

  let reason = "armed";
  if (system.enabled !== true) reason = "disabled";
  else if (visualReady !== true) reason = "asset-missing";
  else if (encounterCommitted) reason = encounterStage;
  else if (devOverride) reason = "forced";
  else if (!hardcoreArmed) reason = "wrong-mode";
  else if (config.activation.requiresFlightUnlock && !flightUnlocked) {
    reason = "missing-unlock";
  } else if (!depthEligible) reason = "too-shallow";
  else if (system.cooldownMs > 0) reason = "cooldown";
  else if (system.noise < config.noise.threshold) reason = "noise-too-low";

  return Object.freeze({
    active,
    productionActive,
    reason,
    stage: encounterStage || reason,
    hardcoreArmed,
    flightUnlocked,
    depth,
    depthEligible,
    visualReady: visualReady === true,
    cooldownMs: Math.max(0, Number(system.cooldownMs) || 0),
    noise: Math.max(0, Number(system.noise) || 0),
    noiseThreshold: config.noise.threshold,
    devOverride,
    devForceActive: devForceActive === true,
  });
}

export function resolveGraveborerWurmLifecycleStage(
  system,
  gate,
  previousStage = null,
) {
  const current = phaseStage(system.phase);
  if (current) return current;
  if (
    previousStage === "telegraphing"
    || previousStage === "active"
  ) {
    return "resolved";
  }
  return gate.stage;
}
