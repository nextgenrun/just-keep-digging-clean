/**
 * WorldModel — Coordinates the tile grid, state, generation, and queries.
 */
import { TILE_TYPES } from "../../values/tileTypes.js";
import { GAME_CONFIG } from "../../values/gameConfig.js";
import { WORLD_GEN_CONFIG } from "../../values/worldGen.js";
import {
  CAVE_SCENE_CONFIG,
  resolveCompactCaveScenesEnabled,
} from "../../values/caveSceneConfig.js";
import { ANCIENT_RELIC_CONFIG } from "../../values/ancientRelics.js";
import { getTileHealth } from "../../values/tileHealth.js";
import { getResourceHpMultiplier } from "../../values/dynamicSoil.js";
import { TILED_WORLD_OVERRIDE } from "../../values/tiledWorldOverrideData.js";
import { WORLD_GAMEPLAY_LAYOUT } from "../../values/worldGameplayLayout.js";
import {
  HEAVENBLOCKS_ACCESS_CONFIG,
  resolveHeavenblocksGameplayEnabled,
} from "../../values/heavenblocksAccessConfig.js";
import {
  HEAVENBLOCK_CELL_MARKERS,
  HEAVENBLOCKS_WORLD_CONFIG,
  getHeavenblockCellDescriptor as resolveHeavenblockCellDescriptor,
} from "../../values/heavenblocksWorldConfig.js";
import { RESOURCE_TILE_TYPE_VALUES } from "../../values/resourceTypes.js";
import { getRubbleRenderIndex, getTileRenderIndex } from "../rendering/tileRenderMap.js";
import { applySecondWorldArea as applySecondWorldAreaToModel } from "../secondWorld/SecondWorldGenerator.js";
import { hash01, isInsideEllipse } from "../../values/deterministicMath.js";
import { applySecondWorldTown as applySecondWorldTownToModel } from "../secondWorld/SecondWorldTown.js";
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
  TILE_TYPES.ANCIENT_RELIC_CACHE,
  TILE_TYPES.HEAVENBLOCK_CORE,
]);
const RUBBLE_HP_RATIO = 0.25;

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
    this.ancientRelicCacheKeys = new Set();
    this.caveZones = [];
    this.hiddenCaveZones = [];
    this.treasureRoomZones = [];
    this.geodeZones = [];
    this.glowCrystalZones = [];
    this.rng = new SeededRandom(config.seed || 133742);

    this.generate();
  }

  index(tileX, tileY) { return tileY * this.widthTiles + tileX; }

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
    const previousType = this._types[idx];
    this._types[idx] = type;
    this._hp[idx] = hp;
    if (previousType === TILE_TYPES.ANCIENT_RELIC_CACHE && type !== previousType) {
      this.ancientRelicCacheKeys.delete(key);
    }
    if (type === TILE_TYPES.ANCIENT_RELIC_CACHE) {
      this.ancientRelicCacheKeys.add(key);
    }
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
      layoutId: WORLD_GAMEPLAY_LAYOUT.id,
      layoutRevision: WORLD_GAMEPLAY_LAYOUT.revision,
    };
  }

  getDugTileKeys() { return Array.from(this.dugTiles.keys()); }
  getRubbleTiles() { return Array.from(this.rubbleTiles.values()).map((entry) => ({ ...entry })); }
  getAncientRelicCachePositions({ includeHeavenblocks = true } = {}) {
    const positions = [];
    for (const key of this.ancientRelicCacheKeys) {
      const [tileXText, tileYText] = key.split(",");
      const tx = Number.parseInt(tileXText, 10);
      const ty = Number.parseInt(tileYText, 10);
      if (this.getType(tx, ty) !== TILE_TYPES.ANCIENT_RELIC_CACHE) continue;
      if (!includeHeavenblocks && this.getHeavenblockRegionAt(tx, ty)) continue;
      positions.push({ tx, ty });
    }
    return positions;
  }

  getNearestAncientRelicCache(
    tileX,
    tileY,
    { includeHeavenblocks = true } = {},
  ) {
    if (!Number.isFinite(tileX) || !Number.isFinite(tileY)) return null;
    let nearest = null;
    let nearestDistanceSquared = Infinity;
    for (const position of this.getAncientRelicCachePositions({ includeHeavenblocks })) {
      const dx = position.tx - tileX;
      const dy = position.ty - tileY;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared >= nearestDistanceSquared) continue;
      nearestDistanceSquared = distanceSquared;
      nearest = {
        ...position,
        distanceTiles: Math.sqrt(distanceSquared),
      };
    }
    return nearest;
  }

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
    this.ancientRelicCacheKeys.clear();
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
    this.applySecondWorldTown();
    this.buildLeftBedrockStaircase();
    // Authored Tiled terrain remains authoritative. Only explicit compact
    // rollback mouths are re-applied after the authored import.
    this.reapplyStandaloneCaveMouths();
    this.generateAncientRelicCaches();
    this.applyTiledSurfaceAuthority();
    this.applyHeavenblocksLayout();
  }

  generateBaseTerrain() {
    const terrain = WORLD_GEN_CONFIG.terrain;
    for (let ty = this.topAirRows + 1; ty < this.depthTiles; ty += 1) {
      const depth = ty - this.topAirRows;
      for (let tx = 0; tx < this.widthTiles; tx += 1) {
        let type = TILE_TYPES.DIRT;
        const roll = this.rng.next();

        if (depth < terrain.band1MaxDepth) {
          type = roll < terrain.band1StoneChance ? TILE_TYPES.STONE : TILE_TYPES.DIRT;
        } else if (depth < terrain.band2MaxDepth) {
          if (roll < terrain.band2CopperChance) type = TILE_TYPES.COPPER;
          else if (roll < terrain.band2StoneChance) type = TILE_TYPES.STONE;
        } else if (depth < terrain.band3MaxDepth) {
          if (roll < terrain.band3IronChance) type = TILE_TYPES.IRON;
          else if (roll < terrain.band3DarkDirtNormalChance) type = TILE_TYPES.DARK_DIRT_NORMAL;
          else if (roll < terrain.band3CopperChance) type = TILE_TYPES.COPPER;
          else if (roll < terrain.band3StoneChance) type = TILE_TYPES.STONE;
        } else if (depth < terrain.band4MaxDepth) {
          if (roll < terrain.band4GoldChance) type = TILE_TYPES.GOLD;
          else if (roll < terrain.band4SilverChance) type = TILE_TYPES.SILVER;
          else if (roll < terrain.band4DarkDirtStrongChance) type = TILE_TYPES.DARK_DIRT_STRONG;
          else if (roll < terrain.band4DarkDirtNormalChance) type = TILE_TYPES.DARK_DIRT_NORMAL;
          else if (roll < terrain.band4SteelChance) type = TILE_TYPES.STEEL;
          else if (roll < terrain.band4IronChance) type = TILE_TYPES.IRON;
          else if (roll < terrain.band4CopperChance) type = TILE_TYPES.COPPER;
          else if (roll < terrain.band4StoneChance) type = TILE_TYPES.STONE;
        } else {
          if (roll < terrain.deepGoldChance) type = TILE_TYPES.GOLD;
          else if (roll < terrain.deepSilverChance) type = TILE_TYPES.SILVER;
          else if (roll < terrain.deepDarkDirtStrongChance) type = TILE_TYPES.DARK_DIRT_STRONG;
          else if (roll < terrain.deepDarkDirtNormalChance) type = TILE_TYPES.DARK_DIRT_NORMAL;
          else if (roll < terrain.deepBronzeChance) type = TILE_TYPES.BRONZE;
          else if (roll < terrain.deepSteelChance) type = TILE_TYPES.STEEL;
          else if (roll < terrain.deepIronChance) type = TILE_TYPES.IRON;
          else if (roll < terrain.deepCopperChance) type = TILE_TYPES.COPPER;
          else if (roll < terrain.deepStoneChance) type = TILE_TYPES.STONE;
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
    const geometry = WORLD_GEN_CONFIG.spawnGeometry;
    const total = this.rng.nextInt(cfg.totalCavesMin || 70, cfg.totalCavesMax || 120);
    const minY = this.topAirRows + (cfg.surfaceSkipDepth || 30);
    const maxY = Math.max(minY + 1, this.depthTiles - geometry.caveBottomPaddingTiles);
    const standaloneScene = resolveCompactCaveScenesEnabled(cfg.standaloneScene?.enabled);

    for (let i = 0; i < total; i += 1) {
      const rx = this.rng.nextInt(cfg.radiusXMin || 2, cfg.radiusXMax || 18);
      const ry = this.rng.nextInt(cfg.radiusYMin || 1, cfg.radiusYMax || 2);
      const cx = this.rng.nextInt(Math.max(2, rx), Math.max(3, this.widthTiles - rx - 2));
      const cy = this.rng.nextInt(minY, maxY);
      const wallThickness = cfg.wallThickness || 1;
      const sceneSelection = CAVE_SCENE_CONFIG.selection;
      const caveNumber = i + 1;
      const isTreasureRoom = caveNumber % sceneSelection.treasureEveryNthCave === 0;
      const normalPresets = sceneSelection.normalPresetKeys;
      const zone = {
        id: `cave-${caveNumber}`,
        cx,
        cy,
        rx,
        ry,
        wallThickness,
        standaloneScene,
        entranceSides: Object.freeze([
          caveNumber % 2 === 0 ? "right" : "left",
          ...(caveNumber % 3 === 0 && rx >= 8
            ? [caveNumber % 2 === 0 ? "left" : "right"]
            : []),
        ]),
        backgroundPresetKey: isTreasureRoom
          ? sceneSelection.treasurePresetKey
          : normalPresets[(caveNumber - 1) % normalPresets.length],
      };
      this.caveZones.push(zone);
      this.applyCaveZone(zone);
    }
  }

  applyCaveZone(zone) {
    if (zone.standaloneScene) {
      this.applyStandaloneCaveMouth(zone);
      return;
    }
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
    this._openIntegratedCaveEntrances(zone, wallRx);
  }

  _openIntegratedCaveEntrances(zone, wallRx) {
    const sides = Array.isArray(zone.entranceSides) && zone.entranceSides.length
      ? zone.entranceSides
      : ["left"];
    for (const side of sides) {
      const direction = side === "right" ? 1 : -1;
      const outerX = Math.max(0, Math.min(this.widthTiles - 1, Math.round(zone.cx + direction * wallRx)));
      const innerX = Math.max(0, Math.min(this.widthTiles - 1, Math.round(zone.cx + direction * zone.rx)));
      const fromX = Math.min(outerX, innerX);
      const toX = Math.max(outerX, innerX);
      for (let tx = fromX; tx <= toX; tx += 1) {
        if (this.inBounds(tx, zone.cy)) this.setTile(tx, zone.cy, TILE_TYPES.AIR, 0);
      }
      if (!zone.entry) {
        zone.entry = { tx: innerX, ty: zone.cy };
        zone.mouthAnchor = { tx: outerX, ty: zone.cy };
        zone.entrySide = side;
      }
    }
  }

  applyStandaloneCaveMouth(zone) {
    const cfg = WORLD_GEN_CONFIG.caves?.standaloneScene || {};
    const mouthWidth = Math.max(1, cfg.mouthWidthTiles || 1);
    const shellThickness = Math.max(1, cfg.shellThicknessTiles || 1);
    const left = zone.cx - Math.floor(mouthWidth / 2);
    const right = left + mouthWidth - 1;
    const top = zone.cy - shellThickness;
    const bottom = zone.cy + Math.max(1, cfg.mouthHeightTiles || 1) * shellThickness;

    for (let tx = left; tx <= right + shellThickness; tx += 1) {
      for (let ty = top; ty <= bottom; ty += 1) {
        if (!this.inBounds(tx, ty) || ty <= this.topAirRows) continue;
        const isOpening = ty === zone.cy && tx >= left && tx <= right;
        this.setTile(tx, ty, isOpening ? TILE_TYPES.AIR : TILE_TYPES.CAVE_WALL, 0);
      }
    }
    zone.entry = { tx: right, ty: zone.cy };
    zone.mouthAnchor = { tx: (left + right) / 2, ty: zone.cy };
  }

  reapplyStandaloneCaveMouths() {
    for (const zone of this.caveZones) {
      if (zone?.standaloneScene) this.applyStandaloneCaveMouth(zone);
    }
  }

  generateAncientRelicCaches() {
    const cfg = ANCIENT_RELIC_CONFIG.worldCaches;
    const minY = Math.max(this.topAirRows + cfg.minDepthTiles, this.topAirRows + 1);
    const maxY = Math.min(this.depthTiles - 2, this.topAirRows + cfg.maxDepthTiles);
    if (minY > maxY) return;

    const positions = [];
    const early = cfg.guaranteedEarly;
    for (const band of early?.depthBands || []) {
      const bandMinY = Math.max(minY, this.topAirRows + band.minDepthTiles);
      const bandMaxY = Math.min(maxY, this.topAirRows + band.maxDepthTiles);
      const minX = Math.max(1, early.minTileX);
      const maxX = Math.min(this.widthTiles - 2, early.maxTileX);
      let placed = false;
      for (
        let attempt = 0;
        attempt < early.placementAttemptsPerBand && !placed;
        attempt += 1
      ) {
        const tx = this.rng.nextInt(minX, maxX);
        const ty = this.rng.nextInt(bandMinY, bandMaxY);
        if (!RESOURCE_TILE_TYPES.has(this.getType(tx, ty))) continue;
        const spaced = positions.every(position => {
          const dx = position.tx - tx;
          const dy = position.ty - ty;
          return dx * dx + dy * dy >= cfg.minimumSpacingTiles * cfg.minimumSpacingTiles;
        });
        if (!spaced) continue;
        this.setTile(
          tx,
          ty,
          TILE_TYPES.ANCIENT_RELIC_CACHE,
          this.getTileMaxHp(tx, ty, TILE_TYPES.ANCIENT_RELIC_CACHE),
        );
        positions.push({ tx, ty });
        placed = true;
      }
      for (let ty = bandMinY; ty <= bandMaxY && !placed; ty += 1) {
        for (let tx = minX; tx <= maxX && !placed; tx += 1) {
          if (!RESOURCE_TILE_TYPES.has(this.getType(tx, ty))) continue;
          const spaced = positions.every((position) => {
            const dx = position.tx - tx;
            const dy = position.ty - ty;
            return dx * dx + dy * dy >= cfg.minimumSpacingTiles * cfg.minimumSpacingTiles;
          });
          if (!spaced) continue;
          this.setTile(
            tx,
            ty,
            TILE_TYPES.ANCIENT_RELIC_CACHE,
            this.getTileMaxHp(tx, ty, TILE_TYPES.ANCIENT_RELIC_CACHE),
          );
          positions.push({ tx, ty });
          placed = true;
        }
      }
      if (!placed) {
        throw new Error(
          `[WorldModel] Failed to place guaranteed Ancient Relic in depth band `
          + `${band.minDepthTiles}-${band.maxDepthTiles}`,
        );
      }
    }
    const maxAttempts = cfg.count * cfg.placementAttemptsPerCache;
    for (let attempt = 0; attempt < maxAttempts && positions.length < cfg.count; attempt += 1) {
      const tx = this.rng.nextInt(1, this.widthTiles - 2);
      const ty = this.rng.nextInt(minY, maxY);
      if (!RESOURCE_TILE_TYPES.has(this.getType(tx, ty))) continue;

      const isTooClose = positions.some((position) => {
        const dx = position.tx - tx;
        const dy = position.ty - ty;
        return dx * dx + dy * dy < cfg.minimumSpacingTiles * cfg.minimumSpacingTiles;
      });
      if (isTooClose) continue;

      this.setTile(tx, ty, TILE_TYPES.ANCIENT_RELIC_CACHE, this.getTileMaxHp(tx, ty, TILE_TYPES.ANCIENT_RELIC_CACHE));
      positions.push({ tx, ty });
    }

    const levelTwoCfg = ANCIENT_RELIC_CONFIG.levelTwoWorldCaches;
    const levelTwoMinY = Math.max(
      this.topAirRows + levelTwoCfg.minDepthTiles,
      this.topAirRows + 1
    );
    const levelTwoMaxY = Math.min(
      this.depthTiles - 2,
      this.topAirRows + levelTwoCfg.maxDepthTiles
    );
    const levelTwoMaxX = this.widthTiles - 2;
    if (levelTwoMinY > levelTwoMaxY || levelTwoCfg.minTileX > levelTwoMaxX) return;

    const levelTwoPositions = [];
    const levelTwoAttempts = levelTwoCfg.count * levelTwoCfg.placementAttemptsPerCache;
    for (
      let attempt = 0;
      attempt < levelTwoAttempts && levelTwoPositions.length < levelTwoCfg.count;
      attempt += 1
    ) {
      const tx = this.rng.nextInt(levelTwoCfg.minTileX, levelTwoMaxX);
      const ty = this.rng.nextInt(levelTwoMinY, levelTwoMaxY);
      if (!RESOURCE_TILE_TYPES.has(this.getType(tx, ty))) continue;
      const isTooClose = levelTwoPositions.some(position => {
        const dx = position.tx - tx;
        const dy = position.ty - ty;
        return dx * dx + dy * dy
          < levelTwoCfg.minimumSpacingTiles * levelTwoCfg.minimumSpacingTiles;
      });
      if (isTooClose) continue;
      this.setTile(
        tx,
        ty,
        TILE_TYPES.ANCIENT_RELIC_CACHE,
        this.getTileMaxHp(tx, ty, TILE_TYPES.ANCIENT_RELIC_CACHE)
      );
      levelTwoPositions.push({ tx, ty });
    }
  }

  ensureAncientRelicMilestoneReachable(
    ownedRelics = 0,
    requiredRelics = HEAVENBLOCKS_ACCESS_CONFIG.requiredRelics,
  ) {
    const safeOwned = Number.isFinite(ownedRelics) ? Math.max(0, Math.floor(ownedRelics)) : 0;
    const safeRequired = Number.isFinite(requiredRelics)
      ? Math.max(0, Math.floor(requiredRelics))
      : 0;
    const early = ANCIENT_RELIC_CONFIG.worldCaches.guaranteedEarly;
    if (!early || safeOwned >= safeRequired) return [];

    const positions = [];
    for (const band of early.depthBands) {
      const minY = Math.max(this.topAirRows + band.minDepthTiles, this.topAirRows + 1);
      const maxY = Math.min(this.depthTiles - 2, this.topAirRows + band.maxDepthTiles);
      const minX = Math.max(1, early.minTileX);
      const maxX = Math.min(this.widthTiles - 2, early.maxTileX);
      for (let ty = minY; ty <= maxY; ty += 1) {
        for (let tx = minX; tx <= maxX; tx += 1) {
          if (this.getType(tx, ty) === TILE_TYPES.ANCIENT_RELIC_CACHE) {
            positions.push({ tx, ty });
          }
        }
      }
    }

    let missing = Math.max(0, safeRequired - safeOwned - positions.length);
    if (missing === 0) return [];
    const placed = [];
    const spacingSq = ANCIENT_RELIC_CONFIG.worldCaches.minimumSpacingTiles ** 2;
    for (let bandIndex = 0; bandIndex < early.depthBands.length && missing > 0; bandIndex += 1) {
      const band = early.depthBands[bandIndex];
      const minY = Math.max(this.topAirRows + band.minDepthTiles, this.topAirRows + 1);
      const maxY = Math.min(this.depthTiles - 2, this.topAirRows + band.maxDepthTiles);
      const minX = Math.max(1, early.minTileX);
      const maxX = Math.min(this.widthTiles - 2, early.maxTileX);
      const width = maxX - minX + 1;
      const height = maxY - minY + 1;
      const total = Math.max(0, width * height);
      const offset = total > 0
        ? Math.abs(Math.imul(this.config.seed || 1, 31) + bandIndex * 977) % total
        : 0;
      for (let step = 0; step < total && missing > 0; step += 1) {
        const index = (offset + step) % total;
        const tx = minX + index % width;
        const ty = minY + Math.floor(index / width);
        const key = makeTileKey(tx, ty);
        if (!RESOURCE_TILE_TYPES.has(this.getType(tx, ty)) || this.rubbleTiles.has(key)) continue;
        const spaced = [...positions, ...placed].every((position) => {
          const dx = position.tx - tx;
          const dy = position.ty - ty;
          return dx * dx + dy * dy >= spacingSq;
        });
        if (!spaced) continue;
        this.setTile(
          tx,
          ty,
          TILE_TYPES.ANCIENT_RELIC_CACHE,
          this.getTileMaxHp(tx, ty, TILE_TYPES.ANCIENT_RELIC_CACHE),
        );
        placed.push({ tx, ty });
        missing -= 1;
      }
    }
    if (missing > 0) {
      console.warn(
        `[WorldModel] Legacy relic recovery could not place ${missing} milestone cache(s)`,
      );
    } else if (placed.length > 0) {
      console.info(`[WorldModel] Restored ${placed.length} legacy milestone relic cache(s)`);
    }
    return placed;
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
    const geometry = WORLD_GEN_CONFIG.spawnGeometry;
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
    for (let ty = this.topAirRows + 1; ty <= this.topAirRows + geometry.shaftDepthTiles; ty += 1) {
      for (let tx = shaftX - geometry.shaftHalfWidthTiles; tx <= shaftX + geometry.shaftHalfWidthTiles; tx += 1) {
        this.setTile(tx, ty, TILE_TYPES.AIR, 0);
      }
    }
  }

  buildLeftBedrockStaircase() {
    const geometry = WORLD_GEN_CONFIG.spawnGeometry;
    for (let depth = 0; depth <= geometry.leftStaircaseDepthTiles; depth += 1) {
      const tx = geometry.leftStaircaseStartX + depth;
      const ty = this.topAirRows + depth;
      if (!this.inBounds(tx, ty)) break;
      this.setTile(tx, ty, TILE_TYPES.BEDROCK, 0);
    }
  }

  applyTiledWorldOverride(override = TILED_WORLD_OVERRIDE) {
    if (!override?.enabled) return;
    if (override.width !== this.widthTiles || override.height > this.depthTiles) {
      console.warn(
        `[WorldModel] Skipping Tiled world override: expected width ${this.widthTiles} and height <= ${this.depthTiles}, ` +
        `got ${override.width}x${override.height}`
      );
      return;
    }

    const applied = this.applyTiledRuns(override.runs);
    this.applyTiledRootOverlays(override.rootOverlays);
    console.log(
      `[WorldModel] Applied Tiled world override: ${applied} tiles from ${override.source}`
      + (override.height < this.depthTiles ? ` (authored upper ${override.height} rows)` : "")
    );
  }

  applyTiledSurfaceAuthority(authority = TILED_WORLD_OVERRIDE.surfaceAuthority) {
    const applied = this.applyTiledRuns(authority?.runs);
    if (applied > 0) {
      console.log(
        `[WorldModel] Re-applied ${applied} authoritative Tiled surface cells ` +
        `through row ${authority.throughRow}`
      );
    }
  }

  _resolveHeavenblockMaterialType(region, tileX, tileY) {
    const palette = Array.isArray(region?.materialPalette) ? region.materialPalette : [];
    const totalWeight = palette.reduce((sum, entry) => sum + Math.max(0, entry.weight || 0), 0);
    if (totalWeight <= 0) return TILE_TYPES.STONE;
    let roll = hash01(
      tileX,
      tileY,
      this.config.seed || 133742,
      (region.levelId || 1) * 1009
    ) * totalWeight;
    for (const entry of palette) {
      roll -= Math.max(0, entry.weight || 0);
      if (roll <= 0) return TILE_TYPES[entry.tileTypeKey] ?? TILE_TYPES.STONE;
    }
    return TILE_TYPES[palette[palette.length - 1]?.tileTypeKey] ?? TILE_TYPES.STONE;
  }

  _setHeavenblockTile(tileX, tileY, type) {
    if (!this.inBounds(tileX, tileY)) return false;
    const idx = this.index(tileX, tileY);
    this.skyTileOriginalType[idx] = 0;
    this.skyTileRarity[idx] = 0;
    this.rootOverlay[idx] = 0;
    this.setTile(tileX, tileY, type, type === TILE_TYPES.AIR ? 0 : this.getTileMaxHp(tileX, tileY, type));
    return true;
  }

  applyHeavenblocksLayout(
    accessConfig = HEAVENBLOCKS_ACCESS_CONFIG,
    worldConfig = HEAVENBLOCKS_WORLD_CONFIG
  ) {
    if (!resolveHeavenblocksGameplayEnabled(accessConfig)) return 0;
    let applied = 0;
    for (const gate of accessConfig.surfaceGates || []) {
      for (let tileY = gate.ty - 1; tileY <= gate.ty; tileY += 1) {
        if (this._setHeavenblockTile(gate.tx, tileY, TILE_TYPES.AIR)) applied += 1;
      }
    }
    for (const region of worldConfig.regions || []) {
      region.layoutRows.forEach((row, localY) => {
        Array.from(row).forEach((marker, localX) => {
          const tileX = region.leftTile + localX;
          const tileY = region.topTile + localY;
          let type = TILE_TYPES.AIR;
          if (marker === HEAVENBLOCK_CELL_MARKERS.PROTECTED) type = TILE_TYPES.BEDROCK;
          if (marker === HEAVENBLOCK_CELL_MARKERS.RELIC_CACHE) type = TILE_TYPES.ANCIENT_RELIC_CACHE;
          if (marker === HEAVENBLOCK_CELL_MARKERS.COMPONENT_HEART) type = TILE_TYPES.HEAVENBLOCK_CORE;
          if (marker === HEAVENBLOCK_CELL_MARKERS.MATERIAL) {
            type = this._resolveHeavenblockMaterialType(region, tileX, tileY);
          }
          if (this._setHeavenblockTile(tileX, tileY, type)) applied += 1;
        });
      });
    }
    console.log(
      `[WorldModel] Applied ${applied} native Heavenblock cells across `
      + `${worldConfig.regions.length} diggable islands`
    );
    return applied;
  }

  restoreHeavenblockProtectedCells(worldConfig = HEAVENBLOCKS_WORLD_CONFIG) {
    let restored = 0;
    for (const region of worldConfig.regions || []) {
      region.layoutRows.forEach((row, localY) => {
        Array.from(row).forEach((marker, localX) => {
          if (marker !== HEAVENBLOCK_CELL_MARKERS.PROTECTED) return;
          const tileX = region.leftTile + localX;
          const tileY = region.topTile + localY;
          if (this.getType(tileX, tileY) === TILE_TYPES.BEDROCK) return;
          if (this._setHeavenblockTile(tileX, tileY, TILE_TYPES.BEDROCK)) restored += 1;
        });
      });
    }
    return restored;
  }

  getHeavenblockCellDescriptor(tileX, tileY) {
    return resolveHeavenblockCellDescriptor(tileX, tileY);
  }

  getHeavenblockRegionAt(tileX, tileY) {
    return this.getHeavenblockCellDescriptor(tileX, tileY)?.region || null;
  }

  getHeavenblockArtifactAt(tileX, tileY) {
    const descriptor = this.getHeavenblockCellDescriptor(tileX, tileY);
    if (descriptor?.marker !== HEAVENBLOCK_CELL_MARKERS.COMPONENT_HEART) return null;
    const { region } = descriptor;
    return {
      regionId: region.id,
      regionLabel: region.label,
      partId: region.partId,
      partLabel: region.partLabel,
      vaultId: region.vaultId,
      tileX,
      tileY,
    };
  }

  getHeavenblocksLayoutHealth(
    accessConfig = HEAVENBLOCKS_ACCESS_CONFIG,
    worldConfig = HEAVENBLOCKS_WORLD_CONFIG
  ) {
    if (!resolveHeavenblocksGameplayEnabled(accessConfig)) {
      return {
        enabled: false,
        nativeTilesReady: true,
        levelDistributionReady: true,
        platformsReady: true,
        missingCells: [],
        missingFloorCells: [],
      };
    }
    const missingCells = [];
    const missingCoreCells = [];
    const counts = { material: 0, protected: 0, relic: 0, core: 0 };
    const regionsReady = {};
    for (const region of worldConfig.regions || []) {
      const regionMissing = [];
      region.layoutRows.forEach((row, localY) => {
        Array.from(row).forEach((marker, localX) => {
          if (marker === HEAVENBLOCK_CELL_MARKERS.AIR) return;
          const tileX = region.leftTile + localX;
          const tileY = region.topTile + localY;
          const key = makeTileKey(tileX, tileY);
          const type = this.getType(tileX, tileY);
          const wasMined = this.dugTiles.has(key) && type === TILE_TYPES.AIR;
          let ready = false;
          if (marker === HEAVENBLOCK_CELL_MARKERS.PROTECTED) {
            counts.protected += 1;
            ready = type === TILE_TYPES.BEDROCK;
          } else if (marker === HEAVENBLOCK_CELL_MARKERS.RELIC_CACHE) {
            counts.relic += 1;
            ready = type === TILE_TYPES.ANCIENT_RELIC_CACHE || wasMined;
          } else if (marker === HEAVENBLOCK_CELL_MARKERS.COMPONENT_HEART) {
            counts.core += 1;
            ready = type === TILE_TYPES.HEAVENBLOCK_CORE || wasMined;
            if (!ready) missingCoreCells.push(key);
          } else {
            counts.material += 1;
            const nativeTypes = new Set(
              region.materialPalette.map((entry) => TILE_TYPES[entry.tileTypeKey])
            );
            ready = nativeTypes.has(type) || wasMined;
          }
          if (!ready) {
            missingCells.push(key);
            regionMissing.push(key);
          }
        });
      });
      regionsReady[region.id] = regionMissing.length === 0;
    }
    const levelIds = (worldConfig.regions || []).map((region) => region.levelId);
    const levelDistributionReady = (
      levelIds.filter((levelId) => levelId === 1).length >= 2
      && levelIds.some((levelId) => levelId === 2)
    );
    const nativeTilesReady = missingCells.length === 0 && missingCoreCells.length === 0;
    return {
      enabled: true,
      nativeTilesReady,
      levelDistributionReady,
      platformsReady: nativeTilesReady,
      regionsReady,
      counts,
      missingCells,
      missingCoreCells,
      missingFloorCells: missingCells,
    };
  }

  applyTiledRuns(sourceRuns) {
    const runs = Array.isArray(sourceRuns) ? sourceRuns : [];
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
    return applied;
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
        `${result.nodeTiles} node tiles, ${result.caveTiles} cave tiles, ` +
        `${result.teleportTiles} teleport tiles`
      );
    }
    return result;
  }

  applySecondWorldTown() {
    const result = applySecondWorldTownToModel(this);
    if (result.applied) {
      console.log(
        `[WorldModel] Applied second world town: ${result.bedrockTiles} bedrock tiles, `
        + `${result.floorTiles} floor tiles`
      );
    }
    return result;
  }

  getTileMaxHp(tileX, tileY, type = this.getType(tileX, tileY)) {
    if (!this.inBounds(tileX, tileY)) return 0;
    const heavenblock = this.getHeavenblockCellDescriptor(tileX, tileY);
    if (
      heavenblock?.marker === HEAVENBLOCK_CELL_MARKERS.COMPONENT_HEART
      && type === TILE_TYPES.HEAVENBLOCK_CORE
    ) {
      return heavenblock.region.coreHealth;
    }
    const renderType = type === TILE_TYPES.SKY_TILE ? this.getSkyTileOriginalType(tileX, tileY) : type;
    const depthTiles = tileY - this.topAirRows;
    const hpMult = getResourceHpMultiplier(renderType, tileX, tileY, depthTiles, this.config.seed);
    const baseHealth = getTileHealth(renderType, depthTiles, hpMult);
    if (heavenblock?.marker === HEAVENBLOCK_CELL_MARKERS.MATERIAL) {
      return Math.max(1, Math.round(baseHealth * heavenblock.region.materialHealthScale));
    }
    return baseHealth;
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
    if (type === TILE_TYPES.HEAVENBLOCK_CORE) {
      const regionId = this.getHeavenblockRegionAt(tileX, tileY)?.id;
      return regionId ? `heavenblockCore:${regionId}` : "heavenblockCore";
    }
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
    const hpBefore = this._hp[idx];
    const maxHp = this.getTileMaxHp(tileX, tileY, typeBeforeDamage);
    const appliedDamage = Math.max(1, damage);
    const overkillDamage = Math.max(0, appliedDamage - hpBefore);
    const nextHp = Math.max(0, hpBefore - appliedDamage);
    this._hp[idx] = nextHp;

    if (nextHp <= 0) {
      this.dugTileSource.set(key, {
        tx: tileX,
        ty: tileY,
        type: typeBeforeDamage,
        maxHp: this.getTileMaxHp(tileX, tileY, typeBeforeDamage),
      });
      this.setTile(tileX, tileY, TILE_TYPES.AIR, 0);
      this.dugTiles.set(key, { tileX, tileY, dugAt: Date.now() });
      return {
        success: true,
        destroyed: true,
        hp: 0,
        hpBefore,
        maxHp,
        overkillDamage,
        typeBeforeDamage,
        wasRubble,
      };
    }

    if (wasRubble) {
      const rubble = this.rubbleTiles.get(key);
      this.rubbleTiles.set(key, { ...rubble, hp: nextHp });
    }
    return {
      success: true,
      destroyed: false,
      hp: nextHp,
      hpBefore,
      maxHp,
      overkillDamage: 0,
      typeBeforeDamage,
      wasRubble,
    };
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
