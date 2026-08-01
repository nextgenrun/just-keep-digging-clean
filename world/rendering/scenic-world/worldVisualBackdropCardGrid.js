export function resolveWorldVisualBackdropSegmentGeometry(segment, tileSize) {
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

export function resolveWorldVisualBackdropRegionSpan(
  region,
  config,
  tileSize
) {
  const hasPreviousRegion = config.regions?.some(entry => (
    entry.id !== region.id
    && entry.bottomTileExclusive === region.topTile
  )) || false;
  const crossBiomeOverlapYPx = hasPreviousRegion
    ? Math.max(0, Number(config.blend?.crossBiomeOverlapYPx) || 0)
    : 0;
  const hasNextRegion = config.regions?.some(entry => (
    entry.id !== region.id
    && entry.topTile === region.bottomTileExclusive
  )) || false;
  const topPx = region.topTile * tileSize - crossBiomeOverlapYPx;
  const bottomPx = region.bottomTileExclusive * tileSize;
  return {
    hasPreviousRegion,
    hasNextRegion,
    crossBiomeOverlapYPx,
    topPx,
    bottomPx,
    topTile: topPx / tileSize,
  };
}

export function countWorldVisualBackdropSegments(
  regionSpanPx,
  cardSizePx,
  stridePx
) {
  if (regionSpanPx <= cardSizePx) return 1;
  return Math.ceil((regionSpanPx - cardSizePx) / stridePx) + 1;
}

export function resolveWorldVisualBackdropVisibleCardRange(
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

export function resolveWorldVisualBackdropCardRange(
  bounds,
  region,
  config,
  tileSize,
  neighborSegments = config.segment.neighborSegments
) {
  const geometry = resolveWorldVisualBackdropSegmentGeometry(config.segment, tileSize);
  const regionSpan = resolveWorldVisualBackdropRegionSpan(region, config, tileSize);
  if (
    bounds.right <= region.leftTile
    || bounds.left >= region.rightTileExclusive
    || bounds.bottom <= regionSpan.topTile
    || bounds.top >= region.bottomTileExclusive
  ) {
    return null;
  }
  const regionWidthPx = (region.rightTileExclusive - region.leftTile) * tileSize;
  const regionHeightPx = regionSpan.bottomPx - regionSpan.topPx;
  const columns = countWorldVisualBackdropSegments(
    regionWidthPx,
    geometry.widthPx,
    geometry.strideXPx
  );
  const rows = countWorldVisualBackdropSegments(
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
    Math.max(bounds.top, regionSpan.topTile) * tileSize
    - regionSpan.topPx
  );
  const visibleBottomPx = (
    Math.min(bounds.bottom, region.bottomTileExclusive) * tileSize
    - regionSpan.topPx
  );
  const columnRange = resolveWorldVisualBackdropVisibleCardRange(
    visibleLeftPx,
    visibleRightPx,
    geometry.widthPx,
    geometry.strideXPx,
    columns,
    neighborSegments
  );
  const rowRange = resolveWorldVisualBackdropVisibleCardRange(
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
    geometry,
    regionSpan,
  };
}

export function resolveWorldVisualBackdropCardPlacement(
  region,
  config,
  tileSize,
  column,
  row
) {
  const geometry = resolveWorldVisualBackdropSegmentGeometry(config.segment, tileSize);
  const regionSpan = resolveWorldVisualBackdropRegionSpan(region, config, tileSize);
  const regionWidthPx = (region.rightTileExclusive - region.leftTile) * tileSize;
  const regionHeightPx = regionSpan.bottomPx - regionSpan.topPx;
  const columns = countWorldVisualBackdropSegments(
    regionWidthPx,
    geometry.widthPx,
    geometry.strideXPx
  );
  const rows = countWorldVisualBackdropSegments(
    regionHeightPx,
    geometry.heightPx,
    geometry.strideYPx
  );
  const baseX = Math.round(
    region.leftTile * tileSize + column * geometry.strideXPx
  );
  const baseY = Math.round(regionSpan.topPx + row * geometry.strideYPx);
  const regionRightPx = region.rightTileExclusive * tileSize;
  const regionBottomPx = region.bottomTileExclusive * tileSize;
  return {
    geometry,
    regionSpan,
    columns,
    rows,
    baseX,
    baseY,
    contentWidthPx: Math.min(geometry.widthPx, regionRightPx - baseX),
    contentHeightPx: Math.min(geometry.heightPx, regionBottomPx - baseY),
  };
}
