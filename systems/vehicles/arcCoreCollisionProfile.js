const SUPPORTED_KIND = "circle";

function isPositiveNumber(value) {
  return Number.isFinite(value) && value > 0;
}

export function resolveArcCoreCollisionProfile(modeProfile, meta) {
  const collision = modeProfile?.collision;
  const canvasSize = meta?.canvasSizePx;
  const anchor = collision?.centerPx;
  if (
    collision?.kind !== SUPPORTED_KIND
    || !isPositiveNumber(collision.diameterPx)
    || !isPositiveNumber(modeProfile?.bodyDisplaySizePx)
    || !isPositiveNumber(canvasSize)
    || !Array.isArray(anchor)
    || anchor.length !== 2
    || anchor[0] !== canvasSize * 0.5
    || anchor[1] !== canvasSize * 0.5
  ) {
    return null;
  }
  return Object.freeze({
    kind: SUPPORTED_KIND,
    label: collision.label || "Arc Core round hull",
    diameterPx: collision.diameterPx,
    radiusPx: collision.diameterPx * 0.5,
    centerPx: Object.freeze([...anchor]),
  });
}

export function captureBodyCollisionProfile(body) {
  if (!body || !isPositiveNumber(body.w) || !isPositiveNumber(body.h)) {
    return null;
  }
  return Object.freeze({
    kind: body.collisionKind === SUPPORTED_KIND ? SUPPORTED_KIND : "rect",
    widthPx: body.w,
    heightPx: body.h,
    radiusPx: body.collisionKind === SUPPORTED_KIND
      && isPositiveNumber(body.collisionRadiusPx)
      ? body.collisionRadiusPx
      : null,
  });
}

export function applyBodyCollisionProfile(body, profile) {
  if (!body || !profile) return false;
  const centerX = body.x + body.w * 0.5;
  const bottom = body.y + body.h;
  if (profile.kind === SUPPORTED_KIND && isPositiveNumber(profile.diameterPx)) {
    body.w = profile.diameterPx;
    body.h = profile.diameterPx;
    body.collisionKind = SUPPORTED_KIND;
    body.collisionRadiusPx = profile.radiusPx || profile.diameterPx * 0.5;
  } else if (
    profile.kind === "rect"
    && isPositiveNumber(profile.widthPx)
    && isPositiveNumber(profile.heightPx)
  ) {
    body.w = profile.widthPx;
    body.h = profile.heightPx;
    body.collisionKind = "rect";
    body.collisionRadiusPx = null;
  } else {
    return false;
  }
  body.x = centerX - body.w * 0.5;
  body.y = bottom - body.h;
  return true;
}
