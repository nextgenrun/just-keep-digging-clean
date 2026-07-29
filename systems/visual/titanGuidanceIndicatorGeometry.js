const finite = (value, fallback = 0) => (
  Number.isFinite(Number(value)) ? Number(value) : fallback
);

const clamp = (value, minimum, maximum) => (
  Math.max(minimum, Math.min(maximum, value))
);

function normalizeDirection(dx, dy, fallback = { x: 0, y: 1 }) {
  const length = Math.hypot(dx, dy);
  if (length <= 0.001) return { ...fallback };
  return { x: dx / length, y: dy / length };
}

function rayToBounds(origin, direction, bounds) {
  const candidates = [];
  if (direction.x > 0.001) {
    candidates.push((bounds.maxX - origin.x) / direction.x);
  } else if (direction.x < -0.001) {
    candidates.push((bounds.minX - origin.x) / direction.x);
  }
  if (direction.y > 0.001) {
    candidates.push((bounds.maxY - origin.y) / direction.y);
  } else if (direction.y < -0.001) {
    candidates.push((bounds.minY - origin.y) / direction.y);
  }
  const travel = Math.min(...candidates.filter(value => value >= 0));
  return {
    x: clamp(origin.x + direction.x * travel, bounds.minX, bounds.maxX),
    y: clamp(origin.y + direction.y * travel, bounds.minY, bounds.maxY),
  };
}

export function titanGuidanceWorldToScreen(world, camera = {}) {
  const zoomX = finite(camera.zoomX, finite(camera.zoom, 1)) || 1;
  const zoomY = finite(camera.zoomY, finite(camera.zoom, 1)) || 1;
  const scrollX = finite(camera.scrollX, finite(camera.worldView?.x, 0));
  const scrollY = finite(camera.scrollY, finite(camera.worldView?.y, 0));
  return {
    x: (finite(world?.x) - scrollX) * zoomX + finite(camera.x),
    y: (finite(world?.y) - scrollY) * zoomY + finite(camera.y),
  };
}

export function createTitanGuidanceIndicatorLayout(
  viewport,
  playerScreen,
  targetScreen,
  config,
) {
  const width = Math.max(1, finite(viewport?.width, 1280));
  const height = Math.max(1, finite(viewport?.height, 720));
  const pointerHalf = finite(config.pointerSizePx, 72) / 2;
  const edge = config.safeArea;
  const pointerBounds = {
    minX: finite(edge.leftPx, 18) + pointerHalf,
    maxX: width - finite(edge.rightPx, 18) - pointerHalf,
    minY: finite(edge.topPx, 168) + pointerHalf,
    maxY: height - finite(edge.bottomPx, 88) - pointerHalf,
  };
  const origin = {
    x: clamp(finite(playerScreen?.x, width / 2), pointerBounds.minX, pointerBounds.maxX),
    y: clamp(finite(playerScreen?.y, height / 2), pointerBounds.minY, pointerBounds.maxY),
  };
  const target = {
    x: finite(targetScreen?.x, width / 2),
    y: finite(targetScreen?.y, height / 2),
  };
  const fallback = normalizeDirection(
    target.x - width / 2,
    target.y - height / 2,
  );
  const direction = normalizeDirection(
    target.x - origin.x,
    target.y - origin.y,
    fallback,
  );
  const targetOnScreen = (
    target.x >= 0
    && target.x <= width
    && target.y >= 0
    && target.y <= height
  );
  const targetGap = finite(config.onScreenTargetGapPx, 42);
  const rawPointer = targetOnScreen
    ? {
      x: target.x - direction.x * targetGap,
      y: target.y - direction.y * targetGap,
    }
    : rayToBounds(origin, direction, pointerBounds);
  const pointer = {
    x: clamp(rawPointer.x, pointerBounds.minX, pointerBounds.maxX),
    y: clamp(rawPointer.y, pointerBounds.minY, pointerBounds.maxY),
  };

  return {
    targetOnScreen,
    edgeClamped: (
      !targetOnScreen
      || Math.abs(rawPointer.x - pointer.x) > 0.01
      || Math.abs(rawPointer.y - pointer.y) > 0.01
    ),
    angleRadians: Math.atan2(direction.y, direction.x),
    direction,
    pointer,
    target,
  };
}
