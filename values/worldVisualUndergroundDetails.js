const DISABLED_QUERY_VALUES = Object.freeze([
  "0", "false", "off", "disabled", "legacy",
]);
const TEXTURE_ROOT = (
  "sprites/backgrounds/world-visual-v2/depth/underground-foreground-textures-v6"
);
const PROP_ROOT = (
  "sprites/backgrounds/world-visual-v2/depth/underground-overlay-props-v6"
);

const atlasAsset = (biomeId, kind, root) => Object.freeze({
  key: `world-visual-underground-${kind}-v6-${biomeId}`,
  path: `${root}/${biomeId}-${kind}-atlas-v6.webp`,
  type: "image",
});

const region = (
  id,
  biomeId,
  topTile,
  bottomTileExclusive,
  seedOffset,
  orderIndex
) => Object.freeze({
  id,
  biomeId,
  leftTile: 0,
  rightTileExclusive: 280,
  topTile,
  bottomTileExclusive,
  seedOffset,
  orderIndex,
  textureAtlas: atlasAsset(biomeId, "foreground-textures", TEXTURE_ROOT),
  propAtlas: atlasAsset(biomeId, "overlay-props", PROP_ROOT),
});

const REGIONS = Object.freeze([
  region("surface-entry", "weathered-roots", 65, 160, 1103, 0),
  region("level1-blue", "blue-caverns", 160, 520, 2207, 1),
  region("level1-amber", "amber-depths", 520, 1040, 3301, 2),
  region("level1-silver", "silver-core", 1040, 1600, 4409, 3),
  region("level1-magma", "core-magma", 1600, 2065, 5501, 4),
  region("level2-slagworks", "slagworks", 2065, 2665, 6607, 5),
  region("level2-obsidian", "obsidian-catacombs", 2665, 3265, 7703, 6),
  region("level2-foundry", "pressure-foundry", 3265, 3865, 8803, 7),
  region("level2-blackglass", "blackglass-abyss", 3865, 4465, 9901, 8),
  region("level2-starfire", "starfire-rift", 4465, 5065, 11003, 9),
]);

export const WORLD_VISUAL_UNDERGROUND_DETAILS = Object.freeze({
  enabledByDefault: true,
  queryParam: "undergroundDetailLibrary",
  disabledValues: DISABLED_QUERY_VALUES,
  regions: REGIONS,
  atlas: Object.freeze({
    frameWidthPx: 320,
    frameHeightPx: 256,
    columns: 5,
    frameCount: 20,
    framePrefix: "world-visual-underground-detail-v6-",
  }),
  placement: Object.freeze({
    cellWidthTiles: 8,
    cellHeightTiles: 6,
    neighborCells: 1,
    jitterXTiles: 3.2,
    jitterYTiles: 2.3,
  }),
  textures: Object.freeze({
    enabledByDefault: true,
    queryParam: "undergroundForegroundTextures",
    disabledValues: DISABLED_QUERY_VALUES,
    chance: 0.72,
    minSourceScale: 0.82,
    maxSourceScale: 1,
    maxRotationRadians: 0.1,
  }),
  props: Object.freeze({
    enabledByDefault: true,
    queryParam: "undergroundOverlayProps",
    disabledValues: DISABLED_QUERY_VALUES,
    chance: 0.48,
    minSourceScale: 0.5,
    maxSourceScale: 0.82,
    largeFrameIndexes: Object.freeze([0, 1, 3, 6, 8]),
    largeMinSourceScale: 0.86,
    largeMaxSourceScale: 1,
    maxRotationRadians: 0.035,
  }),
  render: Object.freeze({
    textureDepth: 0.145,
    textureAlpha: 0.58,
    propDepth: 0.175,
    propAlpha: 0.9,
    depthJitter: 0.0005,
  }),
});

function isDisabled(config, search) {
  const value = new URLSearchParams(search)
    .get(config.queryParam)
    ?.trim()
    .toLowerCase();
  return Boolean(value && config.disabledValues.includes(value));
}

function isEnabled(config, search) {
  return config.enabledByDefault && !isDisabled(config, search);
}

export function resolveWorldVisualUndergroundDetailsEnabled(
  config = WORLD_VISUAL_UNDERGROUND_DETAILS,
  search = globalThis.location?.search || ""
) {
  return isEnabled(config, search);
}

export function resolveWorldVisualUndergroundDetailKinds(
  config = WORLD_VISUAL_UNDERGROUND_DETAILS,
  search = globalThis.location?.search || ""
) {
  const parentEnabled = resolveWorldVisualUndergroundDetailsEnabled(config, search);
  return Object.freeze({
    textures: parentEnabled && isEnabled(config.textures, search),
    props: parentEnabled && isEnabled(config.props, search),
  });
}

function resolveRegion(regionEntry, kinds) {
  const assets = [
    ...(kinds.textures ? [regionEntry.textureAtlas] : []),
    ...(kinds.props ? [regionEntry.propAtlas] : []),
  ];
  return Object.freeze({
    ...regionEntry,
    assets: Object.freeze(assets),
    kinds,
  });
}

export function resolveWorldVisualUndergroundDetailRegions(
  topTile,
  bottomTileExclusive,
  config = WORLD_VISUAL_UNDERGROUND_DETAILS,
  search = globalThis.location?.search || ""
) {
  const kinds = resolveWorldVisualUndergroundDetailKinds(config, search);
  if ((!kinds.textures && !kinds.props) || bottomTileExclusive <= topTile) return [];
  return config.regions
    .filter(entry => (
      entry.bottomTileExclusive > topTile
      && entry.topTile < bottomTileExclusive
    ))
    .map(entry => resolveRegion(entry, kinds));
}

export function getWorldVisualUndergroundDetailAssets(
  config = WORLD_VISUAL_UNDERGROUND_DETAILS,
  search = globalThis.location?.search || ""
) {
  const kinds = resolveWorldVisualUndergroundDetailKinds(config, search);
  return config.regions.flatMap(entry => [
    ...(kinds.textures ? [entry.textureAtlas] : []),
    ...(kinds.props ? [entry.propAtlas] : []),
  ]);
}
