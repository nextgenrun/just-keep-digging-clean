import { SIGNAL_EVENT as cfg } from "../../values/signalEvent.js";
import { createSignalPayload, signalDistance } from "../../systems/events/signalEventRules.js";
import { getSignalCampCells } from "./SignalMinicamp.js";
import { hash01 } from "../../values/deterministicMath.js";

export function planSignalEvent(scene, playerTile, serial, options = null) {
  const world = scene.worldModel, top = scene.config.topAirRows;
  if (!options && playerTile.ty - top + 1 < cfg.minDepth) return null;
  const candidates = [];
  const searchY = options ? Math.max(playerTile.ty, top + cfg.minDepth) : playerTile.ty;
  for (let dy = -cfg.searchHeight; dy <= cfg.searchHeight; dy++) {
    for (let dx = -cfg.maxDistance; dx <= cfg.maxDistance; dx++) {
      const tile = { tx: playerTile.tx + dx, ty: searchY + dy };
      const distance = signalDistance(tile, playerTile);
      if (distance < (options ? 1 : cfg.minDistance) || distance > cfg.maxDistance) continue;
      if (!world.inBounds(tile.tx, tile.ty + 1) || !world.inBounds(tile.tx, tile.ty - 1)
        || tile.ty - cfg.camp.height + 1 < top + cfg.minDepth) continue;
      if (!getSignalCampCells(scene, tile)) continue;
      if (scene.caveHazardSystem?.hazards?.some(h => Math.abs(h.centerTx - tile.tx) < cfg.nearDistance
        && Math.abs(h.ty - tile.ty) < cfg.nearDistance)) continue;
      candidates.push(tile);
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => signalDistance(a, playerTile) - signalDistance(b, playerTile));
  const seed = world.config.seed;
  const index = options ? 0 : Math.floor(hash01(seed, serial, cfg.sourceSalt, 2) * candidates.length);
  return createSignalPayload(seed, serial, candidates[index], { ...(options || {}), miaRescued: scene.upgradeSystem?.getUpgradeLevel?.("mia") > 0 });
}
