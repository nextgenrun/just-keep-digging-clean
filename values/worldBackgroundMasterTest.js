const LEGACY_BAND_HEIGHT_TILES = 250;
const LEGACY_BAND_STEP_TILES = 225;

const makeLegacyBand = (index, xTile, widthTiles) => Object.freeze({
  id: `level-1-band-${String(index + 1).padStart(2, "0")}`,
  textureKey: `world-master-level-1-band-${String(index + 1).padStart(2, "0")}`,
  path: `sprites/backgrounds/world-v11-test/level-1-band-${String(index + 1).padStart(2, "0")}-hires.png`,
  xTile,
  yTile: index * LEGACY_BAND_STEP_TILES,
  widthTiles,
  heightTiles: LEGACY_BAND_HEIGHT_TILES,
});

export const WORLD_BACKGROUND_MASTER_TEST = Object.freeze({
  // The exact saved v11 TMX manifest is now the sole master-background source.
  enabled: true,
  source: "v11-runtime-manifest",
  queryParam: "worldMaster",
  queryEnableValues: Object.freeze(["1", "on", "true"]),
  queryDisableValues: Object.freeze(["0", "off", "false"]),
  depthEnabled: true,
  depthQueryParam: "worldDepthMaster",
  universeSkyEnabled: true,
  universeSkyQueryParam: "universeSky",
  replacedSkyObjectPrefix: "sky-r",
  // The old v7 object library remains available only when the master is
  // explicitly rolled back. Rendering it with v11 would mix two world maps.
  suppressLegacyAuthoredObjectsWhenEnabled: true,
  runtimeCropFill: Object.freeze({
    enabled: true,
    color: 0x070a10,
    alpha: 1,
    depth: -20,
  }),
  fallbackRenderDepth: -6,
  fallbackObjectDepthStep: 0.00001,
  preloadMarginTilesX: 24,
  preloadMarginTilesY: 18,
  unloadMarginTilesX: 72,
  unloadMarginTilesY: 54,
  linearFiltering: true,
  surfaceArtAlignment: Object.freeze({
    enabled: true,
    groundPrefixes: Object.freeze(["level1-ground-", "level2-ground-"]),
    groundDownshiftTiles: 0,
    townPrefix: "town-ground-",
    townAlphaMultiplier: 0.86,
    townTint: 0xe4eaee,
  }),
  depthContinuation: Object.freeze({
    enabled: true,
    sourceLevel: "level2",
    sourceTopTile: 65,
    sourceBottomTileExclusive: 2065,
    targetLeftTile: 132,
    targetRightTileExclusive: 280,
    targetTopTile: 2065,
    targetBottomTileExclusive: 5065,
    tintByFacadeBand: Object.freeze({
      "level2-magma": 0xffeee4,
      "level2-obsidian": 0xe5e9ef,
      "level2-foundry": 0xffead7,
      "level2-blackglass": 0xdce5f1,
      "level2-starfire": 0xeee4ff,
    }),
  }),

  // Retained as rollback/reference data only. The runtime system never mixes
  // these prototype bands with the exact manifest, preventing double renders.
  legacyBands: Object.freeze([
    makeLegacyBand(0, 0, 159),
    ...Array.from({ length: 9 }, (_, offset) => makeLegacyBand(offset + 1, 41, 118)),
  ]),
});

export function resolveWorldBackgroundMasterEnabled(
  config = WORLD_BACKGROUND_MASTER_TEST,
  search = globalThis.location?.search || ""
) {
  const value = new URLSearchParams(search).get(config.queryParam)?.toLowerCase();
  if (value && config.queryDisableValues.includes(value)) return false;
  if (value && config.queryEnableValues.includes(value)) return true;
  return config.enabled;
}
