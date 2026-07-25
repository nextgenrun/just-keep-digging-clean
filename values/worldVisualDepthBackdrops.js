const DISABLED_QUERY_VALUES = Object.freeze(["0", "false", "off", "disabled", "legacy"]);

const asset = (key, path) => Object.freeze({ key, path });
const region = (id, topTile, bottomTileExclusive, backwallAssets, lighting, mist, emissive) => {
  const backwalls = Object.freeze(Array.isArray(backwallAssets) ? backwallAssets : [backwallAssets]);
  return Object.freeze({
    id,
    leftTile: 0,
    rightTileExclusive: 280,
    topTile,
    bottomTileExclusive,
    backwall: backwalls[0],
    backwalls,
    lighting: Object.freeze(lighting),
    mist: Object.freeze(mist),
    emissive: Object.freeze(emissive),
  });
};

const SURFACE_BACKWALL = asset(
  "world-visual-v2-shallow-cavern-backwall",
  "sprites/backgrounds/world-visual-v2/depth/shallow-cavern-backwall-v1.png"
);

const SHARED_MIST = asset(
  "bg-sky-v3-clouds-near",
  "sprites/backgrounds/background-database/sky-background-v3/sky-v3-clouds-near.webp"
);

const LEVEL_ONE_REGIONS = Object.freeze([
  region(
    "surface-entry", 65, 160, SURFACE_BACKWALL,
    { deepTint: 0x34465b, lightningTint: 0xffffff, surfaceTintMix: 0.18, deepTintMix: 0.62, lightningTintMix: 0.22 },
    { baseAlpha: 0.012, wetAlpha: 0.032, fogAlpha: 0.055, lightningAlpha: 0.018, maxAlpha: 0.09, tint: 0x8ebfe5 },
    { tint: 0x76bfff, baseAlpha: 0.012, pulseAlpha: 0.008, lightningAlpha: 0.035, maxAlpha: 0.07, periodMs: 12800, phaseStep: 0.71, blendMode: "SCREEN" }
  ),
  region(
    "level1-blue", 160, 520,
    [
      asset("world-visual-v2-level1-blue-backwall-a", "sprites/backgrounds/world-visual-v2/depth/level1-blue-backwall-a-v1.png"),
      asset("world-visual-v2-level1-blue-backwall-b", "sprites/backgrounds/world-visual-v2/depth/level1-blue-backwall-b-v1.png"),
    ],
    { deepTint: 0x243c58, lightningTint: 0xffffff, surfaceTintMix: 0.42, deepTintMix: 0.72, lightningTintMix: 0.24 },
    { baseAlpha: 0.014, wetAlpha: 0.036, fogAlpha: 0.052, lightningAlpha: 0.018, maxAlpha: 0.095, tint: 0x79acd7 },
    { tint: 0x72bcff, baseAlpha: 0.014, pulseAlpha: 0.009, lightningAlpha: 0.04, maxAlpha: 0.08, periodMs: 11600, phaseStep: 0.83, blendMode: "SCREEN" }
  ),
  region(
    "level1-amber", 520, 1040,
    asset("world-visual-v2-level1-amber-backwall", "sprites/backgrounds/world-visual-v2/depth/level1-amber-backwall-v1.png"),
    { deepTint: 0x46382d, lightningTint: 0xffffff, surfaceTintMix: 0.56, deepTintMix: 0.78, lightningTintMix: 0.2 },
    { baseAlpha: 0.011, wetAlpha: 0.026, fogAlpha: 0.046, lightningAlpha: 0.015, maxAlpha: 0.082, tint: 0xc79b72 },
    { tint: 0xffbc63, baseAlpha: 0.016, pulseAlpha: 0.01, lightningAlpha: 0.036, maxAlpha: 0.085, periodMs: 9800, phaseStep: 0.91, blendMode: "SCREEN" }
  ),
  region(
    "level1-silver", 1040, 1600,
    asset("world-visual-v2-level1-silver-backwall", "sprites/backgrounds/world-visual-v2/depth/level1-silver-backwall-v1.png"),
    { deepTint: 0x344552, lightningTint: 0xffffff, surfaceTintMix: 0.62, deepTintMix: 0.82, lightningTintMix: 0.25 },
    { baseAlpha: 0.013, wetAlpha: 0.024, fogAlpha: 0.05, lightningAlpha: 0.02, maxAlpha: 0.086, tint: 0xb9d3df },
    { tint: 0xd4efff, baseAlpha: 0.012, pulseAlpha: 0.008, lightningAlpha: 0.042, maxAlpha: 0.078, periodMs: 13200, phaseStep: 1.03, blendMode: "SCREEN" }
  ),
  region(
    "level1-magma", 1600, 2065,
    asset("world-visual-v2-level1-magma-backwall", "sprites/backgrounds/world-visual-v2/depth/level1-magma-backwall-v1.png"),
    { deepTint: 0x4c2b23, lightningTint: 0xffffff, surfaceTintMix: 0.68, deepTintMix: 0.86, lightningTintMix: 0.16 },
    { baseAlpha: 0.008, wetAlpha: 0.014, fogAlpha: 0.035, lightningAlpha: 0.012, maxAlpha: 0.062, tint: 0xb46f54 },
    { tint: 0xff6134, baseAlpha: 0.023, pulseAlpha: 0.014, lightningAlpha: 0.025, maxAlpha: 0.11, periodMs: 8200, phaseStep: 1.17, blendMode: "SCREEN" }
  ),
]);

export const WORLD_VISUAL_DEPTH_BACKDROPS = Object.freeze({
  enabledByDefault: true,
  queryParam: "levelOneBackdrops",
  compatibilityQueryParam: "shallowCavern",
  disabledValues: DISABLED_QUERY_VALUES,
  regions: LEVEL_ONE_REGIONS,
  // Compatibility aliases for the original row 65..159 contract.
  region: LEVEL_ONE_REGIONS[0],
  assets: Object.freeze({ backwall: SURFACE_BACKWALL, mist: SHARED_MIST }),
  segment: Object.freeze({
    // The authored plates are 1536x1024. Keep that exact logical footprint so
    // the renderer never enlarges a decoded cave plate before native-density
    // output scaling. The view derives the fractional tile span at runtime.
    logicalWidthPx: 1536,
    logicalHeightPx: 1024,
    neighborSegments: 1,
    overlapPx: 2,
  }),
  render: Object.freeze({
    backwallDepth: -6.4,
    emissiveDepth: -6.1,
    mistDepth: -5.8,
  }),
  motion: Object.freeze({
    driftTiles: 0.18,
    verticalDriftTiles: 0.035,
    periodMs: 37000,
    phaseStep: 0.83,
    rowPhaseMultiplier: 3,
    secondaryPeriodScale: 0.73,
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

export function getWorldVisualDepthBackdropPreloadAssets(
  config = WORLD_VISUAL_DEPTH_BACKDROPS,
  search
) {
  if (!resolveWorldVisualDepthBackdropsEnabled(config, search)) return [];
  return [config.regions[0].backwall, config.assets.mist];
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
    entry.bottomTileExclusive > topTile && entry.topTile < bottomTileExclusive
  ));
}

export function isWorldVisualDepthBackdropRegionReady(region, textureExists) {
  return Boolean(region?.backwalls?.length)
    && region.backwalls.every(entry => textureExists(entry.key));
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
