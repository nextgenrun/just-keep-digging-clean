import { PLAYER_VOICE_CONFIG } from
  "../../values/playerVoiceCharacterLeoV1.generated.js";
import { resolveInventoryFullnessState } from
  "../../systems/visual/inventoryFullnessState.js";

const previousCriticalState = new WeakMap();

/** Emits only the rising edge into the final authored inventory-fullness band. */
export function updatePlayerVoiceInventoryState(scene, resources) {
  if (!scene) return null;
  const fullness = resolveInventoryFullnessState(resources);
  const critical = fullness.fullnessRatio >= PLAYER_VOICE_CONFIG.inventoryCriticalRatio;
  if (!previousCriticalState.has(scene)) {
    previousCriticalState.set(scene, critical);
    return fullness;
  }

  const wasCritical = previousCriticalState.get(scene) === true;
  previousCriticalState.set(scene, critical);
  if (critical && !wasCritical) {
    scene.soundSystem?.playPlayerVoiceEvent?.(
      PLAYER_VOICE_CONFIG.eventIds.inventoryCritical,
      {
        cargoUnits: fullness.cargoUnits,
        capacityUnits: fullness.visualCapacityUnits,
        fullnessRatio: fullness.fullnessRatio,
        tags: ["full"],
      },
    );
  }
  return fullness;
}
