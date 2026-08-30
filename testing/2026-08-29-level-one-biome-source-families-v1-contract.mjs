import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LEVEL_ONE_BIOME_FIELD } from "../values/levelOneBiomeField.js";
import {
  LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  getLevelOneBiomeSignatureAssets,
  resolveLevelOneBiomeDetailFrameIndexes,
  resolveLevelOneBiomeFamilyAssets,
  resolveLevelOneBiomeLayerSeed,
  resolveLevelOneBiomeVisualFamiliesEnabled,
} from "../values/levelOneBiomeVisualFamilies.js";
import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  resolveWorldVisualDepthBackdropRegionAssets,
} from "../values/worldVisualDepthBackdrops.js";
import {
  WORLD_VISUAL_TERRAIN_VARIATION,
  resolveWorldVisualTerrainVariationRegions,
} from "../values/worldVisualTerrainVariation.js";
import {
  WORLD_VISUAL_GROUND_STRUCTURES,
  resolveWorldVisualGroundStructureRuntimeRegions,
} from "../values/worldVisualGroundStructures.js";
import { WorldVisualLevelOneBiomeGeneratedRoleView } from
  "../world/rendering/scenic-world/WorldVisualLevelOneBiomeGeneratedRoleView.js";
import { readWebpMetadata } from "./2026-07-28-webp-test-utils.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIELD_TOP = LEVEL_ONE_BIOME_FIELD.bounds.topTile;
const FIELD_BOTTOM = LEVEL_ONE_BIOME_FIELD.bounds.bottomTileExclusive;
const PROFILE_BY_ID = new Map(
  LEVEL_ONE_BIOME_FIELD.profiles.map(profile => [profile.id, profile])
);
const FAMILY_IDS = new Set(
  LEVEL_ONE_BIOME_VISUAL_FAMILIES.families.map(entry => entry.id)
);
const PROFILE_IDS = new Set(PROFILE_BY_ID.keys());
const RETAINED_FAMILIES = LEVEL_ONE_BIOME_VISUAL_FAMILIES.families.filter(
  entry => entry.id === entry.retainedPartitionId
);

assert.equal(resolveLevelOneBiomeVisualFamiliesEnabled(undefined, ""), true);
assert.equal(
  resolveLevelOneBiomeVisualFamiliesEnabled(
    LEVEL_ONE_BIOME_VISUAL_FAMILIES,
    "?levelOneSourceFamilies=0"
  ),
  false
);
assert.equal(LEVEL_ONE_BIOME_VISUAL_FAMILIES.parentMaterialFamilyCount, 5);
assert.equal(LEVEL_ONE_BIOME_VISUAL_FAMILIES.sourceFamilyCount, 50);
assert.equal(LEVEL_ONE_BIOME_VISUAL_FAMILIES.retainedPartitionFamilyCount, 20);
assert.equal(
  LEVEL_ONE_BIOME_VISUAL_FAMILIES.retainedPartitionFamilyCount
    / LEVEL_ONE_BIOME_VISUAL_FAMILIES.parentMaterialFamilyCount,
  4,
  "the retained atlas library stays partitioned from five to twenty"
);
assert.deepEqual(FAMILY_IDS, PROFILE_IDS);

const terrainByRegion = new Map(
  resolveWorldVisualTerrainVariationRegions(FIELD_TOP, FIELD_BOTTOM)
    .map(entry => [entry.id, entry])
);
const structuresByRegion = new Map(
  resolveWorldVisualGroundStructureRuntimeRegions(FIELD_TOP, FIELD_BOTTOM)
    .map(entry => [entry.id, entry])
);
const backdropsByRegion = new Map(
  WORLD_VISUAL_DEPTH_BACKDROPS.regions
    .filter(entry => LEVEL_ONE_BIOME_FIELD.sourceRegionIds.includes(entry.id))
    .map(entry => [
      entry.id,
      resolveWorldVisualDepthBackdropRegionAssets(
        entry,
        WORLD_VISUAL_DEPTH_BACKDROPS,
        ""
      ),
    ])
);

const parentPools = Object.freeze({
  backdrop: backdropsByRegion,
  terrain: new Map([...terrainByRegion].map(([id, entry]) => [id, entry.plates])),
  groundStructure: new Map(
    [...structuresByRegion].map(([id, entry]) => [id, entry.assets])
  ),
});

for (const family of LEVEL_ONE_BIOME_VISUAL_FAMILIES.families) {
  const profile = PROFILE_BY_ID.get(family.id);
  assert.ok(profile, family.id);
  assert.equal(family.parentRegionId, profile.sourceRegionId, family.id);
  assert.equal(new Set(Object.values(family.layerSeeds)).size, 9, family.id);
  for (const layerId of Object.keys(parentPools)) {
    const parentAssets = parentPools[layerId].get(family.parentRegionId);
    const selected = resolveLevelOneBiomeFamilyAssets(
      profile,
      layerId,
      parentAssets
    );
    assert.ok(selected.length >= 1, `${family.id} ${layerId}`);
    assert.ok(selected.length < parentAssets.length, `${family.id} owns a real subset`);
    assert.deepEqual(
      resolveLevelOneBiomeFamilyAssets(
        profile,
        layerId,
        parentAssets,
        LEVEL_ONE_BIOME_VISUAL_FAMILIES,
        "?levelOneSourceFamilies=0"
      ),
      parentAssets,
      "rollback restores the former shared parent pool"
    );
  }
  for (const kind of ["textures", "props"]) {
    const frames = resolveLevelOneBiomeDetailFrameIndexes(profile, kind);
    assert.equal(frames.length, 5, `${family.id} ${kind}`);
    assert.equal(new Set(frames).size, 5, `${family.id} ${kind} unique frames`);
    assert.ok(frames.every(frame => frame >= 0 && frame < 20));
  }
  assert.equal(
    resolveLevelOneBiomeLayerSeed(
      profile,
      "backdrop",
      LEVEL_ONE_BIOME_VISUAL_FAMILIES,
      "?levelOneSourceFamilies=0"
    ),
    profile.assetOffset
  );
}

for (const parentRegionId of LEVEL_ONE_BIOME_FIELD.sourceRegionIds) {
  const families = RETAINED_FAMILIES.filter(
    entry => entry.parentRegionId === parentRegionId
  );
  assert.equal(families.length, 4, parentRegionId);
  for (const [layerId, poolsByParent] of Object.entries(parentPools)) {
    const parentAssets = poolsByParent.get(parentRegionId);
    const selectedKeys = families.flatMap(family => (
      resolveLevelOneBiomeFamilyAssets(
        PROFILE_BY_ID.get(family.id),
        layerId,
        parentAssets
      ).map(asset => asset.key)
    ));
    assert.equal(
      selectedKeys.length,
      new Set(selectedKeys).size,
      `${parentRegionId} ${layerId} subsets may not overlap`
    );
    const retainedKeys = selectedKeys.filter(key => (
      parentAssets.some(asset => asset.key === key)
    ));
    assert.deepEqual(
      new Set(retainedKeys),
      new Set(parentAssets.map(asset => asset.key)),
      `${parentRegionId} ${layerId} must leverage the complete retained pool`
    );
    if (layerId === "terrain") {
      assert.equal(
        selectedKeys.length - retainedKeys.length,
        4,
        `${parentRegionId} terrain adds one tertiary plate per retained family`
      );
    } else {
      assert.equal(selectedKeys.length, retainedKeys.length, layerId);
    }
  }
  for (const kind of ["textures", "props"]) {
    const selectedFrames = families.flatMap(family => (
      resolveLevelOneBiomeDetailFrameIndexes(
        PROFILE_BY_ID.get(family.id),
        kind
      )
    ));
    assert.deepEqual(
      new Set(selectedFrames),
      new Set(Array.from({ length: 20 }, (_value, index) => index)),
      `${parentRegionId} ${kind} must partition all twenty atlas frames`
    );
    assert.equal(selectedFrames.length, 20);
  }
}

const signatures = getLevelOneBiomeSignatureAssets().filter(
  entry => entry.path.includes("level1-biome-signatures-v1")
);
assert.equal(signatures.length, 20);
assert.equal(new Set(signatures.map(entry => entry.key)).size, 20);
assert.equal(new Set(signatures.map(entry => entry.path)).size, 20);
for (const signature of signatures) {
  const signaturePath = path.join(ROOT, signature.path);
  assert.equal(fs.existsSync(signaturePath), true, signature.path);
  const metadata = readWebpMetadata(signaturePath);
  assert.deepEqual([metadata.width, metadata.height], [1536, 1024]);
  assert.equal(metadata.hasAlpha, true, signature.path);
}

const manifestPath = path.join(
  ROOT,
  "visual-approval-previews",
  "level-one-biome-source-families-v1",
  "2026-08-29-level-one-biome-source-families-v1.json"
);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
assert.deepEqual(manifest.counts, {
  sourceFamilies: 20,
  generatedSignatures: 20,
  uniqueSourceHashes: 20,
  uniqueRuntimeHashes: 20,
});
assert.equal(manifest.sourceFamilyExpansion.multiplier, 4);
assert.ok(manifest.entries.every(entry => (
  entry.width === 1536
  && entry.height === 1024
  && entry.alphaMin === 0
  && entry.alphaMax >= 240
  && entry.transparentCoverage >= 0.25
  && entry.occupiedCoverage <= 0.75
)));

const generatedRoleView = new WorldVisualLevelOneBiomeGeneratedRoleView(
  { config: { tileSize: 94 } },
  { id: "authoritative-terrain-mask" }
);
const fullBounds = {
  left: LEVEL_ONE_BIOME_FIELD.bounds.leftTile,
  right: LEVEL_ONE_BIOME_FIELD.bounds.rightTileExclusive,
  top: FIELD_TOP,
  bottom: FIELD_BOTTOM,
};
assert.deepEqual(
  new Set(
    generatedRoleView.resolveRequiredAssets(fullBounds)
      .filter(entry => entry.key.includes("biome-signature-v1"))
      .map(entry => entry.key)
  ),
  new Set(signatures.map(entry => entry.key)),
  "the aligned field must exercise every retained signature"
);
const rollbackView = new WorldVisualLevelOneBiomeGeneratedRoleView(
  { config: { tileSize: 94 } },
  { id: "authoritative-terrain-mask" },
  LEVEL_ONE_BIOME_FIELD,
  LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  "?levelOneSourceFamilies=0"
);
assert.deepEqual(rollbackView.resolveRequiredAssets(fullBounds), []);

const generatedRoleViewSource = fs.readFileSync(
  path.join(
    ROOT,
    "world",
    "rendering",
    "scenic-world",
    "WorldVisualLevelOneBiomeGeneratedRoleView.js"
  ),
  "utf8"
);
const detailLayerSource = fs.readFileSync(
  path.join(
    ROOT,
    "world",
    "rendering",
    "scenic-world",
    "WorldVisualUndergroundDetailLayer.js"
  ),
  "utf8"
);
assert.match(generatedRoleViewSource, /\.setMask\(this\.terrainMask\)/);
assert.doesNotMatch(
  generatedRoleViewSource,
  /setTile|tileType|tileHp|collision|saveData|localStorage/
);
assert.match(detailLayerSource, /WorldVisualLevelOneBiomeGeneratedRoleView/);
assert.match(detailLayerSource, /getLevelOneBiomeGeneratedRoleAssets/);

console.log(JSON.stringify({
  parentMaterialFamilies: 5,
  retainedPartitionFamilies: 20,
  currentSourceFamilies: LEVEL_ONE_BIOME_VISUAL_FAMILIES.sourceFamilyCount,
  multiplier: 4,
  generatedSignatures: signatures.length,
  completePoolPartition: true,
  visualOnly: true,
}, null, 2));
