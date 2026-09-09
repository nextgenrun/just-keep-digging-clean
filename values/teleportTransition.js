// ==================== PORTAL TELEPORT TRANSITION ====================
// Long portal jumps stage the destination behind the regular loading screen.
// Short/system teleports keep their existing synchronous authority.

const QUERY_ENABLE_VALUES = Object.freeze(["1", "on", "true"]);
const QUERY_DISABLE_VALUES = Object.freeze(["0", "off", "false"]);

export const TELEPORT_TRANSITION_CONFIG = Object.freeze({
  enabled: true,
  queryParam: "teleportLoading",
  queryEnableValues: QUERY_ENABLE_VALUES,
  queryDisableValues: QUERY_DISABLE_VALUES,
  minimumDistanceTiles: 48,
  minimumVisibleMs: 420,
  maximumPreparationMs: 3600,
  settleFrames: 2,
  overlayDepth: 12000,
  backdropColor: 0x02060a,
  backdropAlpha: 0.94,
  diagnosticsGlobalKey: "__jkdTeleportTransition",
});

export function isTeleportTransitionEnabled(
  search = globalThis.location?.search || "",
  config = TELEPORT_TRANSITION_CONFIG,
) {
  const value = new URLSearchParams(search)
    .get(config.queryParam)
    ?.trim()
    .toLowerCase();
  if (value && config.queryDisableValues.includes(value)) return false;
  if (value && config.queryEnableValues.includes(value)) return true;
  return config.enabled;
}
