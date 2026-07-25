// Shared world-depth contract. Level One keeps its authored 2,000-row runtime,
// while the separated Level Two shaft continues for 5,000 playable meters.
export const WORLD_DEPTH_CONFIG = Object.freeze({
  topAirRows: 65,
  levelOneRuntimeDepthTiles: 2000,
  levelTwoDepthMeters: 5000,
  worldDepthTiles: 5065,
  levelTwoLeftTile: 132,
  levelTwoRightTile: 279,
});
