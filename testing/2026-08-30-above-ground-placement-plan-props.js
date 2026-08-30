import { ASSET_KEYS } from "../values/assetKeys.js";
import { WORLD_VISUAL_ABOVE_GROUND_COMPLETE_MAP_REVIEW as REVIEW } from
  "../values/worldVisualAboveGroundCompleteMapReview.js";
import { WORLD_VISUAL_ABOVE_GROUND_PIECEMEAL_MERGE_PLAN as PLAN } from
  "../values/worldVisualAboveGroundPiecemealMergePlan.js";
import {
  WORLD_VISUAL_PROP_ASSET_BY_ID_V3,
  WORLD_VISUAL_PROP_ATLASES_V3,
  WORLD_VISUAL_SKY_PROP_PLACEMENTS_V3,
  WORLD_VISUAL_SURFACE_PROP_PLACEMENTS_V3,
} from "../values/generated/worldVisualPropLibraryV3/index.js";
import { WORLD_VISUAL_SURFACE_PROP_LAYOUT } from
  "../values/worldVisualSurfacePropLayout.js";
import {
  WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS,
  WORLD_VISUAL_SURFACE_HERO_LANDMARKS,
} from "../values/worldVisualSurfaceHeroLandmarks.js";

const laneY = Object.freeze({ rear: 62.1, mid: 63.1, front: 64.05 });
const phaseAt = tileX => PLAN.slices.find(slice => (
  tileX >= slice.leftTile && tileX < slice.rightTileExclusive
))?.id || "stream-buffer";
const prop = base => Object.freeze({
  kind: "prop",
  status: "active",
  phaseId: phaseAt(base.anchorX),
  ...base,
});

function generatedProps() {
  const atlasByKey = Object.fromEntries(
    WORLD_VISUAL_PROP_ATLASES_V3.map(atlas => [atlas.key, atlas]),
  );
  return [
    ...WORLD_VISUAL_SURFACE_PROP_PLACEMENTS_V3,
    ...WORLD_VISUAL_SKY_PROP_PLACEMENTS_V3,
  ].map(placement => {
    const asset = WORLD_VISUAL_PROP_ASSET_BY_ID_V3[placement.assetId];
    const atlas = atlasByKey[asset.atlasKey];
    const sky = placement.scope === "sky";
    return prop({
      id: `prop:${placement.id}`,
      family: sky ? "generated-sky-prop" : "generated-surface-prop",
      label: asset.label,
      assetId: asset.id,
      path: atlas.path,
      anchorX: placement.tileX,
      anchorY: sky ? placement.tileY : laneY[placement.lane],
      x: placement.maximumRenderedBoundsTiles.left,
      y: sky
        ? placement.maximumRenderedBoundsTiles.top
        : REVIEW.surfaceTileY + placement.maximumRenderedBoundsTiles.top,
      width: placement.maximumRenderedBoundsTiles.right
        - placement.maximumRenderedBoundsTiles.left,
      height: placement.maximumRenderedBoundsTiles.bottom
        - placement.maximumRenderedBoundsTiles.top,
      lane: placement.lane,
      region: placement.worldRegion,
    });
  });
}

function retainedProps() {
  return WORLD_VISUAL_SURFACE_PROP_LAYOUT.placements.map(placement => {
    const asset = ASSET_KEYS.environment.surfaceProps[placement.level][placement.assetId];
    return prop({
      id: `prop:${placement.id}`,
      family: "retained-authored-prop",
      label: placement.assetId,
      assetId: asset.key,
      path: asset.path,
      anchorX: placement.tileX,
      anchorY: laneY[placement.lane],
      x: placement.tileX,
      y: laneY[placement.lane],
      width: 0,
      height: 0,
      lane: placement.lane,
      region: placement.level,
    });
  });
}

function heroProps() {
  return WORLD_VISUAL_SURFACE_HERO_LANDMARKS.placements.map(placement => {
    const asset = WORLD_VISUAL_SURFACE_HERO_LANDMARK_ASSETS[placement.assetId];
    return prop({
      id: `prop:${placement.id}`,
      family: "hero-landmark",
      label: asset.role,
      assetId: asset.key,
      path: asset.path,
      anchorX: placement.tileX,
      anchorY: 60.9,
      x: placement.tileX,
      y: 60.9,
      width: 0,
      height: 0,
      region: placement.chapterId,
    });
  });
}

export function buildPropPlacementRecords() {
  return Object.freeze([
    ...generatedProps(),
    ...retainedProps(),
    ...heroProps(),
  ]);
}
