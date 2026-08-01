const DISABLED_QUERY_VALUES = Object.freeze([
  "0",
  "false",
  "off",
  "disabled",
  "legacy",
]);

const ENHANCER_ROOT = (
  "sprites/backgrounds/world-visual-v2/depth/biome-backdrop-enhancers-v7"
);

const enhancer = (
  stem,
  family,
  blendMode = "NORMAL",
  alpha = 0.66
) => Object.freeze({
  key: `world-visual-backdrop-enhancer-v7-${stem}`,
  path: `${ENHANCER_ROOT}/${stem}-v7.webp`,
  type: "image",
  family,
  blendMode,
  alpha,
});

const structure = (stem, family) => enhancer(stem, family, "NORMAL", 0.66);
const silhouette = (stem, family) => enhancer(stem, family, "NORMAL", 0.58);
const luminous = (stem, family) => enhancer(stem, family, "ADD", 0.42);

const region = (id, assets, coverage = 0.58) => Object.freeze({
  id,
  coverage,
  assets: Object.freeze(assets),
});

const ENHANCER_REGIONS = Object.freeze([
  region("surface-entry", [
    structure("weathered-roots-ceiling-root-crown", "ceiling-crown"),
    structure("weathered-roots-twin-rootstone-arches", "side-arches"),
    structure("weathered-roots-mycelial-lace-curtain", "hanging-network"),
    luminous("weathered-roots-amber-seed-orbit", "central-halo"),
    silhouette("weathered-roots-drowned-timber-silhouettes", "side-silhouette"),
    luminous("weathered-roots-rootwater-ribbons", "reflection-ribbons"),
    luminous("weathered-roots-spore-constellation", "constellation"),
    structure("weathered-roots-fossil-root-ribs", "diagonal-ribs"),
    luminous("weathered-roots-rain-thread-veils", "vertical-curtains"),
    structure("weathered-roots-ancient-knot-aperture", "depth-aperture"),
  ], 0.52),
  region("level1-blue", [
    structure("blue-caverns-ice-chandelier-crown", "ceiling-crown"),
    structure("blue-caverns-twin-cobalt-arches", "side-arches"),
    structure("blue-caverns-frozen-chain-web", "hanging-network"),
    luminous("blue-caverns-resonance-geode-halo", "central-halo"),
    silhouette("blue-caverns-drowned-observatory-silhouettes", "side-silhouette"),
    luminous("blue-caverns-caustic-ribbons", "reflection-ribbons"),
    luminous("blue-caverns-aurora-crystal-constellation", "constellation"),
    structure("blue-caverns-leviathan-rib-arcs", "diagonal-ribs"),
    luminous("blue-caverns-water-veil-curtains", "vertical-curtains"),
    structure("blue-caverns-inverted-ice-aperture", "depth-aperture"),
  ], 0.56),
  region("level1-amber", [
    structure("amber-depths-resin-stalactite-crown", "ceiling-crown"),
    structure("amber-depths-twin-fossil-wing-arches", "side-arches"),
    structure("amber-depths-honeyglass-chain-network", "hanging-network"),
    luminous("amber-depths-fossil-sun-halo", "central-halo"),
    silhouette("amber-depths-archive-tower-silhouettes", "side-silhouette"),
    luminous("amber-depths-resin-light-ribbons", "reflection-ribbons"),
    luminous("amber-depths-gilded-insect-constellation", "constellation"),
    structure("amber-depths-fossil-rib-fragments", "diagonal-ribs"),
    luminous("amber-depths-gold-dust-columns", "vertical-curtains"),
    structure("amber-depths-clockwork-iris-aperture", "depth-aperture"),
  ], 0.57),
  region("level1-silver", [
    structure("silver-core-needle-crystal-crown", "ceiling-crown"),
    structure("silver-core-mirror-organ-arches", "side-arches"),
    structure("silver-core-mercury-droplet-network", "hanging-network"),
    luminous("silver-core-eclipsed-reflector-halo", "central-halo"),
    silhouette("silver-core-mint-tower-silhouettes", "side-silhouette"),
    luminous("silver-core-mirror-ribbons", "reflection-ribbons"),
    luminous("silver-core-magnetic-spark-constellation", "constellation"),
    structure("silver-core-suspended-rib-fragments", "diagonal-ribs"),
    luminous("silver-core-shimmerfall-curtains", "vertical-curtains"),
    structure("silver-core-lunar-gear-aperture", "depth-aperture"),
  ], 0.58),
  region("level1-magma", [
    structure("core-magma-basalt-stalactite-crown", "ceiling-crown"),
    structure("core-magma-obsidian-furnace-arches", "side-arches"),
    structure("core-magma-lava-chain-network", "hanging-network"),
    luminous("core-magma-ember-eclipse-halo", "central-halo"),
    silhouette("core-magma-watchtower-silhouettes", "side-silhouette"),
    luminous("core-magma-heat-shimmer-ribbons", "reflection-ribbons"),
    luminous("core-magma-cinder-constellation", "constellation"),
    structure("core-magma-lava-wheel-fragments", "diagonal-ribs"),
    luminous("core-magma-ashfall-columns", "vertical-curtains"),
    structure("core-magma-basalt-sun-aperture", "depth-aperture"),
  ], 0.6),
  region("level2-slagworks", [
    structure("slagworks-pipe-gantry-crown", "ceiling-crown"),
    structure("slagworks-twin-crane-arches", "side-arches"),
    structure("slagworks-chain-hose-network", "hanging-network"),
    luminous("slagworks-pressure-gauge-halo", "central-halo"),
    silhouette("slagworks-smelter-skyline", "side-silhouette"),
    luminous("slagworks-molten-runoff-ribbons", "reflection-ribbons"),
    luminous("slagworks-iron-spark-constellation", "constellation"),
    structure("slagworks-broken-rail-fragments", "diagonal-ribs"),
    luminous("slagworks-steam-curtains", "vertical-curtains"),
    structure("slagworks-rotary-drum-aperture", "depth-aperture"),
  ], 0.6),
  region("level2-obsidian", [
    structure("obsidian-catacombs-shard-crown", "ceiling-crown"),
    structure("obsidian-catacombs-blackglass-arches", "side-arches"),
    structure("obsidian-catacombs-reliquary-chain-network", "hanging-network"),
    luminous("obsidian-catacombs-violet-eclipse-halo", "central-halo"),
    silhouette("obsidian-catacombs-crypt-silhouettes", "side-silhouette"),
    luminous("obsidian-catacombs-mirror-violet-ribbons", "reflection-ribbons"),
    luminous("obsidian-catacombs-ash-constellation", "constellation"),
    structure("obsidian-catacombs-broken-glass-ribs", "diagonal-ribs"),
    luminous("obsidian-catacombs-violet-ash-curtains", "vertical-curtains"),
    structure("obsidian-catacombs-memory-iris-aperture", "depth-aperture"),
  ], 0.61),
  region("level2-foundry", [
    structure("pressure-foundry-boiler-pipe-crown", "ceiling-crown"),
    structure("pressure-foundry-piston-arches", "side-arches"),
    structure("pressure-foundry-hose-cable-network", "hanging-network"),
    luminous("pressure-foundry-turbine-halo", "central-halo"),
    silhouette("pressure-foundry-condenser-skyline", "side-silhouette"),
    luminous("pressure-foundry-coolant-ribbons", "reflection-ribbons"),
    luminous("pressure-foundry-indicator-constellation", "constellation"),
    structure("pressure-foundry-riveted-truss-fragments", "diagonal-ribs"),
    luminous("pressure-foundry-condensate-curtains", "vertical-curtains"),
    structure("pressure-foundry-valve-iris-aperture", "depth-aperture"),
  ], 0.61),
  region("level2-blackglass", [
    structure("blackglass-abyss-prismatic-crown", "ceiling-crown"),
    structure("blackglass-abyss-eclipse-arches", "side-arches"),
    structure("blackglass-abyss-star-chain-network", "hanging-network"),
    luminous("blackglass-abyss-fractured-planet-halo", "central-halo"),
    silhouette("blackglass-abyss-mirror-city-silhouettes", "side-silhouette"),
    luminous("blackglass-abyss-spectral-ribbons", "reflection-ribbons"),
    luminous("blackglass-abyss-star-map-constellation", "constellation"),
    structure("blackglass-abyss-prism-bridge-fragments", "diagonal-ribs"),
    luminous("blackglass-abyss-stardust-curtains", "vertical-curtains"),
    structure("blackglass-abyss-infinite-mirror-aperture", "depth-aperture"),
  ], 0.62),
  region("level2-starfire", [
    structure("starfire-rift-nebula-crystal-crown", "ceiling-crown"),
    structure("starfire-rift-orbital-ring-arches", "side-arches"),
    structure("starfire-rift-celestial-chain-network", "hanging-network"),
    luminous("starfire-rift-binary-star-halo", "central-halo"),
    silhouette("starfire-rift-celestial-silhouettes", "side-silhouette"),
    luminous("starfire-rift-aurora-current-ribbons", "reflection-ribbons"),
    luminous("starfire-rift-comet-constellation", "constellation"),
    structure("starfire-rift-star-metal-bridge-fragments", "diagonal-ribs"),
    luminous("starfire-rift-nebula-waterfall-curtains", "vertical-curtains"),
    structure("starfire-rift-cosmic-iris-aperture", "depth-aperture"),
  ], 0.64),
]);

export const WORLD_VISUAL_BACKDROP_ENHANCERS = Object.freeze({
  enabledByDefault: true,
  queryParam: "undergroundBackdropEnhancers",
  compatibilityQueryParam: "biomeBackdropEnhancers",
  disabledValues: DISABLED_QUERY_VALUES,
  regions: ENHANCER_REGIONS,
  source: Object.freeze({
    widthPx: 1536,
    heightPx: 1024,
    clearEdgePx: 72,
    alphaFeatherPx: 192,
  }),
  selection: Object.freeze({
    defaultCoverage: 0.58,
    hashDivisor: 0x100000000,
    coordinateOffset: 1,
    xPrime: 0x9e3779b1,
    yPrime: 0x85ebca77,
    regionPrime: 0xc2b2ae3d,
    gateSalt: 0x27d4eb2f,
    assetSalt: 0x165667b1,
    alphaSalt: 0xd3a2646c,
    alphaJitter: 0.06,
    compatibilityRules: Object.freeze([
      Object.freeze({
        keywords: Object.freeze(["quiet", "pocket", "hollow", "gallery", "overlook"]),
        families: Object.freeze([
          "constellation",
          "hanging-network",
          "central-halo",
          "depth-aperture",
          "reflection-ribbons",
        ]),
      }),
      Object.freeze({
        keywords: Object.freeze([
          "river", "water", "falls", "rain", "veil", "shimmer", "dust",
          "ash", "steam", "condensate", "delta", "tide", "current",
          "drift", "storm",
        ]),
        families: Object.freeze([
          "reflection-ribbons",
          "vertical-curtains",
          "constellation",
          "hanging-network",
          "ceiling-crown",
        ]),
      }),
      Object.freeze({
        keywords: Object.freeze([
          "cathedral", "basilica", "sanctum", "reliquary", "throne",
          "rotunda", "archive", "planetarium", "well", "crown", "engine",
          "array", "organ", "temple",
        ]),
        families: Object.freeze([
          "central-halo",
          "depth-aperture",
          "hanging-network",
          "constellation",
          "side-arches",
        ]),
      }),
      Object.freeze({
        keywords: Object.freeze([
          "city", "citadel", "tower", "observatory", "yard",
          "rail", "mint", "crypt", "necropolis", "viaduct",
          "barracks", "library",
        ]),
        families: Object.freeze([
          "side-silhouette",
          "side-arches",
          "hanging-network",
          "vertical-curtains",
          "ceiling-crown",
        ]),
      }),
      Object.freeze({
        keywords: Object.freeze([
          "ravine", "canyon", "gorge", "escarpment", "fault", "trench",
          "bridge", "crossing", "switchback", "terrace", "horizon", "slope",
        ]),
        families: Object.freeze([
          "ceiling-crown",
          "side-arches",
          "diagonal-ribs",
          "vertical-curtains",
          "reflection-ribbons",
        ]),
      }),
    ]),
  }),
  streaming: Object.freeze({
    neighborSegments: 1,
  }),
  render: Object.freeze({
    depthOffset: 0.006,
    tintMix: 0.28,
    minAlpha: 0.28,
    maxAlpha: 0.74,
  }),
});

function hashUint32(value) {
  let mixed = value >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x7feb352d);
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0x846ca68b);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function hashString(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193);
  }
  return hash >>> 0;
}

export function resolveWorldVisualBackdropEnhancersEnabled(
  config = WORLD_VISUAL_BACKDROP_ENHANCERS,
  search = globalThis.location?.search || ""
) {
  const params = new URLSearchParams(search);
  const disabled = queryParam => {
    const value = params.get(queryParam)?.trim().toLowerCase();
    return Boolean(value && config.disabledValues.includes(value));
  };
  if (disabled(config.queryParam)) return false;
  if (disabled(config.compatibilityQueryParam)) return false;
  return config.enabledByDefault;
}

export function getWorldVisualBackdropEnhancerRegion(
  regionId,
  config = WORLD_VISUAL_BACKDROP_ENHANCERS
) {
  return config.regions.find(regionEntry => regionEntry.id === regionId) || null;
}

export function getWorldVisualBackdropEnhancerAssets(
  config = WORLD_VISUAL_BACKDROP_ENHANCERS
) {
  return config.regions.flatMap(regionEntry => regionEntry.assets);
}

export function resolveWorldVisualBackdropEnhancerSelection(
  regionId,
  column,
  row,
  config = WORLD_VISUAL_BACKDROP_ENHANCERS,
  backdropAsset = null
) {
  const regionEntry = getWorldVisualBackdropEnhancerRegion(regionId, config);
  if (!regionEntry?.assets?.length) return null;
  const regionIndex = Math.max(0, config.regions.indexOf(regionEntry));
  const selection = config.selection;
  const offset = selection.coordinateOffset;
  const coordinateSeed = (
    Math.imul((column + offset) | 0, selection.xPrime)
    ^ Math.imul((row + offset) | 0, selection.yPrime)
    ^ Math.imul((regionIndex + offset) | 0, selection.regionPrime)
  ) >>> 0;
  const gate = hashUint32(coordinateSeed ^ selection.gateSalt)
    / selection.hashDivisor;
  const coverage = Number.isFinite(regionEntry.coverage)
    ? regionEntry.coverage
    : selection.defaultCoverage;
  if (gate >= coverage) return null;

  const backdropPath = String(backdropAsset?.path || "").toLowerCase();
  const compatibilityRule = backdropPath
    ? selection.compatibilityRules.find(rule => (
      rule.keywords.some(keyword => backdropPath.includes(keyword))
    ))
    : null;
  const compatibleAssets = compatibilityRule
    ? regionEntry.assets.filter(assetEntry => (
      compatibilityRule.families.includes(assetEntry.family)
    ))
    : regionEntry.assets;
  const assetPool = compatibleAssets.length > 0
    ? compatibleAssets
    : regionEntry.assets;
  const backdropHash = backdropPath ? hashString(backdropPath) : 0;
  const assetHash = hashUint32(
    coordinateSeed ^ selection.assetSalt ^ backdropHash
  );
  const asset = assetPool[assetHash % assetPool.length];
  const alphaUnit = hashUint32(coordinateSeed ^ selection.alphaSalt)
    / selection.hashDivisor;
  const jitter = (alphaUnit * 2 - 1) * selection.alphaJitter;
  return Object.freeze({
    asset,
    matchedBackdropPath: backdropPath || null,
    compatibilityFamilies: compatibilityRule?.families || null,
    alpha: clamp(
      asset.alpha + jitter,
      config.render.minAlpha,
      config.render.maxAlpha
    ),
  });
}

