import {
  WORLD_VISUAL_SEMANTIC_ASSETS,
  resolveWorldVisualSemanticStarIdleEnabled,
} from "../../values/worldVisualSemanticAssets.js";

export function installUiStarIdleMotionFrames(
  scene,
  config = WORLD_VISUAL_SEMANTIC_ASSETS,
  search = globalThis.location?.search || "",
) {
  const motion = config.skyTile?.idleMotion;
  const atlas = motion?.atlas;
  if (
    !motion
    || !atlas
    || !resolveWorldVisualSemanticStarIdleEnabled(config, search)
    || !scene?.textures?.exists?.(atlas.key)
    || typeof scene.textures.get !== "function"
  ) return null;
  const texture = scene.textures.get(atlas.key);
  for (let index = 0; index < atlas.frameCount; index += 1) {
    const frameName = `${atlas.framePrefix}${index}`;
    if (texture.has(frameName)) continue;
    texture.add(
      frameName,
      0,
      (index % atlas.columns) * atlas.frameSizePx,
      Math.floor(index / atlas.columns) * atlas.frameSizePx,
      atlas.frameSizePx,
      atlas.frameSizePx,
    );
  }
  return motion;
}

function ensureUiStarIdleAnimation(scene, motion, variant) {
  if (!scene?.anims || typeof scene.anims.exists !== "function") return null;
  const key = `${motion.ui.animationKeyPrefix}${variant}`;
  if (scene.anims.exists(key)) return key;
  const firstFrame = variant * motion.atlas.framesPerVariant;
  const frames = Array.from(
    { length: motion.atlas.framesPerVariant },
    (_, index) => ({
      key: motion.atlas.key,
      frame: `${motion.atlas.framePrefix}${firstFrame + index}`,
    }),
  );
  const animation = scene.anims.create?.({
    key,
    frames,
    frameRate: 1000 / motion.framePeriodMs,
    repeat: motion.ui.repeat,
  });
  return (animation || scene.anims.exists(key)) ? key : null;
}

function addUiStarIdleMotion(
  scene,
  parent,
  { x, y, size, identityIndex, alpha, scale },
) {
  const motion = installUiStarIdleMotionFrames(scene);
  if (!motion || typeof scene.add?.sprite !== "function") return null;
  const variant = Math.max(0, Math.floor(identityIndex || 0))
    % motion.atlas.variantCount;
  const animationKey = ensureUiStarIdleAnimation(scene, motion, variant);
  if (!animationKey) return null;
  const localFrame = (
    Math.max(0, Math.floor(identityIndex || 0)) * motion.ui.phaseFrameStride
  ) % motion.atlas.framesPerVariant;
  const absoluteFrame = variant * motion.atlas.framesPerVariant + localFrame;
  const sprite = scene.add.sprite(
    x,
    y,
    motion.atlas.key,
    `${motion.atlas.framePrefix}${absoluteFrame}`,
  ).setDisplaySize(size * scale, size * scale)
    .setAlpha(alpha)
    .setBlendMode(motion.blendMode);
  parent.add(sprite);
  sprite.play(animationKey);
  sprite.anims?.setProgress?.(
    localFrame / Math.max(1, motion.atlas.framesPerVariant - 1),
  );
  return sprite;
}

export function addUiStarIdleSelectorMotion(
  scene,
  parent,
  { x, y, size, identityIndex, selected },
) {
  const ui = WORLD_VISUAL_SEMANTIC_ASSETS.skyTile.idleMotion.ui;
  return addUiStarIdleMotion(scene, parent, {
    x,
    y,
    size,
    identityIndex,
    alpha: selected ? ui.selectedSelectorAlpha : ui.selectorAlpha,
    scale: ui.selectorScale,
  });
}

export function addUiStarIdlePreviewMotion(
  scene,
  parent,
  { x, y, size, identityIndex },
) {
  const ui = WORLD_VISUAL_SEMANTIC_ASSETS.skyTile.idleMotion.ui;
  return addUiStarIdleMotion(scene, parent, {
    x,
    y,
    size,
    identityIndex,
    alpha: ui.previewAlpha,
    scale: ui.previewScale,
  });
}
