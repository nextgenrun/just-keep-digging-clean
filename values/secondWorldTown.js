export const SECOND_WORLD_TOWN_CONFIG = Object.freeze({
  // Replaced by the authored level-two surface town in the v11 world art.
  enabled: false,
  outerBounds: Object.freeze({ x: 245, y: 2, width: 35, height: 22 }),
  interiorBounds: Object.freeze({ x: 246, y: 3, width: 33, height: 20 }),
  entrance: Object.freeze({ x: 245, topY: 20, height: 2 }),
  floorY: 22,
  renderDepth: -4,
  entryPulse: Object.freeze({
    color: 0x46dfff,
    widthTileFraction: 0.12,
    alpha: 0.5,
    minimumAlpha: 0.14,
    durationMs: 900,
  }),
});
