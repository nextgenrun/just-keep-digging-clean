/**
 * CaveGenerator — Carves caves into generated terrain.
 */
import { TILE_TYPES } from "../../values/tileTypes.js";

export class CaveGenerator {
  constructor(rng) { this.rng = rng; }

  generate(worldModel) {
    const { widthTiles, depthTiles, topAirRows } = worldModel;
    const caveCount = Math.floor((widthTiles * depthTiles) / 5000);
    for (let i = 0; i < caveCount; i++) {
      const cx = this.rng.nextInt(2, widthTiles - 3);
      const cy = this.rng.nextInt(topAirRows + 10, depthTiles - 20);
      const radius = this.rng.nextInt(2, 6);
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= radius + this.rng.nextFloat(-0.5, 0.5)) {
            const tx = cx + dx;
            const ty = cy + dy;
            if (worldModel.inBounds(tx, ty)) {
              const type = worldModel.getType(tx, ty);
              if (type !== TILE_TYPES.BEDROCK && type !== TILE_TYPES.FLOOR_TOWN_1) {
                worldModel.setType(tx, ty, TILE_TYPES.AIR);
                worldModel.setHp(tx, ty, 0);
              }
            }
          }
        }
      }
    }
  }
}
