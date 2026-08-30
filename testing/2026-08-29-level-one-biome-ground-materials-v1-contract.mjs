import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LEVEL_ONE_BIOME_FIELD } from "../values/levelOneBiomeField.js";
import {
  LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  getLevelOneBiomeGeneratedRoleAssets,
  getLevelOneBiomeGroundMaterialAssets,
  resolveLevelOneBiomeFamilyAssets,
} from "../values/levelOneBiomeVisualFamilies.js";
import {
  WORLD_VISUAL_TERRAIN_VARIATION,
  getWorldVisualTerrainVariationRuntimeAssets,
  resolveWorldVisualTerrainVariationRegions,
} from "../values/worldVisualTerrainVariation.js";
import { WorldVisualTerrainVariationRegionView } from
  "../world/rendering/scenic-world/WorldVisualTerrainVariationRegionView.js";
import { readWebpMetadata, sha256 } from "./2026-07-28-webp-test-utils.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REVIEW_ROOT = path.join(
  ROOT,
  "visual-approval-previews",
  "level-one-biome-ground-materials-v1",
);
const manifest = JSON.parse(fs.readFileSync(path.join(
  REVIEW_ROOT,
  "2026-08-29-level-one-biome-ground-material-manifest-v1.json",
), "utf8"));
const families = LEVEL_ONE_BIOME_VISUAL_FAMILIES.families;
const retainedFamilies = families.filter(entry => entry.id === entry.retainedPartitionId);
const expandedFamilies = families.filter(entry => entry.id !== entry.retainedPartitionId);
const allGroundAssets = getLevelOneBiomeGroundMaterialAssets();
const groundAssets = allGroundAssets.filter(entry => (
  entry.path.includes("level1-biome-ground-materials-v1")
));
const tertiaryGroundAssets = allGroundAssets.filter(entry => (
  entry.path.includes("level1-biome-ground-materials-v2")
));
const retainedGroundTokens = new Set(retainedFamilies.flatMap(
  entry => entry.assetPathIncludes.terrain,
));

function readPngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert.deepEqual(
    [...buffer.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
    filePath,
  );
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

assert.equal(families.length, 50);
assert.equal(retainedFamilies.length, 20);
assert.equal(expandedFamilies.length, 30);
assert.equal(LEVEL_ONE_BIOME_VISUAL_FAMILIES.expandedGroundMaterialAssetCount, 90);
assert.equal(allGroundAssets.length, 110);
assert.equal(groundAssets.length, 60);
assert.equal(new Set(groundAssets.map(entry => entry.key)).size, 60);
assert.equal(new Set(groundAssets.map(entry => entry.path)).size, 60);
assert.equal(tertiaryGroundAssets.length, 50);
assert.ok(retainedFamilies.every(entry => entry.groundMaterialAssets.length === 1));
assert.ok(expandedFamilies.every(entry => entry.groundMaterialAssets.length === 3));
assert.equal(retainedGroundTokens.size, 36);
assert.equal(retainedGroundTokens.size + allGroundAssets.length, 146);
assert.equal(getLevelOneBiomeGeneratedRoleAssets().length + allGroundAssets.length, 310);
assert.deepEqual(
  getLevelOneBiomeGroundMaterialAssets(
    LEVEL_ONE_BIOME_VISUAL_FAMILIES,
    "?levelOneSourceFamilies=0",
  ),
  [],
);

const terrainRegions = resolveWorldVisualTerrainVariationRegions(
  LEVEL_ONE_BIOME_FIELD.bounds.topTile,
  LEVEL_ONE_BIOME_FIELD.bounds.bottomTileExclusive,
  WORLD_VISUAL_TERRAIN_VARIATION,
  "",
);
const sourceRegions = terrainRegions[0].biomeFieldRegionsById;
assert.ok(sourceRegions);
for (const family of expandedFamilies) {
  const parentPlates = sourceRegions[family.parentRegionId].plates;
  const resolved = resolveLevelOneBiomeFamilyAssets(
    family.id,
    "terrain",
    parentPlates,
    LEVEL_ONE_BIOME_VISUAL_FAMILIES,
    "",
  );
  assert.deepEqual(resolved, family.groundMaterialAssets, family.id);
  assert.deepEqual(
    resolveLevelOneBiomeFamilyAssets(
      family.id,
      "terrain",
      parentPlates,
      LEVEL_ONE_BIOME_VISUAL_FAMILIES,
      "?levelOneSourceFamilies=0",
    ),
    parentPlates,
    `${family.id} rollback`,
  );
}
for (const family of retainedFamilies) {
  const parentPlates = sourceRegions[family.parentRegionId].plates;
  const resolved = resolveLevelOneBiomeFamilyAssets(
    family.id,
    "terrain",
    parentPlates,
    LEVEL_ONE_BIOME_VISUAL_FAMILIES,
    "",
  );
  assert.ok(resolved.length > 0, family.id);
  assert.ok(resolved.filter(asset => !asset.path.includes("ground-materials-v2")).every(asset => (
    family.assetPathIncludes.terrain.some(token => asset.path.includes(token))
  )), family.id);
  assert.equal(resolved.filter(asset => asset.path.includes("ground-materials-v2")).length, 1);
}

const scene = { config: { tileSize: 64 } };
const terrainMask = { id: "authoritative-terrain-mask" };
const resolvedExpandedIds = new Set();
const resolvedGroundPaths = new Set();
for (const region of terrainRegions) {
  const view = new WorldVisualTerrainVariationRegionView(
    scene,
    {},
    region,
    WORLD_VISUAL_TERRAIN_VARIATION,
    terrainMask,
    false,
    "",
  );
  for (let row = 0; row < 32; row += 1) {
    for (let column = 0; column < 32; column += 1) {
      const selection = view._resolveBiomeFieldSelection(column, row);
      if (!selection || !selection.plates[0]?.path.includes("ground-materials-v1")) {
        continue;
      }
      resolvedExpandedIds.add(selection.profile.id);
      selection.plates.forEach(asset => resolvedGroundPaths.add(asset.path));
    }
  }
  view.destroy();
}
assert.deepEqual(
  resolvedExpandedIds,
  new Set(expandedFamilies.map(entry => entry.id)),
  "all thirty added families must select their true terrain plates",
);
assert.deepEqual(
  resolvedGroundPaths,
  new Set(expandedFamilies.flatMap(entry => entry.groundMaterialAssets).map(
    entry => entry.path
  )),
  "all ninety added-family terrain plates must be reachable in the 2D field",
);

const terrainRuntimeAssets = getWorldVisualTerrainVariationRuntimeAssets(
  WORLD_VISUAL_TERRAIN_VARIATION,
  "",
);
const runtimeGroundAssets = terrainRuntimeAssets.filter(
  entry => entry.path.includes("level1-biome-ground-materials-v1"),
);
assert.deepEqual(
  new Set(runtimeGroundAssets.map(entry => entry.key)),
  new Set(groundAssets.map(entry => entry.key)),
);

assert.deepEqual(manifest.counts, {
  addedFamilies: 30,
  variantsPerFamily: 2,
  newImageGenSources: 60,
  newRuntimeGroundAssets: 60,
  retainedLevelOneGroundConcepts: 36,
  totalLevelOneGroundConcepts: 96,
  totalGeneratedVisualLibrary: 260,
});
assert.equal(manifest.entries.length, 60);
assert.equal(manifest.rollback, "?levelOneSourceFamilies=0");
assert.equal(new Set(manifest.entries.map(entry => entry.sourceSha256)).size, 60);
assert.equal(new Set(manifest.entries.map(entry => entry.runtimeSha256)).size, 60);
for (const entry of manifest.entries) {
  const sourcePath = path.join(ROOT, entry.source);
  const runtimePath = path.join(ROOT, entry.runtime);
  assert.equal(fs.existsSync(sourcePath), true, entry.source);
  assert.equal(fs.existsSync(runtimePath), true, entry.runtime);
  assert.deepEqual(readPngSize(sourcePath), { width: 1536, height: 1024 });
  assert.deepEqual(
    Object.values(readWebpMetadata(runtimePath)).slice(0, 2),
    [1536, 1024],
  );
  assert.equal(readWebpMetadata(runtimePath).hasAlpha, true, entry.runtime);
  assert.equal(sha256(sourcePath), entry.sourceSha256);
  assert.equal(sha256(runtimePath), entry.runtimeSha256);
  assert.equal(entry.sourceOpaqueCoverage, 1);
  assert.equal(entry.sourceOpaqueEdgeCoverage, 1);
  assert.ok(entry.sourceRgbStd >= 18, entry.source);
  assert.equal(entry.runtimeAlphaMin, 0);
  assert.equal(entry.runtimeAlphaMax, 255);
}
assert.equal(fs.existsSync(path.join(ROOT, manifest.contactSheet)), true);
assert.equal(Object.keys(manifest.regionContactSheets).length, 5);
assert.ok(Object.values(manifest.regionContactSheets).every(relativePath => (
  fs.existsSync(path.join(ROOT, relativePath))
)));

const regionViewSource = fs.readFileSync(path.join(
  ROOT,
  "world/rendering/scenic-world/WorldVisualTerrainVariationRegionView.js",
), "utf8");
const layerSource = fs.readFileSync(path.join(
  ROOT,
  "world/rendering/scenic-world/WorldVisualTerrainVariationLayer.js",
), "utf8");
const bootSources = ["BootScene.js", "WorldLoadScene.js", "BootCapabilityAssetPreloader.js"]
  .map(name => fs.readFileSync(path.join(ROOT, "ui/scenes", name), "utf8"))
  .join("\n");
assert.match(regionViewSource, /resolveLevelOneBiomeFamilyAssets/);
assert.match(regionViewSource, /\.setMask\(this\.terrainMask\)/);
assert.doesNotMatch(regionViewSource, /worldModel\.(set|update)|localStorage|saveData/);
assert.match(layerSource, /WorldVisualAssetCache/);
assert.match(layerSource, /demandStreamingEnabled/);
assert.match(layerSource, /getLevelOneBiomeGroundMaterialAssets/);
assert.doesNotMatch(bootSources, /level1-biome-ground-materials-v1/);

console.log("level one biome ground materials V1 contract: ok", {
  families: families.length,
  addedGroundAssets: allGroundAssets.length,
  retainedGroundConcepts: retainedGroundTokens.size,
  totalGroundConcepts: retainedGroundTokens.size + allGroundAssets.length,
  generatedVisualLibrary: getLevelOneBiomeGeneratedRoleAssets().length
    + allGroundAssets.length,
  demandStreamed: true,
  terrainMasked: true,
  visualOnly: true,
});
