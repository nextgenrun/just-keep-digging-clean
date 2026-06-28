/**
 * WorldModel — Coordinates the tile grid, state, and queries.
 * Central access point for world data.
 */
import { TILE_TYPES } from "../../values/tileTypes.js";
import { GAME_CONFIG } from "../../values/gameConfig.js";

/**
 * WorldModel manages the tile grid (type + HP arrays),
 * dug tile tracking, world dimensions, and accessor methods.
 */
export class WorldModel {
  constructor(config = GAME_CONFIG) {
    this.config = config;
    this.widthTiles = config.worldWidthTiles;
    this.depthTiles = config.worldDepthTiles;
    this.topAirRows = config.topAirRows;
    this.tileSize = config.tileSize;

    // Typed arrays for tile data
    this._types = new Uint8Array(this.widthTiles * this.depthTiles);
    this._hp = new Uint8Array(this.widthTiles * this.depthTiles);

    // Dug tile tracker (in-memory only at model level; persistence handled by scene)
    this.dugTiles = new Map();

    // Initialise all tiles to AIR by default
    this._types.fill(TILE_TYPES.AIR);
  }

  /** Get world identity object (for save system matching) */
  getWorldIdentity() {
    return {
      seed: this.config.seed,
      width: this.widthTiles,
      depth: this.depthTiles,
      topAirRows: this.topAirRows,
    };
  }

  /** Get all dug tile keys */
  getDugTileKeys() {
    return Array.from(this.dugTiles.keys());
  }

  /** Get rubble tiles array */
  getRubbleTiles() {
    return [];
  }

  /** Get tile type at coordinates (alias for getType) */
  getTileType(tileX, tileY) {
    return this.getType(tileX, tileY);
  }

  /** Check if a tile is diggable */
  isDiggable(tileX, tileY) {
    const type = this.getType(tileX, tileY);
    return type !== TILE_TYPES.AIR && type !== TILE_TYPES.BEDROCK;
  }

  /** Damage a tile. Returns result object matching backup's interface. */
  damageTile(tileX, tileY, damage) {
    if (!this.inBounds(tileX, tileY)) {
      return { success: false, reason: 'out-of-bounds' };
    }
    const idx = this._index(tileX, tileY);
    const currentHp = this._hp[idx];
    if (currentHp <= 0) {
      return { success: false, reason: 'already-destroyed' };
    }
    const typeBeforeDamage = this._types[idx];
    const newHp = Math.max(0, currentHp - damage);
    this._hp[idx] = newHp;
    const destroyed = newHp <= 0;
    if (destroyed) {
      this.dugTiles.set(`${tileX},${tileY}`, { tileX, tileY, dugAt: Date.now() });
    }
    return {
      success: true,
      destroyed,
      hp: newHp,
      typeBeforeDamage,
      wasRubble: false,
    };
  }

  /** Get linear index from tile coordinates */
  _index(tileX, tileY) {
    return tileY * this.widthTiles + tileX;
  }

  /** Check if coordinates are in bounds */
  inBounds(tileX, tileY) {
    return tileX >= 0 && tileX < this.widthTiles && tileY >= 0 && tileY < this.depthTiles;
  }

  /** Get tile type at (tileX, tileY) */
  getType(tileX, tileY) {
    if (!this.inBounds(tileX, tileY)) return TILE_TYPES.BEDROCK;
    return this._types[this._index(tileX, tileY)];
  }

  /** Set tile type at (tileX, tileY) */
  setType(tileX, tileY, type) {
    if (this.inBounds(tileX, tileY)) {
      this._types[this._index(tileX, tileY)] = type;
    }
  }

  /** Get tile HP at (tileX, tileY) */
  getHp(tileX, tileY) {
    if (!this.inBounds(tileX, tileY)) return 0;
    return this._hp[this._index(tileX, tileY)];
  }

  /** Set tile HP at (tileX, tileY) */
  setHp(tileX, tileY, hp) {
    if (this.inBounds(tileX, tileY)) {
      this._hp[this._index(tileX, tileY)] = hp;
    }
  }

  /** Check if a tile is solid (not AIR) */
  isSolid(tileX, tileY) {
    return this.getType(tileX, tileY) !== TILE_TYPES.AIR;
  }

  /** Get width in pixels */
  get widthPx() {
    return this.widthTiles * this.tileSize;
  }

  /** Get depth in pixels */
  get depthPx() {
    return this.depthTiles * this.tileSize;
  }

  /** Reset entire grid */
  reset() {
    this._types.fill(TILE_TYPES.AIR);
    this._hp.fill(0);
    this.dugTiles.clear();
  }
}