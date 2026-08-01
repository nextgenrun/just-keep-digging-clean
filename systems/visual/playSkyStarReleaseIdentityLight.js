import { HUD_LAYOUT } from "../../values/hudLayout.js";
import {
  STAR_IDENTITY_LIBRARY_CONFIG,
} from "../../values/starIdentityLibrary.js";

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

/**
 * Moves the collected identity's authored light behind its crisp crystal.
 */
export function playSkyStarReleaseIdentityLight({
  scene,
  motion,
  releaseFx,
  createImage,
  destroyImage,
}) {
  const entry = motion?.entry;
  if (
    !entry?.lightTextureKey
    || !entry?.lightTextureFrame
    || typeof createImage !== "function"
  ) return null;

  const visual = STAR_IDENTITY_LIBRARY_CONFIG.visual;
  const light = createImage(
    motion.startWorldX,
    motion.startWorldY,
    entry.lightTextureKey,
    HUD_LAYOUT.hudDepth - 6.5,
    entry.displaySize * visual.releaseLightDisplayScale,
    0,
    globalThis.Phaser?.BlendModes?.ADD,
    entry.lightTextureFrame,
  );
  if (!light) return null;

  const baseScaleX = light.scaleX;
  const baseScaleY = light.scaleY;
  light.setScale?.(
    baseScaleX * visual.releaseLightStartScale,
    baseScaleY * visual.releaseLightStartScale,
  );
  scene.tweens.add({
    targets: light,
    x: motion.startWorldX + motion.lateralDrift,
    y: motion.startWorldY - motion.riseDistance,
    angle: motion.rotation * 0.7,
    delay: releaseFx.liftDelayMs,
    duration: motion.duration,
    ease: "Sine.inOut",
    onUpdate: tween => {
      const progress = clamp01(tween.progress);
      const baseX = motion.startWorldX + motion.lateralDrift * progress;
      light.x = baseX
        + Math.sin(progress * Math.PI * motion.swayCycles)
          * motion.swayAmplitude
          * (1 - progress);
    },
  });
  scene.tweens.add({
    targets: light,
    alpha: visual.releaseLightAlpha,
    scaleX: baseScaleX * visual.releaseLightPeakScale,
    scaleY: baseScaleY * visual.releaseLightPeakScale,
    duration: releaseFx.flashInMs,
    ease: "Sine.Out",
  });

  const totalDuration = releaseFx.liftDelayMs + motion.duration;
  const fadeDelay = releaseFx.flashInMs + releaseFx.fadeHoldMs;
  scene.tweens.add({
    targets: light,
    alpha: 0,
    scaleX: baseScaleX * visual.releaseLightEndScale,
    scaleY: baseScaleY * visual.releaseLightEndScale,
    delay: fadeDelay,
    duration: Math.max(1, totalDuration - fadeDelay),
    ease: "Sine.In",
    onComplete: () => destroyImage?.(light),
  });
  return light;
}
