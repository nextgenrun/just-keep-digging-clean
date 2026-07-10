/**
 * SceneTransition — unified fade transition language between scenes.
 *
 * Wraps scene.start() with a camera fade-out → switch → fade-in sequence
 * so every scene change feels intentional and cinematic instead of a hard cut.
 *
 * Usage:
 *   import { transitionTo } from "../ui/scenes/SceneTransition.js";
 *   transitionTo(this, "StartMenuScene", { saveSlot: 1 });
 *
 * SSOT: values/sceneTransitionConfig.js
 */
import { SCENE_TRANSITION_CONFIG } from "../../values/sceneTransitionConfig.js";

/**
 * Transition from the current scene to a target scene with a fade.
 * @param {Phaser.Scene} scene - the current scene (this)
 * @param {string} targetKey - target scene key
 * @param {object} [data={}] - data to pass to the target scene
 */
export function transitionTo(scene, targetKey, data = {}) {
  const cfg = SCENE_TRANSITION_CONFIG;
  if (!cfg.enabled || !scene?.cameras?.main) {
    scene?.scene?.start(targetKey, data);
    return;
  }

  const cam = scene.cameras.main;
  const fadeOutMs = cfg.fadeOutMs;
  const fadeInMs = cfg.fadeInMs;

  // Fade out to black, then switch scene
  cam.fadeOut(fadeOutMs, cfg.color >> 16 & 0xff, cfg.color >> 8 & 0xff, cfg.color & 0xff);

  if (cfg.waitForFadeOut) {
    cam.once("camerafadeoutcomplete", () => {
      scene.scene.start(targetKey, data);
    });
  } else {
    scene.scene.start(targetKey, data);
  }
}

/**
 * Fade in the camera at scene start (call from target scene's create()).
 * @param {Phaser.Scene} scene - the new scene (this)
 */
export function fadeInOnStart(scene) {
  const cfg = SCENE_TRANSITION_CONFIG;
  if (!cfg.enabled || !scene?.cameras?.main) return;

  const cam = scene.cameras.main;
  cam.fadeIn(cfg.fadeInMs, cfg.color >> 16 & 0xff, cfg.color >> 8 & 0xff, cfg.color & 0xff);
}
