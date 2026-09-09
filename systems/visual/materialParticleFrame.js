import { TILE_DESTRUCTION_FX_CONFIG as ATLAS } from "../../values/tileDestructionFx.js";
import { MATERIAL_PARTICLE_POLISH as CONFIG, MATERIAL_PARTICLE_BOUNDS } from "../../values/materialParticlePolish.js";
import { MINING_IMPACT_POLISH_CONFIG, resolveMiningImpactPolish } from "../../values/miningImpactPolish.js";
import { getRenderDensity } from "./RenderDensitySystem.js";

/** Lazily add tight, padded frame aliases without editing or duplicating atlas pixels. */
export function materialParticleFrame(scene, family, sequence, displayPixels = 0) {
  let frames = CONFIG.chipFrames[family] || CONFIG.chipFrames[ATLAS.defaultFamily];
  if (displayPixels > 0 && resolveMiningImpactPolish().enabled) {
    const zoom = scene.cameras?.main?.zoom || 1;
    const required = displayPixels * zoom * getRenderDensity(scene)
      / MINING_IMPACT_POLISH_CONFIG.texture.maximumUpscale;
    const extent = number => {
      const bounds = MATERIAL_PARTICLE_BOUNDS[family]?.[number - 1];
      return bounds ? Math.max(bounds[2] - bounds[0], bounds[3] - bounds[1]) : 0;
    };
    const sharp = frames.filter(number => extent(number) >= required);
    // Reuse a larger isolated chip of the SAME material, not a magnified tiny
    // fleck or a baked explosion. Fine grit still uses the smaller source chips.
    frames = sharp.length ? sharp : frames.filter(number => extent(number) === Math.max(...frames.map(extent)));
  }
  const number = frames[((sequence % frames.length) + frames.length) % frames.length];
  const baseName = `${family}-s${String(number).padStart(2, "0")}`;
  const bounds = MATERIAL_PARTICLE_BOUNDS[family]?.[number - 1];
  const asset = ATLAS.assets.shards;
  const texture = scene.textures?.get?.(asset.key);
  if (!bounds || !texture?.add) return { name: baseName, width: asset.frameWidth, height: asset.frameHeight };
  const pad = CONFIG.framePadding;
  const x = Math.max(0, bounds[0] - pad), y = Math.max(0, bounds[1] - pad);
  const width = Math.min(asset.frameWidth, bounds[2] + pad) - x;
  const height = Math.min(asset.frameHeight, bounds[3] + pad) - y;
  const name = `${baseName}-${CONFIG.frameSuffix}`;
  if (!texture.has?.(name)) texture.add(name, 0,
    (number - 1) * asset.frameWidth + x, ATLAS.families[family] * asset.frameHeight + y, width, height);
  return { name, width, height };
}

/** Size the visible fragment's longest dimension, retaining its authored aspect ratio. */
export function sizeMaterialParticle(image, frame, size) {
  const longest = Math.max(frame.width, frame.height);
  image.setDisplaySize?.(size * frame.width / longest, size * frame.height / longest);
}
