function horizontalBodyRange(entity, skinPx) {
  const skin = Math.min(Math.max(0, skinPx), entity.w * 0.25);
  return {
    left: entity.x + skin,
    right: entity.x + entity.w - skin,
  };
}

function getIgnoredDropIds(entity) {
  if (Array.isArray(entity?.oneWayPlatformDropIds)
    && entity.oneWayPlatformDropIds.length > 0) {
    return entity.oneWayPlatformDropIds;
  }
  return entity?.oneWayPlatformDropId
    ? [String(entity.oneWayPlatformDropId)]
    : [];
}

function isDropIgnored(entity, platform) {
  return getIgnoredDropIds(entity).includes(platform.id);
}

export function normalizeOneWayPlatform(platform) {
  const leftX = Number(platform?.leftX);
  const rightX = Number(platform?.rightX);
  const y = Number(platform?.y);
  if (!platform?.id || !Number.isFinite(leftX) || !Number.isFinite(rightX)
    || !Number.isFinite(y) || rightX <= leftX) return null;
  const normalized = { ...platform, id: String(platform.id), leftX, rightX, y };
  const dropGroup = String(platform.dropGroup || "").trim();
  if (dropGroup) normalized.dropGroup = dropGroup;
  else delete normalized.dropGroup;
  return Object.freeze(normalized);
}

export function normalizeOneWayPlatforms(platforms) {
  return (Array.isArray(platforms) ? platforms : [])
    .map(normalizeOneWayPlatform)
    .filter(Boolean)
    .sort((left, right) => left.y - right.y || left.leftX - right.leftX);
}

export function oneWayPlatformCoversBody(platform, entity, skinPx = 0) {
  const body = horizontalBodyRange(entity, skinPx);
  return body.right >= platform.leftX && body.left <= platform.rightX;
}

export function resolveOneWayPlatformDropIds(platforms, standingPlatform) {
  if (!standingPlatform) return Object.freeze([]);
  const dropGroup = String(standingPlatform.dropGroup || "").trim();
  if (!dropGroup) return Object.freeze([standingPlatform.id]);
  return Object.freeze((Array.isArray(platforms) ? platforms : [])
    .filter(platform => platform.dropGroup === dropGroup)
    .map(platform => platform.id));
}

export function findCrossedOneWayPlatform(
  platforms,
  entity,
  step,
  skinPx = 0,
  tolerancePx = 0,
) {
  if (!(step > 0) || !entity) return null;
  const feetY = entity.y + entity.h;
  let nearest = null;
  for (const platform of platforms) {
    if (isDropIgnored(entity, platform)) continue;
    if (!oneWayPlatformCoversBody(platform, entity, skinPx)) continue;
    if (feetY > platform.y + tolerancePx || feetY + step < platform.y) continue;
    if (!nearest || platform.y < nearest.y) nearest = platform;
  }
  return nearest;
}

export function findStandingOneWayPlatform(
  platforms,
  entity,
  skinPx = 0,
  tolerancePx = 0,
) {
  if (!entity) return null;
  const feetY = entity.y + entity.h;
  return platforms.find(platform => (
    !isDropIgnored(entity, platform)
    && oneWayPlatformCoversBody(platform, entity, skinPx)
    && Math.abs(feetY - platform.y) <= tolerancePx
  )) || null;
}

export function refreshOneWayPlatformDropState(
  platforms,
  entity,
  releaseMarginPx = 0,
) {
  const ignoredIds = getIgnoredDropIds(entity);
  if (ignoredIds.length === 0) return false;
  const ignoredIdSet = new Set(ignoredIds);
  const ignoredPlatforms = (Array.isArray(platforms) ? platforms : [])
    .filter(platform => ignoredIdSet.has(platform.id));
  if (ignoredPlatforms.length === 0) {
    entity.clearOneWayPlatformDropThrough?.();
    entity.oneWayPlatformDropId = null;
    entity.oneWayPlatformDropIds = null;
    return true;
  }
  const minimumY = Math.min(...ignoredPlatforms.map(platform => platform.y));
  const maximumY = Math.max(...ignoredPlatforms.map(platform => platform.y));
  const coversGroupedSurface = ignoredPlatforms.some(platform => (
    oneWayPlatformCoversBody(platform, entity)
  ));
  const stillCrossingPlatform = coversGroupedSurface
    && entity.y <= maximumY + releaseMarginPx
    && entity.y + entity.h >= minimumY - releaseMarginPx;
  if (stillCrossingPlatform) return false;
  entity.clearOneWayPlatformDropThrough?.();
  entity.oneWayPlatformDropId = null;
  entity.oneWayPlatformDropIds = null;
  return true;
}
