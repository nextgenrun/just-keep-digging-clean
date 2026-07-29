import { RETENTION_CONFIG } from "../../values/retentionConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

export function getTownTutorialDigSite(scene) {
  const config = RETENTION_CONFIG.tutorial.digSite;
  return {
    tx: config.tileX,
    ty: scene.config.topAirRows + config.surfaceRowOffset,
  };
}

export function prepareTownTutorialDigSite(scene) {
  const world = scene.worldModel;
  const renderer = scene.worldRenderer;
  if (!world || !renderer) return null;

  const site = getTownTutorialDigSite(scene);
  const key = `${site.tx},${site.ty}`;
  if (world.dugTiles?.has?.(key)) return site;

  const config = RETENTION_CONFIG.tutorial.digSite;
  const type = TILE_TYPES[config.tileTypeName] ?? TILE_TYPES.DIRT;
  world.setTile(site.tx, site.ty, type, config.tileHp);
  renderer.applyTileUpdate(site.tx, site.ty);
  return site;
}
