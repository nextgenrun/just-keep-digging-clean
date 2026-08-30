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
import {
  getCollectedStarReleasePreloadAssets,
  getCollectedStarReleaseRarityAssets,
} from
  "../../values/starConstellations.js";
import {
  getStarIdentityPreloadAssets,
  STAR_IDENTITY_LIBRARY_CONFIG,
} from "../../values/starIdentityLibrary.js";
import { getStarIdentityRarityAssets } from
  "../../values/starIdentityRuntimeAssets.js";
import { CELESTIAL_TALENT_TREE_PRELOAD_ASSETS } from
  "../../values/celestialTalentTreeUi.js";
import { getTitanArchivePreloadAssets } from "../../values/titanDiscoveries.js";
import { WORLD_MAP_CONFIG } from "../../values/worldMapConfig.js";
import { getHardcoreModeOnlyPreloadAssets } from
  "../../values/hardcoreModeAssetPacks.js";
import { getHardcoreMemorialPreloadAssets } from "../../values/hardcoreMemorials.js";

function deduplicateAssets(assets) {
  const byKey = new Map();
  for (const asset of assets) {
    if (!asset?.key || !asset?.path || byKey.has(asset.key)) continue;
    byKey.set(asset.key, Object.freeze({
      ...asset,
      key: asset.key,
      path: asset.path,
      type: asset.type || RUNTIME_ASSET_LOADING.types.image,
    }));
  }
  return Object.freeze([...byKey.values()]);
}

function getGroupSettings(groupId, config) {
  if (groupId.startsWith(RUNTIME_FEATURE_ASSET_GROUP_IDS.starRarityPrefix)) {
    return config.featureResidency.groups[RUNTIME_FEATURE_ASSET_GROUP_IDS.starRarity];
  }
  if (groupId.startsWith(RUNTIME_FEATURE_ASSET_GROUP_IDS.starReleasePrefix)) {
    return config.featureResidency.groups[RUNTIME_FEATURE_ASSET_GROUP_IDS.starRelease];
  }
  if (groupId.startsWith(RUNTIME_FEATURE_ASSET_GROUP_IDS.campfirePrefix)) {
    return config.featureResidency.groups.campfire;
  }
  return config.featureResidency.groups[groupId] || null;
}

function parseGroupSuffix(groupId, prefix) {
  return Math.max(0, Math.min(5, Math.floor(
    Number(groupId.slice(prefix.length)) || 0,
  )));
}

function getGroupAssets(groupId) {
  if (groupId === RUNTIME_FEATURE_ASSET_GROUP_IDS.starBlockFx) {
    return [
      ...getStarBlockSteadyLightPreloadAssets(),
      ...getStarBlockPulsePreloadAssets(),
      ...getCollectedStarReleasePreloadAssets(),
      ...getStarIdentityPreloadAssets(),
    ];
  }
  if (groupId.startsWith(RUNTIME_FEATURE_ASSET_GROUP_IDS.starRarityPrefix)) {
    const rarity = parseGroupSuffix(
      groupId,
      RUNTIME_FEATURE_ASSET_GROUP_IDS.starRarityPrefix,
    );
    return getStarIdentityRarityAssets(rarity);
  }
  if (groupId.startsWith(RUNTIME_FEATURE_ASSET_GROUP_IDS.starReleasePrefix)) {
    const rarity = parseGroupSuffix(
      groupId,
      RUNTIME_FEATURE_ASSET_GROUP_IDS.starReleasePrefix,
    );
    return [
      getStarBlockPulsePreloadAssets()[rarity],
      ...getCollectedStarReleaseRarityAssets(rarity),
    ].filter(Boolean);
  }
  if (groupId === RUNTIME_FEATURE_ASSET_GROUP_IDS.starAtlas) {
    return [STAR_IDENTITY_LIBRARY_CONFIG.inventory.foundation];
  }
  if (groupId === RUNTIME_FEATURE_ASSET_GROUP_IDS.starlight) {
    return [...CELESTIAL_TALENT_TREE_PRELOAD_ASSETS];
  }
  if (groupId === RUNTIME_FEATURE_ASSET_GROUP_IDS.titanArchive) {
    return getTitanArchivePreloadAssets();
  }
  if (groupId === RUNTIME_FEATURE_ASSET_GROUP_IDS.worldMap) {
    return [
      { key: ASSET_KEYS.ui.worldMapFrame, path: WORLD_MAP_CONFIG.assetPath },
      {
        key: ASSET_KEYS.ui.worldMapSymbols,
        path: WORLD_MAP_CONFIG.symbolAtlas.path,
        type: RUNTIME_ASSET_LOADING.types.spritesheet,
        frameConfig: {
          frameWidth: WORLD_MAP_CONFIG.symbolAtlas.frameWidth,
          frameHeight: WORLD_MAP_CONFIG.symbolAtlas.frameHeight,
          endFrame: WORLD_MAP_CONFIG.symbolAtlas.endFrame,
        },
      },
    ];
  }
  if (groupId === RUNTIME_FEATURE_ASSET_GROUP_IDS.hardcoreMode) {
    return [
      ...getHardcoreModeOnlyPreloadAssets(),
      ...getHardcoreMemorialPreloadAssets(),
    ];
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
  return Object.freeze({
    id: groupId,
    assets,
    consumers: Object.freeze([]),
    ...settings,
  });
}
