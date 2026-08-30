import { WORLD_DEPTH_CONFIG } from "./worldDepthConfig.js";
import { TILE_TYPES } from "./tileTypes.js";

// ==================== WORLD GENERATION CONFIG ====================
export const WORLD_GEN_CONFIG = Object.freeze({
  terrain: Object.freeze({
    // Every material chance is cumulative; the remaining probability is Dirt.
    authoredResourceHashSalt: 0x4f524531,
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
    goldMinDepth: 700,
    band4GoldChance: 0.0023,
    band4SilverChance: 0.0039,
    band4DarkDirtStrongChance: 0.0279,
    band4DarkDirtNormalChance: 0.0966,
    band4SteelChance: 0.1272,
    band4IronChance: 0.1459,
    band4CopperChance: 0.2528,
    band4StoneChance: 0.5321,
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
          Object.freeze({ type: TILE_TYPES.GOLD, chance: 0.0017 }),
          Object.freeze({ type: TILE_TYPES.SILVER, chance: 0.0037 }),
          Object.freeze({ type: TILE_TYPES.DARK_DIRT_STRONG, chance: 0.0417 }),
          Object.freeze({ type: TILE_TYPES.DARK_DIRT_NORMAL, chance: 0.1037 }),
          Object.freeze({ type: TILE_TYPES.BRONZE, chance: 0.1137 }),
          Object.freeze({ type: TILE_TYPES.STEEL, chance: 0.1567 }),
          Object.freeze({ type: TILE_TYPES.IRON, chance: 0.1817 }),
          Object.freeze({ type: TILE_TYPES.COPPER, chance: 0.2807 }),
          Object.freeze({ type: TILE_TYPES.STONE, chance: 0.5157 }),
        ]),
      }),
      Object.freeze({
        minDepth: 600,
        maxDepth: 999,
        thresholds: Object.freeze([
          Object.freeze({ type: TILE_TYPES.GOLD, chance: 0.0010 }),
          Object.freeze({ type: TILE_TYPES.SILVER, chance: 0.0033 }),
          Object.freeze({ type: TILE_TYPES.DARK_DIRT_STRONG, chance: 0.0553 }),
          Object.freeze({ type: TILE_TYPES.DARK_DIRT_NORMAL, chance: 0.1104 }),
          Object.freeze({ type: TILE_TYPES.BRONZE, chance: 0.1293 }),
          Object.freeze({ type: TILE_TYPES.STEEL, chance: 0.1841 }),
          Object.freeze({ type: TILE_TYPES.IRON, chance: 0.2146 }),
          Object.freeze({ type: TILE_TYPES.COPPER, chance: 0.3055 }),
          Object.freeze({ type: TILE_TYPES.STONE, chance: 0.5017 }),
        ]),
      }),
      Object.freeze({
        minDepth: 1000,
        maxDepth: 1499,
        thresholds: Object.freeze([
          Object.freeze({ type: TILE_TYPES.GOLD, chance: 0.0018 }),
          Object.freeze({ type: TILE_TYPES.SILVER, chance: 0.0056 }),
          Object.freeze({ type: TILE_TYPES.DARK_DIRT_STRONG, chance: 0.0708 }),
          Object.freeze({ type: TILE_TYPES.DARK_DIRT_NORMAL, chance: 0.1297 }),
          Object.freeze({ type: TILE_TYPES.BRONZE, chance: 0.1561 }),
          Object.freeze({ type: TILE_TYPES.STEEL, chance: 0.2309 }),
          Object.freeze({ type: TILE_TYPES.IRON, chance: 0.2668 }),
          Object.freeze({ type: TILE_TYPES.COPPER, chance: 0.3598 }),
          Object.freeze({ type: TILE_TYPES.STONE, chance: 0.5459 }),
        ]),
      }),
      Object.freeze({
        minDepth: 1500,
        maxDepth: null,
        thresholds: Object.freeze([
          Object.freeze({ type: TILE_TYPES.GOLD, chance: 0.0073 }),
          Object.freeze({ type: TILE_TYPES.SILVER, chance: 0.0207 }),
          Object.freeze({ type: TILE_TYPES.DARK_DIRT_STRONG, chance: 0.0932 }),
          Object.freeze({ type: TILE_TYPES.DARK_DIRT_NORMAL, chance: 0.1501 }),
          Object.freeze({ type: TILE_TYPES.BRONZE, chance: 0.1997 }),
          Object.freeze({ type: TILE_TYPES.STEEL, chance: 0.2987 }),
          Object.freeze({ type: TILE_TYPES.IRON, chance: 0.3512 }),
          Object.freeze({ type: TILE_TYPES.COPPER, chance: 0.4523 }),
          Object.freeze({ type: TILE_TYPES.STONE, chance: 0.6071 }),
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
    sizeBands: Object.freeze([
      Object.freeze({ name: 'small', weight: 55, radiusXMin: 2, radiusXMax: 4, radiusYMin: 2, radiusYMax: 4 }),
      Object.freeze({ name: 'large', weight: 35, radiusXMin: 5, radiusXMax: 11, radiusYMin: 3, radiusYMax: 7 }),
      Object.freeze({ name: 'huge', weight: 10, radiusXMin: 12, radiusXMax: 20, radiusYMin: 6, radiusYMax: 11 }),
    ]),
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

  // Gold spawn
  gold: {
    maxDepth: WORLD_DEPTH_CONFIG.levelTwoDepthMeters,
    minGuaranteedAttempts: 100,
  },

  // Depth calculations
  maxDepth: WORLD_DEPTH_CONFIG.levelTwoDepthMeters,
});
