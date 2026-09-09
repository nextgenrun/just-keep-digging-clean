// A slow neutral glint moves through the baked art; its geometry stays fixed.
import { BAKED_STAR_LAYOUT } from "../../values/bakedCelestialUi.js";
import { resolveWorldVisualSemanticStarIdleEnabled } from "../../values/worldVisualSemanticAssets.js";

export function animateBakedStar(scene, image, identityIndex) {
  if (!image || !resolveWorldVisualSemanticStarIdleEnabled()
    || globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return image;
  const cfg = BAKED_STAR_LAYOUT;
  const phase = identityIndex * cfg.motionPhaseStride;
  const neutral = level => (level << 16) | (level << 8) | level;
  const update = time => {
    if (!image.active) return;
    const angle = time / cfg.motionPeriodMs * Math.PI * 2 + phase;
    const shades = [0, Math.PI / 2, Math.PI, Math.PI * 1.5].map(offset =>
      neutral(Math.round(cfg.motionMinimum + cfg.motionRange * (Math.sin(angle + offset) + 1) / 2)));
    image.setTint(...shades);
  };
  image.setData("bakedStarMotion", true);
  image.setData("starIdentityIndex", identityIndex);
  scene.events.on("update", update);
  image.once("destroy", () => scene.events.off("update", update));
  update(scene.time.now);
  return image;
}
