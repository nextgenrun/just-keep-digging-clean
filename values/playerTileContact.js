export const PLAYER_TILE_CONTACT_CONFIG = Object.freeze({
  targeting: Object.freeze({
    edgeEpsilonPx: 0.001,
  }),
  solidOcclusion: Object.freeze({
    // The approved front-plane overlap lets fists/feet visibly enter the tile art.
    enabledByDefault: false,
    queryParam: "playerSolidOcclusion",
    enabledValues: Object.freeze(["1", "true", "on", "enabled"]),
    disabledValues: Object.freeze(["0", "false", "off", "disabled", "legacy"]),
    scanPaddingTiles: 1,
    maskFillColor: 0xffffff,
    maskFillAlpha: 1,
  }),
});

export function resolvePlayerSolidOcclusionEnabled(
  config = PLAYER_TILE_CONTACT_CONFIG.solidOcclusion,
  search = globalThis.location?.search || "",
) {
  const value = new URLSearchParams(search)
    .get(config.queryParam)
    ?.trim()
    .toLowerCase();
  if (config.enabledValues?.includes(value)) return true;
  if (config.disabledValues.includes(value)) return false;
  return config.enabledByDefault === true;
}

export const PLAYER_TARGET_VARIANTS = Object.freeze({
  side: "SIDE",
  up: "UP",
  down: "DOWN",
  upSide: "UP-SIDE",
  downSide: "DOWN-SIDE",
});

export const PLAYER_TARGET_AIM_LABELS = Object.freeze({
  left: "LEFT",
  right: "RIGHT",
  up: "UP",
  down: "DOWN",
  upLeft: "UP-LEFT",
  upRight: "UP-RIGHT",
  downLeft: "DOWN-LEFT",
  downRight: "DOWN-RIGHT",
});
