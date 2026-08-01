import {
  getCampfireWorldLoadAssets,
  readStoredCampfireLevel,
} from "../../values/campfireConfig.js";
import { resolveRuntimeFeatureAssetDeferralEnabled } from
  "../../values/runtimeAssetLoading.js";

export function queueWorldLoadFeatureAssets(
  scene,
  {
    saveSlot = 1,
    storage = globalThis.localStorage,
    search = globalThis.location?.search || "",
  } = {},
) {
  if (!scene?.load?.image || !resolveRuntimeFeatureAssetDeferralEnabled(undefined, search)) {
    return Object.freeze({ queued: false, queuedCount: 0, campfireLevel: 1, assets: [] });
  }

  const campfireLevel = readStoredCampfireLevel(saveSlot, storage);
  const assets = getCampfireWorldLoadAssets(campfireLevel);
  let queuedCount = 0;
  for (const asset of assets) {
    if (scene.textures?.exists?.(asset.key)) continue;
    scene.load.image(asset.key, asset.path);
    queuedCount += 1;
  }
  return Object.freeze({
    queued: queuedCount > 0,
    queuedCount,
    campfireLevel,
    assets,
  });
}
