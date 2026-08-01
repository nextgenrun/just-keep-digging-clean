import { SECOND_WORLD_TOWN_CONFIG } from "../../values/secondWorldTown.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

function setTownTile(worldModel, tx, ty, type, hp = null) {
  if (!worldModel.inBounds(tx, ty)) return;

  const index = worldModel.index(tx, ty);
  const nextHp = hp === null ? worldModel.getTileMaxHp(tx, ty, type) : hp;
  worldModel.setTile(tx, ty, type, nextHp);
  worldModel.skyTileOriginalType[index] = 0;
  worldModel.skyTileRarity[index] = 0;
  worldModel.skyTileIdentity[index] = 0;
  worldModel.rootOverlay[index] = 0;
}

function contains(bounds, tx, ty) {
  return tx >= bounds.x
    && tx < bounds.x + bounds.width
    && ty >= bounds.y
    && ty < bounds.y + bounds.height;
}

function isEntrance(config, tx, ty) {
  const entrance = config.entrance;
  return tx === entrance.x
    && ty >= entrance.topY
    && ty < entrance.topY + entrance.height;
}

export function applySecondWorldTown(worldModel, config = SECOND_WORLD_TOWN_CONFIG) {
  if (!config.enabled) return { applied: false, reason: "disabled" };

  const outer = config.outerBounds;
  const interior = config.interiorBounds;
  const outerEndX = outer.x + outer.width - 1;
  const outerEndY = outer.y + outer.height - 1;

  if (!contains(outer, interior.x, interior.y)
    || !contains(outer, interior.x + interior.width - 1, interior.y + interior.height - 1)
    || !worldModel.inBounds(outer.x, outer.y)
    || !worldModel.inBounds(outerEndX, outerEndY)) {
    return { applied: false, reason: "out-of-bounds" };
  }

  let bedrockTiles = 0;
  let floorTiles = 0;
  let airTiles = 0;

  for (let ty = outer.y; ty <= outerEndY; ty += 1) {
    for (let tx = outer.x; tx <= outerEndX; tx += 1) {
      const isShell = tx === outer.x || tx === outerEndX || ty === outer.y || ty === outerEndY;

      if (isShell && !isEntrance(config, tx, ty)) {
        setTownTile(worldModel, tx, ty, TILE_TYPES.BEDROCK);
        bedrockTiles += 1;
      } else if (ty === config.floorY && contains(interior, tx, ty)) {
        setTownTile(worldModel, tx, ty, TILE_TYPES.FLOOR_TOWN_2, 0);
        floorTiles += 1;
      } else {
        setTownTile(worldModel, tx, ty, TILE_TYPES.AIR, 0);
        airTiles += 1;
      }
    }
  }

  return {
    applied: true,
    bedrockTiles,
    floorTiles,
    airTiles,
    bounds: outer,
  };
}
