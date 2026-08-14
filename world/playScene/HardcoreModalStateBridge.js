import {
  buildHardcoreDeathRecapPages,
  sanitizeHardcoreMemorialRecord,
} from "../../systems/hardcore/hardcoreMemorialRecord.js";
import { SCENE_SUSPENSION_KINDS } from "../../values/sceneRuntime.js";

export function enterHardcoreBlockingModal(scene) {
  // A modal launched from the ESC menu must release the pause suspension,
  // not merely destroy its visuals. Otherwise closing the modal leaves the
  // scene paused with no panel and controls permanently disabled.
  if (scene._pausePanel || scene.gameState === "paused") scene.resumeGame?.();
  else scene.hidePauseMenu?.();
  scene.shopOverlay?.hide?.();
  scene._hardcoreModalSuspension ||= scene.acquireSceneSuspension(
    SCENE_SUSPENSION_KINDS.HARDCORE_MODAL,
    "hardcore-modal",
  );
  scene.playerController?.setControlsEnabled?.(false);
  scene.isDigAnimating = false;
  scene.aimBox?.setVisible?.(false);
}

export function leaveHardcoreBlockingModal(scene) {
  if (scene._hardcoreDeathInProgress) return;
  scene._hardcoreModalSuspension?.release?.();
  scene._hardcoreModalSuspension = null;
  scene.playerController?.setControlsEnabled?.(scene.sceneModeController.isGameplayActive);
  scene.aimBox?.setVisible?.(true);
}

export function requestHardcoreMemorialInspection(scene, rawRecord) {
  const runtime = scene._hardcoreRuntime;
  if (
    !runtime
    || runtime.modal.isVisible
    || scene._hardcoreDeathInProgress
  ) {
    return false;
  }

  const record = sanitizeHardcoreMemorialRecord(rawRecord);
  enterHardcoreBlockingModal(scene);
  const shown = runtime.modal.showMemorial({
    reason: record.reason,
    depth: record.depth,
    slotId: record.slotId,
    pages: buildHardcoreDeathRecapPages(record),
    onClose: () => leaveHardcoreBlockingModal(scene),
  });
  if (!shown) leaveHardcoreBlockingModal(scene);
  return shown;
}
