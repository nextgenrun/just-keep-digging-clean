import { SECOND_WORLD_CONFIG } from "./secondWorldConfig.js";

const divider = SECOND_WORLD_CONFIG.levelDivider;

export const SURFACE_TUNNEL_DOOR_CONFIG = Object.freeze({
  tileX: divider.tileX,
  topTileY: divider.gateTopTileY,
  heightTiles: divider.gateHeightTiles,
});
