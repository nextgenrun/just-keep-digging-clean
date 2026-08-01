const DISABLED_QUERY_VALUES = Object.freeze(["0", "false", "off", "disabled", "legacy"]);
const V3_ASSET_ROOT = (
  "sprites/backgrounds/world-visual-v2/depth/biome-ground-structures-v3"
);
const V4_ASSET_ROOT = (
  "sprites/backgrounds/world-visual-v2/depth/biome-ground-structures-v4"
);
const V6_ASSET_ROOT = (
  "sprites/backgrounds/world-visual-v2/depth/biome-ground-structures-v6"
);

const v3Asset = stem => Object.freeze({
  key: `world-visual-ground-structure-v3-${stem}`,
  path: `${V3_ASSET_ROOT}/${stem}-v3.webp`,
  type: "image",
});

const v4Asset = stem => Object.freeze({
  key: `world-visual-ground-structure-v4-${stem}`,
  path: `${V4_ASSET_ROOT}/${stem}-v4.webp`,
  type: "image",
});

const v6Asset = stem => Object.freeze({
  key: `world-visual-ground-structure-v6-${stem}`,
  path: `${V6_ASSET_ROOT}/${stem}-v6.webp`,
  type: "image",
});

const assets = (stems, factory) => Object.freeze(stems.map(factory));

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

const region = (id, topTile, bottomTileExclusive, seedOffset, stems) => {
  const baseAssets = assets(stems, v3Asset);
  const blendAssets = assets(stems, v4Asset);
  const seamAssets = assets(stems, v6Asset);
  return Object.freeze({
    id,
    leftTile: 0,
    rightTileExclusive: 280,
    topTile,
    bottomTileExclusive,
    seedOffset,
    orderIndex: REGION_ORDER_INDEX[id] ?? 0,
    baseAssets,
    blendAssets,
    seamAssets,
    assets: blendAssets,
    blendEnabled: true,
    seamBlendEnabled: false,
  });
};

const REGIONS = Object.freeze([
  region("surface-entry", 65, 160, 11, [
    "weathered-roots-root-buttress-lattice",
    "weathered-roots-ceiling-root-rib",
    "weathered-roots-timber-loam-retaining-arch",
    "weathered-roots-mycorrhizal-strata-seam",
    "weathered-roots-rainworn-stone-root-corner",
  ]),
  region("level1-blue", 160, 520, 23, [
    "blue-caverns-cobalt-crystal-buttress",
    "blue-caverns-ice-ceiling-fin",
    "blue-caverns-aquifer-stone-arch",
    "blue-caverns-sapphire-strata-seam",
    "blue-caverns-geode-corner-cluster",
  ]),
  region("level1-amber", 520, 1040, 37, [
    "amber-depths-resin-stone-buttress",
    "amber-depths-honeyglass-ceiling-shelf",
    "amber-depths-fossil-masonry-arch",
    "amber-depths-golden-strata-seam",
    "amber-depths-bronze-resin-corner",
  ]),
  region("level1-silver", 1040, 1600, 41, [
    "silver-core-mercury-stone-buttress",
    "silver-core-ceiling-blade-rib",
    "silver-core-black-iron-mineral-arch",
    "silver-core-magnetic-strata-seam",
    "silver-core-mirror-mineral-corner",
  ]),
  region("level1-magma", 1600, 2065, 53, [
    "core-magma-basalt-lava-buttress",
    "core-magma-obsidian-ceiling-rib",
    "core-magma-furnace-stone-arch",
    "core-magma-ember-fissure-seam",
    "core-magma-volcanic-column-corner",
  ]),
  region("level2-slagworks", 2065, 2665, 67, [
    "slagworks-iron-slag-buttress",
    "slagworks-rail-ceiling-brace",
    "slagworks-refractory-brick-arch",
    "slagworks-clinker-strata-seam",
    "slagworks-riveted-slag-corner",
  ]),
  region("level2-obsidian", 2665, 3265, 79, [
    "obsidian-catacombs-blackglass-buttress",
    "obsidian-catacombs-shard-ceiling-rib",
    "obsidian-catacombs-crypt-stone-arch",
    "obsidian-catacombs-violet-glass-seam",
    "obsidian-catacombs-column-corner",
  ]),
  region("level2-foundry", 3265, 3865, 83, [
    "pressure-foundry-steel-stone-buttress",
    "pressure-foundry-pipe-ceiling-truss",
    "pressure-foundry-boiler-stone-arch",
    "pressure-foundry-condenser-strata-seam",
    "pressure-foundry-valve-rock-corner",
  ]),
  region("level2-blackglass", 3865, 4465, 97, [
    "blackglass-abyss-prism-glass-buttress",
    "blackglass-abyss-mirror-ceiling-shard",
    "blackglass-abyss-eclipse-stone-arch",
    "blackglass-abyss-spectral-strata-seam",
    "blackglass-abyss-black-mirror-corner",
  ]),
  region("level2-starfire", 4465, 5065, 101, [
    "starfire-rift-celestial-crystal-buttress",
    "starfire-rift-ring-ceiling-rib",
    "starfire-rift-star-metal-arch",
    "starfire-rift-cosmic-strata-seam",
    "starfire-rift-nebula-crystal-corner",
  ]),
]);

export const WORLD_VISUAL_GROUND_STRUCTURES = Object.freeze({
  enabledByDefault: true,
  queryParam: "undergroundGroundStructures",
  disabledValues: DISABLED_QUERY_VALUES,
  regions: REGIONS,
  segment: Object.freeze({
    logicalWidthPx: 1536,
    logicalHeightPx: 1024,
    overlapXPx: 192,
    overlapYPx: 128,
    strideXPx: 1344,
    strideYPx: 896,
    neighborSegments: 1,
  }),
  blend: Object.freeze({
    enabledByDefault: true,
    queryParam: "groundStructureBlend",
    disabledValues: DISABLED_QUERY_VALUES,
  }),
  seamBlendV6: Object.freeze({
    enabledByDefault: true,
    queryParam: "undergroundSeamBlend",
    disabledValues: DISABLED_QUERY_VALUES,
    alpha: 1,
    segment: Object.freeze({
      logicalWidthPx: 1536,
      logicalHeightPx: 1024,
      overlapXPx: 384,
      overlapYPx: 256,
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
  render: Object.freeze({
    depth: 0.16,
    alpha: 0.86,
  }),
});

function isDisabledQuery(config, search) {
  const value = new URLSearchParams(search)
    .get(config.queryParam)
    ?.trim()
    .toLowerCase();
  return Boolean(value && config.disabledValues.includes(value));
}

export function resolveWorldVisualGroundStructureBlendEnabled(
  config = WORLD_VISUAL_GROUND_STRUCTURES,
  search = globalThis.location?.search || ""
) {
  const blend = config.blend;
  return blend.enabledByDefault && !isDisabledQuery(blend, search);
}

export function resolveWorldVisualGroundStructureSeamBlendEnabled(
  config = WORLD_VISUAL_GROUND_STRUCTURES,
  search = globalThis.location?.search || ""
) {
  const seamBlend = config.seamBlendV6;
  return Boolean(
    seamBlend?.enabledByDefault
    && !isDisabledQuery(seamBlend, search)
  );
}

function resolveRegionAssets(region, blendEnabled, seamBlendEnabled = false) {
  if (!blendEnabled) return region.baseAssets;
  return seamBlendEnabled ? region.seamAssets : region.blendAssets;
}

function resolveRegion(region, blendEnabled, seamBlendEnabled = false, config) {
  if (
    region.blendEnabled === blendEnabled
    && region.seamBlendEnabled === seamBlendEnabled
  ) return region;
  return Object.freeze({
    ...region,
    assets: resolveRegionAssets(region, blendEnabled, seamBlendEnabled),
    blendEnabled,
    seamBlendEnabled,
    segment: seamBlendEnabled ? config.seamBlendV6.segment : config.segment,
  });
}

export function resolveWorldVisualGroundStructuresEnabled(
  config = WORLD_VISUAL_GROUND_STRUCTURES,
  search = globalThis.location?.search || ""
) {
  return config.enabledByDefault && !isDisabledQuery(config, search);
}

export function resolveWorldVisualGroundStructureRegions(
  topTile,
  bottomTileExclusive,
  config = WORLD_VISUAL_GROUND_STRUCTURES,
  search
) {
  if (!resolveWorldVisualGroundStructuresEnabled(config, search)) return [];
  if (bottomTileExclusive <= topTile) return [];
  const blendEnabled = resolveWorldVisualGroundStructureBlendEnabled(config, search);
  return config.regions.filter(entry => (
    entry.bottomTileExclusive > topTile
    && entry.topTile < bottomTileExclusive
  )).map(entry => resolveRegion(entry, blendEnabled, false, config));
}

export function getWorldVisualGroundStructureAssets(
  config = WORLD_VISUAL_GROUND_STRUCTURES,
  search = globalThis.location?.search || ""
) {
  const blendEnabled = resolveWorldVisualGroundStructureBlendEnabled(config, search);
  return config.regions.flatMap(entry => resolveRegionAssets(entry, blendEnabled));
}

export function resolveWorldVisualGroundStructureRuntimeRegions(
  topTile,
  bottomTileExclusive,
  config = WORLD_VISUAL_GROUND_STRUCTURES,
  search = globalThis.location?.search || ""
) {
  if (!resolveWorldVisualGroundStructuresEnabled(config, search)) return [];
  if (bottomTileExclusive <= topTile) return [];
  const blendEnabled = resolveWorldVisualGroundStructureBlendEnabled(config, search);
  const seamBlendEnabled = blendEnabled
    && resolveWorldVisualGroundStructureSeamBlendEnabled(config, search);
  return config.regions.filter(entry => (
    entry.bottomTileExclusive > topTile
    && entry.topTile < bottomTileExclusive
  )).map(entry => resolveRegion(
    entry,
    blendEnabled,
    seamBlendEnabled,
    config
  ));
}

export function getWorldVisualGroundStructureRuntimeAssets(
  config = WORLD_VISUAL_GROUND_STRUCTURES,
  search = globalThis.location?.search || ""
) {
  const blendEnabled = resolveWorldVisualGroundStructureBlendEnabled(config, search);
  const seamBlendEnabled = blendEnabled
    && resolveWorldVisualGroundStructureSeamBlendEnabled(config, search);
  return config.regions.flatMap(entry => resolveRegionAssets(
    entry,
    blendEnabled,
    seamBlendEnabled
  ));
}

export function isWorldVisualGroundStructureRegionReady(region, assetExists) {
  return Boolean(region?.assets?.length) && region.assets.every(assetExists);
}
