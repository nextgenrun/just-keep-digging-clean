function getManifestOffsets(manifest) {
  const tileSize = manifest.tileSize;
  return {
    x: manifest.xOffsetPx ?? (manifest.xOffsetTiles ?? 0) * tileSize,
    y: manifest.yOffsetPx ?? (manifest.yOffsetTiles ?? 0) * tileSize,
  };
}

function getRuntimeRect(entry, manifest, offsets) {
  const tileSize = manifest.tileSize;
  const left = (entry.xPx ?? entry.xTile * tileSize) + offsets.x;
  const top = (entry.yPx ?? entry.yTile * tileSize) + offsets.y;
  const width = entry.widthPx ?? entry.widthTiles * tileSize;
  const height = entry.heightPx ?? entry.heightTiles * tileSize;
  return { left, right: left + width, top, bottom: top + height, width, height };
}

function resolveFacadeTint(targetTopPx, tileSize, facade, config) {
  const targetTile = targetTopPx / tileSize;
  const band = facade.bands.find(candidate =>
    targetTile >= candidate.topTile && targetTile < candidate.bottomTileExclusive);
  return band ? config.tintByFacadeBand?.[band.id] : undefined;
}

function cloneEntry(entry, rect, targetTop, cycleIndex, manifest, offsets, facade, config) {
  const tileSize = manifest.tileSize;
  const targetLeft = config.targetLeftTile * tileSize;
  const targetRight = config.targetRightTileExclusive * tileSize;
  const targetBottom = config.targetBottomTileExclusive * tileSize;
  const left = Math.max(rect.left, targetLeft);
  const right = Math.min(rect.right, targetRight);
  const top = targetTop;
  const bottom = Math.min(targetTop + rect.height, targetBottom);
  if (right <= left || bottom <= top) return null;

  const sourceWidth = entry.sourceWidthPx ?? rect.width;
  const sourceHeight = entry.sourceHeightPx ?? rect.height;
  const cropX = (left - rect.left) / rect.width * sourceWidth;
  const cropY = (top - targetTop) / rect.height * sourceHeight;
  const cropWidth = (right - left) / rect.width * sourceWidth;
  const cropHeight = (bottom - top) / rect.height * sourceHeight;
  const tint = resolveFacadeTint(top, tileSize, facade, config);

  return {
    ...entry,
    id: `deep-continuation-${cycleIndex}-${entry.id}`,
    name: `deep-continuation-${cycleIndex}-${entry.name}`,
    xPx: left - offsets.x,
    yPx: top - offsets.y,
    widthPx: right - left,
    heightPx: bottom - top,
    sourceCrop: Object.freeze({ x: cropX, y: cropY, width: cropWidth, height: cropHeight }),
    tint,
    deepContinuation: true,
  };
}

export function buildWorldDepthContinuationEntries(manifest, config, facade) {
  if (!config?.enabled) return [];
  const tileSize = manifest.tileSize;
  const offsets = getManifestOffsets(manifest);
  const sourceTop = config.sourceTopTile * tileSize;
  const sourceBottom = config.sourceBottomTileExclusive * tileSize;
  const sourceSpan = sourceBottom - sourceTop;
  const targetTop = config.targetTopTile * tileSize;
  const targetBottom = config.targetBottomTileExclusive * tileSize;
  const templates = (manifest.objects || [])
    .filter(entry => entry.active !== false && entry.level === config.sourceLevel)
    .map(entry => ({ entry, rect: getRuntimeRect(entry, manifest, offsets) }))
    .filter(item => item.rect.bottom > sourceTop && item.rect.top < sourceBottom);
  const clones = [];

  for (let cycleTop = targetTop, cycleIndex = 0;
    cycleTop < targetBottom;
    cycleTop += sourceSpan, cycleIndex += 1) {
    for (const template of templates) {
      const rowOffset = template.rect.top - sourceTop;
      const clone = cloneEntry(
        template.entry,
        template.rect,
        cycleTop + rowOffset,
        cycleIndex,
        manifest,
        offsets,
        facade,
        config
      );
      if (clone) clones.push(Object.freeze(clone));
    }
  }
  return clones;
}
