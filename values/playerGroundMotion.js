export const PLAYER_GROUND_MOTION_CONFIG = Object.freeze({
  enabled: true,
  rollback: Object.freeze({
    queryParam: "smoothGroundRun",
    disabledValues: Object.freeze(["0", "false", "off", "legacy"]),
  }),
  accelerateToMaxMs: 120,
  releaseToStopMs: 90,
  reverseFullDirectionMs: 150,
});

export function resolvePlayerGroundMotionEnabled(
  search = globalThis.location?.search || "",
  config = PLAYER_GROUND_MOTION_CONFIG,
) {
  if (config.enabled !== true) return false;
  const value = new URLSearchParams(search)
    .get(config.rollback.queryParam)
    ?.trim()
    .toLowerCase();
  return !value || !config.rollback.disabledValues.includes(value);
}
