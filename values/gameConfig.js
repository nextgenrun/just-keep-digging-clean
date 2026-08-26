import { V11_SKY_ISLAND_LAYOUT } from "./v11SkyIslandLayout.js";
import { WORLD_DEPTH_CONFIG } from "./worldDepthConfig.js";
import { STAR_RARITY_PROGRESSION_CONFIG } from "./starRarityProgression.js";
import { resolveDepthEconomyEnabled } from "./resourceEconomy.js";
import {
  GAMEPLAY_DEV_FLAGS,
  GAMEPLAY_FEATURE_IDS,
  isGameplayFeatureEnabled,
} from "./gameplayDevFlags.js";

// ==================== GAME CONFIG (SSOT) ====================
const TILE_SIZE = 94;
const WORLD_WIDTH_TILES = 280;
const WORLD_DEPTH_TILES = WORLD_DEPTH_CONFIG.worldDepthTiles;
const TOP_AIR_ROWS = WORLD_DEPTH_CONFIG.topAirRows;

// Development stays debug-enabled. The isolated production index sets this
// marker before loading any modules, so production builds cannot enable the
// E2E/debug harness through query parameters.
const DEBUG_MODE = globalThis.__DIG_GAME_PRODUCTION__ !== true
  && (
    isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.GOD_MODE)
    || isGameplayFeatureEnabled(GAMEPLAY_FEATURE_IDS.SCREEN_CAPTURE)
  );

export const GAME_CONFIG = Object.freeze({
  debugMode: DEBUG_MODE,
  demoMode: GAMEPLAY_DEV_FLAGS.demoMode,
  rendererQuality: Object.freeze({
    pixelArt: false,
    antialias: true,
    antialiasGL: true,
    roundPixels: false,
    powerPreference: "high-performance",
    // ScreenRecordSystem copies the live WebGL canvas into its portrait 2D
    // capture surface; preserving the drawing buffer keeps that readback
    // visible after the browser presents a frame.
    preserveDrawingBuffer: DEBUG_MODE,
    defaultDensityPreset: "ultra",
    densityPresets: Object.freeze({
      legacy: 1,
      balanced: 1,
      high: 1.5,
      ultra: 2,
    }),
    query: Object.freeze({
      qualityParam: "renderQuality",
      densityRollbackParam: "nativeDensity",
      rendererParam: "renderer",
      autoRendererValue: "auto",
      disabledValue: "0",
    }),
  }),
  // Feature flags. Disable with lootVisuals: false or featureFlags["loot-visuals"]: false.
  lootVisuals: true,
  featureFlags: Object.freeze({
    lootVisuals: true,
    "loot-visuals": true,
  }),
  resourceEconomyEnabled: resolveDepthEconomyEnabled(),
  // Viewport & World
  viewportWidth: 1280,
  viewportHeight: 720,
  tileSize: TILE_SIZE,
  worldWidthTiles: WORLD_WIDTH_TILES,
  worldDepthTiles: WORLD_DEPTH_TILES,
  worldWidthPx: WORLD_WIDTH_TILES * TILE_SIZE,
  worldDepthPx: WORLD_DEPTH_TILES * TILE_SIZE,
  topAirRows: TOP_AIR_ROWS,
  surfaceClearanceRowsBelow: WORLD_DEPTH_CONFIG.surfaceClearanceRowsBelow,
  levelTwoLeftTile: WORLD_DEPTH_CONFIG.levelTwoLeftTile,
  levelTwoRightTile: WORLD_DEPTH_CONFIG.levelTwoRightTile,

  // Physics
  gravityY: 1400,
  maxFallSpeedPxPerSec: 99500,
  maxMovementPerFrameRatio: 9.85,

  // World Generation
  seed: 133742,
  generationChunkTiles: 32,

  // Town anchor (used by NPCs/background/town layout).
  spawnTileX: 28,
  // Legacy spawn Y: the air tile directly above the town floor.
  spawnTileY: TOP_AIR_ROWS - 1,

  // Player spawn: leftmost playable town-floor tile.
  playerSpawnTileX: 4,
  playerSpawnTileY: TOP_AIR_ROWS - 1,

  // Death
  deathTileY: WORLD_DEPTH_TILES - 2,

  // Day/Night Cycle — 2 hours per full day (7200000ms)
  dayDurationMs: 7200000,
  starCount: 100,
  starTwinkleSpeed: 1000,
  nightStart: 0.75,
  nightEnd: 0.25,
  transitionDuration: 5000,

  // Sky Tiles
  skyTileProbability: STAR_RARITY_PROGRESSION_CONFIG.spawn.probability,
  skyTileDepth: Infinity,
  skyTileBonusMultiplier: 2,
  skyTileBonusAtNightOnly: false,

  skyTileRarities: STAR_RARITY_PROGRESSION_CONFIG.rarityTiers,


  // Star Pillar
  starPillarTileX: V11_SKY_ISLAND_LAYOUT.levels[0].pillarTileX,
  starPillarTileY: V11_SKY_ISLAND_LAYOUT.levels[0].pillarTileY,
  starPillarProximityTiles: 4,
  constellationAnchorTileX: 90,
  constellationAnchorTileY: 20,
  constellationSignWorldSizePx: 360,

  // Player config
  playerBodyWidthPx: 32,
  playerBodyHeightPx: 48,
  playerDisplaySizePx: 64,
  mineCooldownMs: 200,
  maxTileHp: 100,

  // Sky island
  skyIslandTileX: V11_SKY_ISLAND_LAYOUT.levels[0].leftTile,
  skyIslandTileY: V11_SKY_ISLAND_LAYOUT.levels[0].floorRow,
  skyIslandWidthTiles: V11_SKY_ISLAND_LAYOUT.levels[0].widthTiles,

  // HUD refresh
  hudRefreshIntervalMs: 1000,

  // Camera tuning
  cameraLerpX: 0.14,
  cameraLerpY: 0.18,
  cameraDeadzoneXFrac: 0.10,
  cameraDeadzoneYFrac: 0.18,
  defaultCameraZoom: 1.10,
  cameraLookAheadPx: 40,
  cameraLookAheadLerp: 0.06,
  cameraZoomByDepthBand: [
    { minDepth:    0, zoom: 1.10 },
    { minDepth:   10, zoom: 1.08 },
    { minDepth:   30, zoom: 1.05 },
    { minDepth:   60, zoom: 1.02 },
    { minDepth:  120, zoom: 1.00 },
    { minDepth:  300, zoom: 0.97 },
    { minDepth:  600, zoom: 0.94 },
    { minDepth: 1200, zoom: 0.92 },
  ],
  cameraZoomLerp: 0.04,
});
