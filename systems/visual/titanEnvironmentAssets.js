import { TITAN_DISCOVERY_CONFIG } from "../../values/titanDiscoveries.js";
import {
  WORLD_VISUAL_BACKDROP_ENHANCERS,
  getWorldVisualBackdropEnhancerRegion,
} from "../../values/worldVisualBackdropEnhancers.js";

export function resolveTitanEnvironmentAssets(
  definition,
  titanConfig = TITAN_DISCOVERY_CONFIG,
  enhancerConfig = WORLD_VISUAL_BACKDROP_ENHANCERS
) {
  const region = getWorldVisualBackdropEnhancerRegion(
    definition?.regionId,
    enhancerConfig
  );
  if (!region) return [];
  return titanConfig.environmentEnvelope.layers
    .map(profile => {
      const asset = region.assets.find(candidate => (
        candidate.family === profile.family
      ));
      return asset
        ? Object.freeze({
          asset,
          profile,
          regionId: region.id,
        })
        : null;
    })
    .filter(Boolean);
}

