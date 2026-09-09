import { TILE_TYPES } from "../values/tileTypes.js";
import { FREESOUND_AUDIO } from "../values/freesoundAudio.js";

const clamp = value => Math.max(0, Math.min(1, value));

export function starPocketSpatial(player, star, world, config = FREESOUND_AUDIO.stars) {
  const dx = star.tx + 0.5 - player.x;
  const dy = star.ty + 0.5 - player.y;
  const distance = Math.hypot(dx, dy);
  const linear = clamp((config.exitRadius - distance) / (config.exitRadius - config.fullRadius));
  const weight = linear * linear * (3 - 2 * linear);
  const samples = Math.min(config.maxRockSamples, Math.ceil(distance / config.rockSampleStep));
  let rock = 0;
  for (let i = 1; i < samples; i++) {
    const tx = Math.floor(player.x + dx * i / samples), ty = Math.floor(player.y + dy * i / samples);
    if (tx === star.tx && ty === star.ty) continue;
    const type = world?.getTileType?.(tx, ty);
    if (type != null && type !== TILE_TYPES.AIR && type !== TILE_TYPES.SKY_TILE) rock++;
  }
  const occlusion = clamp(rock / Math.max(1, samples - 1));
  return { distance, dx, dy, weight,
    gain: weight * (1 - (1 - config.rockGain) * occlusion),
    pan: Math.max(-config.maxPan, Math.min(config.maxPan, dx / Math.max(1, distance) * config.maxPan)),
    cutoff: config.openCutoff + (config.rockCutoff - config.openCutoff) * occlusion,
    occlusion, vertical: dy < 0 ? "above" : "below" };
}

/** A small throttled read-only tile scan; never expands the refuge authority. */
export function findAudibleStars(player, world, config = FREESOUND_AUDIO.stars) {
  const radius = Math.ceil(config.exitRadius);
  const stars = [];
  for (let y = -radius; y <= radius; y++) for (let x = -radius; x <= radius; x++) {
    const tx = Math.floor(player.x) + x, ty = Math.floor(player.y) + y;
    if (world?.inBounds?.(tx, ty) === false || world?.getTileType?.(tx, ty) !== TILE_TYPES.SKY_TILE) continue;
    const distance = Math.hypot(tx + 0.5 - player.x, ty + 0.5 - player.y);
    if (distance <= config.exitRadius) stars.push({ tx, ty, key: `${tx},${ty}`, distance,
      identity: world.getSkyTileIdentity?.(tx, ty) ?? 0 });
  }
  return stars.sort((a, b) => a.distance - b.distance || a.ty - b.ty || a.tx - b.tx);
}
