export const START_ZONE_SCENIC_BACKGROUND = Object.freeze({
  enabled: true,
  queryParam: "townScenic",
  queryEnableValues: Object.freeze(["1", "on", "true"]),
  queryDisableValues: Object.freeze(["0", "off", "false"]),
  assetPath: "sprites/backgrounds/start-zone-scenic-v1/npc-town-scenic-composite-v2.webp",
  renderDepth: -4.75,
  cropFrameName: "npc-town-scenic-doorline-v3",
  sourceGroundFraction: 0.5675,
  surfaceMaxDepthTiles: 10,
  worldAnchor: Object.freeze({
    leftTileX: 0,
    widthTiles: 14,
  }),
  groundFacade: Object.freeze({
    enabled: true,
    assetPath: "sprites/backgrounds/world-scenic-regions-v1/town-ground-solid-facade-v1.webp",
    depthTiles: 8,
    coverageMode: "all-solid",
    renderDepth: 0.25,
    recognitionDepth: 0.45,
    crackDepth: 0.55,
    resourceRecognitionScale: 0.56,
    specialRecognitionScale: 0.68,
    recognitionAlpha: 0.94,
    updateIntervalMs: 33,
    tileOverlapPx: 0.6,
  }),
});

export function resolveStartZoneScenicBackgroundEnabled(
  config = START_ZONE_SCENIC_BACKGROUND,
  search = globalThis.location?.search || ""
) {
  const value = new URLSearchParams(search).get(config.queryParam)?.toLowerCase();
  if (value && config.queryDisableValues.includes(value)) return false;
  if (value && config.queryEnableValues.includes(value)) return true;
  return config.enabled;
}
