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
import { RESOURCE_TILE_TYPE_VALUES } from "../../values/resourceTypes.js";
import { isSurfaceTraversalReservedTileY } from "../../values/worldDepthConfig.js";
import {
  GAMEPLAY_FEATURE_IDS,
  isGameplayFeatureEnabled,
} from "../../values/gameplayDevFlags.js";
import { DEFAULT_GAMEPLAY_CAPABILITIES } from "../../values/gameplayCapabilities.js";
import { getRubbleRenderIndex, getTileRenderIndex } from "../rendering/tileRenderMap.js";
import {
  applySecondWorldArea as applySecondWorldAreaToModel,
  applySecondWorldExclusionBoundary,
} from "../secondWorld/SecondWorldGenerator.js";
import { isInsideEllipse } from "../../values/deterministicMath.js";
import { applySecondWorldTown as applySecondWorldTownToModel } from "../secondWorld/SecondWorldTown.js";
import {
  applyCaveFeatures,
  attachCaveIdentity,
  finalizeCaveIdentities,
} from "./CaveIdentityPlanner.js";
import { finalizeCaveGameplay } from "./CaveGameplayPlanner.js";
import { supplementAuthoredCaveGaps } from "./CaveGapSupplementGenerator.js";
import { SeededRandom } from "./SeededRandom.js";
import { enforceUndergroundBedrockLayout } from "./UndergroundBedrockLayout.js";
import {
  applyConfiguredStarSpawns,
  resolveAuthoredMaterialType,
} from "./WorldSpawnAuthority.js";
import { resolveBaseTerrainResourceType } from "./baseTerrainResourceResolver.js";
import { enforceSurfaceTraversalLayout } from "./surfaceTraversalLayout.js";

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
  constructor(config = GAME_CONFIG, gameplayCapabilities = DEFAULT_GAMEPLAY_CAPABILITIES) {
    this.config = config;
    this.gameplayCapabilities = gameplayCapabilities;
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
    this.skyTileIdentity = new Uint8Array(tileCount);
    this.authoredTileMask = new Uint8Array(tileCount);

    this.dugTiles = new Map();
    this.dugTileSource = new Map();
    this.rubbleTiles = new Map();
    this.caveZones = [];
    this.hiddenCaveZones = [];
    this.treasureRoomZones = [];
    this.geodeZones = [];
    this.glowCrystalZones = [];
    this.caveLightZones = [];
    this.caveResourceSeams = [];
    this.caveHazardZones = [];
    this.rng = new SeededRandom(config.seed || 133742);
    this.tileDamageGuard = null;

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
      layoutId: WORLD_GAMEPLAY_LAYOUT.id,
      layoutRevision: WORLD_GAMEPLAY_LAYOUT.revision,
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
    this.skyTileIdentity.fill(0);
    this.authoredTileMask.fill(0);
    this.dugTiles.clear();
    this.dugTileSource.clear();
    this.rubbleTiles.clear();
    this.caveZones = [];
    this.hiddenCaveZones = [];
    this.treasureRoomZones = [];
    this.geodeZones = [];
    this.glowCrystalZones = [];
    this.caveLightZones = [];
    this.caveResourceSeams = [];
    this.caveHazardZones = [];
    this.rng = new SeededRandom(this.config.seed || 133742);

    this.generateBaseTerrain();
    this.generateCaves();
    this.advancePostTerrainRngCompatibility();
    this.prepareSpawnZone();
    this.applyTiledWorldOverride();
    const caveSupplement = supplementAuthoredCaveGaps(this, TILED_WORLD_OVERRIDE);
    if (caveSupplement.added > 0) {
      console.log(`[WorldModel] Added ${caveSupplement.added} caves in unauthored Level One gaps`);
    }
    this.applySecondWorldArea();
    this.applySecondWorldTown();
    // Authored Tiled geometry remains authoritative. Only explicit compact
    // rollback mouths are re-applied after the authored import.
    this.reapplyStandaloneCaveMouths();
    this.generateAncientRelicCaches();
    this.applyTiledSurfaceAuthority();
    finalizeCaveIdentities(this);
    finalizeCaveGameplay(this);
    this.applyHeavenblocksLayout();
    const surfaceTraversal = enforceSurfaceTraversalLayout(this);
    console.log(
      `[WorldModel] Enforced one-way surface traversal: `
      + `${surfaceTraversal.normalizedSurfaceTiles} surface cells normalized, `
      + `${surfaceTraversal.clearedClearanceTiles} overlap cells cleared`,
    );
    const bedrockLayout = enforceUndergroundBedrockLayout(this);
    console.log(
      `[WorldModel] Enforced Level 1/2 separator outside surface clearance: `
      + `${bedrockLayout.retainedDivider} divider tiles retained, `
      + `${bedrockLayout.repairedDivider} divider gaps repaired, `
      + `${bedrockLayout.removedLevelOne + bedrockLayout.removedLevelTwo} stray tiles replaced`,
    );
    this.applyGameplayModeBoundaries();
    const configuredStarTiles = this.generateSkyTiles();
    console.info(
      `[WorldModel] Applied ${configuredStarTiles} configured Stars at probability `
      + `${this.config.skyTileProbability} after final world authority`,
    );
  }

  generateBaseTerrain() {
    const terrain = WORLD_GEN_CONFIG.terrain;
    for (let ty = this.topAirRows + 1; ty < this.depthTiles; ty += 1) {
      const depth = ty - this.topAirRows;
      for (let tx = 0; tx < this.widthTiles; tx += 1) {
        const roll = this.rng.next();
        const type = resolveBaseTerrainResourceType(
          depth,
          roll,
          terrain,
          this.config.resourceEconomyEnabled !== false,
        );

        this.setTile(tx, ty, type, this.getTileMaxHp(tx, ty, type));
      }
    }
  }

  advancePostTerrainRngCompatibility() {
    // Star occurrence used the shared RNG before final world authority was
    // introduced. Preserve those draws so seeded relic/cache placement and
    // existing save reconstruction do not move as a side effect of this fix.
    for (let ty = this.topAirRows + 1; ty < this.depthTiles - 1; ty += 1) {
      for (let tx = 0; tx < this.widthTiles; tx += 1) {
        if (RESOURCE_TILE_TYPES.has(this.getType(tx, ty))) this.rng.next();
      }
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
        source: "level-one-procedural",
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
      attachCaveIdentity(zone, this.config.seed || 133742, this.topAirRows);
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
    applyCaveFeatures(this, zone);
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

    if (!isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.LEVEL_TWO, this.gameplayCapabilities)) return;

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
    return applyConfiguredStarSpawns(this);
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

  applyHeavenblocksLayout(config = HEAVENBLOCKS_ACCESS_CONFIG) {
    if (!resolveHeavenblocksGameplayEnabled(config)) return 0;
    let applied = 0;

    for (const gate of config.surfaceGates) {
      for (let ty = gate.ty - 1; ty <= gate.ty; ty += 1) {
        if (!this.inBounds(gate.tx, ty)) continue;
        this.setTile(gate.tx, ty, TILE_TYPES.AIR, 0);
        applied += 1;
      }
    }

    for (const region of config.regions) {
      const platform = region.platform;
      for (let tx = platform.leftTx; tx < platform.rightTxExclusive; tx += 1) {
        for (let ty = platform.floorTy - 2; ty < platform.floorTy; ty += 1) {
          if (!this.inBounds(tx, ty)) continue;
          this.setTile(tx, ty, TILE_TYPES.AIR, 0);
          applied += 1;
        }
        if (!this.inBounds(tx, platform.floorTy)) continue;
        this.setTile(tx, platform.floorTy, TILE_TYPES.BEDROCK, 0);
        applied += 1;
      }
    }

    console.log(`[WorldModel] Applied ${applied} protected Heavenblock access cells`);
    return applied;
  }

  getHeavenblocksLayoutHealth(config = HEAVENBLOCKS_ACCESS_CONFIG) {
    if (!resolveHeavenblocksGameplayEnabled(config)) {
      return { enabled: false, platformsReady: true, missingFloorCells: [] };
    }
    const missingFloorCells = [];
    for (const region of config.regions) {
      const { leftTx, rightTxExclusive, floorTy } = region.platform;
      for (let tx = leftTx; tx < rightTxExclusive; tx += 1) {
        if (this.getType(tx, floorTy) !== TILE_TYPES.BEDROCK) {
          missingFloorCells.push(`${tx},${floorTy}`);
        }
      }
    }
    return {
      enabled: true,
      platformsReady: missingFloorCells.length === 0,
      missingFloorCells,
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
        this.authoredTileMask[idx] = 1;
        const resolvedType = resolveAuthoredMaterialType(tileType, tx, ty, this.config);
        this.skyTileOriginalType[idx] = 0;
        this.skyTileRarity[idx] = 0;
        this.skyTileIdentity[idx] = 0;
        this.setTile(
          tx,
          ty,
          resolvedType,
          resolvedType === TILE_TYPES.AIR ? 0 : this.getTileMaxHp(tx, ty, resolvedType),
        );
        applied += 1;
      }
    }
    return applied;
  }

  applySecondWorldArea(secondWorldArea = TILED_WORLD_OVERRIDE.secondWorldArea) {
    const result = applySecondWorldAreaToModel(
      this,
      secondWorldArea,
      undefined,
      this.gameplayCapabilities,
    );
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
    const result = applySecondWorldTownToModel(this, undefined, this.gameplayCapabilities);
    if (result.applied) {
      console.log(
        `[WorldModel] Applied second world town: ${result.bedrockTiles} bedrock tiles, `
        + `${result.floorTiles} floor tiles`
      );
    }
    return result;
  }

  applyGameplayModeBoundaries() {
    if (isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.LEVEL_TWO, this.gameplayCapabilities)) {
      return { applied: false, excluded: false };
    }
    const result = applySecondWorldExclusionBoundary(this);
    console.log(
      `[WorldModel] Demo mode excluded Level Two: `
      + `${result.wallTiles} boundary tiles, ${result.depthSealTiles} depth-seal tiles`,
    );
    return result;
  }

  getTileMaxHp(tileX, tileY, type = this.getType(tileX, tileY)) {
    if (!this.inBounds(tileX, tileY)) return 0;
    const renderType = type === TILE_TYPES.SKY_TILE ? this.getSkyTileOriginalType(tileX, tileY) : type;
    const depthTiles = tileY - this.topAirRows;
    const hpMult = getResourceHpMultiplier(
      renderType,
      tileX,
      tileY,
      depthTiles,
      this.config.seed,
      this.config.resourceEconomyEnabled !== false,
    );
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
      return getTileRenderIndex(
        originalType,
        hp,
        this.getTileMaxHp(tileX, tileY, type),
        tileX,
        tileY,
        depthTiles,
        this.config.seed,
        visualHint,
        this.config.resourceEconomyEnabled !== false,
      );
    }
    return getTileRenderIndex(
      type,
      hp,
      this.getTileMaxHp(tileX, tileY, type),
      tileX,
      tileY,
      depthTiles,
      this.config.seed,
      visualHint,
      this.config.resourceEconomyEnabled !== false,
    );
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

  getSkyTileOriginalType(tileX, tileY) {
    if (!this.inBounds(tileX, tileY)) return TILE_TYPES.DIRT;
    return this.skyTileOriginalType[this.index(tileX, tileY)] || TILE_TYPES.DIRT;
  }

  getSkyTileRarity(tileX, tileY) {
    if (!this.inBounds(tileX, tileY)) return 0;
    return this.skyTileRarity[this.index(tileX, tileY)];
  }

  getSkyTileIdentity(tileX, tileY) {
    if (!this.inBounds(tileX, tileY)) return 0;
    return this.skyTileIdentity[this.index(tileX, tileY)];
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
    if (isSurfaceTraversalReservedTileY(tileY, this.topAirRows, this.config)) {
      return null;
    }
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
      if (isSurfaceTraversalReservedTileY(ty, this.topAirRows, this.config)) continue;
      const type = this.getType(tx, ty);
      if (type === TILE_TYPES.BEDROCK
        || type === TILE_TYPES.CAVE_WALL
        || type === TILE_TYPES.GEODE_WALL
        || type === TILE_TYPES.FLOOR_TOWN_1
        || type === TILE_TYPES.FLOOR_TOWN_2) continue;
      const keyStr = makeTileKey(tx, ty);
      this.setTile(tx, ty, TILE_TYPES.AIR, 0);
      this.dugTiles.set(keyStr, { tileX: tx, tileY: ty, dugAt: Date.now() });
      this.dugTileSource.set(keyStr, { tx, ty, type, maxHp: this.getTileMaxHp(tx, ty, type) });
      applied.push({ tx, ty });
    }
    return applied;
  }

  setTileDamageGuard(guard = null) {
    this.tileDamageGuard = typeof guard === "function" ? guard : null;
  }


  damageTile(tileX, tileY, damage) {
    if (!this.inBounds(tileX, tileY)) return { success: false, reason: "out-of-bounds" };
    if (!this.isSolid(tileX, tileY)) return { success: false, reason: "air", hp: 0, typeBeforeDamage: TILE_TYPES.AIR };
    if (!this.isDiggable(tileX, tileY)) {
      return { success: false, reason: "blocked", hp: this.getHp(tileX, tileY), typeBeforeDamage: this.getType(tileX, tileY) };
    }
    const currentType = this.getType(tileX, tileY);
    const currentHp = this.getHp(tileX, tileY);
    if (this.tileDamageGuard?.({ tileX, tileY, damage, type: currentType, hp: currentHp }) === true) {
      return {
        success: false,
        reason: "event-protected",
        protected: true,
        hp: currentHp,
        typeBeforeDamage: currentType,
      };

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
      this._types[idx] = TILE_TYPES.AIR;
      this._hp[idx] = 0;
      this.dugTiles.set(key, { tileX, tileY, dugAt: Date.now() });
      this.rubbleTiles.delete(key);
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

  getCaveLightZonesInRange(playerTile, rangeTiles) {
    return this.caveLightZones.filter((zone) => {
      const dx = zone.cx - playerTile.tx;
      const dy = zone.cy - playerTile.ty;
      return Math.abs(dx) <= rangeTiles + zone.rx
        && Math.abs(dy) <= rangeTiles + zone.ry;
    });
  }

  getCaveHazardZonesInRange(playerTile, rangeTiles) {
    return this.caveHazardZones.filter((hazard) => (
      Math.abs(hazard.centerTx - playerTile.tx) <= rangeTiles
      && Math.abs((hazard.ceilingY + hazard.floorY) / 2 - playerTile.ty) <= rangeTiles
    ));
  }

  getCaveZoneAtTile(playerTile) {
    if (!playerTile) return null;
    return this.caveZones.find(zone => (
      zone?.standaloneScene !== true
      && isInsideEllipse(
        playerTile.tx,
        playerTile.ty,
        zone.cx,
        zone.cy,
        Math.max(1, zone.rx),
        Math.max(1, zone.ry),
      )
    )) || null;
  }

  getGlowCrystalActiveRatio() {
    return 1;
  }
}
