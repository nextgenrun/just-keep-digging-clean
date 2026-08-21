// Authored full-screen multi-path talent layout, art routing, and hover copy.

import { CELESTIAL_TALENT_NODES_BY_ID } from "./celestialTalentProgression.js";

const foundation = Object.freeze({
  key: "ui-celestial-talent-foundation-v2",
  path: "sprites/UI/celestial-overhaul-v2/celestial-talent-foundation-v2.png",
});
const connector = Object.freeze({
  key: "ui-celestial-talent-connector-v2",
  path: "sprites/UI/celestial-overhaul-v2/talent-connector-v2.png",
});
const nodeFrame = Object.freeze({
  key: "ui-celestial-talent-node-frame-v2",
  path: "sprites/UI/celestial-overhaul-v2/talent-node-frame-v2.png",
});
const nodeHalo = Object.freeze({
  key: "ui-celestial-talent-node-halo-v1",
  path: "sprites/UI/starlight-talent-tree-v4/node-selection-halo-v2.png",
});
const tooltip = Object.freeze({
  key: "ui-celestial-talent-tooltip-v2",
  path: "sprites/UI/celestial-overhaul-v2/talent-tooltip-v2.png",
});
const lock = Object.freeze({
  key: "ui-celestial-talent-lock-v1",
  path: "sprites/UI/starlight-talent-tree-v4/bobo-lock-seal-v2.png",
});

const talentIconBasePath = "sprites/UI/celestial-overhaul-v1/";
const talentNodeIconDefinitions = Object.freeze([
  "wayward-star-root",
  "wayward-stellar-bearings",
  "wayward-ricochet-matrix",
  "wayward-nova-lens",
  "wayward-echo-orbit",
  "wayward-vector-command",
  "wayward-fracture-bloom",
  "wayward-perihelion-loop",
  "wayward-impact-lattice",
  "wayward-supernova-core",
  "wayward-white-dwarf-shell",
  "hollow-sun-root",
  "hollow-orbit-anchor",
  "hollow-gravity-well",
  "hollow-echo-seed",
  "hollow-tidal-lens",
  "hollow-event-horizon",
  "hollow-dark-reservoir",
  "hollow-abyssal-field",
  "hollow-collapse-cycle",
  "hollow-singularity-core",
  "hollow-chronosphere",
  "comet-engine-root",
  "comet-ignition-coil",
  "comet-bore-drive",
  "comet-fracture-nose",
  "comet-longburn-reservoir",
  "comet-rider-plating",
  "comet-wide-wake",
  "comet-aphelion-drive",
  "comet-impact-wake",
  "comet-zenith-drive",
  "comet-shockfront",
].map(nodeId => Object.freeze({
  nodeId,
  key: `ui-celestial-talent-icon-${nodeId}-v1`,
  path: `${talentIconBasePath}talent-icon-${nodeId}-v1.png`,
})));

export const CELESTIAL_TALENT_NODE_ICON_ASSETS = Object.freeze(
  talentNodeIconDefinitions.map(({ key, path }) => Object.freeze({ key, path })),
);

export const CELESTIAL_TALENT_TREE_PRELOAD_ASSETS = Object.freeze([
  foundation,
  connector,
  nodeFrame,
  nodeHalo,
  tooltip,
  lock,
  ...CELESTIAL_TALENT_NODE_ICON_ASSETS,
]);

const nodeIconKeys = Object.freeze(Object.fromEntries(
  talentNodeIconDefinitions.map(({ nodeId, key }) => [nodeId, key]),
));

export const CELESTIAL_TALENT_TREE_UI_CONFIG = Object.freeze({
  assets: Object.freeze({
    foundation,
    connector,
    nodeFrame,
    nodeHalo,
    tooltip,
    lock,
    connectorKeysByBranch: Object.freeze({
      "wayward-star": connector.key,
      "hollow-sun": connector.key,
      "comet-engine": connector.key,
    }),
    nodeIconKeys,
  }),
  layout: Object.freeze({
    referenceWidthPx: 1672,
    referenceHeightPx: 941,
    minimumScale: 0.56,
    viewportInsetPx: 8,
    // Runtime graph centers; the V2 foundation intentionally bakes no sockets.
    branchCenterXFractions: Object.freeze([0.194, 0.5, 0.804]),
    focusedBranchCenterXFraction: 0.5,
    focusedLaneStepXFraction: 0.105,
    focusedNodeScale: 1.28,
    branchFocusScaleThreshold: 0.72,
    branchTabWidthPx: 254,
    branchTabHeightPx: 58,
    // Bottom root, lower tier, middle tier, apex. Runtime owns the topology.
    // Keeping the root above the dossier prevents panel collision.
    rowYFractions: Object.freeze([0.695, 0.552, 0.455, 0.235]),
    bridgeRowYFraction: 0.345,
    laneStepXFraction: 0.062,
    nodeSizeByKindPx: Object.freeze({ ability: 88, upgrade: 62, capstone: 72 }),
    nodeFrameScale: 1.14,
    nodeIconScale: 0.72,
    // Keep a small gap between adjacent lanes while retaining a useful mouse
    // target after the full tree is scaled into compact viewports.
    nodeHitWidthPx: 96,
    nodeHitHeightPx: 84,
    lockWidthPx: 24,
    lockHeightPx: 34,
    haloWidthScale: 0.82,
    haloHeightScale: 1.18,
    nodeStatusOffsetYPx: 39,
    connectorThicknessPx: 11,
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
    tooltipWidthPx: 460,
    tooltipHeightPx: 150,
    tooltipGapPx: 20,
    tooltipViewportMarginPx: 22,
    tooltipTitleOffsetYPx: -40,
    tooltipMetaOffsetYPx: -21,
    tooltipBodyOffsetYPx: 5,
    tooltipStatusOffsetYPx: 37,
    tooltipBodyWidthPx: 400,
    tooltipMinimumScreenScale: 0.7,
    compactStatusScaleThreshold: 0.7,
  }),
  presentation: Object.freeze({
    depth: 4200,
    titleFontSizePx: 42,
    subtitleFontSizePx: 17,
    headerFontSizePx: 17,
    closeFontSizePx: 15,
    branchFontSizePx: 25,
    nodeStatusFontSizePx: 12,
    detailTitleFontSizePx: 24,
    detailBodyFontSizePx: 17,
    detailStatusFontSizePx: 17,
    tooltipTitleFontSizePx: 20,
    tooltipMetaFontSizePx: 13,
    tooltipBodyFontSizePx: 15,
    tooltipStatusFontSizePx: 14,
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
    selectedScale: 1.09,
    haloAlpha: 0.84,
    purchasedHaloAlpha: 0.34,
    connectorLockedAlpha: 0.18,
    connectorReadyAlpha: 0.72,
    connectorOwnedAlpha: 0.95,
    branchTabIdleAlpha: 0.46,
    branchTabFocusedAlpha: 0.92,
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
    branchFocusHint: "SELECT A BRANCH  -  ESC RETURNS TO ALL BRANCHES",
    comparisonCurrent: "CURRENT",
    comparisonAfter: "AFTER UNLOCK",
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
  return nodeIconKeys[nodeId] || nodeIconKeys["wayward-star-root"];
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

export function getCelestialTalentFocusedNodePosition(node) {
  const layout = CELESTIAL_TALENT_TREE_UI_CONFIG.layout;
  return Object.freeze({
    xFraction: layout.focusedBranchCenterXFraction
      + node.lane * layout.focusedLaneStepXFraction,
    yFraction: node.displayRole === "bridge"
      ? layout.bridgeRowYFraction
      : layout.rowYFractions[node.row],
  });
}

export function describeCelestialTalentComparison(node, nodeSnapshot) {
  const copy = CELESTIAL_TALENT_TREE_UI_CONFIG.copy;
  if (!node || !nodeSnapshot) return copy.inspect;
  if (nodeSnapshot.purchased) {
    return `${copy.comparisonCurrent}: ACTIVE - ${node.description}\n`
      + `${copy.comparisonAfter}: ALREADY MASTERED`;
  }
  return `${copy.comparisonCurrent}: INACTIVE\n`
    + `${copy.comparisonAfter}: ${node.description}`;
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
