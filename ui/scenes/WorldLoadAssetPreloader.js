import {
  getCampfireWorldLoadAssets,
  sanitizeCampfireData,
} from "../../values/campfireConfig.js";
import {
  RUNTIME_ASSET_LOADING,
  RUNTIME_ASSET_RESIDENCY_CLASSES,
  resolveRuntimeFeatureAssetDeferralEnabled,
} from "../../values/runtimeAssetLoading.js";
import { getHardcoreMemorialPreloadAssets } from "../../values/hardcoreMemorials.js";
import {
  isHardcoreMode,
} from "../../values/hardcoreMode.js";
import {
  getHardcoreModeOnlyPreloadAssets,
  getTypedConfirmationPreloadAssets,
} from "../../values/hardcoreModeAssetPacks.js";

function queueImages(scene, catalog, assets, metadata) {
  let queuedCount = 0;
  for (const asset of assets) {
    if (scene.textures?.exists?.(asset.key)) continue;
    if (catalog && !catalog.registerQueuedAsset(asset, metadata)) continue;
    scene.load.image(asset.key, asset.path);
    queuedCount += 1;
  }
  return queuedCount;
}

export function queueWorldLoadFeatureAssets(
  scene,
  {
    saveSlot = 1,
    campfireData = null,
    hardcoreModeData = null,
    search = globalThis.location?.search || "",
  } = {},
) {
  if (!scene?.load?.image || !resolveRuntimeFeatureAssetDeferralEnabled(undefined, search)) {
    return Object.freeze({
      queued: false,
      queuedCount: 0,
      campfireQueuedCount: 0,
      sharedUiQueuedCount: 0,
      modeQueuedCount: 0,
      campfireLevel: 1,
      assets: [],
    });
  }

  const catalog = scene.registry?.get?.("runtimeAssetCatalog") || null;
  const campfireLevel = sanitizeCampfireData(campfireData).level;
  const assets = getCampfireWorldLoadAssets(campfireLevel);
  const queuedCount = queueImages(scene, catalog, assets, {
    owner: RUNTIME_ASSET_LOADING.owners.featureCampfire,
    priority: RUNTIME_ASSET_LOADING.priorities.featureCampfire,
    residencyClass: RUNTIME_ASSET_RESIDENCY_CLASSES.onDemand,
    packId: `campfire-world-load:${campfireLevel}`,
    consumers: ["world-load-campfire"],
    managed: true,
  });
  const sharedUiAssets = getTypedConfirmationPreloadAssets();
  const sharedUiQueuedCount = queueImages(scene, catalog, sharedUiAssets, {
    owner: RUNTIME_ASSET_LOADING.owners.typedConfirmation,
    priority: RUNTIME_ASSET_LOADING.priorities.playerCore,
    residencyClass: RUNTIME_ASSET_RESIDENCY_CLASSES.core,
    packId: "ui:typed-confirmation",
    consumers: ["depth-warning", "hardcore-modal", "star-consumption"],
    managed: false,
  });
  const modeAssets = isHardcoreMode(hardcoreModeData)
    ? [...getHardcoreModeOnlyPreloadAssets(), ...getHardcoreMemorialPreloadAssets()]
    : [];
  const modeQueuedCount = queueImages(scene, catalog, modeAssets, {
    owner: RUNTIME_ASSET_LOADING.owners.hardcoreMode,
    priority: RUNTIME_ASSET_LOADING.priorities.playerMode,
    residencyClass: RUNTIME_ASSET_RESIDENCY_CLASSES.mode,
    packId: "hardcore-mode",
    consumers: ["hardcore-mode"],
    managed: false,
  });
  return Object.freeze({
    queued: queuedCount + sharedUiQueuedCount + modeQueuedCount > 0,
    queuedCount: queuedCount + sharedUiQueuedCount + modeQueuedCount,
    campfireQueuedCount: queuedCount,
    sharedUiQueuedCount,
    modeQueuedCount,
    campfireLevel,
    assets: Object.freeze([...assets, ...sharedUiAssets, ...modeAssets]),
  });
}
