import {
  buildHardcoreDeathRecapPages,
  sanitizeHardcoreMemorialRecord,
} from "../../systems/hardcore/hardcoreMemorialRecord.js";

export function enterHardcoreBlockingModal(scene) {
  scene.hidePauseMenu?.();
  scene.shopOverlay?.hide?.();
  scene.gameState = "hardcore-modal";
  scene.playerController?.setControlsEnabled?.(false);
  scene.isDigAnimating = false;
  scene.aimBox?.setVisible?.(false);
}

export function leaveHardcoreBlockingModal(scene) {
  if (scene._hardcoreDeathInProgress) return;
  scene.gameState = "playing";
  scene.playerController?.setControlsEnabled?.(true);
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
