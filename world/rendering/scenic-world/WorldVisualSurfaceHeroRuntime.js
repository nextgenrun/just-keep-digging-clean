import { GAMEPLAY_FEATURE_IDS } from "../../../values/gameplayCapabilities.js";
import { resolveWorldVisualSurfaceHeroLandmarkSuppression } from
  "../../../values/worldVisualSurfaceHeroLandmarks.js";
import { WorldVisualSurfaceHeroLandmarkLayer } from
  "./WorldVisualSurfaceHeroLandmarkLayer.js";
import { WorldVisualSurfacePropExpansionLayer } from
  "./WorldVisualSurfacePropExpansionLayer.js";

const EMPTY_SUPPRESSION = Object.freeze({
  retained: Object.freeze([]),
  expansion: Object.freeze([]),
});

export function createWorldVisualSurfaceHeroOwner(scene, worldModel, search) {
  const capabilities = scene.registry?.get?.("gameplayCapabilities");
  const enabled = capabilities
    ? capabilities.isEnabled(GAMEPLAY_FEATURE_IDS.LEVEL_TWO)
    : true;
  return Object.freeze({
    suppression: enabled
      ? resolveWorldVisualSurfaceHeroLandmarkSuppression(undefined, search)
      : EMPTY_SUPPRESSION,
    create() {
      if (!enabled) return null;
      const layer = new WorldVisualSurfaceHeroLandmarkLayer(scene, worldModel);
      layer.create(search);
      return layer;
    },
    createExpansion(suppressedPlacementIds) {
      if (!enabled) return null;
      const layer = new WorldVisualSurfacePropExpansionLayer(scene, worldModel);
      layer.create(search, { suppressedPlacementIds });
      return layer;
    },
  });
}
