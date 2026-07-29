function dominantContactNormal(deltaX, deltaY) {
  if (Math.abs(deltaY) >= Math.abs(deltaX) && deltaY !== 0) {
    return { normalX: 0, normalY: -Math.sign(deltaY) };
  }
  if (deltaX !== 0) {
    return { normalX: -Math.sign(deltaX), normalY: 0 };
  }
  return { normalX: 0, normalY: -1 };
}

function tileHit(startX, startY, deltaX, deltaY, fraction, tileX, tileY, normal) {
  return {
    fraction,
    worldX: startX + deltaX * fraction,
    worldY: startY + deltaY * fraction,
    tileX,
    tileY,
    source: "tile",
    ...normal,
  };
}

function startingTileHit(startX, startY, deltaX, deltaY, tileSize, tileX, tileY) {
  const normal = dominantContactNormal(deltaX, deltaY);
  let worldX = startX;
  let worldY = startY;
  if (normal.normalY < 0) worldY = tileY * tileSize;
  else if (normal.normalY > 0) worldY = (tileY + 1) * tileSize;
  else if (normal.normalX < 0) worldX = tileX * tileSize;
  else if (normal.normalX > 0) worldX = (tileX + 1) * tileSize;
  return {
    fraction: 0,
    worldX,
    worldY,
    tileX,
    tileY,
    source: "tile",
    ...normal,
  };
}

export function raycastSolidTiles(
  worldModel,
  tileSize,
  startX,
  startY,
  endX,
  endY,
) {
  if (!worldModel?.isSolid || !(tileSize > 0)) return null;
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  let tileX = Math.floor(startX / tileSize);
  let tileY = Math.floor(startY / tileSize);

  if (worldModel.isSolid(tileX, tileY)) {
    return startingTileHit(
      startX,
      startY,
      deltaX,
      deltaY,
      tileSize,
      tileX,
      tileY,
    );
  }

  const stepX = Math.sign(deltaX);
  const stepY = Math.sign(deltaY);
  const deltaFractionX = stepX === 0 ? Infinity : tileSize / Math.abs(deltaX);
  const deltaFractionY = stepY === 0 ? Infinity : tileSize / Math.abs(deltaY);
  let nextFractionX = stepX === 0
    ? Infinity
    : (((stepX > 0 ? tileX + 1 : tileX) * tileSize) - startX) / deltaX;
  let nextFractionY = stepY === 0
    ? Infinity
    : (((stepY > 0 ? tileY + 1 : tileY) * tileSize) - startY) / deltaY;

  while (nextFractionX <= 1 || nextFractionY <= 1) {
    if (nextFractionX < nextFractionY) {
      tileX += stepX;
      const fraction = nextFractionX;
      nextFractionX += deltaFractionX;
      if (worldModel.isSolid(tileX, tileY)) {
        return tileHit(
          startX,
          startY,
          deltaX,
          deltaY,
          fraction,
          tileX,
          tileY,
          { normalX: -stepX, normalY: 0 },
        );
      }
      continue;
    }

    if (nextFractionY < nextFractionX) {
      tileY += stepY;
      const fraction = nextFractionY;
      nextFractionY += deltaFractionY;
      if (worldModel.isSolid(tileX, tileY)) {
        return tileHit(
          startX,
          startY,
          deltaX,
          deltaY,
          fraction,
          tileX,
          tileY,
          { normalX: 0, normalY: -stepY },
        );
      }
      continue;
    }

    const fraction = nextFractionX;
    const sideX = { tileX: tileX + stepX, tileY };
    const sideY = { tileX, tileY: tileY + stepY };
    const verticalFirst = Math.abs(deltaY) >= Math.abs(deltaX);
    const sides = verticalFirst ? [sideY, sideX] : [sideX, sideY];
    for (const side of sides) {
      if (!worldModel.isSolid(side.tileX, side.tileY)) continue;
      const normal = side === sideY
        ? { normalX: 0, normalY: -stepY }
        : { normalX: -stepX, normalY: 0 };
      return tileHit(
        startX,
        startY,
        deltaX,
        deltaY,
        fraction,
        side.tileX,
        side.tileY,
        normal,
      );
    }

    tileX += stepX;
    tileY += stepY;
    nextFractionX += deltaFractionX;
    nextFractionY += deltaFractionY;
    if (worldModel.isSolid(tileX, tileY)) {
      return tileHit(
        startX,
        startY,
        deltaX,
        deltaY,
        fraction,
        tileX,
        tileY,
        dominantContactNormal(deltaX, deltaY),
      );
    }
  }
  return null;
}

export function raycastRect(rect, startX, startY, endX, endY) {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  let entry = 0;
  let exit = 1;
  let normalX = 0;
  let normalY = 0;

  if (deltaX === 0) {
    if (startX < rect.x || startX > rect.x + rect.width) return null;
  } else {
    let near = (rect.x - startX) / deltaX;
    let far = (rect.x + rect.width - startX) / deltaX;
    if (near > far) [near, far] = [far, near];
    if (near > entry) {
      entry = near;
      normalX = deltaX > 0 ? -1 : 1;
      normalY = 0;
    }
    exit = Math.min(exit, far);
    if (entry > exit) return null;
  }

  if (deltaY === 0) {
    if (startY < rect.y || startY > rect.y + rect.height) return null;
  } else {
    let near = (rect.y - startY) / deltaY;
    let far = (rect.y + rect.height - startY) / deltaY;
    if (near > far) [near, far] = [far, near];
    if (near > entry) {
      entry = near;
      normalX = 0;
      normalY = deltaY > 0 ? -1 : 1;
    }
    exit = Math.min(exit, far);
    if (entry > exit) return null;
  }

  if (entry > 1 || exit < 0) return null;
  const fraction = Math.max(0, entry);
  const fallbackNormal = dominantContactNormal(deltaX, deltaY);
  const contactNormal = normalX !== 0 || normalY !== 0
    ? { normalX, normalY }
    : fallbackNormal;
  return {
    fraction,
    worldX: startX + deltaX * fraction,
    worldY: startY + deltaY * fraction,
    source: rect.kind,
    ...contactNormal,
  };
}
