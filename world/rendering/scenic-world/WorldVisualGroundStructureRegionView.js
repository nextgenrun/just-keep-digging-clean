import {
  setAlphaIfChanged,
  setTintIfChanged,
} from "./worldVisualRenderState.js";
import { resolveWorldVisualSemanticSequenceIndex } from
  "./worldVisualSemanticSequence.js?rev=20260729-native-density-v14";

function resolveGeometry(segment, blendEnabled) {
  const widthPx = Math.max(1, Number(segment.logicalWidthPx) || 1);
  const heightPx = Math.max(1, Number(segment.logicalHeightPx) || 1);
  const strideXPx = blendEnabled
    ? Math.max(
      1,
      Number(segment.strideXPx) || widthPx - (Number(segment.overlapXPx) || 0)
    )
    : widthPx;
  const strideYPx = blendEnabled
    ? Math.max(
      1,
      Number(segment.strideYPx) || heightPx - (Number(segment.overlapYPx) || 0)
    )
    : heightPx;
  return {
    widthPx,
    heightPx,
    strideXPx,
    strideYPx,
  };
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

function sourceSize(scene, asset) {
  const texture = scene.textures.get(asset.key);
  const source = texture?.getSourceImage?.() || texture?.source?.[0]?.image;
  if (!source?.width || !source?.height) {
    throw new Error(`[WorldVisualGroundStructureRegionView] Missing source: ${asset.key}`);
  }
  return { width: source.width, height: source.height };
}

function resolveSegmentDepth(region, config, column, row) {
  if (!region.seamBlendEnabled) return config.render.depth;
  const order = config.seamBlendV6.depthOrder;
  return (
    config.render.depth
    + region.orderIndex * order.regionStep
    + row * order.rowStep
    + column * order.columnStep
  );
}

function resolveSegmentAlpha(region, config) {
  return region.seamBlendEnabled
    ? config.seamBlendV6.alpha
    : config.render.alpha;
}

export class WorldVisualGroundStructureRegionView {
  constructor(scene, region, config, terrainMask) {
    this.scene = scene;
    this.region = region;
    this.config = config;
    this.terrainMask = terrainMask;
    this.segments = new Map();
  }

  sync(bounds, lighting, force = false) {
    if (force) this._destroySegments();
    const range = this._resolveRange(bounds);
    if (!range) {
      this._destroySegments();
      return false;
    }
    const needed = new Set();
    for (let row = range.firstRow; row <= range.lastRow; row += 1) {
      for (let column = range.firstColumn; column <= range.lastColumn; column += 1) {
        const id = `${column}:${row}`;
        needed.add(id);
        if (!this.segments.has(id)) {
          const asset = this._resolveSegmentAsset(column, row);
          if (!this.scene.textures.exists(asset.key)) continue;
          this.segments.set(id, this._createSegment(column, row));
        }
      }
    }
    this._prune(needed);
    this.update(lighting);
    return true;
  }

  resolveRequiredAssets(
    bounds,
    neighborSegments = (
      this.region.segment || this.config.segment
    ).neighborSegments
  ) {
    const range = this._resolveRange(bounds, neighborSegments);
    if (!range || this.region.assets.length === 0) return [];
    const assets = new Map();
    for (let row = range.firstRow; row <= range.lastRow; row += 1) {
      for (let column = range.firstColumn; column <= range.lastColumn; column += 1) {
        const asset = this._resolveSegmentAsset(column, row);
        assets.set(asset.key, asset);
      }
    }
    return [...assets.values()];
  }

  getActiveAssets() {
    const assets = new Map();
    for (const segment of this.segments.values()) {
      if (segment.asset) assets.set(segment.asset.key, segment.asset);
    }
    return [...assets.values()];
  }

  _resolveRange(
    bounds,
    neighborSegments = (
      this.region.segment || this.config.segment
    ).neighborSegments
  ) {
    const { region, config } = this;
    const tileSize = this.scene.config.tileSize;
    const geometry = resolveGeometry(
      region.segment || config.segment,
      region.blendEnabled
    );
    if (
      bounds.right <= region.leftTile
      || bounds.left >= region.rightTileExclusive
      || bounds.bottom <= region.topTile
      || bounds.top >= region.bottomTileExclusive
    ) return null;
    const regionWidthPx = (
      region.rightTileExclusive - region.leftTile
    ) * tileSize;
    const regionHeightPx = (
      region.bottomTileExclusive - region.topTile
    ) * tileSize;
    const columns = segmentCount(
      regionWidthPx,
      geometry.widthPx,
      geometry.strideXPx
    );
    const rows = segmentCount(
      regionHeightPx,
      geometry.heightPx,
      geometry.strideYPx
    );
    const visibleLeftPx = (
      Math.max(bounds.left, region.leftTile) - region.leftTile
    ) * tileSize;
    const visibleRightPx = (
      Math.min(bounds.right, region.rightTileExclusive) - region.leftTile
    ) * tileSize;
    const visibleTopPx = (
      Math.max(bounds.top, region.topTile) - region.topTile
    ) * tileSize;
    const visibleBottomPx = (
      Math.min(bounds.bottom, region.bottomTileExclusive) - region.topTile
    ) * tileSize;
    const margin = neighborSegments;
    const columnRange = visibleCardRange(
      visibleLeftPx,
      visibleRightPx,
      geometry.widthPx,
      geometry.strideXPx,
      columns,
      margin
    );
    const rowRange = visibleCardRange(
      visibleTopPx,
      visibleBottomPx,
      geometry.heightPx,
      geometry.strideYPx,
      rows,
      margin
    );
    return {
      firstColumn: columnRange.first,
      lastColumn: columnRange.last,
      firstRow: rowRange.first,
      lastRow: rowRange.last,
    };
  }

  _resolveSegmentAsset(column, row) {
    const assetIndex = resolveWorldVisualSemanticSequenceIndex(
      column,
      row,
      this.region.seedOffset,
      this.region.assets.length,
      { profileId: "groundStructure" }
    );
    return this.region.assets[assetIndex];
  }

  _createSegment(column, row) {
    const { region, config } = this;
    const tileSize = this.scene.config.tileSize;
    const geometry = resolveGeometry(
      region.segment || config.segment,
      region.blendEnabled
    );
    const startX = Math.round(
      region.leftTile * tileSize + column * geometry.strideXPx
    );
    const startY = Math.round(
      region.topTile * tileSize + row * geometry.strideYPx
    );
    const regionRightPx = region.rightTileExclusive * tileSize;
    const regionBottomPx = region.bottomTileExclusive * tileSize;
    const widthPx = Math.min(geometry.widthPx, regionRightPx - startX);
    const heightPx = Math.min(geometry.heightPx, regionBottomPx - startY);
    const selected = this._resolveSegmentAsset(column, row);
    const source = sourceSize(this.scene, selected);
    const cropWidth = Math.round(source.width * widthPx / geometry.widthPx);
    const cropHeight = Math.round(source.height * heightPx / geometry.heightPx);
    const sprite = this.scene.add.image(
      startX,
      startY,
      selected.key
    )
      .setOrigin(0)
      .setDepth(resolveSegmentDepth(region, config, column, row))
      .setAlpha(resolveSegmentAlpha(region, config))
      .setCrop(0, 0, cropWidth, cropHeight);
    // Phaser keeps the complete texture as the native size after setCrop.
    // Scale from the cropped frame so truncated edge cards retain full coverage.
    if (typeof sprite.setScale === "function") {
      sprite.setScale(widthPx / cropWidth, heightPx / cropHeight);
    } else {
      sprite.setDisplaySize(widthPx, heightPx);
    }
    sprite.setMask(this.terrainMask);
    sprite.name = `world-visual-ground-structure-${region.id}-${column}-${row}`;
    return { sprite, asset: selected };
  }

  update(lighting) {
    if (!lighting) return;
    for (const segment of this.segments.values()) {
      setTintIfChanged(segment.sprite, lighting.terrainTint);
      setAlphaIfChanged(
        segment.sprite,
        resolveSegmentAlpha(this.region, this.config)
      );
    }
  }

  _prune(needed) {
    for (const [id, segment] of this.segments) {
      if (needed.has(id)) continue;
      segment.sprite.destroy();
      this.segments.delete(id);
    }
  }

  _destroySegments() {
    this._prune(new Set());
  }

  destroy() {
    this._destroySegments();
    this.terrainMask = null;
  }
}
