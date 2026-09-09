import { TILE_TYPES } from "../../values/tileTypes.js";
import { RESOURCE_TILE_TYPE_VALUES } from "../../values/resourceTypes.js";
import { SIGNAL_EVENT as cfg } from "../../values/signalEvent.js";
const ordinary = new Set([TILE_TYPES.AIR, ...RESOURCE_TILE_TYPE_VALUES]);

// A camp is real empty terrain. Special blocks, walls and surface structures are never carved.
export function getSignalCampCells(scene, anchor) {
  const cells = [], world = scene.worldModel;
  const radius = cfg.camp.radius, height = cfg.camp.height;
  for (let x = anchor.tx - radius; x <= anchor.tx + radius; x++) {
    if (!world.inBounds(x, anchor.ty + 1) || !world.isSolid(x, anchor.ty + 1)) return null;
    for (let y = anchor.ty - height + 1; y <= anchor.ty; y++) {
      if (!world.inBounds(x, y) || !ordinary.has(world.getTileType?.(x, y) ?? world.getType?.(x, y))
        || scene.randomEventBridge?.activeRuntime?.shouldProtectMineTarget?.({ tx: x, ty: y })) return null;
      cells.push({ tx: x, ty: y });
    }
  }
  return cells;
}
export function clearSignalMinicamp(scene, anchor) {
  const cells = getSignalCampCells(scene, anchor);
  if (!cells) return false;
  const solid = cells.filter(p => scene.worldModel.isSolid(p.tx, p.ty));
  const changed = scene.worldModel.applyDugTileKeys(solid.map(p => p.tx + "," + p.ty));
  scene.worldRenderer?.applyTileUpdates?.(changed);
  if (changed.length) scene.queueDugTilesSave?.();
  return cells.every(p => !scene.worldModel.isSolid(p.tx, p.ty));
}
