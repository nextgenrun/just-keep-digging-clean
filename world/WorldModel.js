import { GAME_CONFIG } from "../values/gameConfig.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { SeededRandom } from "./model/SeededRandom.js";
import { getRubbleRenderIndex, getTileRenderIndex } from "./rendering/tileRenderMap.js";
import { WORLD_GEN_CONFIG } from "../values/worldGen.js";
import { TILE_HEALTH_CONFIG, getTileHealth } from "../values/tileHealth.js";
import { getResourceHpMultiplier } from "../values/dynamicSoil.js";
import { TILED_WORLD_OVERRIDE } from "../values/tiledWorldOverrideData.js";

const DIGGABLE_TYPES = new Set([
  TILE_TYPES.DIRT, TILE_TYPES.STONE, TILE_TYPES.COPPER,
  TILE_TYPES.DARK_DIRT_NORMAL, TILE_TYPES.DARK_DIRT_STRONG,
  TILE_TYPES.STEEL, TILE_TYPES.IRON, TILE_TYPES.BRONZE,
  TILE_TYPES.SILVER, TILE_TYPES.GOLD, TILE_TYPES.SKY_TILE,
  TILE_TYPES.GEM_POWER_BLOCK, TILE_TYPES.SPEED_BLOCK,
  TILE_TYPES.XP_BLOCK, TILE_TYPES.CRIT_BLOCK,
  TILE_TYPES.BERSERK_BLOCK, TILE_TYPES.COMBO_BLOCK,
  TILE_TYPES.LEGEND_BLOCK, TILE_TYPES.GEODE_INTERIOR,
]);

const RESOURCE_TILE_TYPES = new Set([
  TILE_TYPES.DIRT, TILE_TYPES.STONE, TILE_TYPES.COPPER,
  TILE_TYPES.DARK_DIRT_NORMAL, TILE_TYPES.DARK_DIRT_STRONG,
  TILE_TYPES.STEEL, TILE_TYPES.IRON, TILE_TYPES.BRONZE,
  TILE_TYPES.SILVER, TILE_TYPES.GOLD,
]);

const RUBBLE_HP_RATIO = 0.25;

function isInsideEllipse(tx, ty, cx, cy, rx, ry) {
  const nx = (tx - cx) / rx;
  const ny = (ty - cy) / ry;
  return nx * nx + ny * ny <= 1;
}

function makeTileKey(tx, ty) {
  return `${tx},${ty}`;
}

export class WorldModel {
  constructor(config = GAME_CONFIG) {
    this.config = config;
    this.width = config.worldWidthTiles;
    this.depth = config.worldDepthTiles;
    this.tileSize = config.tileSize;
    this.maxTileHp = config.maxTileHp;

    const tileCount = this.width * this.depth;
    this.tileType = new Uint8Array(tileCount);
    this.tileHp = new Float32Array(tileCount);
    this.dugTileKeys = new Set();
    this.dugTileSource = new Map();
    this.rubbleTiles = new Map();

    this.skyTileOriginalType = new Uint8Array(tileCount);
    this.skyTileRarity = new Uint8Array(tileCount);
    this.rootOverlay = new Uint8Array(tileCount);

    this.rng = new SeededRandom(config.seed);
    this.geodeZones = [];
    this.generate();
  }

  index(tx, ty) { return ty * this.width + tx; }

  inBounds(tx, ty) {
    return tx >= 0 && tx < this.width && ty >= 0 && ty < this.depth;
  }

  getTileType(tx, ty) {
    if (!this.inBounds(tx, ty)) return TILE_TYPES.BEDROCK;
    return this.tileType[this.index(tx, ty)];
  }

  getTileHp(tx, ty) {
    if (!this.inBounds(tx, ty)) return 0;
    return this.tileHp[this.index(tx, ty)];
  }

  isSolid(tx, ty) { return this.getTileType(tx, ty) !== TILE_TYPES.AIR; }

  isDiggable(tx, ty) { return DIGGABLE_TYPES.has(this.getTileType(tx, ty)); }

  getTile(tx, ty) {
    const type = this.getTileType(tx, ty);
    const hp = this.getTileHp(tx, ty);
    return { type, hp, solid: type !== TILE_TYPES.AIR, diggable: DIGGABLE_TYPES.has(type) };
  }

  setTile(tx, ty, type, hp = 0) {
    if (!this.inBounds(tx, ty)) return;
    const idx = this.index(tx, ty);
    const key = makeTileKey(tx, ty);
    this.tileType[idx] = type;
    this.tileHp[idx] = hp;
    this.rubbleTiles.delete(key);
    if (type !== TILE_TYPES.AIR) this.dugTileKeys.delete(key);
  }

  getWorldIdentity() {
    return {
      seed: this.config.seed, width: this.width,
      depth: this.depth, topAirRows: this.config.topAirRows,
    };
  }

  getDugTileKeys() { return Array.from(this.dugTileKeys.values()); }
  getRubbleTiles() { return Array.from(this.rubbleTiles.values()).map(e => ({ ...e })); }

  getTileMaxHp(tx, ty, type = this.getTileType(tx, ty)) {
    if (!this.inBounds(tx, ty)) return 0;
    const renderType = type === TILE_TYPES.SKY_TILE
      ? this.getSkyTileOriginalType(tx, ty) : type;
    const depthTiles = ty - this.config.topAirRows;
    const hpMult = getResourceHpMultiplier(renderType, tx, ty, depthTiles, this.config.seed);
    return getTileHealth(renderType, depthTiles, hpMult);
  }

  isRubbleTile(tx, ty) { return this.rubbleTiles.has(makeTileKey(tx, ty)); }

  getDugTileSource(tx, ty) {
    const source = this.dugTileSource.get(makeTileKey(tx, ty));
    return source ? { ...source } : null;
  }

  _getRestorableRubbleType(tx, ty, type) {
    if (type === TILE_TYPES.SKY_TILE) {
      const ot = this.getSkyTileOriginalType(tx, ty);
      return RESOURCE_TILE_TYPES.has(ot) ? ot : null;
    }
    return RESOURCE_TILE_TYPES.has(type) ? type : null;
  }

  _rememberDugTileSource(tx, ty, type, maxHp = null) {
    if (!this.inBounds(tx, ty)) return null;
    const rubbleType = this._getRestorableRubbleType(tx, ty, type);
    if (!rubbleType) return null;
    const sourceMaxHp = (Number.isFinite(maxHp) && maxHp > 0)
      ? maxHp : this.getTileMaxHp(tx, ty, rubbleType);
    const entry = { tx, ty, type: rubbleType, maxHp: Math.max(1, Math.floor(sourceMaxHp)) };
    this.dugTileSource.set(makeTileKey(tx, ty), entry);
    return { ...entry };
  }

  setRubbleTile(tx, ty, type, hp = null, maxHp = null) {
    if (!this.inBounds(tx, ty)) return null;
    const rubbleType = this._getRestorableRubbleType(tx, ty, type);
    if (!rubbleType) return null;
    const sourceMaxHp = Math.max(1, Math.floor(
      (Number.isFinite(maxHp) && maxHp > 0) ? maxHp : this.getTileMaxHp(tx, ty, rubbleType)
    ));
    const rubbleHp = Math.max(1, Math.min(sourceMaxHp, Math.floor(
      (Number.isFinite(hp) && hp > 0) ? hp : sourceMaxHp * RUBBLE_HP_RATIO
    )));
    const key = makeTileKey(tx, ty);
    this.setTile(tx, ty, rubbleType, rubbleHp);
    this.dugTileKeys.delete(key);
    this.dugTileSource.set(key, { tx, ty, type: rubbleType, maxHp: sourceMaxHp });
    this.rubbleTiles.set(key, { tx, ty, type: rubbleType, hp: rubbleHp, maxHp: sourceMaxHp });
    return { tx, ty, type: rubbleType, hp: rubbleHp, maxHp: sourceMaxHp };
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
      const type = this.getTileType(tx, ty);
      if (type === TILE_TYPES.BEDROCK || type === TILE_TYPES.CAVE_WALL) continue;
      this._rememberDugTileSource(tx, ty, type, this.getTileMaxHp(tx, ty, type));
      this.setTile(tx, ty, TILE_TYPES.AIR, 0);
      this.dugTileKeys.add(makeTileKey(tx, ty));
      applied.push({ tx, ty });
    }
    return applied;
  }

  damageTile(tx, ty, amount = 1) {
    if (!this.inBounds(tx, ty)) {
      return { success: false, changed: false, destroyed: false, hp: 0, typeBeforeDamage: null, reason: "out-of-bounds" };
    }
    if (!this.isSolid(tx, ty)) {
      return { success: false, changed: false, destroyed: false, hp: 0, typeBeforeDamage: TILE_TYPES.AIR, reason: "air" };
    }
    if (!this.isDiggable(tx, ty)) {
      return { success: false, changed: false, destroyed: false, hp: this.getTileHp(tx, ty), typeBeforeDamage: this.getTileType(tx, ty), reason: "blocked" };
    }

    const idx = this.index(tx, ty);
    const key = makeTileKey(tx, ty);
    const wasRubble = this.rubbleTiles.has(key);
    const typeBeforeDamage = this.tileType[idx];
    const currentHp = this.tileHp[idx];
    const nextHp = Math.max(0, currentHp - amount);
    this.tileHp[idx] = nextHp;

    if (nextHp === 0) {
      this._rememberDugTileSource(tx, ty, typeBeforeDamage, this.getTileMaxHp(tx, ty, typeBeforeDamage));
      this.tileType[idx] = TILE_TYPES.AIR;
      this.dugTileKeys.add(key);
      this.rubbleTiles.delete(key);
      return { success: true, changed: true, destroyed: true, hp: 0, typeBeforeDamage, wasRubble };
    }

    if (wasRubble) {
      const rubble = this.rubbleTiles.get(key);
      this.rubbleTiles.set(key, { ...rubble, hp: nextHp });
    }

    return { success: true, changed: true, destroyed: false, hp: nextHp, typeBeforeDamage, wasRubble };
  }

  worldToTile(x, y) {
    return { tx: Math.floor(x / this.tileSize), ty: Math.floor(y / this.tileSize) };
  }

  tileToWorld(tx, ty) {
    return { x: tx * this.tileSize + this.tileSize * 0.5, y: ty * this.tileSize + this.tileSize * 0.5 };
  }

  getRenderIndex(tx, ty) {
    const type = this.getTileType(tx, ty);
    const hp = this.getTileHp(tx, ty);
    const depthTiles = ty - this.config.topAirRows;
    const visualHint = this.getVisualHint(tx, ty, type);

    const rubble = this.rubbleTiles.get(makeTileKey(tx, ty));
    if (rubble) {
      const ri = getRubbleRenderIndex(rubble.type, hp, rubble.maxHp);
      if (ri !== null) return ri;
    }

    if (type === TILE_TYPES.SKY_TILE) {
      const origType = this.getSkyTileOriginalType(tx, ty);
      const maxHp = Math.max(getTileHealth(origType, depthTiles), hp);
      return getTileRenderIndex(origType, hp, maxHp, tx, ty, depthTiles, this.config.seed, visualHint);
    }

    const maxHp = Math.max(getTileHealth(type, depthTiles), hp);
    return getTileRenderIndex(type, hp, maxHp, tx, ty, depthTiles, this.config.seed, visualHint);
  }

  getVisualHint(tx, ty, type) {
    if (type === TILE_TYPES.BEDROCK) {
      const ix = this.config.skyIslandTileX;
      const iy = this.config.skyIslandTileY;
      const iw = this.config.skyIslandWidthTiles;
      if (ty === iy && tx >= ix && tx < ix + iw) return "skyIslandTop";
      return "";
    }
    if (type === TILE_TYPES.CAVE_WALL) {
      const below = this.getTileType(tx, ty + 1);
      if (below === TILE_TYPES.AIR || below === TILE_TYPES.CHEST || below === TILE_TYPES.GLOW_CRYSTAL) {
        return "caveCeiling";
      }
    }
    return "";
  }

  getSkyTileOriginalType(tx, ty) {
    if (!this.inBounds(tx, ty)) return TILE_TYPES.BEDROCK;
    return this.skyTileOriginalType[this.index(tx, ty)] || TILE_TYPES.DIRT;
  }

  getSkyTileRarity(tx, ty) {
    if (!this.inBounds(tx, ty)) return 0;
    return this.skyTileRarity[this.index(tx, ty)];
  }

  generate() {
    console.log('[WorldModel] Starting world generation...');
    this.dugTileKeys.clear();
    this.dugTileSource.clear();
    this.rubbleTiles.clear();
    this.skyTileOriginalType.fill(0);
    this.skyTileRarity.fill(0);
    this.rootOverlay.fill(0);
    this.caveZones = [];
    this.hiddenCaveZones = [];
    this.treasureRoomZones = [];
    this.glowCrystalZones = [];
    this.planCaveLayout();
    this.planGeodeLayout();
    this.planTreasureRooms();
    this.planGlowCrystals();
    this.generateBaseTerrain();
    this.generateSkyTiles();
    this.generateRootOverlays();
    this.prepareSpawnZone();
    this.applyTiledWorldOverride();
    this.buildLeftBedrockStaircase();
    console.log('[WorldModel] World generation complete');
  }

  generateBaseTerrain() {
    // TODO: Implement full terrain generation with resource placement
    console.log('[WorldModel] Generating base terrain...');
    for (let ty = this.config.topAirRows; ty < this.depth; ty++) {
      for (let tx = 0; tx < this.width; tx++) {
        if (this.tileType[this.index(tx, ty)] !== TILE_TYPES.AIR) continue;
        const depth = ty - this.config.topAirRows;
        let type = TILE_TYPES.DIRT;

        // Simple depth-based resource placement
        if (depth < 10) {
          type = TILE_TYPES.DIRT;
        } else if (depth < 30) {
          type = this.rng.next() < 0.1 ? TILE_TYPES.STONE : TILE_TYPES.DIRT;
        } else if (depth < 60) {
          const r = this.rng.next();
          if (r < 0.05) type = TILE_TYPES.COPPER;
          else if (r < 0.15) type = TILE_TYPES.STONE;
          else type = TILE_TYPES.DIRT;
        } else if (depth < 120) {
          const r = this.rng.next();
          if (r < 0.03) type = TILE_TYPES.IRON;
          else if (r < 0.04) type = TILE_TYPES.DARK_DIRT_NORMAL;
          else if (r < 0.08) type = TILE_TYPES.COPPER;
          else if (r < 0.2) type = TILE_TYPES.STONE;
          else type = TILE_TYPES.DIRT;
        } else if (depth < 300) {
          const r = this.rng.next();
          if (r < 0.02) type = TILE_TYPES.GOLD;
          else if (r < 0.03) type = TILE_TYPES.SILVER;
          else if (r < 0.04) type = TILE_TYPES.DARK_DIRT_STRONG;
          else if (r < 0.08) type = TILE_TYPES.DARK_DIRT_NORMAL;
          else if (r < 0.15) type = TILE_TYPES.STEEL;
          else if (r < 0.3) type = TILE_TYPES.IRON;
          else if (r < 0.5) type = TILE_TYPES.COPPER;
          else if (r < 0.65) type = TILE_TYPES.STONE;
          else type = TILE_TYPES.DIRT;
        } else {
          const r = this.rng.next();
          if (r < 0.005) type = TILE_TYPES.GOLD;
          else if (r < 0.015) type = TILE_TYPES.SILVER;
          else if (r < 0.03) type = TILE_TYPES.DARK_DIRT_STRONG;
          else if (r < 0.08) type = TILE_TYPES.DARK_DIRT_NORMAL;
          else if (r < 0.12) type = TILE_TYPES.BRONZE;
          else if (r < 0.22) type = TILE_TYPES.STEEL;
          else if (r < 0.35) type = TILE_TYPES.IRON;
          else if (r < 0.55) type = TILE_TYPES.COPPER;
          else if (r < 0.7) type = TILE_TYPES.STONE;
          else type = TILE_TYPES.DIRT;
        }

        this.setTile(tx, ty, type, this.getTileMaxHp(tx, ty, type));
      }
    }

    // Apply cave zones
    for (const z of this.caveZones) {
      this.applyCaveZone(z);
    }
    // Apply hidden cave zones
    for (const z of this.hiddenCaveZones) {
      this.applyHiddenCaveZone(z);
    }
    // Apply geode zones
    for (const z of this.geodeZones) {
      this.applyGeodeZone(z);
    }
    // Apply treasure rooms
    for (const z of this.treasureRoomZones) {
      this.applyTreasureRoom(z);
    }
    // Apply glow crystals
    for (const z of this.glowCrystalZones) {
      this.applyGlowCrystalZone(z);
    }
  }

  applyCaveZone(z) {
    const wallThickness = z.wallThickness || 1;
    const wallRx = z.rx + wallThickness;
    const wallRy = z.ry + wallThickness;

    for (let ty = z.cy - Math.ceil(wallRy); ty <= z.cy + Math.ceil(wallRy); ty++) {
      for (let tx = z.cx - Math.ceil(wallRx); tx <= z.cx + Math.ceil(wallRx); tx++) {
        if (!this.inBounds(tx, ty)) continue;

        // Entrance gap check
        let isEntrance = false;
        if (z.entrancePositions) {
          for (const e of z.entrancePositions) {
            if (tx === e.tx && ty === e.ty) { isEntrance = true; break; }
          }
        }
        if (isEntrance) {
          // Don't modify entrance tiles (they stay as normal terrain)
          continue;
        }

        // Wall shell
        if (isInsideEllipse(tx, ty, z.cx, z.cy, wallRx, wallRy) &&
            !isInsideEllipse(tx, ty, z.cx, z.cy, z.rx, z.ry)) {
          this.setTile(tx, ty, TILE_TYPES.CAVE_WALL, 0);
        }

        // Interior air
        if (isInsideEllipse(tx, ty, z.cx, z.cy, z.rx, z.ry)) {
          this.setTile(tx, ty, TILE_TYPES.AIR, 0);
        }
      }
    }
  }

  applyHiddenCaveZone(z) {
    const wallRx = z.rx + 1;
    const wallRy = z.ry + 1;

    for (let ty = z.cy - Math.ceil(wallRy); ty <= z.cy + Math.ceil(wallRy); ty++) {
      for (let tx = z.cx - Math.ceil(wallRx); tx <= z.cx + Math.ceil(wallRx); tx++) {
        if (!this.inBounds(tx, ty)) continue;

        // Interior air space
        if (isInsideEllipse(tx, ty, z.cx, z.cy, z.rx, z.ry)) {
          this.setTile(tx, ty, TILE_TYPES.AIR, 0);
        }

        // Treasure room inside
        if (z.hasTreasureRoom && z.treasureRoomCx && z.treasureRoomCy) {
          if (tx >= z.treasureRoomCx - 1 && tx <= z.treasureRoomCx + 1 &&
              ty >= z.treasureRoomCy - 1 && ty <= z.treasureRoomCy) {
            if (tx === z.treasureRoomCx && ty === z.treasureRoomCy) {
              this.setTile(tx, ty, TILE_TYPES.CHEST, 0);
            } else {
              this.setTile(tx, ty, TILE_TYPES.AIR, 0);
            }
          }
        }
      }
    }
  }

  applyGeodeZone(z) {
    const wallRx = z.rx + z.wallThickness;
    const wallRy = z.ry + z.wallThickness;

    for (let ty = z.cy - Math.ceil(wallRy); ty <= z.cy + Math.ceil(wallRy); ty++) {
      for (let tx = z.cx - Math.ceil(wallRx); tx <= z.cx + Math.ceil(wallRx); tx++) {
        if (!this.inBounds(tx, ty)) continue;

        // Wall shell
        if (isInsideEllipse(tx, ty, z.cx, z.cy, wallRx, wallRy) &&
            !isInsideEllipse(tx, ty, z.cx, z.cy, z.rx, z.ry)) {
          this.setTile(tx, ty, TILE_TYPES.GEODE_WALL, this.getTileMaxHp(tx, ty, TILE_TYPES.GEODE_WALL));
        }

        // Interior — rare resources
        if (isInsideEllipse(tx, ty, z.cx, z.cy, z.rx, z.ry)) {
          const r = this.rng.next();
          let type = TILE_TYPES.GEODE_INTERIOR;
          if (r < 0.5) type = TILE_TYPES.GEODE_INTERIOR;
          else if (r < 0.7) type = TILE_TYPES.GOLD;
          else if (r < 0.85) type = TILE_TYPES.SILVER;
          else type = TILE_TYPES.GEM_POWER_BLOCK;
          this.setTile(tx, ty, type, this.getTileMaxHp(tx, ty, type));
        }
      }
    }
  }

  applyTreasureRoom(z) {
    const minTx = z.cx - Math.floor(z.w / 2);
    const maxTx = z.cx + Math.floor(z.w / 2);
    const minTy = z.cy - Math.floor(z.h / 2);
    const maxTy = z.cy + Math.floor(z.h / 2);

    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (!this.inBounds(tx, ty)) continue;

        if (tx === z.chestTx && ty === z.chestTy) {
          this.setTile(tx, ty, TILE_TYPES.CHEST, 0);
        } else {
          this.setTile(tx, ty, TILE_TYPES.AIR, 0);
        }
      }
    }
  }

  applyGlowCrystalZone(z) {
    for (let ty = z.cy - Math.ceil(z.ry); ty <= z.cy + Math.ceil(z.ry); ty++) {
      for (let tx = z.cx - Math.ceil(z.rx); tx <= z.cx + Math.ceil(z.rx); tx++) {
        if (!this.inBounds(tx, ty)) continue;
        if (isInsideEllipse(tx, ty, z.cx, z.cy, z.rx, z.ry)) {
          this.setTile(tx, ty, TILE_TYPES.GLOW_CRYSTAL, 0);
        }
      }
    }
  }

  generateSkyTiles() {
    console.log('[WorldModel] Generating sky tiles...');
    const cfg = this.config;
    const rarities = cfg.skyTileRarities;

    for (let ty = this.config.topAirRows; ty < this.depth; ty++) {
      for (let tx = 0; tx < this.width; tx++) {
        if (this.tileType[this.index(tx, ty)] === TILE_TYPES.AIR) continue;
        if (this.rng.next() >= cfg.skyTileProbability) continue;

        const idx = this.index(tx, ty);
        const origType = this.tileType[idx];

        // Determine rarity tier based on depth
        const depthTiles = ty - cfg.topAirRows;
        let rarityTier = 0;
        for (let r = rarities.length - 1; r >= 0; r--) {
          if (depthTiles >= rarities[r].minDepthTiles) {
            rarityTier = r;
            break;
          }
        }

        this.skyTileOriginalType[idx] = origType;
        this.skyTileRarity[idx] = rarityTier;
        this.tileType[idx] = TILE_TYPES.SKY_TILE;
        this.tileHp[idx] = this.getTileMaxHp(tx, ty, TILE_TYPES.SKY_TILE);
      }
    }
  }

  generateRootOverlays() {
    const cfg = WORLD_GEN_CONFIG.roots;
    if (!cfg) return;
    for (let ty = this.config.topAirRows; ty < this.depth; ty++) {
      for (let tx = 0; tx < this.width; tx++) {
        const type = this.tileType[this.index(tx, ty)];
        if (!RESOURCE_TILE_TYPES.has(type)) continue;

        const depthTiles = ty - this.config.topAirRows;
        for (const layer of [cfg.shallow, cfg.deep]) {
          if (depthTiles >= layer.minDepth && depthTiles < layer.maxDepth) {
            if (this.rng.next() < layer.spawnChance) {
              this.rootOverlay[this.index(tx, ty)] = layer.overlayType === 'deep'
                ? TILE_TYPES.ROOT_OVERLAY_DEEP : TILE_TYPES.ROOT_OVERLAY;
            }
          }
        }
      }
    }
  }

  getRootOverlayType(tx, ty) {
    if (!this.inBounds(tx, ty)) return 0;
    return this.rootOverlay[this.index(tx, ty)];
  }

  prepareSpawnZone() {
    const topAirRows = this.config.topAirRows;
    // Clear spawn area
    for (let ty = 0; ty < topAirRows; ty++) {
      for (let tx = 0; tx < this.width; tx++) {
        this.tileType[this.index(tx, ty)] = TILE_TYPES.AIR;
        this.tileHp[this.index(tx, ty)] = 0;
      }
    }

    // Create town floor (row 65 = topAirRows)
    const floorY = topAirRows;
    for (let tx = 0; tx < this.width; tx++) {
      this.setTile(tx, floorY, TILE_TYPES.FLOOR_TOWN_1, 0);
    }

    // Create sky island
    const ix = this.config.skyIslandTileX;
    const iy = this.config.skyIslandTileY;
    const iw = this.config.skyIslandWidthTiles;
    for (let tx = ix; tx < ix + iw; tx++) {
      this.setTile(tx, iy, TILE_TYPES.BEDROCK, 0);
    }

    // Place star pillar
    const px = this.config.starPillarTileX;
    const py = this.config.starPillarTileY;
    this.setTile(px, py, TILE_TYPES.BEDROCK, 0);

    // Clear descent shaft below town floor — remove any blocking bedrock/door
    // from the tiled override so player can access underground from town.
    const shaftX = this.config.spawnTileX || 28;
    const shaftWidth = 3; // clear 3 tiles wide
    const shaftDepth = 6; // clear 6 rows down from floor
    for (let ty = floorY + 1; ty <= floorY + shaftDepth; ty++) {
      for (let tx = shaftX - 1; tx <= shaftX + shaftWidth - 2; tx++) {
        if (tx > 0 && tx < this.width - 1 && ty < this.depth) {
          this.setTile(tx, ty, TILE_TYPES.AIR, 0);
        }
      }
    }
  }

  buildLeftBedrockStaircase() {
    const topAirRows = this.config.topAirRows;
    const maxDepth = 10;
    for (let d = 0; d <= maxDepth; d++) {
      const ty = topAirRows + d;
      const tx = 68 + d;
      if (tx >= this.width - 1 || ty >= this.depth - 1) break;
      this.setTile(tx, ty, TILE_TYPES.BEDROCK, 0);
    }
  }

  applyTiledWorldOverride(override = TILED_WORLD_OVERRIDE) {
    if (!override?.enabled) {
      return;
    }

    if (override.width !== this.width || override.height !== this.depth) {
      console.warn(
        `[WorldModel] Skipping Tiled world override: expected ${this.width}x${this.depth}, ` +
        `got ${override.width}x${override.height}`
      );
      return;
    }

    const runs = Array.isArray(override.runs) ? override.runs : [];
    let applied = 0;
    let explicitAir = 0;
    let bedrock = 0;

    for (let i = 0; i < runs.length; i += 3) {
      const startIndex = runs[i];
      const runLength = runs[i + 1];
      const tileType = runs[i + 2];

      if (!Number.isInteger(startIndex) || !Number.isInteger(runLength) || !Number.isInteger(tileType)) {
        continue;
      }

      for (let offset = 0; offset < runLength; offset += 1) {
        const idx = startIndex + offset;
        if (idx < 0 || idx >= this.tileType.length) {
          continue;
        }

        const tx = idx % this.width;
        const ty = Math.floor(idx / this.width);
        const previousType = this.tileType[idx];
        const key = makeTileKey(tx, ty);

        if (tileType === TILE_TYPES.SKY_TILE) {
          const previousSkyOriginal = this.skyTileOriginalType[idx];
          if (!RESOURCE_TILE_TYPES.has(previousSkyOriginal)) {
            this.skyTileOriginalType[idx] = RESOURCE_TILE_TYPES.has(previousType)
              ? previousType
              : TILE_TYPES.DIRT;
          }
        } else {
          this.skyTileOriginalType[idx] = 0;
          this.skyTileRarity[idx] = 0;
        }

        this.tileType[idx] = tileType;
        this.tileHp[idx] = tileType === TILE_TYPES.AIR
          ? 0
          : this.getTileMaxHp(tx, ty, tileType);

        this.dugTileKeys.delete(key);
        this.dugTileSource.delete(key);
        this.rubbleTiles.delete(key);

        if (tileType === TILE_TYPES.AIR || tileType === TILE_TYPES.BEDROCK) {
          this.rootOverlay[idx] = 0;
        }

        applied += 1;
        if (tileType === TILE_TYPES.AIR) explicitAir += 1;
        if (tileType === TILE_TYPES.BEDROCK) bedrock += 1;
      }
    }

    console.log(
      `[WorldModel] Applied Tiled world override: ${applied} tiles ` +
      `(${explicitAir} explicit AIR, ${bedrock} BEDROCK) from ${override.source}`
    );
  }

  // ============ CAVE/GEODE/CRYSTAL PLANNING ============

  planCaveLayout() {
    const cfg = WORLD_GEN_CONFIG.caves;
    const totalCaves = this.rng.nextInt(cfg.totalCavesMin, cfg.totalCavesMax);
    this.caveZones = [];
    this.hiddenCaveZones = [];

    for (let i = 0; i < totalCaves; i++) {
      const cx = this.rng.nextInt(10, this.width - 10);
      const cy = this.rng.nextInt(this.config.topAirRows + cfg.surfaceSkipDepth, this.depth - 10);
      const rx = this.rng.nextInt(cfg.radiusXMin, cfg.radiusXMax);
      const ry = this.rng.nextInt(cfg.radiusYMin, cfg.radiusYMax);
      const wallThickness = cfg.wallThickness;
      const entranceCount = this.rng.nextInt(cfg.entranceMin, cfg.entranceMax);
      const entrancePositions = [];

      for (let e = 0; e < entranceCount; e++) {
        const angle = this.rng.next() * Math.PI * 2;
        const wrx = rx + wallThickness;
        const wry = ry + wallThickness;
        const etx = Math.round(cx + Math.cos(angle) * wrx);
        const ety = Math.round(cy + Math.sin(angle) * wry);
        if (etx > 0 && etx < this.width - 1 && ety > this.config.topAirRows && ety < this.depth - 1) {
          entrancePositions.push({ tx: etx, ty: ety });
        }
      }

      const isHidden = this.rng.next() < cfg.hiddenCaveChance;

      if (isHidden) {
        this.hiddenCaveZones.push({
          cx, cy,
          rx: this.rng.nextInt(cfg.hiddenRadiusXMin, cfg.hiddenRadiusXMax),
          ry: this.rng.nextInt(cfg.hiddenRadiusYMin, cfg.hiddenRadiusYMax),
          wallThickness: 0,
          hasTreasureRoom: this.rng.next() < cfg.treasureRoomChance,
          treasureRoomCx: 0, treasureRoomCy: 0,
          treasureRoomW: cfg.treasureRoomWidth,
          treasureRoomH: cfg.treasureRoomHeight,
        });
      } else {
        this.caveZones.push({ cx, cy, rx, ry, wallThickness, entrancePositions });
      }
    }

    this._placeHiddenCaveTreasureRooms();
    console.log(`[WorldModel] Planned ${this.caveZones.length} caves + ${this.hiddenCaveZones.length} hidden caves`);
  }

  _placeHiddenCaveTreasureRooms() {
    for (const z of this.hiddenCaveZones) {
      if (!z.hasTreasureRoom) continue;
      z.treasureRoomCx = z.cx;
      z.treasureRoomCy = z.cy;
    }
  }

  planGeodeLayout() {
    const cfg = WORLD_GEN_CONFIG.geodes;
    const totalGeodes = this.rng.nextInt(cfg.totalMin, cfg.totalMax);
    this.geodeZones = [];

    for (let i = 0; i < totalGeodes; i++) {
      const cx = this.rng.nextInt(15, this.width - 15);
      const cy = this.rng.nextInt(this.config.topAirRows + cfg.surfaceSkipDepth, this.depth - 15);
      const rx = this.rng.nextInt(cfg.radiusXMin, cfg.radiusXMax);
      const ry = this.rng.nextInt(cfg.radiusYMin, cfg.radiusYMax);
      const isHeavyPunch = this.rng.next() < cfg.heavyPunchChance;

      this.geodeZones.push({ cx, cy, rx, ry, wallThickness: cfg.wallThickness, isHeavyPunch });
    }
    console.log(`[WorldModel] Planned ${this.geodeZones.length} geode pockets`);
  }

  isInGeodeInterior(tx, ty) {
    for (const z of this.geodeZones) {
      if (isInsideEllipse(tx, ty, z.cx, z.cy, z.rx, z.ry)) return true;
    }
    return false;
  }

  isInGeodeWall(tx, ty) {
    for (const z of this.geodeZones) {
      const wrx = z.rx + z.wallThickness;
      const wry = z.ry + z.wallThickness;
      if (isInsideEllipse(tx, ty, z.cx, z.cy, wrx, wry) &&
          !isInsideEllipse(tx, ty, z.cx, z.cy, z.rx, z.ry)) return z;
    }
    return null;
  }

  planTreasureRooms() {
    const cfg = WORLD_GEN_CONFIG.treasureRooms;
    const totalRooms = this.rng.nextInt(cfg.totalMin, cfg.totalMax);
    this.treasureRoomZones = [];

    for (let i = 0; i < totalRooms; i++) {
      const cx = this.rng.nextInt(10, this.width - 10);
      const cy = this.rng.nextInt(this.config.topAirRows + cfg.surfaceSkipDepth, this.depth - 10);
      this.treasureRoomZones.push({
        cx, cy, w: cfg.roomWidth, h: cfg.roomHeight,
        chestTx: cx, chestTy: cy,
      });
    }
    console.log(`[WorldModel] Planned ${this.treasureRoomZones.length} treasure rooms`);
  }

  planGlowCrystals() {
    const cfg = WORLD_GEN_CONFIG.glowCrystals;
    const totalClusters = this.rng.nextInt(cfg.totalMin, cfg.totalMax);
    const minSpacing = cfg.minSpacingTiles || 0;
    const palette = cfg.palette || [0x66E8FF, 0xB675FF, 0xFF6FD8, 0x70FFD6, 0xFFD36A, 0xA7D8FF];
    const minY = this.config.topAirRows + cfg.surfaceSkipDepth;
    const maxY = this.depth - (cfg.bottomPaddingTiles || 20);
    this.glowCrystalZones = [];

    let attempts = 0;
    while (this.glowCrystalZones.length < totalClusters && attempts < totalClusters * 80) {
      attempts++;
      const rx = this.rng.nextInt(cfg.radiusXMin, cfg.radiusXMax);
      const ry = this.rng.nextInt(cfg.radiusYMin, cfg.radiusYMax);
      const cx = this.rng.nextInt(5 + rx, this.width - 6 - rx);
      const cy = this.rng.nextInt(minY + ry, maxY - ry);

      const tooClose = this.glowCrystalZones.some(z => {
        const dx = z.cx - cx, dy = z.cy - cy;
        return Math.sqrt(dx * dx + dy * dy) < minSpacing;
      });
      if (tooClose) continue;

      const color = palette[this.rng.nextInt(0, palette.length - 1)];
      const alpha = cfg.alphaMin + this.rng.next() * (cfg.alphaMax - cfg.alphaMin);
      const lightRadiusTiles = cfg.lightRadiusMinTiles + this.rng.next() * (cfg.lightRadiusMaxTiles - cfg.lightRadiusMinTiles);

      this.glowCrystalZones.push({
        id: this.glowCrystalZones.length, cx, cy, rx, ry,
        color, alpha,
        seed: this.rng.nextInt(1, 0x7fffffff),
        phase: this.rng.next() * Math.PI * 2,
        lightRadiusTiles,
      });
    }
    console.log(`[WorldModel] Planned ${this.glowCrystalZones.length} glow crystal clusters`);
  }

  getGlowCrystalZonesInRange(centerTile, rangeTiles) {
    if (!centerTile || !Array.isArray(this.glowCrystalZones)) return [];
    const tx = Number.isFinite(centerTile.tx) ? centerTile.tx : 0;
    const ty = Number.isFinite(centerTile.ty) ? centerTile.ty : 0;
    const range = Math.max(0, Number.isFinite(rangeTiles) ? rangeTiles : 0);

    return this.glowCrystalZones.filter(z => {
      const reach = range + Math.max(z.rx || 1, z.ry || 1, z.lightRadiusTiles || 0);
      return Math.abs(z.cx - tx) <= reach && Math.abs(z.cy - ty) <= reach;
    });
  }

  getGlowCrystalActiveRatio(zone) {
    if (!zone) return 0;
    let totalTiles = 0, solidTiles = 0;
    const minTx = Math.max(0, Math.floor(zone.cx - zone.rx));
    const maxTx = Math.min(this.width - 1, Math.ceil(zone.cx + zone.rx));
    const minTy = Math.max(0, Math.floor(zone.cy - zone.ry));
    const maxTy = Math.min(this.depth - 1, Math.ceil(zone.cy + zone.ry));

    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (!isInsideEllipse(tx, ty, zone.cx, zone.cy, zone.rx, zone.ry)) continue;
        totalTiles++;
        if (this.getTileType(tx, ty) !== TILE_TYPES.AIR) solidTiles++;
      }
    }
    return totalTiles > 0 ? solidTiles / totalTiles : 0;
  }

  isInCaveInterior(tx, ty) {
    for (const z of this.caveZones) {
      if (isInsideEllipse(tx, ty, z.cx, z.cy, z.rx, z.ry)) return true;
    }
    return false;
  }

  isInCaveWall(tx, ty) {
    for (const z of this.caveZones) {
      const wrx = z.rx + z.wallThickness;
      const wry = z.ry + z.wallThickness;
      if (isInsideEllipse(tx, ty, z.cx, z.cy, wrx, wry) &&
          !isInsideEllipse(tx, ty, z.cx, z.cy, z.rx, z.ry)) return true;
    }
    return false;
  }

  isInHiddenCaveInterior(tx, ty) {
    for (const z of this.hiddenCaveZones) {
      if (isInsideEllipse(tx, ty, z.cx, z.cy, z.rx, z.ry)) return true;
    }
    return false;
  }

  isTreasureChest(tx, ty) {
    for (const z of this.treasureRoomZones) {
      if (tx === z.chestTx && ty === z.chestTy) return true;
    }
    for (const z of this.hiddenCaveZones) {
      if (z.hasTreasureRoom && tx === z.treasureRoomCx && ty === z.treasureRoomCy) return true;
    }
    return false;
  }

  isGlowCrystal(tx, ty) {
    for (const z of this.glowCrystalZones) {
      if (isInsideEllipse(tx, ty, z.cx, z.cy, z.rx, z.ry)) return true;
    }
    return false;
  }

  getGlowCrystalColor(tx, ty) {
    for (const z of this.glowCrystalZones) {
      if (isInsideEllipse(tx, ty, z.cx, z.cy, z.rx, z.ry)) return z.color;
    }
    return 0x88CCFF;
  }
}