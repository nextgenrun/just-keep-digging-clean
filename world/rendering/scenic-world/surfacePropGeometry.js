export function resolveSurfacePropScaleMultiplier(item, config) {
  const sizeScale = config?.scale?.sizeVariants?.[item?.sizeVariant];
  const laneScale = config?.scale?.lanePerspective?.[item?.lane];
  if (!Number.isFinite(sizeScale) || sizeScale <= 0
    || !Number.isFinite(laneScale) || laneScale <= 0) {
    throw new Error("[surfacePropGeometry] Invalid authored scale variant");
  }
  return sizeScale * laneScale;
}

export function resolveSurfacePropDisplayGeometry(
  asset,
  tileSize,
  playerProfile,
  scaleMultiplier = 1,
) {
  const required = [
    asset?.heightMeters,
    asset?.expectedSource?.width,
    asset?.expectedSource?.height,
    tileSize,
    playerProfile?.physicalHeightMeters,
    playerProfile?.targetVisibleHeightTiles,
    scaleMultiplier,
  ];
  if (required.some(value => !Number.isFinite(value) || value <= 0)) {
    throw new Error("[surfacePropGeometry] Invalid physical-scale input");
  }

  const playerVisibleHeightWorldPx = playerProfile.targetVisibleHeightTiles * tileSize;
  const worldPixelsPerMeter = playerVisibleHeightWorldPx / playerProfile.physicalHeightMeters;
  const height = asset.heightMeters * worldPixelsPerMeter * scaleMultiplier;
  const width = height * asset.expectedSource.width / asset.expectedSource.height;
  return Object.freeze({
    width,
    height,
    widthTiles: width / tileSize,
    sourcePixelsPerWorldPixel: asset.expectedSource.height / height,
  });
}

function findSurfaceContactY(worldModel, tileX, topAirRows, grounding) {
  const tx = Math.floor(tileX);
  const firstRow = topAirRows - grounding.scanRowsAboveSurface;
  const lastRow = topAirRows + grounding.scanRowsBelowSurface;
  for (let ty = firstRow; ty <= lastRow; ty += 1) {
    if (worldModel.isSolid(tx, ty) && !worldModel.isSolid(tx, ty - 1)) {
      return ty * worldModel.tileSize;
    }
  }
  return null;
}

export function resolveSurfacePropGroundContact(
  worldModel,
  tileX,
  displayWidthTiles,
  topAirRows,
  grounding,
) {
  const halfWidthTiles = Math.min(
    displayWidthTiles * grounding.sampleHalfWidthRatio,
    grounding.maximumSampleHalfWidthTiles,
  );
  const sampleOffsets = [-halfWidthTiles, 0, halfWidthTiles];
  const contacts = sampleOffsets.map(offset => (
    findSurfaceContactY(worldModel, tileX + offset, topAirRows, grounding)
  ));
  if (contacts.some(value => !Number.isFinite(value))) {
    return Object.freeze({ valid: false, reason: "missing-support" });
  }
  const minimum = Math.min(...contacts);
  const maximum = Math.max(...contacts);
  if (maximum - minimum > grounding.maximumGroundDeltaWorldPx) {
    return Object.freeze({ valid: false, reason: "uneven-support" });
  }
  return Object.freeze({
    valid: true,
    y: Math.round(contacts.reduce((sum, value) => sum + value, 0) / contacts.length)
      + grounding.groundSinkWorldPx,
  });
}

function mergeIntervals(intervals) {
  const sorted = [...intervals].sort((left, right) => (
    left.leftTile - right.leftTile || left.rightTile - right.rightTile
  ));
  const merged = [];
  for (const interval of sorted) {
    const previous = merged[merged.length - 1];
    if (!previous || interval.leftTile > previous.rightTile) {
      merged.push({ ...interval });
    } else {
      previous.rightTile = Math.max(previous.rightTile, interval.rightTile);
    }
  }
  return merged;
}

export function auditSurfacePropCoverage(layout, assets, config = null) {
  const reports = layout.requiredSurfaceRanges.map(range => {
    const intervals = layout.existingVisualCoverageBands.flatMap(band => {
      const leftTile = Math.max(range.leftTile, band.leftTile);
      const rightTile = Math.min(range.rightTile, band.rightTile);
      return rightTile > leftTile ? [{ leftTile, rightTile }] : [];
    });
    for (const item of layout.placements) {
      const radius = assets[item.level]?.[item.assetId]?.visualInfluenceRadiusTiles;
      if (!Number.isFinite(radius)) continue;
      const scale = config ? resolveSurfacePropScaleMultiplier(item, config) : 1;
      const leftTile = Math.max(range.leftTile, item.tileX - radius * scale);
      const rightTile = Math.min(range.rightTile, item.tileX + radius * scale);
      if (rightTile > leftTile) intervals.push({ leftTile, rightTile });
    }

    const gaps = [];
    let cursor = range.leftTile;
    for (const interval of mergeIntervals(intervals)) {
      if (interval.leftTile > cursor) {
        gaps.push(Object.freeze({
          leftTile: cursor,
          rightTile: interval.leftTile,
          widthTiles: interval.leftTile - cursor,
        }));
      }
      cursor = Math.max(cursor, interval.rightTile);
    }
    if (cursor < range.rightTile) {
      gaps.push(Object.freeze({
        leftTile: cursor,
        rightTile: range.rightTile,
        widthTiles: range.rightTile - cursor,
      }));
    }
    return Object.freeze({
      id: range.id,
      gaps: Object.freeze(gaps),
      maximumGapTiles: gaps.reduce((maximum, gap) => Math.max(maximum, gap.widthTiles), 0),
    });
  });
  return Object.freeze(reports);
}
