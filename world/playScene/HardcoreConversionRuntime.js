import { isHardcoreMode } from "../../values/hardcoreMode.js";
import {
  enterHardcoreBlockingModal,
  leaveHardcoreBlockingModal,
} from "./HardcoreModalStateBridge.js";
import { ensureHardcorePresentationRuntime } from
  "./HardcorePresentationRuntime.js";

export async function requestHardcoreConversion(scene, dependencies) {
  const runtime = scene._hardcoreRuntime;
  if (
    !runtime
    || isHardcoreMode(runtime.system.state)
    || !dependencies.isFlightUnlocked(scene)
    || runtime.modal.isVisible
  ) return false;

  if (!await ensureHardcorePresentationRuntime(scene, runtime)) {
    dependencies.flash(
      scene,
      "Hardcore presentation is still loading. No save rule changed.",
      runtime.config.feedback.errorColor,
      runtime.config.feedback.errorFlashMs,
    );
    return false;
  }
  enterHardcoreBlockingModal(scene);
  return runtime.modal.showConfirmation({
    title: runtime.config.copy.boboConfirmationTitle,
    body: runtime.config.copy.boboConfirmationBody,
    onCancel: () => leaveHardcoreBlockingModal(scene),
    onConfirm: async () => {
      scene.playerController?.fillGemPower?.();
      if (!runtime.system.convertFromCasual("bobo")) {
        leaveHardcoreBlockingModal(scene);
        return false;
      }
      dependencies.syncSceneModeData(scene);
      dependencies.processSystemEvents(scene);
      const saved = await dependencies.persistNow(scene);
      if (!saved) {
        dependencies.flash(
          scene,
          runtime.config.copy.conversionSaveFailed,
          runtime.config.feedback.errorColor,
          runtime.config.feedback.errorFlashMs,
        );
      }
      dependencies.flash(
        scene,
        runtime.config.feedback.armedText,
        runtime.config.feedback.armedColor,
        runtime.config.feedback.armedFlashMs,
      );
      leaveHardcoreBlockingModal(scene);
      return true;
    },
  });
}
