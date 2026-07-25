const freezeMarker = (frame, variants = 1, scale = 1, alpha = 1) => Object.freeze({
  frame,
  variants,
  scale,
  alpha,
});

export const LEVEL_ONE_GROUND_FACADE = Object.freeze({
  enabled: true,
  queryParam: "level1Facade",
  queryEnableValues: Object.freeze(["1", "on", "true"]),
  queryDisableValues: Object.freeze(["0", "off", "false"]),
  worldSpan: Object.freeze({ leftTileX: 0, widthTiles: 280 }),
  depthTiles: 10,
  sourceCellPx: 94,
  chunks: Object.freeze([
    Object.freeze({ assetPath: "sprites/backgrounds/world-scenic-regions-v1/level1-ground-facade-01-v2.webp?v=native94-20260715", startColumn: 0, columns: 32 }),
    Object.freeze({ assetPath: "sprites/backgrounds/world-scenic-regions-v1/level1-ground-facade-02-v2.webp?v=native94-20260715", startColumn: 32, columns: 32 }),
    Object.freeze({ assetPath: "sprites/backgrounds/world-scenic-regions-v1/level1-ground-facade-03-v2.webp?v=native94-20260715", startColumn: 64, columns: 32 }),
    Object.freeze({ assetPath: "sprites/backgrounds/world-scenic-regions-v1/level1-ground-facade-04-v2.webp?v=native94-20260715", startColumn: 96, columns: 32 }),
    Object.freeze({ assetPath: "sprites/backgrounds/world-scenic-regions-v1/level1-ground-facade-05-v2.webp?v=native94-20260715", startColumn: 128, columns: 32 }),
    Object.freeze({ assetPath: "sprites/backgrounds/world-scenic-regions-v1/level1-ground-facade-06-v2.webp?v=native94-20260715", startColumn: 160, columns: 32 }),
    Object.freeze({ assetPath: "sprites/backgrounds/world-scenic-regions-v1/level1-ground-facade-07-v2.webp?v=native94-20260715", startColumn: 192, columns: 32 }),
    Object.freeze({ assetPath: "sprites/backgrounds/world-scenic-regions-v1/level1-ground-facade-08-v2.webp?v=native94-20260715", startColumn: 224, columns: 32 }),
    Object.freeze({ assetPath: "sprites/backgrounds/world-scenic-regions-v1/level1-ground-facade-09-v2.webp?v=native94-20260715", startColumn: 256, columns: 24 }),
  ]),
  recognitionAtlas: Object.freeze({
    assetPath: "sprites/backgrounds/world-scenic-regions-v1/level1-ground-recognition-atlas-v2.png?v=native94-20260715",
    columns: 8,
    frameSizePx: 94,
    frameCount: 44,
  }),
  streaming: Object.freeze({
    preloadChunkIndex: 0,
    horizontalMarginChunks: 1,
    verticalMarginTiles: 2,
    playerSurfaceMarginTiles: 12,
  }),
  render: Object.freeze({
    facadeDepth: 2.25,
    recognitionDepth: 2.45,
    crackDepth: 2.55,
    tileOverlapPx: 0,
  }),
  damage: Object.freeze({
    // Never expose the legacy square tilemap during damage; scenic earth stays opaque.
    baseAlphaByStage: Object.freeze([1, 1, 1, 1, 1, 1]),
    recognitionAlphaByStage: Object.freeze([0, 0.78, 0.86, 0.92, 0.97, 1]),
    crackAlphaByStage: Object.freeze([0, 0.94, 0.84, 0.74, 0.62, 0]),
    crackTint: 0xcbb9a3,
  }),
  resourceMarkers: Object.freeze({
    copper: freezeMarker(0, 3, 0.92, 0.88),
    bronze: freezeMarker(3, 3, 0.92, 0.88),
    steel: freezeMarker(6, 3, 0.92, 0.86),
    iron: freezeMarker(9, 3, 0.92, 0.86),
    silver: freezeMarker(12, 3, 0.92, 0.88),
    gold: freezeMarker(15, 3, 0.94, 0.92),
    obsidian: freezeMarker(18, 3, 0.92, 0.86),
    emberOre: freezeMarker(21, 3, 0.94, 0.9),
    magmaCrystal: freezeMarker(24, 3, 0.94, 0.9),
    stone: freezeMarker(27, 3, 0.9, 0.48),
  }),
  specialMarkers: Object.freeze({
    teleport: freezeMarker(30, 1, 0.74, 0.92),
    gamble: freezeMarker(31, 1, 0.74, 0.92),
    gemPower: freezeMarker(32, 1, 0.74, 0.92),
    speed: freezeMarker(33, 1, 0.74, 0.92),
    xp: freezeMarker(34, 1, 0.74, 0.92),
    crit: freezeMarker(35, 1, 0.74, 0.92),
    berserk: freezeMarker(36, 1, 0.74, 0.92),
    combo: freezeMarker(37, 1, 0.74, 0.92),
    legend: freezeMarker(38, 1, 0.74, 0.92),
    geodeInterior: freezeMarker(39, 1, 0.8, 0.94),
    geodeWall: freezeMarker(40, 1, 0.78, 0.9),
    chest: freezeMarker(41, 1, 0.78, 0.96),
    ancientRelic: freezeMarker(42, 1, 0.74, 0.94),
    glowCrystal: freezeMarker(43, 1, 0.82, 0.96),
  }),
});

export function resolveLevelOneGroundFacadeEnabled(
  config = LEVEL_ONE_GROUND_FACADE,
  search = globalThis.location?.search || ""
) {
  const value = new URLSearchParams(search).get(config.queryParam)?.toLowerCase();
  if (value && config.queryDisableValues.includes(value)) return false;
  if (value && config.queryEnableValues.includes(value)) return true;
  return config.enabled;
}
