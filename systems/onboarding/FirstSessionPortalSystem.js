import { FIRST_FIVE_MINUTES_CONFIG } from "../../values/firstFiveMinutes.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

// Owns the single deterministic return gate on the starter descent.
export class FirstSessionPortalSystem {
  constructor(scene, config = FIRST_FIVE_MINUTES_CONFIG.firstPortal) {
    this.scene = scene;
    this.config = config;
    this.lastEnsureResult = null;
  }

  getPortalTile() {
    const topAirRows = this.scene?.config?.topAirRows;
    if (!Number.isInteger(topAirRows)) return null;
    return {
      tx: this.config.tileX,
      ty: topAirRows + this.config.depthMeters,
      depth: this.config.depthMeters,
    };
  }

  ensure() {
    const world = this.scene?.worldModel;
    const tile = this.getPortalTile();
    const type = TILE_TYPES[this.config.tileTypeName];
    if (!world || !tile || !Number.isInteger(type) || !world.inBounds?.(tile.tx, tile.ty)) {
      this.lastEnsureResult = { ready: false, changed: false, reason: "invalid-route" };
      return this.lastEnsureResult;
    }

    const existingType = world.getTileType?.(tile.tx, tile.ty);
    if (existingType === type) {
      this.lastEnsureResult = { ready: true, changed: false, tile, type };
      return this.lastEnsureResult;
    }

    const hp = world.getTileMaxHp?.(tile.tx, tile.ty, type) || 0;
    world.setTile(tile.tx, tile.ty, type, hp);
    world.dugTileSource?.delete?.(`${tile.tx},${tile.ty}`);
    this.scene.worldRenderer?.applyTileUpdate?.(tile.tx, tile.ty);
    this.lastEnsureResult = { ready: true, changed: true, tile, type, hp };
    return this.lastEnsureResult;
  }

  getDistance(playerTile = this.scene?.playerController?.getPlayerTile?.()) {
    const tile = this.getPortalTile();
    if (!tile || !playerTile) return Number.POSITIVE_INFINITY;
    return Math.abs(playerTile.tx - tile.tx) + Math.abs(playerTile.ty - tile.ty);
  }

  getHealthSnapshot() {
    const tile = this.getPortalTile();
    const expectedType = TILE_TYPES[this.config.tileTypeName];
    const actualType = tile
      ? this.scene?.worldModel?.getTileType?.(tile.tx, tile.ty)
      : null;
    return {
      ready: Boolean(tile && actualType === expectedType),
      tile,
      expectedType,
      actualType,
      lastEnsureResult: this.lastEnsureResult,
    };
  }

  destroy() {
    this.scene = null;
    this.config = null;
    this.lastEnsureResult = null;
  }
}
