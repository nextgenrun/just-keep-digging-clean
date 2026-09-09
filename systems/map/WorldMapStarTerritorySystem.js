import { getStarIdentity } from "../../values/starIdentityLibraryMath.js";
import {
  LEVEL_ONE_BIOME_FIELD,
  resolveLevelOneBiomeFieldAtTile,
} from "../../values/levelOneBiomeField.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { WORLD_MAP_CONFIG } from "../../values/worldMapConfig.js";
import { WORLD_MAP_COPY } from "../../values/playerFacingCopy.js";

const STAR_STATE = Object.freeze({
  INTACT: "intact",
  CONSUMED: "consumed",
});

function cellKey(cellX, cellY) {
  return `${cellX},${cellY}`;
}

function colorNumber(value, fallback) {
  if (Number.isFinite(value)) return value;
  const parsed = Number.parseInt(String(value || "").replace("#", ""), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Assigns every underground map cell to its nearest original Star site. */
export class WorldMapStarTerritorySystem {
  constructor(worldModel, config = WORLD_MAP_CONFIG) {
    this.worldModel = worldModel;
    this.config = config;
    this.sites = null;
    this.siteByKey = new Map();
    this.buckets = new Map();
    this.stateRevision = 0;
    this.cachedTerritories = { cells: [], cellByKey: new Map(), knownSiteKeys: new Set() };
    this.cachedDiscoveryRevision = -1;
    this.cachedStateRevision = -1;
  }

  _bucketKey(bucketX, bucketY) {
    return `${bucketX},${bucketY}`;
  }

  _addSite(tx, ty) {
    const key = `${tx},${ty}`;
    if (this.siteByKey.has(key)) return;
    const identityIndex = this.worldModel?.getSkyTileIdentity?.(tx, ty) ?? 0;
    const identity = getStarIdentity(identityIndex);
    const biome = resolveLevelOneBiomeFieldAtTile(tx, ty, LEVEL_ONE_BIOME_FIELD);
    const site = {
      id: `star-${tx}-${ty}`,
      key,
      tx,
      ty,
      identityIndex: identity.index,
      identityId: identity.id,
      identityName: identity.name,
      color: colorNumber(identity.primary, this.config.colors.marker),
      rarityIndex: this.worldModel?.getSkyTileRarity?.(tx, ty) ?? 0,
      biomeId: biome?.id || "",
      biomeName: biome?.label || "",
      biomeColor: biome?.mapColor ?? null,
      state: STAR_STATE.INTACT,
    };
    this.siteByKey.set(key, site);
    this.sites.push(site);
    const size = this.config.starTerritories.spatialBucketTiles;
    const bucketKey = this._bucketKey(Math.floor(tx / size), Math.floor(ty / size));
    const bucket = this.buckets.get(bucketKey) || [];
    bucket.push(site);
    this.buckets.set(bucketKey, bucket);
  }

  _ensureIndexed() {
    if (this.sites) return;
    this.sites = [];
    const model = this.worldModel;
    const width = Number(model?.widthTiles) || 0;
    const depth = Number(model?.depthTiles) || 0;
    const originalTypes = model?.skyTileOriginalType;

    if (originalTypes?.length >= width * depth) {
      for (let index = 0; index < width * depth; index += 1) {
        if (originalTypes[index] === 0) continue;
        this._addSite(index % width, Math.floor(index / width));
      }
    } else {
      for (let ty = 0; ty < depth; ty += 1) {
        for (let tx = 0; tx < width; tx += 1) {
          if (model?.getTileType?.(tx, ty) === TILE_TYPES.SKY_TILE) {
            this._addSite(tx, ty);
          }
        }
      }
      for (const source of model?.dugTileSource?.values?.() || []) {
        if (source?.type === TILE_TYPES.SKY_TILE) this._addSite(source.tx, source.ty);
      }
    }
    this._refreshStates();
  }

  _refreshStates() {
    let changed = false;
    for (const site of this.sites || []) {
      const nextState = this.worldModel?.getTileType?.(site.tx, site.ty)
        === TILE_TYPES.SKY_TILE
        ? STAR_STATE.INTACT
        : STAR_STATE.CONSUMED;
      if (site.state === nextState) continue;
      site.state = nextState;
      changed = true;
    }
    if (changed) {
      this.stateRevision += 1;
    }
  }

  getStateSummary() {
    this._ensureIndexed();
    this._refreshStates();
    const totalCount = this.sites.length;
    const intactCount = this.sites.filter(
      site => site.state === STAR_STATE.INTACT,
    ).length;
    return {
      totalCount,
      intactCount,
      consumedCount: totalCount - intactCount,
      allConsumed: totalCount > 0 && intactCount === 0,
    };
  }

  _visitBucketRing(bucketX, bucketY, ring, visit) {
    if (ring === 0) {
      visit(bucketX, bucketY);
      return;
    }
    for (let x = bucketX - ring; x <= bucketX + ring; x += 1) {
      visit(x, bucketY - ring);
      visit(x, bucketY + ring);
    }
    for (let y = bucketY - ring + 1; y < bucketY + ring; y += 1) {
      visit(bucketX - ring, y);
      visit(bucketX + ring, y);
    }
  }

  getNearestSite(tileX, tileY) {
    this._ensureIndexed();
    if (!this.sites.length) return null;
    const size = this.config.starTerritories.spatialBucketTiles;
    const bucketX = Math.floor(tileX / size);
    const bucketY = Math.floor(tileY / size);
    const width = Number(this.worldModel?.widthTiles) || 0;
    const depth = Number(this.worldModel?.depthTiles) || 0;
    const maxRing = Math.ceil(Math.max(width, depth) / size) + 1;
    let nearest = null;
    let nearestDistanceSquared = Number.POSITIVE_INFINITY;

    for (let ring = 0; ring <= maxRing; ring += 1) {
      this._visitBucketRing(bucketX, bucketY, ring, (x, y) => {
        for (const site of this.buckets.get(this._bucketKey(x, y)) || []) {
          const distanceSquared = (site.tx - tileX) ** 2 + (site.ty - tileY) ** 2;
          if (distanceSquared >= nearestDistanceSquared) continue;
          nearest = site;
          nearestDistanceSquared = distanceSquared;
        }
      });
      if (!nearest) continue;
      const left = (bucketX - ring) * size;
      const right = (bucketX + ring + 1) * size;
      const top = (bucketY - ring) * size;
      const bottom = (bucketY + ring + 1) * size;
      const outsideDistances = [];
      if (left > 0) outsideDistances.push(tileX - left + 1);
      if (right < width) outsideDistances.push(right - tileX);
      if (top > 0) outsideDistances.push(tileY - top + 1);
      if (bottom < depth) outsideDistances.push(bottom - tileY);
      const nearestOutside = outsideDistances.length
        ? Math.min(...outsideDistances)
        : Number.POSITIVE_INFINITY;
      if (nearestDistanceSquared < nearestOutside ** 2) break;
    }
    return nearest;
  }

  _directionTo(site, tileX, tileY) {
    const labels = this.config.starTerritories.directionLabels;
    const angle = Math.atan2(site.ty - tileY, site.tx - tileX);
    const step = (Math.PI * 2) / labels.length;
    const index = (Math.round(angle / step) + labels.length) % labels.length;
    return labels[index];
  }

  _resolveTerritories(discoverySystem) {
    const discoveredCells = discoverySystem?.getDiscoveredCells?.() || [];
    const discoveryRevision = discoverySystem?.getRevision?.() ?? discoveredCells.length;
    const discoveryChanged = discoveryRevision !== this.cachedDiscoveryRevision;
    const stateChanged = this.stateRevision !== this.cachedStateRevision;
    if (!discoveryChanged && !stateChanged) {
      return this.cachedTerritories;
    }
    const cellSize = this.config.discovery.cellSizeTiles;
    const firstUndergroundTile = (Number(this.worldModel?.topAirRows) || 0)
      + this.config.starTerritories.undergroundOffsetTiles;
    if (discoveryChanged) {
      for (const cell of discoveredCells) {
        const key = cellKey(cell.cellX, cell.cellY);
        if (this.cachedTerritories.cellByKey.has(key)) continue;
        const tileX = cell.cellX * cellSize + cellSize * 0.5;
        const tileY = cell.cellY * cellSize + cellSize * 0.5;
        if (tileY < firstUndergroundTile) continue;
        const site = this.getNearestSite(tileX, tileY);
        if (!site) continue;
        const territory = {
          cellX: cell.cellX, cellY: cell.cellY,
          siteKey: site.key,
          state: site.state, color: site.color,
          siteDiscovered: false,
        };
        this.cachedTerritories.cells.push(territory);
        this.cachedTerritories.cellByKey.set(key, territory);
        this.cachedTerritories.knownSiteKeys.add(site.key);
      }
      for (const territory of this.cachedTerritories.cells) {
        const site = this.siteByKey.get(territory.siteKey);
        territory.siteDiscovered = site
          ? discoverySystem?.isTileDiscovered?.(site.tx, site.ty) === true : false;
      }
      this.cachedDiscoveryRevision = discoveryRevision;
    }
    if (stateChanged) {
      for (const territory of this.cachedTerritories.cells) {
        const site = this.siteByKey.get(territory.siteKey);
        if (!site) continue;
        territory.state = site.state;
        territory.color = site.color;
      }
      this.cachedStateRevision = this.stateRevision;
    }
    return this.cachedTerritories;
  }

  resolveMap(discoverySystem, playerTile = null) {
    this._ensureIndexed();
    this._refreshStates();
    const base = this._resolveTerritories(discoverySystem);
    const playerUnderground = playerTile
      && playerTile.ty >= (Number(this.worldModel?.topAirRows) || 0)
        + this.config.starTerritories.undergroundOffsetTiles;
    const currentSite = playerUnderground
      ? this.getNearestSite(playerTile.tx, playerTile.ty)
      : null;
    const knownSiteKeys = new Set(base.knownSiteKeys);
    if (currentSite) knownSiteKeys.add(currentSite.key);
    const knownSites = [...knownSiteKeys]
      .map(key => this.siteByKey.get(key))
      .filter(Boolean);
    const currentKnown = currentSite
      ? discoverySystem?.isTileDiscovered?.(currentSite.tx, currentSite.ty) === true
      : false;
    const currentTerritory = currentSite ? {
      ...currentSite,
      discovered: currentKnown,
      distanceTiles: Math.round(Math.hypot(
        currentSite.tx - playerTile.tx,
        currentSite.ty - playerTile.ty,
      )),
      direction: this._directionTo(currentSite, playerTile.tx, playerTile.ty),
    } : null;
    return {
      ...base,
      knownSites,
      currentTerritory,
      knownIntactCount: knownSites.filter(site => site.state === STAR_STATE.INTACT).length,
      knownConsumedCount: knownSites.filter(site => site.state === STAR_STATE.CONSUMED).length,
    };
  }

  getMarkers(discoverySystem, playerTile = null) {
    const snapshot = this.resolveMap(discoverySystem, playerTile);
    const config = this.config;
    const currentKey = snapshot.currentTerritory?.key;
    return snapshot.knownSites.map(site => {
      const discovered = discoverySystem?.isTileDiscovered?.(site.tx, site.ty) === true;
      const consumed = site.state === STAR_STATE.CONSUMED;
      const current = site.key === currentKey;
      const refugeDetail = consumed
        ? WORLD_MAP_COPY.starRefugeLost
        : (discovered ? WORLD_MAP_COPY.starRefugeDetail : WORLD_MAP_COPY.starSignalDetail);
      return {
        id: site.id,
        tileX: site.tx,
        tileY: site.ty,
        label: consumed
          ? `${discovered ? site.identityName : WORLD_MAP_COPY.unidentifiedStar} ${WORLD_MAP_COPY.starScarSuffix}`
          : (discovered ? site.identityName : WORLD_MAP_COPY.unidentifiedStar),
        detail: refugeDetail,
        iconFrame: config.symbolAtlas.frames.star,
        iconSizeKey: "star",
        priority: current
          ? config.annotations.markerPriorities.currentStar
          : (consumed
            ? config.annotations.markerPriorities.consumedStar
            : (discovered
              ? config.annotations.markerPriorities.star
              : config.annotations.markerPriorities.starSignal)),
        alwaysVisible: true,
        forceLabel: current,
        color: discovered ? site.color : config.starTerritories.routeSignalColor,
        alpha: consumed
          ? config.starTerritories.consumedMarkerAlpha
          : (discovered ? 1 : config.starTerritories.signalMarkerAlpha),
        iconTint: consumed ? config.starTerritories.consumedMarkerTint : null,
        state: consumed ? STAR_STATE.CONSUMED : (discovered ? "refuge" : "signal"),
      };
    });
  }

  destroy() {
    this.sites = [];
    this.siteByKey.clear();
    this.buckets.clear();
    this.cachedTerritories.cells.length = 0;
    this.cachedTerritories.cellByKey.clear();
    this.cachedTerritories.knownSiteKeys.clear();
    this.worldModel = null;
  }
}
