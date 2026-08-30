/** Resolves player-voice enablement and scales sparse policies for dev stress mode. */

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export function resolvePlayerVoiceRuntime(
  config,
  search = globalThis.location?.search || "",
) {
  const params = new URLSearchParams(search);
  const requestedEnabled = normalize(params.get(config.queryParam));
  let enabled = config.enabledByDefault === true;
  if (config.queryEnableValues.includes(requestedEnabled)) enabled = true;
  if (config.queryDisableValues.includes(requestedEnabled)) enabled = false;

  const requestedMode = normalize(params.get(config.modeQueryParam));
  const modeId = config.modes[requestedMode]
    ? requestedMode
    : config.standardMode;
  return Object.freeze({
    enabled,
    modeId,
    mode: config.modes[modeId],
    stressMode: modeId === config.stressMode,
  });
}

export function resolvePlayerVoiceFamily(
  config,
  search = globalThis.location?.search || "",
) {
  const requested = new URLSearchParams(search).get(config.reviewFamilyQueryParam);
  return requested && config.events[requested]
    ? requested
    : config.eventIds.titanDiscovery;
}

export function scalePlayerVoicePolicy(definition, runtime) {
  const divisor = Math.max(1, Number(runtime.mode.cooldownDivisor) || 1);
  const quietDivisor = Math.max(1, Number(runtime.mode.quietTailDivisor) || 1);
  const chanceMultiplier = Math.max(0, Number(runtime.mode.chanceMultiplier) || 0);
  return Object.freeze({
    chance: Math.min(1, Math.max(0, definition.chance) * chanceMultiplier),
    cooldownMs: Math.max(0, definition.cooldownMs / divisor),
    quietTailMs: Math.max(0, definition.quietTailMs / quietDivisor),
    queueTtlMs: Math.max(0, definition.queueTtlMs),
    globalCooldownDivisor: divisor,
  });
}
