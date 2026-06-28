/**
 * Shadow Miner Configuration
 * Controls spawn rates, behaviors, and progression by depth
 */

  export const SHADOW_MINER_CONFIG = Object.freeze({
  // Enable/disable entire Shadow Miner system
  enabled: true,
  
  // Minimum depth before Shadow Miner can appear (in tiles)
  minDepth: 50,
  
  // Spawn chance per update cycle (0.0 to 1.0)
  // Base spawn chance: 5% chance every 2 minutes
  spawnChanceBase: 0.05,
  
  // DEBUG/GODMODE: Much faster spawns for testing
  // If debug mode is enabled, spawn every 10 seconds with 80% chance
  debugSpawnCheckInterval: 10000, // 10 seconds in debug mode
  debugSpawnChance: 0.80, // 80% chance in debug mode
  debugMinDepth: 5, // Can spawn at depth 5 in debug mode for quick testing
  
  // How often to check for spawn (in milliseconds)
  spawnCheckInterval: 120000, // 2 minutes in production
  
  // How long Shadow Miner stays visible when spawned (in milliseconds)
  visibleDurationBase: 15000, // 15 seconds (linger longer)
  visibleDurationMax: 30000, // Max 30 seconds (sometimes stays a long time)
  
  // Cooldown between interactions (in milliseconds)
  interactionCooldown: 30000, // 30 seconds
  
  // Distance to spawn from player (in tiles)
  spawnDistanceMin: 10, // Minimum 10 tiles away
  spawnDistanceMax: 20, // Maximum 20 tiles away
  
  // Behavior probabilities (sum should be <= 1.0)
  behaviorProbabilities: {
    watch: 0.30,        // 30% chance: Just watch player
    dig: 0.50,          // 50% chance: Dig some blocks and leave
    tease: 0.20,        // 20% chance: Watch briefly then leave without digging (unpredictable!)
    steal: 0.00,        // DISABLED: Steal resources and flee
  },
  
  // Resource theft configuration (DISABLED for now)
  theft: {
    enabled: false,     // DISABLED - theft not implemented yet
    amountMin: 1,       // Minimum amount to steal
    amountMax: 3,       // Maximum amount to steal
    priority: ['gold', 'silver', 'bronze', 'iron', 'copper'],
  },
  
  // Digging behavior configuration
  dig: {
    enabled: true,
    blocksMin: 3,       // Minimum blocks to dig (at least 3)
    blocksMax: 10,      // Maximum blocks to dig (sometimes digs a lot!)
    digIntervalMin: 300,   // Min time between digs (milliseconds)
    digIntervalMax: 800,   // Max time between digs (milliseconds) - varies for natural feel
    pauseChance: 0.3,      // 30% chance to pause between digs (makes it feel more natural)
    pauseDurationMin: 500, // Min pause duration
    pauseDurationMax: 1500, // Max pause duration
  },
  
  // Visual settings
  visual: {
    alpha: 0.7,         // Transparency (0.0 to 1.0)
    scale: 0.95,        // Scale to match player (playerDisplaySizePx = 89px = 95% of 94px tile)
    spriteOrigin: { x: 0.5, y: 1.0 }, // Bottom-center origin like player
    fadeInDuration: 500,    // Fade in time (ms)
    fadeOutDuration: 500,   // Fade out time (ms)
  },
  
  // Physics settings (2x stronger than player)
  physics: {
    bodyWidthPx: 70,         // Same as player body width
    bodyHeightPx: 75,        // Same as player body height
    walkSpeedPxPerSec: 400,  // 2x player speed (200 * 2) for menacing effect
    gravity: 1400,           // Same as player
    maxFallSpeed: 99500,     // Same as player
  },
  
  // Movement settings (2x stronger than player)
  movement: {
    movementSpeed: 400,      // 2x player speed when moving toward player or to dig targets
    digMoveDelay: 100,       // 2x faster delay before moving to next dig target (200 / 2)
    moveToDigSpeed: 200,     // 2x faster speed when moving to a tile to dig it (100 * 2)
  },
  
  // Spawn visibility settings
  spawnVisibility: {
    minVisibleTiles: 8,      // Minimum tiles away to spawn (must be visible)
    maxVisibleTiles: 15,     // Maximum tiles away to spawn (must be visible)
    requireLineOfSight: true, // Must have line of sight to player
    maxSpawnAttempts: 20,    // Maximum attempts to find visible spawn position
  },
  
  // Debug settings
  debug: {
    enabled: true,      // Enable debug logging (set true for F12 testing)
    logHealth: true,    // Log health constantly
    logInterval: 1000,  // Health log interval (ms)
    verbose: true,      // Verbose logging
  },
  
  // Depth-based progression
  // Aggression increases as player goes deeper, and stays longer
  depthProgression: [
    { depth: 50,  aggression: 0.1,  spawnChance: 0.05, visibleDurationMin: 10000, visibleDurationMax: 20000 },
    { depth: 200, aggression: 0.3,  spawnChance: 0.10, visibleDurationMin: 12000, visibleDurationMax: 25000 },
    { depth: 500, aggression: 0.5,  spawnChance: 0.15, visibleDurationMin: 15000, visibleDurationMax: 30000 },
    { depth: 1000, aggression: 0.7, spawnChance: 0.25, visibleDurationMin: 18000, visibleDurationMax: 35000 },
    { depth: 1500, aggression: 0.9, spawnChance: 0.40, visibleDurationMin: 20000, visibleDurationMax: 40000 },
    { depth: 2000, aggression: 1.0, spawnChance: 0.60, visibleDurationMin: 25000, visibleDurationMax: 45000 },
  ],
});

/**
 * Get progression settings for a given depth
 * @param {number} depth - Current depth in tiles
 * @returns {Object} Progression settings for this depth
 */
export function getProgressionForDepth(depth) {
  // Find the highest threshold that's <= depth
  let settings = SHADOW_MINER_CONFIG.depthProgression[0];
  
  for (const progression of SHADOW_MINER_CONFIG.depthProgression) {
    if (depth >= progression.depth) {
      settings = progression;
    }
  }
  
  return settings;
}