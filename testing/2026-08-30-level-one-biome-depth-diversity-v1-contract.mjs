import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  LEVEL_ONE_BIOME_FIELD,
  getLevelOneBiomeBoundaryAssets,
  resolveLevelOneBiomeBoundaryAssets,
} from "../values/levelOneBiomeField.js";
import {
  LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  getLevelOneBiomeGroundMaterialAssets,
  resolveLevelOneBiomeGeneratedRoleAsset,
  resolveLevelOneBiomeVisualFamiliesEnabled,
} from "../values/levelOneBiomeVisualFamilies.js";
import {
  LEVEL_ONE_BIOME_DEPTH_VARIANTS,
  getLevelOneBiomeDepthVariantAssets,
  resolveLevelOneBiomeDepthRoleAsset,
} from "../values/levelOneBiomeDepthVariants.js";
import { getWorldVisualUndergroundDetailAssets } from
  "../values/worldVisualUndergroundDetails.js";
import { WorldVisualLevelOneBiomeGeneratedRoleView } from
  "../world/rendering/scenic-world/WorldVisualLevelOneBiomeGeneratedRoleView.js";
import { readWebpMetadata, sha256 } from "./2026-07-28-webp-test-utils.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REVIEW_ROOT = path.join(
  ROOT,
  "visual-approval-previews",
  "level-one-biome-depth-diversity-v1",
);
const groundManifest = JSON.parse(fs.readFileSync(path.join(
  REVIEW_ROOT,
  "2026-08-30-level-one-biome-ground-material-manifest-v2.json",
), "utf8"));
const variantManifest = JSON.parse(fs.readFileSync(path.join(
  REVIEW_ROOT,
  "2026-08-30-level-one-biome-depth-variant-manifest-v1.json",
), "utf8"));
const jobManifest = JSON.parse(fs.readFileSync(path.join(
  REVIEW_ROOT,
  "2026-08-30-level-one-biome-depth-imagegen-jobs-v1.json",
), "utf8"));

function readPngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert.deepEqual(
    [...buffer.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
    filePath,
  );
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

assert.equal(jobManifest.jobs.length, 156);
assert.deepEqual(
  Object.fromEntries(["ground", "identity", "scenic", "boundary", "landmark"].map(
    category => [category, jobManifest.jobs.filter(job => job.category === category).length],
  )),
  { ground: 50, identity: 30, scenic: 50, boundary: 14, landmark: 12 },
);

assert.deepEqual(groundManifest.counts, {
  newSources: 50,
  newRuntimeAssets: 50,
  previousGroundConcepts: 96,
  totalGroundConcepts: 146,
});
assert.equal(groundManifest.entries.length, 50);
assert.equal(new Set(groundManifest.entries.map(entry => entry.sourceSha256)).size, 50);
assert.equal(new Set(groundManifest.entries.map(entry => entry.runtimeSha256)).size, 50);
for (const entry of groundManifest.entries) {
  const source = path.join(ROOT, entry.source);
  const runtime = path.join(ROOT, entry.runtime);
  assert.deepEqual(readPngSize(source), [1536, 1024]);
  assert.deepEqual(
    [readWebpMetadata(runtime).width, readWebpMetadata(runtime).height],
    [1536, 1024],
  );
  assert.equal(readWebpMetadata(runtime).hasAlpha, true, entry.runtime);
  assert.equal(sha256(source), entry.sourceSha256);
  assert.equal(sha256(runtime), entry.runtimeSha256);
  assert.ok(entry.sourceOpaqueEdgeCoverage >= 0.95, entry.source);
  assert.ok(entry.sourceRgbStd >= 18, entry.source);
}

assert.equal(variantManifest.counts.identity, 30);
assert.equal(variantManifest.counts.identityEffectivePieces, 120);
assert.equal(variantManifest.counts.scenic, 50);
assert.equal(variantManifest.counts.boundary, 14);
assert.equal(variantManifest.counts.landmark, 12);
assert.equal(variantManifest.counts.hardSwapBackgrounds, 15);
assert.equal(variantManifest.counts.canonicalSources, 106);
assert.equal(variantManifest.counts.rejectedCandidates, 2);
assert.equal(variantManifest.entries.length, 106);
assert.equal(new Set(variantManifest.entries.map(entry => entry.sourceSha256)).size, 106);
assert.equal(new Set(variantManifest.entries.map(entry => entry.runtimeSha256)).size, 106);
for (const entry of variantManifest.entries) {
  const source = path.join(ROOT, entry.source);
  const runtime = path.join(ROOT, entry.runtime);
  assert.deepEqual(readPngSize(source), [1536, 1024]);
  assert.deepEqual(
    [readWebpMetadata(runtime).width, readWebpMetadata(runtime).height],
    [1536, 1024],
  );
  assert.equal(readWebpMetadata(runtime).hasAlpha, true, entry.runtime);
  assert.equal(sha256(source), entry.sourceSha256);
  assert.equal(sha256(runtime), entry.runtimeSha256);
  assert.ok(entry.sourceTransparentCoverage >= 0.08, entry.source);
  assert.ok(entry.sourceOccupiedCoverage >= 0.04, entry.source);
  if (entry.category === "identity") {
    assert.equal(entry.quadrantOccupiedCoverage.length, 4);
    assert.ok(entry.quadrantOccupiedCoverage.every(value => value >= 0.03));
    assert.ok(entry.centerGutterOccupiedCoverage <= 0.12, entry.source);
  }
}
assert.equal(
  Object.values(variantManifest.contacts).every(relativePath => (
    fs.existsSync(path.join(ROOT, relativePath))
  )),
  true,
);

const depthConfig = LEVEL_ONE_BIOME_DEPTH_VARIANTS;
assert.equal(depthConfig.familyCount, 50);
assert.equal(depthConfig.identityFamilyCount, 30);
assert.equal(depthConfig.identityAtlasCount, 30);
assert.equal(depthConfig.identityFrameCount, 120);
assert.equal(depthConfig.experimentalFamilyCount, 15);
assert.equal(depthConfig.scenicAssetCount, 50);
assert.equal(depthConfig.landmarkCount, 12);
assert.equal(depthConfig.familyVariants.filter(entry => entry.experimental).length, 15);
assert.ok(depthConfig.familyVariants.filter(entry => entry.experimental).every(
  entry => entry.scenicRole === "background",
));

const variantAssets = getLevelOneBiomeDepthVariantAssets();
assert.equal(variantAssets.length, 92);
assert.equal(new Set(variantAssets.map(entry => entry.key)).size, 92);
assert.equal(new Set(variantAssets.map(entry => entry.path)).size, 92);

const groundAssets = getLevelOneBiomeGroundMaterialAssets();
assert.equal(groundAssets.length, 110);
assert.equal(new Set(groundAssets.map(entry => entry.key)).size, 110);
assert.equal(groundAssets.filter(asset => (
  asset.path.includes("level1-biome-ground-materials-v2")
)).length, 50);
assert.equal(LEVEL_ONE_BIOME_VISUAL_FAMILIES.expandedGroundMaterialAssetCount, 90);
assert.equal(LEVEL_ONE_BIOME_VISUAL_FAMILIES.tertiaryGroundMaterialAssetCount, 50);
assert.ok(LEVEL_ONE_BIOME_VISUAL_FAMILIES.families.every(family => (
  family.groundMaterialMode === (family.id === family.retainedPartitionId
    ? "append"
    : "replace")
)));

const boundaryAssets = getLevelOneBiomeBoundaryAssets();
assert.equal(boundaryAssets.length, 21);
assert.equal(new Set(boundaryAssets.map(entry => entry.key)).size, 21);
for (const pairKey of Object.keys(LEVEL_ONE_BIOME_FIELD.boundary.assetsByPair)) {
  assert.equal(resolveLevelOneBiomeBoundaryAssets(...pairKey.split("|")).length, 3);
}

const selectedKeys = new Set();
const selectedIds = new Set();
const siteOrdinals = new Map();
let placementCount = 0;
for (const [seedIndex, seed] of LEVEL_ONE_BIOME_FIELD.seeds.entries()) {
  const profile = LEVEL_ONE_BIOME_FIELD.profiles.find(entry => entry.id === seed.profileId);
  const siteOrdinal = siteOrdinals.get(profile.id) || 0;
  siteOrdinals.set(profile.id, siteOrdinal + 1);
  for (const roleId of LEVEL_ONE_BIOME_VISUAL_FAMILIES.generatedRoleIds) {
    const baseAsset = resolveLevelOneBiomeGeneratedRoleAsset(profile, roleId);
    const selected = resolveLevelOneBiomeDepthRoleAsset(
      profile,
      roleId,
      siteOrdinal,
      seedIndex,
      baseAsset,
    );
    selectedKeys.add(selected.key);
    selectedIds.add(selected.selectionId || selected.key);
    placementCount += 1;
  }
}
assert.equal(placementCount, 400);
assert.ok(depthConfig.familyVariants.every(entry => selectedKeys.has(entry.scenicAsset.key)));
assert.ok(depthConfig.familyVariants.flatMap(entry => entry.identityFrames).every(
  entry => selectedIds.has(entry.selectionId),
));
assert.ok(depthConfig.landmarks.every(entry => selectedKeys.has(entry.asset.key)));

const fullBounds = {
  left: LEVEL_ONE_BIOME_FIELD.bounds.leftTile,
  right: LEVEL_ONE_BIOME_FIELD.bounds.rightTileExclusive,
  top: LEVEL_ONE_BIOME_FIELD.bounds.topTile,
  bottom: LEVEL_ONE_BIOME_FIELD.bounds.bottomTileExclusive,
};
const fullView = new WorldVisualLevelOneBiomeGeneratedRoleView(
  { config: { tileSize: 94 } },
  { id: "authoritative-terrain-mask" },
);
const required = fullView.resolveRequiredAssets(fullBounds);
const layeredPlacements = fullView._resolvePlacements(fullBounds);
assert.equal(required.length, 292);
assert.equal(layeredPlacements.filter(entry => entry.layerId === "primary").length, 400);
assert.equal(layeredPlacements.filter(entry => entry.layerId === "foundation").length, 64);
assert.ok(variantAssets.every(entry => required.some(asset => asset.key === entry.key)));
assert.equal(resolveLevelOneBiomeVisualFamiliesEnabled(
  LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  "?levelOneSourceFamilies=0",
), false);

const releaseAssets = getWorldVisualUndergroundDetailAssets();
assert.ok(variantAssets.every(entry => releaseAssets.some(asset => asset.key === entry.key)));
assert.equal(new Set(LEVEL_ONE_BIOME_FIELD.profiles.map(entry => entry.mapColor)).size, 50);

const generatedViewSource = fs.readFileSync(path.join(
  ROOT,
  "world/rendering/scenic-world/WorldVisualLevelOneBiomeGeneratedRoleView.js",
), "utf8");
const boundaryViewSource = fs.readFileSync(path.join(
  ROOT,
  "world/rendering/scenic-world/WorldVisualLevelOneBiomeBoundaryView.js",
), "utf8");
const mapRendererSource = fs.readFileSync(path.join(
  ROOT,
  "ui/overlays/world-map/WorldMapRenderer.js",
), "utf8");
const valueSource = fs.readFileSync(path.join(
  ROOT,
  "values/levelOneBiomeDepthVariants.js",
), "utf8");
assert.match(generatedViewSource, /resolveLevelOneBiomeDepthRoleLayers/);
assert.match(generatedViewSource, /setCrop/);
assert.match(generatedViewSource, /_worldVisualSelectionId/);
assert.match(generatedViewSource, /\.setMask\(this\.terrainMask\)/);
assert.match(boundaryViewSource, /resolveLevelOneBiomeBoundaryAssets/);
assert.match(boundaryViewSource, /% assets\.length/);
assert.match(mapRendererSource, /biome\?\.mapColor/);
assert.doesNotMatch(valueSource, /tileType|tileHp|collision|resource|drop|saveData|localStorage/);
assert.doesNotMatch(generatedViewSource, /setTile|worldModel\.(set|update)|saveData/);

console.log("level one biome depth diversity V1 contract: ok", {
  newSourceAssets: 156,
  productionMedia: 639,
  effectiveVisualSelections: 1109,
  groundConcepts: 146,
  hardSwapBackgrounds: 15,
  identityPiecesSelected: 120,
  scenicAlternatesSelected: 50,
  rareLandmarksSelected: 12,
  generatedRoleAnchors: placementCount,
  alignedFoundationLayers: 64,
  alignedBoundaryLayers: 2,
  visualOnly: true,
});
