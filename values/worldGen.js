// ==================== WORLD GENERATION CONFIG ====================
export const WORLD_GEN_CONFIG = Object.freeze({
  // Terrain composition ratios (must sum to 1.0)
  dirtRatio: 0.9845,
  stoneRatio: 0.010,
  copperRatio: 0.005,

  // Cave generation
  caves: {
    totalCavesMin: 90,
    totalCavesMax: 140,
    // Cave dimensions — height is ALWAYS 1-3 tiles (no huge caves).
    // Width varies wildly to create dynamic, natural-feeling chambers:
    // narrow crawlspaces, wide halls, multi-chamber pockets.
    radiusXMin: 2,       // 2 tiles wide (tiny pocket)
    radiusXMax: 40,      // 40 tiles wide (massive hall, still 1-3 high)
    radiusYMin: 1,       // 1 tile high (tight crawlspace)
    radiusYMax: 3,       // 3 tiles high (max — never taller)
    // Unbreakable cave wall shell thickness
    wallThickness: 1,    // 1 tile thick shell of CAVE_WALL
    // Entrances — number of gaps in the wall
    entranceMin: 1,
    entranceMax: 2,
    // Depth restrictions — start spawning at 30m
    surfaceSkipDepth: 30,
    // Special block multiplier inside caves (was 3x normal, now 5x)
    specialBlockMultiplier: 5,
    // Teleport tile chance inside caves (exits are through entrance gaps)
    teleportTileChance: 0.002,
    // Rarity boost: resources inside caves are this many tiers deeper
    interiorRarityBoostTiers: 3,
    // Resource density multiplier inside caves (2.5x normal)
    interiorResourceMultiplier: 2.5,
    
    // === HIDDEN CAVERNS ===
    // 25% of caves become "hidden" — walls are normal diggable terrain,
    // interior is a large hollow space with treasure rooms
    hiddenCaveChance: 0.25,
    // Hidden cave interior dimensions (larger than normal caves)
    hiddenRadiusXMin: 5,   // 5 tiles wide (small room)
    hiddenRadiusXMax: 15,  // 15 tiles wide (large chamber)
    hiddenRadiusYMin: 3,   // 3 tiles high
    hiddenRadiusYMax: 6,   // 6 tiles high
    // Treasure rooms inside hidden caves
    treasureRoomChance: 0.5, // 50% of hidden caves have a treasure room
    treasureRoomWidth: 3,    // 3 tiles wide
    treasureRoomHeight: 2,   // 2 tiles high
    // Chest glow — golden light visible through blocks
    chestGlowColor: 0xFFD700,
    chestGlowRadius: 3,     // tiles radius of glow
  },

  // === TREASURE ROOMS (standalone, small) ===
  // Small 2x2 rooms with a chest — NOT inside hidden caves
  treasureRooms: {
    totalMin: 1,
    totalMax: 3,
    // Room dimensions
    roomWidth: 2,
    roomHeight: 2,
    // Depth — start at 50m
    surfaceSkipDepth: 50,
    // Chest glow
    chestGlowColor: 0xFFD700,
    chestGlowRadius: 2,
  },

  // Geode pockets — hard-walled chambers with ultra-rare resources.
  // Layout: [WALL] [WALL] [INTERIOR...] [WALL] [WALL]
  //	   WALL = GEODE_WALL (undiggable, requires heavy punch to pass through)
  //	   INTERIOR = rich rare resources inside
  // NO entrance — player MUST have Heavy Punch upgrade to break through.
  geodes: {
    totalMin: 8,
    totalMax: 20,
    // Geode dimensions — interior is 4-8 tiles wide, 4-8 tiles tall
    radiusXMin: 2,    // minimum X radius (4 tiles wide diamond)
    radiusXMax: 4,    // maximum X radius (8 tiles wide)
    radiusYMin: 2,    // minimum Y radius (4 tiles tall)
    radiusYMax: 4,    // maximum Y radius (8 tiles tall)
    // Wall thickness — 2-tile-thick undiggable shell around the interior
    wallThickness: 2,
    // Depth restrictions
    surfaceSkipDepth: 20,
    // ALL geode walls are GEODE_WALL (undiggable, need heavy punch)
    heavyPunchChance: 1.0,
    // Rarity boost for interior resources — 4 tiers deeper
    interiorRarityBoostTiers: 4,
    // Resource density multiplier inside geode (3x normal)
    interiorResourceMultiplier: 3.0,
    // Special block multiplier inside geode (5x chance)
    specialBlockMultiplier: 5,
  },

  // Decorative crystal veins — visual-only clusters that also emit soft local light.
  glowCrystals: {
    totalMin: 18,
    totalMax: 30,
    surfaceSkipDepth: 20,
    bottomPaddingTiles: 20,
    minSpacingTiles: 8,
    radiusXMin: 2,
    radiusXMax: 4,
    radiusYMin: 1,
    radiusYMax: 3,
    alphaMin: 0.45,
    alphaMax: 0.75,
    lightRadiusMinTiles: 3.5,
    lightRadiusMaxTiles: 5.25,
    palette: Object.freeze([
      0x66E8FF, // cyan
      0xB675FF, // violet
      0xFF6FD8, // magenta
      0x70FFD6, // mint
      0xFFD36A, // amber
      0xA7D8FF, // pale blue
    ]),
  },

  // Root overlays — visual-only decorative overlays on diggable tiles
  roots: {
    // Surface roots (0-100m) — frequent
    shallow: {
      minDepth: 0,
      maxDepth: 100,
      overlayType: 'shallow',  // maps to ROOT_OVERLAY
      spawnChance: 0.05,       // 5% of eligible tiles
      caveChance: 0.03,        // 3% in caves
    },
    // Deep roots (100m+) — rarer
    deep: {
      minDepth: 100,
      maxDepth: 2000,
      overlayType: 'deep',     // maps to ROOT_OVERLAY_DEEP
      spawnChance: 0.008,      // 0.8% of eligible tiles
      caveChance: 0.01,        // 1% in caves
    },
  },

  // Gold spawn
  gold: {
    maxDepth: 1940, // 2000 - topAirRows
    minGuaranteedAttempts: 100,
  },

  // Depth calculations
  maxDepth: 1940, // 2000 - 60 (topAirRows)
});
