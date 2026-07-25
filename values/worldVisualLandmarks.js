const DISABLED_QUERY_VALUES = Object.freeze(["0", "false", "off", "disabled", "legacy"]);

export const WORLD_VISUAL_LANDMARKS = Object.freeze({
  enabledByDefault: true,
  queryParam: "mineEntrancePilot",
  disabledValues: DISABLED_QUERY_VALUES,
  assets: Object.freeze({
    mineEntranceBeauty: Object.freeze({
      key: "world-visual-v2-mine-entrance-pilot-beauty",
      path: "sprites/backgrounds/world-visual-v2/pilot/mine-entrance-v1/mine-entrance-front-v1.png",
    }),
    mineEntranceEmissive: Object.freeze({
      key: "world-visual-v2-mine-entrance-pilot-emissive",
      path: "sprites/backgrounds/world-visual-v2/pilot/mine-entrance-v1/mine-entrance-emissive-v1.png",
    }),
  }),
  entries: Object.freeze([
    Object.freeze({
      id: "spawn-shaft-mine-entrance-pilot-v1",
      beautyAssetId: "mineEntranceBeauty",
      emissiveAssetId: "mineEntranceEmissive",
      anchor: Object.freeze({
        kind: "shallowestSafeCaveMouth",
        xDeltaTiles: 0,
        floorDeltaTiles: 0,
      }),
      displayWidthTiles: 3.1,
      crop: Object.freeze({ x: 284, y: 116, width: 837, height: 904 }),
      beautyDepth: 2.3,
      emissiveDepth: 2.31,
      emissive: Object.freeze({
        baseAlpha: 0.1,
        nightAlpha: 0.46,
        wetAlpha: 0.07,
        lightningAlpha: 0.24,
        pulseAmount: 0.1,
        pulsePeriodMs: 4200,
        phase: 0.35,
      }),
    }),
  ]),
});

export function resolveWorldVisualLandmarksEnabled(
  config = WORLD_VISUAL_LANDMARKS,
  search = globalThis.location?.search || ""
) {
  const value = new URLSearchParams(search).get(config.queryParam)?.trim().toLowerCase();
  if (value && config.disabledValues.includes(value)) return false;
  return config.enabledByDefault;
}

export function getWorldVisualLandmarkPreloadAssets(
  config = WORLD_VISUAL_LANDMARKS,
  search
) {
  if (!resolveWorldVisualLandmarksEnabled(config, search)) return [];
  return Object.values(config.assets);
}
