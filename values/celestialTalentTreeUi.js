// Authored full-screen multi-path talent layout, art routing, and hover copy.

import { ASSET_KEYS } from "./assetKeys.js";
import { CELESTIAL_ACTION_BAR_ASSET_KEYS } from "./celestialActionBar.js";
import { CELESTIAL_TALENT_NODES_BY_ID } from "./celestialTalentProgression.js";

const foundation = Object.freeze({
  key: "ui-celestial-talent-foundation-v1",
  path: "sprites/UI/celestial-overhaul-v1/celestial-talent-foundation-v1.png",
});
const connectorGold = Object.freeze({
  key: "ui-celestial-talent-connector-gold-v1",
  path: "sprites/UI/starlight-talent-tree-v4/connector-quickslash-v2.png",
});
const connectorBlue = Object.freeze({
  key: "ui-celestial-talent-connector-blue-v1",
  path: "sprites/UI/starlight-talent-tree-v4/connector-thunderstrike-v2.png",
});
const nodeHalo = Object.freeze({
  key: "ui-celestial-talent-node-halo-v1",
  path: "sprites/UI/starlight-talent-tree-v4/node-selection-halo-v2.png",
});

export const CELESTIAL_TALENT_TREE_PRELOAD_ASSETS = Object.freeze([
  foundation,
  connectorGold,
  connectorBlue,
  nodeHalo,
]);

const signs = ASSET_KEYS.constellations.signs;
const engines = ASSET_KEYS.celestialEngines;
const nodeIconKeys = Object.freeze({
  "wayward-star-root": engines.waywardStar,
  "wayward-stellar-bearings": signs.silver,
  "wayward-ricochet-matrix": signs.stone,
  "wayward-nova-lens": signs.gold,
  "wayward-echo-orbit": signs.darkDirtNormal,
  "wayward-vector-command": signs.copper,
  "wayward-fracture-bloom": signs.steel,
  "wayward-perihelion-loop": CELESTIAL_ACTION_BAR_ASSET_KEYS.quickslash,
  "wayward-impact-lattice": signs.iron,
  "wayward-supernova-core": engines.starHeart,
  "wayward-white-dwarf-shell": CELESTIAL_ACTION_BAR_ASSET_KEYS.thunderStrike,
  "hollow-sun-root": engines.hollowSun,
  "hollow-orbit-anchor": signs.silver,
  "hollow-gravity-well": signs.darkDirtNormal,
  "hollow-echo-seed": signs.dirt,
  "hollow-tidal-lens": signs.copper,
  "hollow-event-horizon": signs.gold,
  "hollow-dark-reservoir": signs.darkDirtStrong,
  "hollow-abyssal-field": engines.hollowSun,
  "hollow-collapse-cycle": signs.steel,
  "hollow-singularity-core": engines.starHeart,
  "hollow-chronosphere": CELESTIAL_ACTION_BAR_ASSET_KEYS.thunderStrike,
  "comet-engine-root": engines.cometEngine,
  "comet-ignition-coil": signs.gold,
  "comet-bore-drive": signs.iron,
  "comet-fracture-nose": signs.steel,
  "comet-longburn-reservoir": signs.copper,
  "comet-rider-plating": signs.bronze,
  "comet-wide-wake": CELESTIAL_ACTION_BAR_ASSET_KEYS.thunderStrike,
  "comet-aphelion-drive": engines.cometEngine,
  "comet-impact-wake": signs.darkDirtStrong,
  "comet-zenith-drive": engines.starHeart,
  "comet-shockfront": CELESTIAL_ACTION_BAR_ASSET_KEYS.quickslash,
});

export const CELESTIAL_TALENT_TREE_UI_CONFIG = Object.freeze({
  assets: Object.freeze({
    foundation,
    connectorGold,
    connectorBlue,
    nodeHalo,
    tooltip: ASSET_KEYS.ui.approvedHud.notification,
    lock: CELESTIAL_ACTION_BAR_ASSET_KEYS.lock,
    connectorKeysByBranch: Object.freeze({
      "wayward-star": connectorGold.key,
      "hollow-sun": connectorBlue.key,
      "comet-engine": connectorGold.key,
    }),
    nodeIconKeys,
  }),
  layout: Object.freeze({
    referenceWidthPx: 1672,
    referenceHeightPx: 941,
    minimumScale: 0.56,
    viewportInsetPx: 8,
    branchCenterXFractions: Object.freeze([0.219, 0.5, 0.781]),
    rowYFractions: Object.freeze([0.79, 0.64, 0.475, 0.285]),
    laneStepXFraction: 0.062,
    nodeSizeByKindPx: Object.freeze({ ability: 70, upgrade: 48, capstone: 58 }),
    nodeHitWidthPx: 78,
    nodeHitHeightPx: 76,
    lockWidthPx: 24,
    lockHeightPx: 34,
    haloWidthScale: 0.82,
    haloHeightScale: 1.18,
    nodeStatusOffsetYPx: 39,
    connectorThicknessPx: 16,
    titleYFraction: 0.058,
    subtitleYFraction: 0.112,
    branchTitleYFraction: 0.178,
    levelXFraction: 0.132,
    moneyXFraction: 0.81,
    starsXFraction: 0.92,
    headerYFraction: 0.071,
    closeXFraction: 0.965,
    detailTitleXFraction: 0.31,
    detailTitleYFraction: 0.925,
    detailBodyXFraction: 0.51,
    detailBodyYFraction: 0.925,
    detailStatusXFraction: 0.82,
    detailStatusYFraction: 0.925,
    detailBodyWidthPx: 620,
    tooltipWidthPx: 330,
    tooltipHeightPx: 108,
    tooltipGapPx: 16,
    tooltipTitleOffsetYPx: -29,
    tooltipBodyOffsetYPx: -2,
    tooltipStatusOffsetYPx: 30,
    tooltipBodyWidthPx: 286,
    compactStatusScaleThreshold: 0.7,
  }),
  presentation: Object.freeze({
    depth: 4200,
    titleFontSizePx: 42,
    subtitleFontSizePx: 17,
    headerFontSizePx: 21,
    branchFontSizePx: 25,
    nodeStatusFontSizePx: 10,
    detailTitleFontSizePx: 20,
    detailBodyFontSizePx: 14,
    detailStatusFontSizePx: 14,
    tooltipTitleFontSizePx: 16,
    tooltipBodyFontSizePx: 11,
    tooltipStatusFontSizePx: 11,
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
    haloAlpha: 0.62,
    connectorLockedAlpha: 0.18,
    connectorReadyAlpha: 0.72,
    connectorOwnedAlpha: 0.95,
    branchAccents: Object.freeze([0xe0a843, 0xa96dff, 0x65d8f2]),
  }),
  copy: Object.freeze({
    title: "CELESTIAL TALENTS",
    subtitle: "LEVEL 20 ROOT ABILITY  -  CHOOSE A PATH  -  MASTER UPWARD",
    close: "ESC",
    owned: "OWNED",
    free: "FREE",
    inspect: "Hover a node to inspect its effect and exact unlock condition.",
    talentsLocked: "Requires Player Level 20.",
    rootChoiceLocked: "Complete an apex path in your current Engine to unlock another root ability.",
    prerequisiteLocked: "Requires an earlier node on this path.",
    unknownLocked: "This talent is currently locked.",
    available: "Click to unlock.",
  }),
});

export function getCelestialTalentNodeIconKey(nodeId) {
  return nodeIconKeys[nodeId] || engines.starHeart;
}

export function getCelestialTalentNodePosition(branchIndex, node) {
  const layout = CELESTIAL_TALENT_TREE_UI_CONFIG.layout;
  return Object.freeze({
    xFraction: layout.branchCenterXFractions[branchIndex]
      + node.lane * layout.laneStepXFraction,
    yFraction: layout.rowYFractions[node.row],
  });
}

export function describeCelestialTalentAvailability(nodeSnapshot) {
  const copy = CELESTIAL_TALENT_TREE_UI_CONFIG.copy;
  if (!nodeSnapshot) return copy.unknownLocked;
  if (nodeSnapshot.purchased) return copy.owned;
  if (nodeSnapshot.available) {
    return nodeSnapshot.starsCost > 0
      ? `${copy.available} Spend ${nodeSnapshot.starsCost} Star Points.`
      : `${copy.available} ${copy.free}`;
  }
  if (nodeSnapshot.reason === "talents-locked") return copy.talentsLocked;
  if (nodeSnapshot.reason === "level-locked") {
    return `Requires Player Level ${nodeSnapshot.requiredLevel}.`;
  }
  if (nodeSnapshot.reason === "root-choice-locked") return copy.rootChoiceLocked;
  if (nodeSnapshot.reason === "prerequisite-locked") {
    const names = (nodeSnapshot.missingPrerequisiteIds || [])
      .map(id => CELESTIAL_TALENT_NODES_BY_ID[id]?.name)
      .filter(Boolean);
    if (nodeSnapshot.prerequisiteMode === "any") {
      return `Requires any one of: ${names.join(", ")}.`;
    }
    return names.length > 0
      ? `Requires: ${names.join(", ")}.`
      : copy.prerequisiteLocked;
  }
  if (nodeSnapshot.reason === "insufficient-stars") {
    return `Requires ${nodeSnapshot.starsCost} Star Points. You have ${nodeSnapshot.starsBalance}.`;
  }
  return copy.unknownLocked;
}
