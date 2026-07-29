import { TILE_TYPES } from "./tileTypes.js";

export const RESOURCE_KEYS = Object.freeze([
  "dirt",
  "stone",
  "copper",
  "darkDirtNormal",
  "darkDirtStrong",
  "steel",
  "iron",
  "bronze",
  "silver",
  "gold",
  "lavaDirt",
  "obsidian",
  "emberOre",
  "magmaCrystal",
  "cloudstone",
  "stormglass",
  "halostone",
  "lumenite",
  "cinderstone",
  "hellglass",
]);

export const START_RESOURCE_KEYS = Object.freeze(["dirt", "stone", "copper"]);
export const NEXT_RESOURCE_KEYS = Object.freeze([
  "iron",
  "bronze",
  "steel",
  "silver",
  "gold",
]);
export const SECOND_WORLD_RESOURCE_KEYS = Object.freeze([
  "lavaDirt",
  "obsidian",
  "emberOre",
  "magmaCrystal",
]);
export const HEAVENBLOCKS_RESOURCE_KEYS = Object.freeze([
  "cloudstone",
  "stormglass",
  "halostone",
  "lumenite",
  "cinderstone",
  "hellglass",
]);
export const MONEY_MONSTER_RESOURCE_KEYS = Object.freeze([
  ...START_RESOURCE_KEYS,
  ...NEXT_RESOURCE_KEYS,
]);

export const RESOURCE_DISPLAY = Object.freeze({
  dirt: Object.freeze({ name: "Dirt", shortName: "Dirt", icon: "DI", color: "#8B4513", colorInt: 0x8b4513, oreColorInt: 0x6a3e24 }),
  stone: Object.freeze({ name: "Stone", shortName: "Stone", icon: "ST", color: "#808080", colorInt: 0x808080, oreColorInt: 0xd5dbdf }),
  copper: Object.freeze({ name: "Copper", shortName: "Copper", icon: "CU", color: "#B87333", colorInt: 0xb87333, oreColorInt: 0xf28a32 }),
  darkDirtNormal: Object.freeze({ name: "Dark Dirt", shortName: "Dark Dirt", icon: "DD", color: "#654321", colorInt: 0x654321, oreColorInt: 0x2a1b14 }),
  darkDirtStrong: Object.freeze({ name: "Hard Dark Dirt", shortName: "Hard Dirt", icon: "HD", color: "#3E2723", colorInt: 0x3e2723, oreColorInt: 0x160f0b }),
  steel: Object.freeze({ name: "Steel", shortName: "Steel", icon: "STL", color: "#4682B4", colorInt: 0x4682b4, oreColorInt: 0xa8c2d2 }),
  iron: Object.freeze({ name: "Iron", shortName: "Iron", icon: "FE", color: "#71797E", colorInt: 0x71797e, oreColorInt: 0xb8a185 }),
  bronze: Object.freeze({ name: "Bronze", shortName: "Bronze", icon: "BR", color: "#CD7F32", colorInt: 0xcd7f32, oreColorInt: 0xcf7e32 }),
  silver: Object.freeze({ name: "Silver", shortName: "Silver", icon: "AG", color: "#C0C0C0", colorInt: 0xc0c0c0, oreColorInt: 0xd9e2ed }),
  gold: Object.freeze({ name: "Gold", shortName: "Gold", icon: "AU", color: "#FFD700", colorInt: 0xffd700, oreColorInt: 0xffb51e }),
  lavaDirt: Object.freeze({ name: "Lava Dirt", shortName: "Lava Dirt", icon: "LD", color: "#D85A2A", colorInt: 0xd85a2a, oreColorInt: 0xff7a2a }),
  obsidian: Object.freeze({ name: "Obsidian", shortName: "Obsidian", icon: "OB", color: "#2B1B31", colorInt: 0x2b1b31, oreColorInt: 0xb247ff }),
  emberOre: Object.freeze({ name: "Ember Ore", shortName: "Ember", icon: "EM", color: "#FF6B21", colorInt: 0xff6b21, oreColorInt: 0xffd166 }),
  magmaCrystal: Object.freeze({ name: "Magma Crystal", shortName: "Magma", icon: "MC", color: "#FF2E6D", colorInt: 0xff2e6d, oreColorInt: 0xffb1ff }),
  cloudstone: Object.freeze({ name: "Cloudstone", shortName: "Cloudstone", icon: "CS", color: "#DCE8EE", colorInt: 0xdce8ee, oreColorInt: 0xf4fbff }),
  stormglass: Object.freeze({ name: "Stormglass", shortName: "Stormglass", icon: "SG", color: "#31D9FF", colorInt: 0x31d9ff, oreColorInt: 0x9cf2ff }),
  halostone: Object.freeze({ name: "Halostone", shortName: "Halostone", icon: "HS", color: "#FFF0C7", colorInt: 0xfff0c7, oreColorInt: 0xfff8e8 }),
  lumenite: Object.freeze({ name: "Lumenite", shortName: "Lumenite", icon: "LU", color: "#8FCBFF", colorInt: 0x8fcbff, oreColorInt: 0xe2f4ff }),
  cinderstone: Object.freeze({ name: "Cinderstone", shortName: "Cinderstone", icon: "CI", color: "#8D342F", colorInt: 0x8d342f, oreColorInt: 0xff5b3e }),
  hellglass: Object.freeze({ name: "Hellglass", shortName: "Hellglass", icon: "HG", color: "#D83AFF", colorInt: 0xd83aff, oreColorInt: 0xff7bed }),
});

export const RESOURCE_ZERO_TOTALS = Object.freeze(
  Object.fromEntries(RESOURCE_KEYS.map((key) => [key, 0]))
);

export const RESOURCE_COLORS = Object.freeze(
  Object.fromEntries(RESOURCE_KEYS.map((key) => [key, RESOURCE_DISPLAY[key].color]))
);

export const RESOURCE_COLOR_INTS = Object.freeze(
  Object.fromEntries(RESOURCE_KEYS.map((key) => [key, RESOURCE_DISPLAY[key].colorInt]))
);

export const RESOURCE_ORE_COLOR_INTS = Object.freeze(
  Object.fromEntries(RESOURCE_KEYS.map((key) => [key, RESOURCE_DISPLAY[key].oreColorInt]))
);

export const RESOURCE_BY_TILE_TYPE = Object.freeze({
  [TILE_TYPES.DIRT]: "dirt",
  [TILE_TYPES.STONE]: "stone",
  [TILE_TYPES.COPPER]: "copper",
  [TILE_TYPES.DARK_DIRT_NORMAL]: "darkDirtNormal",
  [TILE_TYPES.DARK_DIRT_STRONG]: "darkDirtStrong",
  [TILE_TYPES.STEEL]: "steel",
  [TILE_TYPES.IRON]: "iron",
  [TILE_TYPES.BRONZE]: "bronze",
  [TILE_TYPES.SILVER]: "silver",
  [TILE_TYPES.GOLD]: "gold",
  [TILE_TYPES.LAVA_DIRT]: "lavaDirt",
  [TILE_TYPES.OBSIDIAN]: "obsidian",
  [TILE_TYPES.EMBER_ORE]: "emberOre",
  [TILE_TYPES.MAGMA_CRYSTAL]: "magmaCrystal",
  [TILE_TYPES.CLOUDSTONE]: "cloudstone",
  [TILE_TYPES.STORMGLASS]: "stormglass",
  [TILE_TYPES.HALOSTONE]: "halostone",
  [TILE_TYPES.LUMENITE]: "lumenite",
  [TILE_TYPES.CINDERSTONE]: "cinderstone",
  [TILE_TYPES.HELLGLASS]: "hellglass",
});

export const RESOURCE_TILE_TYPE_VALUES = Object.freeze(Object.keys(RESOURCE_BY_TILE_TYPE).map(Number));

export const HARD_RESOURCE_TILE_TYPES = Object.freeze(new Set([
  TILE_TYPES.STONE,
  TILE_TYPES.COPPER,
  TILE_TYPES.STEEL,
  TILE_TYPES.IRON,
  TILE_TYPES.BRONZE,
  TILE_TYPES.SILVER,
  TILE_TYPES.GOLD,
  TILE_TYPES.LAVA_DIRT,
  TILE_TYPES.OBSIDIAN,
  TILE_TYPES.EMBER_ORE,
  TILE_TYPES.MAGMA_CRYSTAL,
  TILE_TYPES.CLOUDSTONE,
  TILE_TYPES.STORMGLASS,
  TILE_TYPES.HALOSTONE,
  TILE_TYPES.LUMENITE,
  TILE_TYPES.CINDERSTONE,
  TILE_TYPES.HELLGLASS,
]));

function clampResourceCount(value) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function createZeroResourceTotals() {
  return { ...RESOURCE_ZERO_TOTALS };
}

export function sanitizeResourceTotals(resources) {
  const result = {};
  for (const key of RESOURCE_KEYS) {
    result[key] = clampResourceCount(resources?.[key]);
  }
  return result;
}

export function tileTypeToResource(tileType) {
  return RESOURCE_BY_TILE_TYPE[tileType] || null;
}

export function getResourceDisplayName(resourceType) {
  return RESOURCE_DISPLAY[resourceType]?.name || resourceType;
}
