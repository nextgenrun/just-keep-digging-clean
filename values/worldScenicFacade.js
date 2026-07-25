const freezeBand = (id, material, topTile, bottomTileExclusive, tint = 0xffffff) => Object.freeze({
  id,
  material,
  topTile,
  bottomTileExclusive,
  tint,
});

export const WORLD_SCENIC_FACADE = Object.freeze({
  enabled: true,
  queryParam: "worldFacade",
  queryEnableValues: Object.freeze(["1", "on", "true"]),
  queryDisableValues: Object.freeze(["0", "off", "false"]),
  requiresMasterBackground: true,
  requiresDepthBackground: true,
  span: Object.freeze({
    leftTile: 0,
    rightTileExclusive: 280,
    topTile: 75,
    bottomTileExclusive: 5065,
  }),
  materials: Object.freeze({
    level1Shallow: "sprites/backgrounds/world-scenic-facade-v1/level1-shallow-blue-seamless.webp",
    level1Amber: "sprites/backgrounds/world-scenic-facade-v1/level1-amber-crystal-seamless.webp",
    level1Silver: "sprites/backgrounds/world-scenic-facade-v1/level1-silver-core-seamless.webp",
    level2Magma: "sprites/backgrounds/world-scenic-facade-v1/level2-current-magma-seamless.webp",
    level2Obsidian: "sprites/backgrounds/world-scenic-facade-v1/level2-obsidian-ember-seamless.webp",
    level2Foundry: "sprites/backgrounds/world-scenic-facade-v1/level2-foundry-heart-seamless.webp",
    level2Blackglass: "sprites/backgrounds/world-scenic-facade-v1/level2-future-blackglass-seamless.webp",
    level2Starfire: "sprites/backgrounds/world-scenic-facade-v1/level2-future-starfire-seamless.webp",
  }),
  bands: Object.freeze([
    freezeBand("level1-shallow", "level1Shallow", 75, 520),
    freezeBand("level1-amber", "level1Amber", 520, 1040),
    freezeBand("level1-silver", "level1Silver", 1040, 1600),
    freezeBand("level1-deep-magma", "level2Magma", 1600, 2065, 0xe7edf2),
    freezeBand("level2-magma", "level2Magma", 2065, 2665),
    freezeBand("level2-obsidian", "level2Obsidian", 2665, 3265),
    freezeBand("level2-foundry", "level2Foundry", 3265, 3865),
    freezeBand("level2-blackglass", "level2Blackglass", 3865, 4465),
    freezeBand("level2-starfire", "level2Starfire", 4465, 5065),
  ]),
  performance: Object.freeze({
    updateIntervalMs: 66,
    maskMarginTiles: 2,
    preloadMarginTilesY: 48,
    unloadMarginTilesY: 180,
    maxVisibleMarkers: 96,
    maxVisibleCracks: 48,
    reduceBelowFps: 46,
    disableBelowFps: 32,
    reducedStride: 2,
  }),
  render: Object.freeze({
    facadeDepth: 2.25,
    recognitionDepth: 2.45,
    crackDepth: 2.55,
    materialAlpha: 1,
    // One source pixel maps to one world pixel: 94 source pixels per gameplay
    // tile, matching the runtime benchmark instead of upscaling 47 px art.
    textureScale: 1,
    surfaceWeatherBottomTile: 120,
    rainCoolAmount: 0.08,
    nightCoolAmount: 0.1,
  }),
});

export function resolveWorldScenicFacadeEnabled(
  config = WORLD_SCENIC_FACADE,
  search = globalThis.location?.search || ""
) {
  const value = new URLSearchParams(search).get(config.queryParam)?.toLowerCase();
  if (value && config.queryDisableValues.includes(value)) return false;
  if (value && config.queryEnableValues.includes(value)) return true;
  return config.enabled;
}
