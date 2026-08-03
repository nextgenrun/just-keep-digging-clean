// ==================== CELESTIAL TALENT TREE UI ====================
// Authored full-screen foundation, node art, layout, and hover copy.

import { ASSET_KEYS } from "./assetKeys.js";
import { CELESTIAL_ACTION_BAR_ASSET_KEYS } from "./celestialActionBar.js";
import { CELESTIAL_TALENT_NODES_BY_ID } from "./celestialTalentProgression.js";

const foundation = Object.freeze({
  key: "ui-celestial-talent-foundation-v1",
  path: "sprites/UI/celestial-overhaul-v1/celestial-talent-foundation-v1.png",
});

export const CELESTIAL_TALENT_TREE_PRELOAD_ASSETS = Object.freeze([foundation]);

export const CELESTIAL_TALENT_TREE_UI_CONFIG = Object.freeze({
  assets: Object.freeze({
    foundation,
    lock: CELESTIAL_ACTION_BAR_ASSET_KEYS.lock,
    branchNodeKeys: Object.freeze({
      "wayward-star": Object.freeze([
        ASSET_KEYS.celestialEngines.waywardStar,
        ASSET_KEYS.constellations.signs.stone,
        ASSET_KEYS.constellations.signs.copper,
        ASSET_KEYS.constellations.signs.steel,
        ASSET_KEYS.celestialEngines.starHeart,
      ]),
      "hollow-sun": Object.freeze([
        ASSET_KEYS.celestialEngines.hollowSun,
        ASSET_KEYS.constellations.signs.darkDirtNormal,
        ASSET_KEYS.constellations.signs.silver,
        ASSET_KEYS.constellations.signs.gold,
        ASSET_KEYS.celestialEngines.starHeart,
      ]),
      "comet-engine": Object.freeze([
        ASSET_KEYS.celestialEngines.cometEngine,
        ASSET_KEYS.constellations.signs.iron,
        ASSET_KEYS.constellations.signs.bronze,
        CELESTIAL_ACTION_BAR_ASSET_KEYS.thunderStrike,
        ASSET_KEYS.celestialEngines.starHeart,
      ]),
    }),
  }),
  layout: Object.freeze({
    referenceWidthPx: 1672,
    referenceHeightPx: 941,
    minimumScale: 0.48,
    viewportInsetPx: 8,
    columnXFractions: Object.freeze([0.2, 0.5, 0.8]),
    nodeYFractions: Object.freeze([0.82, 0.681, 0.548, 0.414, 0.27]),
    nodeSizesPx: Object.freeze([78, 59, 59, 59, 72]),
    nodeHitWidthPx: 112,
    nodeHitHeightPx: 92,
    lockSizePx: 42,
    nodeStatusOffsetYPx: 49,
    titleYFraction: 0.058,
    subtitleYFraction: 0.112,
    branchTitleYFraction: 0.174,
    levelXFraction: 0.132,
    moneyXFraction: 0.81,
    starsXFraction: 0.92,
    headerYFraction: 0.071,
    closeXFraction: 0.965,
    detailTitleXFraction: 0.33,
    detailTitleYFraction: 0.923,
    detailBodyXFraction: 0.51,
    detailBodyYFraction: 0.925,
    detailStatusXFraction: 0.81,
    detailStatusYFraction: 0.925,
    detailBodyWidthPx: 600,
  }),
  presentation: Object.freeze({
    depth: 4200,
    titleFontSizePx: 42,
    subtitleFontSizePx: 17,
    headerFontSizePx: 21,
    branchFontSizePx: 25,
    nodeStatusFontSizePx: 12,
    detailTitleFontSizePx: 20,
    detailBodyFontSizePx: 14,
    detailStatusFontSizePx: 14,
    titleColor: "#E8C984",
    bodyColor: "#D7DFE6",
    dimColor: "#8797A5",
    readyColor: "#DFF8FF",
    ownedColor: "#F2D67F",
    lockedColor: "#A9B3BC",
    shadowColor: "#010408",
    shadowThicknessPx: 3,
    lockedAlpha: 0.31,
    availableAlpha: 0.9,
    purchasedAlpha: 1,
    selectedScale: 1.08,
    haloAlpha: 0.36,
    branchAccents: Object.freeze([0xe0a843, 0xa96dff, 0x65d8f2]),
  }),
  copy: Object.freeze({
    title: "CELESTIAL TALENTS",
    subtitle: "TALENTS UNLOCK AT LEVEL 20  •  ROOT ABILITY AT THE BOTTOM  •  MASTER UPWARD",
    close: "ESC",
    owned: "OWNED",
    free: "FREE",
    inspect: "Hover a node to inspect its effect and unlock condition.",
    talentsLocked: "Requires Player Level 20.",
    rootChoiceLocked: "Complete the current Engine branch to unlock another root ability.",
    prerequisiteLocked: "Requires the previous node in this branch.",
    unknownLocked: "This talent is currently locked.",
    available: "Click to unlock.",
  }),
});

export function getCelestialTalentNodeIconKey(branchId, tier) {
  return CELESTIAL_TALENT_TREE_UI_CONFIG.assets.branchNodeKeys[branchId]?.[tier]
    || ASSET_KEYS.celestialEngines.starHeart;
}

export function describeCelestialTalentAvailability(nodeSnapshot) {
  const copy = CELESTIAL_TALENT_TREE_UI_CONFIG.copy;
  if (!nodeSnapshot) return copy.unknownLocked;
  if (nodeSnapshot.purchased) return copy.owned;
  if (nodeSnapshot.available) {
    return nodeSnapshot.starsCost > 0
      ? `${copy.available} Spend ${nodeSnapshot.starsCost} Stars.`
      : `${copy.available} ${copy.free}`;
  }
  if (nodeSnapshot.reason === "talents-locked") return copy.talentsLocked;
  if (nodeSnapshot.reason === "level-locked") {
    return `Requires Player Level ${nodeSnapshot.requiredLevel}.`;
  }
  if (nodeSnapshot.reason === "root-choice-locked") return copy.rootChoiceLocked;
  if (nodeSnapshot.reason === "prerequisite-locked") {
    const previous = CELESTIAL_TALENT_NODES_BY_ID[
      nodeSnapshot.missingPrerequisiteIds?.[0]
    ];
    return previous
      ? `Requires previous node: ${previous.name}.`
      : copy.prerequisiteLocked;
  }
  if (nodeSnapshot.reason === "insufficient-stars") {
    return `Requires ${nodeSnapshot.starsCost} Stars. You have ${nodeSnapshot.starsBalance}.`;
  }
  return copy.unknownLocked;
}
