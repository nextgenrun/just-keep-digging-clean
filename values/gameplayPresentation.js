// Approved everyday gameplay presentation: one source for layout and copy.
import { TILE_TYPES } from "./tileTypes.js";
import { RESOURCE_BY_TILE_TYPE, RESOURCE_DISPLAY } from "./resourceTypes.js";

export const GAMEPLAY_PRESENTATION = Object.freeze({
  target: Object.freeze({
    gapFromCore: 6, width: 172, height: 60, textWidth: 146,
    titleY: 18, hpY: 38, titleSize: 12, hpSize: 14, depth: 1970,
    hpLabel: "HP",
  }),
  damage: Object.freeze({ x: 231, y: 59, width: 54, fontSize: 11 }),
  merchant: Object.freeze({
    width: 208, height: 48, textWidth: 178, titleY: -9, detailY: 10,
    titleSize: 16, detailSize: 12, margin: 12, depth: 1960,
    fallbackTitle: "Shop", fallbackAction: "Browse shop",
    actions: Object.freeze({
      moneyMonster: "Sell resources", magmaMoneyMonster: "Browse magma gear",
      playerUpgrades: "Improve your miner", gearMerchant: "Browse gear",
      boboMerchant: "Browse abilities", gemPowerMerchant: "Improve Gem Power",
    }),
  }),
  scenicAlpha: 0.58,
  scenicPrefixes: Object.freeze([
    "world-visual-underground-foreground", "world-visual-ground-structure",
    "world-visual-underground-overlay", "world-visual-biome-expansion",
  ]),
});
export const TARGET_TILE_LABELS = Object.freeze(Object.fromEntries(
  Object.entries(TILE_TYPES).map(([name, type]) => [
    type, RESOURCE_DISPLAY[RESOURCE_BY_TILE_TYPE[type]]?.name
      || name.replaceAll("_", " ").toLowerCase(),
  ]),
));
export function resolveScenicFocusAlpha(key, alpha) {
  return GAMEPLAY_PRESENTATION.scenicPrefixes.some(prefix => key?.startsWith(prefix))
    ? alpha * GAMEPLAY_PRESENTATION.scenicAlpha : alpha;
}
