const DISABLED_QUERY_VALUES = Object.freeze(["0", "false", "off", "disabled", "legacy"]);

const profile = (id, label, sourceRegionId, mapColor, assetOffset) => Object.freeze({
  id,
  label,
  sourceRegionId,
  mapColor,
  assetOffset,
});

const seed = (
  profileId,
  centerTileX,
  centerDepthM,
  radiusXTiles,
  radiusDepthM,
  bias = 0
) => Object.freeze({
  profileId,
  centerTileX,
  centerDepthM,
  radiusXTiles,
  radiusDepthM,
  bias,
});

const boundaryAsset = (key, path) => Object.freeze({ key, path, type: "image" });

const PROFILES = Object.freeze([
  profile("weathered-rootways", "Weathered Rootways", "surface-entry", 0x65513b, 3),
  profile("fungal-rainwells", "Fungal Rainwells", "surface-entry", 0x4f6045, 9),
  profile("sunken-orchard", "Sunken Orchard", "surface-entry", 0x76603b, 0),
  profile("timber-cisterns", "Timber Cisterns", "surface-entry", 0x51493d, 6),
  profile("thornwake-hollows", "Thornwake Hollows", "surface-entry", 0x5a4736, 2),
  profile("peat-lantern-fen", "Peat Lantern Fen", "surface-entry", 0x84a83d, 5),
  profile("rootbell-ossuary", "Rootbell Ossuary", "surface-entry", 0x6d5b47, 8),
  profile("siltwood-warrens", "Siltwood Warrens", "surface-entry", 0x4d574f, 11),
  profile("mossglass-reservoir", "Mossglass Reservoir", "surface-entry", 0x16a982, 14),
  profile("ironbark-sink", "Ironbark Sink", "surface-entry", 0xb14e38, 4),
  profile("cobalt-aquifer", "Cobalt Aquifer", "level1-blue", 0x294f69, 5),
  profile("sapphire-grotto", "Sapphire Grotto", "level1-blue", 0x345f84, 11),
  profile("glacial-waterveil", "Glacial Waterveil", "level1-blue", 0x3d7189, 2),
  profile("drowned-observatory", "Drowned Observatory", "level1-blue", 0x263f63, 8),
  profile("azure-bell-caves", "Azure Bell Caves", "level1-blue", 0x2d6680, 1),
  profile("stormglass-conduits", "Stormglass Conduits", "level1-blue", 0x4c80d9, 6),
  profile("frozen-choir", "Frozen Choir", "level1-blue", 0x567c96, 10),
  profile("tideclock-chasm", "Tideclock Chasm", "level1-blue", 0x265778, 13),
  profile("prism-kelp-vault", "Prism Kelp Vault", "level1-blue", 0x7a4fbc, 3),
  profile("blue-salt-basilica", "Blue Salt Basilica", "level1-blue", 0x9b90c9, 7),
  profile("amber-silt-fault", "Amber Silt Fault", "level1-amber", 0x865b2c, 7),
  profile("honeyglass-pocket", "Honeyglass Pocket", "level1-amber", 0xa46c27, 13),
  profile("resin-archive", "Resin Archive", "level1-amber", 0x73502f, 1),
  profile("fossil-sun-vault", "Fossil Sun Vault", "level1-amber", 0xb07c36, 10),
  profile("saffron-boneworks", "Saffron Boneworks", "level1-amber", 0x9a6330, 0),
  profile("citrine-hivefault", "Citrine Hivefault", "level1-amber", 0xd4b83f, 5),
  profile("gilded-root-reliquary", "Gilded Root Reliquary", "level1-amber", 0x8c5a37, 9),
  profile("ochre-spiral-quarry", "Ochre Spiral Quarry", "level1-amber", 0x7b562f, 12),
  profile("sunwax-catacombs", "Sunwax Catacombs", "level1-amber", 0xd66f4c, 2),
  profile("bronze-pollen-rift", "Bronze Pollen Rift", "level1-amber", 0x2f8f82, 6),
  profile("mercury-fold", "Mercury Fold", "level1-silver", 0x6f7c87, 4),
  profile("magnetic-needle-reef", "Magnetic Needle Reef", "level1-silver", 0x8995a0, 12),
  profile("lunar-mint-galleries", "Lunar Mint Galleries", "level1-silver", 0x667184, 7),
  profile("mirrorstone-convergence", "Mirrorstone Convergence", "level1-silver", 0x9aa0a6, 14),
  profile("argent-choir", "Argent Choir", "level1-silver", 0x7d8992, 1),
  profile("quicksilver-loom", "Quicksilver Loom", "level1-silver", 0x6faec1, 4),
  profile("moonwire-ravine", "Moonwire Ravine", "level1-silver", 0x687b91, 8),
  profile("pale-magnet-basilica", "Pale Magnet Basilica", "level1-silver", 0xb0a2cc, 11),
  profile("glasssteel-sepulcher", "Glasssteel Sepulcher", "level1-silver", 0x778892, 14),
  profile("starless-reflectory", "Starless Reflectory", "level1-silver", 0x493a78, 3),
  profile("basalt-emberworks", "Basalt Emberworks", "level1-magma", 0x6f3328, 3),
  profile("obsidian-caldera", "Obsidian Caldera", "level1-magma", 0x8a4027, 9),
  profile("lavawheel-necropolis", "Lavawheel Necropolis", "level1-magma", 0x9a4a2d, 5),
  profile("shattered-furnace", "Shattered Furnace", "level1-magma", 0x542b2a, 13),
  profile("cinder-organ", "Cinder Organ", "level1-magma", 0x77342a, 0),
  profile("slagheart-foundry", "Slagheart Foundry", "level1-magma", 0x8d3b26, 5),
  profile("ashen-crown-rift", "Ashen Crown Rift", "level1-magma", 0x7a465f, 9),
  profile("molten-chain-garden", "Molten Chain Garden", "level1-magma", 0xb7665b, 12),
  profile("pyreclast-cathedral", "Pyreclast Cathedral", "level1-magma", 0x87412d, 2),
  profile("blackglass-crucible", "Blackglass Crucible", "level1-magma", 0x43557d, 7),
]);

const PROFILE_IDS_BY_REGION = Object.freeze({
  "surface-entry": Object.freeze([
    "weathered-rootways", "fungal-rainwells", "sunken-orchard", "timber-cisterns",
    "thornwake-hollows", "peat-lantern-fen", "rootbell-ossuary", "siltwood-warrens",
    "mossglass-reservoir", "ironbark-sink",
  ]),
  "level1-blue": Object.freeze([
    "cobalt-aquifer", "sapphire-grotto", "glacial-waterveil", "drowned-observatory",
    "azure-bell-caves", "stormglass-conduits", "frozen-choir", "tideclock-chasm",
    "prism-kelp-vault", "blue-salt-basilica",
  ]),
  "level1-amber": Object.freeze([
    "amber-silt-fault", "honeyglass-pocket", "resin-archive", "fossil-sun-vault",
    "saffron-boneworks", "citrine-hivefault", "gilded-root-reliquary",
    "ochre-spiral-quarry", "sunwax-catacombs", "bronze-pollen-rift",
  ]),
  "level1-silver": Object.freeze([
    "mercury-fold", "magnetic-needle-reef", "lunar-mint-galleries",
    "mirrorstone-convergence", "argent-choir", "quicksilver-loom", "moonwire-ravine",
    "pale-magnet-basilica", "glasssteel-sepulcher", "starless-reflectory",
  ]),
  "level1-magma": Object.freeze([
    "basalt-emberworks", "obsidian-caldera", "lavawheel-necropolis",
    "shattered-furnace", "cinder-organ", "slagheart-foundry", "ashen-crown-rift",
    "molten-chain-garden", "pyreclast-cathedral", "blackglass-crucible",
  ]),
});

const SEED_ROW_X = Object.freeze([8, 36, 64, 92, 120]);
const SEED_ROW_X_SHIFTS = Object.freeze([
  0, 2, -2, 3, -2, 2, -3, 2, -1, 3,
  -2, 1, 3, -2, 2, -3, 2, -2, 3, -1,
]);
const SEED_REGION_ROWS = Object.freeze([
  ["surface-entry", "surface-entry", "surface-entry", "surface-entry", "surface-entry"],
  ["surface-entry", "surface-entry", "surface-entry", "surface-entry", "surface-entry"],
  ["surface-entry", "level1-blue", "surface-entry", "surface-entry", "surface-entry"],
  ["level1-blue", "surface-entry", "surface-entry", "level1-blue", "surface-entry"],
  ["surface-entry", "level1-blue", "level1-blue", "surface-entry", "level1-blue"],
  ["level1-blue", "surface-entry", "level1-blue", "level1-blue", "level1-blue"],
  ["level1-blue", "level1-amber", "level1-blue", "level1-blue", "level1-blue"],
  ["level1-amber", "level1-blue", "level1-blue", "level1-amber", "level1-blue"],
  ["level1-blue", "level1-amber", "level1-amber", "level1-blue", "level1-amber"],
  ["level1-amber", "level1-blue", "level1-amber", "level1-amber", "level1-amber"],
  ["level1-amber", "level1-silver", "level1-amber", "level1-amber", "level1-amber"],
  ["level1-silver", "level1-amber", "level1-amber", "level1-silver", "level1-amber"],
  ["level1-amber", "level1-silver", "level1-silver", "level1-amber", "level1-silver"],
  ["level1-silver", "level1-amber", "level1-silver", "level1-magma", "level1-silver"],
  ["level1-silver", "level1-magma", "level1-silver", "level1-silver", "level1-silver"],
  ["level1-magma", "level1-silver", "level1-silver", "level1-magma", "level1-silver"],
  ["level1-silver", "level1-magma", "level1-magma", "level1-silver", "level1-magma"],
  ["level1-magma", "level1-silver", "level1-magma", "level1-magma", "level1-magma"],
  ["level1-magma", "level1-magma", "level1-silver", "level1-magma", "level1-magma"],
  ["level1-magma", "level1-magma", "level1-magma", "level1-magma", "level1-magma"],
].map(Object.freeze));

// Twenty staggered rows place five lateral territories every ~101 m. Parent
// materials overlap across several rows so neither their joins nor the fifty
// named profile borders collapse into hard horizontal bands. Every profile is
// seeded exactly twice, at distinct X/depth sites.
const buildSeeds = () => {
  const cursors = Object.fromEntries(Object.keys(PROFILE_IDS_BY_REGION).map(id => [id, 0]));
  return SEED_REGION_ROWS.flatMap((regionIds, rowIndex) => regionIds.map(
    (regionId, columnIndex) => {
      const profileIds = PROFILE_IDS_BY_REGION[regionId];
      const profileId = profileIds[cursors[regionId] % profileIds.length];
      cursors[regionId] += 1;
      return seed(
        profileId,
        SEED_ROW_X[columnIndex] + SEED_ROW_X_SHIFTS[rowIndex],
        42 + rowIndex * 101,
        19,
        88,
        0
      );
    }
  ));
};

const SEEDS = Object.freeze(buildSeeds());

const BOUNDARY_ASSETS = Object.freeze({
  "level1-blue|surface-entry": boundaryAsset(
    "world-visual-level1-biome-boundary-roots-cobalt-v1",
    "sprites/backgrounds/world-visual-v2/depth/level1-biome-boundaries-v1/weathered-roots-to-cobalt-v1.webp"
  ),
  "level1-amber|level1-blue": boundaryAsset(
    "world-visual-level1-biome-boundary-cobalt-amber-v1",
    "sprites/backgrounds/world-visual-v2/depth/level1-biome-boundaries-v1/cobalt-to-amber-v1.webp"
  ),
  "level1-amber|surface-entry": boundaryAsset(
    "world-visual-level1-biome-boundary-roots-amber-v1",
    "sprites/backgrounds/world-visual-v2/depth/level1-biome-boundaries-v1/weathered-roots-to-amber-v1.webp"
  ),
  "level1-amber|level1-silver": boundaryAsset(
    "world-visual-level1-biome-boundary-amber-silver-v1",
    "sprites/backgrounds/world-visual-v2/depth/level1-biome-boundaries-v1/amber-to-silver-v1.webp"
  ),
  "level1-blue|level1-silver": boundaryAsset(
    "world-visual-level1-biome-boundary-cobalt-silver-v1",
    "sprites/backgrounds/world-visual-v2/depth/level1-biome-boundaries-v1/cobalt-to-silver-v1.webp"
  ),
  "level1-magma|level1-silver": boundaryAsset(
    "world-visual-level1-biome-boundary-silver-magma-v1",
    "sprites/backgrounds/world-visual-v2/depth/level1-biome-boundaries-v1/silver-to-magma-v1.webp"
  ),
  "level1-amber|level1-magma": boundaryAsset(
    "world-visual-level1-biome-boundary-amber-magma-v1",
    "sprites/backgrounds/world-visual-v2/depth/level1-biome-boundaries-v1/amber-to-magma-v1.webp"
  ),
});

const BOUNDARY_VARIANT_ROOT_V2 = (
  "sprites/backgrounds/world-visual-v2/depth/level1-biome-boundaries-v2"
);
const BOUNDARY_JOIN_IDS = Object.freeze({
  "level1-blue|surface-entry": "roots-cobalt",
  "level1-amber|level1-blue": "cobalt-amber",
  "level1-amber|surface-entry": "roots-amber",
  "level1-amber|level1-silver": "amber-silver",
  "level1-blue|level1-silver": "cobalt-silver",
  "level1-magma|level1-silver": "silver-magma",
  "level1-amber|level1-magma": "amber-magma",
});
const BOUNDARY_ASSET_VARIANTS = Object.freeze(Object.fromEntries(
  Object.entries(BOUNDARY_ASSETS).map(([pairKey, retained]) => {
    const joinId = BOUNDARY_JOIN_IDS[pairKey];
    return [pairKey, Object.freeze([
      retained,
      boundaryAsset(
        `world-visual-level1-biome-boundary-${joinId}-1-v2`,
        `${BOUNDARY_VARIANT_ROOT_V2}/${joinId}-transition-1-v2.webp`
      ),
      boundaryAsset(
        `world-visual-level1-biome-boundary-${joinId}-2-v2`,
        `${BOUNDARY_VARIANT_ROOT_V2}/${joinId}-transition-2-v2.webp`
      ),
    ])];
  })
));

export const LEVEL_ONE_BIOME_FIELD = Object.freeze({
  enabledByDefault: true,
  queryParam: "levelOneBiomeField",
  disabledValues: DISABLED_QUERY_VALUES,
  bounds: Object.freeze({
    leftTile: 0,
    // Gameplay Level 1 owns x0..131. The existing living-backdrop handoff
    // overlaps Level 2 from x113, but Level 2 ownership begins at x132.
    rightTileExclusive: 132,
    topTile: 65,
    bottomTileExclusive: 2065,
  }),
  cadenceMeters: Object.freeze({ minimum: 80, targetMaximum: 150 }),
  sourceRegionIds: Object.freeze([
    "surface-entry",
    "level1-blue",
    "level1-amber",
    "level1-silver",
    "level1-magma",
  ]),
  profiles: PROFILES,
  seeds: SEEDS,
  warp: Object.freeze({
    xFromDepthAmplitudeTiles: 5,
    xFromDepthFrequency: 0.046,
    depthFromXAmplitudeM: 16,
    depthFromXFrequency: 0.066,
    crossAmplitude: 4,
    crossFrequency: 0.027,
  }),
  boundary: Object.freeze({
    assetsByPair: BOUNDARY_ASSETS,
    assetVariantsByPair: BOUNDARY_ASSET_VARIANTS,
    variantAlignment: Object.freeze({
      pairKeys: Object.freeze(["level1-blue|level1-silver"]),
      spreadTiles: 1.6,
      secondaryScale: 0.78,
      rotationStepRadians: 0.018,
      depthStep: 0.00004,
    }),
    placement: Object.freeze({
      cellWidthTiles: 18,
      cellHeightTiles: 14,
      neighborCells: 1,
      sampleOffsetTiles: 9,
      chance: 1,
      jitterXTiles: 3.5,
      jitterYTiles: 2.5,
      minSourceScale: 0.48,
      maxSourceScale: 0.66,
      maxRotationRadians: 0.035,
    }),
    render: Object.freeze({ depth: 0.178, alpha: 0.92, depthJitter: 0.0005 }),
  }),
});

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function resolveProfile(profileId, config) {
  return config.profiles.find(entry => entry.id === profileId) || config.profiles[0];
}

function warpedCoordinates(tileX, depthM, warp) {
  const cross = (tileX + depthM) * warp.crossFrequency;
  return {
    x: tileX
      + Math.sin((depthM + 11) * warp.xFromDepthFrequency)
        * warp.xFromDepthAmplitudeTiles
      + Math.sin(cross) * warp.crossAmplitude,
    depthM: depthM
      + Math.sin((tileX - 17) * warp.depthFromXFrequency)
        * warp.depthFromXAmplitudeM
      + Math.cos(cross * 0.83) * warp.crossAmplitude,
  };
}

export function resolveLevelOneBiomeFieldEnabled(
  config = LEVEL_ONE_BIOME_FIELD,
  search = globalThis.location?.search || ""
) {
  const value = new URLSearchParams(search).get(config.queryParam)?.trim().toLowerCase();
  if (value && config.disabledValues.includes(value)) return false;
  return config.enabledByDefault !== false;
}

export function isLevelOneBiomeFieldTile(
  tileX,
  tileY,
  config = LEVEL_ONE_BIOME_FIELD
) {
  const bounds = config.bounds;
  return tileX >= bounds.leftTile
    && tileX < bounds.rightTileExclusive
    && tileY >= bounds.topTile
    && tileY < bounds.bottomTileExclusive;
}

export function doesLevelOneBiomeFieldAffectRegion(
  region,
  config = LEVEL_ONE_BIOME_FIELD
) {
  const bounds = config.bounds;
  return Boolean(region)
    && region.rightTileExclusive > bounds.leftTile
    && region.leftTile < bounds.rightTileExclusive
    && region.bottomTileExclusive > bounds.topTile
    && region.topTile < bounds.bottomTileExclusive;
}

export function resolveLevelOneBiomeFieldAtTile(
  tileX,
  tileY,
  config = LEVEL_ONE_BIOME_FIELD
) {
  if (!isLevelOneBiomeFieldTile(tileX, tileY, config)) return null;
  const depthM = tileY - config.bounds.topTile;
  const warped = warpedCoordinates(tileX, depthM, config.warp);
  let best = null;
  let second = null;
  for (const entry of config.seeds) {
    const dx = (warped.x - entry.centerTileX) / entry.radiusXTiles;
    const dy = (warped.depthM - entry.centerDepthM) / entry.radiusDepthM;
    const score = dx * dx + dy * dy + entry.bias;
    const candidate = { seed: entry, score };
    if (!best || score < best.score) {
      second = best;
      best = candidate;
    } else if (!second || score < second.score) {
      second = candidate;
    }
  }
  const selected = resolveProfile(best.seed.profileId, config);
  const neighbor = resolveProfile(second?.seed.profileId, config);
  const separation = Math.max(0, (second?.score ?? best.score + 1) - best.score);
  return {
    ...selected,
    boundaryStrength: clamp01(1 - separation / 0.34),
    neighborProfileId: neighbor.id,
    neighborSourceRegionId: neighbor.sourceRegionId,
  };
}

export function resolveLevelOneBiomeBoundaryPairKey(firstRegionId, secondRegionId) {
  if (!firstRegionId || !secondRegionId || firstRegionId === secondRegionId) return "";
  return [firstRegionId, secondRegionId].sort().join("|");
}

export function resolveLevelOneBiomeBoundaryAsset(
  firstRegionId,
  secondRegionId,
  config = LEVEL_ONE_BIOME_FIELD
) {
  return config.boundary.assetsByPair[
    resolveLevelOneBiomeBoundaryPairKey(firstRegionId, secondRegionId)
  ] || null;
}

export function resolveLevelOneBiomeBoundaryAssets(
  firstRegionId,
  secondRegionId,
  config = LEVEL_ONE_BIOME_FIELD
) {
  const pairKey = resolveLevelOneBiomeBoundaryPairKey(firstRegionId, secondRegionId);
  return config.boundary.assetVariantsByPair?.[pairKey]
    || (config.boundary.assetsByPair[pairKey]
      ? Object.freeze([config.boundary.assetsByPair[pairKey]])
      : Object.freeze([]));
}

export function getLevelOneBiomeBoundaryAssets(config = LEVEL_ONE_BIOME_FIELD) {
  return config.boundary.assetVariantsByPair
    ? Object.values(config.boundary.assetVariantsByPair).flat()
    : Object.values(config.boundary.assetsByPair);
}
