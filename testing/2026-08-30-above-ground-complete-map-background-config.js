import { WORLD_VISUAL_SKY_COHESION } from "../values/worldVisualSkyCohesion.js";
import { WORLD_VISUAL_RUNTIME } from "../values/worldVisualRuntime.js";

export function createCompleteMapBackgroundConfigs(review) {
  return Object.freeze({
    surface: Object.freeze({
      ...WORLD_VISUAL_RUNTIME,
      render: Object.freeze({
        ...WORLD_VISUAL_RUNTIME.render,
        farDepth: review.surfaceFarDepth,
      }),
    }),
    sky: Object.freeze({
      ...WORLD_VISUAL_SKY_COHESION,
      worldGrid: Object.freeze({
        ...WORLD_VISUAL_SKY_COHESION.worldGrid,
        sourceDensityScale: review.skyFeatureScale,
      }),
      composition: Object.freeze({
        ...WORLD_VISUAL_SKY_COHESION.composition,
        featureFeatherXPx: review.skyFeatureFeatherXPx,
        featureFeatherYPx: review.skyFeatureFeatherYPx,
        bandAlpha: Object.freeze({
          ...WORLD_VISUAL_SKY_COHESION.composition.bandAlpha,
          lower: review.skySurfaceBandAlpha,
        }),
      }),
      render: Object.freeze({
        ...WORLD_VISUAL_SKY_COHESION.render,
        depth: review.skyFeatureDepth,
        matteDepth: review.skyFeatureDepth - 0.01,
      }),
    }),
  });
}
