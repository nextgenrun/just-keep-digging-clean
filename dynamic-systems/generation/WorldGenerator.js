/**
 * WorldGenerator — Full world generation pipeline.
 * Generates terrain with: sky island, town floor, dirt/stone bands,
 * caves, and special blocks matching the working environment.
 */
import { GAME_CONFIG } from "../../values/gameConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { TILE_HEALTH } from "../../values/tileHealth.js";
import { WORLD_GEN_CONFIG } from "../../values/worldGen.js";
import { SeededRandom } from "../model/SeededRandom.js";
import { TerrainGenerator } from "./TerrainGenerator.js";
import { CaveGenerator } from "./CaveGenerator.js";

export class WorldGenerator {
  constructor() {
    this.seed = GAME_CONFIG.seed || 133742;
    this.rng = new SeededRandom(this.seed);
    this.terrainGen = new TerrainGenerator(this.rng);
    this.caveGen = new CaveGenerator(this.rng);
  }

  generate(worldModel) {
    const { widthTiles, depthTiles, topAirRows } = worldModel;

    // 1. Clear entire world to AIR
    for (let y = 0; y < depthTiles; y++) {
      for (let x = 0; x < widthTiles; x++) {
        worldModel.setType(x, y, TILE_TYPES.AIR);
        worldModel.setHp(x, y, 0);
      }
    }

    // 2. Generate base terrain (dirt/stone/copper layers)
    this.terrainGen.generate(worldModel);

    // 3. Carve caves
    this.caveGen.generate(worldModel);

    // 4. Set bedrock at bottom row
    const bedrockRow = depthTiles - 1;
    for (let x = 0; x < widthTiles; x++) {
      worldModel.setType(x, bedrockRow, TILE_TYPES.BEDROCK);
      worldModel.setHp(x, bedrockRow, 255);
    }

    // 5. Generate sky island (floating land mass above town)
    const islandX = GAME_CONFIG.skyIslandTileX || 23;
    const islandY = GAME_CONFIG.skyIslandTileY || 35;
    const islandW = GAME_CONFIG.skyIslandWidthTiles || 20;
    const islandH = 4;
    for (let row = 0; row < islandH; row++) {
      for (let x = islandX; x < islandX + islandW; x++) {
        const y = islandY + row;
        if (y >= topAirRows) break;
        const type = row === islandH - 1 ? TILE_TYPES.DIRT : TILE_TYPES.AIR;
        if (row === islandH - 1) {
          worldModel.setType(x, y, TILE_TYPES.DIRT);
          worldModel.setHp(x, y, TILE_HEALTH.dirt || 3);
        }
        // Top of island gets grass-like stone
        if (row === 0) {
          worldModel.setType(x, y, TILE_TYPES.STONE);
          worldModel.setHp(x, y, TILE_HEALTH.stone || 8);
        }
      }
    }

    // 6. Town floor at topAirRows
    for (let x = 0; x < widthTiles; x++) {
      worldModel.setType(x, topAirRows, TILE_TYPES.FLOOR_TOWN_1);
      worldModel.setHp(x, topAirRows, 255);
    }

    // 7. Surface decoration: scatter a few surface tiles above town floor
    for (let x = 0; x < widthTiles; x += 2) {
      if (this.rng.next() < 0.3) {
        const y = topAirRows - 1;
        if (!worldModel.isSolid(x, y)) {
          worldModel.setType(x, y, TILE_TYPES.DIRT);
          worldModel.setHp(x, y, TILE_HEALTH.dirt || 3);
        }
      }
    }

    console.log(`[WorldGenerator] World generated: ${widthTiles}x${depthTiles}`);
  }
}