import { TILE_TYPES } from "./tileTypes.js";
import {
  LEVEL_ONE_BIOME_FIELD,
  doesLevelOneBiomeFieldAffectRegion,
  resolveLevelOneBiomeFieldEnabled,
} from "./levelOneBiomeField.js";
import { getLevelOneBiomeGroundMaterialAssets } from
  "./levelOneBiomeVisualFamilies.js";

const DISABLED_QUERY_VALUES = Object.freeze([
  "0", "false", "off", "disabled", "legacy",
]);
const ASSET_ROOT = (
  "sprites/backgrounds/world-visual-v2/depth/terrain-variation-v4"
);
const ASSET_ROOT_V5 = (
  "sprites/backgrounds/world-visual-v2/depth/terrain-variation-v5"
);
const SEAM_ASSET_ROOT_V6 = (
  "sprites/backgrounds/world-visual-v2/depth/terrain-seam-blend-v6"
);
const COHESION_ASSET_ROOT = (
  "sprites/backgrounds/world-visual-v2/depth/foreground-cohesion-v1"
);

const plateAsset = stem => Object.freeze({
  key: `world-visual-terrain-variation-v4-${stem}`,
  path: `${ASSET_ROOT}/${stem}-v4.webp`,
  type: "image",
});

const capAsset = biomeId => Object.freeze({
  key: `world-visual-terrain-caps-v4-${biomeId}`,
  path: `${ASSET_ROOT}/${biomeId}-exposed-top-caps-v4.webp`,
  type: "image",
});

const plateAssetV5 = stem => Object.freeze({
  key: `world-visual-terrain-variation-v5-${stem}`,
  path: `${ASSET_ROOT_V5}/${stem}-v5.webp`,
  type: "image",
});

const seamPlateAssetV6 = stem => Object.freeze({
  key: `world-visual-terrain-seam-v6-${stem}`,
  path: `${SEAM_ASSET_ROOT_V6}/${stem}-v6.webp`,
  type: "image",
});

const capAssetV5 = biomeId => Object.freeze({
  key: `world-visual-terrain-caps-v5-${biomeId}`,
  path: `${ASSET_ROOT_V5}/${biomeId}-exposed-top-caps-v5.webp`,
  type: "image",
});

const cohesionAsset = stem => Object.freeze({
  key: `world-visual-underground-foreground-cohesion-v1-${stem}`,
  path: `${COHESION_ASSET_ROOT}/${stem}.webp`,
  type: "image",
});

const V5_PLATE_STEMS = Object.freeze({
  "weathered-roots": Object.freeze([
    "weathered-roots-lightning-root-braided-clay",
    "weathered-roots-ironwater-loam-avulsion",
  ]),
  "blue-caverns": Object.freeze([
    "blue-caverns-glacial-fan-calcite",
    "blue-caverns-cobalt-turbidite-tear",
  ]),
  "amber-depths": Object.freeze([
    "amber-depths-resin-delta-breccia",
    "amber-depths-fossil-sun-ripple-fault",
  ]),
  "silver-core": Object.freeze([
    "silver-core-mercury-slickenside-fan",
    "silver-core-magnetite-needle-avalanche",
  ]),
  "core-magma": Object.freeze([
    "core-magma-lava-bomb-impact-field",
    "core-magma-basalt-ropefold-shear",
    "core-magma-ember-dike-branching",
  ]),
  slagworks: Object.freeze([
    "slagworks-clinker-avalanche-scab",
    "slagworks-copper-salt-boil",
    "slagworks-rail-iron-breccia",
    "slagworks-refractory-spall-fan",
    "slagworks-quenched-slag-river",
  ]),
  "obsidian-catacombs": Object.freeze([
    "obsidian-catacombs-blackglass-conchoidal-storm",
    "obsidian-catacombs-violet-ash-debris-flow",
    "obsidian-catacombs-crypt-lime-prism-vein",
    "obsidian-catacombs-obsidian-pillow-fracture",
    "obsidian-catacombs-cold-lava-shard-avulsion",
  ]),
  "pressure-foundry": Object.freeze([
    "pressure-foundry-boiler-scale-blisterfield",
    "pressure-foundry-cyan-coolant-mineral-delta",
    "pressure-foundry-rivet-iron-sediment-fan",
    "pressure-foundry-pressure-spall-shockwave",
    "pressure-foundry-condenser-salt-lace",
    "pressure-foundry-turbine-carbon-shear",
  ]),
  "blackglass-abyss": Object.freeze([
    "blackglass-abyss-prism-splinter-breccia",
    "blackglass-abyss-eclipse-dust-turbidite",
    "blackglass-abyss-starlight-fracture-web",
    "blackglass-abyss-mirrorstone-tidal-shear",
    "blackglass-abyss-voidglass-impact-spray",
    "blackglass-abyss-spectral-mineral-avulsion",
  ]),
  "starfire-rift": Object.freeze([
    "starfire-rift-cometglass-debris-stream",
    "starfire-rift-nebula-quartz-lightning",
    "starfire-rift-star-metal-spherule-field",
    "starfire-rift-cosmic-ash-aurora-shear",
    "starfire-rift-binary-crystal-melt-vein",
    "starfire-rift-celestial-breccia-cascade",
    "starfire-rift-terminal-rift-meteorite-flow",
  ]),
});

const REGION_ORDER_INDEX = Object.freeze({
  "surface-entry": 0,
  "level1-blue": 1,
  "level1-amber": 2,
  "level1-silver": 3,
  "level1-magma": 4,
  "level2-slagworks": 5,
  "level2-obsidian": 6,
  "level2-foundry": 7,
  "level2-blackglass": 8,
  "level2-starfire": 9,
});

const region = (
  id,
  biomeId,
  topTile,
  bottomTileExclusive,
  seedOffset,
  plateStems,
  cohesionStem
) => {
  const plates = Object.freeze(plateStems.map(plateAsset));
  const v5Plates = Object.freeze(
    (V5_PLATE_STEMS[biomeId] || []).map(plateAssetV5)
  );
  const seamBasePlatesV6 = Object.freeze(plateStems.map(seamPlateAssetV6));
  const seamV5PlatesV6 = Object.freeze(
    (V5_PLATE_STEMS[biomeId] || []).map(seamPlateAssetV6)
  );
  const baseCapAtlas = capAsset(biomeId);
  const v5CapAtlas = capAssetV5(biomeId);
  return Object.freeze({
    id,
    biomeId,
    leftTile: 0,
    rightTileExclusive: 280,
    topTile,
    bottomTileExclusive,
    seedOffset,
    orderIndex: REGION_ORDER_INDEX[id] ?? 0,
    plates,
    basePlates: plates,
    v5Plates,
    seamBasePlatesV6,
    seamV5PlatesV6,
    cohesionPlate: cohesionAsset(cohesionStem),
    capAtlas: baseCapAtlas,
    capAtlases: Object.freeze([baseCapAtlas]),
    v5CapAtlas,
  });
};

const REGIONS = Object.freeze([
  region("surface-entry", "weathered-roots", 65, 160, 11, [
    "weathered-roots-rain-compacted-loam",
    "weathered-roots-mycelial-clay",
    "weathered-roots-orchard-stone-earth",
    "weathered-roots-storm-root-torsion",
    "weathered-roots-peat-rift-upheaval",
  ], "2026-07-28-underground-02-weathered-roots-foreground-v1"),
  region("level1-blue", "blue-caverns", 160, 520, 23, [
    "blue-caverns-cobalt-fossil-shale",
    "blue-caverns-sapphire-calcite-fractures",
    "blue-caverns-glacial-aquifer-slate",
    "blue-caverns-tectonic-sapphire-shear",
    "blue-caverns-frozen-current-eddies",
  ], "2026-07-28-underground-shallow-blue-foreground-plate-v1"),
  region("level1-amber", "amber-depths", 520, 1040, 37, [
    "amber-depths-resin-ochre-strata",
    "amber-depths-honeyglass-gravel",
    "amber-depths-fossil-sunstone-clay",
    "amber-depths-resin-fault-cascade",
    "amber-depths-fossil-honeycomb-upheaval",
  ], "2026-07-28-underground-03-amber-depths-foreground-v1"),
  region("level1-silver", "silver-core", 1040, 1600, 41, [
    "silver-core-mercury-slate",
    "silver-core-magnetic-needle-matrix",
    "silver-core-moon-metal-carbonate",
    "silver-core-mercury-vortex-schist",
    "silver-core-magnetic-spear-convergence",
  ], "2026-07-28-underground-04-silver-core-foreground-v1"),
  region("level1-magma", "core-magma", 1600, 2065, 53, [
    "core-magma-basalt-scoria",
    "core-magma-obsidian-clinker",
    "core-magma-ember-lava-breccia",
    "core-magma-lava-delta-fault",
    "core-magma-shattered-caldera-pressure",
  ], "2026-07-28-underground-05-core-magma-foreground-v1"),
  region("level2-slagworks", "slagworks", 2065, 2665, 67, [
    "slagworks-iron-slag-clinker",
    "slagworks-refractory-brick-rubble",
    "slagworks-soot-copper-sediment",
    "slagworks-smelter-tectonic-churn",
    "slagworks-copper-oxidation-surge",
  ], "2026-07-28-underground-06-slagworks-foreground-v1"),
  region("level2-obsidian", "obsidian-catacombs", 2665, 3265, 79, [
    "obsidian-catacombs-blackglass-shard-earth",
    "obsidian-catacombs-violet-ash-basalt",
    "obsidian-catacombs-crypt-stone-dust",
    "obsidian-catacombs-blackglass-wavebreak",
    "obsidian-catacombs-violet-crypt-fault",
  ], "2026-07-28-underground-07-obsidian-catacombs-foreground-v1"),
  region("level2-foundry", "pressure-foundry", 3265, 3865, 83, [
    "pressure-foundry-boiler-scale-rock",
    "pressure-foundry-cyan-condenser-crust",
    "pressure-foundry-riveted-slag-matrix",
    "pressure-foundry-pressure-fracture-fan",
    "pressure-foundry-condenser-mineral-surge",
  ], "2026-07-28-underground-08-pressure-foundry-foreground-v1"),
  region("level2-blackglass", "blackglass-abyss", 3865, 4465, 97, [
    "blackglass-abyss-prism-glass-shale",
    "blackglass-abyss-eclipse-stone",
    "blackglass-abyss-stardust-obsidian",
    "blackglass-abyss-prism-shear-storm",
    "blackglass-abyss-eclipse-impact-breccia",
  ], "2026-07-28-underground-09-blackglass-abyss-foreground-v1"),
  region("level2-starfire", "starfire-rift", 4465, 5065, 101, [
    "starfire-rift-nebula-crystal-soil",
    "starfire-rift-star-metal-meteorite-matrix",
    "starfire-rift-cosmic-ash-quartz",
    "starfire-rift-comet-tail-quartz-shear",
    "starfire-rift-nebula-fault-bloom",
  ], "2026-07-28-underground-10-starfire-rift-foreground-v1"),
]);

const CAP_TILE_TYPES = Object.freeze([
  TILE_TYPES.DIRT,
  TILE_TYPES.STONE,
  TILE_TYPES.DARK_DIRT_NORMAL,
  TILE_TYPES.DARK_DIRT_STRONG,
  TILE_TYPES.LAVA_DIRT,
  TILE_TYPES.OBSIDIAN,
]);

export const WORLD_VISUAL_TERRAIN_VARIATION = Object.freeze({
  enabledByDefault: true,
  queryParam: "undergroundTerrainVariation",
  disabledValues: DISABLED_QUERY_VALUES,
  expansionV5: Object.freeze({
    enabledByDefault: true,
    queryParam: "undergroundTerrainExpansionV5",
    disabledValues: DISABLED_QUERY_VALUES,
  }),
  seamBlendV6: Object.freeze({
    enabledByDefault: true,
    queryParam: "undergroundSeamBlend",
    disabledValues: DISABLED_QUERY_VALUES,
    plateAlpha: 1,
    segment: Object.freeze({
      logicalWidthPx: 1536,
      logicalHeightPx: 1024,
      overlapXPx: 384,
      overlapYPx: 256,
      crossBiomeOverlapYPx: 128,
      strideXPx: 1152,
      strideYPx: 768,
      neighborSegments: 1,
    }),
    depthOrder: Object.freeze({
      regionStep: 0.00075,
      rowStep: 0.00001,
      columnStep: 0.0000005,
    }),
  }),
  cohesion: Object.freeze({
    enabledByDefault: true,
    runtimeMode: "world-overlay",
    queryParam: "undergroundForegroundCohesion",
    disabledValues: DISABLED_QUERY_VALUES,
    placement: Object.freeze({
      sourceDensityScale: 0.88,
      topInsetTiles: 5,
      centerTileXByBiome: Object.freeze({
        "weathered-roots": 28,
        "blue-caverns": 48,
        "amber-depths": 72,
        "silver-core": 92,
        "core-magma": 104,
        slagworks: 146,
        "obsidian-catacombs": 178,
        "pressure-foundry": 210,
        "blackglass-abyss": 242,
        "starfire-rift": 270,
      }),
    }),
  }),
  regions: REGIONS,
  segment: Object.freeze({
    logicalWidthPx: 1536,
    logicalHeightPx: 1024,
    overlapXPx: 192,
    overlapYPx: 128,
    crossBiomeOverlapYPx: 128,
    strideXPx: 1344,
    strideYPx: 896,
    neighborSegments: 1,
  }),
  caps: Object.freeze({
    frameWidthPx: 256,
    frameHeightPx: 96,
    columns: 5,
    frameCount: 20,
    displayHeightTiles: 0.375,
    overlapPx: 4,
    tileTypes: CAP_TILE_TYPES,
  }),
  render: Object.freeze({
    plateDepth: 0.12,
    plateAlpha: 0.78,
    cohesionDepth: 0.16,
    cohesionAlpha: 0.92,
    capDepth: 0.19,
    capAlpha: 0.98,
  }),
});

function isDisabled(config, search) {
  const value = new URLSearchParams(search)
    .get(config.queryParam)
    ?.trim()
    .toLowerCase();
  return Boolean(value && config.disabledValues.includes(value));
}

export function resolveWorldVisualTerrainVariationEnabled(
  config = WORLD_VISUAL_TERRAIN_VARIATION,
  search = globalThis.location?.search || ""
) {
  return config.enabledByDefault && !isDisabled(config, search);
}

export function resolveWorldVisualTerrainCohesionEnabled(
  config = WORLD_VISUAL_TERRAIN_VARIATION,
  search = globalThis.location?.search || ""
) {
  return config.cohesion.enabledByDefault
    && !isDisabled(config.cohesion, search);
}

export function resolveWorldVisualTerrainExpansionV5Enabled(
  config = WORLD_VISUAL_TERRAIN_VARIATION,
  search = globalThis.location?.search || ""
) {
  const expansion = config.expansionV5;
  if (!expansion) return false;
  return expansion.enabledByDefault && !isDisabled(expansion, search);
}

export function resolveWorldVisualTerrainSeamBlendEnabled(
  config = WORLD_VISUAL_TERRAIN_VARIATION,
  search = globalThis.location?.search || ""
) {
  const seamBlend = config.seamBlendV6;
  if (!seamBlend) return false;
  return seamBlend.enabledByDefault && !isDisabled(seamBlend, search);
}

function resolveRegionPlates(region, includeV5, seamBlendEnabled, config) {
  const basePlates = seamBlendEnabled
    ? region.seamBasePlatesV6
    : region.basePlates;
  const v5Plates = seamBlendEnabled
    ? region.seamV5PlatesV6
    : region.v5Plates;
  const plates = [
    ...basePlates,
    ...(includeV5 ? v5Plates : []),
  ];
  const capAtlases = [
    region.capAtlas,
    ...(includeV5 && region.v5CapAtlas ? [region.v5CapAtlas] : []),
  ];
  return Object.freeze({
    ...region,
    plates: Object.freeze(plates),
    capAtlases: Object.freeze(capAtlases),
    seamBlendEnabled,
    segment: seamBlendEnabled ? config.seamBlendV6.segment : config.segment,
  });
}

export function resolveWorldVisualTerrainVariationRegions(
  topTile,
  bottomTileExclusive,
  config = WORLD_VISUAL_TERRAIN_VARIATION,
  search
) {
  if (!resolveWorldVisualTerrainVariationEnabled(config, search)) return [];
  if (bottomTileExclusive <= topTile) return [];
  const includeV5 = resolveWorldVisualTerrainExpansionV5Enabled(config, search);
  const seamBlendEnabled = resolveWorldVisualTerrainSeamBlendEnabled(config, search);
  const resolvedRegions = config.regions.map(entry => resolveRegionPlates(
    entry,
    includeV5,
    seamBlendEnabled,
    config
  ));
  const fieldEnabled = resolveLevelOneBiomeFieldEnabled(
    LEVEL_ONE_BIOME_FIELD,
    search
  );
  const fieldRegionsById = fieldEnabled
    ? Object.freeze(Object.fromEntries(
      resolvedRegions
        .filter(entry => LEVEL_ONE_BIOME_FIELD.sourceRegionIds.includes(entry.id))
        .map(entry => [entry.id, entry])
    ))
    : null;
  return resolvedRegions
    .filter(entry => (
      entry.bottomTileExclusive > topTile
      && entry.topTile < bottomTileExclusive
    ))
    .map(entry => (
      fieldRegionsById && doesLevelOneBiomeFieldAffectRegion(entry)
        ? Object.freeze({ ...entry, biomeFieldRegionsById: fieldRegionsById })
        : entry
    ));
}

export function resolveWorldVisualTerrainVariationRegion(
  tileY,
  config = WORLD_VISUAL_TERRAIN_VARIATION,
  search
) {
  const regionEntry = config.regions.find(entry => (
    tileY >= entry.topTile && tileY < entry.bottomTileExclusive
  )) || null;
  return regionEntry
    ? resolveRegionPlates(
      regionEntry,
      resolveWorldVisualTerrainExpansionV5Enabled(config, search),
      resolveWorldVisualTerrainSeamBlendEnabled(config, search),
      config
    )
    : null;
}

export function getWorldVisualTerrainVariationAssets(
  config = WORLD_VISUAL_TERRAIN_VARIATION
) {
  return config.regions.flatMap(entry => [
    ...entry.basePlates,
    entry.capAtlas,
  ]);
}

export function getWorldVisualTerrainVariationRuntimeAssets(
  config = WORLD_VISUAL_TERRAIN_VARIATION,
  search = globalThis.location?.search || ""
) {
  const includeV5 = resolveWorldVisualTerrainExpansionV5Enabled(config, search);
  const includeCohesion = resolveWorldVisualTerrainCohesionEnabled(config, search);
  const seamBlendEnabled = resolveWorldVisualTerrainSeamBlendEnabled(config, search);
  const terrainAssets = config.regions.flatMap(entry => [
    ...(seamBlendEnabled ? entry.seamBasePlatesV6 : entry.basePlates),
    ...(includeV5
      ? (seamBlendEnabled ? entry.seamV5PlatesV6 : entry.v5Plates)
      : []),
    ...(includeCohesion && entry.cohesionPlate
      ? [entry.cohesionPlate]
      : []),
    entry.capAtlas,
    ...(includeV5 ? [entry.v5CapAtlas] : []),
  ]);
  return [
    ...terrainAssets,
    ...getLevelOneBiomeGroundMaterialAssets(undefined, search),
  ];
}

export function resolveWorldVisualTerrainCohesionPlacement(
  region,
  tileSize,
  config = WORLD_VISUAL_TERRAIN_VARIATION
) {
  if (!region?.cohesionPlate) return null;
  const placement = config.cohesion.placement;
  const tilePixels = Math.max(1, Number(tileSize) || 1);
  const displayScale = Math.min(
    1,
    Math.max(0, Number(placement.sourceDensityScale) || 1)
  );
  const widthTiles = Math.min(
    config.segment.logicalWidthPx * displayScale / tilePixels,
    region.rightTileExclusive - region.leftTile
  );
  const heightTiles = Math.min(
    config.segment.logicalHeightPx * displayScale / tilePixels,
    region.bottomTileExclusive - region.topTile
  );
  const configuredCenterTileX = Number(
    placement.centerTileXByBiome?.[region.biomeId]
  );
  const centerTileX = Number.isFinite(configuredCenterTileX)
    ? configuredCenterTileX
    : (region.leftTile + region.rightTileExclusive) * 0.5;
  const leftTile = Math.min(
    region.rightTileExclusive - widthTiles,
    Math.max(region.leftTile, centerTileX - widthTiles * 0.5)
  );
  const topTile = Math.min(
    region.bottomTileExclusive - heightTiles,
    region.topTile + placement.topInsetTiles
  );
  return Object.freeze({
    asset: region.cohesionPlate,
    displayScale,
    displayWidthPx: config.segment.logicalWidthPx * displayScale,
    displayHeightPx: config.segment.logicalHeightPx * displayScale,
    leftTile,
    rightTileExclusive: leftTile + widthTiles,
    topTile,
    bottomTileExclusive: topTile + heightTiles,
  });
}

export function isWorldVisualTerrainVariationRegionReady(region, assetExists) {
  return Boolean(region?.plates?.length)
    && region.plates.every(assetExists)
    && (region.capAtlases || [region.capAtlas]).every(assetExists);
}

export function isWorldVisualTerrainCapTileType(
  tileType,
  config = WORLD_VISUAL_TERRAIN_VARIATION
) {
  return config.caps.tileTypes.includes(tileType);
}
