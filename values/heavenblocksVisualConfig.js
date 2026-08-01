const ART_WIDTH_PX = 1672;
const ART_HEIGHT_PX = 941;
const DISPLAY_WIDTH_PX = 1920;
const DISPLAY_HEIGHT_PX = 1080;

function freezeLayer(key, path, depth, alpha = 1, overscan = 1) {
  return Object.freeze({
    key,
    path,
    depth,
    alpha,
    overscan,
  });
}

function freezeRegion({
  id,
  label,
  leftTile,
  topTile,
  backdropKey,
  backdropPath,
  facadeKey,
  facadePath,
}) {
  return Object.freeze({
    id,
    label,
    leftTile,
    topTile,
    sourceWidthPx: ART_WIDTH_PX,
    sourceHeightPx: ART_HEIGHT_PX,
    displayWidthPx: DISPLAY_WIDTH_PX,
    displayHeightPx: DISPLAY_HEIGHT_PX,
    layers: Object.freeze([
      freezeLayer(backdropKey, backdropPath, -9.8, 1, 1.12),
      freezeLayer(facadeKey, facadePath, -0.55),
    ]),
  });
}

export const HEAVENBLOCKS_VISUAL_CONFIG = Object.freeze({
  enabled: true,
  queryParam: "heavenblocksVisuals",
  tileSize: 94,
  maxSourceScale: 1,
  visualOnly: false,
  collisionWired: true,
  accessWired: true,
  craftingWired: true,
  reservedLane: Object.freeze({
    leftTile: 218,
    rightTileExclusive: 243,
    topTile: 0,
    bottomTileExclusive: 65,
  }),
  regions: Object.freeze([
    freezeRegion({
      id: "devil-eclipse-scar",
      label: "Devil Eclipse Scar",
      leftTile: 220,
      topTile: 11,
      backdropKey: "heavenblocks-devil-eclipse-backdrop-v1",
      backdropPath: "sprites/backgrounds/heavenblocks-v1/devil-eclipse-backdrop-v1.png",
      facadeKey: "heavenblocks-devil-eclipse-facade-v1",
      facadePath: "sprites/backgrounds/heavenblocks-v1/devil-eclipse-facade-v1.png",
    }),
    freezeRegion({
      id: "angel-heavenblock",
      label: "Angel Heavenblock",
      leftTile: 220,
      topTile: 29,
      backdropKey: "heavenblocks-angel-backdrop-v1",
      backdropPath: "sprites/backgrounds/heavenblocks-v1/angel-heavenblock-backdrop-v1.png",
      facadeKey: "heavenblocks-angel-facade-v1",
      facadePath: "sprites/backgrounds/heavenblocks-v1/angel-heavenblock-facade-v1.png",
    }),
    freezeRegion({
      id: "lower-sky-cloud-reef",
      label: "Lower Sky Cloud Reef",
      leftTile: 220,
      topTile: 47,
      backdropKey: "heavenblocks-lower-sky-backdrop-v1",
      backdropPath: "sprites/backgrounds/heavenblocks-v1/lower-sky-backdrop-v1.png",
      facadeKey: "heavenblocks-lower-sky-facade-v1",
      facadePath: "sprites/backgrounds/heavenblocks-v1/lower-sky-facade-v1.png",
    }),
  ]),
});

export function resolveHeavenblocksVisualsEnabled(
  config = HEAVENBLOCKS_VISUAL_CONFIG,
  search = globalThis.location?.search || ""
) {
  const rawValue = new URLSearchParams(search).get(config.queryParam);
  if (rawValue === null) return config.enabled;

  const value = rawValue.trim().toLowerCase();
  if (["0", "false", "off", "no"].includes(value)) return false;
  if (["1", "true", "on", "yes"].includes(value)) return true;
  return config.enabled;
}
