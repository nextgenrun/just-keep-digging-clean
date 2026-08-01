import { ASSET_KEYS } from "../../values/assetKeys.js";
import { getCampfireTierAsset } from "../../values/campfireConfig.js";
import {
  getStarBlockPulsePreloadAssets,
  getStarBlockSteadyLightPreloadAssets,
} from "../../values/lightConfig.js";
import {
  RUNTIME_ASSET_LOADING,
  RUNTIME_FEATURE_ASSET_GROUP_IDS,
} from "../../values/runtimeAssetLoading.js";
import { getCollectedStarReleasePreloadAssets } from
  "../../values/starConstellations.js";
import { getStarDiscoveryPreloadAssets } from
  "../../values/starRarityProgression.js";
import { STARLIGHT_TALENT_TREE_CONFIG } from
  "../../values/starlightTalentTree.js";
import { TITAN_DISCOVERY_CONFIG } from "../../values/titanDiscoveries.js";
import { WORLD_MAP_CONFIG } from "../../values/worldMapConfig.js";

function deduplicateAssets(assets) {
  const byKey = new Map();
  for (const asset of assets) {
    if (!asset?.key || !asset?.path || byKey.has(asset.key)) continue;
    byKey.set(asset.key, Object.freeze({
      key: asset.key,
      path: asset.path,
      type: asset.type || RUNTIME_ASSET_LOADING.types.image,
    }));
  }
  return Object.freeze([...byKey.values()]);
}

function getStarlightAssets() {
  const keys = ASSET_KEYS.ui.starlightTalentTree;
  const source = STARLIGHT_TALENT_TREE_CONFIG.assets;
  return Object.entries(keys).flatMap(([name, key]) => {
    const file = source.files[name];
    return file ? [{ key, path: `${source.basePath}${file}` }] : [];
  });
}

function getGroupSettings(groupId, config) {
  if (groupId.startsWith(RUNTIME_FEATURE_ASSET_GROUP_IDS.campfirePrefix)) {
    return config.featureResidency.groups.campfire;
  }
  return config.featureResidency.groups[groupId] || null;
}

function getGroupAssets(groupId) {
  if (groupId === RUNTIME_FEATURE_ASSET_GROUP_IDS.starBlockFx) {
    return [
      ...getStarBlockSteadyLightPreloadAssets(),
      ...getStarBlockPulsePreloadAssets(),
      ...getCollectedStarReleasePreloadAssets(),
      ...getStarDiscoveryPreloadAssets(),
    ];
  }
  if (groupId === RUNTIME_FEATURE_ASSET_GROUP_IDS.starlight) {
    return [
      ...getStarlightAssets(),
      ...getStarDiscoveryPreloadAssets(),
    ];
  }
  if (groupId === RUNTIME_FEATURE_ASSET_GROUP_IDS.titanArchive) {
    return TITAN_DISCOVERY_CONFIG.definitions.map(definition => definition.asset);
  }
  if (groupId === RUNTIME_FEATURE_ASSET_GROUP_IDS.worldMap) {
    return [{ key: ASSET_KEYS.ui.worldMapFrame, path: WORLD_MAP_CONFIG.assetPath }];
  }
  if (groupId.startsWith(RUNTIME_FEATURE_ASSET_GROUP_IDS.campfirePrefix)) {
    const level = Number(groupId.slice(
      RUNTIME_FEATURE_ASSET_GROUP_IDS.campfirePrefix.length,
    ));
    return [getCampfireTierAsset(level)];
  }
  return [];
}

export function getRuntimeFeatureAssetGroup(
  groupId,
  config = RUNTIME_ASSET_LOADING,
) {
  const settings = getGroupSettings(String(groupId || ""), config);
  if (!settings) return null;
  const assets = deduplicateAssets(getGroupAssets(groupId));
  return Object.freeze({ id: groupId, assets, ...settings });
}
