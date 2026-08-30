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
import { getLevelOneBiomeDepthVariantAssets } from
  "../values/levelOneBiomeDepthVariants.js";
import { WorldVisualLevelOneBiomeGeneratedRoleView } from
  "../world/rendering/scenic-world/WorldVisualLevelOneBiomeGeneratedRoleView.js";
import { readWebpMetadata } from "./2026-07-28-webp-test-utils.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROLE_IDS = ["background", "signature", "ground", "foreground"];
const REVIEW_ROOT = path.join(
  ROOT,
  "visual-approval-previews",
  "level-one-biome-families-v3",
);
const specs = JSON.parse(fs.readFileSync(path.join(
  REVIEW_ROOT,
  "2026-08-29-level-one-biome-50-family-expansion-specs-v3.json",
), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(
  REVIEW_ROOT,
  "2026-08-29-level-one-biome-50-family-manifest-v3.json",
), "utf8"));

const profiles = LEVEL_ONE_BIOME_FIELD.profiles;
const families = LEVEL_ONE_BIOME_VISUAL_FAMILIES.families;
const profileIds = new Set(profiles.map(entry => entry.id));
const familyIds = new Set(families.map(entry => entry.id));
const profileById = new Map(profiles.map(entry => [entry.id, entry]));
const retainedFamilies = families.filter(entry => entry.id === entry.retainedPartitionId);
const expandedFamilies = families.filter(entry => entry.id !== entry.retainedPartitionId);
const retainedById = new Map(retainedFamilies.map(entry => [entry.id, entry]));
const specById = new Map(specs.families.map(entry => [entry.id, entry]));
const HARD_SWAP_IDS = new Set([
  "peat-lantern-fen", "mossglass-reservoir", "ironbark-sink",
  "stormglass-conduits", "prism-kelp-vault", "blue-salt-basilica",
  "citrine-hivefault", "bronze-pollen-rift", "sunwax-catacombs",
  "quicksilver-loom", "pale-magnet-basilica", "starless-reflectory",
  "ashen-crown-rift", "molten-chain-garden", "blackglass-crucible",
]);

assert.deepEqual(LEVEL_ONE_BIOME_VISUAL_FAMILIES.generatedRoleIds, ROLE_IDS);
assert.equal(LEVEL_ONE_BIOME_VISUAL_FAMILIES.parentMaterialFamilyCount, 5);
assert.equal(LEVEL_ONE_BIOME_VISUAL_FAMILIES.retainedPartitionFamilyCount, 20);
assert.equal(LEVEL_ONE_BIOME_VISUAL_FAMILIES.expandedGeneratedFamilyCount, 30);
assert.equal(LEVEL_ONE_BIOME_VISUAL_FAMILIES.sourceFamilyCount, 50);
assert.equal(profiles.length, 50);
assert.equal(families.length, 50);
assert.equal(retainedFamilies.length, 20);
assert.equal(expandedFamilies.length, 30);
assert.deepEqual(profileIds, familyIds);
assert.equal(new Set(profiles.map(entry => entry.label)).size, 50);
assert.equal(new Set(profiles.map(entry => entry.mapColor)).size, 50);

for (const parentRegionId of LEVEL_ONE_BIOME_FIELD.sourceRegionIds) {
  assert.equal(
    profiles.filter(entry => entry.sourceRegionId === parentRegionId).length,
    10,
    `${parentRegionId} must own ten named identities`,
  );
}

const seedsPerProfile = new Map(profiles.map(entry => [entry.id, 0]));
for (const entry of LEVEL_ONE_BIOME_FIELD.seeds) {
  seedsPerProfile.set(entry.profileId, seedsPerProfile.get(entry.profileId) + 1);
}
assert.equal(LEVEL_ONE_BIOME_FIELD.seeds.length, 100);
assert.ok([...seedsPerProfile.values()].every(count => count === 2));

assert.equal(specs.generationMode, "built-in ImageGen, one independent call per distinct asset");
assert.equal(specs.families.length, 30);
assert.deepEqual(Object.keys(specs.roles), ROLE_IDS);
assert.deepEqual(new Set(specById.keys()), new Set(expandedFamilies.map(entry => entry.id)));

for (const family of expandedFamilies) {
  const retained = retainedById.get(family.retainedPartitionId);
  const spec = specById.get(family.id);
  const profile = profileById.get(family.id);
  assert.ok(retained, `${family.id} retained partition`);
  assert.ok(spec, `${family.id} generation specification`);
  assert.ok(profile, `${family.id} field profile`);
  assert.equal(family.parentRegionId, retained.parentRegionId);
  assert.equal(family.parentRegionId, spec.parentRegionId);
  assert.equal(family.retainedPartitionId, spec.inheritsRetainedFrom);
  assert.equal(profile.label, spec.label);
  if (HARD_SWAP_IDS.has(family.id)) {
    assert.notEqual(profile.mapColor, Number.parseInt(spec.mapColor, 16));
  } else {
    assert.equal(profile.mapColor, Number.parseInt(spec.mapColor, 16));
  }
  assert.equal(profile.assetOffset, spec.assetOffset);
  assert.equal(family.layerSeeds.backdrop, spec.seedBase + 11);
  assert.equal(new Set(Object.values(family.layerSeeds)).size, 9, family.id);
  assert.deepEqual(Object.keys(family.generatedRoleAssets), ROLE_IDS, family.id);
  for (const roleId of ROLE_IDS) {
    const asset = family.generatedRoleAssets[roleId];
    assert.equal(resolveLevelOneBiomeGeneratedRoleAsset(family.id, roleId), asset);
    assert.match(asset.key, new RegExp(`-${roleId}-v3-${family.id}$`));
    assert.match(asset.path, /level1-biome-generated-roles-v3/);
  }
}

const assets = getLevelOneBiomeGeneratedRoleAssets();
const v3Assets = expandedFamilies.flatMap(
  family => ROLE_IDS.map(roleId => family.generatedRoleAssets[roleId]),
);
assert.equal(assets.length, 200);
assert.equal(v3Assets.length, 120);
assert.equal(new Set(assets.map(entry => entry.key)).size, 200);
assert.equal(new Set(assets.map(entry => entry.path)).size, 200);
for (const asset of v3Assets) {
  const assetPath = path.join(ROOT, asset.path);
  assert.equal(fs.existsSync(assetPath), true, asset.path);
  const metadata = readWebpMetadata(assetPath);
  assert.deepEqual([metadata.width, metadata.height], [1536, 1024]);
  assert.equal(metadata.hasAlpha, true, asset.path);
}

const fullBounds = {
  left: LEVEL_ONE_BIOME_FIELD.bounds.leftTile,
  right: LEVEL_ONE_BIOME_FIELD.bounds.rightTileExclusive,
  top: LEVEL_ONE_BIOME_FIELD.bounds.topTile,
  bottom: LEVEL_ONE_BIOME_FIELD.bounds.bottomTileExclusive,
};
const view = new WorldVisualLevelOneBiomeGeneratedRoleView(
  { config: { tileSize: 94 } },
  { id: "authoritative-terrain-mask" },
);
const required = view.resolveRequiredAssets(fullBounds);
const depthVariantAssets = getLevelOneBiomeDepthVariantAssets();
assert.equal(required.length, 292);
assert.ok(depthVariantAssets.every(entry => (
  required.some(requiredAsset => requiredAsset.key === entry.key)
)), "all depth variants must be map-visible across Level One");
const rollbackView = new WorldVisualLevelOneBiomeGeneratedRoleView(
  { config: { tileSize: 94 } },
  { id: "authoritative-terrain-mask" },
  LEVEL_ONE_BIOME_FIELD,
  LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  "?levelOneSourceFamilies=0",
);
assert.deepEqual(rollbackView.resolveRequiredAssets(fullBounds), []);

assert.deepEqual(manifest.counts, {
  addedSourceFamilies: 30,
  totalSourceFamilies: 50,
  newGeneratedSources: 120,
  newRuntimeRoleAssets: 120,
  totalGeneratedRuntimeLibrary: 200,
  uniqueSourceHashes: 120,
  uniqueRuntimeHashes: 120,
});
assert.equal(manifest.generationMode, specs.generationMode);
assert.equal(manifest.rollback, "?levelOneSourceFamilies=0");
assert.equal(manifest.entries.length, 120);
assert.equal(new Set(manifest.entries.map(entry => entry.sourceSha256)).size, 120);
assert.equal(new Set(manifest.entries.map(entry => entry.runtimeSha256)).size, 120);
for (const entry of manifest.entries) {
  assert.equal(fs.existsSync(path.join(ROOT, entry.source)), true, entry.source);
  assert.equal(fs.existsSync(path.join(ROOT, entry.runtime)), true, entry.runtime);
  assert.deepEqual([entry.width, entry.height], [1536, 1024]);
  assert.equal(entry.alphaMin, 0);
  assert.ok(entry.alphaMax >= 240);
  assert.ok(entry.transparentCoverage >= 0.08);
  assert.ok(entry.occupiedCoverage >= 0.04 && entry.occupiedCoverage <= 0.88);
}
assert.equal(fs.existsSync(path.join(ROOT, manifest.contactSheet)), true);
assert.equal(Object.keys(manifest.regionContactSheets).length, 5);
assert.ok(Object.values(manifest.regionContactSheets).every(relativePath => (
  fs.existsSync(path.join(ROOT, relativePath))
)));

for (const roleId of ROLE_IDS) {
  assert.equal(LEVEL_ONE_BIOME_VISUAL_FAMILIES.generatedRoles[roleId].chance, 1);
}
const viewSource = fs.readFileSync(path.join(
  ROOT,
  "world",
  "rendering",
  "scenic-world",
  "WorldVisualLevelOneBiomeGeneratedRoleView.js",
), "utf8");
const layerSource = fs.readFileSync(path.join(
  ROOT,
  "world",
  "rendering",
  "scenic-world",
  "WorldVisualUndergroundDetailLayer.js",
), "utf8");
const bootSources = ["BootScene.js", "WorldLoadScene.js", "BootCapabilityAssetPreloader.js"]
  .map(fileName => fs.readFileSync(path.join(ROOT, "ui", "scenes", fileName), "utf8"))
  .join("\n");
assert.match(viewSource, /\.setMask\(this\.terrainMask\)/);
assert.doesNotMatch(viewSource, /setTile|tileType|tileHp|collision|saveData|localStorage/);
assert.match(layerSource, /WorldVisualAssetCache/);
assert.match(layerSource, /getLevelOneBiomeGeneratedRoleAssets/);
assert.doesNotMatch(bootSources, /level1-biome-generated-roles-v3/);

console.log("level one 50-family V3 contract: ok", {
  families: families.length,
  addedFamilies: expandedFamilies.length,
  generatedRoleAssets: assets.length,
  newIndependentAssets: v3Assets.length,
  fullFieldRequiredAssets: required.length,
  visualOnly: true,
  demandStreamed: true,
});
