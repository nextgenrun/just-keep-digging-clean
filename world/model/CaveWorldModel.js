/**
 * CaveWorldModel — deterministic compact tile world used by CaveScene.
 */
import { TILE_TYPES } from "../../values/tileTypes.js";
import { RESOURCE_BY_TILE_TYPE } from "../../values/resourceTypes.js";
import { WorldModel } from "./WorldModel.js";

const TILE_TYPE_BY_RESOURCE = Object.freeze(
  Object.fromEntries(Object.entries(RESOURCE_BY_TILE_TYPE).map(([tileType, resourceKey]) => [resourceKey, Number(tileType)]))
);

export function makeCaveTileSaveKey(caveId, tx, ty) {
  return `${caveId}:${tx},${ty}`;
}

function hashIndex(text, length) {
  let value = 2166136261;
  for (const character of String(text)) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  return length > 0 ? (value >>> 0) % length : 0;
}

export class CaveWorldModel extends WorldModel {
  generate() {
    this._types.fill(TILE_TYPES.AIR);
    this._hp.fill(0);
    this.skyTileOriginalType.fill(0);
    this.skyTileRarity.fill(0);
    this.rootOverlay.fill(0);
    this.dugTiles.clear();
    this.dugTileSource.clear();
    this.rubbleTiles.clear();
    this.caveZones = [];
    this.hiddenCaveZones = [];
    this.treasureRoomZones = [];
    this.geodeZones = [];
    this.glowCrystalZones = [];

    const runtime = this.config.caveRuntime;
    if (!runtime) return;
    this._buildBoundary(runtime);
    this._buildFloor(runtime);
    this._placeRewardTiles(runtime);
    this._applyDugTiles(runtime);
  }

  _buildBoundary(runtime) {
    const thickness = Math.max(1, runtime.boundaryThicknessTiles);
    for (let ty = 0; ty < this.depthTiles; ty += 1) {
      for (let tx = 0; tx < this.widthTiles; tx += 1) {
        const boundary = tx < thickness || tx >= this.widthTiles - thickness
          || ty < thickness || ty >= this.depthTiles - thickness;
        if (boundary) this.setTile(tx, ty, TILE_TYPES.CAVE_WALL, 0);
      }
    }
  }

  _buildFloor(runtime) {
    const floorTypes = runtime.floorResourceKeys
      .map(resourceKey => TILE_TYPE_BY_RESOURCE[resourceKey])
      .filter(Number.isInteger);
    const safeFloor = new Set(runtime.safeFloorTileXs || []);
    for (let tx = 1; tx < this.widthTiles - 1; tx += 1) {
      if (safeFloor.has(tx)) {
        this.setTile(tx, runtime.floorRow, TILE_TYPES.CAVE_WALL, 0);
        continue;
      }
      const type = floorTypes[hashIndex(`${runtime.caveId}:floor:${tx}`, floorTypes.length)] || TILE_TYPES.DIRT;
      this.setTile(tx, runtime.floorRow, type, this.getTileMaxHp(tx, runtime.floorRow, type));
    }
  }

  _placeRewardTiles(runtime) {
    const pool = runtime.resourcePool || [];
    for (let index = 0; index < runtime.nodeLayout.length; index += 1) {
      const node = runtime.nodeLayout[index];
      if (!this.inBounds(node.tx, node.ty)) continue;
      const resourceKey = pool[hashIndex(`${runtime.caveId}:reward:${index}`, pool.length)];
      const type = TILE_TYPE_BY_RESOURCE[resourceKey];
      if (!Number.isInteger(type)) continue;
      this.setTile(node.tx, node.ty, type, this.getTileMaxHp(node.tx, node.ty, type));
    }
  }

  _applyDugTiles(runtime) {
    const collected = new Set(runtime.collectedTileKeys || []);
    for (let ty = 1; ty < this.depthTiles - 1; ty += 1) {
      for (let tx = 1; tx < this.widthTiles - 1; tx += 1) {
        if (!collected.has(makeCaveTileSaveKey(runtime.caveId, tx, ty))) continue;
        if (!this.isDiggable(tx, ty)) continue;
        this.setTile(tx, ty, TILE_TYPES.AIR, 0);
      }
    }
  }
}
