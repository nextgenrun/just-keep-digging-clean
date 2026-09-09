import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  LEVEL_ONE_BIOME_FIELD,
  getLevelOneBiomeBoundaryAssets,
  resolveLevelOneBiomeFieldAtTile,
  resolveLevelOneBiomeFieldEnabled,
} from "../values/levelOneBiomeField.js";
import {
  LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  getLevelOneBiomeGeneratedRoleAssets,
  getLevelOneBiomeGroundMaterialAssets,
} from "../values/levelOneBiomeVisualFamilies.js";
import {
  LEVEL_ONE_BIOME_DEPTH_VARIANTS,
  getLevelOneBiomeDepthVariantAssets,
} from "../values/levelOneBiomeDepthVariants.js";
import {
  WORLD_VISUAL_DEPTH_BACKDROPS,
  resolveWorldVisualDepthBackdropRegionAssets,
  resolveWorldVisualDepthBackdropRegions,
} from "../values/worldVisualDepthBackdrops.js";
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
import { WORLD_VISUAL_BACKDROP_ENHANCERS } from
  "../values/worldVisualBackdropEnhancers.js";
import {
  WORLD_VISUAL_MATERIALS,
  WORLD_VISUAL_MATERIAL_BANDS,
} from "../values/worldVisualMaterials.js";
import { WorldVisualDepthBackdropRegionView } from
  "../world/rendering/scenic-world/WorldVisualDepthBackdropRegionView.js";
import { WorldVisualTerrainVariationRegionView } from
  "../world/rendering/scenic-world/WorldVisualTerrainVariationRegionView.js";
import { WorldVisualGroundStructureRegionView } from
  "../world/rendering/scenic-world/WorldVisualGroundStructureRegionView.js";
import { WorldVisualUndergroundDetailRegionView } from
  "../world/rendering/scenic-world/WorldVisualUndergroundDetailRegionView.js";
import { WorldVisualLevelOneBiomeBoundaryView } from
  "../world/rendering/scenic-world/WorldVisualLevelOneBiomeBoundaryView.js";
import { WORLD_MAP_CONFIG } from "../values/worldMapConfig.js";
import { LEVEL_ONE_LIVING_BACKDROP } from "../values/levelOneLivingBackdrop.js";
import { readWebpMetadata } from "./2026-07-28-webp-test-utils.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIELD_TOP = LEVEL_ONE_BIOME_FIELD.bounds.topTile;
const FIELD_BOTTOM = LEVEL_ONE_BIOME_FIELD.bounds.bottomTileExclusive;
const FIELD_RIGHT = LEVEL_ONE_BIOME_FIELD.bounds.rightTileExclusive;
const FIELD_DEPTH_M = FIELD_BOTTOM - FIELD_TOP;
const WORLD_WIDTH = 280;
const SOURCE_IDS = new Set(LEVEL_ONE_BIOME_FIELD.sourceRegionIds);
const PROFILE_IDS = new Set(LEVEL_ONE_BIOME_FIELD.profiles.map(entry => entry.id));

assert.equal(resolveLevelOneBiomeFieldEnabled(LEVEL_ONE_BIOME_FIELD, ""), true);
assert.equal(
  resolveLevelOneBiomeFieldEnabled(LEVEL_ONE_BIOME_FIELD, "?levelOneBiomeField=0"),
  false,
);
assert.deepEqual(LEVEL_ONE_BIOME_FIELD.cadenceMeters, {
  minimum: 80,
  targetMaximum: 150,
});
assert.equal(FIELD_DEPTH_M, 2000);
assert.equal(
  FIELD_RIGHT,
  LEVEL_ONE_LIVING_BACKDROP.regions.level1.rightTileExclusive,
  "the field must stop at Level 1 gameplay ownership",
);
assert.equal(resolveLevelOneBiomeFieldAtTile(0, FIELD_TOP - 1), null);
assert.equal(resolveLevelOneBiomeFieldAtTile(0, FIELD_BOTTOM), null);
assert.equal(resolveLevelOneBiomeFieldAtTile(-1, FIELD_TOP), null);
assert.equal(resolveLevelOneBiomeFieldAtTile(FIELD_RIGHT, FIELD_TOP), null);

const sampledProfiles = new Set();
const sampledSources = new Set();
for (let tileY = FIELD_TOP; tileY < FIELD_BOTTOM; tileY += 2) {
  for (let tileX = 0; tileX < FIELD_RIGHT; tileX += 2) {
    const resolved = resolveLevelOneBiomeFieldAtTile(tileX, tileY);
    sampledProfiles.add(resolved.id);
    sampledSources.add(resolved.sourceRegionId);
  }
}
assert.deepEqual(sampledProfiles, PROFILE_IDS, "all fifty authored visual profiles must appear");
assert.deepEqual(sampledSources, SOURCE_IDS, "all five Level 1 asset families must appear");

// Digging left or right at each representative depth must cross multiple
// territories; these rows may not collapse to a single horizontal band.
for (let depthM = 0; depthM < FIELD_DEPTH_M; depthM += 50) {
  const rowProfiles = new Set();
  for (let tileX = 0; tileX < FIELD_RIGHT; tileX += 2) {
    rowProfiles.add(resolveLevelOneBiomeFieldAtTile(
      tileX,
      FIELD_TOP + depthM,
    ).id);
  }
  assert.ok(rowProfiles.size >= 3, `${depthM}m must expose at least three lateral regions`);
}

// Named visual-region runs stay within the requested 80-150m cadence. Edge
// slices can be shorter where an irregular border crosses a column, so the
// interior median is the meaningful lower-bound measure.
let longestProfileRun = 0;
const interiorRunLengths = [];
for (let tileX = 0; tileX < FIELD_RIGHT; tileX += 1) {
  let runProfile = null;
  let runStart = 0;
  for (let depthM = 0; depthM <= FIELD_DEPTH_M; depthM += 1) {
    const profileId = depthM < FIELD_DEPTH_M
      ? resolveLevelOneBiomeFieldAtTile(tileX, FIELD_TOP + depthM).id
      : null;
    if (profileId === runProfile) continue;
    if (runProfile) {
      const runLength = depthM - runStart;
      longestProfileRun = Math.max(longestProfileRun, runLength);
      if (runStart > 0 && depthM < FIELD_DEPTH_M) interiorRunLengths.push(runLength);
    }
    runProfile = profileId;
    runStart = depthM;
  }
}
interiorRunLengths.sort((left, right) => left - right);
const medianInteriorRun = interiorRunLengths[Math.floor(interiorRunLengths.length / 2)];
const lowerDecileInteriorRun = interiorRunLengths[Math.floor(interiorRunLengths.length * 0.1)];
console.log("LEVEL_ONE_BIOME_FIELD_RUNS", {
  sampleCount: interiorRunLengths.length,
  lowerDecileInteriorRun,
  medianInteriorRun,
  longestProfileRun,
});
assert.ok(longestProfileRun <= LEVEL_ONE_BIOME_FIELD.cadenceMeters.targetMaximum);
assert.ok(medianInteriorRun >= LEVEL_ONE_BIOME_FIELD.cadenceMeters.minimum);

const resolvedSets = Object.freeze({
  backdrop: resolveWorldVisualDepthBackdropRegions(FIELD_TOP, FIELD_BOTTOM),
  terrain: resolveWorldVisualTerrainVariationRegions(FIELD_TOP, FIELD_BOTTOM),
  structures: resolveWorldVisualGroundStructureRuntimeRegions(FIELD_TOP, FIELD_BOTTOM),
  details: resolveWorldVisualUndergroundDetailRegions(FIELD_TOP, FIELD_BOTTOM),
});
for (const [kind, regions] of Object.entries(resolvedSets)) {
  assert.equal(regions.length, SOURCE_IDS.size, `${kind} must cover every Level 1 depth source`);
  for (const region of regions) {
    const pools = region.biomeFieldBackwallsByRegionId || region.biomeFieldRegionsById;
    assert.deepEqual(new Set(Object.keys(pools)), SOURCE_IDS, `${kind} needs all source pools`);
  }
}
for (const regions of [
  resolveWorldVisualDepthBackdropRegions(
    FIELD_TOP,
    FIELD_BOTTOM,
    WORLD_VISUAL_DEPTH_BACKDROPS,
    "?levelOneBiomeField=0",
  ),
  resolveWorldVisualTerrainVariationRegions(
    FIELD_TOP,
    FIELD_BOTTOM,
    WORLD_VISUAL_TERRAIN_VARIATION,
    "?levelOneBiomeField=0",
  ),
  resolveWorldVisualGroundStructureRuntimeRegions(
    FIELD_TOP,
    FIELD_BOTTOM,
    WORLD_VISUAL_GROUND_STRUCTURES,
    "?levelOneBiomeField=0",
  ),
  resolveWorldVisualUndergroundDetailRegions(
    FIELD_TOP,
    FIELD_BOTTOM,
    WORLD_VISUAL_UNDERGROUND_DETAILS,
    "?levelOneBiomeField=0",
  ),
]) {
  assert.ok(regions.every(region => (
    !region.biomeFieldBackwallsByRegionId && !region.biomeFieldRegionsById
  )), "the query rollback must restore the original horizontal selectors");
}

const scene = { config: { tileSize: 64 } };
const terrainMask = { id: "authoritative-terrain-mask" };
const selectedByKind = Object.freeze({
  backdrop: new Set(),
  terrain: new Set(),
  structures: new Set(),
  details: new Set(),
});
const selectedProfilesByKind = Object.freeze({
  backdrop: new Set(),
  terrain: new Set(),
  structures: new Set(),
  details: new Set(),
  caps: new Set(),
});
for (const region of resolvedSets.backdrop) {
  const backwalls = resolveWorldVisualDepthBackdropRegionAssets(
    region,
    WORLD_VISUAL_DEPTH_BACKDROPS,
    "",
  );
  const view = new WorldVisualDepthBackdropRegionView(
    scene,
    region,
    WORLD_VISUAL_DEPTH_BACKDROPS,
    backwalls,
  );
  for (let row = 0; row < 24; row += 1) {
    for (let column = 0; column < 24; column += 1) {
      const selection = view._resolveBiomeFieldSelection(column, row);
      if (selection) {
        selectedByKind.backdrop.add(selection.profile.sourceRegionId);
        selectedProfilesByKind.backdrop.add(selection.profile.id);
      }
    }
  }
}
for (const region of resolvedSets.terrain) {
  const view = new WorldVisualTerrainVariationRegionView(
    scene,
    {},
    region,
    WORLD_VISUAL_TERRAIN_VARIATION,
    terrainMask,
  );
  for (let row = 0; row < 24; row += 1) {
    for (let column = 0; column < 24; column += 1) {
      const selection = view._resolveBiomeFieldSelection(column, row);
      if (selection) {
        selectedByKind.terrain.add(selection.profile.sourceRegionId);
        selectedProfilesByKind.terrain.add(selection.profile.id);
      }
    }
  }
  for (let tileY = FIELD_TOP; tileY < FIELD_BOTTOM; tileY += 4) {
    for (let tileX = 0; tileX < FIELD_RIGHT; tileX += 4) {
      const selection = view._resolveBiomeFieldSelectionAtTile(tileX, tileY);
      if (selection) selectedProfilesByKind.caps.add(selection.profile.id);
    }
  }
  view.destroy();
}
for (const region of resolvedSets.structures) {
  const view = new WorldVisualGroundStructureRegionView(
    scene,
    region,
    WORLD_VISUAL_GROUND_STRUCTURES,
    terrainMask,
  );
  for (let row = 0; row < 24; row += 1) {
    for (let column = 0; column < 24; column += 1) {
      const selection = view._resolveBiomeFieldSelection(column, row);
      if (selection) {
        selectedByKind.structures.add(selection.profile.sourceRegionId);
        selectedProfilesByKind.structures.add(selection.profile.id);
      }
    }
  }
  view.destroy();
}
for (const region of resolvedSets.details) {
  const view = new WorldVisualUndergroundDetailRegionView(
    scene,
    region,
    WORLD_VISUAL_UNDERGROUND_DETAILS,
    terrainMask,
  );
  const detailColumns = Math.ceil(
    (region.rightTileExclusive - region.leftTile)
    / WORLD_VISUAL_UNDERGROUND_DETAILS.placement.cellWidthTiles,
  );
  const detailRows = Math.ceil(
    (region.bottomTileExclusive - region.topTile)
    / WORLD_VISUAL_UNDERGROUND_DETAILS.placement.cellHeightTiles,
  );
  for (let row = 0; row < detailRows; row += 1) {
    for (let column = 0; column < detailColumns; column += 1) {
      const selection = view._resolveBiomeFieldSelection(column, row);
      if (!selection) continue;
      selectedByKind.details.add(selection.sourceRegion.id);
      selectedProfilesByKind.details.add(selection.profile.id);
    }
  }
  view.destroy();
}
const localDetailBounds = {
  left: 33,
  right: 55,
  top: FIELD_TOP + 600,
  bottom: FIELD_TOP + 616,
};
const localDetailRegion = resolvedSets.details.find(region => (
  region.topTile < localDetailBounds.bottom
  && region.bottomTileExclusive > localDetailBounds.top
));
const localDetailView = new WorldVisualUndergroundDetailRegionView(
  scene,
  localDetailRegion,
  WORLD_VISUAL_UNDERGROUND_DETAILS,
  terrainMask,
);
const localDetailRange = localDetailView._resolveRange(localDetailBounds);
const expectedLocalDetailAssets = new Map();
for (let row = localDetailRange.firstRow; row <= localDetailRange.lastRow; row += 1) {
  for (let column = localDetailRange.firstColumn; column <= localDetailRange.lastColumn; column += 1) {
    const sourceRegion = localDetailView._resolveBiomeFieldRegion(column, row);
    if (localDetailRegion.kinds.textures) {
      expectedLocalDetailAssets.set(sourceRegion.textureAtlas.key, sourceRegion.textureAtlas);
    }
    if (localDetailRegion.kinds.props) {
      expectedLocalDetailAssets.set(sourceRegion.propAtlas.key, sourceRegion.propAtlas);
    }
  }
}
const localDetailAssets = localDetailView.resolveRequiredAssets(localDetailBounds);
assert.deepEqual(
  new Set(localDetailAssets.map(asset => asset.key)),
  new Set(expectedLocalDetailAssets.keys()),
  "detail streaming must request only atlases selected by the local camera cells",
);
const completeDetailPoolSize = new Set(
  Object.values(localDetailRegion.biomeFieldRegionsById)
    .flatMap(region => region.assets)
    .map(asset => asset.key),
).size;
assert.ok(localDetailAssets.length < completeDetailPoolSize);
localDetailView.destroy();
for (const [kind, sourceIds] of Object.entries(selectedByKind)) {
  assert.deepEqual(sourceIds, SOURCE_IDS, `${kind} must select all five asset families in 2D`);
}
for (const [kind, profileIds] of Object.entries(selectedProfilesByKind)) {
  assert.ok(
    profileIds.size >= Math.floor(PROFILE_IDS.size * 0.95),
    `${kind} must vary across at least 95% of the field profiles`,
  );
}

const levelOneRegionIds = new Set(LEVEL_ONE_BIOME_FIELD.sourceRegionIds);
const materialAssets = [...new Map(
  WORLD_VISUAL_MATERIAL_BANDS
    .filter(entry => entry.topTile < FIELD_BOTTOM && entry.bottomTileExclusive > FIELD_TOP)
    .map(entry => {
      const asset = WORLD_VISUAL_MATERIALS[entry.materialId];
      return [asset.key, asset];
    })
).values()];
const inventoryGroups = Object.freeze({
  materials: materialAssets,
  backdrops: WORLD_VISUAL_DEPTH_BACKDROPS.regions
    .filter(entry => levelOneRegionIds.has(entry.id))
    .flatMap(entry => entry.wholeWorldVariantBackwalls),
  enhancers: WORLD_VISUAL_BACKDROP_ENHANCERS.regions
    .filter(entry => levelOneRegionIds.has(entry.id))
    .flatMap(entry => entry.assets),
  terrain: WORLD_VISUAL_TERRAIN_VARIATION.regions
    .filter(entry => levelOneRegionIds.has(entry.id))
    .flatMap(entry => [...entry.seamBasePlatesV6, ...entry.seamV5PlatesV6]),
  caps: WORLD_VISUAL_TERRAIN_VARIATION.regions
    .filter(entry => levelOneRegionIds.has(entry.id))
    .flatMap(entry => [entry.capAtlas, entry.v5CapAtlas]),
  cohesion: WORLD_VISUAL_TERRAIN_VARIATION.regions
    .filter(entry => levelOneRegionIds.has(entry.id))
    .map(entry => entry.cohesionPlate),
  structures: WORLD_VISUAL_GROUND_STRUCTURES.regions
    .filter(entry => levelOneRegionIds.has(entry.id))
    .flatMap(entry => entry.seamAssets),
  details: WORLD_VISUAL_UNDERGROUND_DETAILS.regions
    .filter(entry => levelOneRegionIds.has(entry.id))
    .flatMap(entry => [entry.textureAtlas, entry.propAtlas]),
  boundaries: getLevelOneBiomeBoundaryAssets(),
  generatedRoles: getLevelOneBiomeGeneratedRoleAssets(
    LEVEL_ONE_BIOME_VISUAL_FAMILIES,
    "",
  ),
  familyGroundMaterials: getLevelOneBiomeGroundMaterialAssets(
    LEVEL_ONE_BIOME_VISUAL_FAMILIES,
    "",
  ),
  depthVariants: getLevelOneBiomeDepthVariantAssets(),
});
const inventoryAssets = [...new Map(
  Object.values(inventoryGroups).flat().map(asset => [asset.key, asset])
).values()];
assert.equal(inventoryAssets.length, 639, "Level 1 needs all 639 registered production files");
for (const asset of inventoryAssets) {
  assert.equal(
    fs.existsSync(path.join(ROOT, asset.path.split("?")[0])),
    true,
    asset.path,
  );
}
const effectiveVisualSelections = (
  inventoryGroups.materials.length
  + inventoryGroups.backdrops.length
  + inventoryGroups.enhancers.length
  + inventoryGroups.terrain.length
  + inventoryGroups.caps.length * WORLD_VISUAL_TERRAIN_VARIATION.caps.frameCount
  + inventoryGroups.cohesion.length
  + inventoryGroups.structures.length
  + inventoryGroups.details.length * WORLD_VISUAL_UNDERGROUND_DETAILS.atlas.frameCount
  + inventoryGroups.boundaries.length
  + inventoryGroups.generatedRoles.length
  + inventoryGroups.familyGroundMaterials.length
  + LEVEL_ONE_BIOME_DEPTH_VARIANTS.scenicAssetCount
  + LEVEL_ONE_BIOME_DEPTH_VARIANTS.identityFrameCount
  + LEVEL_ONE_BIOME_DEPTH_VARIANTS.landmarkCount
);
assert.equal(effectiveVisualSelections, 1109);

const boundaryAssets = getLevelOneBiomeBoundaryAssets();
assert.equal(boundaryAssets.length, 21);
for (const asset of boundaryAssets) {
  const assetPath = path.join(ROOT, asset.path);
  assert.equal(fs.existsSync(assetPath), true, asset.path);
  const metadata = readWebpMetadata(assetPath);
  assert.equal(metadata.hasAlpha, true, `${asset.path} must have real transparency`);
  assert.ok(metadata.width >= 1500 && metadata.height >= 700);
}
const resolvedSourcePairs = new Set();
for (let tileY = FIELD_TOP; tileY < FIELD_BOTTOM; tileY += 1) {
  for (let tileX = 0; tileX < FIELD_RIGHT; tileX += 1) {
    const current = resolveLevelOneBiomeFieldAtTile(tileX, tileY);
    for (const neighbor of [
      resolveLevelOneBiomeFieldAtTile(tileX + 1, tileY),
      resolveLevelOneBiomeFieldAtTile(tileX, tileY + 1),
    ]) {
      if (!neighbor || neighbor.sourceRegionId === current.sourceRegionId) continue;
      resolvedSourcePairs.add([
        current.sourceRegionId,
        neighbor.sourceRegionId,
      ].sort().join("|"));
    }
  }
}
assert.deepEqual(
  resolvedSourcePairs,
  new Set(Object.keys(LEVEL_ONE_BIOME_FIELD.boundary.assetsByPair)),
  "every material-family join that occurs in the 2D field needs an authored overlay",
);
const boundaryView = new WorldVisualLevelOneBiomeBoundaryView(
  scene,
  terrainMask,
  LEVEL_ONE_BIOME_FIELD,
  "",
);
const boundaryPlacements = boundaryView._resolvePlacements({
  left: 0,
  right: FIELD_RIGHT,
  top: FIELD_TOP,
  bottom: FIELD_BOTTOM,
});
assert.ok(boundaryPlacements.length >= 15);
const activeBoundaryKeys = new Set(
  boundaryPlacements.map(entry => entry.asset.key)
);
assert.equal(
  activeBoundaryKeys.size,
  21,
  "aligned joins must make every authored boundary variant reachable",
);
for (const [pairKey, assets] of Object.entries(
  LEVEL_ONE_BIOME_FIELD.boundary.assetVariantsByPair
)) {
  const activeCount = assets.filter(entry => activeBoundaryKeys.has(entry.key)).length;
  assert.equal(
    activeCount,
    3,
    `${pairKey} must exercise every authored boundary variant`,
  );
}
const localBoundaryBounds = {
  left: 33,
  right: 55,
  top: FIELD_TOP + 600,
  bottom: FIELD_TOP + 616,
};
const localBoundaryKeys = new Set(
  boundaryView.resolveRequiredAssets(localBoundaryBounds).map(asset => asset.key),
);
assert.deepEqual(
  localBoundaryKeys,
  new Set(
    boundaryView._resolvePlacements(localBoundaryBounds).map(entry => entry.asset.key),
  ),
  "boundary streaming must match exactly the placements visible to the local camera",
);
assert.ok(localBoundaryKeys.size < activeBoundaryKeys.size);

globalThis.Phaser = {
  Math: { Clamp: (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value)) },
};
const { WorldMapRenderer } = await import(
  "../ui/overlays/world-map/WorldMapRenderer.js"
);
const cellSize = WORLD_MAP_CONFIG.discovery.cellSizeTiles;
const discoveredCells = [];
for (let tileY = FIELD_TOP - 1; tileY < FIELD_BOTTOM; tileY += cellSize) {
  for (let tileX = 0; tileX < WORLD_WIDTH; tileX += cellSize) {
    discoveredCells.push({
      cellX: Math.floor(tileX / cellSize),
      cellY: Math.floor(tileY / cellSize),
    });
  }
}
const worldModel = {
  widthTiles: WORLD_WIDTH,
  depthTiles: FIELD_BOTTOM,
  topAirRows: FIELD_TOP,
  dugTiles: new Map(),
  worldToTile: (x, y) => ({ tx: x, ty: y }),
};
const mapScene = {
  worldModel,
  playerController: { getPlayerTile: () => ({ tx: 73, ty: FIELD_TOP + 1250 }) },
};
const mapFillColors = new Set();
let boundaryLineCount = 0;
let currentLineColor = null;
const graphics = {
  clear() {},
  fillStyle(color) { this.currentFillColor = color; },
  fillRect() { mapFillColors.add(this.currentFillColor); },
  lineStyle(width, color) { currentLineColor = color; },
  lineBetween() {
    if (currentLineColor === WORLD_MAP_CONFIG.colors.biomeBoundary) boundaryLineCount += 1;
  },
  strokeRect() {},
  fillCircle() {},
  strokeCircle() {},
  fillTriangle() {},
};
const mapRenderer = new WorldMapRenderer(
  mapScene,
  {
    getDiscoveredCells: () => discoveredCells,
    isTileDiscovered: () => true,
    isWorldPositionDiscovered: () => true,
    getDiscoveryRatio: () => 1,
  },
  { getMarkers: () => [] },
);
const stats = mapRenderer.render(
  graphics,
  { x: 0, y: 0, width: WORLD_WIDTH * 2, height: FIELD_BOTTOM * 2 },
  { zoom: 1, centerTileX: WORLD_WIDTH / 2, centerTileY: FIELD_BOTTOM / 2 },
);
for (const entry of LEVEL_ONE_BIOME_FIELD.profiles) {
  assert.equal(mapFillColors.has(entry.mapColor), true, `${entry.label} must appear on M map`);
}
assert.ok(boundaryLineCount > 50, "the M map must draw irregular discovered borders");
assert.equal(
  stats.currentBiome,
  resolveLevelOneBiomeFieldAtTile(73, FIELD_TOP + 1250).label,
);

console.log("level one 0-2000m biome field contract: ok", {
  profiles: sampledProfiles.size,
  parentMaterialFamilies: sampledSources.size,
  sourceFamilies: LEVEL_ONE_BIOME_VISUAL_FAMILIES.sourceFamilyCount,
  activeMediaFiles: inventoryAssets.length,
  effectiveVisualSelections,
  longestProfileRun,
  medianInteriorRun,
  boundaryPlacements: boundaryPlacements.length,
  mapBoundaryLines: boundaryLineCount,
});
