import { PLAYER_TRAVERSAL_CONFIG } from "../values/playerTraversal.js";

function placementBody(body, x, y) {
  return {
    x,
    y,
    w: body.w,
    h: body.h,
    vx: 0,
    vy: 0,
    collisionKind: body.collisionKind,
    collisionRadiusPx: body.collisionRadiusPx,
    surfaceDropThroughRow: null,
  };
}

function isClear(collisionSystem, body, x, y) {
  return collisionSystem?.isBodyOverlappingSolid?.(
    placementBody(body, x, y),
  ) !== true;
}

export function resolveLedgeSearchDirections({ input, body, facingRight, config }) {
  const horizontal = input?.getHorizontalMovement?.() || { left: false, right: false };
  let preferred = 0;
  if (horizontal.left !== horizontal.right) preferred = horizontal.left ? -1 : 1;
  if (!preferred) {
    const threshold = config.velocityDirectionThresholdTilesPerSecond;
    preferred = Math.abs(body.vx || 0) >= threshold ? Math.sign(body.vx) : 0;
  }
  if (!preferred) preferred = facingRight === false ? -1 : 1;
  return Object.freeze([preferred, -preferred]);
}

export function findReachableLedge({
  body,
  worldModel,
  collisionSystem,
  tileSize,
  directions,
  config = PLAYER_TRAVERSAL_CONFIG.ledgeAssist.capture,
}) {
  if (!body || !worldModel || !collisionSystem || !(tileSize > 0)) return null;
  const gripY = body.y + body.h * config.gripBodyHeightRatio;
  const verticalTolerance = tileSize * config.verticalSnapToleranceTiles;
  const minimumTy = Math.floor((gripY - verticalTolerance) / tileSize);
  const maximumTy = Math.floor((gripY + verticalTolerance) / tileSize);
  const candidates = [];

  directions.forEach((direction, directionIndex) => {
    const sideX = direction > 0 ? body.x + body.w : body.x;
    const gapLimit = tileSize * (directionIndex === 0
      ? config.maxHorizontalGapTiles
      : config.passiveHorizontalGapTiles);
    const probeX = sideX + direction * gapLimit;
    const tx = Math.floor(probeX / tileSize);
    const faceX = direction > 0 ? tx * tileSize : (tx + 1) * tileSize;
    const gap = direction > 0 ? faceX - sideX : sideX - faceX;
    if (gap < 0 || gap > gapLimit) return;

    for (let ty = minimumTy; ty <= maximumTy; ty += 1) {
      // Only the top surface being dropped through is ineligible; other ledges
      // keep their normal capture rules, even while this drop is active.
      if (ty === collisionSystem.config?.topAirRows
        && ty === body.surfaceDropThroughRow) continue;
      if (!worldModel.isSolid(tx, ty) || worldModel.isSolid(tx, ty - 1)) continue;
      const ledgeTopY = ty * tileSize;
      if (Math.abs(ledgeTopY - gripY) > verticalTolerance) continue;
      const wallGap = tileSize * config.wallGapTiles;
      const hangX = direction > 0
        ? faceX - body.w - wallGap
        : faceX + wallGap;
      const hangY = ledgeTopY - body.h * config.gripBodyHeightRatio;
      const standX = tx * tileSize + (tileSize - body.w) / 2;
      const standY = ledgeTopY - body.h;
      if (!isClear(collisionSystem, body, hangX, hangY)) continue;
      if (!isClear(collisionSystem, body, standX, standY)) continue;
      candidates.push({
        direction,
        tx,
        ty,
        ledgeTopY,
        hangX,
        hangY,
        standX,
        standY,
        score: Math.abs(ledgeTopY - gripY) + gap,
      });
    }
  });

  candidates.sort((left, right) => left.score - right.score);
  return candidates[0] || null;
}
