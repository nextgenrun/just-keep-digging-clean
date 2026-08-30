import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LEVEL_ONE_BIOME_FIELD } from "../values/levelOneBiomeField.js";
import {
  LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  getLevelOneBiomeGeneratedRoleAssets,
  resolveLevelOneBiomeGeneratedRoleAsset,
} from "../values/levelOneBiomeVisualFamilies.js";
import { WorldVisualLevelOneBiomeGeneratedRoleView } from
  "../world/rendering/scenic-world/WorldVisualLevelOneBiomeGeneratedRoleView.js";
import { readWebpMetadata } from "./2026-07-28-webp-test-utils.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROLE_IDS = ["background", "signature", "ground", "foreground"];
const allAssets = getLevelOneBiomeGeneratedRoleAssets();
const retainedFamilies = LEVEL_ONE_BIOME_VISUAL_FAMILIES.families.filter(
  entry => entry.id === entry.retainedPartitionId
);
const assets = retainedFamilies.flatMap(
  family => ROLE_IDS.map(roleId => family.generatedRoleAssets[roleId])
);

assert.deepEqual(LEVEL_ONE_BIOME_VISUAL_FAMILIES.generatedRoleIds, ROLE_IDS);
assert.equal(LEVEL_ONE_BIOME_VISUAL_FAMILIES.sourceFamilyCount, 50);
assert.equal(retainedFamilies.length, 20);
assert.equal(assets.length, 80);
assert.equal(new Set(assets.map(entry => entry.key)).size, 80);
assert.equal(new Set(assets.map(entry => entry.path)).size, 80);

for (const family of retainedFamilies) {
  assert.deepEqual(Object.keys(family.generatedRoleAssets), ROLE_IDS, family.id);
  for (const roleId of ROLE_IDS) {
    const resolved = resolveLevelOneBiomeGeneratedRoleAsset(family.id, roleId);
    assert.equal(resolved, family.generatedRoleAssets[roleId]);
    const assetPath = path.join(ROOT, resolved.path);
    assert.equal(fs.existsSync(assetPath), true, resolved.path);
    const metadata = readWebpMetadata(assetPath);
    assert.deepEqual([metadata.width, metadata.height], [1536, 1024]);
    assert.equal(metadata.hasAlpha, true, resolved.path);
  }
}

assert.deepEqual(
  getLevelOneBiomeGeneratedRoleAssets(
    LEVEL_ONE_BIOME_VISUAL_FAMILIES,
    "?levelOneSourceFamilies=0"
  ),
  []
);

for (const roleId of ROLE_IDS) {
  const role = LEVEL_ONE_BIOME_VISUAL_FAMILIES.generatedRoles[roleId];
  assert.ok(role.chance > 0 && role.chance <= 1, roleId);
  assert.ok(role.placement.jitterXTiles > 0, roleId);
  assert.ok(role.placement.jitterYTiles > 0, roleId);
  assert.ok(role.render.depth > 0.1 && role.render.depth < 0.2, roleId);
}
assert.equal(
  new Set(ROLE_IDS.map(roleId => (
    LEVEL_ONE_BIOME_VISUAL_FAMILIES.generatedRoles[roleId].seedLayer
  ))).size,
  4,
  "each generated role must use a distinct deterministic seed stream"
);
assert.equal(
  new Set(ROLE_IDS.map(roleId => (
    LEVEL_ONE_BIOME_VISUAL_FAMILIES.generatedRoles[roleId].render.depth
  ))).size,
  4,
  "each role must occupy a distinct visual depth"
);

const bounds = {
  left: LEVEL_ONE_BIOME_FIELD.bounds.leftTile,
  right: LEVEL_ONE_BIOME_FIELD.bounds.rightTileExclusive,
  top: LEVEL_ONE_BIOME_FIELD.bounds.topTile,
  bottom: LEVEL_ONE_BIOME_FIELD.bounds.bottomTileExclusive,
};
const view = new WorldVisualLevelOneBiomeGeneratedRoleView(
  { config: { tileSize: 94 } },
  { id: "authoritative-terrain-mask" }
);
const required = view.resolveRequiredAssets(bounds).filter(
  entry => entry.path.includes("generated-roles-v2")
    || entry.path.includes("biome-signatures-v1")
);
assert.equal(required.length, 80, "the aligned field must exercise every retained role asset");
assert.equal(
  new Set(required.filter(entry => entry.key.includes("biome-signature-v1")).map(
    entry => entry.key
  )).size,
  20,
  "replacement art must retain every authored signature as a foundation"
);

const manifestPath = path.join(
  ROOT,
  "visual-approval-previews",
  "level-one-biome-generated-roles-v2",
  "2026-08-29-level-one-biome-generated-roles-v2.json"
);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
assert.deepEqual(manifest.counts, {
  sourceFamilies: 20,
  newGeneratedSources: 60,
  newRuntimeRoleAssets: 60,
  retainedSignatureAssets: 20,
  generatedRuntimeLibrary: 80,
  uniqueSourceHashes: 60,
  uniqueRuntimeHashes: 60,
});
assert.equal(manifest.generationMode, "built-in ImageGen, one call per distinct role asset");
assert.equal(manifest.entries.length, 60);
assert.ok(manifest.entries.every(entry => (
  entry.width === 1536
  && entry.height === 1024
  && entry.alphaMin === 0
  && entry.alphaMax >= 240
  && entry.transparentCoverage >= 0.08
  && entry.occupiedCoverage <= 0.88
)));

const viewSource = fs.readFileSync(
  path.join(
    ROOT,
    "world",
    "rendering",
    "scenic-world",
    "WorldVisualLevelOneBiomeGeneratedRoleView.js"
  ),
  "utf8"
);
const layerSource = fs.readFileSync(
  path.join(
    ROOT,
    "world",
    "rendering",
    "scenic-world",
    "WorldVisualUndergroundDetailLayer.js"
  ),
  "utf8"
);
assert.match(viewSource, /\.setMask\(this\.terrainMask\)/);
assert.match(viewSource, /_worldVisualBiomeRoleId/);
assert.doesNotMatch(viewSource, /setTile|tileType|tileHp|collision|saveData|localStorage/);
assert.match(layerSource, /getLevelOneBiomeGeneratedRoleAssets/);
assert.match(layerSource, /WorldVisualAssetCache/);

console.log(JSON.stringify({
  retainedSourceFamilies: 20,
  currentSourceFamilies: LEVEL_ONE_BIOME_VISUAL_FAMILIES.sourceFamilyCount,
  roleIds: ROLE_IDS,
  generatedRuntimeLibrary: assets.length,
  currentGeneratedRuntimeLibrary: allAssets.length,
  requiredAcrossFullField: required.length,
  demandStreamed: true,
  terrainMasked: true,
  visualOnly: true,
}, null, 2));
