import { TILE_TYPES } from "../values/tileTypes.js";

export function prepareShallowMaterialGallery(scene, world, depthTiles) {
  const model = scene.worldModel;
  const halfWidth = Math.max(8, Number(world.captureGalleryHalfWidth) || 18);
  const centerTx = Math.max(
    halfWidth + 2,
    Math.min(
      (model.widthTiles || scene.config.worldWidthTiles) - halfWidth - 3,
      (scene.config.spawnTileX || scene.config.playerSpawnTileX)
        + world.spawnOffsetTiles
    )
  );
  const centerTy = scene.config.topAirRows + Math.round(depthTiles) - 1;
  for (let dx = -halfWidth; dx <= halfWidth; dx += 1) {
    const tx = centerTx + dx;
    const arch = Math.round(1.6 * Math.cos((dx / halfWidth) * Math.PI));
    const ceilingDy = -5 - arch;
    const floorDy = 2 + Math.round(Math.sin(dx * 0.52) * 0.65);
    for (let dy = ceilingDy; dy < floorDy; dy += 1) {
      const ty = centerTy + dy;
      model.setTile(tx, ty, TILE_TYPES.AIR, 0);
      model.dugTiles?.set?.(`${tx},${ty}`, { tileX: tx, tileY: ty, dugAt: 1 });
    }
    model.setTile(tx, centerTy + floorDy, TILE_TYPES.DARK_DIRT_NORMAL, 0);
  }
  model.setTile(centerTx, centerTy + 1, TILE_TYPES.DARK_DIRT_NORMAL, 0);
  return { tx: centerTx, ty: centerTy };
}
