import {
  PLAYER_TARGET_AIM_LABELS,
  PLAYER_TARGET_VARIANTS,
  PLAYER_TILE_CONTACT_CONFIG,
} from "../values/playerTileContact.js";

const isFinitePositive = (value) => Number.isFinite(value) && value > 0;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function orderedTileSpan(minimum, maximum, preferred) {
  const values = [];
  for (let value = minimum; value <= maximum; value += 1) values.push(value);
  return values.sort((left, right) => (
    Math.abs(left - preferred) - Math.abs(right - preferred) || left - right
  ));
}

export function getPlayerBodyTileSpan(
  body,
  tileSize,
  edgeEpsilonPx = PLAYER_TILE_CONTACT_CONFIG.targeting.edgeEpsilonPx,
) {
  if (!body || !isFinitePositive(tileSize) || !isFinitePositive(body.w) || !isFinitePositive(body.h)) {
    return null;
  }
  if (!Number.isFinite(body.x) || !Number.isFinite(body.y)) return null;

  const epsilon = Math.max(0, Math.min(edgeEpsilonPx, body.w, body.h));
  const left = Math.floor(body.x / tileSize);
  const right = Math.floor((body.x + body.w - epsilon) / tileSize);
  const top = Math.floor(body.y / tileSize);
  const bottom = Math.floor((body.y + body.h - epsilon) / tileSize);
  const centerX = Math.floor((body.x + body.w * 0.5) / tileSize);
  const centerY = Math.floor((body.y + body.h * 0.5) / tileSize);

  return Object.freeze({ left, right, top, bottom, centerX, centerY });
}

export function getAabbAdjacentAimCandidates(
  body,
  tileSize,
  aim,
  edgeEpsilonPx = PLAYER_TILE_CONTACT_CONFIG.targeting.edgeEpsilonPx,
) {
  const span = getPlayerBodyTileSpan(body, tileSize, edgeEpsilonPx);
  if (!span) return [];

  const directionX = Math.sign(Number.isFinite(aim?.x) ? aim.x : 0);
  const directionY = Math.sign(Number.isFinite(aim?.y) ? aim.y : 0);
  if (directionX === 0 && directionY === 0) return [];

  if (directionX !== 0) {
    const targetColumn = directionX > 0 ? span.right + 1 : span.left - 1;
    const preferredRow = clamp(span.centerY, span.top, span.bottom);
    const sideCandidates = orderedTileSpan(span.top, span.bottom, preferredRow)
      .map((ty) => ({ tx: targetColumn, ty }));
    if (directionY === 0) return sideCandidates;

    const diagonalRow = directionY < 0 ? span.top - 1 : span.bottom + 1;
    return [{ tx: targetColumn, ty: diagonalRow }, ...sideCandidates];
  }

  const targetRow = directionY > 0 ? span.bottom + 1 : span.top - 1;
  const preferredColumn = clamp(span.centerX, span.left, span.right);
  return orderedTileSpan(span.left, span.right, preferredColumn)
    .map((tx) => ({ tx, ty: targetRow }));
}

export function doesTargetTileIntersectPlayerBody(
  body,
  tileSize,
  targetTile,
  edgeEpsilonPx = PLAYER_TILE_CONTACT_CONFIG.targeting.edgeEpsilonPx,
) {
  if (!body || !targetTile || !isFinitePositive(tileSize)) return true;
  if (![body.x, body.y, body.w, body.h, targetTile.tx, targetTile.ty].every(Number.isFinite)) return true;
  const epsilon = Math.max(0, edgeEpsilonPx);
  const tileLeft = targetTile.tx * tileSize;
  const tileRight = tileLeft + tileSize;
  const tileTop = targetTile.ty * tileSize;
  const tileBottom = tileTop + tileSize;
  return tileLeft < body.x + body.w - epsilon
    && tileRight > body.x + epsilon
    && tileTop < body.y + body.h - epsilon
    && tileBottom > body.y + epsilon;
}

export function isTargetTileAdjacentToPlayerBody(
  body,
  tileSize,
  targetTile,
  edgeEpsilonPx = PLAYER_TILE_CONTACT_CONFIG.targeting.edgeEpsilonPx,
) {
  const span = getPlayerBodyTileSpan(body, tileSize, edgeEpsilonPx);
  if (!span || !targetTile || !Number.isFinite(targetTile.tx) || !Number.isFinite(targetTile.ty)) {
    return false;
  }
  if (doesTargetTileIntersectPlayerBody(body, tileSize, targetTile, edgeEpsilonPx)) return false;
  return targetTile.tx >= span.left - 1
    && targetTile.tx <= span.right + 1
    && targetTile.ty >= span.top - 1
    && targetTile.ty <= span.bottom + 1;
}

function resolveAimLabel(directionX, directionY) {
  if (directionY < 0 && directionX < 0) return PLAYER_TARGET_AIM_LABELS.upLeft;
  if (directionY < 0 && directionX > 0) return PLAYER_TARGET_AIM_LABELS.upRight;
  if (directionY > 0 && directionX < 0) return PLAYER_TARGET_AIM_LABELS.downLeft;
  if (directionY > 0 && directionX > 0) return PLAYER_TARGET_AIM_LABELS.downRight;
  if (directionY < 0) return PLAYER_TARGET_AIM_LABELS.up;
  if (directionY > 0) return PLAYER_TARGET_AIM_LABELS.down;
  return directionX < 0 ? PLAYER_TARGET_AIM_LABELS.left : PLAYER_TARGET_AIM_LABELS.right;
}

export function resolvePlayerTargetDirection(
  body,
  tileSize,
  targetTile,
  edgeEpsilonPx = PLAYER_TILE_CONTACT_CONFIG.targeting.edgeEpsilonPx,
) {
  const span = getPlayerBodyTileSpan(body, tileSize, edgeEpsilonPx);
  if (!span || !targetTile || !Number.isFinite(targetTile.tx) || !Number.isFinite(targetTile.ty)) return null;
  if (!isTargetTileAdjacentToPlayerBody(body, tileSize, targetTile, edgeEpsilonPx)) return null;

  const x = Math.sign(targetTile.tx - span.centerX);
  const y = Math.sign(targetTile.ty - span.centerY);
  if (x === 0 && y === 0) return null;

  const variant = y < 0
    ? (x === 0 ? PLAYER_TARGET_VARIANTS.up : PLAYER_TARGET_VARIANTS.upSide)
    : y > 0
      ? (x === 0 ? PLAYER_TARGET_VARIANTS.down : PLAYER_TARGET_VARIANTS.downSide)
      : PLAYER_TARGET_VARIANTS.side;
  return Object.freeze({ aimLabel: resolveAimLabel(x, y), variant, x, y });
}
