/**
 * WorldModel — Coordinates the tile grid, state, generation, and queries.
 */
import { TILE_TYPES } from "../../values/tileTypes.js";
import { GAME_CONFIG } from "../../values/gameConfig.js";
import { WORLD_GEN_CONFIG } from "../../values/worldGen.js";
import { getTileHealth } from "../../values/tileHealth.js";
import { getResourceHpMultiplier } from "../../values/dynamicSoil.js";
import { TILED_WORLD_OVERRIDE } from "../../values/tiledWorldOverrideData.js";
import { RESOURCE_TILE_TYPE_VALUES } from "../../values/resourceTypes.js";
import { getRubbleRenderIndex, getTileRenderIndex } from "../rendering/tileRenderMap.js";
import { applySecondWorldArea as applySecondWorldAreaToModel } from "../secondWorld/SecondWorldGenerator.js";
import { SeededRandom } from "./SeededRandom.js";

const RESOURCE_TILE_TYPES = new Set(RESOURCE_TILE_TYPE_VALUES);
const DIGGABLE_TYPES = new Set([
  ...RESOURCE_TILE_TYPE_VALUES,
  TILE_TYPES.SKY_TILE,
  TILE_TYPES.GEM_POWER_BLOCK,
  TILE_TYPES.SPEED_BLOCK,
  TILE_TYPES.XP_BLOCK,
  TILE_TYPES.CRIT_BLOCK,
  TILE_TYPES.BERSERK_BLOCK,
  TILE_TYPES.COMBO_BLOCK,
  TILE_TYPES.LEGEND_BLOCK,
  TILE_TYPES.GEODE_INTERIOR,
]);
const RUBBLE_HP_RATIO = 0.25;

function isInsideEllipse(tx, ty, cx, cy, rx, ry) {
  const nx = (tx - cx) / Math.max(1, rx);
  const ny = (ty - cy) / Math.max(1, ry);
  return nx * nx + ny * ny <= 1;
}

function makeTileKey(tx, ty) {
  return `${tx},${ty}`;
}

/**
 * WorldModel manages the tile grid (type + HP arrays), generated zones,
 * dug tile tracking, save restoration, and renderer accessors.
 */
export class WorldModel {
  constructor(config = GAME_CONFIG) {
    this.config = config;
    this.widthTiles = config.worldWidthTiles;
    this.depthTiles = config.worldDepthTiles;
    this.width = this.widthTiles;
    this.depth = this.depthTiles;
    this.topAirRows = config.topAirRows;
    this.tileSize = config.tileSize;
    this.maxTileHp = config.maxTileHp;

    const tileCount = this.widthTiles * this.depthTiles;
    this._types = new Uint8Array(tileCount);
    this._hp = new Float32Array(tileCount);
    this.tileType = this._types;
    this.tileHp = this._hp;
    this.skyTileOriginalType = new Uint8Array(tileCount);
    this.skyTileRarity = new Uint8Array(tileCount);
    this.rootOverlay = new Uint8Array(tileCount);

    this.dugTiles = new Map();
    this.dugTileSource = new Map();
    this.rubbleTiles = new Map();
    this.caveZones = [];
    this.hiddenCaveZones = [];
    this.treasureRoomZones = [];
    this.geodeZones = [];
    this.glowCrystalZones = [];
    this.rng = new SeededRandom(config.seed || 133742);

    this.generate();
  }

  index(tileX, tileY) { return tileY * this.widthTiles + tileX; }
  _index(tileX, tileY) { return this.index(tileX, tileY); }

  inBounds(tileX, tileY) {
    return tileX >= 0 && tileX < this.widthTiles && tileY >= 0 && tileY < this.depthTiles;
  }

  getType(tileX, tileY) {
    if (!this.inBounds(tileX, tileY)) return TILE_TYPES.BEDROCK;
    return this._types[this.index(tileX, tileY)];
  }

  getTileType(tileX, tileY) { return this.getType(tileX, tileY); }

  setType(tileX, tileY, type) {
    if (!this.inBounds(tileX, tileY)) return;
    this._types[this.index(tileX, tileY)] = type;
  }

  getHp(tileX, tileY) {
    if (!this.inBounds(tileX, tileY)) return 0;
    return this._hp[this.index(tileX, tileY)];
  }

  getTileHp(tileX, tileY) { return this.getHp(tileX, tileY); }

  setHp(tileX, tileY, hp) {
    if (!this.inBounds(tileX, tileY)) return;
    this._hp[this.index(tileX, tileY)] = hp;
  }

  setTile(tileX, tileY, type, hp = 0) {
    if (!this.inBounds(tileX, tileY)) return;
    const idx = this.index(tileX, tileY);
    const key = makeTileKey(tileX, tileY);
    this._types[idx] = type;
    this._hp[idx] = hp;
    this.rubbleTiles.delete(key);
    if (type !== TILE_TYPES.AIR) this.dugTiles.delete(key);
  }

  isSolid(tileX, tileY) { return this.getType(tileX, tileY) !== TILE_TYPES.AIR; }
  isDiggable(tileX, tileY) { return DIGGABLE_TYPES.has(this.getType(tileX, tileY)); }

  getTile(tileX, tileY) {
    const type = this.getType(tileX, tileY);
    const hp = this.getHp(tileX, tileY);
    return { type, hp, solid: type !== TILE_TYPES.AIR, diggable: DIGGABLE_TYPES.has(type) };
  }

  get widthPx() { return this.widthTiles * this.tileSize; }
  get depthPx() { return this.depthTiles * this.tileSize; }

  worldToTile(x, y) {
    return { tx: Math.floor(x / this.tileSize), ty: Math.floor(y / this.tileSize) };
  }

  tileToWorld(tx, ty) {
    return { x: tx * this.tileSize + this.tileSize * 0.5, y: ty * this.tileSize + this.tileSize * 0.5 };
  }

  getWorldIdentity() {
    return {
      seed: this.config.seed,
      width: this.widthTiles,
      depth: this.depthTiles,
      topAirRows: this.topAirRows,
    };
  }

  getDugTileKeys() { return Array.from(this.dugTiles.keys()); }
  getRubbleTiles() { return Array.from(this.rubbleTiles.values()).map((entry) => ({ ...entry })); }
  getDugTileSource(tileX, tileY) {
    return this.dugTileSource.get(makeTileKey(tileX, tileY)) || null;
  }

  reset() {
    this.generate();
  }

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
    this.rng = new SeededRandom(this.config.seed || 133742);

    this.generateBaseTerrain();
    this.generateCaves();
    this.generateSkyTiles();
    this.generateRootOverlays();
    this.prepareSpawnZone();
    this.applyTiledWorldOverride();
    this.applySecondWorldArea();
    this.buildLeftBedrockStaircase();
  }

  generateBaseTerrain() {
    for (let ty = this.topAirRows + 1; ty < this.depthTiles; ty += 1) {
      const depth = ty - this.topAirRows;
      for (let tx = 0; tx < this.widthTiles; tx += 1) {
        let type = TILE_TYPES.DIRT;
        const roll = this.rng.next();

        if (depth < 30) {
          type = roll < 0.1 ? TILE_TYPES.STONE : TILE_TYPES.DIRT;
        } else if (depth < 60) {
          if (roll < 0.05) type = TILE_TYPES.COPPER;
          else if (roll < 0.15) type = TILE_TYPES.STONE;
        } else if (depth < 120) {
          if (roll < 0.03) type = TILE_TYPES.IRON;
          else if (roll < 0.04) type = TILE_TYPES.DARK_DIRT_NORMAL;
          else if (roll < 0.08) type = TILE_TYPES.COPPER;
          else if (roll < 0.2) type = TILE_TYPES.STONE;
        } else if (depth < 300) {
          if (roll < 0.02) type = TILE_TYPES.GOLD;
          else if (roll < 0.03) type = TILE_TYPES.SILVER;
          else if (roll < 0.04) type = TILE_TYPES.DARK_DIRT_STRONG;
          else if (roll < 0.08) type = TILE_TYPES.DARK_DIRT_NORMAL;
          else if (roll < 0.15) type = TILE_TYPES.STEEL;
          else if (roll < 0.3) type = TILE_TYPES.IRON;
          else if (roll < 0.5) type = TILE_TYPES.COPPER;
          else if (roll < 0.65) type = TILE_TYPES.STONE;
        } else {
          if (roll < 0.005) type = TILE_TYPES.GOLD;
          else if (roll < 0.015) type = TILE_TYPES.SILVER;
          else if (roll < 0.03) type = TILE_TYPES.DARK_DIRT_STRONG;
          else if (roll < 0.08) type = TILE_TYPES.DARK_DIRT_NORMAL;
          else if (roll < 0.12) type = TILE_TYPES.BRONZE;
          else if (roll < 0.22) type = TILE_TYPES.STEEL;
          else if (roll < 0.35) type = TILE_TYPES.IRON;
          else if (roll < 0.55) type = TILE_TYPES.COPPER;
          else if (roll < 0.7) type = TILE_TYPES.STONE;
        }

        this.setTile(tx, ty, type, this.getTileMaxHp(tx, ty, type));
      }
    }

    for (let tx = 0; tx < this.widthTiles; tx += 1) {
      this.setTile(tx, this.depthTiles - 1, TILE_TYPES.BEDROCK, 0);
    }
  }

  generateCaves() {
    const cfg = WORLD_GEN_CONFIG.caves || {};
    const total = this.rng.nextInt(cfg.totalCavesMin || 70, cfg.totalCavesMax || 120);
    const minY = this.topAirRows + (cfg.surfaceSkipDepth || 30);
    const maxY = Math.max(minY + 1, this.depthTiles - 20);

    for (let i = 0; i < total; i += 1) {
      const rx = this.rng.nextInt(cfg.radiusXMin || 2, cfg.radiusXMax || 18);
      const ry = this.rng.nextInt(cfg.radiusYMin || 1, cfg.radiusYMax || 2);
      const cx = this.rng.nextInt(Math.max(2, rx), Math.max(3, this.widthTiles - rx - 2));
      const cy = this.rng.nextInt(minY, maxY);
      const wallThickness = cfg.wallThickness || 1;
      const zone = { cx, cy, rx, ry, wallThickness };
      this.caveZones.push(zone);
      this.applyCaveZone(zone);
    }
  }

  applyCaveZone(zone) {
    const wallRx = zone.rx + zone.wallThickness;
    const wallRy = zone.ry + zone.wallThickness;
    for (let ty = zone.cy - Math.ceil(wallRy); ty <= zone.cy + Math.ceil(wallRy); ty += 1) {
      for (let tx = zone.cx - Math.ceil(wallRx); tx <= zone.cx + Math.ceil(wallRx); tx += 1) {
        if (!this.inBounds(tx, ty) || ty <= this.topAirRows) continue;
        if (isInsideEllipse(tx, ty, zone.cx, zone.cy, wallRx, wallRy) &&
            !isInsideEllipse(tx, ty, zone.cx, zone.cy, zone.rx, zone.ry)) {
          this.setTile(tx, ty, TILE_TYPES.CAVE_WALL, 0);
        }
        if (isInsideEllipse(tx, ty, zone.cx, zone.cy, zone.rx, zone.ry)) {
          this.setTile(tx, ty, TILE_TYPES.AIR, 0);
        }
      }
    }
  }

  generateSkyTiles() {
    const probability = this.config.skyTileProbability || 0;
    if (probability <= 0) return;
    const rarities = this.config.skyTileRarities || [];

    for (let ty = this.topAirRows + 1; ty < this.depthTiles - 1; ty += 1) {
      for (let tx = 0; tx < this.widthTiles; tx += 1) {
        const idx = this.index(tx, ty);
        const type = this._types[idx];
        if (!RESOURCE_TILE_TYPES.has(type) || this.rng.next() >= probability) continue;

        const depthTiles = ty - this.topAirRows;
        let rarityTier = 0;
        for (let r = rarities.length - 1; r >= 0; r -= 1) {
          if (depthTiles >= (rarities[r].minDepthTiles || 0)) {
            rarityTier = r;
            break;
          }
        }

        this.skyTileOriginalType[idx] = type;
        this.skyTileRarity[idx] = rarityTier;
        this._types[idx] = TILE_TYPES.SKY_TILE;
        this._hp[idx] = this.getTileMaxHp(tx, ty, TILE_TYPES.SKY_TILE);
      }
    }
  }

  generateRootOverlays() {
    const cfg = WORLD_GEN_CONFIG.roots;
    if (!cfg) return;
    for (let ty = this.topAirRows + 1; ty < this.depthTiles - 1; ty += 1) {
      for (let tx = 0; tx < this.widthTiles; tx += 1) {
        const idx = this.index(tx, ty);
        if (!RESOURCE_TILE_TYPES.has(this._types[idx])) continue;
        const depthTiles = ty - this.topAirRows;
        for (const layer of [cfg.shallow, cfg.deep]) {
          if (depthTiles >= layer.minDepth && depthTiles < layer.maxDepth && this.rng.next() < layer.spawnChance) {
            this.rootOverlay[idx] = layer.overlayType === "deep"
              ? TILE_TYPES.ROOT_OVERLAY_DEEP
              : TILE_TYPES.ROOT_OVERLAY;
          }
        }
      }
    }
  }

  prepareSpawnZone() {
    for (let ty = 0; ty < this.topAirRows; ty += 1) {
      for (let tx = 0; tx < this.widthTiles; tx += 1) {
        this.setTile(tx, ty, TILE_TYPES.AIR, 0);
      }
    }

    for (let tx = 0; tx < this.widthTiles; tx += 1) {
      this.setTile(tx, this.topAirRows, TILE_TYPES.FLOOR_TOWN_1, 0);
    }

    const islandX = this.config.skyIslandTileX || 23;
    const islandY = this.config.skyIslandTileY || 35;
    const islandW = this.config.skyIslandWidthTiles || 20;
    for (let tx = islandX; tx < islandX + islandW; tx += 1) {
      this.setTile(tx, islandY, TILE_TYPES.BEDROCK, 0);
    }

    const pillarX = this.config.starPillarTileX;
    const pillarY = this.config.starPillarTileY;
    if (Number.isInteger(pillarX) && Number.isInteger(pillarY)) {
      this.setTile(pillarX, pillarY, TILE_TYPES.BEDROCK, 0);
    }

    const shaftX = this.config.spawnTileX || 28;
    for (let ty = this.topAirRows + 1; ty <= this.topAirRows + 6; ty += 1) {
      for (let tx = shaftX - 1; tx <= shaftX + 1; tx += 1) {
        this.setTile(tx, ty, TILE_TYPES.AIR, 0);
      }
    }
  }

  buildLeftBedrockStaircase() {
    for (let depth = 0; depth <= 10; depth += 1) {
      const tx = 68 + depth;
      const ty = this.topAirRows + depth;
      if (!this.inBounds(tx, ty)) break;
      this.setTile(tx, ty, TILE_TYPES.BEDROCK, 0);
    }
  }

  applyTiledWorldOverride(override = TILED_WORLD_OVERRIDE) {
    if (!override?.enabled) return;
    if (override.width !== this.widthTiles || override.height !== this.depthTiles) {
      console.warn(
        `[WorldModel] Skipping Tiled world override: expected ${this.widthTiles}x${this.depthTiles}, ` +
        `got ${override.width}x${override.height}`
      );
      return;
    }

    const runs = Array.isArray(override.runs) ? override.runs : [];
    let applied = 0;
    for (let i = 0; i < runs.length; i += 3) {
      const startIndex = runs[i];
      const runLength = runs[i + 1];
      const tileType = runs[i + 2];
      if (!Number.isInteger(startIndex) || !Number.isInteger(runLength) || !Number.isInteger(tileType)) continue;

      for (let offset = 0; offset < runLength; offset += 1) {
        const idx = startIndex + offset;
        if (idx < 0 || idx >= this._types.length) continue;
        const tx = idx % this.widthTiles;
        const ty = Math.floor(idx / this.widthTiles);
        const previousType = this._types[idx];

        if (tileType === TILE_TYPES.SKY_TILE) {
          this.skyTileOriginalType[idx] = RESOURCE_TILE_TYPES.has(previousType) ? previousType : TILE_TYPES.DIRT;
        } else {
          this.skyTileOriginalType[idx] = 0;
          this.skyTileRarity[idx] = 0;
        }

        this.setTile(tx, ty, tileType, tileType === TILE_TYPES.AIR ? 0 : this.getTileMaxHp(tx, ty, tileType));
        if (tileType === TILE_TYPES.AIR || tileType === TILE_TYPES.BEDROCK) this.rootOverlay[idx] = 0;
        applied += 1;
      }
    }

    this.applyTiledRootOverlays(override.rootOverlays);
    console.log(`[WorldModel] Applied Tiled world override: ${applied} tiles from ${override.source}`);
  }

  applyTiledRootOverlays(rootOverlayData) {
    const runs = Array.isArray(rootOverlayData?.runs) ? rootOverlayData.runs : [];
    for (let i = 0; i < runs.length; i += 3) {
      const startIndex = runs[i];
      const runLength = runs[i + 1];
      const overlayType = runs[i + 2];
      if (!Number.isInteger(startIndex) || !Number.isInteger(runLength) || !Number.isInteger(overlayType)) continue;
      for (let offset = 0; offset < runLength; offset += 1) {
        const idx = startIndex + offset;
        if (idx >= 0 && idx < this.rootOverlay.length) this.rootOverlay[idx] = overlayType;
      }
    }
  }

  applySecondWorldArea(secondWorldArea = TILED_WORLD_OVERRIDE.secondWorldArea) {
    const result = applySecondWorldAreaToModel(this, secondWorldArea);
    if (result.applied) {
      console.log(
        `[WorldModel] Applied second world area: ${result.cells} marker cells, ` +
        `${result.nodeTiles} node tiles, ${result.caveTiles} cave tiles`
      );
    }
    return result;
  }

  getTileMaxHp(tileX, tileY, type = this.getType(tileX, tileY)) {
    if (!this.inBounds(tileX, tileY)) return 0;
    const renderType = type === TILE_TYPES.SKY_TILE ? this.getSkyTileOriginalType(tileX, tileY) : type;
    const depthTiles = tileY - this.topAirRows;
    const hpMult = getResourceHpMultiplier(renderType, tileX, tileY, depthTiles, this.config.seed);
    return getTileHealth(renderType, depthTiles, hpMult);
  }

  getRenderIndex(tileX, tileY) {
    const type = this.getType(tileX, tileY);
    const hp = this.getHp(tileX, tileY);
    const depthTiles = tileY - this.topAirRows;
    const visualHint = this.getVisualHint(tileX, tileY, type);
    const rubble = this.rubbleTiles.get(makeTileKey(tileX, tileY));
    if (rubble) {
      const rubbleIndex = getRubbleRenderIndex(rubble.type, hp, rubble.maxHp);
      if (rubbleIndex !== null) return rubbleIndex;
    }

    if (type === TILE_TYPES.SKY_TILE) {
      const originalType = this.getSkyTileOriginalType(tileX, tileY);
      return getTileRenderIndex(originalType, hp, this.getTileMaxHp(tileX, tileY, type), tileX, tileY, depthTiles, this.config.seed, visualHint);
    }
    return getTileRenderIndex(type, hp, this.getTileMaxHp(tileX, tileY, type), tileX, tileY, depthTiles, this.config.seed, visualHint);
  }

  getVisualHint(tileX, tileY, type) {
    if (type === TILE_TYPES.BEDROCK) {
      const ix = this.config.skyIslandTileX || 23;
      const iy = this.config.skyIslandTileY || 35;
      const iw = this.config.skyIslandWidthTiles || 20;
      return tileY === iy && tileX >= ix && tileX < ix + iw ? "skyIslandTop" : "";
    }
    if (type === TILE_TYPES.CAVE_WALL) {
      const below = this.getType(tileX, tileY + 1);
      if (below === TILE_TYPES.AIR || below === TILE_TYPES.CHEST || below === TILE_TYPES.GLOW_CRYSTAL) return "caveCeiling";
      const left = this.getType(tileX - 1, tileY);
      const right = this.getType(tileX + 1, tileY);
      const above = this.getType(tileX, tileY - 1);
      if ([left, right, above].some((neighbor) => neighbor === TILE_TYPES.AIR || neighbor === TILE_TYPES.CHEST || neighbor === TILE_TYPES.GLOW_CRYSTAL)) {
        return "caveEdge";
      }
    }
    return "";
  }

  getRootOverlayType(tileX, tileY) {
    if (!this.inBounds(tileX, tileY)) return 0;
    return this.rootOverlay[this.index(tileX, tileY)];
  }

  getSkyTileOriginalType(tileX, tileY) {
    if (!this.inBounds(tileX, tileY)) return TILE_TYPES.DIRT;
    return this.skyTileOriginalType[this.index(tileX, tileY)] || TILE_TYPES.DIRT;
  }

  getSkyTileRarity(tileX, tileY) {
    if (!this.inBounds(tileX, tileY)) return 0;
    return this.skyTileRarity[this.index(tileX, tileY)];
  }

  _getRestorableRubbleType(tileX, tileY, type) {
    if (type === TILE_TYPES.SKY_TILE) {
      const originalType = this.getSkyTileOriginalType(tileX, tileY);
      return RESOURCE_TILE_TYPES.has(originalType) ? originalType : null;
    }
    return RESOURCE_TILE_TYPES.has(type) ? type : null;
  }

  setRubbleTile(tileX, tileY, type, hp = null, maxHp = null) {
    if (!this.inBounds(tileX, tileY)) return null;
    const rubbleType = this._getRestorableRubbleType(tileX, tileY, type);
    if (!rubbleType) return null;
    const sourceMaxHp = Math.max(1, Math.floor(Number.isFinite(maxHp) && maxHp > 0 ? maxHp : this.getTileMaxHp(tileX, tileY, rubbleType)));
    const rubbleHp = Math.max(1, Math.min(sourceMaxHp, Math.floor(Number.isFinite(hp) && hp > 0 ? hp : sourceMaxHp * RUBBLE_HP_RATIO)));
    const key = makeTileKey(tileX, tileY);
    this.setTile(tileX, tileY, rubbleType, rubbleHp);
    this.dugTiles.delete(key);
    this.dugTileSource.set(key, { tx: tileX, ty: tileY, type: rubbleType, maxHp: sourceMaxHp });
    this.rubbleTiles.set(key, { tx: tileX, ty: tileY, type: rubbleType, hp: rubbleHp, maxHp: sourceMaxHp });
    return { tx: tileX, ty: tileY, type: rubbleType, hp: rubbleHp, maxHp: sourceMaxHp };
  }

  applyRubbleTiles(rubbleTiles = []) {
    if (!Array.isArray(rubbleTiles)) return [];
    const applied = [];
    for (const rubble of rubbleTiles) {
      const tx = Number.isInteger(rubble?.tx) ? rubble.tx : null;
      const ty = Number.isInteger(rubble?.ty) ? rubble.ty : null;
      const type = Number.isInteger(rubble?.type) ? rubble.type : null;
      if (tx === null || ty === null || type === null) continue;
      const result = this.setRubbleTile(tx, ty, type, rubble.hp, rubble.maxHp);
      if (result) applied.push({ tx, ty });
    }
    return applied;
  }

  applyDugTileKeys(tileKeys = []) {
    const applied = [];
    for (const key of tileKeys) {
      if (typeof key !== "string") continue;
      const [txText, tyText] = key.split(",");
      const tx = Number.parseInt(txText, 10);
      const ty = Number.parseInt(tyText, 10);
      if (!Number.isInteger(tx) || !Number.isInteger(ty) || !this.inBounds(tx, ty)) continue;
      const type = this.getType(tx, ty);
      if (type === TILE_TYPES.BEDROCK || type === TILE_TYPES.CAVE_WALL || type === TILE_TYPES.GEODE_WALL) continue;
      const keyStr = makeTileKey(tx, ty);
      this.setTile(tx, ty, TILE_TYPES.AIR, 0);
      this.dugTiles.set(keyStr, { tileX: tx, tileY: ty, dugAt: Date.now() });
      this.dugTileSource.set(keyStr, { tx, ty, type, maxHp: this.getTileMaxHp(tx, ty, type) });
      applied.push({ tx, ty });
    }
    return applied;
  }

  damageTile(tileX, tileY, damage) {
    if (!this.inBounds(tileX, tileY)) return { success: false, reason: "out-of-bounds" };
    if (!this.isSolid(tileX, tileY)) return { success: false, reason: "air", hp: 0, typeBeforeDamage: TILE_TYPES.AIR };
    if (!this.isDiggable(tileX, tileY)) {
      return { success: false, reason: "blocked", hp: this.getHp(tileX, tileY), typeBeforeDamage: this.getType(tileX, tileY) };
    }

    const idx = this.index(tileX, tileY);
    const key = makeTileKey(tileX, tileY);
    const wasRubble = this.rubbleTiles.has(key);
    const typeBeforeDamage = this._types[idx];
    const nextHp = Math.max(0, this._hp[idx] - Math.max(1, damage));
    this._hp[idx] = nextHp;

    if (nextHp <= 0) {
      this.dugTileSource.set(key, {
        tx: tileX,
        ty: tileY,
        type: typeBeforeDamage,
        maxHp: this.getTileMaxHp(tileX, tileY, typeBeforeDamage),
      });
      this._types[idx] = TILE_TYPES.AIR;
      this._hp[idx] = 0;
      this.dugTiles.set(key, { tileX, tileY, dugAt: Date.now() });
      this.rubbleTiles.delete(key);
      return { success: true, destroyed: true, hp: 0, typeBeforeDamage, wasRubble };
    }

    if (wasRubble) {
      const rubble = this.rubbleTiles.get(key);
      this.rubbleTiles.set(key, { ...rubble, hp: nextHp });
    }
    return { success: true, destroyed: false, hp: nextHp, typeBeforeDamage, wasRubble };
  }

  getGlowCrystalZonesInRange(playerTile, rangeTiles) {
    return this.glowCrystalZones.filter((zone) => {
      const dx = zone.cx - playerTile.tx;
      const dy = zone.cy - playerTile.ty;
      return Math.abs(dx) <= rangeTiles + zone.rx && Math.abs(dy) <= rangeTiles + zone.ry;
    });
  }

  getGlowCrystalActiveRatio() {
    return 1;
  }
}
