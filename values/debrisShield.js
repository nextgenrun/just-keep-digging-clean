export const DEBRIS_SHIELD_CONFIG = Object.freeze({
  enabled: true,
  fixedKeyLabel: "Q",
  gpDrainPerSecond: 6,
  minimumGpToActivate: 1.01,
  world: Object.freeze({
    haloKey: "debris-shield-halo-v1",
    haloPath: "sprites/UI/starlight-talent-tree-v4/node-selection-halo-v2.png",
    displaySizePx: 154,
    alpha: 0.74,
    depthOffset: 3,
    pulseScale: 0.075,
    pulseHz: 2.4,
  }),
  hud: Object.freeze({
    widthPx: 310,
    heightPx: 48,
    bottomPx: 151,
    depth: 1975,
    iconSizePx: 38,
    iconOffsetXPx: -127,
    labelOffsetXPx: 18,
    labelFontSizePx: 13,
    readyLabel: "HOLD {key}  DEBRIS SHIELD  •  {drain} GP/S",
    activeLabel: "{key} HELD  •  SHIELD ABSORBING DEBRIS",
    readyColor: "#bcecff",
    activeColor: "#f4e8c8",
  }),
  feedback: Object.freeze({
    blockedText: "DEBRIS BLOCKED",
    blockedColor: "#8fe9ff",
    blockedDurationMs: 850,
  }),
});

export const DEBRIS_SHIELD_PRELOAD_ASSETS = Object.freeze([
  Object.freeze({
    key: DEBRIS_SHIELD_CONFIG.world.haloKey,
    path: DEBRIS_SHIELD_CONFIG.world.haloPath,
  }),
]);
