// Authored full-screen multi-path talent layout, art routing, and hover copy.

import { BAKED_TALENT_NODES, BAKED_TALENT_ASSETS } from "./bakedCelestialUi.js";
import { CELESTIAL_FOCUS_ASSETS, CELESTIAL_FOCUS_LAYOUT } from "./celestialTalentFocusUi.js";
import { CELESTIAL_TALENT_NODES_BY_ID } from "./celestialTalentProgression.js";
import { CELESTIAL_TALENT_RANK_BONUSES } from "./celestialTalentRanks.js";

const foundation = CELESTIAL_FOCUS_ASSETS.wayward;
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

export const CELESTIAL_TALENT_NODE_ICON_ASSETS = Object.freeze(
  Object.values(BAKED_TALENT_NODES).map(node => node.face),
);
export const CELESTIAL_TALENT_TREE_PRELOAD_ASSETS = Object.freeze([
  foundation, connector, nodeFrame, nodeHalo, tooltip, lock, ...BAKED_TALENT_ASSETS,
  ...Object.values(CELESTIAL_FOCUS_ASSETS).filter(asset => asset !== foundation),
]);
const nodeIconKeys = Object.freeze(Object.fromEntries(
  Object.entries(BAKED_TALENT_NODES).map(([id, node]) => [id, node.face.key]),
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
    referenceWidthPx: CELESTIAL_FOCUS_LAYOUT.width,
    referenceHeightPx: CELESTIAL_FOCUS_LAYOUT.height,
    minimumScale: 0,
    viewportInsetPx: 8,
    // Runtime graph centers; the V2 foundation intentionally bakes no sockets.
    branchCenterXFractions: Object.freeze(Array(3).fill(CELESTIAL_FOCUS_LAYOUT.treeX)),
    // Bottom root, two upgrade tiers, capstones, then one mastery apex.
    // Keeping the root above the dossier prevents panel collision.
    rowYFractions: CELESTIAL_FOCUS_LAYOUT.rowYs,
    bridgeRowYFraction: CELESTIAL_FOCUS_LAYOUT.bridgeY,
    laneStepXFraction: CELESTIAL_FOCUS_LAYOUT.laneStep,
    nodeSizeByKindPx: CELESTIAL_FOCUS_LAYOUT.nodeSizes,
    nodeFrameScale: 1.14,
    nodeIconScale: 1,
    abilityIconScale: 1,
    // Keep a small gap between adjacent lanes while retaining a useful mouse
    // target after the full tree is scaled into compact viewports.
    nodeHitWidthPx: CELESTIAL_FOCUS_LAYOUT.nodeHitWidth,
    nodeHitHeightPx: CELESTIAL_FOCUS_LAYOUT.nodeHitHeight,
    lockWidthPx: 24,
    lockHeightPx: 34,
    haloWidthScale: 0.82,
    haloHeightScale: 1.18,
    nodeStatusOffsetYPx: 39,
    connectorThicknessPx: 11,
    titleYFraction: 0.058,
    subtitleYFraction: 0.112,
    branchTitleYFraction: 0.155,
    levelXFraction: 0.091,
    talentPointsXFraction: 0.859,
    starsXFraction: 0.94,
    headerYFraction: 0.097,
    closeXFraction: 0.982,
    closeYFraction: 0.018,
    closeHitWidthPx: 96,
    closeHitHeightPx: 48,
    detailTitleXFraction: 0.205,
    detailTitleYFraction: 0.886,
    detailBodyXFraction: 0.51,
    detailBodyYFraction: 0.909,
    detailStatusXFraction: 0.82,
    detailStatusYFraction: 0.915,
    detailBodyWidthPx: 620,
    detailTitleWidthPx: 300,
    detailStatusWidthPx: 280,
    tooltipWidthPx: 460,
    tooltipHeightPx: 190,
    tooltipGapPx: 20,
    tooltipViewportMarginPx: 22,
    tooltipTitleOffsetYPx: -54,
    tooltipMetaOffsetYPx: -32,
    tooltipBodyOffsetYPx: 5,
    tooltipStatusOffsetYPx: 60,
    tooltipBodyWidthPx: 400,
    tooltipMinimumScreenScale: 0.7,
    nodeStatusMinimumScreenScale: 0.7,
    detailMinimumScreenScale: 0.66,
    compactStatusScaleThreshold: 0.7,
  }),
  presentation: Object.freeze({
    depth: 4200,
    titleFontSizePx: 42,
    subtitleFontSizePx: 17,
    headerFontSizePx: 17,
    currencyFontSizePx: 14,
    closeFontSizePx: 15,
    branchFontSizePx: 25,
    nodeStatusFontSizePx: 12,
    detailTitleFontSizePx: 20,
    detailBodyFontSizePx: 16,
    detailStatusFontSizePx: 14,
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
    waitingAlpha: 0.82,
    availableAlpha: 1,
    purchasedAlpha: 1,
    waitingColor: "#B9DDEB",
    lockedTint: 0x8c9ba8,
    selectedScale: 1,
    haloAlpha: 0.84,
    availableHaloAlpha: 0.18,
    waitingHaloAlpha: 0.1,
    purchasedHaloAlpha: 0.34,
    connectorLockedAlpha: 0.1,
    connectorReadyAlpha: 0.68,
    connectorOwnedAlpha: 0.88,
    connectorSelectedAlpha: 1,
    connectorThicknessScaleByState: Object.freeze({ locked: 0.72, ready: 1.05, owned: 1.16, selected: 1.48 }),
    branchAccents: Object.freeze([0xe0a843, 0xa96dff, 0xa855f7]),
  }),
  copy: Object.freeze({
    title: "CELESTIAL TALENTS",
    subtitle: "TALENT POINTS UNLOCK NODES  •  STAR POINTS UPGRADE THEIR RANKS",
    close: "ESC",
    owned: "OWNED",
    free: "FREE",
    waiting: "NEXT LEVEL",
    rootLocked: "FINISH PATH",
    inspect: "Unlock a node with 1 Talent Point. Spend Star Points to make it stronger.",
    talentsLocked: "Reach Player Level 3.",
    rootChoiceLocked: "Reach a top node in your current branch to open another starting ability.",
    prerequisiteLocked: "Unlock an earlier node on this path first.",
    unknownLocked: "This talent is locked.",
    available: "Click or tap to unlock.",
    rootChoice: "STARTING ABILITY",
    upgradeChoice: "UPGRADE CHOICE",
    bridgeChoice: "BRIDGE UPGRADE",
    capstoneChoice: "CAPSTONE CHOICE",
    apexChoice: "PERMANENT MASTERY",
    levelLabel: "LEVEL",
    starPointLabel: "SP",
    starPointsTitle: "STAR POINTS",
    talentPointsTitle: "TALENT POINTS",
    rankLabel: "RANK",
    maxLabel: "MAX",
    talentPointLabel: "TP",
    maxRank: "Fully upgraded.",
  }),
});

export function getCelestialTalentChoiceLabel(node) {
  const copy = CELESTIAL_TALENT_TREE_UI_CONFIG.copy;
  if (node?.displayRole === "bridge") return copy.bridgeChoice;
  if (node?.kind === "ability") return copy.rootChoice;
  if (node?.kind === "capstone") return copy.capstoneChoice;
  if (node?.kind === "apex") return copy.apexChoice;
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

export function describeCelestialTalentAvailability(nodeSnapshot) {
  const copy = CELESTIAL_TALENT_TREE_UI_CONFIG.copy;
  if (!nodeSnapshot) return copy.unknownLocked;
  if (nodeSnapshot.reason === "max-rank") return copy.maxRank;
  if (nodeSnapshot.available) {
    if (nodeSnapshot.godMode) return `Click to ${nodeSnapshot.action}. Free in God Mode.`;
    return nodeSnapshot.action === "upgrade"
      ? `Click to upgrade • ${nodeSnapshot.starsCost} Star Points.`
      : `Click to unlock • ${nodeSnapshot.talentPointsCost} Talent Point.`;
  }
  if (nodeSnapshot.reason === "talents-locked") return copy.talentsLocked;
  if (nodeSnapshot.reason === "level-locked") {
    return `Reach Player Level ${nodeSnapshot.requiredLevel}.`;
  }
  if (nodeSnapshot.reason === "root-choice-locked") return copy.rootChoiceLocked;
  if (nodeSnapshot.reason === "prerequisite-locked") {
    const names = (nodeSnapshot.missingPrerequisiteIds || [])
      .map(id => CELESTIAL_TALENT_NODES_BY_ID[id]?.name)
      .filter(Boolean);
    if (nodeSnapshot.prerequisiteMode === "any") {
      return `Unlock any one of: ${names.join(", ")}.`;
    }
    return names.length > 0
      ? `Unlock first: ${names.join(", ")}.`
      : copy.prerequisiteLocked;
  }
  if (nodeSnapshot.reason === "insufficient-stars") {
    return `Need ${nodeSnapshot.starsCost} Star Points • You have ${nodeSnapshot.starsBalance}.`;
  }
  if (nodeSnapshot.reason === "insufficient-talent-points") {
    return "Need 1 Talent Point. Earn one each level, starting at Level 3.";
  }
  return copy.unknownLocked;
}

export function describeCelestialTalentRank(nodeSnapshot) {
  if (!nodeSnapshot?.purchased) return nodeSnapshot?.description || "";
  const bonus = CELESTIAL_TALENT_RANK_BONUSES[nodeSnapshot.id]?.description || "";
  return nodeSnapshot.rank >= nodeSnapshot.maxRank
    ? `Star upgrades: ${bonus}`
    : `Next rank: ${bonus}`;
}
