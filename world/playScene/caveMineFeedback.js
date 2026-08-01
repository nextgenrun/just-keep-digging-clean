import { CAVE_SCENE_CONFIG } from "../../values/caveSceneConfig.js";
import { GAMEFEEL_CONFIG } from "../../values/gamefeel.js";
import {
  getMaterialFeedback,
  getMineShakeSignature,
} from "../../values/materialFeedback.js";

export function dispatchCaveMineFeedback(scene, originScene, result) {
  if (!result?.success) return false;
  const tileType = result.tileType ?? result.typeBeforeDamage ?? null;
  const material = getMaterialFeedback(tileType);
  const actualFps = Number(scene.game?.loop?.actualFps);
  if (!Number.isFinite(actualFps) || actualFps >= GAMEFEEL_CONFIG.shake.minFps) {
    const signature = getMineShakeSignature(tileType, {
      critical: result.isCriticalHit,
      destroyed: result.destroyed,
    });
    const impactScale = result.destroyed ? 1 : 0.65;
    scene.shakeSystem?.shake(
      signature,
      impactScale * material.shakeScale * CAVE_SCENE_CONFIG.feedback.mineShakeScale,
    );
  }

  const sounds = originScene?.soundSystem;
  if (result.destroyed) {
    sounds?.playTileBreak?.({
      rate: material.breakRate,
      volume: material.breakVolume,
    });
  } else {
    sounds?.playTileHit?.({ rate: material.digRate });
  }
  return true;
}
