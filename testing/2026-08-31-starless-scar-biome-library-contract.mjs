import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {
  LEVEL_ONE_BIOME_FIELD,
  resolveLevelOneBiomeFieldAtTile,
} from "../values/levelOneBiomeField.js";
import {
  LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  resolveLevelOneBiomeVisualFamily,
} from "../values/levelOneBiomeVisualFamilies.js";
import { STAR_SANCTUARY_CONFIG } from "../values/starSanctuary.js";
import {
  STARLESS_SCAR_BIOME_PALETTES,
  getStarlessScarBiomePalette,
  resolveStarlessScarBiomeLibraryEnabled,
  resolveStarlessScarRegionPalette,
} from "../values/starlessScarBiomePalettes.js";
import { WORLD_VISUAL_UNDERGROUND_DETAILS } from
  "../values/worldVisualUndergroundDetails.js";
import {
  resolveStarlessScarPaletteAtTile,
  resolveStarlessScarPropFrame,
  shouldPlaceStarlessScarProp,
} from "../systems/visual/starlessScarPaletteResolver.js";

const PALETTE_COUNT = 20;
const ROLE_IDS = Object.freeze(["ground", "center", "frontier", "props"]);
const RUNTIME_ASSET_COUNT = PALETTE_COUNT * ROLE_IDS.length;
const manifestUrl = new URL(
  "../sprites/environment/starless-scar-biomes-v1/manifest-v1.json",
  import.meta.url,
);
const runtimeDirectoryUrl = new URL(
  "../sprites/environment/starless-scar-biomes-v1/runtime/",
  import.meta.url,
);
const manifest = JSON.parse(fs.readFileSync(manifestUrl, "utf8"));
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const paletteViewSource = fs.readFileSync(new URL(
  "../systems/visual/StarlessScarPaletteView.js",
  import.meta.url,
), "utf8");
const biomeLayerSource = fs.readFileSync(new URL(
  "../systems/visual/StarlessScarBiomeAssetLayer.js",
  import.meta.url,
), "utf8");
const scarViewSource = fs.readFileSync(new URL(
  "../systems/visual/StarlessScarView.js",
  import.meta.url,
), "utf8");

assert.equal(STARLESS_SCAR_BIOME_PALETTES.paletteCount, PALETTE_COUNT);
assert.equal(STARLESS_SCAR_BIOME_PALETTES.palettes.length, PALETTE_COUNT);
const paletteIds = STARLESS_SCAR_BIOME_PALETTES.palettes.map(entry => entry.id);
assert.equal(new Set(paletteIds).size, PALETTE_COUNT, "palette IDs must be unique");
assert.deepEqual(Object.keys(STARLESS_SCAR_BIOME_PALETTES.paletteById), paletteIds);

assert.deepEqual(manifest.counts, {
  palettes: PALETTE_COUNT,
  runtimeAssets: RUNTIME_ASSET_COUNT,
  overlayPropFrames: 80,
});
assert.equal(manifest.entries.length, PALETTE_COUNT);
assert.deepEqual(manifest.entries.map(entry => entry.id), paletteIds);
assert.equal(new Set(manifest.entries.map(entry => entry.id)).size, PALETTE_COUNT);

const manifestById = new Map(manifest.entries.map(entry => [entry.id, entry]));
const runtimePaths = new Set();
const runtimeKeys = new Set();
let verifiedRuntimeAssets = 0;
let verifiedPropFrames = 0;

for (const palette of STARLESS_SCAR_BIOME_PALETTES.palettes) {
  const manifestEntry = manifestById.get(palette.id);
  assert.ok(manifestEntry, `manifest entry missing for ${palette.id}`);
  assert.equal(manifestEntry.parentRegionId, palette.parentRegionId);
  assert.deepEqual(Object.keys(palette.assets), ROLE_IDS);
  assert.deepEqual(Object.keys(manifestEntry.assets), ROLE_IDS);

  for (const role of ROLE_IDS) {
    const runtimeAsset = palette.assets[role];
    const manifestAsset = manifestEntry.assets[role];
    assert.equal(runtimeAsset.type, "image");
    assert.equal(
      runtimeAsset.key,
      `environment-starless-scar-biome-v1-${palette.id}-${role}`,
    );
    assert.equal(
      runtimeAsset.path,
      `sprites/environment/starless-scar-biomes-v1/runtime/`
        + `${palette.id}-${role}-v1.webp`,
    );
    assert.equal(manifestAsset.path, runtimeAsset.path);
    assert.deepEqual(manifestAsset.size, [512, 512]);
    assert.ok(!runtimePaths.has(runtimeAsset.path), `duplicate path ${runtimeAsset.path}`);
    assert.ok(!runtimeKeys.has(runtimeAsset.key), `duplicate key ${runtimeAsset.key}`);
    runtimePaths.add(runtimeAsset.path);
    runtimeKeys.add(runtimeAsset.key);

    const runtimeUrl = new URL(`../${runtimeAsset.path}`, import.meta.url);
    const runtimeBytes = fs.readFileSync(runtimeUrl);
    assert.equal(runtimeBytes.byteLength, manifestAsset.bytes, `${runtimeAsset.path} bytes`);
    assert.equal(sha256(runtimeBytes), manifestAsset.sha256, `${runtimeAsset.path} hash`);
    verifiedRuntimeAssets += 1;
  }

  const propsSize = manifestEntry.assets.props.size;
  const propColumns = propsSize[0]
    / STARLESS_SCAR_BIOME_PALETTES.propAtlas.frameWidthPx;
  const propRows = propsSize[1]
    / STARLESS_SCAR_BIOME_PALETTES.propAtlas.frameHeightPx;
  assert.ok(Number.isInteger(propColumns) && Number.isInteger(propRows));
  assert.equal(
    propColumns * propRows,
    STARLESS_SCAR_BIOME_PALETTES.propAtlas.frameCount,
    `${palette.id} prop atlas frame layout`,
  );
  verifiedPropFrames += propColumns * propRows;
}

assert.equal(verifiedRuntimeAssets, RUNTIME_ASSET_COUNT);
assert.equal(runtimePaths.size, RUNTIME_ASSET_COUNT);
assert.equal(runtimeKeys.size, RUNTIME_ASSET_COUNT);
assert.deepEqual(STARLESS_SCAR_BIOME_PALETTES.propAtlas, {
  frameWidthPx: 256,
  frameHeightPx: 256,
  frameCount: 4,
});
assert.equal(verifiedPropFrames, manifest.counts.overlayPropFrames);
assert.equal(
  manifest.counts.overlayPropFrames,
  PALETTE_COUNT * STARLESS_SCAR_BIOME_PALETTES.propAtlas.frameCount,
);

assert.match(paletteViewSource, /this\.territoryMaskGraphics\.createGeometryMask\(\)/);
assert.match(paletteViewSource, /this\.solidMaskGraphics\.createGeometryMask\(\)/);
assert.match(paletteViewSource, /\.setMask\(this\.solidMask\)/);
assert.match(paletteViewSource, /onError: \(\) =>/);
assert.match(biomeLayerSource, /const cellGroups = groupByPalette\(cells\)/);
assert.match(biomeLayerSource, /const solidCellGroups = groupByPalette\(solidCells\)/);
assert.match(scarViewSource, /cell\.site\?\.tx \?\? cell\.tx/);
assert.match(scarViewSource, /cell\.site\?\.ty \?\? cell\.ty/);

const runtimeDirectoryFiles = fs.readdirSync(runtimeDirectoryUrl, {
  withFileTypes: true,
}).filter(entry => entry.isFile()).map(entry => entry.name).sort();
const referencedRuntimeFiles = [...runtimePaths]
  .map(path => path.slice(path.lastIndexOf("/") + 1))
  .sort();
assert.equal(runtimeDirectoryFiles.length, RUNTIME_ASSET_COUNT);
assert.deepEqual(runtimeDirectoryFiles, referencedRuntimeFiles);

assert.equal(LEVEL_ONE_BIOME_FIELD.profiles.length, 50);
assert.equal(LEVEL_ONE_BIOME_VISUAL_FAMILIES.sourceFamilyCount, 50);
const retainedPaletteIds = new Set();
for (const profile of LEVEL_ONE_BIOME_FIELD.profiles) {
  const family = resolveLevelOneBiomeVisualFamily(profile);
  assert.ok(family, `visual family missing for ${profile.id}`);
  assert.equal(family.id, profile.id);
  assert.equal(family.parentRegionId, profile.sourceRegionId);
  assert.ok(family.retainedPartitionId, `retained partition missing for ${profile.id}`);
  const retainedPalette = getStarlessScarBiomePalette(family.retainedPartitionId);
  assert.ok(
    retainedPalette,
    `${profile.id} retained partition ${family.retainedPartitionId} has no scar palette`,
  );
  assert.equal(retainedPalette.parentRegionId, profile.sourceRegionId);
  retainedPaletteIds.add(retainedPalette.id);
}
assert.deepEqual([...retainedPaletteIds].sort(), [...paletteIds].sort());

const deepRegions = WORLD_VISUAL_UNDERGROUND_DETAILS.regions.filter(
  region => region.id.startsWith("level2-"),
);
assert.equal(deepRegions.length, 5);
for (const [index, region] of deepRegions.entries()) {
  const tileX = 12;
  const tileY = region.topTile;
  const stableSeed = 9100 + index;
  assert.equal(resolveLevelOneBiomeFieldAtTile(tileX, tileY), null);
  const expected = resolveStarlessScarRegionPalette(region.id, stableSeed);
  const first = resolveStarlessScarPaletteAtTile(tileX, tileY, {
    starProfile: { seed: stableSeed },
  });
  const repeated = resolveStarlessScarPaletteAtTile(tileX, tileY, {
    starProfile: { seed: stableSeed },
  });
  assert.strictEqual(first, expected, `${region.id} depth fallback`);
  assert.strictEqual(repeated, first, `${region.id} fallback must be deterministic`);
  assert.ok(STARLESS_SCAR_BIOME_PALETTES.paletteIdsByRegion[region.id].includes(first.id));
}
assert.equal(
  resolveStarlessScarRegionPalette("unmapped-deep-region", 777).id,
  STARLESS_SCAR_BIOME_PALETTES.fallbackPaletteId,
);

assert.equal(resolveStarlessScarPropFrame(12, 34, 56), 1);
assert.equal(resolveStarlessScarPropFrame(12, 34, 56), 1);
assert.equal(resolveStarlessScarPropFrame(-7, 2201, 42), 3);
assert.equal(resolveStarlessScarPropFrame(12, 34, 56, 1), 0);
assert.equal(shouldPlaceStarlessScarProp(14, 2066, 42), true);
assert.equal(shouldPlaceStarlessScarProp(14, 2066, 42), true);
assert.equal(shouldPlaceStarlessScarProp(15, 2066, 42), false);
assert.equal(shouldPlaceStarlessScarProp(14, 2066, 43), false);

assert.equal(
  resolveStarlessScarBiomeLibraryEnabled(STARLESS_SCAR_BIOME_PALETTES, ""),
  true,
);
assert.equal(
  resolveStarlessScarBiomeLibraryEnabled(
    STARLESS_SCAR_BIOME_PALETTES,
    "?scarBiomeLibrary=1",
  ),
  true,
);
for (const disabledValue of STARLESS_SCAR_BIOME_PALETTES.disabledValues) {
  assert.equal(
    resolveStarlessScarBiomeLibraryEnabled(
      STARLESS_SCAR_BIOME_PALETTES,
      `?scarBiomeLibrary=${disabledValue}`,
    ),
    false,
    `${disabledValue} must restore the legacy visual`,
  );
}
assert.equal(
  resolveStarlessScarPaletteAtTile(12, 2065, {
    starProfile: { seed: 9100 },
    search: "?scarBiomeLibrary=legacy",
  }),
  null,
);

const legacyAssets = STAR_SANCTUARY_CONFIG.scar.visual.assets;
assert.deepEqual(Object.keys(legacyAssets), [
  "ground",
  "corruption",
  "center",
  "frontier",
]);
assert.deepEqual(legacyAssets, {
  ground: {
    key: "environment-starless-scar-walkable-ground-v3",
    path: "sprites/environment/starless-scar-v3/starless-scar-walkable-ground-v3.png",
  },
  corruption: {
    key: "environment-starless-scar-territory-material-v2",
    path: "sprites/environment/starless-scar-v2/starless-scar-territory-material-v2.png",
  },
  center: {
    key: "environment-starless-scar-dead-center-v3",
    path: "sprites/environment/starless-scar-v3/starless-scar-dead-center-v3.png",
  },
  frontier: {
    key: "environment-starless-scar-frontier-edge-v3",
    path: "sprites/environment/starless-scar-v3/starless-scar-frontier-edge-v3.png",
  },
});
const legacyPaths = new Set(Object.values(legacyAssets).map(asset => asset.path));
const legacyKeys = new Set(Object.values(legacyAssets).map(asset => asset.key));
for (const runtimePath of runtimePaths) assert.ok(!legacyPaths.has(runtimePath));
for (const runtimeKey of runtimeKeys) assert.ok(!legacyKeys.has(runtimeKey));

console.log(
  "Starless Scar biome library contract passed: 20 palettes, 80 hashed runtime "
    + "assets, 50 retained-profile mappings, isolated territory/solid masks, "
    + "deterministic deep fallback/props, and exact four-asset legacy rollback",
);
