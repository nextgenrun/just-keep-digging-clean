import assert from "node:assert/strict";

import {
  LEVEL_ONE_BIOME_FIELD,
  getLevelOneBiomeBoundaryAssets,
} from "../values/levelOneBiomeField.js";
import {
  LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  getLevelOneBiomeGeneratedRoleAssets,
  getLevelOneBiomeGroundMaterialAssets,
} from "../values/levelOneBiomeVisualFamilies.js";
import { getLevelOneBiomeDepthVariantAssets } from
  "../values/levelOneBiomeDepthVariants.js";
import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  resolveWorldVisualDepthBackdropRegionAssets,
  resolveWorldVisualDepthBackdropRegions,
} from "../values/worldVisualDepthBackdrops.js";
import {
  WORLD_VISUAL_BACKDROP_ENHANCERS,
  resolveWorldVisualBackdropEnhancerSelection,
} from "../values/worldVisualBackdropEnhancers.js";
import {
  WORLD_VISUAL_TERRAIN_VARIATION,
  resolveWorldVisualTerrainVariationRegions,
} from "../values/worldVisualTerrainVariation.js";
import {
  WORLD_VISUAL_GROUND_STRUCTURES,
  resolveWorldVisualGroundStructureRuntimeRegions,
} from "../values/worldVisualGroundStructures.js";
import {
  WORLD_VISUAL_UNDERGROUND_DETAILS,
  resolveWorldVisualUndergroundDetailRegions,
} from "../values/worldVisualUndergroundDetails.js";
import {
  WORLD_VISUAL_MATERIALS,
  WORLD_VISUAL_MATERIAL_BANDS,
} from "../values/worldVisualMaterials.js";
import { WorldVisualDepthBackdropRegionView } from
  "../world/rendering/scenic-world/WorldVisualDepthBackdropRegionView.js";
import { WorldVisualBackdropEnhancerLayer } from
  "../world/rendering/scenic-world/WorldVisualBackdropEnhancerLayer.js";
import { WorldVisualTerrainVariationRegionView } from
  "../world/rendering/scenic-world/WorldVisualTerrainVariationRegionView.js";
import { WorldVisualGroundStructureRegionView } from
  "../world/rendering/scenic-world/WorldVisualGroundStructureRegionView.js";
import { WorldVisualUndergroundDetailRegionView } from
  "../world/rendering/scenic-world/WorldVisualUndergroundDetailRegionView.js";
import { WorldVisualLevelOneBiomeGeneratedRoleView } from
  "../world/rendering/scenic-world/WorldVisualLevelOneBiomeGeneratedRoleView.js";
import { WorldVisualLevelOneBiomeBoundaryView } from
  "../world/rendering/scenic-world/WorldVisualLevelOneBiomeBoundaryView.js";
import { resolveWorldVisualBackdropCardRange } from
  "../world/rendering/scenic-world/worldVisualBackdropCardGrid.js";

const field = LEVEL_ONE_BIOME_FIELD;
const scene = { config: { tileSize: 94 } };
const terrainMask = { id: "authoritative-terrain-mask" };
const bounds = {
  left: field.bounds.leftTile,
  right: field.bounds.rightTileExclusive,
  top: field.bounds.topTile,
  bottom: field.bounds.bottomTileExclusive,
};
const sourceIds = new Set(field.sourceRegionIds);
const unique = assets => [...new Map(assets.map(asset => [asset.key, asset])).values()];
const add = (keys, assets) => assets.forEach(asset => keys.add(asset.key));

const materialAssets = unique(WORLD_VISUAL_MATERIAL_BANDS
  .filter(entry => (
    entry.topTile < bounds.bottom && entry.bottomTileExclusive > bounds.top
  ))
  .map(entry => WORLD_VISUAL_MATERIALS[entry.materialId]));
const backdropAssets = WORLD_VISUAL_DEPTH_BACKDROPS.regions
  .filter(entry => sourceIds.has(entry.id))
  .flatMap(entry => entry.wholeWorldVariantBackwalls);
const enhancerAssets = WORLD_VISUAL_BACKDROP_ENHANCERS.regions
  .filter(entry => sourceIds.has(entry.id))
  .flatMap(entry => entry.assets);
const terrainRegions = WORLD_VISUAL_TERRAIN_VARIATION.regions
  .filter(entry => sourceIds.has(entry.id));
const terrainAssets = terrainRegions.flatMap(entry => [
  ...entry.seamBasePlatesV6,
  ...entry.seamV5PlatesV6,
]);
const capAssets = terrainRegions.flatMap(entry => [entry.capAtlas, entry.v5CapAtlas]);
const cohesionAssets = terrainRegions.map(entry => entry.cohesionPlate);
const structureAssets = WORLD_VISUAL_GROUND_STRUCTURES.regions
  .filter(entry => sourceIds.has(entry.id))
  .flatMap(entry => entry.seamAssets);
const detailAssets = WORLD_VISUAL_UNDERGROUND_DETAILS.regions
  .filter(entry => sourceIds.has(entry.id))
  .flatMap(entry => [entry.textureAtlas, entry.propAtlas]);
const inventoryGroups = Object.freeze({
  materials: materialAssets,
  backdrops: backdropAssets,
  enhancers: enhancerAssets,
  terrain: terrainAssets,
  caps: capAssets,
  cohesion: cohesionAssets,
  structures: structureAssets,
  details: detailAssets,
  boundaries: getLevelOneBiomeBoundaryAssets(),
  generatedRoles: getLevelOneBiomeGeneratedRoleAssets(),
  familyGroundMaterials: getLevelOneBiomeGroundMaterialAssets(),
  depthVariants: getLevelOneBiomeDepthVariantAssets(),
});
assert.deepEqual(
  Object.fromEntries(Object.entries(inventoryGroups).map(([id, assets]) => (
    [id, assets.length]
  ))),
  {
    materials: 5,
    backdrops: 75,
    enhancers: 50,
    terrain: 36,
    caps: 10,
    cohesion: 5,
    structures: 25,
    details: 10,
    boundaries: 21,
    generatedRoles: 200,
    familyGroundMaterials: 110,
    depthVariants: 92,
  },
);

const reachable = new Set(materialAssets.map(asset => asset.key));
for (const region of resolveWorldVisualDepthBackdropRegions(bounds.top, bounds.bottom)) {
  const backwalls = resolveWorldVisualDepthBackdropRegionAssets(
    region, WORLD_VISUAL_DEPTH_BACKDROPS, "",
  );
  add(reachable, new WorldVisualDepthBackdropRegionView(
    scene, region, WORLD_VISUAL_DEPTH_BACKDROPS, backwalls,
  ).resolveRequiredAssets(bounds, 0));
}
for (const region of resolveWorldVisualTerrainVariationRegions(
  bounds.top,
  bounds.bottom,
)) {
  add(reachable, new WorldVisualTerrainVariationRegionView(
    scene, {}, region, WORLD_VISUAL_TERRAIN_VARIATION, terrainMask, true,
  ).resolveRequiredAssets(bounds, 0));
}
for (const region of resolveWorldVisualGroundStructureRuntimeRegions(
  bounds.top,
  bounds.bottom,
)) {
  add(reachable, new WorldVisualGroundStructureRegionView(
    scene, region, WORLD_VISUAL_GROUND_STRUCTURES, terrainMask,
  ).resolveRequiredAssets(bounds, 0));
}
for (const region of resolveWorldVisualUndergroundDetailRegions(
  bounds.top,
  bounds.bottom,
)) {
  add(reachable, new WorldVisualUndergroundDetailRegionView(
    scene, region, WORLD_VISUAL_UNDERGROUND_DETAILS, terrainMask,
  ).resolveRequiredAssets(bounds));
}

const enhancerLayer = new WorldVisualBackdropEnhancerLayer(scene);
for (const region of resolveWorldVisualDepthBackdropRegions(bounds.top, bounds.bottom)) {
  const range = resolveWorldVisualBackdropCardRange(
    bounds, region, WORLD_VISUAL_DEPTH_BACKDROPS, scene.config.tileSize, 1,
  );
  if (!range) continue;
  for (let row = range.firstRow; row <= range.lastRow; row += 1) {
    for (let column = range.firstColumn; column <= range.lastColumn; column += 1) {
      const backdrop = enhancerLayer._resolveBackdropAsset(
        region, column, row, range.rows,
      );
      const selection = resolveWorldVisualBackdropEnhancerSelection(
        region.id, column, row, WORLD_VISUAL_BACKDROP_ENHANCERS, backdrop,
      );
      if (selection) reachable.add(selection.asset.key);
    }
  }
}

add(reachable, new WorldVisualLevelOneBiomeGeneratedRoleView(
  scene, terrainMask, field, LEVEL_ONE_BIOME_VISUAL_FAMILIES, "",
).resolveRequiredAssets(bounds));
add(reachable, new WorldVisualLevelOneBiomeBoundaryView(
  scene, terrainMask, field, "",
)._resolvePlacements(bounds).map(entry => entry.asset));

const productionAssets = unique(Object.values(inventoryGroups).flat());
const missing = productionAssets.filter(asset => !reachable.has(asset.key));
assert.equal(productionAssets.length, 639);
assert.deepEqual(missing, [], "every registered Level One media file must be reachable");

console.log("level one production media reachability V1 contract: ok", {
  families: LEVEL_ONE_BIOME_VISUAL_FAMILIES.sourceFamilyCount,
  productionMedia: productionAssets.length,
  reachableMedia: productionAssets.length - missing.length,
  missingMedia: missing.length,
});
