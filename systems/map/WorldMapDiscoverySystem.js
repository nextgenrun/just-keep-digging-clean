import { WORLD_MAP_CONFIG } from "../../values/worldMapConfig.js";
import { BrowserStorageRepository } from "../save-system/BrowserStorageRepository.js";
import { resolveWorldMapPlayerTile } from "./resolveWorldMapPlayerTile.js";

export class WorldMapDiscoverySystem {
  constructor(scene, saveSlot = 1, storageRepository = null) {
    this.scene = scene;
    this.saveSlot = Number.isInteger(saveSlot) && saveSlot > 0 ? saveSlot : 1;
    this.cells = new Set();
    this.lastPlayerCellKey = "";
    this.persistTimer = null;
    this.storageRepository = storageRepository ?? new BrowserStorageRepository();
    this._load();
  }

  _storageKey() {
    return `${WORLD_MAP_CONFIG.storageKey}-slot-${this.saveSlot}`;
  }

  _cellKey(cellX, cellY) {
    return `${cellX},${cellY}`;
  }

  _load() {
    try {
      const saved = this.storageRepository.readJson(this._storageKey());
      if (!saved) return;
      if (
        saved?.schemaVersion !== WORLD_MAP_CONFIG.schemaVersion
        || saved?.worldRevision !== WORLD_MAP_CONFIG.worldRevision
        || !Array.isArray(saved.cells)
      ) {
        return;
      }
      const limit = WORLD_MAP_CONFIG.discovery.maxPersistedCells;
      saved.cells.slice(0, limit).forEach(key => this.cells.add(String(key)));
    } catch (_) {
      this.cells.clear();
    }
  }

  _queuePersist() {
    if (this.persistTimer != null) return;
    this.persistTimer = globalThis.setTimeout(() => {
      this.persistTimer = null;
      this.flush();
    }, WORLD_MAP_CONFIG.discovery.persistDelayMs);
  }

  flush() {
    try {
      const cells = Array.from(this.cells).slice(0, WORLD_MAP_CONFIG.discovery.maxPersistedCells);
      return this.storageRepository.writeJson(this._storageKey(), {
        schemaVersion: WORLD_MAP_CONFIG.schemaVersion,
        worldRevision: WORLD_MAP_CONFIG.worldRevision,
        cells,
      });
    } catch (_) {
      return false;
    }
  }

  updatePlayerDiscovery(force = false) {
    const model = this.scene?.worldModel;
    const playerTile = resolveWorldMapPlayerTile(this.scene);
    if (!playerTile || !model) return false;

    const { tx, ty } = playerTile;
    const size = WORLD_MAP_CONFIG.discovery.cellSizeTiles;
    const cellX = Math.floor(tx / size);
    const cellY = Math.floor(ty / size);
    const key = this._cellKey(cellX, cellY);
    if (!force && key === this.lastPlayerCellKey) return false;
    this.lastPlayerCellKey = key;
    return this.revealAroundTile(tx, ty);
  }

  revealAroundTile(tileX, tileY) {
    const model = this.scene?.worldModel;
    if (!model) return false;

    const size = WORLD_MAP_CONFIG.discovery.cellSizeTiles;
    const radiusTiles = WORLD_MAP_CONFIG.discovery.revealRadiusTiles;
    const radiusCells = Math.ceil(radiusTiles / size);
    const centerX = Math.floor(tileX / size);
    const centerY = Math.floor(tileY / size);
    let changed = false;

    for (let offsetY = -radiusCells; offsetY <= radiusCells; offsetY += 1) {
      for (let offsetX = -radiusCells; offsetX <= radiusCells; offsetX += 1) {
        const centerDistanceTiles = Math.hypot(offsetX * size, offsetY * size);
        if (centerDistanceTiles > radiusTiles + size) continue;

        const cellX = centerX + offsetX;
        const cellY = centerY + offsetY;
        const sampleTileX = cellX * size;
        const sampleTileY = cellY * size;
        if (
          sampleTileX >= model.widthTiles
          || sampleTileY >= model.depthTiles
          || sampleTileX + size <= 0
          || sampleTileY + size <= 0
        ) {
          continue;
        }

        const key = this._cellKey(cellX, cellY);
        if (!this.cells.has(key)) {
          this.cells.add(key);
          changed = true;
        }
      }
    }

    if (changed) this._queuePersist();
    return changed;
  }

  isTileDiscovered(tileX, tileY) {
    const size = WORLD_MAP_CONFIG.discovery.cellSizeTiles;
    return this.cells.has(this._cellKey(Math.floor(tileX / size), Math.floor(tileY / size)));
  }

  isWorldPositionDiscovered(worldX, worldY) {
    const model = this.scene?.worldModel;
    if (!model) return false;
    const { tx, ty } = model.worldToTile(worldX, worldY);
    return this.isTileDiscovered(tx, ty);
  }

  getDiscoveredCells() {
    return Array.from(this.cells, key => {
      const [cellX, cellY] = key.split(",").map(Number);
      return { cellX, cellY };
    });
  }

  getDiscoveryRatio() {
    const model = this.scene?.worldModel;
    if (!model) return 0;
    const size = WORLD_MAP_CONFIG.discovery.cellSizeTiles;
    const columns = Math.ceil(model.widthTiles / size);
    const rows = Math.ceil(model.depthTiles / size);
    const total = Math.max(1, columns * rows);
    let valid = 0;
    for (const { cellX, cellY } of this.getDiscoveredCells()) {
      if (cellX >= 0 && cellX < columns && cellY >= 0 && cellY < rows) valid += 1;
    }
    return Math.max(0, Math.min(1, valid / total));
  }

  destroy() {
    if (this.persistTimer != null) {
      globalThis.clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    this.flush();
    this.cells.clear();
  }
}
