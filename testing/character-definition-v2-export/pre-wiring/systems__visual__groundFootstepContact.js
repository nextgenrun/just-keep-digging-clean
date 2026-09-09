import { PLAYER_FOOTSTEP_CONTACTS } from "../../values/playerFootstepContacts.js";
import { PLAYER_RIG_CONTACT_CONFIG } from "../../values/playerRigContact.js";
import { MATERIAL_PARTICLE_POLISH } from "../../values/materialParticlePolish.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { projectRigMarkerToWorld } from "./playerRigContactGeometry.js";

export function unifiedFootstepSheet(profile, player, frame) {
  if (profile?.renderPipeline !== PLAYER_FOOTSTEP_CONTACTS.pipeline) return null;
  return PLAYER_FOOTSTEP_CONTACTS.sheets[frame?.textureKey || player?.texture?.key] || null;
}

/** Preserve legacy projection only for legacy profiles; unified samples use actual frame geometry. */
export function groundFootstepAnchor({ player, body, profile, manifest, frame, config, polished }) {
  const floor = (Number(body?.y) || 0) + (Number(body?.h ?? body?.height) || 0);
  const fallback = { x: (Number(body?.x) || 0) + (Number(body?.w ?? body?.width) || 0) / 2, y: floor };
  const sheet = polished && unifiedFootstepSheet(profile, player, frame);
  let marker = sheet?.contacts[frame?.textureFrame];
  if (!marker && profile?.renderPipeline !== PLAYER_FOOTSTEP_CONTACTS.pipeline) {
    const action = profile?.footstepRigAction || config.rig.sourceAction;
    const markers = manifest?.actions?.[action]?.rig_markers?.frames?.[String(frame?.textureFrame)];
    for (const name of PLAYER_RIG_CONTACT_CONFIG.markerGroups[config.rig.markerGroup] || []) {
      const next = markers?.[name];
      if (Array.isArray(next) && next.length >= 2 && next.every(Number.isFinite)
        && (!marker || next[1] > marker[1])) marker = next;
    }
  }
  if (!marker) return fallback;
  const width = player?.frame?.realWidth ?? player?.frame?.width ?? profile?.frameWidth;
  const height = player?.frame?.realHeight ?? player?.frame?.height ?? profile?.frameHeight;
  if (sheet && (sheet.size !== width || sheet.size !== height)) return fallback;
  const projected = projectRigMarkerToWorld({
    marker, spriteX: player?.x || 0, spriteY: player?.y || 0,
    scaleX: Math.abs(player?.scaleX ?? (profile.displaySizePx / width)),
    scaleY: Math.abs(player?.scaleY ?? (profile.displaySizePx / height)),
    frameWidth: width, frameHeight: height,
    originX: player?.originX ?? profile?.visualOriginX ?? 0.5,
    originY: player?.originY ?? profile?.visualOriginY ?? 1,
    flipX: player?.flipX === true,
  });
  return projected ? { x: projected.x, y: floor } : fallback;
}

/** Read only the supporting row, not a tile two rows below a ledge/bridge. */
export function supportedFootstepSurface(world, anchor, body, tileSize, config) {
  const ty = Math.floor((anchor.y + tileSize * config.rig.floorProbeTiles) / tileSize);
  const centerX = body.x + (body.w ?? body.width) / 2;
  for (const tx of new Set([Math.floor(anchor.x / tileSize), Math.floor(centerX / tileSize)])) {
    const tileType = world?.getTileType?.(tx, ty);
    if (tileType == null || tileType === TILE_TYPES.AIR || world?.isSolid?.(tx, ty) === false) continue;
    const inset = tileSize * MATERIAL_PARTICLE_POLISH.foot.floorInsetTiles;
    return { tileType, anchor: { x: Math.max(tx * tileSize + inset, Math.min(anchor.x, (tx + 1) * tileSize - inset)), y: anchor.y } };
  }
  return null;
}
