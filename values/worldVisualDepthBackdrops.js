const DISABLED_QUERY_VALUES = Object.freeze(["0", "false", "off", "disabled", "legacy"]);
const BIOME_ROOT = "sprites/backgrounds/world-visual-v2/depth/biome-variation-v2";

const asset = (key, path) => Object.freeze({ key, path });
const biomeAsset = stem => asset(`world-visual-biome-${stem}`, `${BIOME_ROOT}/${stem}-v2.webp`);
const biomeMotionAsset = stem => asset(
  `world-visual-biome-motion-${stem}`,
  `${BIOME_ROOT}/${stem}-motion-v1.webp`
);
const biomeAssets = (stems, motionStem) => Object.freeze([
  ...stems.map(biomeAsset),
  biomeMotionAsset(motionStem),
]);

const SHARED_MIST = asset(
  "bg-sky-v3-clouds-near",
  "sprites/backgrounds/background-database/sky-background-v3/sky-v3-clouds-near.webp"
);

const LEGACY = Object.freeze({
  surface: Object.freeze([asset(
    "world-visual-v2-shallow-cavern-backwall",
    "sprites/backgrounds/world-visual-v2/depth/shallow-cavern-backwall-v1.png"
  )]),
  blue: Object.freeze([
    asset("world-visual-v2-level1-blue-backwall-a", "sprites/backgrounds/world-visual-v2/depth/level1-blue-backwall-a-v1.png"),
    asset("world-visual-v2-level1-blue-backwall-b", "sprites/backgrounds/world-visual-v2/depth/level1-blue-backwall-b-v1.png"),
  ]),
  amber: Object.freeze([asset(
    "world-visual-v2-level1-amber-backwall",
    "sprites/backgrounds/world-visual-v2/depth/level1-amber-backwall-v1.png"
  )]),
  silver: Object.freeze([asset(
    "world-visual-v2-level1-silver-backwall",
    "sprites/backgrounds/world-visual-v2/depth/level1-silver-backwall-v1.png"
  )]),
  magma: Object.freeze([asset(
    "world-visual-v2-level1-magma-backwall",
    "sprites/backgrounds/world-visual-v2/depth/level1-magma-backwall-v1.png"
  )]),
});

const VARIANTS = Object.freeze({
  roots: biomeAssets([
    "weathered-roots-root-canyon", "weathered-roots-drowned-timber-bridge",
    "weathered-roots-fungal-lantern-hollow", "weathered-roots-collapsed-cistern",
    "weathered-roots-quiet-loam-pocket",
  ], "weathered-roots-root-tide-lantern-hollow"),
  blue: biomeAssets([
    "blue-caverns-crystal-ravine", "blue-caverns-suspended-ice-bridge",
    "blue-caverns-water-veil-chamber", "blue-caverns-cobalt-ruins",
    "blue-caverns-quiet-sapphire-pocket",
  ], "blue-caverns-resonant-crystal-rain"),
  amber: biomeAssets([
    "amber-depths-amber-canyon", "amber-depths-chain-bridge-gallery",
    "amber-depths-dustfall-chamber", "amber-depths-resin-archive-ruins",
    "amber-depths-quiet-honey-pocket",
  ], "amber-depths-golden-dust-cathedral"),
  silver: biomeAssets([
    "silver-core-cleaved-silver-canyon", "silver-core-suspended-rib-bridge",
    "silver-core-shimmerfall-curtain", "silver-core-forgotten-mint-ruins",
    "silver-core-quiet-mirror-pocket",
  ], "silver-core-mercury-shimmerfall"),
  core: biomeAssets([
    "core-magma-lava-ravine", "core-magma-basalt-bridgeworks",
    "core-magma-ashfall-chamber", "core-magma-volcanic-watchtower-ruins",
    "core-magma-quiet-ember-pocket",
  ], "core-magma-basalt-heartbeat"),
  slagworks: biomeAssets([
    "slagworks-slag-trench", "slagworks-gantry-bridge-maze",
    "slagworks-steamfall-condenser", "slagworks-smelter-barracks-ruins",
    "slagworks-quiet-cooling-chamber",
  ], "slagworks-pressure-breath-foundry"),
  obsidian: biomeAssets([
    "obsidian-catacombs-glass-ravine", "obsidian-catacombs-black-arch-bridge",
    "obsidian-catacombs-ashfall-curtain", "obsidian-catacombs-shattered-crypt-city",
    "obsidian-catacombs-quiet-void-pocket",
  ], "obsidian-catacombs-violet-ash-procession"),
  foundry: biomeAssets([
    "pressure-foundry-pressure-trench", "pressure-foundry-pipe-bridge-network",
    "pressure-foundry-steam-curtain", "pressure-foundry-control-citadel",
    "pressure-foundry-quiet-maintenance-bay",
  ], "pressure-foundry-condenser-surge"),
  blackglass: biomeAssets([
    "blackglass-abyss-mirror-chasm", "blackglass-abyss-prism-bridge",
    "blackglass-abyss-stardust-fall", "blackglass-abyss-eclipse-city-ruins",
    "blackglass-abyss-quiet-void-gallery",
  ], "blackglass-abyss-prismatic-star-drift"),
  starfire: biomeAssets([
    "starfire-rift-cosmic-ravine", "starfire-rift-ring-bridge",
    "starfire-rift-starfall-curtain", "starfire-rift-celestial-citadel",
    "starfire-rift-silent-core-pocket",
  ], "starfire-rift-celestial-current"),
});

const profile = (kind, tint, count, alpha, periodMs, travel, drift, size) => (
  Object.freeze({ kind, tint, count, alpha, periodMs, travel, drift, size })
);

const region = (
  id, topTile, bottomTileExclusive, variantBackwalls, legacyBackwalls,
  lighting, mist, emissive, ambient
) => Object.freeze({
  id,
  leftTile: 0,
  rightTileExclusive: 280,
  topTile,
  bottomTileExclusive,
  backwall: variantBackwalls[0],
  backwalls: variantBackwalls,
  variantBackwalls,
  legacyBackwalls: legacyBackwalls || Object.freeze([]),
  lighting: Object.freeze(lighting),
  mist: Object.freeze(mist),
  emissive: Object.freeze(emissive),
  ambient,
});

const lighting = (deepTint, surfaceTintMix, deepTintMix, lightningTintMix) => ({
  deepTint, lightningTint: 0xffffff, surfaceTintMix, deepTintMix, lightningTintMix,
});
const mist = (tint, baseAlpha, wetAlpha, fogAlpha, maxAlpha) => ({
  tint, baseAlpha, wetAlpha, fogAlpha, lightningAlpha: 0.018, maxAlpha,
});
const glow = (tint, baseAlpha, pulseAlpha, maxAlpha, periodMs, phaseStep = 0.9) => ({
  tint, baseAlpha, pulseAlpha, lightningAlpha: 0.035, maxAlpha,
  periodMs, phaseStep, blendMode: "SCREEN",
});

const DEPTH_REGIONS = Object.freeze([
  region("surface-entry", 65, 160, VARIANTS.roots, LEGACY.surface,
    lighting(0x34465b, 0.18, 0.62, 0.22), mist(0x8ebfe5, 0.012, 0.032, 0.055, 0.09),
    glow(0x76bfff, 0.012, 0.008, 0.07, 12800, 0.71),
    profile("dust", 0xc5a77d, 8, 0.12, 21000, 0.3, 0.08, 2.4)),
  region("level1-blue", 160, 520, VARIANTS.blue, LEGACY.blue,
    lighting(0x243c58, 0.42, 0.72, 0.24), mist(0x79acd7, 0.014, 0.036, 0.052, 0.095),
    glow(0x72bcff, 0.014, 0.009, 0.08, 11600, 0.83),
    profile("drip", 0x86d7ff, 7, 0.16, 9200, 0.72, 0.03, 2)),
  region("level1-amber", 520, 1040, VARIANTS.amber, LEGACY.amber,
    lighting(0x46382d, 0.56, 0.78, 0.2), mist(0xc79b72, 0.011, 0.026, 0.046, 0.082),
    glow(0xffbc63, 0.016, 0.01, 0.085, 9800, 0.91),
    profile("dust", 0xffca78, 10, 0.15, 17500, 0.32, 0.12, 2.6)),
  region("level1-silver", 1040, 1600, VARIANTS.silver, LEGACY.silver,
    lighting(0x344552, 0.62, 0.82, 0.25), mist(0xb9d3df, 0.013, 0.024, 0.05, 0.086),
    glow(0xd4efff, 0.012, 0.008, 0.078, 13200, 1.03),
    profile("star", 0xe8f8ff, 8, 0.16, 13800, 0.18, 0.08, 2.2)),
  region("level1-magma", 1600, 2065, VARIANTS.core, LEGACY.magma,
    lighting(0x4c2b23, 0.68, 0.86, 0.16), mist(0xb46f54, 0.008, 0.014, 0.035, 0.062),
    glow(0xff6134, 0.023, 0.014, 0.11, 8200, 1.17),
    profile("ember", 0xff7b3b, 11, 0.22, 9800, 0.72, 0.1, 2.8)),
  region("level2-slagworks", 2065, 2665, VARIANTS.slagworks, null,
    lighting(0x3a302c, 0.72, 0.88, 0.14), mist(0xb08770, 0.01, 0.018, 0.04, 0.07),
    glow(0xff8248, 0.016, 0.011, 0.09, 8900, 1.23),
    profile("steam", 0xd4c8b9, 9, 0.1, 13500, 0.65, 0.16, 8)),
  region("level2-obsidian", 2665, 3265, VARIANTS.obsidian, null,
    lighting(0x282737, 0.75, 0.9, 0.17), mist(0x817d91, 0.008, 0.012, 0.035, 0.06),
    glow(0xb773ff, 0.014, 0.012, 0.09, 10500, 1.31),
    profile("ash", 0x9b91a7, 10, 0.13, 19000, 0.58, 0.14, 2.7)),
  region("level2-foundry", 3265, 3865, VARIANTS.foundry, null,
    lighting(0x303844, 0.78, 0.91, 0.18), mist(0x95adbb, 0.011, 0.02, 0.04, 0.072),
    glow(0x62d9ff, 0.016, 0.012, 0.095, 9300, 1.37),
    profile("steam", 0xb9e7ee, 10, 0.12, 11800, 0.7, 0.18, 8.5)),
  region("level2-blackglass", 3865, 4465, VARIANTS.blackglass, null,
    lighting(0x1d2638, 0.8, 0.93, 0.2), mist(0x60789a, 0.007, 0.01, 0.032, 0.052),
    glow(0x4a8dff, 0.014, 0.013, 0.095, 11200, 1.43),
    profile("star", 0x86b9ff, 12, 0.2, 14600, 0.22, 0.1, 2.6)),
  region("level2-starfire", 4465, 5065, VARIANTS.starfire, null,
    lighting(0x241d42, 0.82, 0.94, 0.22), mist(0x796ca4, 0.006, 0.009, 0.03, 0.05),
    glow(0xff75df, 0.018, 0.016, 0.12, 7600, 1.51),
    profile("star", 0xffb7f2, 14, 0.24, 12600, 0.26, 0.14, 3)),
]);

export const WORLD_VISUAL_DEPTH_BACKDROPS = Object.freeze({
  enabledByDefault: true,
  queryParam: "levelOneBackdrops",
  compatibilityQueryParam: "shallowCavern",
  variantsQueryParam: "biomeBackdropVariants",
  disabledValues: DISABLED_QUERY_VALUES,
  regions: DEPTH_REGIONS,
  region: DEPTH_REGIONS[0],
  assets: Object.freeze({ backwall: VARIANTS.roots[0], mist: SHARED_MIST }),
  segment: Object.freeze({
    logicalWidthPx: 1536,
    logicalHeightPx: 1024,
    neighborSegments: 1,
    overlapPx: 2,
  }),
  render: Object.freeze({
    backwallDepth: -6.4,
    emissiveDepth: -6.1,
    mistDepth: -5.8,
    signatureDepth: -5.66,
    ambientDepth: -5.55,
  }),
  motion: Object.freeze({
    enabledByDefault: true,
    queryParam: "biomeBackdropMotion",
    compatibilityQueryParam: "worldMotion",
    driftTiles: 0.18,
    verticalDriftTiles: 0.035,
    periodMs: 37000,
    phaseStep: 0.83,
    rowPhaseMultiplier: 3,
    secondaryPeriodScale: 0.73,
    emissiveShiftPx: 1.5,
    emissiveScalePulse: 0.0025,
    ambientUpdateMs: 50,
    reducedUpdateMs: 85,
    reduceBelowFps: 44,
    disableBelowFps: 32,
    maxMotes: 80,
    reducedMaxMotes: 40,
  }),
});

function isDisabledQuery(config, search, queryParam) {
  const value = new URLSearchParams(search).get(queryParam)?.trim().toLowerCase();
  return Boolean(value && config.disabledValues.includes(value));
}

export function resolveWorldVisualDepthBackdropsEnabled(
  config = WORLD_VISUAL_DEPTH_BACKDROPS,
  search = globalThis.location?.search || ""
) {
  if (isDisabledQuery(config, search, config.queryParam)) return false;
  if (isDisabledQuery(config, search, config.compatibilityQueryParam)) return false;
  return config.enabledByDefault;
}

export function resolveWorldVisualDepthBackdropVariantsEnabled(
  config = WORLD_VISUAL_DEPTH_BACKDROPS,
  search = globalThis.location?.search || ""
) {
  return !isDisabledQuery(config, search, config.variantsQueryParam);
}

export function resolveWorldVisualDepthBackdropMotionEnabled(
  config = WORLD_VISUAL_DEPTH_BACKDROPS,
  search = globalThis.location?.search || ""
) {
  if (!resolveWorldVisualDepthBackdropsEnabled(config, search)) return false;
  if (isDisabledQuery(config, search, config.motion.queryParam)) return false;
  if (isDisabledQuery(config, search, config.motion.compatibilityQueryParam)) return false;
  return config.motion.enabledByDefault;
}

export function resolveWorldVisualDepthBackdropRegionAssets(
  region,
  config = WORLD_VISUAL_DEPTH_BACKDROPS,
  search = globalThis.location?.search || ""
) {
  if (resolveWorldVisualDepthBackdropVariantsEnabled(config, search)) {
    return region?.variantBackwalls || region?.backwalls || [];
  }
  return region?.legacyBackwalls || [];
}

export function getWorldVisualDepthBackdropAllAssets(
  config = WORLD_VISUAL_DEPTH_BACKDROPS,
  search
) {
  return config.regions.flatMap(region => (
    resolveWorldVisualDepthBackdropRegionAssets(region, config, search)
  ));
}

export function getWorldVisualDepthBackdropPreloadAssets(
  config = WORLD_VISUAL_DEPTH_BACKDROPS,
  search
) {
  if (!resolveWorldVisualDepthBackdropsEnabled(config, search)) return [];
  const firstAssets = resolveWorldVisualDepthBackdropRegionAssets(config.regions[0], config, search);
  return firstAssets.length ? [firstAssets[0], config.assets.mist] : [config.assets.mist];
}

export function resolveWorldVisualDepthBackdropRegions(
  topTile,
  bottomTileExclusive,
  config = WORLD_VISUAL_DEPTH_BACKDROPS,
  search
) {
  if (!resolveWorldVisualDepthBackdropsEnabled(config, search)) return [];
  if (bottomTileExclusive <= topTile) return [];
  return config.regions.filter(entry => (
    entry.bottomTileExclusive > topTile
    && entry.topTile < bottomTileExclusive
    && resolveWorldVisualDepthBackdropRegionAssets(entry, config, search).length > 0
  ));
}

export function isWorldVisualDepthBackdropRegionReady(region, textureExists, assets = region?.backwalls) {
  return Boolean(assets?.length) && assets.every(entry => textureExists(entry.key));
}

export function isWorldVisualDepthBackdropCoveredTile(
  tileX,
  tileY,
  config = WORLD_VISUAL_DEPTH_BACKDROPS,
  search
) {
  return resolveWorldVisualDepthBackdropRegions(tileY, tileY + 1, config, search).some(entry => (
    tileX >= entry.leftTile && tileX < entry.rightTileExclusive
  ));
}
