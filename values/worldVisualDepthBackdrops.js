const DISABLED_QUERY_VALUES = Object.freeze(["0", "false", "off", "disabled", "legacy"]);
const BIOME_ROOT = "sprites/backgrounds/world-visual-v2/depth/biome-variation-v2";
const BIOME_MOTION_ROOT = "sprites/backgrounds/world-visual-v2/depth/biome-motion-v3";

const asset = (key, path, type = "image") => Object.freeze({ key, path, type });
const biomeAsset = stem => asset(`world-visual-biome-${stem}`, `${BIOME_ROOT}/${stem}-v2.webp`);
const smoothMotionAsset = stem => asset(
  `world-visual-biome-motion-v3-${stem}`,
  `${BIOME_MOTION_ROOT}/${stem}-loop-v3.mp4`,
  "video"
);
const biomeAssets = (stems, motionStem) => Object.freeze([
  ...stems.map(biomeAsset),
  smoothMotionAsset(motionStem),
]);

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

const region = (
  id, topTile, bottomTileExclusive, variantBackwalls, legacyBackwalls,
  lighting
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
});

const lighting = (deepTint, surfaceTintMix, deepTintMix, lightningTintMix) => ({
  deepTint, lightningTint: 0xffffff, surfaceTintMix, deepTintMix, lightningTintMix,
});

const DEPTH_REGIONS = Object.freeze([
  region("surface-entry", 65, 160, VARIANTS.roots, LEGACY.surface,
    lighting(0x34465b, 0.18, 0.62, 0.22)),
  region("level1-blue", 160, 520, VARIANTS.blue, LEGACY.blue,
    lighting(0x243c58, 0.42, 0.72, 0.24)),
  region("level1-amber", 520, 1040, VARIANTS.amber, LEGACY.amber,
    lighting(0x46382d, 0.56, 0.78, 0.2)),
  region("level1-silver", 1040, 1600, VARIANTS.silver, LEGACY.silver,
    lighting(0x344552, 0.62, 0.82, 0.25)),
  region("level1-magma", 1600, 2065, VARIANTS.core, LEGACY.magma,
    lighting(0x4c2b23, 0.68, 0.86, 0.16)),
  region("level2-slagworks", 2065, 2665, VARIANTS.slagworks, null,
    lighting(0x3a302c, 0.72, 0.88, 0.14)),
  region("level2-obsidian", 2665, 3265, VARIANTS.obsidian, null,
    lighting(0x282737, 0.75, 0.9, 0.17)),
  region("level2-foundry", 3265, 3865, VARIANTS.foundry, null,
    lighting(0x303844, 0.78, 0.91, 0.18)),
  region("level2-blackglass", 3865, 4465, VARIANTS.blackglass, null,
    lighting(0x1d2638, 0.8, 0.93, 0.2)),
  region("level2-starfire", 4465, 5065, VARIANTS.starfire, null,
    lighting(0x241d42, 0.82, 0.94, 0.22)),
]);

export const WORLD_VISUAL_DEPTH_BACKDROPS = Object.freeze({
  enabledByDefault: true,
  queryParam: "levelOneBackdrops",
  compatibilityQueryParam: "shallowCavern",
  variantsQueryParam: "biomeBackdropVariants",
  disabledValues: DISABLED_QUERY_VALUES,
  regions: DEPTH_REGIONS,
  region: DEPTH_REGIONS[0],
  assets: Object.freeze({ backwall: VARIANTS.roots[0] }),
  segment: Object.freeze({
    logicalWidthPx: 1536,
    logicalHeightPx: 1024,
    neighborSegments: 1,
    overlapPx: 2,
  }),
  render: Object.freeze({ backwallDepth: -6.4 }),
  motion: Object.freeze({
    enabledByDefault: true,
    queryParam: "biomeBackdropMotion",
    compatibilityQueryParam: "worldMotion",
    smoothVideo: Object.freeze({
      widthPx: 1536,
      heightPx: 1024,
      durationMs: 8000,
      frameRate: 60,
      codec: "h264",
      noAudio: true,
      loop: true,
      pauseBelowFps: 36,
    }),
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
  return firstAssets.length ? [firstAssets[0]] : [];
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

export function isWorldVisualDepthBackdropRegionReady(region, assetExists, assets = region?.backwalls) {
  return Boolean(assets?.length) && assets.every(entry => assetExists(entry));
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
