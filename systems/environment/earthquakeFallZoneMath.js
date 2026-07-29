export function getCollapseWidth(intensity, widths) {
  const width = Number(widths?.[intensity]);
  return Number.isInteger(width) && width > 0 ? width : 1;
}

export function resolveFallZoneGeometry({
  worldModel,
  tx,
  sourceTy,
  airType,
  minimumAirTiles,
  maximumAirTiles,
}) {
  if (!worldModel || !Number.isInteger(tx) || !Number.isInteger(sourceTy)) {
    return null;
  }

  let landingTy = sourceTy + 1;
  let airBelow = 0;
  while (
    airBelow <= maximumAirTiles
    && worldModel.getTileType(tx, landingTy) === airType
  ) {
    airBelow += 1;
    landingTy += 1;
  }

  if (
    airBelow < minimumAirTiles
    || airBelow > maximumAirTiles
    || worldModel.getTileType(tx, landingTy) === airType
  ) {
    return null;
  }

  return { airBelow, landingTy };
}

export function expandFallZoneCandidate({
  candidate,
  intensity,
  widths,
  worldModel,
  airType,
  minimumAirTiles,
  maximumAirTiles,
  isMutableType,
}) {
  const width = getCollapseWidth(intensity, widths);
  const zones = [];
  for (let offset = 0; offset < width; offset += 1) {
    const tx = candidate.tx + offset;
    const ty = candidate.ty;
    const type = worldModel.getTileType(tx, ty);
    if (!isMutableType(type)) continue;
    const geometry = resolveFallZoneGeometry({
      worldModel,
      tx,
      sourceTy: ty,
      airType,
      minimumAirTiles,
      maximumAirTiles,
    });
    if (!geometry) continue;
    zones.push({
      ...candidate,
      ...geometry,
      tx,
      ty,
      type,
      originalType: type,
      originalHp: worldModel.getTileHp(tx, ty),
    });
  }
  return zones;
}

export function rockSweptAabbCrossesBody({
  rock,
  body,
  hitboxWidth,
  hitboxHeight,
}) {
  if (!rock || !body) return false;
  const halfWidth = hitboxWidth / 2;
  const bodyLeft = body.x;
  const bodyRight = body.x + body.w;
  const bodyTop = body.y;
  const bodyBottom = body.y + body.h;
  const previousBottom = rock.previousY;
  const currentBottom = rock.y;
  const sweptTop = Math.min(
    previousBottom - hitboxHeight,
    currentBottom - hitboxHeight,
  );
  const sweptBottom = Math.max(previousBottom, currentBottom);
  return rock.x + halfWidth >= bodyLeft
    && rock.x - halfWidth <= bodyRight
    && sweptBottom >= bodyTop
    && sweptTop <= bodyBottom;
}
