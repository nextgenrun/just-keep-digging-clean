import { DIG_IMPACT_CONTACTS } from "../../values/digImpactContacts.generated.js";
import { DIG_IMPACT_FX_CONFIG as CONFIG } from "../../values/digImpactFx.js";
import { projectRigMarkerToWorld } from "./playerRigContactGeometry.js";

const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const finite = point => Number.isFinite(point?.x) && Number.isFinite(point?.y);

/** Snapshot the rendered geometry, including the actual atlas frame of each contact. */
export function captureDigImpactPose(player, event) {
  const animation = player?.anims?.currentAnim;
  const frame = animation?.key === event?.animationKey
    ? animation.frames?.[event.contactSequenceIndex]?.textureFrame : null;
  return {
    sheet: player?.texture?.key,
    contactFrame: Number(frame ?? event?.contactFrame),
    visibleFrame: Number(player?.frame?.name),
    animationKey: animation?.key,
    x: player?.x, y: player?.y,
    scaleX: Math.abs(player?.scaleX ?? 1), scaleY: Math.abs(player?.scaleY ?? 1),
    width: player?.frame?.realWidth ?? player?.frame?.width,
    height: player?.frame?.realHeight ?? player?.frame?.height,
    originX: player?.originX, originY: player?.originY,
    flipX: player?.flipX === true, rotation: player?.rotation || 0,
  };
}

function project(point, pose) {
  const result = projectRigMarkerToWorld({
    marker: point, spriteX: pose.x, spriteY: pose.y,
    scaleX: pose.scaleX, scaleY: pose.scaleY,
    frameWidth: pose.width, frameHeight: pose.height,
    originX: pose.originX, originY: pose.originY, flipX: pose.flipX,
  });
  if (!result || !pose.rotation) return result;
  const x = result.x - pose.x;
  const y = result.y - pose.y;
  return {
    x: pose.x + x * Math.cos(pose.rotation) - y * Math.sin(pose.rotation),
    y: pose.y + x * Math.sin(pose.rotation) + y * Math.cos(pose.rotation),
  };
}

/** Read-only presentation anchor: retain penetration into the tile's front plane. */
export function resolveDigImpactContact({ pose, body, targetTile, tileSize }) {
  if (!(tileSize > 0) || !Number.isFinite(targetTile?.tx)
    || !Number.isFinite(targetTile?.ty) || !finite(body)) return null;
  const left = targetTile.tx * tileSize;
  const top = targetTile.ty * tileSize;
  const center = { x: body.x + body.w / 2, y: body.y + body.h / 2 };
  if (!finite(center)) return null;
  const near = {
    x: clamp(center.x, left, left + tileSize),
    y: clamp(center.y, top, top + tileSize),
  };
  let nx = center.x - near.x;
  let ny = center.y - near.y;
  const length = Math.hypot(nx, ny);
  if (length < CONFIG.directionEpsilon) { nx = pose?.flipX ? 1 : -1; ny = 0; }
  else { nx /= length; ny /= length; }
  const sheet = DIG_IMPACT_CONTACTS[pose?.sheet];
  const record = sheet && sheet.size === pose?.width && sheet.size === pose?.height
    ? Object.values(sheet.contacts).find(entry => entry[0] === pose.contactFrame) : null;
  const projected = record && project([record[1], record[2]], pose);
  const previous = record && project([record[3], record[4]], pose);
  const rawPoint = finite(projected) ? projected : near;
  const inset = tileSize * CONFIG.faceInsetTiles;
  const point = {
    x: clamp(rawPoint.x, left + inset, left + tileSize - inset),
    y: clamp(rawPoint.y, top + inset, top + tileSize - inset),
  };
  const dx = finite(previous) ? rawPoint.x - previous.x : -nx;
  const dy = finite(previous) ? rawPoint.y - previous.y : -ny;
  const travel = Math.max(CONFIG.directionEpsilon, Math.hypot(dx, dy));
  return {
    point, rawPoint, normal: { x: nx, y: ny },
    sweep: clamp((-ny * dx + nx * dy) / travel, -1, 1),
    strength: record?.[5] ?? CONFIG.fallbackStrength,
    authored: Boolean(record && finite(projected)),
    contactFrame: pose?.contactFrame, visibleFrame: pose?.visibleFrame,
  };
}
