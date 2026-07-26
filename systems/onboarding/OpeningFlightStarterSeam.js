import { TILE_TYPES } from "../../values/tileTypes.js";

export function prepareOpeningFlightStarterSeam(scene, config) {
  const world = scene.worldModel;
  const renderer = scene.worldRenderer;
  if (!world || !renderer) return;

  const seam = config.starterSeam;
  const tileX = scene.config.spawnTileX + seam.tileXOffsetFromLegacySpawn;
  const surfaceRow = scene.config.topAirRows + seam.surfaceRowOffset;
  const setTile = (ty, type, hp) => {
    const key = `${tileX},${ty}`;
    if (world.dugTiles?.has?.(key)) return;
    world.setTile(tileX, ty, type, hp);
    renderer.applyTileUpdate(tileX, ty);
  };

  setTile(surfaceRow, TILE_TYPES.AIR, 0);
  seam.tileTypeNames.forEach((typeName, index) => {
    const type = TILE_TYPES[typeName] ?? TILE_TYPES.DIRT;
    setTile(surfaceRow + index + 1, type, seam.tileHp);
  });
  const bottomType = TILE_TYPES[seam.bottomTileTypeName] ?? TILE_TYPES.BEDROCK;
  setTile(surfaceRow + seam.bottomDepthTiles, bottomType, 0);
}
