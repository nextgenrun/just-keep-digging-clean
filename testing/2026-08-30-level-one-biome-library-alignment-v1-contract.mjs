import assert from "node:assert/strict";
import fs from "node:fs";

import {
  LEVEL_ONE_BIOME_FIELD,
  getLevelOneBiomeBoundaryAssets,
} from "../values/levelOneBiomeField.js";
import {
  LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  getLevelOneBiomeGeneratedRoleAssets,
  getLevelOneBiomeGroundMaterialAssets,
  resolveLevelOneBiomeDetailFrameIndexes,
  resolveLevelOneBiomeFamilyAssets,
} from "../values/levelOneBiomeVisualFamilies.js";
import {
  LEVEL_ONE_BIOME_DEPTH_VARIANTS,
  getLevelOneBiomeDepthVariantAssets,
} from "../values/levelOneBiomeDepthVariants.js";
import { WORLD_VISUAL_DEPTH_BACKDROPS } from
  "../values/worldVisualDepthBackdrops.js";
import {
  WORLD_VISUAL_TERRAIN_VARIATION,
  resolveWorldVisualTerrainVariationRegions,
} from "../values/worldVisualTerrainVariation.js";
import { WORLD_VISUAL_GROUND_STRUCTURES } from
  "../values/worldVisualGroundStructures.js";
import { WorldVisualTerrainVariationRegionView } from
  "../world/rendering/scenic-world/WorldVisualTerrainVariationRegionView.js";
import { WorldVisualLevelOneBiomeGeneratedRoleView } from
  "../world/rendering/scenic-world/WorldVisualLevelOneBiomeGeneratedRoleView.js";
import { WorldVisualLevelOneBiomeBoundaryView } from
  "../world/rendering/scenic-world/WorldVisualLevelOneBiomeBoundaryView.js";

const field = LEVEL_ONE_BIOME_FIELD;
const families = LEVEL_ONE_BIOME_VISUAL_FAMILIES;
const variants = LEVEL_ONE_BIOME_DEPTH_VARIANTS;
const scene = { config: { tileSize: 94 } };
const terrainMask = { id: "authoritative-terrain-mask" };
const fullBounds = {
  left: field.bounds.leftTile,
  right: field.bounds.rightTileExclusive,
  top: field.bounds.topTile,
  bottom: field.bounds.bottomTileExclusive,
};

const roleView = new WorldVisualLevelOneBiomeGeneratedRoleView(
  scene,
  terrainMask,
);
const roleLayers = roleView._resolvePlacements(fullBounds);
const primaryLayers = roleLayers.filter(entry => entry.layerId === "primary");
const foundationLayers = roleLayers.filter(entry => entry.layerId === "foundation");
const selectedMediaKeys = new Set(roleLayers.map(entry => entry.asset.key));
const selectedEffectiveIds = new Set(roleLayers.map(entry => (
  entry.asset.selectionId || entry.asset.key
)));
const baseRoleAssets = getLevelOneBiomeGeneratedRoleAssets();
const depthVariantAssets = getLevelOneBiomeDepthVariantAssets();

assert.equal(primaryLayers.length, 400, "the original spatial anchors stay unchanged");
assert.equal(foundationLayers.length, 64, "only orphaned base roles gain a foundation");
assert.equal(roleLayers.length, 464);
assert.equal(variants.baseFoundationRoleCount, 64);
assert.equal(baseRoleAssets.length, 200);
assert.ok(baseRoleAssets.every(asset => selectedMediaKeys.has(asset.key)));
assert.ok(depthVariantAssets.every(asset => selectedMediaKeys.has(asset.key)));
assert.equal(selectedMediaKeys.size, 292);
assert.equal(selectedEffectiveIds.size, 382);
assert.ok(variants.familyVariants.every(entry => (
  selectedMediaKeys.has(entry.scenicAsset.key)
)));
assert.ok(variants.familyVariants.flatMap(entry => entry.identityFrames).every(
  entry => selectedEffectiveIds.has(entry.selectionId),
));
assert.ok(variants.landmarks.every(entry => selectedMediaKeys.has(entry.asset.key)));
assert.equal(roleView.resolveRequiredAssets(fullBounds).length, 292);

const profilesById = new Map(field.profiles.map(profile => [profile.id, profile]));
for (const family of families.families) {
  const profileLayers = roleLayers.filter(entry => entry.profile.id === family.id);
  const profilePrimary = profileLayers.filter(entry => entry.layerId === "primary");
  const profileFoundations = profileLayers.filter(entry => entry.layerId === "foundation");
  const expectedFoundationRoles = variants.baseFoundationRolesByFamily[family.id] || [];
  assert.equal(profilePrimary.length, 8, `${family.id} needs two complete four-role sites`);
  assert.deepEqual(
    new Set(profilePrimary.map(entry => entry.roleId)),
    new Set(families.generatedRoleIds),
    `${family.id} needs every generated role`,
  );
  assert.deepEqual(
    new Set(profileFoundations.map(entry => entry.roleId)),
    new Set(expectedFoundationRoles),
    `${family.id} foundation routing`,
  );

  const backdropRegion = WORLD_VISUAL_DEPTH_BACKDROPS.regions.find(
    entry => entry.id === family.parentRegionId,
  );
  const terrainRegion = WORLD_VISUAL_TERRAIN_VARIATION.regions.find(
    entry => entry.id === family.parentRegionId,
  );
  const structureRegion = WORLD_VISUAL_GROUND_STRUCTURES.regions.find(
    entry => entry.id === family.parentRegionId,
  );
  const backdrops = resolveLevelOneBiomeFamilyAssets(
    family,
    "backdrop",
    backdropRegion.wholeWorldVariantBackwalls,
  );
  const terrain = resolveLevelOneBiomeFamilyAssets(
    family,
    "terrain",
    [...terrainRegion.seamBasePlatesV6, ...terrainRegion.seamV5PlatesV6],
  );
  const structures = resolveLevelOneBiomeFamilyAssets(
    family,
    "groundStructure",
    structureRegion.seamAssets,
  );
  assert.ok(backdrops.length > 0, `${family.id} background pool`);
  assert.ok(structures.length > 0, `${family.id} structure pool`);
  assert.ok(family.groundMaterialAssets.every(asset => terrain.includes(asset)));
  for (const detailKind of ["textures", "props"]) {
    const indexes = resolveLevelOneBiomeDetailFrameIndexes(family, detailKind);
    assert.equal(indexes.length, 5, `${family.id} ${detailKind} frames`);
    assert.equal(new Set(indexes).size, 5, `${family.id} unique ${detailKind} frames`);
  }
  assert.ok(profilesById.has(family.id), `${family.id} M-map profile`);
}

const selectedGroundKeys = new Set();
for (const region of resolveWorldVisualTerrainVariationRegions(
  field.bounds.topTile,
  field.bounds.bottomTileExclusive,
)) {
  const view = new WorldVisualTerrainVariationRegionView(
    scene,
    {},
    region,
    WORLD_VISUAL_TERRAIN_VARIATION,
    terrainMask,
  );
  const range = view._resolvePlateRange(fullBounds, 0);
  if (!range) continue;
  for (let row = range.rows.first; row <= range.rows.last; row += 1) {
    for (let column = range.columns.first; column <= range.columns.last; column += 1) {
      selectedGroundKeys.add(view._resolvePlateAsset(column, row).key);
    }
  }
}
const groundAssets = getLevelOneBiomeGroundMaterialAssets();
assert.equal(groundAssets.length, 110);
assert.ok(groundAssets.every(asset => selectedGroundKeys.has(asset.key)));

const boundaryView = new WorldVisualLevelOneBiomeBoundaryView(
  scene,
  terrainMask,
  field,
  "",
);
const boundaryLayers = boundaryView._resolvePlacements(fullBounds);
const boundaryAnchors = boundaryLayers.filter(entry => !entry.id.includes(":aligned-"));
const boundaryAssetKeys = new Set(boundaryLayers.map(entry => entry.asset.key));
assert.equal(boundaryAnchors.length, 481, "boundary spatial anchors stay unchanged");
assert.equal(boundaryLayers.length, 483, "the rare join aligns its two missing variants");
assert.equal(boundaryAssetKeys.size, 21);
assert.ok(getLevelOneBiomeBoundaryAssets().every(asset => (
  boundaryAssetKeys.has(asset.key)
)));


for (const sourcePath of [
  "values/levelOneBiomeDepthVariants.js",
  "world/rendering/scenic-world/WorldVisualLevelOneBiomeGeneratedRoleView.js",
  "world/rendering/scenic-world/levelOneBiomeBoundaryAlignment.js",
]) {
  const source = fs.readFileSync(sourcePath, "utf8");
  assert.doesNotMatch(source, /setTile|tileHp|collision|resourceDrop|saveData|localStorage/);
}

console.log("level one biome library alignment V1 contract: ok", {
  families: families.sourceFamilyCount,
  generatedRoleAnchors: primaryLayers.length,
  alignedFoundationLayers: foundationLayers.length,
  reachableGeneratedMedia: selectedMediaKeys.size,
  reachableEffectiveRoleSelections: selectedEffectiveIds.size,
  reachableGroundMedia: groundAssets.length,
  boundaryAnchors: boundaryAnchors.length,
  reachableBoundaryMedia: boundaryAssetKeys.size,
  visualOnly: true,
});
