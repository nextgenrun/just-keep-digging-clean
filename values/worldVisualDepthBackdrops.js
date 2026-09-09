import {
  CAVE_VISUAL_COMPOSITION,
  applyCaveBackdropTone,
  resolveCaveCompositionWeight,
} from "./caveVisualComposition.js";
import {
  LEVEL_ONE_BIOME_FIELD,
  doesLevelOneBiomeFieldAffectRegion,
  resolveLevelOneBiomeFieldEnabled,
} from "./levelOneBiomeField.js";

const DISABLED_QUERY_VALUES = Object.freeze(["0", "false", "off", "disabled", "legacy"]);
const BIOME_ROOT = "sprites/backgrounds/world-visual-v2/depth/biome-variation-v2";
const BIOME_EXPANSION_ROOT = "sprites/backgrounds/world-visual-v2/depth/biome-expansion-v3";
const BIOME_EXPANSION_V5_ROOT = (
  "sprites/backgrounds/world-visual-v2/depth/biome-expansion-v5"
);
const BIOME_MOTION_ROOT = "sprites/backgrounds/world-visual-v2/depth/biome-motion-v3";
const TERRAIN_VARIATION_ROOT = (
  "sprites/backgrounds/world-visual-v2/depth/terrain-variation-v4"
);
const TERRAIN_VARIATION_V5_ROOT = (
  "sprites/backgrounds/world-visual-v2/depth/terrain-variation-v5"
);
const SHALLOW_MATERIAL_NORMAL_ROOT = (
  "sprites/backgrounds/world-visual-v2/depth/material-normal-v1"
);

const resolveMaterialNormalPath = (path, type) => (
  type === "image" && path.includes("weathered-roots-")
    ? `${SHALLOW_MATERIAL_NORMAL_ROOT}/${path.split("/").pop().replace(/\.[^.]+$/, "")}-normal-v1.webp?rev=20260815b`
    : null
);
const asset = (key, path, type = "image") => Object.freeze({
  key,
  path,
  type,
  normalMapPath: resolveMaterialNormalPath(path, type),
});
const biomeAsset = stem => asset(`world-visual-biome-${stem}`, `${BIOME_ROOT}/${stem}-v2.webp`);
const expansionAsset = stem => asset(
  `world-visual-biome-expansion-v3-${stem}`,
  `${BIOME_EXPANSION_ROOT}/${stem}-v3.webp`
);
const expansionV5Asset = stem => asset(
  `world-visual-biome-expansion-v5-${stem}`,
  `${BIOME_EXPANSION_V5_ROOT}/${stem}-v5.webp`
);
const conceptStaticAsset = stem => asset(
  `world-visual-biome-concept-${stem}`,
  `${BIOME_ROOT}/${stem}-motion-v1.webp`
);
const smoothMotionAsset = stem => asset(
  `world-visual-biome-motion-v3-${stem}`,
  `${BIOME_MOTION_ROOT}/${stem}-loop-v3.mp4`,
  "video"
);
const BACKDROP_BLEND_MASK = asset(
  "world-visual-backdrop-card-blend-mask-atlas-v4",
  `${TERRAIN_VARIATION_ROOT}/backdrop-card-blend-mask-atlas-v4.png`
);
const BACKDROP_BLEND_MASK_V5 = asset(
  "world-visual-backdrop-card-blend-mask-atlas-v5",
  `${TERRAIN_VARIATION_V5_ROOT}/backdrop-card-blend-mask-atlas-v5.png`
);
const biomeAssets = (stems, conceptStem, expansionStems, expansionV5Stems) => {
  const existing = stems.map(biomeAsset);
  const expansion = expansionStems.map(expansionAsset);
  const expansionV5 = expansionV5Stems.map(expansionV5Asset);
  const base = Object.freeze([
    ...existing,
    conceptStaticAsset(conceptStem),
    smoothMotionAsset(conceptStem),
  ]);
  const expanded = Object.freeze([
    ...existing.flatMap((entry, index) => [entry, expansion[index]]),
    conceptStaticAsset(conceptStem),
    smoothMotionAsset(conceptStem),
  ]);
  const wholeWorldExpanded = Object.freeze([
    ...expanded,
    ...expansionV5,
  ]);
  return Object.freeze({ base, expanded, wholeWorldExpanded });
};

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
  ], "weathered-roots-root-tide-lantern-hollow", [
    "weathered-roots-uprooted-bell-tower", "weathered-roots-rainwell-canopy",
    "weathered-roots-mycorrhizal-procession", "weathered-roots-sunken-orchard-vault",
    "weathered-roots-amber-seed-sanctum",
  ], [
    "weathered-roots-rootwater-sink-valley",
    "weathered-roots-shale-root-escarpment",
  ]),
  blue: biomeAssets([
    "blue-caverns-crystal-ravine", "blue-caverns-suspended-ice-bridge",
    "blue-caverns-water-veil-chamber", "blue-caverns-cobalt-ruins",
    "blue-caverns-quiet-sapphire-pocket",
  ], "blue-caverns-resonant-crystal-rain", [
    "blue-caverns-leviathan-ice-ribs", "blue-caverns-inverted-water-temple",
    "blue-caverns-aurora-crystal-well", "blue-caverns-drowned-observatory",
    "blue-caverns-singing-geode-crown",
  ], [
    "blue-caverns-cobalt-river-switchback",
    "blue-caverns-glacial-fault-overlook",
    "blue-caverns-amber-silt-handoff",
  ]),
  amber: biomeAssets([
    "amber-depths-amber-canyon", "amber-depths-chain-bridge-gallery",
    "amber-depths-dustfall-chamber", "amber-depths-resin-archive-ruins",
    "amber-depths-quiet-honey-pocket",
  ], "amber-depths-golden-dust-cathedral", [
    "amber-depths-resin-clockwork-basilica", "amber-depths-fossil-sun-vault",
    "amber-depths-honeyglass-aqueduct", "amber-depths-chain-library-abyss",
    "amber-depths-gilded-wing-reliquary",
  ], [
    "amber-depths-resin-tide-escarpment",
    "amber-depths-fossil-forest-gorge",
    "amber-depths-argent-calcite-handoff",
  ]),
  silver: biomeAssets([
    "silver-core-cleaved-silver-canyon", "silver-core-suspended-rib-bridge",
    "silver-core-shimmerfall-curtain", "silver-core-forgotten-mint-ruins",
    "silver-core-quiet-mirror-pocket",
  ], "silver-core-mercury-shimmerfall", [
    "silver-core-mirror-organ-cathedral", "silver-core-magnetic-needle-forest",
    "silver-core-lunar-mint-rotunda", "silver-core-mercury-aqueduct-city",
    "silver-core-eclipsed-reflector-array",
  ], [
    "silver-core-mercury-delta-terraces",
    "silver-core-magnetic-shear-horizon",
    "silver-core-ember-metal-handoff",
  ]),
  core: biomeAssets([
    "core-magma-lava-ravine", "core-magma-basalt-bridgeworks",
    "core-magma-ashfall-chamber", "core-magma-volcanic-watchtower-ruins",
    "core-magma-quiet-ember-pocket",
  ], "core-magma-basalt-heartbeat", [
    "core-magma-titan-forge-caldera", "core-magma-obsidian-organ-pipes",
    "core-magma-lava-wheel-necropolis", "core-magma-ember-crown-chasm",
    "core-magma-basalt-sun-engine",
  ], [
    "core-magma-lava-braided-canyon",
    "core-magma-caldera-wall-crossing",
    "core-magma-basalt-storm-gallery",
    "core-magma-slag-heat-handoff",
  ]),
  slagworks: biomeAssets([
    "slagworks-slag-trench", "slagworks-gantry-bridge-maze",
    "slagworks-steamfall-condenser", "slagworks-smelter-barracks-ruins",
    "slagworks-quiet-cooling-chamber",
  ], "slagworks-pressure-breath-foundry", [
    "slagworks-buried-rail-cathedral", "slagworks-cooling-tower-canyon",
    "slagworks-molten-crane-graveyard", "slagworks-pressure-drum-city",
    "slagworks-iron-rain-exchange",
  ], [
    "slagworks-iron-river-sorting-yard",
    "slagworks-collapsed-bloomery-terraces",
    "slagworks-cooling-viaduct-horizon",
    "slagworks-crucible-waste-delta",
    "slagworks-copper-salt-vent-field",
    "slagworks-blackslag-handoff",
  ]),
  obsidian: biomeAssets([
    "obsidian-catacombs-glass-ravine", "obsidian-catacombs-black-arch-bridge",
    "obsidian-catacombs-ashfall-curtain", "obsidian-catacombs-shattered-crypt-city",
    "obsidian-catacombs-quiet-void-pocket",
  ], "obsidian-catacombs-violet-ash-procession", [
    "obsidian-catacombs-black-mirror-basilica",
    "obsidian-catacombs-violet-reliquary-avenue",
    "obsidian-catacombs-shard-bell-necropolis",
    "obsidian-catacombs-eclipse-crypt-well",
    "obsidian-catacombs-glass-memory-archive",
  ], [
    "obsidian-catacombs-glass-fjord-escarpment",
    "obsidian-catacombs-violet-ash-switchback",
    "obsidian-catacombs-crypt-quarry-horizon",
    "obsidian-catacombs-shattered-column-rain",
    "obsidian-catacombs-voidwater-trench",
    "obsidian-catacombs-condenser-ruin-handoff",
  ]),
  foundry: biomeAssets([
    "pressure-foundry-pressure-trench", "pressure-foundry-pipe-bridge-network",
    "pressure-foundry-steam-curtain", "pressure-foundry-control-citadel",
    "pressure-foundry-quiet-maintenance-bay",
  ], "pressure-foundry-condenser-surge", [
    "pressure-foundry-piston-orchestra", "pressure-foundry-cyan-boiler-citadel",
    "pressure-foundry-valve-wheel-horizon", "pressure-foundry-condenser-tower-delta",
    "pressure-foundry-arc-furnace-throne",
  ], [
    "pressure-foundry-piston-ravine-crossing",
    "pressure-foundry-boiler-canopy-delta",
    "pressure-foundry-pressure-pipe-horizon",
    "pressure-foundry-cyan-condensate-falls",
    "pressure-foundry-rivet-cliff-reservoir",
    "pressure-foundry-turbine-graveyard-slope",
    "pressure-foundry-prism-coolant-handoff",
  ]),
  blackglass: biomeAssets([
    "blackglass-abyss-mirror-chasm", "blackglass-abyss-prism-bridge",
    "blackglass-abyss-stardust-fall", "blackglass-abyss-eclipse-city-ruins",
    "blackglass-abyss-quiet-void-gallery",
  ], "blackglass-abyss-prismatic-star-drift", [
    "blackglass-abyss-fractured-planetarium", "blackglass-abyss-prism-tide-vault",
    "blackglass-abyss-eclipse-bridge-city", "blackglass-abyss-star-map-necropolis",
    "blackglass-abyss-infinite-mirror-well",
  ], [
    "blackglass-abyss-prism-rift-escarpment",
    "blackglass-abyss-eclipse-shard-delta",
    "blackglass-abyss-star-map-fault-valley",
    "blackglass-abyss-black-mirror-tideway",
    "blackglass-abyss-spectral-scree-horizon",
    "blackglass-abyss-fractured-orbit-terraces",
    "blackglass-abyss-violet-gravity-shear",
    "blackglass-abyss-starfire-handoff-corridor",
  ]),
  starfire: biomeAssets([
    "starfire-rift-cosmic-ravine", "starfire-rift-ring-bridge",
    "starfire-rift-starfall-curtain", "starfire-rift-celestial-citadel",
    "starfire-rift-silent-core-pocket",
  ], "starfire-rift-celestial-current", [
    "starfire-rift-orbital-ring-cathedral", "starfire-rift-nebula-waterfall-city",
    "starfire-rift-celestial-engine-choir", "starfire-rift-comet-archive-terraces",
    "starfire-rift-binary-star-sanctum",
  ], [
    "starfire-rift-comet-river-terraces",
    "starfire-rift-nebula-quartz-escarpment",
    "starfire-rift-binary-light-faultfield",
    "starfire-rift-celestial-current-canyon",
    "starfire-rift-star-metal-archipelago",
    "starfire-rift-cosmic-ash-watercourse",
    "starfire-rift-aurora-crystal-horizon",
    "starfire-rift-terminal-rift-overlook",
  ]),
});

const region = (
  id, topTile, bottomTileExclusive, variantSet, legacyBackwalls,
  lighting
) => Object.freeze({
  id,
  leftTile: 0,
  rightTileExclusive: 280,
  topTile,
  bottomTileExclusive,
  backwall: variantSet.expanded[0],
  backwalls: variantSet.expanded,
  variantBackwalls: variantSet.expanded,
  wholeWorldVariantBackwalls: variantSet.wholeWorldExpanded,
  baseVariantBackwalls: variantSet.base,
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
  expansion: Object.freeze({
    enabledByDefault: true,
    queryParam: "biomeBackdropExpansion",
  }),
  wholeWorldExpansion: Object.freeze({
    enabledByDefault: true,
    queryParam: "biomeBackdropExpansionV5",
  }),
  materialLighting: Object.freeze({
    enabledByDefault: true,
    queryParam: "shallowMaterialLighting",
    enabledValues: Object.freeze(["1", "on", "true", "material"]),
    disabledValues: DISABLED_QUERY_VALUES,
    targetRegionIds: Object.freeze(["surface-entry"]),
    ambientColor: 0x5b7489,
    coolFill: Object.freeze({
      color: 0x78b4d2,
      radiusPx: 940,
      intensity: 1.9,
      offsetXPx: -240,
      offsetYPx: -110,
    }),
    warmPlayerLight: Object.freeze({
      color: 0xffb563,
      radiusPx: 430,
      intensity: 2.75,
      offsetXPx: 24,
      offsetYPx: 10,
    }),
  }),
  regions: DEPTH_REGIONS,
  region: DEPTH_REGIONS[0],
  assets: Object.freeze({ backwall: VARIANTS.roots[0] }),
  segment: Object.freeze({
    // Crop the baked 12.5% vignette at native density. The source pixels stay
    // 1:1; only the generated dark edge is excluded from the visible card.
    sourceCrop: Object.freeze({
      xPx: 192,
      yPx: 128,
      widthPx: 1152,
      heightPx: 768,
    }),
    logicalWidthPx: 1152,
    logicalHeightPx: 768,
    neighborSegments: 1,
    overlapXPx: 144,
    overlapYPx: 140,
    strideXPx: 1008,
    strideYPx: 628,
  }),
  blend: Object.freeze({
    enabled: true,
    mode: "normalized-additive",
    edgePolicy: "all-neighbors",
    blendMode: "ADD",
    matteColor: 0x000000,
    maskResolutionScale: 1 / 3,
    featherXPx: 144,
    featherYPx: 140,
    textureKeyPrefix: "world-visual-depth-normalized-mask",
    maskAtlas: BACKDROP_BLEND_MASK,
    wholeWorldMaskAtlas: BACKDROP_BLEND_MASK_V5,
    // 140 px also keeps every authored biome tail at least two feathers tall,
    // so no three-card intersection can create a dark or bright fold.
    crossBiomeOverlapYPx: 140,
    frameWidthPx: 384,
    frameHeightPx: 256,
    columns: 4,
    edgeBits: Object.freeze({
      left: 1,
      right: 2,
      top: 4,
      bottom: 8,
    }),
  }),
  render: Object.freeze({
    backwallDepth: -6.4,
    matteDepth: -6.41,
    regionDepthStride: 0.02,
    segmentDepthStep: 0.00001,
  }),
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

export function clampWorldVisualTintAmount(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export function mixWorldVisualTint(from, to, amount) {
  const t = clampWorldVisualTintAmount(amount);
  const channel = shift => Math.round(
    ((from >> shift) & 255) * (1 - t) + ((to >> shift) & 255) * t
  );
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

export function resolveWorldVisualDepthBackdropTint(
  centerTileY,
  lightingState,
  config = WORLD_VISUAL_DEPTH_BACKDROPS,
  suppliedRegion = null
) {
  const sourceFarTint = Number.isFinite(lightingState?.farTint)
    ? lightingState.farTint
    : 0xffffff;
  const caveWeight = lightingState?.caveCompositionEnabled
    ? resolveCaveCompositionWeight(centerTileY - config.regions[0].topTile)
    : 0;
  const surfaceInfluence = 1 - caveWeight * (1 - CAVE_VISUAL_COMPOSITION.surfaceLightRetention);
  const farTint = mixWorldVisualTint(sourceFarTint, 0xffffff, 1 - surfaceInfluence);
  if (!lightingState) return farTint;
  const region = suppliedRegion || config.regions.find(entry => (
    centerTileY >= entry.topTile
    && centerTileY < entry.bottomTileExclusive
  ));
  if (!region?.lighting) return farTint;
  const grade = region.lighting;
  const depthSpan = region.bottomTileExclusive - region.topTile;
  const depthRatio = clampWorldVisualTintAmount(
    (centerTileY - region.topTile) / depthSpan
  );
  const tintMix = grade.surfaceTintMix
    + (grade.deepTintMix - grade.surfaceTintMix) * depthRatio;
  const gradedTint = mixWorldVisualTint(farTint, grade.deepTint, tintMix);
  const lightningMix = lightingState.lightning * grade.lightningTintMix * surfaceInfluence;
  const litTint = lightningMix > 0
    ? mixWorldVisualTint(gradedTint, grade.lightningTint, lightningMix)
    : gradedTint;
  return applyCaveBackdropTone(litTint, caveWeight);
}

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

export function resolveWorldVisualShallowMaterialLightingEnabled(
  config = WORLD_VISUAL_DEPTH_BACKDROPS,
  search = globalThis.location?.search || ""
) {
  const feature = config.materialLighting;
  if (!feature) return false;
  const value = new URLSearchParams(search)
    .get(feature.queryParam)
    ?.trim()
    .toLowerCase();
  if (value && feature.disabledValues.includes(value)) return false;
  if (value && feature.enabledValues.includes(value)) return true;
  return feature.enabledByDefault === true;
}

export function resolveWorldVisualDepthBackdropVariantsEnabled(
  config = WORLD_VISUAL_DEPTH_BACKDROPS,
  search = globalThis.location?.search || ""
) {
  return !isDisabledQuery(config, search, config.variantsQueryParam);
}

export function resolveWorldVisualDepthBackdropExpansionEnabled(
  config = WORLD_VISUAL_DEPTH_BACKDROPS,
  search = globalThis.location?.search || ""
) {
  if (!resolveWorldVisualDepthBackdropVariantsEnabled(config, search)) return false;
  if (isDisabledQuery(config, search, config.expansion.queryParam)) return false;
  return config.expansion.enabledByDefault;
}

export function resolveWorldVisualDepthBackdropExpansionV5Enabled(
  config = WORLD_VISUAL_DEPTH_BACKDROPS,
  search = globalThis.location?.search || ""
) {
  if (!resolveWorldVisualDepthBackdropExpansionEnabled(config, search)) return false;
  const expansion = config.wholeWorldExpansion;
  if (!expansion) return false;
  if (isDisabledQuery(config, search, expansion.queryParam)) return false;
  return expansion.enabledByDefault;
}

export function resolveWorldVisualDepthBackdropBlendMask(
  config = WORLD_VISUAL_DEPTH_BACKDROPS,
  search = globalThis.location?.search || ""
) {
  const useV5 = resolveWorldVisualDepthBackdropExpansionV5Enabled(config, search);
  return useV5 && config.blend.wholeWorldMaskAtlas
    ? config.blend.wholeWorldMaskAtlas
    : config.blend.maskAtlas;
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
  let assets;
  if (resolveWorldVisualDepthBackdropVariantsEnabled(config, search)) {
    if (!resolveWorldVisualDepthBackdropExpansionEnabled(config, search)) {
      assets = region?.baseVariantBackwalls || region?.variantBackwalls || region?.backwalls || [];
    } else if (resolveWorldVisualDepthBackdropExpansionV5Enabled(config, search)) {
      assets = (
        region?.wholeWorldVariantBackwalls
        || region?.variantBackwalls
        || region?.backwalls
        || []
      );
    } else {
      assets = region?.variantBackwalls || region?.backwalls || [];
    }
  } else {
    assets = region?.legacyBackwalls || [];
  }
  return assets;
}

export function getWorldVisualDepthBackdropAllAssets(
  config = WORLD_VISUAL_DEPTH_BACKDROPS,
  search
) {
  return config.regions.flatMap(region => (
    resolveWorldVisualDepthBackdropRegionAssets(region, config, search)
  ));
}

export function getWorldVisualDepthBackdropFallbackAsset(
  config = WORLD_VISUAL_DEPTH_BACKDROPS,
  search
) {
  if (!resolveWorldVisualDepthBackdropsEnabled(config, search)) return null;
  const firstRegion = config.regions?.[0];
  return resolveWorldVisualDepthBackdropRegionAssets(
    firstRegion,
    config,
    search
  )[0] || null;
}

export function getWorldVisualDepthBackdropPreloadAssets(
  config = WORLD_VISUAL_DEPTH_BACKDROPS,
  search
) {
  const fallbackAsset = getWorldVisualDepthBackdropFallbackAsset(config, search);
  if (!fallbackAsset) return [];
  return config.blend?.enabled
    ? [fallbackAsset, resolveWorldVisualDepthBackdropBlendMask(config, search)]
    : [fallbackAsset];
}

export function resolveWorldVisualDepthBackdropRegions(
  topTile,
  bottomTileExclusive,
  config = WORLD_VISUAL_DEPTH_BACKDROPS,
  search
) {
  if (!resolveWorldVisualDepthBackdropsEnabled(config, search)) return [];
  if (bottomTileExclusive <= topTile) return [];
  const fieldEnabled = resolveLevelOneBiomeFieldEnabled(
    LEVEL_ONE_BIOME_FIELD,
    search
  );
  const fieldBackwallsByRegionId = fieldEnabled
    ? Object.freeze(Object.fromEntries(
      LEVEL_ONE_BIOME_FIELD.sourceRegionIds.map(regionId => {
        const sourceRegion = config.regions.find(entry => entry.id === regionId);
        return [
          regionId,
          sourceRegion
            ? resolveWorldVisualDepthBackdropRegionAssets(sourceRegion, config, search)
            : [],
        ];
      })
    ))
    : null;
  return config.regions.filter(entry => (
    entry.bottomTileExclusive > topTile
    && entry.topTile < bottomTileExclusive
    && resolveWorldVisualDepthBackdropRegionAssets(entry, config, search).length > 0
  )).map(entry => (
    fieldBackwallsByRegionId
    && doesLevelOneBiomeFieldAffectRegion(entry)
      ? Object.freeze({
        ...entry,
        biomeFieldBackwallsByRegionId: fieldBackwallsByRegionId,
      })
      : entry
  ));
}

export function isWorldVisualDepthBackdropRegionReady(region, assetExists, assets = region?.backwalls) {
  return Boolean(assets?.length) && assets.every(entry => assetExists(entry));
}

export function isWorldVisualDepthBackdropRegionRenderable(
  region,
  assetExists,
  assets = region?.backwalls,
  fallbackAsset = null
) {
  return Boolean(
    assets?.some(entry => assetExists(entry))
    || (fallbackAsset && assetExists(fallbackAsset))
  );
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
