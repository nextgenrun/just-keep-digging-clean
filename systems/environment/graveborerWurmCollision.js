import { copyGraveborerTile } from "./graveborerWurmPath.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function normalizePlayerBounds(playerBoundsOrTile) {
  if (
    Number.isFinite(playerBoundsOrTile?.left)
    && Number.isFinite(playerBoundsOrTile?.right)
    && Number.isFinite(playerBoundsOrTile?.top)
    && Number.isFinite(playerBoundsOrTile?.bottom)
  ) {
    return {
      left: Math.min(playerBoundsOrTile.left, playerBoundsOrTile.right),
      right: Math.max(playerBoundsOrTile.left, playerBoundsOrTile.right),
      top: Math.min(playerBoundsOrTile.top, playerBoundsOrTile.bottom),
      bottom: Math.max(playerBoundsOrTile.top, playerBoundsOrTile.bottom),
    };
  }
  const tile = copyGraveborerTile(playerBoundsOrTile);
  return tile
    ? { left: tile.tx, right: tile.tx + 1, top: tile.ty, bottom: tile.ty + 1 }
    : null;
}

function circleOverlapsBounds(x, y, radius, bounds) {
  const closestX = clamp(x, bounds.left, bounds.right);
  const closestY = clamp(y, bounds.top, bounds.bottom);
  return Math.hypot(x - closestX, y - closestY) <= radius;
}

function pointToBoundsDistance(x, y, bounds) {
  const closestX = clamp(x, bounds.left, bounds.right);
  const closestY = clamp(y, bounds.top, bounds.bottom);
  return Math.hypot(x - closestX, y - closestY);
}

function pointToSegmentDistance(px, py, startX, startY, endX, endY) {
  const dx = endX - startX;
  const dy = endY - startY;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= Number.EPSILON) {
    return Math.hypot(px - startX, py - startY);
  }
  const projection = clamp(
    ((px - startX) * dx + (py - startY) * dy) / lengthSquared,
    0,
    1,
  );
  return Math.hypot(
    px - (startX + dx * projection),
    py - (startY + dy * projection),
  );
}

function segmentIntersectsBounds(startX, startY, endX, endY, bounds) {
  const dx = endX - startX;
  const dy = endY - startY;
  let near = 0;
  let far = 1;
  const edges = [
    [-dx, startX - bounds.left],
    [dx, bounds.right - startX],
    [-dy, startY - bounds.top],
    [dy, bounds.bottom - startY],
  ];
  for (const [direction, distance] of edges) {
    if (Math.abs(direction) <= Number.EPSILON) {
      if (distance < 0) return false;
      continue;
    }
    const ratio = distance / direction;
    if (direction < 0) {
      near = Math.max(near, ratio);
    } else {
      far = Math.min(far, ratio);
    }
    if (near > far) return false;
  }
  return true;
}

function sweptCircleOverlapsBounds(startX, startY, endX, endY, radius, bounds) {
  if (segmentIntersectsBounds(startX, startY, endX, endY, bounds)) return true;
  const distances = [
    pointToBoundsDistance(startX, startY, bounds),
    pointToBoundsDistance(endX, endY, bounds),
    pointToSegmentDistance(
      bounds.left,
      bounds.top,
      startX,
      startY,
      endX,
      endY,
    ),
    pointToSegmentDistance(
      bounds.right,
      bounds.top,
      startX,
      startY,
      endX,
      endY,
    ),
    pointToSegmentDistance(
      bounds.right,
      bounds.bottom,
      startX,
      startY,
      endX,
      endY,
    ),
    pointToSegmentDistance(
      bounds.left,
      bounds.bottom,
      startX,
      startY,
      endX,
      endY,
    ),
  ];
  return Math.min(...distances) <= radius;
}

export function resolveGraveborerWurmCollision(
  renderState,
  playerBoundsOrTile,
  config,
) {
  const bounds = normalizePlayerBounds(playerBoundsOrTile);
  if (!bounds) return null;
  const candidates = [renderState.head, ...renderState.bodies, renderState.tail]
    .filter(part => part?.visible);
  for (const part of candidates) {
    const radius = part.kind === "head"
      ? config.combat.headHitRadiusTiles
      : config.combat.bodyHitRadiusTiles;
    const centerX = part.x + 0.5;
    const centerY = part.y + 0.5;
    if (circleOverlapsBounds(centerX, centerY, radius, bounds)) {
      return {
        part: part.kind,
        point: { x: centerX, y: centerY },
      };
    }
  }
  return null;
}

export function resolveGraveborerWurmSweptCollision(
  previousRenderState,
  currentRenderState,
  playerBoundsOrTile,
  config,
) {
  const bounds = normalizePlayerBounds(playerBoundsOrTile);
  if (!bounds) return null;
  const previousParts = [
    previousRenderState?.head,
    ...(previousRenderState?.bodies || []),
    previousRenderState?.tail,
  ];
  const currentParts = [
    currentRenderState?.head,
    ...(currentRenderState?.bodies || []),
    currentRenderState?.tail,
  ];
  const partCount = Math.max(previousParts.length, currentParts.length);
  for (let index = 0; index < partCount; index += 1) {
    const previous = previousParts[index];
    const current = currentParts[index];
    const visiblePart = current?.visible ? current : previous?.visible ? previous : null;
    if (!visiblePart) continue;
    const start = previous?.visible ? previous : visiblePart;
    const end = current?.visible ? current : visiblePart;
    const radius = visiblePart.kind === "head"
      ? config.combat.headHitRadiusTiles
      : config.combat.bodyHitRadiusTiles;
    const startX = start.x + 0.5;
    const startY = start.y + 0.5;
    const endX = end.x + 0.5;
    const endY = end.y + 0.5;
    if (sweptCircleOverlapsBounds(
      startX,
      startY,
      endX,
      endY,
      radius,
      bounds,
    )) {
      return {
        part: visiblePart.kind,
        point: { x: endX, y: endY },
      };
    }
  }
  return null;
}
