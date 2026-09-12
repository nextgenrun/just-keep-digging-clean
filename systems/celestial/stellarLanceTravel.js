import { STELLAR_LANCE_PRESENTATION as C } from "../../values/stellarLancePresentation.js";

/** Place the flame's rear on the upper surface of the authored hand/foot. */
export function resolveStellarLanceOrigin(contact, pose) {
  if (!contact.authored) return { ...contact.point };
  const lift = pose.height * pose.scaleY * C.contactTopLiftFraction;
  return {
    x: contact.rawPoint.x + Math.sin(pose.rotation || 0) * lift,
    y: contact.rawPoint.y - Math.cos(pose.rotation || 0) * lift,
  };
}

/** A straight world-space route at constant speed, independent of damage states. */
export function resolveStellarLanceTravel(origin, path, direction, tileSize) {
  const tile = path.endTile;
  const end = { x: (tile.tx + 0.5) * tileSize, y: (tile.ty + 0.5) * tileSize };
  if (!path.lane) {
    if (direction.x) end.y = origin.y;
    else end.x = origin.x;
  }
  // A deeply extended kick can already be beyond the final tile center.
  // Clamp that cosmetic route at contact instead of sending a shot backwards.
  if ((end.x - origin.x) * direction.x + (end.y - origin.y) * direction.y < 0) {
    end.x = origin.x; end.y = origin.y;
  }
  const dx = end.x - origin.x, dy = end.y - origin.y;
  const headDistance = Math.hypot(dx, dy);
  const unit = headDistance > 0 ? { x: dx / headDistance, y: dy / headDistance } : direction;
  // The moving anchor is the flame's rear; its leading edge stops at the target.
  const noseOffset = C.displayWidthPx * (1 - C.originX);
  const distance = Math.max(0, headDistance - noseOffset);
  end.x = origin.x + unit.x * distance; end.y = origin.y + unit.y * distance;
  return { origin, end, unit, distance, noseOffset, angle: Math.atan2(unit.y, unit.x) * 180 / Math.PI,
    durationMs: Math.max(C.minimumTravelMs, distance / C.speedPxPerSecond * 1000) };
}

export function resolveStellarLanceHit(travel, hit, tileSize) {
  const center = { x: (hit.tx + 0.5) * tileSize, y: (hit.ty + 0.5) * tileSize };
  const projected = (center.x - travel.origin.x) * travel.unit.x
    + (center.y - travel.origin.y) * travel.unit.y;
  const face = tileSize / 2 / Math.max(Math.abs(travel.unit.x), Math.abs(travel.unit.y));
  // Every impact, including the first mined tile, waits for the visible flame
  // head to enter that tile.  The resolver's distance remains authoritative;
  // this only aligns its cosmetic impact cue with the rendered leading edge.
  const distance = Math.min(travel.distance + travel.noseOffset, Math.max(0, projected - face));
  return { delayMs: Math.max(0, distance - travel.noseOffset) / C.speedPxPerSecond * 1000,
    worldPoint: { x: travel.origin.x + travel.unit.x * distance,
      y: travel.origin.y + travel.unit.y * distance } };
}
