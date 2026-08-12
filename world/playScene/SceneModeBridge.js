import { SCENE_SUSPENSION_KINDS } from "../../values/sceneRuntime.js";

export function releaseSceneSuspension(scene, property) {
  const token = scene[property];
  scene[property] = null;
  return token?.release?.() === true;
}

export function enterSceneBasePhase(scene, phase, owner) {
  scene.sceneModeController.clearSuspensions();
  scene._dialogSuspension = null;
  scene._pauseSuspension = null;
  scene._hardcoreModalSuspension = null;
  scene._shopSuspensionTokens = [];
  scene.setSceneBasePhase(phase, { owner });
}

export function setBlockingSurfaceOpen(scene, open) {
  scene._shopSuspensionTokens ||= [];
  if (open) {
    scene._shopSuspensionTokens.push(scene.acquireSceneSuspension(
      SCENE_SUSPENSION_KINDS.SHOP,
      "blocking-gameplay-surface",
    ));
  } else {
    scene._shopSuspensionTokens.pop()?.release?.();
  }
  scene.playerController?.setControlsEnabled?.(scene.sceneModeController.isGameplayActive);
}
