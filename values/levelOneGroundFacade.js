import { GEM_POWER_BLOCK_TIERS } from "./specialBlocks.js";

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
    assetPath: "sprites/backgrounds/world-scenic-regions-v1/level1-ground-recognition-atlas-v7.png?v=imagegen-ground-veins-20260728e",
    columns: 8,
    frameSizePx: 94,
    frameCount: 78,
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
    copper: freezeMarker(0, 6, 1, 1),
    bronze: freezeMarker(6, 6, 1, 1),
    steel: freezeMarker(12, 6, 1, 1),
    iron: freezeMarker(18, 6, 1, 1),
    silver: freezeMarker(24, 6, 1, 1),
    gold: freezeMarker(30, 6, 1, 1),
    obsidian: freezeMarker(36, 6, 1, 1),
    emberOre: freezeMarker(42, 6, 1, 1),
    magmaCrystal: freezeMarker(48, 6, 1, 1),
    stone: freezeMarker(54, 6, 1, 1),
  }),
  specialMarkers: Object.freeze({
    teleport: freezeMarker(60, 1, 1, 1),
    gamble: freezeMarker(61, 1, 1, 1),
    gemPower: freezeMarker(62, 1, 1, 1),
    gemPowerTiers: Object.freeze(Object.fromEntries(
      GEM_POWER_BLOCK_TIERS.map(tier => [
        tier.id,
        freezeMarker(tier.recognitionFrame, 1, 1, 1),
      ])
    )),
    speed: freezeMarker(67, 1, 1, 1),
    xp: freezeMarker(68, 1, 1, 1),
    crit: freezeMarker(69, 1, 1, 1),
    berserk: freezeMarker(70, 1, 1, 1),
    combo: freezeMarker(71, 1, 1, 1),
    legend: freezeMarker(72, 1, 1, 1),
    chest: freezeMarker(75, 1, 0.78, 0.96),
    ancientRelic: freezeMarker(76, 1, 0.74, 0.94),
    glowCrystal: freezeMarker(77, 1, 0.82, 0.96),
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
