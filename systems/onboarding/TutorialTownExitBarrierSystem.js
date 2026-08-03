import { FIRST_FIVE_MINUTES_CONFIG } from "../../values/firstFiveMinutes.js";
import {
  RETENTION_CONFIG,
  TOWN_TUTORIAL_CHOICES,
} from "../../values/retentionConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

const BARRIER_STAGES = new Set(RETENTION_CONFIG.tutorial.activeStages);

function cloneMapValue(value) {
  return value && typeof value === "object" ? { ...value } : value;
}

export class TutorialTownExitBarrierSystem {
  constructor(
    scene,
    retention,
    config = FIRST_FIVE_MINUTES_CONFIG.townExitBarrier,
  ) {
    this.scene = scene;
    this.retention = retention;
    this.config = config;
    this.originalTiles = new Map();
    this.created = false;
    this.active = false;
  }

  create() {
    this.created = true;
    return this.sync();
  }

  update() {
    return this.sync();
  }

  sync() {
    if (!this.created) return false;
    const shouldBeActive = this._shouldBeActive();
    if (shouldBeActive) {
      if (!this.active || !this._isInstalled()) this._install();
    } else if (this.active || this.originalTiles.size > 0) {
      this._restore();
    }
    return this.active;
  }

  getHealthSnapshot() {
    return {
      active: this.active,
      created: this.created,
      tileX: this.config.tileX,
      tileCount: this.config.heightTiles,
    };
  }

  _shouldBeActive() {
    const state = this.retention?.getTutorialState?.();
    return state?.choice === TOWN_TUTORIAL_CHOICES.YES
      && BARRIER_STAGES.has(state.stage);
  }

  _barrierTiles() {
    const surfaceRow = this.scene?.config?.topAirRows;
    if (!Number.isInteger(surfaceRow)) return [];
    const topTy = surfaceRow + this.config.topSurfaceRowOffset;
    return Array.from({ length: this.config.heightTiles }, (_, offset) => ({
      tx: this.config.tileX,
      ty: topTy + offset,
    }));
  }

  _isInstalled() {
    const world = this.scene?.worldModel;
    const tiles = this._barrierTiles();
    return Boolean(
      world
      && tiles.length === this.config.heightTiles
      && tiles.every(tile => (
        world.inBounds?.(tile.tx, tile.ty) !== false
        && world.getTileType?.(tile.tx, tile.ty) === TILE_TYPES.BEDROCK
      )),
    );
  }

  _install() {
    const world = this.scene?.worldModel;
    if (!world) return false;

    for (const tile of this._barrierTiles()) {
      if (world.inBounds?.(tile.tx, tile.ty) === false) continue;
      const key = `${tile.tx},${tile.ty}`;
      if (!this.originalTiles.has(key)) {
        this.originalTiles.set(key, {
          ...tile,
          type: world.getTileType?.(tile.tx, tile.ty),
          hp: world.getTileHp?.(tile.tx, tile.ty) || 0,
          dugTile: cloneMapValue(world.dugTiles?.get?.(key)),
          rubbleTile: cloneMapValue(world.rubbleTiles?.get?.(key)),
          dugTileSource: cloneMapValue(world.dugTileSource?.get?.(key)),
        });
      }
      if (world.getTileType?.(tile.tx, tile.ty) === TILE_TYPES.BEDROCK) continue;
      world.setTile?.(tile.tx, tile.ty, TILE_TYPES.BEDROCK, 0);
      this.scene?.worldRenderer?.applyTileUpdate?.(tile.tx, tile.ty);
    }
    this.active = this.originalTiles.size > 0;
    return this.active;
  }

  _restore() {
    const world = this.scene?.worldModel;
    for (const [key, original] of this.originalTiles) {
      world?.setTile?.(original.tx, original.ty, original.type, original.hp);
      this._restoreMapValue(world?.dugTiles, key, original.dugTile);
      this._restoreMapValue(world?.rubbleTiles, key, original.rubbleTile);
      this._restoreMapValue(
        world?.dugTileSource,
        key,
        original.dugTileSource,
      );
      this.scene?.worldRenderer?.applyTileUpdate?.(original.tx, original.ty);
    }
    this.originalTiles.clear();
    this.active = false;
    return true;
  }

  _restoreMapValue(map, key, value) {
    if (!map?.set || !map?.delete) return;
    if (value === undefined) map.delete(key);
    else map.set(key, value);
  }

  destroy() {
    this._restore();
    this.created = false;
    this.scene = null;
    this.retention = null;
    this.config = null;
  }
}
