import { TOWN_REST } from '../../values/townRest.js';
import { TownRestSystem } from '../../systems/environment/TownRestSystem.js';
import { TownRestView } from '../../systems/visual/TownRestView.js';
import { TownRestGuidanceSystem } from '../../systems/onboarding/TownRestGuidanceSystem.js';
import { TownRestGuidanceView } from '../../systems/visual/TownRestGuidanceView.js';
import { isInTownForRest } from './TownRestSavePolicy.js';
export function createTownRest(scene) {
  if (!TOWN_REST.enabled) return null;
  scene._townRestCommit = false;
  const rest = new TownRestSystem(scene, new TownRestView(scene), {
    inTown: () => isInTownForRest(scene),
    consumeBlockedMenuInput: () => scene.gameInputHandler?.discardOverlayInput(),
    beginDozing: duration => scene.sessionAwakeningController?.beginDozing(duration),
    beginTimelapse: (duration, fade) => scene.sessionAwakeningController?.beginSleepTimelapse(duration, fade),
    updateDozing: elapsed => scene.sessionAwakeningController?.updateDozing(elapsed),
    awaken: () => scene.sessionAwakeningController?.awakenFromSleep(),
    isAwakening: () => scene.sessionAwakeningController?.source === 'rest'
      && scene.sessionAwakeningController.active,
    endPresentation: () => {
      const presentation = scene.sessionAwakeningController;
      if (presentation?.source !== 'session') presentation?.finish('rest-ended');
    },
    save: async () => {
      if (!isInTownForRest(scene) || scene._saveWritesBlocked) return false;
      scene._townRestCommit = true;
      try {
        return await scene.flushDugTilesSave({ force: true, reason: TOWN_REST.copy.saveReason });
      } finally { scene._townRestCommit = false; }
    },
  });
  rest.guidance = new TownRestGuidanceSystem(scene, new TownRestGuidanceView(scene), {
    arrived: () => rest.isInRange(),
    resting: () => rest.isActive(),
    target: () => ({ x: rest.view.x, feetY: rest.view.y,
      y: rest.view.y - (rest.view.bed?.displayHeight || 0) - TOWN_REST.guidance.targetGap }),
  });
  return rest;
}
