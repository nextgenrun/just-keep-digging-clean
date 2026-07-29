import {
  resolveWorldVisualDepthBackdropTint,
} from "../../../values/worldVisualDepthBackdrops.js?rev=20260729-whole-world-expansion-v5-lineless-v10";
import {
  setPositionIfChanged,
  setTintIfChanged,
} from "./worldVisualRenderState.js";
import {
  createWorldVisualBlendMask,
  resolveWorldVisualBlendBits,
} from
  "./worldVisualBlendMaskFrame.js?rev=20260729-whole-world-expansion-v5-lineless-v10";

function sourceSize(scene, asset, videoConfig) {
  if (asset.type === "video") {
    return { width: videoConfig.widthPx, height: videoConfig.heightPx };
  }
  const texture = scene.textures.get(asset.key);
  const source = texture?.getSourceImage?.() || texture?.source?.[0]?.image || texture?.source?.[0];
  if (!source?.width || !source?.height) {
    throw new Error(`[WorldVisualDepthBackdropRegionView] Missing source: ${asset.key}`);
  }
  return { width: source.width, height: source.height };
}

function resolveSegmentGeometry(segment, tileSize) {
  const widthPx = Math.max(
    1,
    Number(segment.logicalWidthPx) || Number(segment.widthTiles) * tileSize || tileSize
  );
  const heightPx = Math.max(
    1,
    Number(segment.logicalHeightPx) || Number(segment.heightTiles) * tileSize || tileSize
  );
  const strideXPx = Math.max(
    1,
    Number(segment.strideXPx) || widthPx - (Number(segment.overlapXPx) || 0)
  );
  const strideYPx = Math.max(
    1,
    Number(segment.strideYPx) || heightPx - (Number(segment.overlapYPx) || 0)
  );
  return {
    widthPx,
    heightPx,
    widthTiles: widthPx / tileSize,
    heightTiles: heightPx / tileSize,
    strideXPx,
    strideYPx,
    strideXTiles: strideXPx / tileSize,
    strideYTiles: strideYPx / tileSize,
  };
}

function resolveRegionSpan(region, config, tileSize) {
  const hasPreviousRegion = config.regions?.some(entry => (
    entry.id !== region.id
    && entry.bottomTileExclusive === region.topTile
  )) || false;
  const crossBiomeOverlapYPx = hasPreviousRegion
    ? Math.max(0, Number(config.blend?.crossBiomeOverlapYPx) || 0)
    : 0;
  const topPx = region.topTile * tileSize - crossBiomeOverlapYPx;
  const bottomPx = region.bottomTileExclusive * tileSize;
  return {
    hasPreviousRegion,
    crossBiomeOverlapYPx,
    topPx,
    bottomPx,
    topTile: topPx / tileSize,
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

export class WorldVisualDepthBackdropRegionView {
  constructor(
    scene,
    region,
    config,
    backwalls = region.backwalls,
    motionEnabled = true,
    blendMaskAsset = config.blend?.maskAtlas,
    fallbackAsset = null
  ) {
    this.scene = scene;
    this.region = region;
    this.config = config;
    this.backwalls = backwalls;
    this.motionEnabled = motionEnabled;
    this.blendMaskAsset = blendMaskAsset;
    this.fallbackAsset = fallbackAsset;
    this.segments = new Map();
  }

  sync(bounds, lighting, force = false, cameraOffset = null) {
    if (force) this._destroySegments();
    const range = this._resolveSegmentRange(bounds);
    if (!range) {
      this._destroySegments();
      return false;
    }

    const needed = new Set();
    for (let row = range.firstRow; row <= range.lastRow; row += 1) {
      for (let column = range.firstColumn; column <= range.lastColumn; column += 1) {
        const id = `${column}:${row}`;
        needed.add(id);
        const requestedAsset = this._resolveSegmentAsset(column, row);
        const renderAsset = this._resolveRenderableSegmentAsset(requestedAsset);
        const existing = this.segments.get(id);
        if (!renderAsset) {
          if (existing) {
            this._destroySegment(existing);
            this.segments.delete(id);
          }
          continue;
        }
        if (existing
          && existing.asset?.key === renderAsset.key
          && existing.requestedAssetKey === requestedAsset?.key) {
          continue;
        }
        if (existing) this._destroySegment(existing);
        this.segments.set(
          id,
          this._createSegment(column, row, renderAsset, requestedAsset)
        );
      }
    }
    this._prune(needed);
    this.update(this.scene.time?.now || 0, lighting, cameraOffset);
    return true;
  }

  resolveRequiredAssets(
    bounds,
    neighborSegments = this.config.segment.neighborSegments
  ) {
    const range = this._resolveSegmentRange(bounds, neighborSegments);
    if (!range || this.backwalls.length === 0) return [];
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

  _resolveSegmentRange(
    bounds,
    neighborSegments = this.config.segment.neighborSegments
  ) {
    const { region } = this;
    const { segment } = this.config;
    const tileSize = this.scene.config.tileSize;
    const geometry = resolveSegmentGeometry(segment, tileSize);
    const regionSpan = resolveRegionSpan(region, this.config, tileSize);
    if (bounds.right <= region.leftTile || bounds.left >= region.rightTileExclusive
      || bounds.bottom <= regionSpan.topTile
      || bounds.top >= region.bottomTileExclusive) return null;
    const regionWidthPx = (region.rightTileExclusive - region.leftTile) * tileSize;
    const regionHeightPx = regionSpan.bottomPx - regionSpan.topPx;
    const columns = segmentCount(regionWidthPx, geometry.widthPx, geometry.strideXPx);
    const rows = segmentCount(regionHeightPx, geometry.heightPx, geometry.strideYPx);
    const visibleLeftPx = (
      Math.max(bounds.left, region.leftTile) - region.leftTile
    ) * tileSize;
    const visibleRightPx = (
      Math.min(bounds.right, region.rightTileExclusive) - region.leftTile
    ) * tileSize;
    const visibleTopPx = (
      Math.max(bounds.top, regionSpan.topTile) * tileSize
      - regionSpan.topPx
    );
    const visibleBottomPx = (
      Math.min(bounds.bottom, region.bottomTileExclusive) * tileSize
      - regionSpan.topPx
    );
    const columnRange = visibleCardRange(
      visibleLeftPx,
      visibleRightPx,
      geometry.widthPx,
      geometry.strideXPx,
      columns,
      neighborSegments
    );
    const rowRange = visibleCardRange(
      visibleTopPx,
      visibleBottomPx,
      geometry.heightPx,
      geometry.strideYPx,
      rows,
      neighborSegments
    );
    return {
      firstColumn: columnRange.first,
      lastColumn: columnRange.last,
      firstRow: rowRange.first,
      lastRow: rowRange.last,
      columns,
      rows,
    };
  }

  _resolveSegmentAsset(column, row) {
    return this.backwalls[(column + row * 3) % this.backwalls.length];
  }

  _resolveRenderableSegmentAsset(requestedAsset) {
    if (this._isAssetReady(requestedAsset)) return requestedAsset;
    const readyRegionalAsset = this.backwalls.find(asset => this._isAssetReady(asset));
    if (readyRegionalAsset) return readyRegionalAsset;
    return this._isAssetReady(this.fallbackAsset) ? this.fallbackAsset : null;
  }

  _isAssetReady(asset) {
    if (!asset) return false;
    return asset.type === "video"
      ? Boolean(this.scene.cache?.video?.exists(asset.key))
      : this.scene.textures.exists(asset.key);
  }

  _createSegment(column, row, backwallAsset, requestedAsset = backwallAsset) {
    const { region, config } = this;
    const { segment, render } = config;
    const tileSize = this.scene.config.tileSize;
    const geometry = resolveSegmentGeometry(segment, tileSize);
    const regionSpan = resolveRegionSpan(region, config, tileSize);
    const regionWidthPx = (region.rightTileExclusive - region.leftTile) * tileSize;
    const regionHeightPx = regionSpan.bottomPx - regionSpan.topPx;
    const columns = segmentCount(regionWidthPx, geometry.widthPx, geometry.strideXPx);
    const rows = segmentCount(regionHeightPx, geometry.heightPx, geometry.strideYPx);
    const regionIndex = Math.max(0, config.regions?.indexOf(region) ?? 0);
    const cardDepth = (
      render.backwallDepth
      + regionIndex * (Number(render.regionDepthStride) || 0)
      + (row * columns + column)
        * (Number(render.segmentDepthStep) || 0)
    );
    const baseX = Math.round(region.leftTile * tileSize + column * geometry.strideXPx);
    const baseY = Math.round(regionSpan.topPx + row * geometry.strideYPx);
    const regionRightPx = region.rightTileExclusive * tileSize;
    const regionBottomPx = region.bottomTileExclusive * tileSize;
    const contentWidthPx = Math.min(geometry.widthPx, regionRightPx - baseX);
    const contentHeightPx = Math.min(geometry.heightPx, regionBottomPx - baseY);
    const cropRatioX = contentWidthPx / geometry.widthPx;
    const cropRatioY = contentHeightPx / geometry.heightPx;
    const resolveCardGeometry = asset => {
      const source = sourceSize(this.scene, asset, config.motion.smoothVideo);
      const cropWidth = Math.round(source.width * cropRatioX);
      const cropHeight = Math.round(source.height * cropRatioY);
      return { cropX: 0, cropY: 0, cropWidth, cropHeight };
    };
    const applyCardGeometry = (card, cardGeometry) => card
      .setCrop(
        cardGeometry.cropX,
        cardGeometry.cropY,
        cardGeometry.cropWidth,
        cardGeometry.cropHeight
      )
      // Tail cards are cropped frames. Scale from that cropped frame rather
      // than the complete source texture so the right/bottom world boundary
      // remains covered without a black sliver.
      .setScale(
        contentWidthPx / cardGeometry.cropWidth,
        contentHeightPx / cardGeometry.cropHeight
      );
    const blend = this._createBlendMask(
      baseX,
      baseY,
      contentWidthPx,
      contentHeightPx,
      {
        left: column > 0,
        top: row > 0 || regionSpan.hasPreviousRegion,
      }
    );
    const applyBlendMask = card => {
      if (blend?.bitmapMask && typeof card.setMask === "function") {
        card.setMask(blend.bitmapMask);
      }
      return card;
    };
    const makeImageCard = (asset, depth, name) => {
      const cardGeometry = resolveCardGeometry(asset);
      const card = this.scene.add.image(baseX, baseY, asset.key)
        .setOrigin(0)
        .setDepth(depth);
      applyCardGeometry(card, cardGeometry);
      applyBlendMask(card);
      card.name = name;
      return card;
    };
    const makeVideoCard = (asset, depth, name) => {
      const cardGeometry = resolveCardGeometry(asset);
      const card = this.scene.add.video(baseX, baseY, asset.key)
        .setOrigin(0)
        .setDepth(depth)
        .setVisible(false);
      card.name = name;
      applyBlendMask(card);
      card.once("created", () => {
        applyCardGeometry(card, cardGeometry);
        card.setVisible(true);
        card.setPaused(!this.motionEnabled);
      });
      card.play(config.motion.smoothVideo.loop);
      return card;
    };
    const name = `world-visual-depth-${region.id}-${column}-${row}`;
    const isSmoothVideo = backwallAsset.type === "video";
    const backwall = isSmoothVideo
      ? makeVideoCard(backwallAsset, cardDepth, name)
      : makeImageCard(backwallAsset, cardDepth, name);
    return {
      backwall, baseX, baseY, column, row,
      asset: backwallAsset,
      requestedAssetKey: requestedAsset?.key || null,
      blendMaskImage: blend?.maskImage || null,
      bitmapMask: blend?.bitmapMask || null,
      isSmoothVideo,
      videoPaused: !this.motionEnabled,
      widthPx: contentWidthPx,
      heightPx: contentHeightPx,
      centerTileY: (baseY + contentHeightPx / 2) / tileSize,
    };
  }

  _createBlendMask(x, y, width, height, edges) {
    const blend = this.config.blend;
    const maskAtlas = this.blendMaskAsset || blend?.maskAtlas;
    if (!blend?.enabled || !maskAtlas || !this.scene.textures.exists(maskAtlas.key)) {
      return null;
    }
    const bits = resolveWorldVisualBlendBits(blend, edges);
    const mask = createWorldVisualBlendMask(
      this.scene,
      maskAtlas,
      blend,
      bits,
      x,
      y,
      width,
      height
    );
    if (!mask) return null;
    return {
      maskImage: mask.image,
      bitmapMask: mask.bitmap,
    };
  }

  update(time, lighting, cameraOffset = null) {
    if (!lighting) return;
    const { region } = this;
    const cameraX = Number(cameraOffset?.x) || 0;
    const cameraY = Number(cameraOffset?.y) || 0;
    const pauseVideo = !this.motionEnabled
      || Number(this.scene.game?.loop?.actualFps) < this.config.motion.smoothVideo.pauseBelowFps;
    for (const segment of this.segments.values()) {
      const x = segment.baseX + cameraX;
      const y = segment.baseY + cameraY;
      setPositionIfChanged(segment.backwall, x, y);
      setPositionIfChanged(segment.blendMaskImage, x, y);
      if (segment.isSmoothVideo && segment.videoPaused !== pauseVideo) {
        segment.backwall.setPaused(pauseVideo);
        segment.videoPaused = pauseVideo;
      }
      setTintIfChanged(
        segment.backwall,
        resolveWorldVisualDepthBackdropTint(
          segment.centerTileY,
          lighting,
          this.config,
          region
        )
      );
    }
  }

  _prune(needed) {
    for (const [id, segment] of this.segments) {
      if (needed.has(id)) continue;
      this._destroySegment(segment);
      this.segments.delete(id);
    }
  }

  _destroySegment(segment) {
    if (!segment) return;
    if (segment.isSmoothVideo) segment.backwall.stop();
    segment.backwall.clearMask?.(false);
    segment.backwall.destroy();
    segment.bitmapMask?.destroy?.();
    segment.blendMaskImage?.destroy?.();
  }

  _destroySegments() {
    this._prune(new Set());
  }

  destroy() {
    this._destroySegments();
  }
}
