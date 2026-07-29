const DEFAULT_EPSILON = 0.001;

export function isCircleCollisionBody(entity) {
  return entity?.collisionKind === "circle"
    && Number.isFinite(entity.collisionRadiusPx)
    && entity.collisionRadiusPx > 0;
}

export function getCircleCollisionGeometry(entity, offsetX = 0, offsetY = 0) {
  if (!isCircleCollisionBody(entity)) return null;
  const radius = entity.collisionRadiusPx;
  return {
    x: entity.x + entity.w * 0.5 + offsetX,
    y: entity.y + entity.h * 0.5 + offsetY,
    radius,
  };
}

export function circleIntersectsRect(
  circleX,
  circleY,
  radius,
  left,
  top,
  right,
  bottom,
  epsilon = DEFAULT_EPSILON,
) {
  if (!(radius > 0)) return false;
  const closestX = Math.max(left, Math.min(circleX, right));
  const closestY = Math.max(top, Math.min(circleY, bottom));
  const dx = circleX - closestX;
  const dy = circleY - closestY;
  const contactRadius = Math.max(0, radius - epsilon);
  return dx * dx + dy * dy < contactRadius * contactRadius;
}

export function circleAxisReach(radius, perpendicularDistance) {
  if (!(radius > 0) || perpendicularDistance >= radius) return 0;
  return Math.sqrt(
    Math.max(0, radius * radius - perpendicularDistance * perpendicularDistance),
  );
}

export function distanceToInterval(value, minimum, maximum) {
  if (value < minimum) return minimum - value;
  if (value > maximum) return value - maximum;
  return 0;
}
