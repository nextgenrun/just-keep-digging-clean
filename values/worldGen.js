import { WORLD_DEPTH_CONFIG } from "./worldDepthConfig.js";
import { TILE_TYPES } from "./tileTypes.js";

// ==================== WORLD GENERATION CONFIG ====================
export const WORLD_GEN_CONFIG = Object.freeze({
  // Terrain composition ratios (must sum to 1.0)
  dirtRatio: 0.9845,
  stoneRatio: 0.010,
  copperRatio: 0.005,

  terrain: Object.freeze({
    band1MaxDepth: 30,
    band1StoneChance: 0.1,
    band2MaxDepth: 60,
    band2CopperChance: 0.05,
    band2StoneChance: 0.15,
    band3MaxDepth: 120,
    band3IronChance: 0.03,
    band3DarkDirtNormalChance: 0.04,
    band3CopperChance: 0.08,
    band3StoneChance: 0.2,
    band4MaxDepth: 300,
    band4GoldChance: 0.02,
    band4SilverChance: 0.03,
    band4DarkDirtStrongChance: 0.04,
    band4DarkDirtNormalChance: 0.08,
    band4SteelChance: 0.15,
    band4IronChance: 0.3,
    band4CopperChance: 0.5,
    band4StoneChance: 0.65,
    deepGoldChance: 0.005,
    deepSilverChance: 0.015,
    deepDarkDirtStrongChance: 0.03,
    deepDarkDirtNormalChance: 0.08,
    deepBronzeChance: 0.12,
    deepSteelChance: 0.22,
    deepIronChance: 0.35,
    deepCopperChance: 0.55,
    deepStoneChance: 0.70,
    depthEconomyBands: Object.freeze([
      Object.freeze({
        minDepth: 300,
        maxDepth: 599,
        thresholds: Object.freeze([
          Object.freeze({ type: TILE_TYPES.GOLD, chance: 0.003 }),
          Object.freeze({ type: TILE_TYPES.SILVER, chance: 0.012 }),
          Object.freeze({ type: TILE_TYPES.DARK_DIRT_STRONG, chance: 0.035 }),
          Object.freeze({ type: TILE_TYPES.DARK_DIRT_NORMAL, chance: 0.09 }),
          Object.freeze({ type: TILE_TYPES.BRONZE, chance: 0.14 }),
          Object.freeze({ type: TILE_TYPES.STEEL, chance: 0.24 }),
          Object.freeze({ type: TILE_TYPES.IRON, chance: 0.38 }),
          Object.freeze({ type: TILE_TYPES.COPPER, chance: 0.58 }),
          Object.freeze({ type: TILE_TYPES.STONE, chance: 0.72 }),
        ]),
      }),
      Object.freeze({
        minDepth: 600,
        maxDepth: 999,
        thresholds: Object.freeze([
          Object.freeze({ type: TILE_TYPES.GOLD, chance: 0.007 }),
          Object.freeze({ type: TILE_TYPES.SILVER, chance: 0.025 }),
          Object.freeze({ type: TILE_TYPES.DARK_DIRT_STRONG, chance: 0.05 }),
          Object.freeze({ type: TILE_TYPES.DARK_DIRT_NORMAL, chance: 0.10 }),
          Object.freeze({ type: TILE_TYPES.BRONZE, chance: 0.18 }),
          Object.freeze({ type: TILE_TYPES.STEEL, chance: 0.30 }),
          Object.freeze({ type: TILE_TYPES.IRON, chance: 0.44 }),
          Object.freeze({ type: TILE_TYPES.COPPER, chance: 0.62 }),
          Object.freeze({ type: TILE_TYPES.STONE, chance: 0.75 }),
        ]),
      }),
      Object.freeze({
        minDepth: 1000,
        maxDepth: 1499,
        thresholds: Object.freeze([
          Object.freeze({ type: TILE_TYPES.GOLD, chance: 0.015 }),
          Object.freeze({ type: TILE_TYPES.SILVER, chance: 0.05 }),
          Object.freeze({ type: TILE_TYPES.DARK_DIRT_STRONG, chance: 0.08 }),
          Object.freeze({ type: TILE_TYPES.DARK_DIRT_NORMAL, chance: 0.13 }),
          Object.freeze({ type: TILE_TYPES.BRONZE, chance: 0.24 }),
          Object.freeze({ type: TILE_TYPES.STEEL, chance: 0.37 }),
          Object.freeze({ type: TILE_TYPES.IRON, chance: 0.51 }),
          Object.freeze({ type: TILE_TYPES.COPPER, chance: 0.67 }),
          Object.freeze({ type: TILE_TYPES.STONE, chance: 0.79 }),
        ]),
      }),
      Object.freeze({
        minDepth: 1500,
        maxDepth: null,
        thresholds: Object.freeze([
          Object.freeze({ type: TILE_TYPES.GOLD, chance: 0.03 }),
          Object.freeze({ type: TILE_TYPES.SILVER, chance: 0.09 }),
          Object.freeze({ type: TILE_TYPES.DARK_DIRT_STRONG, chance: 0.12 }),
          Object.freeze({ type: TILE_TYPES.DARK_DIRT_NORMAL, chance: 0.17 }),
          Object.freeze({ type: TILE_TYPES.BRONZE, chance: 0.32 }),
          Object.freeze({ type: TILE_TYPES.STEEL, chance: 0.46 }),
          Object.freeze({ type: TILE_TYPES.IRON, chance: 0.59 }),
          Object.freeze({ type: TILE_TYPES.COPPER, chance: 0.73 }),
          Object.freeze({ type: TILE_TYPES.STONE, chance: 0.83 }),
        ]),
      }),
    ]),
  }),

  spawnGeometry: Object.freeze({
    caveBottomPaddingTiles: 20,
    shaftHalfWidthTiles: 1,
    shaftDepthTiles: 6,
  }),

  // Cave generation
  caves: {
    totalCavesMin: 90,
    totalCavesMax: 140,
    // Cave dimensions — height is ALWAYS 2-3 tiles total (no tall normal caves).
    // Width varies wildly to create dynamic, natural-feeling chambers:
    // narrow crawlspaces, wide halls, multi-chamber pockets.
    radiusXMin: 2,       // 2 tiles wide (tiny pocket)
    radiusXMax: 40,      // 40 tiles wide (massive hall, still 1-3 high)
    radiusYMin: 1,       // low tunnel radius
    radiusYMax: 1,       // hard cap: 2-3 tiles total after ellipse rasterization
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
    // Integrated caves remain part of the authoritative world by default so
    // every PlayScene system (lighting, UI, audio, saves and special tiles)
    // stays active. `?compactCaves=1` is the explicit compact-scene review mode.
    standaloneScene: Object.freeze({
      enabled: false,
      mouthWidthTiles: 2,
      mouthHeightTiles: 1,
      shellThicknessTiles: 1,
    }),

    // Authored Level One terrain intentionally overrides procedural cells.
    // Refill only untouched gaps so the live world retains a useful number of
    // low caves without ever carving through an authored Tiled cell.
    authoredGapSupplement: Object.freeze({
      enabled: true,
      placementAttemptsPerBand: 2200,
      featuredPlacementAttemptsPerBand: 500,
      radiusXMin: 2,
      radiusXMax: 18,
      featuredRadiusXMin: 6,
      radiusY: 1,
      wallThickness: 1,
      horizontalSpacingTiles: 5,
      verticalSpacingTiles: 4,
      bands: Object.freeze([
        Object.freeze({ id: "upper", minDepth: 45, maxDepth: 360, targetCaves: 5, featuredArchetypeId: "rootbound-hollow" }),
        Object.freeze({ id: "copper", minDepth: 361, maxDepth: 720, targetCaves: 5, featuredArchetypeId: "prism-nursery" }),
        Object.freeze({ id: "iron", minDepth: 721, maxDepth: 1080, targetCaves: 5, featuredArchetypeId: "storm-scar" }),
        Object.freeze({ id: "silver", minDepth: 1081, maxDepth: 1440, targetCaves: 5, featuredArchetypeId: "gilded-burrow" }),
        Object.freeze({ id: "deep", minDepth: 1441, maxDepth: 1880, targetCaves: 5, featuredArchetypeId: "ember-fault" }),
      ]),
    }),
    
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

  // Gold spawn
  gold: {
    maxDepth: WORLD_DEPTH_CONFIG.levelTwoDepthMeters,
    minGuaranteedAttempts: 100,
  },

  // Depth calculations
  maxDepth: WORLD_DEPTH_CONFIG.levelTwoDepthMeters,
});
