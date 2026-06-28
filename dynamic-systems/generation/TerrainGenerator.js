/**
 * TerrainGenerator — Generates base terrain layers.
 */
import { TILE_TYPES } from "../../values/tileTypes.js";
import { TILE_HEALTH } from "../../values/tileHealth.js";
import { WORLD_GEN_CONFIG } from "../../values/worldGen.js";

export class TerrainGenerator {
  constructor(rng) {
    this.rng = rng;
  }

  generate(worldModel) {
    const { widthTiles, depthTiles, topAirRows } = worldModel;
    const surfaceY = topAirRows + 1;
    const { dirtRatio, stoneRatio, copperRatio } = WORLD_GEN_CONFIG;
    for (let y = surfaceY; y < depthTiles - 1; y++) {
      const depth = y - surfaceY;
      for (let x = 0; x < widthTiles; x++) {
        const roll = this.rng.next();
        let type = TILE_TYPES.DIRT;
        let hp = TILE_HEALTH.dirt || 3;
        if (depth > 5 && roll < copperRatio) {
          type = TILE_TYPES.COPPER;
          hp = TILE_HEALTH.copper || 6;
        } else if (depth > 3 && roll < stoneRatio) {
          type = TILE_TYPES.STONE;
          hp = TILE_HEALTH.stone || 5;
        }
        if (depth > 100) {
          if (this.rng.next() < 0.3) {
            type = TILE_TYPES.DARK_DIRT_NORMAL;
            hp = TILE_HEALTH.darkDirtNormal || 8;
          }
        }
        if (depth > 300) {
          if (this.rng.next() < 0.15) {
            type = TILE_TYPES.DARK_DIRT_STRONG;
            hp = TILE_HEALTH.darkDirtStrong || 12;
          }
        }
        worldModel.setType(x, y, type);
        worldModel.setHp(x, y, hp);
      }
    }
  }
}