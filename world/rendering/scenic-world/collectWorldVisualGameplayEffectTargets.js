import { TILE_TYPES } from "../../../values/tileTypes.js";

export function collectWorldVisualGameplayEffectTargets(worldModel, bounds, caps) {
  const skyTiles = [];
  const chestTiles = [];
  const crystalTiles = [];
  const chestKeys = new Set();
  const addChest = (tx, ty) => {
    const key = `${tx}:${ty}`;
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return;
    if (worldModel.getTileType(tx, ty) !== TILE_TYPES.CHEST) return;
    if (chestKeys.has(key) || chestTiles.length >= caps.maxChestTiles) return;
    if (tx < bounds.left || tx >= bounds.right || ty < bounds.top || ty >= bounds.bottom) return;
    chestKeys.add(key);
    chestTiles.push({ tx, ty });
  };

  for (let ty = bounds.top; ty < bounds.bottom; ty += 1) {
    for (let tx = bounds.left; tx < bounds.right; tx += 1) {
      const type = worldModel.getTileType(tx, ty);
      if (type === TILE_TYPES.AIR) continue;
      if (type === TILE_TYPES.SKY_TILE && skyTiles.length < caps.maxSkyTiles) {
        skyTiles.push({
          tx,
          ty,
          rarity: worldModel.getSkyTileRarity?.(tx, ty) || 0,
          resourceType: worldModel.getSkyTileOriginalType?.(tx, ty) || TILE_TYPES.DIRT,
        });
      }
      if (type === TILE_TYPES.CHEST) addChest(tx, ty);
      if (type === TILE_TYPES.GLOW_CRYSTAL && crystalTiles.length < caps.maxCrystalTiles) {
        crystalTiles.push({ tx, ty });
      }
    }
  }

  for (const zone of worldModel.treasureRoomZones || []) addChest(zone.chestTx, zone.chestTy);
  for (const zone of worldModel.hiddenCaveZones || []) {
    if (zone.hasTreasureRoom) addChest(zone.cx, zone.cy);
  }
  const crystalZones = (worldModel.glowCrystalZones || []).filter(zone => (
    zone.cx + zone.rx >= bounds.left && zone.cx - zone.rx < bounds.right
    && zone.cy + zone.ry >= bounds.top && zone.cy - zone.ry < bounds.bottom
  )).slice(0, caps.maxCrystalZones);

  return { skyTiles, chestTiles, crystalTiles, crystalZones };
}
