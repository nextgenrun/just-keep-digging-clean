// ==================== GAME CONFIG ====================
  const TILE_SIZE = 94;
  const WORLD_WIDTH_TILES = 120;
  const WORLD_DEPTH_TILES = 2000;
  const TOP_AIR_ROWS = 65;

  // Debug mode flag - set to false for production builds
  const DEBUG_MODE = false;

  export const GAME_CONFIG = Object.freeze({
    debugMode: DEBUG_MODE,
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
  
  // Spawn
  spawnTileX: 28,
  spawnTileY: 59,
  
  // Death
  deathTileY: WORLD_DEPTH_TILES - 2,
  
  // Day/Night Cycle
  dayDurationMs: 60000, // 60 seconds per full day
  starCount: 100, // Number of stars in the sky
  starTwinkleSpeed: 1000, // Twinkle animation speed (ms)
  nightStart: 0.75, // When night starts (0-1, where 0 = midnight)
  nightEnd: 0.25, // When night ends (0-1, where 0 = midnight)
  transitionDuration: 5000, // Day/night transition time (ms)
  
  // Sky Tiles
  skyTileProbability: 0.018, // 1.8% chance per tile (spread across full world)
  skyTileDepth: Infinity,   // Sky tiles spawn throughout the entire world
  skyTileBonusMultiplier: 2, // Fallback multiplier (overridden by rarity)
  skyTileBonusAtNightOnly: false, // Bonus always active or only at night
  skyTileRarities: [
    { name: 'common',    glowColor: 0x87CEEB, multiplier: 2,  label: '★',    minDepthTiles: 0    }, // Blue
    { name: 'rare',      glowColor: 0xCC44FF, multiplier: 3,  label: '★★',   minDepthTiles: 0    }, // Purple
    { name: 'legendary', glowColor: 0xFFD700, multiplier: 5,  label: '★★★',  minDepthTiles: 0    }, // Gold
    { name: 'ancient',   glowColor: 0xFF4422, multiplier: 8,  label: '✦',    minDepthTiles: 500  }, // Red
    { name: 'cosmic',    glowColor: 0x00FFEE, multiplier: 14, label: '✦✦',   minDepthTiles: 1000 }, // Cyan
    { name: 'void',      glowColor: 0x9900FF, multiplier: 25, label: '✦✦✦',  minDepthTiles: 1600 }, // Violet
  ],

  // Star Pillar — sky island center, row 34 (one row above island floor at row 35)
  starPillarTileX: 27,
  starPillarTileY: 34,
  starPillarProximityTiles: 4,
});
