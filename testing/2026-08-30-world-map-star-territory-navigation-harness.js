import { WorldMapActivityRegistry } from
  "../systems/map/WorldMapActivityRegistry.js";
import { WorldMapStarTerritorySystem } from
  "../systems/map/WorldMapStarTerritorySystem.js";
import { registerWorldMapCoreActivities } from
  "../systems/map/registerWorldMapCoreActivities.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { ASSET_KEYS } from "../values/assetKeys.js";
import { WORLD_MAP_CONFIG } from "../values/worldMapConfig.js";
import { WorldMapOverlayView } from
  "../ui/overlays/world-map/WorldMapOverlayView.js";
import { WorldMapRenderer } from
  "../ui/overlays/world-map/WorldMapRenderer.js";

const WIDTH = 1280;
const HEIGHT = 720;
const WORLD_WIDTH = 120;
const WORLD_DEPTH = 180;
const SURFACE_ROW = 10;
const CELL_SIZE = WORLD_MAP_CONFIG.discovery.cellSizeTiles;
const STARS = Object.freeze([
  Object.freeze({ tx: 22, ty: 45, identity: 0, rarity: 0, consumed: false }),
  Object.freeze({ tx: 85, ty: 55, identity: 17, rarity: 1, consumed: false, hidden: true }),
  Object.freeze({ tx: 28, ty: 130, identity: 31, rarity: 2, consumed: true }),
  Object.freeze({ tx: 92, ty: 145, identity: 44, rarity: 4, consumed: false }),
]);

class HarnessWorld {
  constructor() {
    this.widthTiles = WORLD_WIDTH;
    this.depthTiles = WORLD_DEPTH;
    this.topAirRows = SURFACE_ROW;
    this.tileSize = 1;
    this.config = { tileSize: 1, topAirRows: SURFACE_ROW };
    this.skyTileOriginalType = new Uint8Array(WORLD_WIDTH * WORLD_DEPTH);
    this.skyTileIdentity = new Uint8Array(WORLD_WIDTH * WORLD_DEPTH);
    this.skyTileRarity = new Uint8Array(WORLD_WIDTH * WORLD_DEPTH);
    this.types = new Uint8Array(WORLD_WIDTH * WORLD_DEPTH).fill(TILE_TYPES.DIRT);
    this.dugTiles = new Map();
    this.dugTileSource = new Map();
    this.caveZones = [];
    for (const star of STARS) this._addStar(star);
    this._addSurveyTunnels();
  }

  index(tx, ty) {
    return ty * this.widthTiles + tx;
  }

  _addStar(star) {
    const index = this.index(star.tx, star.ty);
    this.skyTileOriginalType[index] = TILE_TYPES.DIRT;
    this.skyTileIdentity[index] = star.identity;
    this.skyTileRarity[index] = star.rarity;
    this.types[index] = star.consumed ? TILE_TYPES.AIR : TILE_TYPES.SKY_TILE;
    if (star.consumed) {
      this.dugTileSource.set(`${star.tx},${star.ty}`, {
        tx: star.tx,
        ty: star.ty,
        type: TILE_TYPES.SKY_TILE,
      });
    }
  }

  _addSurveyTunnels() {
    for (let ty = SURFACE_ROW; ty < WORLD_DEPTH; ty += 1) {
      const center = Math.round(58 + Math.sin(ty / 13) * 15);
      this.dugTiles.set(`${center},${ty}`, { tileX: center, tileY: ty });
      if (ty % 14 === 0) {
        for (let tx = Math.max(4, center - 24); tx <= Math.min(115, center + 24); tx += 1) {
          this.dugTiles.set(`${tx},${ty}`, { tileX: tx, tileY: ty });
        }
      }
    }
  }

  getTileType(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.widthTiles || ty >= this.depthTiles) {
      return TILE_TYPES.BEDROCK;
    }
    return this.types[this.index(tx, ty)];
  }

  getSkyTileIdentity(tx, ty) {
    return this.skyTileIdentity[this.index(tx, ty)] || 0;
  }

  getSkyTileRarity(tx, ty) {
    return this.skyTileRarity[this.index(tx, ty)] || 0;
  }

  getDugTileSource(tx, ty) {
    return this.dugTileSource.get(`${tx},${ty}`) || null;
  }

  worldToTile(x, y) {
    return { tx: Math.floor(x), ty: Math.floor(y) };
  }

  tileToWorld(tx, ty) {
    return { x: tx + 0.5, y: ty + 0.5 };
  }

  isSolid(_tx, ty) {
    return ty >= SURFACE_ROW;
  }
}

class HarnessDiscovery {
  constructor(world) {
    this.world = world;
    this.cells = [];
    this.keys = new Set();
    const hidden = STARS.find(star => star.hidden);
    const hiddenCellX = Math.floor(hidden.tx / CELL_SIZE);
    const hiddenCellY = Math.floor(hidden.ty / CELL_SIZE);
    for (let cellY = 0; cellY < Math.ceil(WORLD_DEPTH / CELL_SIZE); cellY += 1) {
      for (let cellX = 0; cellX < Math.ceil(WORLD_WIDTH / CELL_SIZE); cellX += 1) {
        const hiddenStarFog = Math.abs(cellX - hiddenCellX) <= 1
          && Math.abs(cellY - hiddenCellY) <= 1;
        if (hiddenStarFog) continue;
        const cell = { cellX, cellY };
        this.cells.push(cell);
        this.keys.add(`${cellX},${cellY}`);
      }
    }
  }

  getRevision() {
    return this.cells.length;
  }

  getDiscoveredCells() {
    return this.cells;
  }

  isTileDiscovered(tx, ty) {
    return this.keys.has(`${Math.floor(tx / CELL_SIZE)},${Math.floor(ty / CELL_SIZE)}`);
  }

  isWorldPositionDiscovered(worldX, worldY) {
    return this.isTileDiscovered(worldX, worldY);
  }

  getDiscoveryRatio() {
    const columns = Math.ceil(WORLD_WIDTH / CELL_SIZE);
    const rows = Math.ceil(WORLD_DEPTH / CELL_SIZE);
    return this.cells.length / (columns * rows);
  }
}

class WorldMapStarTerritoryHarness extends Phaser.Scene {
  constructor() {
    super("WorldMapStarTerritoryHarness");
    this.playerTile = { tx: 70, ty: 78 };
  }

  preload() {
    this.load.image(ASSET_KEYS.ui.worldMapFrame, `../${WORLD_MAP_CONFIG.assetPath}`);
    this.load.spritesheet(
      ASSET_KEYS.ui.worldMapSymbols,
      `../${WORLD_MAP_CONFIG.symbolAtlas.path}`,
      {
        frameWidth: WORLD_MAP_CONFIG.symbolAtlas.frameWidth,
        frameHeight: WORLD_MAP_CONFIG.symbolAtlas.frameHeight,
        endFrame: WORLD_MAP_CONFIG.symbolAtlas.endFrame,
      },
    );
  }

  create() {
    this.cameras.main.setBackgroundColor(0x02040a);
    this.worldModel = new HarnessWorld();
    this.playerController = { getPlayerTile: () => ({ ...this.playerTile }) };
    this.worldMapDiscoverySystem = new HarnessDiscovery(this.worldModel);
    this.worldMapStarTerritorySystem = new WorldMapStarTerritorySystem(this.worldModel);
    this.worldMapActivityRegistry = new WorldMapActivityRegistry();
    registerWorldMapCoreActivities(this.worldMapActivityRegistry);
    this.renderer = new WorldMapRenderer(
      this,
      this.worldMapDiscoverySystem,
      this.worldMapActivityRegistry,
    );
    this.view = new WorldMapOverlayView(
      this,
      this.worldMapActivityRegistry,
      { close: () => {}, center: () => {}, zoomIn: () => {}, zoomOut: () => {}, render: () => {} },
    );
    this.view.build(true);
    const viewState = {
      zoom: 1.4,
      centerTileX: 60,
      centerTileY: 95,
    };
    const stats = this.renderer.render(this.view.mapGraphics, this.view.viewport, viewState);
    this.view.render(stats, viewState);
    document.body.dataset.starTerritoryHarnessReady = "true";
    document.body.dataset.currentStarState = stats.currentStarTerritory?.state || "none";
    document.body.dataset.currentStarKnown = String(
      stats.currentStarTerritory?.discovered === true,
    );
    document.body.dataset.knownStarTerritories = String(stats.knownStarTerritoryCount);
    document.body.dataset.consumedStarTerritories = String(stats.knownConsumedStarCount);
    document.body.dataset.markerCount = String(stats.markerCount);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  parent: document.body,
  backgroundColor: "#02040a",
  scene: WorldMapStarTerritoryHarness,
  render: { antialias: true, pixelArt: false },
});
