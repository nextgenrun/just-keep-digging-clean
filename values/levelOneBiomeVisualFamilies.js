const DISABLED_QUERY_VALUES = Object.freeze([
  "0", "false", "off", "disabled", "legacy",
]);
const SIGNATURE_ROOT = (
  "sprites/backgrounds/world-visual-v2/depth/level1-biome-signatures-v1"
);
const GENERATED_ROLE_ROOT_V2 = (
  "sprites/backgrounds/world-visual-v2/depth/level1-biome-generated-roles-v2"
);
const GENERATED_ROLE_ROOT_V3 = (
  "sprites/backgrounds/world-visual-v2/depth/level1-biome-generated-roles-v3"
);
const GROUND_MATERIAL_ROOT_V1 = (
  "sprites/backgrounds/world-visual-v2/depth/level1-biome-ground-materials-v1"
);
const GROUND_MATERIAL_ROOT_V2 = (
  "sprites/backgrounds/world-visual-v2/depth/level1-biome-ground-materials-v2"
);

const asset = id => Object.freeze({
  key: `world-visual-level1-biome-signature-v1-${id}`,
  path: `${SIGNATURE_ROOT}/${id}-signature-v1.webp`,
  type: "image",
});

const generatedRoleAssetV2 = (id, roleId) => Object.freeze({
  key: `world-visual-level1-biome-${roleId}-v2-${id}`,
  path: `${GENERATED_ROLE_ROOT_V2}/${id}-${roleId}-v2.webp`,
  type: "image",
});

const generatedRoleAssetV3 = (id, roleId) => Object.freeze({
  key: `world-visual-level1-biome-${roleId}-v3-${id}`,
  path: `${GENERATED_ROLE_ROOT_V3}/${id}-${roleId}-v3.webp`,
  type: "image",
});

const generatedRoleAssetsV2 = id => Object.freeze({
  background: generatedRoleAssetV2(id, "background"),
  signature: asset(id),
  ground: generatedRoleAssetV2(id, "ground"),
  foreground: generatedRoleAssetV2(id, "foreground"),
});

const generatedRoleAssetsV3 = id => Object.freeze(Object.fromEntries(
  ["background", "signature", "ground", "foreground"].map(roleId => (
    [roleId, generatedRoleAssetV3(id, roleId)]
  ))
));

const groundMaterialAssetV1 = (id, variantId) => Object.freeze({
  key: `world-visual-level1-biome-ground-material-v1-${id}-${variantId}`,
  path: `${GROUND_MATERIAL_ROOT_V1}/${id}-ground-material-${variantId}-v1.webp`,
  type: "image",
});

const groundMaterialAssetsV1 = id => Object.freeze([
  groundMaterialAssetV1(id, "primary"),
  groundMaterialAssetV1(id, "secondary"),
]);

const groundMaterialAssetV2 = id => Object.freeze({
  key: `world-visual-level1-biome-ground-material-v2-${id}-tertiary`,
  path: `${GROUND_MATERIAL_ROOT_V2}/${id}-ground-material-tertiary-v2.webp`,
  type: "image",
});

const layerSeeds = base => Object.freeze({
  backdrop: base + 11,
  terrain: base + 101,
  groundStructure: base + 211,
  textures: base + 307,
  props: base + 401,
  signature: base + 503,
  backgroundRole: base + 607,
  groundRole: base + 701,
  foregroundRole: base + 809,
});

const TEXTURE_FRAME_PARTITIONS = Object.freeze([
  Object.freeze([0, 4, 8, 12, 16]),
  Object.freeze([1, 5, 9, 13, 17]),
  Object.freeze([2, 6, 10, 14, 18]),
  Object.freeze([3, 7, 11, 15, 19]),
]);
const PROP_FRAME_PARTITIONS = Object.freeze([
  Object.freeze([0, 4, 9, 13, 17]),
  Object.freeze([1, 5, 10, 14, 18]),
  Object.freeze([3, 7, 11, 15, 19]),
  Object.freeze([2, 6, 8, 12, 16]),
]);

const baseFamily = (
  id,
  parentRegionId,
  parentIndex,
  seedBase,
  backdrop,
  terrain,
  groundStructure
) => Object.freeze({
  id,
  parentRegionId,
  layerSeeds: layerSeeds(seedBase),
  assetPathIncludes: Object.freeze({
    backdrop: Object.freeze(backdrop),
    terrain: Object.freeze(terrain),
    groundStructure: Object.freeze(groundStructure),
  }),
  detailFrameIndexes: Object.freeze({
    textures: TEXTURE_FRAME_PARTITIONS[parentIndex],
    props: PROP_FRAME_PARTITIONS[parentIndex],
  }),
  retainedPartitionId: id,
  signatureAsset: asset(id),
  generatedRoleAssets: generatedRoleAssetsV2(id),
  groundMaterialMode: "append",
  groundMaterialAssets: Object.freeze([groundMaterialAssetV2(id)]),
});

const BASE_FAMILIES = Object.freeze([
  baseFamily("weathered-rootways", "surface-entry", 0, 1009, [
    "root-canyon", "uprooted-bell-tower", "root-tide-lantern-hollow-motion-v1",
    "shale-root-escarpment",
  ], [
    "storm-root-torsion", "lightning-root-braided-clay",
  ], [
    "root-buttress-lattice", "rainworn-stone-root-corner",
  ]),
  baseFamily("fungal-rainwells", "surface-entry", 1, 1151, [
    "rainwell-canopy", "fungal-lantern-hollow", "mycorrhizal-procession",
    "rootwater-sink-valley",
  ], [
    "mycelial-clay", "rain-compacted-loam",
  ], [
    "mycorrhizal-strata-seam",
  ]),
  baseFamily("sunken-orchard", "surface-entry", 2, 1297, [
    "sunken-orchard-vault", "quiet-loam-pocket", "amber-seed-sanctum",
  ], [
    "orchard-stone-earth", "peat-rift-upheaval",
  ], [
    "ceiling-root-rib",
  ]),
  baseFamily("timber-cisterns", "surface-entry", 3, 1433, [
    "drowned-timber-bridge", "collapsed-cistern", "root-tide-lantern-hollow-loop-v3",
  ], [
    "ironwater-loam-avulsion",
  ], [
    "timber-loam-retaining-arch",
  ]),

  baseFamily("cobalt-aquifer", "level1-blue", 0, 1601, [
    "crystal-ravine", "cobalt-ruins", "resonant-crystal-rain-motion-v1",
    "cobalt-river-switchback",
  ], [
    "cobalt-fossil-shale", "cobalt-turbidite-tear",
  ], [
    "cobalt-crystal-buttress", "aquifer-stone-arch",
  ]),
  baseFamily("sapphire-grotto", "level1-blue", 1, 1747, [
    "quiet-sapphire-pocket", "singing-geode-crown", "aurora-crystal-well",
  ], [
    "sapphire-calcite-fractures", "tectonic-sapphire-shear",
  ], [
    "sapphire-strata-seam",
  ]),
  baseFamily("glacial-waterveil", "level1-blue", 2, 1889, [
    "leviathan-ice-ribs", "suspended-ice-bridge", "water-veil-chamber",
    "glacial-fault-overlook",
  ], [
    "glacial-aquifer-slate", "frozen-current-eddies",
  ], [
    "ice-ceiling-fin",
  ]),
  baseFamily("drowned-observatory", "level1-blue", 3, 2039, [
    "inverted-water-temple", "drowned-observatory", "resonant-crystal-rain-loop-v3",
    "amber-silt-handoff",
  ], [
    "glacial-fan-calcite",
  ], [
    "geode-corner-cluster",
  ]),

  baseFamily("amber-silt-fault", "level1-amber", 0, 2203, [
    "amber-canyon", "dustfall-chamber", "chain-bridge-gallery",
    "argent-calcite-handoff",
  ], [
    "resin-ochre-strata", "resin-fault-cascade",
  ], [
    "golden-strata-seam",
  ]),
  baseFamily("honeyglass-pocket", "level1-amber", 1, 2341, [
    "quiet-honey-pocket", "honeyglass-aqueduct", "gilded-wing-reliquary",
  ], [
    "honeyglass-gravel", "fossil-honeycomb-upheaval",
  ], [
    "honeyglass-ceiling-shelf",
  ]),
  baseFamily("resin-archive", "level1-amber", 2, 2503, [
    "resin-archive-ruins", "resin-clockwork-basilica", "chain-library-abyss",
    "resin-tide-escarpment",
  ], [
    "resin-delta-breccia",
  ], [
    "resin-stone-buttress", "bronze-resin-corner",
  ]),
  baseFamily("fossil-sun-vault", "level1-amber", 3, 2647, [
    "fossil-sun-vault", "golden-dust-cathedral-motion-v1",
    "golden-dust-cathedral-loop-v3", "fossil-forest-gorge",
  ], [
    "fossil-sunstone-clay", "fossil-sun-ripple-fault",
  ], [
    "fossil-masonry-arch",
  ]),

  baseFamily("mercury-fold", "level1-silver", 0, 2801, [
    "cleaved-silver-canyon", "mercury-aqueduct-city", "mercury-shimmerfall-motion-v1",
    "mercury-delta-terraces",
  ], [
    "mercury-slate", "mercury-vortex-schist",
  ], [
    "mercury-stone-buttress",
  ]),
  baseFamily("magnetic-needle-reef", "level1-silver", 1, 2953, [
    "suspended-rib-bridge", "magnetic-needle-forest", "eclipsed-reflector-array",
    "magnetic-shear-horizon",
  ], [
    "magnetic-needle-matrix", "magnetite-needle-avalanche",
  ], [
    "magnetic-strata-seam", "ceiling-blade-rib",
  ]),
  baseFamily("lunar-mint-galleries", "level1-silver", 2, 3109, [
    "shimmerfall-curtain", "forgotten-mint-ruins", "lunar-mint-rotunda",
  ], [
    "moon-metal-carbonate",
  ], [
    "black-iron-mineral-arch",
  ]),
  baseFamily("mirrorstone-convergence", "level1-silver", 3, 3251, [
    "mirror-organ-cathedral", "quiet-mirror-pocket", "mercury-shimmerfall-loop-v3",
    "ember-metal-handoff",
  ], [
    "magnetic-spear-convergence", "mercury-slickenside-fan",
  ], [
    "mirror-mineral-corner",
  ]),

  baseFamily("basalt-emberworks", "level1-magma", 0, 3407, [
    "basalt-bridgeworks", "basalt-sun-engine", "basalt-heartbeat-motion-v1",
    "basalt-storm-gallery",
  ], [
    "basalt-scoria", "basalt-ropefold-shear",
  ], [
    "basalt-lava-buttress",
  ]),
  baseFamily("obsidian-caldera", "level1-magma", 1, 3559, [
    "titan-forge-caldera", "obsidian-organ-pipes", "quiet-ember-pocket",
    "caldera-wall-crossing",
  ], [
    "obsidian-clinker", "shattered-caldera-pressure",
  ], [
    "obsidian-ceiling-rib", "volcanic-column-corner",
  ]),
  baseFamily("lavawheel-necropolis", "level1-magma", 2, 3701, [
    "lava-wheel-necropolis", "volcanic-watchtower-ruins", "ember-crown-chasm",
    "lava-braided-canyon",
  ], [
    "lava-delta-fault", "lava-bomb-impact-field",
  ], [
    "ember-fissure-seam",
  ]),
  baseFamily("shattered-furnace", "level1-magma", 3, 3853, [
    "lava-ravine", "ashfall-chamber", "basalt-heartbeat-loop-v3",
    "slag-heat-handoff",
  ], [
    "ember-lava-breccia", "ember-dike-branching",
  ], [
    "furnace-stone-arch",
  ]),
]);

const BASE_FAMILY_BY_ID = Object.freeze(Object.fromEntries(
  BASE_FAMILIES.map(entry => [entry.id, entry])
));

const expandedFamily = (
  id,
  parentRegionId,
  seedBase,
  retainedPartitionId
) => {
  const retained = BASE_FAMILY_BY_ID[retainedPartitionId];
  const roles = generatedRoleAssetsV3(id);
  return Object.freeze({
    id,
    parentRegionId,
    layerSeeds: layerSeeds(seedBase),
    assetPathIncludes: retained.assetPathIncludes,
    detailFrameIndexes: retained.detailFrameIndexes,
    retainedPartitionId,
    signatureAsset: roles.signature,
    generatedRoleAssets: roles,
    groundMaterialMode: "replace",
    groundMaterialAssets: Object.freeze([
      ...groundMaterialAssetsV1(id),
      groundMaterialAssetV2(id),
    ]),
  });
};

const EXPANDED_FAMILIES = Object.freeze([
  expandedFamily("thornwake-hollows", "surface-entry", 4019, "weathered-rootways"),
  expandedFamily("peat-lantern-fen", "surface-entry", 4177, "fungal-rainwells"),
  expandedFamily("rootbell-ossuary", "surface-entry", 4337, "sunken-orchard"),
  expandedFamily("siltwood-warrens", "surface-entry", 4493, "timber-cisterns"),
  expandedFamily("mossglass-reservoir", "surface-entry", 4657, "fungal-rainwells"),
  expandedFamily("ironbark-sink", "surface-entry", 4813, "weathered-rootways"),

  expandedFamily("azure-bell-caves", "level1-blue", 5003, "sapphire-grotto"),
  expandedFamily("stormglass-conduits", "level1-blue", 5167, "cobalt-aquifer"),
  expandedFamily("frozen-choir", "level1-blue", 5323, "glacial-waterveil"),
  expandedFamily("tideclock-chasm", "level1-blue", 5483, "drowned-observatory"),
  expandedFamily("prism-kelp-vault", "level1-blue", 5647, "glacial-waterveil"),
  expandedFamily("blue-salt-basilica", "level1-blue", 5801, "cobalt-aquifer"),

  expandedFamily("saffron-boneworks", "level1-amber", 6007, "fossil-sun-vault"),
  expandedFamily("citrine-hivefault", "level1-amber", 6163, "honeyglass-pocket"),
  expandedFamily("gilded-root-reliquary", "level1-amber", 6323, "resin-archive"),
  expandedFamily("ochre-spiral-quarry", "level1-amber", 6481, "amber-silt-fault"),
  expandedFamily("sunwax-catacombs", "level1-amber", 6647, "honeyglass-pocket"),
  expandedFamily("bronze-pollen-rift", "level1-amber", 6803, "resin-archive"),

  expandedFamily("argent-choir", "level1-silver", 7001, "lunar-mint-galleries"),
  expandedFamily("quicksilver-loom", "level1-silver", 7159, "mercury-fold"),
  expandedFamily("moonwire-ravine", "level1-silver", 7321, "mirrorstone-convergence"),
  expandedFamily("pale-magnet-basilica", "level1-silver", 7487, "magnetic-needle-reef"),
  expandedFamily("glasssteel-sepulcher", "level1-silver", 7649, "mirrorstone-convergence"),
  expandedFamily("starless-reflectory", "level1-silver", 7807, "mercury-fold"),

  expandedFamily("cinder-organ", "level1-magma", 8009, "basalt-emberworks"),
  expandedFamily("slagheart-foundry", "level1-magma", 8167, "shattered-furnace"),
  expandedFamily("ashen-crown-rift", "level1-magma", 8329, "obsidian-caldera"),
  expandedFamily("molten-chain-garden", "level1-magma", 8491, "lavawheel-necropolis"),
  expandedFamily("pyreclast-cathedral", "level1-magma", 8647, "shattered-furnace"),
  expandedFamily("blackglass-crucible", "level1-magma", 8803, "obsidian-caldera"),
]);

const FAMILIES = Object.freeze([...BASE_FAMILIES, ...EXPANDED_FAMILIES]);

const FAMILY_BY_ID = Object.freeze(Object.fromEntries(
  FAMILIES.map(entry => [entry.id, entry])
));

const GENERATED_ROLE_IDS = Object.freeze([
  "background",
  "signature",
  "ground",
  "foreground",
]);

const GENERATED_ROLES = Object.freeze({
  background: Object.freeze({
    seedLayer: "backgroundRole",
    salt: 1103,
    chance: 1,
    placement: Object.freeze({
      visibleMarginTiles: 26,
      jitterXTiles: 12,
      jitterYTiles: 9,
      offsetYTiles: -4,
      minSourceScale: 0.58,
      maxSourceScale: 0.78,
      maxRotationRadians: 0.045,
      originX: 0.5,
      originY: 0.5,
    }),
    render: Object.freeze({ depth: 0.135, alpha: 0.54, depthJitter: 0.0006 }),
  }),
  signature: Object.freeze({
    seedLayer: "signature",
    salt: 2207,
    chance: 1,
    placement: Object.freeze({
      visibleMarginTiles: 20,
      jitterXTiles: 4.5,
      jitterYTiles: 5.5,
      offsetYTiles: 0,
      minSourceScale: 0.82,
      maxSourceScale: 1.08,
      maxRotationRadians: 0.035,
      originX: 0.5,
      originY: 0.56,
    }),
    render: Object.freeze({ depth: 0.176, alpha: 0.9, depthJitter: 0.0008 }),
  }),
  ground: Object.freeze({
    seedLayer: "groundRole",
    salt: 3301,
    chance: 1,
    placement: Object.freeze({
      visibleMarginTiles: 23,
      jitterXTiles: 9.5,
      jitterYTiles: 7,
      offsetYTiles: 3.5,
      minSourceScale: 0.62,
      maxSourceScale: 0.86,
      maxRotationRadians: 0.05,
      originX: 0.5,
      originY: 0.67,
    }),
    render: Object.freeze({ depth: 0.164, alpha: 0.82, depthJitter: 0.0007 }),
  }),
  foreground: Object.freeze({
    seedLayer: "foregroundRole",
    salt: 4409,
    chance: 1,
    placement: Object.freeze({
      visibleMarginTiles: 19,
      jitterXTiles: 14,
      jitterYTiles: 10,
      offsetYTiles: 2,
      minSourceScale: 0.42,
      maxSourceScale: 0.62,
      maxRotationRadians: 0.06,
      originX: 0.5,
      originY: 0.72,
    }),
    render: Object.freeze({ depth: 0.184, alpha: 0.88, depthJitter: 0.0008 }),
  }),
});

export const LEVEL_ONE_BIOME_VISUAL_FAMILIES = Object.freeze({
  enabledByDefault: true,
  queryParam: "levelOneSourceFamilies",
  disabledValues: DISABLED_QUERY_VALUES,
  parentMaterialFamilyCount: 5,
  retainedPartitionFamilyCount: BASE_FAMILIES.length,
  expandedGeneratedFamilyCount: EXPANDED_FAMILIES.length,
  expandedGroundMaterialAssetCount: EXPANDED_FAMILIES.length * 3,
  tertiaryGroundMaterialAssetCount: FAMILIES.length,
  sourceFamilyCount: FAMILIES.length,
  families: FAMILIES,
  familyById: FAMILY_BY_ID,
  generatedRoleIds: GENERATED_ROLE_IDS,
  generatedRoles: GENERATED_ROLES,
  signatures: GENERATED_ROLES.signature,
});

export function resolveLevelOneBiomeVisualFamiliesEnabled(
  config = LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  search = globalThis.location?.search || ""
) {
  const value = new URLSearchParams(search)
    .get(config.queryParam)
    ?.trim()
    .toLowerCase();
  if (value && config.disabledValues.includes(value)) return false;
  return config.enabledByDefault !== false;
}

export function resolveLevelOneBiomeVisualFamily(
  profileOrId,
  config = LEVEL_ONE_BIOME_VISUAL_FAMILIES
) {
  const id = typeof profileOrId === "string" ? profileOrId : profileOrId?.id;
  return config.familyById[id] || null;
}

export function resolveLevelOneBiomeFamilyAssets(
  profileOrId,
  layerId,
  assets,
  config = LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  search = globalThis.location?.search || ""
) {
  if (!resolveLevelOneBiomeVisualFamiliesEnabled(config, search)) return assets;
  const familyEntry = resolveLevelOneBiomeVisualFamily(profileOrId, config);
  const tokens = familyEntry?.assetPathIncludes?.[layerId] || [];
  const matched = assets.filter(entry => (
    tokens.some(token => entry.path?.includes(token))
  ));
  if (layerId === "terrain" && familyEntry?.groundMaterialAssets?.length) {
    if (familyEntry.groundMaterialMode === "append") {
      return Object.freeze([
        ...(matched.length > 0 ? matched : assets),
        ...familyEntry.groundMaterialAssets,
      ]);
    }
    return familyEntry.groundMaterialAssets;
  }
  return matched.length > 0 ? Object.freeze(matched) : assets;
}

export function resolveLevelOneBiomeLayerSeed(
  profileOrId,
  layerId,
  config = LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  search = globalThis.location?.search || ""
) {
  if (!resolveLevelOneBiomeVisualFamiliesEnabled(config, search)) {
    return Number(profileOrId?.assetOffset) || 0;
  }
  const familyEntry = resolveLevelOneBiomeVisualFamily(profileOrId, config);
  return Number(familyEntry?.layerSeeds?.[layerId]) || 0;
}

export function resolveLevelOneBiomeDetailFrameIndexes(
  profileOrId,
  kind,
  config = LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  search = globalThis.location?.search || ""
) {
  if (!resolveLevelOneBiomeVisualFamiliesEnabled(config, search)) return null;
  return resolveLevelOneBiomeVisualFamily(profileOrId, config)
    ?.detailFrameIndexes?.[kind] || null;
}

export function resolveLevelOneBiomeSignatureAsset(
  profileOrId,
  config = LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  search = globalThis.location?.search || ""
) {
  return resolveLevelOneBiomeGeneratedRoleAsset(
    profileOrId,
    "signature",
    config,
    search
  );
}

export function getLevelOneBiomeSignatureAssets(
  config = LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  search = globalThis.location?.search || ""
) {
  return resolveLevelOneBiomeVisualFamiliesEnabled(config, search)
    ? config.families.map(entry => entry.signatureAsset)
    : [];
}

export function resolveLevelOneBiomeGeneratedRoleAsset(
  profileOrId,
  roleId,
  config = LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  search = globalThis.location?.search || ""
) {
  if (!resolveLevelOneBiomeVisualFamiliesEnabled(config, search)) return null;
  return resolveLevelOneBiomeVisualFamily(profileOrId, config)
    ?.generatedRoleAssets?.[roleId] || null;
}

export function getLevelOneBiomeGeneratedRoleAssets(
  config = LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  search = globalThis.location?.search || ""
) {
  if (!resolveLevelOneBiomeVisualFamiliesEnabled(config, search)) return [];
  return config.families.flatMap(entry => (
    config.generatedRoleIds.map(roleId => entry.generatedRoleAssets[roleId])
  ));
}

export function getLevelOneBiomeGroundMaterialAssets(
  config = LEVEL_ONE_BIOME_VISUAL_FAMILIES,
  search = globalThis.location?.search || ""
) {
  if (!resolveLevelOneBiomeVisualFamiliesEnabled(config, search)) return [];
  return config.families.flatMap(entry => entry.groundMaterialAssets || []);
}
