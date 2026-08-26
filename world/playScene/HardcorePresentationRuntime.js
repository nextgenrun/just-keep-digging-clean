import { HardcoreMemorialStore } from
  "../../systems/hardcore/HardcoreMemorialStore.js";
import { HardcoreMemorialWorldSystem } from
  "../../systems/visual/HardcoreMemorialWorldSystem.js";
import { HardcoreStatusHud } from "../../systems/visual/HardcoreStatusHud.js";
import { RUNTIME_FEATURE_ASSET_GROUP_IDS } from
  "../../values/runtimeAssetLoading.js";

export async function ensureHardcorePresentationRuntime(scene, runtime) {
  if (!scene || !runtime) return false;
  const manager = scene.runtimeFeatureAssetManager;
  if (manager?.enabled) {
    const result = await manager.ensureGroup(
      RUNTIME_FEATURE_ASSET_GROUP_IDS.hardcoreMode,
      { consumer: "hardcore-mode", adoptExisting: true },
    );
    if (!result.ready) return false;
  }
  if (!runtime.hud?.isReady?.()) {
    runtime.hud?.destroy?.();
    runtime.hud = new HardcoreStatusHud(scene, runtime.config);
  }
  if (!runtime.hud.isReady()) return false;
  scene.hardcoreMemorialStore ||= new HardcoreMemorialStore();
  scene.hardcoreMemorialSystem ||= new HardcoreMemorialWorldSystem(
    scene,
    scene.hardcoreMemorialStore.getForSlot(scene.saveSlot),
  );
  return true;
}
