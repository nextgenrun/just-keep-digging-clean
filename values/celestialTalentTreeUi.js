// Authored full-screen multi-path talent layout, art routing, and hover copy.

import { ASSET_KEYS } from "./assetKeys.js";
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
const tooltip = Object.freeze({
  key: "ui-celestial-talent-tooltip-v1",
  path: "sprites/UI/hud-approved-v1/notification-frame.png",
});
const lock = Object.freeze({
  key: "ui-celestial-talent-lock-v1",
  path: "sprites/UI/starlight-talent-tree-v4/bobo-lock-seal-v2.png",
});

const signs = ASSET_KEYS.constellations.signs;
const engines = ASSET_KEYS.celestialEngines;
const signBasePath = "sprites/constellations/star-signs-v2/";
const engineBasePath = "sprites/celestial-engines/";

export const CELESTIAL_TALENT_NODE_ICON_ASSETS = Object.freeze([
  Object.freeze({ key: signs.dirt, path: `${signBasePath}dirt-shovel.png` }),
  Object.freeze({ key: signs.stone, path: `${signBasePath}stone-mountain.png` }),
  Object.freeze({ key: signs.copper, path: `${signBasePath}copper-anvil.png` }),
  Object.freeze({ key: signs.darkDirtNormal, path: `${signBasePath}darkDirtNormal-cave.png` }),
  Object.freeze({ key: signs.darkDirtStrong, path: `${signBasePath}darkDirtStrong-fortress.png` }),
  Object.freeze({ key: signs.bronze, path: `${signBasePath}bronze-shield.png` }),
  Object.freeze({ key: signs.steel, path: `${signBasePath}steel-sword.png` }),
  Object.freeze({ key: signs.iron, path: `${signBasePath}iron-hammer.png` }),
  Object.freeze({ key: signs.silver, path: `${signBasePath}silver-crescent.png` }),
  Object.freeze({ key: signs.gold, path: `${signBasePath}gold-crown.png` }),
  Object.freeze({ key: engines.starHeart, path: `${engineBasePath}star-heart-core-v1.png` }),
  Object.freeze({ key: engines.waywardStar, path: `${engineBasePath}wayward-star-core-v1.png` }),
  Object.freeze({ key: engines.hollowSun, path: `${engineBasePath}hollow-sun-core-v1.png` }),
  Object.freeze({ key: engines.cometEngine, path: `${engineBasePath}comet-engine-core-v1.png` }),
]);

export const CELESTIAL_TALENT_TREE_PRELOAD_ASSETS = Object.freeze([
  foundation,
  connectorGold,
  connectorBlue,
  nodeHalo,
  tooltip,
  lock,
  ...CELESTIAL_TALENT_NODE_ICON_ASSETS,
]);

const nodeIconKeys = Object.freeze({
  "wayward-star-root": engines.waywardStar,
  "wayward-stellar-bearings": signs.silver,
  "wayward-ricochet-matrix": signs.stone,
  "wayward-nova-lens": signs.gold,
  "wayward-echo-orbit": signs.darkDirtNormal,
  "wayward-vector-command": signs.copper,
  "wayward-fracture-bloom": signs.steel,
  "wayward-perihelion-loop": signs.silver,
  "wayward-impact-lattice": signs.iron,
  "wayward-supernova-core": engines.starHeart,
  "wayward-white-dwarf-shell": signs.gold,
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
  "hollow-chronosphere": signs.silver,
  "comet-engine-root": engines.cometEngine,
  "comet-ignition-coil": signs.gold,
  "comet-bore-drive": signs.iron,
  "comet-fracture-nose": signs.steel,
  "comet-longburn-reservoir": signs.copper,
  "comet-rider-plating": signs.bronze,
  "comet-wide-wake": signs.gold,
  "comet-aphelion-drive": engines.cometEngine,
  "comet-impact-wake": signs.darkDirtStrong,
  "comet-zenith-drive": engines.starHeart,
  "comet-shockfront": signs.steel,
});

export const CELESTIAL_TALENT_TREE_UI_CONFIG = Object.freeze({
  assets: Object.freeze({
    foundation,
    connectorGold,
    connectorBlue,
    nodeHalo,
    tooltip,
    lock,
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
    // Authored branch socket centers measured from the 1672 px foundation.
    branchCenterXFractions: Object.freeze([0.194, 0.5, 0.804]),
    // Measured authored sockets: bottom root, lower tier, middle tier, apex.
    // Keeping the root above the dossier prevents the former panel collision.
    rowYFractions: Object.freeze([0.695, 0.552, 0.455, 0.235]),
    bridgeRowYFraction: 0.345,
    laneStepXFraction: 0.062,
    nodeSizeByKindPx: Object.freeze({ ability: 88, upgrade: 62, capstone: 72 }),
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
    levelXFraction: 0.091,
    moneyXFraction: 0.859,
    starsXFraction: 0.94,
    headerYFraction: 0.071,
    closeXFraction: 0.982,
    closeYFraction: 0.018,
    closeHitWidthPx: 96,
    closeHitHeightPx: 48,
    detailTitleXFraction: 0.31,
    detailTitleYFraction: 0.886,
    detailBodyXFraction: 0.51,
    detailBodyYFraction: 0.886,
    detailStatusXFraction: 0.82,
    detailStatusYFraction: 0.886,
    detailBodyWidthPx: 620,
    tooltipWidthPx: 390,
    tooltipHeightPx: 152,
    tooltipGapPx: 20,
    tooltipViewportMarginPx: 22,
    tooltipTitleOffsetYPx: -49,
    tooltipMetaOffsetYPx: -27,
    tooltipBodyOffsetYPx: 7,
    tooltipStatusOffsetYPx: 52,
    tooltipBodyWidthPx: 338,
    compactStatusScaleThreshold: 0.7,
  }),
  presentation: Object.freeze({
    depth: 4200,
    titleFontSizePx: 42,
    subtitleFontSizePx: 17,
    headerFontSizePx: 17,
    closeFontSizePx: 15,
    branchFontSizePx: 25,
    nodeStatusFontSizePx: 10,
    detailTitleFontSizePx: 20,
    detailBodyFontSizePx: 14,
    detailStatusFontSizePx: 14,
    tooltipTitleFontSizePx: 18,
    tooltipMetaFontSizePx: 11,
    tooltipBodyFontSizePx: 13,
    tooltipStatusFontSizePx: 12,
    titleColor: "#E8C984",
    bodyColor: "#D7DFE6",
    dimColor: "#8797A5",
    readyColor: "#DFF8FF",
    ownedColor: "#F2D67F",
    lockedColor: "#A9B3BC",
    shadowColor: "#010408",
    shadowThicknessPx: 3,
    lockedAlpha: 0.58,
    availableAlpha: 1,
    purchasedAlpha: 1,
    lockedTint: 0x8c9ba8,
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
    nodeOwned: "1/1",
    nodeLocked: "0/1",
    free: "FREE",
    inspect: "Hover a node to inspect its effect and exact unlock condition.",
    talentsLocked: "Requires Player Level 20.",
    rootChoiceLocked: "Complete an apex path in your current Engine to unlock another root ability.",
    prerequisiteLocked: "Requires an earlier node on this path.",
    unknownLocked: "This talent is currently locked.",
    available: "Click to unlock.",
    rootChoice: "ROOT ABILITY",
    upgradeChoice: "UPGRADE CHOICE",
    bridgeChoice: "BRIDGE UPGRADE",
    capstoneChoice: "CAPSTONE CHOICE",
    levelLabel: "LEVEL",
    starPointLabel: "SP",
  }),
});

export function getCelestialTalentChoiceLabel(node) {
  const copy = CELESTIAL_TALENT_TREE_UI_CONFIG.copy;
  if (node?.displayRole === "bridge") return copy.bridgeChoice;
  if (node?.kind === "ability") return copy.rootChoice;
  if (node?.kind === "capstone") return copy.capstoneChoice;
  return copy.upgradeChoice;
}

export function getCelestialTalentNodeIconKey(nodeId) {
  return nodeIconKeys[nodeId] || engines.starHeart;
}

export function getCelestialTalentNodePosition(branchIndex, node) {
  const layout = CELESTIAL_TALENT_TREE_UI_CONFIG.layout;
  return Object.freeze({
    xFraction: layout.branchCenterXFractions[branchIndex]
      + node.lane * layout.laneStepXFraction,
    yFraction: node.displayRole === "bridge"
      ? layout.bridgeRowYFraction
      : layout.rowYFractions[node.row],
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
