// ==================== GAME CONFIG (SSOT) ====================
const TILE_SIZE = 94;
const WORLD_WIDTH_TILES = 280;
const WORLD_DEPTH_TILES = 2000;
const TOP_AIR_ROWS = 65;

// Debug mode flag - set to false for production builds
const DEBUG_MODE = true;

export const GAME_CONFIG = Object.freeze({
  debugMode: DEBUG_MODE,
  // Feature flags. Disable with lootVisuals: false or featureFlags["loot-visuals"]: false.
  lootVisuals: true,
  featureFlags: Object.freeze({
    lootVisuals: true,
    "loot-visuals": true,
  }),
  // Viewport & World
  viewportWidth: 1280,
  viewportHeight: 720,
  tileSize: TILE_SIZE,
  worldWidthTiles: WORLD_WIDTH_TILES,
  worldDepthTiles: WORLD_DEPTH_TILES,
  worldWidthPx: WORLD_WIDTH_TILES * TILE_SIZE,
  worldDepthPx: WORLD_DEPTH_TILES * TILE_SIZE,
  topAirRows: TOP_AIR_ROWS,

  // Physics
  gravityY: 1400,
  maxFallSpeedPxPerSec: 99500,
  maxMovementPerFrameRatio: 9.85,

  // World Generation
  seed: 133742,
  dirtRatio: 0.9845,
  stoneRatio: 0.010,
  copperRatio: 0.005,
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
  skyTileProbability: 0.018,
  skyTileDepth: Infinity,
  skyTileBonusMultiplier: 2,
  skyTileBonusAtNightOnly: false,
  skyTileRarities: [
    { name: 'common',    glowColor: 0x87CEEB, multiplier: 2,  label: '★',    minDepthTiles: 0    },
    { name: 'rare',      glowColor: 0xCC44FF, multiplier: 3,  label: '★★',   minDepthTiles: 0    },
    { name: 'legendary', glowColor: 0xFFD700, multiplier: 5,  label: '★★★',  minDepthTiles: 0    },
    { name: 'ancient',   glowColor: 0xFF4422, multiplier: 8,  label: '✦',    minDepthTiles: 500  },
    { name: 'cosmic',    glowColor: 0x00FFEE, multiplier: 14, label: '✦✦',   minDepthTiles: 1000 },
    { name: 'void',      glowColor: 0x9900FF, multiplier: 25, label: '✦✦✦',  minDepthTiles: 1600 },
  ],

  // Star Pillar
  starPillarTileX: 27,
  starPillarTileY: 34,
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
  skyIslandTileX: 23,
  skyIslandTileY: 35,
  skyIslandWidthTiles: 20,

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
