import { TILE_TYPES } from "../../../values/tileTypes.js";
import { isWorldVisualTerrainCapTileType } from
  "../../../values/worldVisualTerrainVariation.js?rev=20260729-underground-seam-v6";
import {
  setAlphaIfChanged,
  setTintIfChanged,
} from "./worldVisualRenderState.js";
import { WorldVisualTerrainCohesionView } from
  "./WorldVisualTerrainCohesionView.js";
import { resolveWorldVisualSemanticSequenceIndex } from
  "./worldVisualSemanticSequence.js?rev=20260729-native-density-v14";
import { resolveLevelOneBiomeFieldAtTile } from
  "../../../values/levelOneBiomeField.js";
import {
  resolveLevelOneBiomeFamilyAssets,
  resolveLevelOneBiomeLayerSeed,
} from "../../../values/levelOneBiomeVisualFamilies.js";

function sourceSize(scene, key) {
  const texture = scene.textures.get(key);
  const source = texture?.getSourceImage?.() || texture?.source?.[0]?.image;
  if (!source?.width || !source?.height) {
    throw new Error(`[WorldVisualTerrainVariationRegionView] Missing source: ${key}`);
  }
  return { width: source.width, height: source.height };
}

function resolvePlateRegionSpan(region, config, tileSize) {
  const segment = region.segment || config.segment;
  const hasPreviousRegion = config.regions?.some(entry => (
    entry.id !== region.id
    && entry.bottomTileExclusive === region.topTile
  )) || false;
  const crossBiomeOverlapYPx = hasPreviousRegion
    ? Math.max(0, Number(segment.crossBiomeOverlapYPx) || 0)
    : 0;
  const topPx = region.topTile * tileSize - crossBiomeOverlapYPx;
  const bottomPx = region.bottomTileExclusive * tileSize;
  return {
    topPx,
    bottomPx,
    topTile: topPx / tileSize,
  };
}

function resolvePlateDepth(region, config, column, row) {
  if (!region.seamBlendEnabled) return config.render.plateDepth;
  const order = config.seamBlendV6.depthOrder;
  return (
    config.render.plateDepth
    + region.orderIndex * order.regionStep
    + row * order.rowStep
    + column * order.columnStep
  );
}

function resolvePlateAlpha(region, config) {
  return region.seamBlendEnabled
    ? config.seamBlendV6.plateAlpha
    : config.render.plateAlpha;
}

function segmentCount(regionSpanPx, cardSizePx, stridePx) {
  if (regionSpanPx <= cardSizePx) return 1;
  return Math.ceil((regionSpanPx - cardSizePx) / stridePx) + 1;
}

function visibleCardRange(
  visibleStartPx,
  visibleEndPx,
  cardSizePx,
  stridePx,
  count,
  margin
) {
  return {
    first: Math.max(
      0,
      Math.floor((visibleStartPx - cardSizePx) / stridePx) + 1 - margin
    ),
    last: Math.min(
      count - 1,
      Math.floor(Math.max(0, visibleEndPx - 1) / stridePx) + margin
    ),
  };
}

function stableFrame(tx, ty, seedOffset, count) {
  const mixed = (
    Math.imul(tx + 17, 73856093)
    ^ Math.imul(ty + 31, 19349663)
    ^ Math.imul(seedOffset + 7, 83492791)
  ) >>> 0;
  return mixed % count;
}

export class WorldVisualTerrainVariationRegionView {
  constructor(
    scene,
    worldModel,
    region,
    config,
    terrainMask,
    cohesionEnabled = false,
    search = globalThis.location?.search || ""
  ) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.region = region;
    this.config = config;
    this.terrainMask = terrainMask;
    this.search = search;
    this.plateImages = new Map();
    this.capImages = new Map();
    this.cohesionView = new WorldVisualTerrainCohesionView(
      scene,
      region,
      config,
      terrainMask,
      cohesionEnabled
    );
  }

  sync(bounds, lighting, force = false) {
    if (force) this._destroyAll();
    const tileSize = this.scene.config.tileSize;
    const regionSpan = resolvePlateRegionSpan(
      this.region,
      this.config,
      tileSize
    );
    const intersects = (
      bounds.right > this.region.leftTile
      && bounds.left < this.region.rightTileExclusive
      && bounds.bottom > regionSpan.topTile
      && bounds.top < this.region.bottomTileExclusive
    );
    if (!intersects) {
      this._destroyAll();
      return false;
    }
    this._syncPlates(bounds);
    this.cohesionView.sync(bounds, lighting);
    this._syncCaps(bounds);
    this.update(lighting);
    return true;
  }

  resolveRequiredAssets(
    bounds,
    neighborSegments = (
      this.region.segment || this.config.segment
    ).neighborSegments
  ) {
    const range = this._resolvePlateRange(bounds, neighborSegments);
    if (!range) return [];
    const capSourceRegions = this.region.biomeFieldRegionsById
      ? Object.values(this.region.biomeFieldRegionsById)
      : [this.region];
    const capAtlases = capSourceRegions.flatMap(sourceRegion => (
      sourceRegion.capAtlases || [sourceRegion.capAtlas]
    ));
    const assets = new Map(capAtlases.map(asset => [asset.key, asset]));
    for (let row = range.rows.first; row <= range.rows.last; row += 1) {
      for (let column = range.columns.first; column <= range.columns.last; column += 1) {
        const asset = this._resolvePlateAsset(column, row);
        assets.set(asset.key, asset);
      }
    }
    const cohesionAsset = this.cohesionView.resolveRequiredAsset(bounds);
    if (cohesionAsset) assets.set(cohesionAsset.key, cohesionAsset);
    return [...assets.values()];
  }

  getActiveAssets() {
    const assets = new Map();
    for (const image of this.plateImages.values()) {
      const asset = image._worldVisualAsset;
      if (asset) assets.set(asset.key, asset);
    }
    for (const image of this.capImages.values()) {
      const asset = image._worldVisualAsset;
      if (asset) assets.set(asset.key, asset);
    }
    const cohesionAsset = this.cohesionView.getActiveAsset();
    if (cohesionAsset) assets.set(cohesionAsset.key, cohesionAsset);
    return [...assets.values()];
  }

  _resolvePlateAsset(column, row) {
    const fieldSelection = this._resolveBiomeFieldSelection(column, row);
    const sourceRegion = fieldSelection?.sourceRegion || this.region;
    const plates = fieldSelection?.plates || sourceRegion.plates;
    const assetIndex = resolveWorldVisualSemanticSequenceIndex(
      column,
      row,
      sourceRegion.seedOffset + (fieldSelection
        ? resolveLevelOneBiomeLayerSeed(
          fieldSelection.profile,
          "terrain",
          undefined,
          this.search
        )
        : 0),
      plates.length,
      { profileId: "terrain" }
    );
    return plates[assetIndex];
  }

  _resolveBiomeFieldSelection(column, row) {
    const sources = this.region.biomeFieldRegionsById;
    if (!sources) return null;
    const tileSize = this.scene.config.tileSize;
    const segment = this.region.segment || this.config.segment;
    const regionSpan = resolvePlateRegionSpan(this.region, this.config, tileSize);
    const centerTileX = this.region.leftTile
      + (column * segment.strideXPx + segment.logicalWidthPx * 0.5) / tileSize;
    const centerTileY = regionSpan.topTile
      + (row * segment.strideYPx + segment.logicalHeightPx * 0.5) / tileSize;
    const profile = resolveLevelOneBiomeFieldAtTile(centerTileX, centerTileY);
    const sourceRegion = profile ? sources[profile.sourceRegionId] : null;
    const plates = sourceRegion
      ? resolveLevelOneBiomeFamilyAssets(
        profile,
        "terrain",
        sourceRegion.plates,
        undefined,
        this.search
      )
      : null;
    return profile && sourceRegion && plates?.length
      ? { profile, sourceRegion, plates }
      : null;
  }

  _resolveBiomeFieldSelectionAtTile(tx, ty) {
    const sources = this.region.biomeFieldRegionsById;
    if (!sources) return null;
    const profile = resolveLevelOneBiomeFieldAtTile(tx, ty);
    const sourceRegion = profile ? sources[profile.sourceRegionId] : null;
    return profile && sourceRegion ? { profile, sourceRegion } : null;
  }

  _resolveBiomeFieldRegionAtTile(tx, ty) {
    return this._resolveBiomeFieldSelectionAtTile(tx, ty)?.sourceRegion
      || this.region;
  }

  _resolvePlateRange(
    bounds,
    neighborSegments = (
      this.region.segment || this.config.segment
    ).neighborSegments
  ) {
    const { scene, region, config } = this;
    const tileSize = scene.config.tileSize;
    const segment = region.segment || config.segment;
    const regionSpan = resolvePlateRegionSpan(region, config, tileSize);
    const intersects = (
      bounds.right > region.leftTile
      && bounds.left < region.rightTileExclusive
      && bounds.bottom > regionSpan.topTile
      && bounds.top < region.bottomTileExclusive
    );
    if (!intersects) return null;
    const regionWidthPx = (region.rightTileExclusive - region.leftTile) * tileSize;
    const regionHeightPx = regionSpan.bottomPx - regionSpan.topPx;
    const columnCount = segmentCount(
      regionWidthPx,
      segment.logicalWidthPx,
      segment.strideXPx
    );
    const rowCount = segmentCount(
      regionHeightPx,
      segment.logicalHeightPx,
      segment.strideYPx
    );
    const relativeLeftPx = (
      Math.max(bounds.left, region.leftTile) - region.leftTile
    ) * tileSize;
    const relativeRightPx = (
      Math.min(bounds.right, region.rightTileExclusive) - region.leftTile
    ) * tileSize;
    const relativeTopPx = (
      Math.max(bounds.top, regionSpan.topTile) * tileSize
      - regionSpan.topPx
    );
    const relativeBottomPx = (
      Math.min(bounds.bottom, region.bottomTileExclusive) * tileSize
      - regionSpan.topPx
    );
    const columns = visibleCardRange(
      relativeLeftPx,
      relativeRightPx,
      segment.logicalWidthPx,
      segment.strideXPx,
      columnCount,
      neighborSegments
    );
    const rows = visibleCardRange(
      relativeTopPx,
      relativeBottomPx,
      segment.logicalHeightPx,
      segment.strideYPx,
      rowCount,
      neighborSegments
    );
    return { columns, rows };
  }

  _syncPlates(bounds) {
    const range = this._resolvePlateRange(bounds);
    const needed = new Set();
    if (!range) {
      this._prune(this.plateImages, needed);
      return;
    }
    for (let row = range.rows.first; row <= range.rows.last; row += 1) {
      for (let column = range.columns.first; column <= range.columns.last; column += 1) {
        const id = `${column}:${row}`;
        needed.add(id);
        if (!this.plateImages.has(id)) {
          const selected = this._resolvePlateAsset(column, row);
          if (!this.scene.textures.exists(selected.key)) continue;
          this.plateImages.set(id, this._createPlate(column, row));
        }
      }
    }
    this._prune(this.plateImages, needed);
  }

  _createPlate(column, row) {
    const { scene, region, config } = this;
    const tileSize = scene.config.tileSize;
    const segment = region.segment || config.segment;
    const regionSpan = resolvePlateRegionSpan(region, config, tileSize);
    const regionRightPx = region.rightTileExclusive * tileSize;
    const regionBottomPx = region.bottomTileExclusive * tileSize;
    const x = region.leftTile * tileSize + column * segment.strideXPx;
    const y = regionSpan.topPx + row * segment.strideYPx;
    const width = Math.min(segment.logicalWidthPx, regionRightPx - x);
    const height = Math.min(segment.logicalHeightPx, regionBottomPx - y);
    const selected = this._resolvePlateAsset(column, row);
    const source = sourceSize(scene, selected.key);
    const cropWidth = Math.round(source.width * width / segment.logicalWidthPx);
    const cropHeight = Math.round(source.height * height / segment.logicalHeightPx);
    const image = scene.add.image(x, y, selected.key)
      .setOrigin(0)
      .setDepth(resolvePlateDepth(region, config, column, row))
      .setAlpha(resolvePlateAlpha(region, config))
      .setCrop(0, 0, cropWidth, cropHeight);
    // Tail plates are cropped frames. Phaser display-size scaling is based on
    // the complete texture, so scale from the crop to prevent uncovered seams.
    if (typeof image.setScale === "function") {
      image.setScale(width / cropWidth, height / cropHeight);
    } else {
      image.setDisplaySize(width, height);
    }
    image.setMask(this.terrainMask);
    image.name = `world-visual-terrain-variation-${region.id}-${column}-${row}`;
    image._worldVisualAsset = selected;
    return image;
  }

  _syncCaps(bounds) {
    const { region } = this;
    const left = Math.max(bounds.left, region.leftTile);
    const right = Math.min(bounds.right, region.rightTileExclusive);
    const top = Math.max(bounds.top, region.topTile);
    const bottom = Math.min(bounds.bottom, region.bottomTileExclusive);
    const needed = new Set();
    for (let ty = top; ty < bottom; ty += 1) {
      for (let tx = left; tx < right; tx += 1) {
        const tileType = this.worldModel.getTileType(tx, ty);
        if (!isWorldVisualTerrainCapTileType(tileType, this.config)) continue;
        if (this.worldModel.getTileType(tx, ty - 1) !== TILE_TYPES.AIR) continue;
        const id = `${tx}:${ty}`;
        needed.add(id);
        if (!this.capImages.has(id)) {
          this.capImages.set(id, this._createCap(tx, ty));
        }
      }
    }
    this._prune(this.capImages, needed);
  }

  _createCap(tx, ty) {
    const { scene, region, config } = this;
    const tileSize = scene.config.tileSize;
    const caps = config.caps;
    const fieldSelection = this._resolveBiomeFieldSelectionAtTile(tx, ty);
    const sourceRegion = fieldSelection?.sourceRegion || region;
    const profileOffset = fieldSelection?.profile.assetOffset || 0;
    const capAtlases = sourceRegion.capAtlases || [sourceRegion.capAtlas];
    const atlasIndex = stableFrame(
      tx + 41,
      ty + 67,
      sourceRegion.seedOffset + profileOffset + 109,
      capAtlases.length
    );
    const selectedAtlas = capAtlases[atlasIndex];
    const frame = stableFrame(
      tx,
      ty,
      sourceRegion.seedOffset + profileOffset,
      caps.frameCount
    );
    const cropX = (frame % caps.columns) * caps.frameWidthPx;
    const cropY = Math.floor(frame / caps.columns) * caps.frameHeightPx;
    const image = scene.add.image(
      tx * tileSize - caps.overlapPx / 2,
      ty * tileSize,
      selectedAtlas.key
    )
      .setOrigin(0)
      .setDepth(config.render.capDepth)
      .setAlpha(config.render.capAlpha)
      .setCrop(cropX, cropY, caps.frameWidthPx, caps.frameHeightPx)
      .setDisplaySize(
        tileSize + caps.overlapPx,
        tileSize * caps.displayHeightTiles
      )
      .setMask(this.terrainMask);
    image.name = `world-visual-terrain-cap-${region.id}-${tx}-${ty}-${frame}`;
    image._worldVisualAsset = selectedAtlas;
    return image;
  }

  update(lighting) {
    if (!lighting) return;
    const tint = lighting.terrainTint;
    this.plateImages.forEach(image => {
      setTintIfChanged(image, tint);
      setAlphaIfChanged(
        image,
        resolvePlateAlpha(this.region, this.config)
      );
    });
    this.capImages.forEach(image => {
      setTintIfChanged(image, tint);
      setAlphaIfChanged(image, this.config.render.capAlpha);
    });
    this.cohesionView.update(lighting);
  }

  _prune(collection, needed) {
    for (const [id, image] of collection) {
      if (needed.has(id)) continue;
      image.destroy();
      collection.delete(id);
    }
  }

  _destroyAll() {
    this._prune(this.plateImages, new Set());
    this._prune(this.capImages, new Set());
    this.cohesionView.destroyImage();
  }

  destroy() {
    this._destroyAll();
    this.cohesionView.destroy();
    this.terrainMask = null;
  }
}
