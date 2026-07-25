import { PLAYER_RIG_CONTACT_CONFIG } from "../../values/playerRigContact.js";

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const finitePoint = (point) => Array.isArray(point)
  && point.length >= 2
  && Number.isFinite(Number(point[0]))
  && Number.isFinite(Number(point[1]));

function centeredRect(center, width, height) {
  return {
    x: center.x - width * 0.5,
    y: center.y - height * 0.5,
    width,
    height,
  };
}

export function projectRigMarkerToWorld({
  marker,
  spriteX,
  spriteY,
  scaleX,
  scaleY,
  frameWidth,
  frameHeight,
  originX,
  originY,
  flipX = false,
}) {
  if (!finitePoint(marker)) return null;
  const frameX = flipX ? frameWidth - Number(marker[0]) : Number(marker[0]);
  return {
    x: spriteX + (frameX - originX * frameWidth) * scaleX,
    y: spriteY + (Number(marker[1]) - originY * frameHeight) * scaleY,
  };
}

export function buildAttackContactBox(
  markerWorld,
  direction,
  tileSize,
  config = PLAYER_RIG_CONTACT_CONFIG,
) {
  const diagonal = direction.x !== 0 && direction.y !== 0;
  const dimensions = diagonal
    ? config.hitbox.diagonal
    : direction.y !== 0 ? config.hitbox.vertical : config.hitbox.side;
  return centeredRect(
    markerWorld,
    dimensions.widthTiles * tileSize,
    dimensions.heightTiles * tileSize,
  );
}

export function buildTargetFaceBands(
  targetTile,
  direction,
  tileSize,
  config = PLAYER_RIG_CONTACT_CONFIG,
) {
  const left = targetTile.tx * tileSize;
  const top = targetTile.ty * tileSize;
  const thickness = config.hitbox.faceBandThicknessTiles * tileSize;
  const bands = [];
  if (direction.x !== 0) {
    const faceX = direction.x > 0 ? left : left + tileSize;
    bands.push({
      axis: "x",
      x: faceX - thickness * 0.5,
      y: top,
      width: thickness,
      height: tileSize,
    });
  }
  if (direction.y !== 0) {
    const faceY = direction.y > 0 ? top : top + tileSize;
    bands.push({
      axis: "y",
      x: left,
      y: faceY - thickness * 0.5,
      width: tileSize,
      height: thickness,
    });
  }
  return bands;
}

export function rectanglesIntersect(left, right) {
  return left.x <= right.x + right.width
    && left.x + left.width >= right.x
    && left.y <= right.y + right.height
    && left.y + left.height >= right.y;
}

export function resolveTileFaceAlignmentOffset({
  markerWorld,
  targetTile,
  direction,
  tileSize,
  currentOffset,
  config = PLAYER_RIG_CONTACT_CONFIG,
}) {
  const left = targetTile.tx * tileSize;
  const top = targetTile.ty * tileSize;
  const faceX = direction.x > 0 ? left : left + tileSize;
  const faceY = direction.y > 0 ? top : top + tileSize;
  const maximumX = config.alignment.maxOffsetXTiles * tileSize;
  const maximumY = config.alignment.maxOffsetYTiles * tileSize;
  return {
    x: direction.x === 0 ? 0 : clamp(
      currentOffset.x + faceX - markerWorld.x,
      -maximumX,
      maximumX,
    ),
    y: direction.y === 0 ? 0 : clamp(
      currentOffset.y + faceY - markerWorld.y,
      -maximumY,
      maximumY,
    ),
  };
}
