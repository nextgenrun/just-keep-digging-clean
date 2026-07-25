export const PLAYER_TILE_CONTACT_CONFIG = Object.freeze({
  targeting: Object.freeze({
    edgeEpsilonPx: 0.001,
  }),
  solidOcclusion: Object.freeze({
    enabled: true,
    scanPaddingTiles: 1,
    maskFillColor: 0xffffff,
    maskFillAlpha: 1,
  }),
});

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
