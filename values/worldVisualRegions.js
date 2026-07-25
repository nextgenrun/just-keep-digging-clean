const region = (id, kind, leftTile, rightTileExclusive, topTile, bottomTileExclusive) => Object.freeze({
  id,
  kind,
  leftTile,
  rightTileExclusive,
  topTile,
  bottomTileExclusive,
});

export const WORLD_VISUAL_REGIONS = Object.freeze([
  region("surface-town", "hero-town", 0, 22, 0, 66),
  region("surface-wilderness", "moonlit-wilderness", 22, 280, 0, 66),
  region("level-one", "continuous-mine", 0, 280, 65, 2065),
  region("level-two", "continuous-deep-world", 0, 280, 2065, 5065),
]);

export function resolveWorldVisualRegions(tileX, tileY) {
  return WORLD_VISUAL_REGIONS.filter(entry => (
    tileX >= entry.leftTile
    && tileX < entry.rightTileExclusive
    && tileY >= entry.topTile
    && tileY < entry.bottomTileExclusive
  ));
}
