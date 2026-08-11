import {
  FIRST_FIVE_MINUTES_CONFIG,
  resolveFirstFiveMinutesEnabled,
} from "../../values/firstFiveMinutes.js";
import { RETENTION_CONFIG } from "../../values/retentionConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

function getDigSiteConfig(search) {
  return resolveFirstFiveMinutesEnabled(FIRST_FIVE_MINUTES_CONFIG, search)
    ? FIRST_FIVE_MINUTES_CONFIG.digSite
    : RETENTION_CONFIG.tutorial.digSite;
}

function getSite(scene, config) {
  return {
    tx: config.tileX,
    ty: scene.config.topAirRows + config.surfaceRowOffset,
  };
}

function prepareSite(scene, config) {
  const world = scene.worldModel;
  const renderer = scene.worldRenderer;
  if (!world || !renderer) return null;

  const site = getSite(scene, config);
  const key = `${site.tx},${site.ty}`;
  if (world.dugTiles?.has?.(key)) {
    renderer.clearTutorialTileVisual?.();
    return site;
  }

  const type = TILE_TYPES[config.tileTypeName] ?? TILE_TYPES.DIRT;
  const hp = config.useNormalTileHp
    ? world.getTileMaxHp(site.tx, site.ty, type)
    : config.tileHp;
  world.setTile(site.tx, site.ty, type, hp);
  renderer.applyTileUpdate(site.tx, site.ty);
  // The objective marker already identifies this exact cell. The former
  // dirtHp5 overlay was a full legacy pixel square that covered the authored
  // Town Square; clear it and let the ground facade present the embedded seam.
  renderer.clearTutorialTileVisual?.();
  return site;
}

export function getTownTutorialDigSite(
  scene,
  search = globalThis.location?.search || "",
) {
  return getSite(scene, getDigSiteConfig(search));
}

export function prepareTownTutorialDigSite(
  scene,
  search = globalThis.location?.search || "",
) {
  return prepareSite(scene, getDigSiteConfig(search));
}
