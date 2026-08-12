import { GAMEPLAY_FEATURE_IDS } from "../../values/gameplayCapabilities.js";
import { isGameplayLevelEnabled } from "../../values/gameplayDevFlags.js";
import {
  WORLD_VISUAL_PROP_ASSET_BY_ID_V3,
  WORLD_VISUAL_SKY_PROP_ASSETS_V3,
} from "../../values/generated/worldVisualPropLibraryV3/index.js";
import { WORLD_VISUAL_SKY_PROP_COMPOSITION_V3 } from
  "../../values/worldVisualSkyPropCompositionV3.js";

function isPlacementEnabled(item, capabilities) {
  const match = String(item?.worldRegion || "").match(/^v11-level-(\d+)(?:-|$)/);
  if (match) return isGameplayLevelEnabled(Number(match[1]), capabilities || undefined);
  return !capabilities
    || capabilities.isEnabled(GAMEPLAY_FEATURE_IDS.HEAVENBLOCKS);
}

export function resolveV11SkyPropRuntimeAssets(capabilities = null) {
  const placements = WORLD_VISUAL_SKY_PROP_COMPOSITION_V3.placements
    .filter(item => isPlacementEnabled(item, capabilities));
  const atlasKeys = new Set(placements.map(item => (
    WORLD_VISUAL_PROP_ASSET_BY_ID_V3[item.assetId]?.atlasKey
  )).filter(Boolean));
  return Object.freeze({
    placements: Object.freeze(placements),
    assets: Object.freeze(WORLD_VISUAL_SKY_PROP_ASSETS_V3
      .filter(asset => atlasKeys.has(asset.atlasKey))),
  });
}
