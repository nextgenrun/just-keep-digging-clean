import { ABILITY_UPGRADE_ICON_ART } from "./abilityUpgradeIconArt.js";

export const UI_ICON_ATLAS = Object.freeze({
  key: "ui-icon-atlas-v1",
  path: "sprites/UI/icons/shop-ui-icon-atlas-v1.png",
  frameWidth: 209,
  frameHeight: 209,
  columns: 6,
  rows: 6,
  displaySize: 30,
});

export const UI_ICON_FRAMES = Object.freeze({
  close: 0, back: 1, next: 2, play: 3, resume: 3, pause: 4, save: 5,
  settings: 6, stats: 7, home: 8, fullscreen: 9, audio: 10, mute: 11,
  shop: 12, inventory: 13, sell: 14, moneyMonster: 15, upgrade: 16, lock: 17,
  dirt: 18, darkDirt: 18, stone: 19, copper: 20, steel: 21, iron: 21,
  bronze: 20, silver: 22, gold: 23, pickaxe: 24, gem: 25, speed: 26,
  strength: 27, torch: 29, health: 30, power: 31,
  bobo: 33, warning: 34, info: 35, controls: 6, unstuck: 2, trash: 0,
  export: 2, import: 1, backup: 5, check: 16,
});

export const UI_AUTO_ICON_LABELS = Object.freeze({
  "MAIN MENU": "home", "SAVE GAME": "save", "SELL ALL": "sell",
  "FIELD INVENTORY": "inventory", "INVENTORY": "inventory", "SETTINGS": "settings",
  "CONTROLS": "controls", "FULLSCREEN": "fullscreen", "STATS": "stats",
  "GENERAL": "home", "PAUSED": "pause", "RESUME": "resume", "CONTINUE": "resume",
  "PLAY": "play", "START": "play", "CLOSE": "close", "CANCEL": "close",
  "BACK": "back", "PREV": "back", "NEXT": "next", "SAVE": "save",
  "UNSTUCK": "unstuck", "SELL": "sell", "UPGRADES": "upgrade",
  "DELETE": "trash", "CLEAR": "trash", "EXPORT": "export", "IMPORT": "import",
  "BACKUPS": "backup", "RESTORE": "backup", "AUDIO": "audio",
  "MUSIC": "audio", "SFX": "audio",
});

// Replace the reserved IDs once the future seller NPCs receive final identifiers.
export const SELL_CAPABLE_MERCHANT_IDS = Object.freeze([
  "moneyMonster",
  "magmaMoneyMonster",
]);

export const UI_MERCHANT_ICONS = Object.freeze({
  moneyMonster: "moneyMonster",
  magmaMoneyMonster: "power",
  playerUpgrades: "upgrade",
  gearMerchant: "pickaxe",
  boboMerchant: "bobo",
  gemPowerMerchant: "gem",
});

export const UI_UPGRADE_ICONS = Object.freeze({
  gemPowerUnlock: ABILITY_UPGRADE_ICON_ART.gemPowerUnlock.key, gemPowerTank: ABILITY_UPGRADE_ICON_ART.gemPowerTank.key, gemPowerEfficiency: ABILITY_UPGRADE_ICON_ART.gemPowerEfficiency.key,
  gemPowerRegeneration: ABILITY_UPGRADE_ICON_ART.gemPowerRegeneration.key, gemFlySpeed: ABILITY_UPGRADE_ICON_ART.gemFlySpeed.key, agility: ABILITY_UPGRADE_ICON_ART.agility.key,
  strength: ABILITY_UPGRADE_ICON_ART.strength.key, quickReflexes: ABILITY_UPGRADE_ICON_ART.quickReflexes.key, heavyPunch: ABILITY_UPGRADE_ICON_ART.heavyPunch.key,
  bronzePickaxe: "pickaxe",
  ironPickaxe: "pickaxe", steelPickaxe: "pickaxe", mithrilPickaxe: "pickaxe",
  adamantPickaxe: "pickaxe", runePickaxe: "pickaxe", dragonPickaxe: "pickaxe",
  sellAllButton: "sell", startResourcePrices: "sell", nextResourcePrices: "sell",
  marketInsight: "stats", quickslashAbility: ABILITY_UPGRADE_ICON_ART.quickslashAbility.key,
  thunderStrikeAbility: ABILITY_UPGRADE_ICON_ART.thunderStrikeAbility.key, torchDrainEfficiency: ABILITY_UPGRADE_ICON_ART.torchDrainEfficiency.key, torchRange: ABILITY_UPGRADE_ICON_ART.torchRange.key,
  boboCaveEyes: ABILITY_UPGRADE_ICON_ART.boboCaveEyes.key, worldTwoTunnelAccess: "lock", mia: "bobo",
  arcCoreVehicle: "power", boboWisdom: ABILITY_UPGRADE_ICON_ART.boboWisdom.key, upOrDown: "gem",
});

export const UI_RESOURCE_PRESENTATION = Object.freeze({
  dirt: { name: "Dirt", icon: "dirt", color: "#b98556" },
  stone: { name: "Stone", icon: "stone", color: "#b5bec7" },
  copper: { name: "Copper", icon: "copper", color: "#dc8a4f" },
  darkDirtNormal: { name: "Dark Dirt", icon: "darkDirt", color: "#8f6148" },
  darkDirtStrong: { name: "Dark Dirt (Strong)", icon: "darkDirt", color: "#714936" },
  steel: { name: "Steel", icon: "steel", color: "#9eabb4" },
  iron: { name: "Iron", icon: "iron", color: "#c7cdd1" },
  bronze: { name: "Bronze", icon: "bronze", color: "#c47d42" },
  silver: { name: "Silver", icon: "silver", color: "#d1d9df" },
  gold: { name: "Gold", icon: "gold", color: "#e5b83f" },
  lavaDirt: { name: "Lava Dirt", icon: "darkDirt", color: "#d45b36" },
  obsidian: { name: "Obsidian", icon: "stone", color: "#8067a8" },
  emberOre: { name: "Ember Ore", icon: "gold", color: "#ff7a32" },
  magmaCrystal: { name: "Magma Crystal", icon: "gem", color: "#ff3e86" },
});

export const UI_INVENTORY_COPY = Object.freeze({
  title: "INVENTORY",
  subtitle: "See what you carry and what you have discovered",
  iconKeyTitle: "YOUR MATERIALS",
  discoveredStatus: "FOUND",
  undiscoveredStatus: "NOT FOUND YET",
  discoveredCountSuffix: "FOUND",
  totalUnitsSuffix: "TOTAL UNITS",
  walletSuffix: "M",
  lockedAmount: "â€”",
  returnLabel: "RETURN TO GAME",
});

export const UI_INVENTORY_LAYOUT = Object.freeze({
  maxWidth: 940,
  maxHeight: 640,
  summaryHeight: 58,
  summaryGap: 14,
  desktopColumnThreshold: 760,
  desktopColumns: 3,
  compactColumns: 2,
  columnGap: 10,
  rowGap: 8,
  minItemHeight: 42,
  maxItemHeight: 66,
  itemIconInset: 30,
  itemTextInset: 66,
  itemQuantityInset: 14,
  iconSize: 40,
});
