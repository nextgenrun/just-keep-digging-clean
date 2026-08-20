function getWidth(scene) {
  const model = scene.worldModel;
  return model.widthTiles || model.width || scene.config.worldWidthTiles;
}

function getDepthBounds(scene) {
  const model = scene.worldModel;
  return {
    minimum: scene.config.topAirRows + 1,
    maximum: (model.depthTiles || model.depth || 1) - 2,
  };
}

function getHorizontalRanges(scene, world) {
  const width = getWidth(scene);
  const margin = world.edgeMarginTiles;
  const spawnX = scene.config.spawnTileX || scene.config.playerSpawnTileX;
  const preferredStart = Math.max(margin, spawnX + world.spawnOffsetTiles);
  const preferredEnd = Math.min(
    width - margin - 1,
    preferredStart + world.searchWidthTiles
  );
  return [
    [preferredStart, preferredEnd],
    [margin, width - margin - 1],
  ];
}

export function isStanding(scene, tx, ty) {
  const model = scene.worldModel;
  return !model.isSolid(tx, ty)
    && !model.isSolid(tx, ty - 1)
    && model.isSolid(tx, ty + 1);
}

export function findDepthTarget(scene, world, depthTiles) {
  const bounds = getDepthBounds(scene);
  const surfaceRequested = Number(depthTiles) <= 0;
  const minimumY = surfaceRequested ? 1 : bounds.minimum;
  const desiredY = surfaceRequested
    ? Math.max(minimumY, scene.config.topAirRows - 1)
    : Math.max(
      bounds.minimum,
      Math.min(
        bounds.maximum,
        scene.config.topAirRows + Math.round(depthTiles) - 1
      )
    );
  const visited = new Set();

  for (let distance = 0; distance <= world.searchDepthTiles; distance += 1) {
    const rows = distance === 0
      ? [desiredY]
      : [desiredY - distance, desiredY + distance];
    for (const ty of rows) {
      if (ty < minimumY || ty > bounds.maximum) continue;
      for (const [startX, endX] of getHorizontalRanges(scene, world)) {
        const rangeKey = `${startX}:${endX}:${ty}`;
        if (visited.has(rangeKey)) continue;
        visited.add(rangeKey);
        for (let tx = startX; tx <= endX; tx += 1) {
          if (isStanding(scene, tx, ty)) {
            return { tx, ty };

          }
        }
      }
    }
  }
  throw new Error(`No shared standing tile found near ${depthTiles} m`);
}

export function nearestStanding(
  scene,
  desiredTx,
  desiredTy,
  direction,
  movement
) {
  for (
    let distance = 0;
    distance <= movement.horizontalSearchTiles;
    distance += 1
  ) {
    const tx = desiredTx + distance * direction;
    for (
      let offset = 0;
      offset <= movement.verticalSearchTiles;
      offset += 1
    ) {
      for (const sign of offset === 0 ? [0] : [-1, 1]) {
        const ty = desiredTy + offset * sign;
        if (isStanding(scene, tx, ty)) return { tx, ty };
      }
    }
  }
  return null;
}
