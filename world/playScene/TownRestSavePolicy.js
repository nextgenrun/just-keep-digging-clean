import { TOWN_REST } from '../../values/townRest.js';
export function isInTownForRest(scene) {
  const body = scene?.playerController?.physicsBody;
  const size = scene?.config?.tileSize;
  if (!body || !Number.isFinite(size) || size <= 0) return false;
  if (scene.scene?.isActive?.('CaveScene')) return false;
  const x = (body.x + body.w / 2) / size;
  const feet = body.y + body.h;
  return Number.isFinite(feet) && x >= TOWN_REST.town.minTileX
    && x <= TOWN_REST.town.maxTileX
    && Math.abs(feet - scene.config.topAirRows * size) <= TOWN_REST.town.feetTolerancePx;
}
export function canPersistTownRest(scene) {
  return !TOWN_REST.enabled || (scene?._townRestCommit === true && isInTownForRest(scene));
}
