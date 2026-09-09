import { CAVE_SCENE_CONFIG } from "../../values/caveSceneConfig.js";
import { GAMEFEEL_CONFIG } from "../../values/gamefeel.js";
import {
  getMaterialFeedback,
  getMineShakeSignature,
} from "../../values/materialFeedback.js";

export function dispatchCaveMineFeedback(scene, originScene, result, { contactFeedback = false } = {}) {
  if (!result?.success) return false;
  const tileType = result.typeBeforeDamage ?? result.tileType ?? null;
  const material = getMaterialFeedback(tileType);
  const actualFps = Number(scene.game?.loop?.actualFps);
  if (!contactFeedback && (!Number.isFinite(actualFps) || actualFps >= GAMEFEEL_CONFIG.shake.minFps)) {
    const signature = getMineShakeSignature(tileType);
    const impactScale = result.destroyed ? 1 : 0.65;
    scene.shakeSystem?.shake(
      signature,
      impactScale * material.shakeScale * CAVE_SCENE_CONFIG.feedback.mineShakeScale,
    );
  }

  const sounds = originScene?.soundSystem;
  if (result.destroyed) {
    sounds?.playTileBreak?.({
      tileType,
      rate: material.breakRate,
      volume: material.breakVolume,
    });
  } else {
    sounds?.playDig?.({ rate: material.digRate, tileType });
  }
  return true;
}
