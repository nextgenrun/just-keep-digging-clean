import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  CELESTIAL_TALENT_NODE_ICON_ASSETS,
  CELESTIAL_TALENT_TREE_PRELOAD_ASSETS,
  CELESTIAL_TALENT_TREE_UI_CONFIG,
  describeCelestialTalentAvailability,
} from "../values/celestialTalentTreeUi.js";
import { CELESTIAL_TALENT_PROGRESSION_CONFIG } from
  "../values/celestialTalentProgression.js";

assert.equal(CELESTIAL_TALENT_TREE_PRELOAD_ASSETS.length, 42);
assert.equal(CELESTIAL_TALENT_NODE_ICON_ASSETS.length, 36);
assert.equal(
  new Set(CELESTIAL_TALENT_NODE_ICON_ASSETS.map(asset => asset.key)).size,
  36,
  "every talent node must own a unique runtime texture key",
);
assert.equal(
  new Set(CELESTIAL_TALENT_NODE_ICON_ASSETS.map(asset => asset.path)).size,
  36,
  "every talent node must own a unique authored bitmap",
);
assert.equal(
  CELESTIAL_TALENT_NODE_ICON_ASSETS.filter(asset => (
    asset.path.startsWith("sprites/UI/celestial-overhaul-v1/talent-icon-")
      && asset.path.endsWith("-v1.png")
  )).length,
  33,
);
const iconPayloads = await Promise.all(
  CELESTIAL_TALENT_NODE_ICON_ASSETS.map(asset => (
    readFile(new URL(`../${asset.path}`, import.meta.url))
  )),
);
for (const [index, payload] of iconPayloads.entries()) {
  assert.equal(payload.subarray(1, 4).toString("ascii"), "PNG");
  const minimumSize = index < 33 ? 256 : 128;
  assert.ok(payload.readUInt32BE(16) >= minimumSize, "talent icons must remain high resolution");
  assert.ok(payload.readUInt32BE(20) >= minimumSize, "talent icons must remain high resolution");
  assert.equal(payload[25], 6, "talent icons must remain RGBA PNGs");
}
assert.equal(
  new Set(iconPayloads.map(payload => (
    createHash("sha256").update(payload).digest("hex")
  ))).size,
  36,
  "all 36 resident icon files must remain byte-distinct",
);
assert.equal(
  new Set(CELESTIAL_TALENT_TREE_PRELOAD_ASSETS.map(asset => asset.key)).size,
  CELESTIAL_TALENT_TREE_PRELOAD_ASSETS.length,
);
assert.match(CELESTIAL_TALENT_TREE_PRELOAD_ASSETS[0].path, /celestial-talent-foundation-v2\.png$/);
assert.equal(CELESTIAL_TALENT_TREE_UI_CONFIG.layout.connectorThicknessPx, 11);
assert.ok(
  CELESTIAL_TALENT_TREE_UI_CONFIG.layout.nodeHitWidthPx >= 96
    && CELESTIAL_TALENT_TREE_UI_CONFIG.layout.nodeHitHeightPx >= 84,
  "scaled talent nodes must retain mouse-friendly hit targets",
);
assert.ok(
  CELESTIAL_TALENT_TREE_UI_CONFIG.presentation.nodeStatusFontSizePx >= 12,
  "wide-layout node status labels must remain readable",
);
assert.ok(
  CELESTIAL_TALENT_TREE_UI_CONFIG.layout.tooltipMinimumScreenScale >= 0.7,
  "compact hover copy must retain a readable physical scale",
);
assert.ok(
  CELESTIAL_TALENT_TREE_UI_CONFIG.layout.nodeStatusMinimumScreenScale >= 0.7
    && CELESTIAL_TALENT_TREE_UI_CONFIG.layout.detailMinimumScreenScale >= 0.65,
  "compact rank labels and bottom guidance must retain readable physical scales",
);
assert.ok(
  CELESTIAL_TALENT_TREE_UI_CONFIG.presentation.haloAlpha
    > CELESTIAL_TALENT_TREE_UI_CONFIG.presentation.purchasedHaloAlpha,
  "selection focus must be stronger than the purchased-state halo",
);
assert.ok(
  CELESTIAL_TALENT_TREE_UI_CONFIG.presentation.connectorSelectedAlpha
    > CELESTIAL_TALENT_TREE_UI_CONFIG.presentation.connectorOwnedAlpha
    && CELESTIAL_TALENT_TREE_UI_CONFIG.presentation.connectorOwnedAlpha
      > CELESTIAL_TALENT_TREE_UI_CONFIG.presentation.connectorReadyAlpha
    && CELESTIAL_TALENT_TREE_UI_CONFIG.presentation.connectorReadyAlpha
      > CELESTIAL_TALENT_TREE_UI_CONFIG.presentation.connectorLockedAlpha,
  "selected, owned, reachable, and future routes need an obvious visual hierarchy",
);
assert.match(
  CELESTIAL_TALENT_TREE_UI_CONFIG.assets.nodeFrame.path,
  /celestial-overhaul-v2\/talent-node-frame-v2\.png$/,
);
assert.match(
  CELESTIAL_TALENT_TREE_UI_CONFIG.assets.connector.path,
  /celestial-overhaul-v2\/talent-connector-v2\.png$/,
);
assert.match(
  CELESTIAL_TALENT_TREE_UI_CONFIG.assets.tooltip.path,
  /celestial-overhaul-v2\/talent-tooltip-v2\.png$/,
);
assert.deepEqual(CELESTIAL_TALENT_TREE_UI_CONFIG.layout.branchCenterXFractions, [0.194, 0.5, 0.804]);
assert.equal(CELESTIAL_TALENT_TREE_UI_CONFIG.layout.rowYFractions.length, 5);
assert.ok(
  CELESTIAL_TALENT_TREE_UI_CONFIG.layout.rowYFractions
    .every((value, index, all) => index === 0 || value < all[index - 1]),
);
assert.deepEqual(
  CELESTIAL_TALENT_TREE_UI_CONFIG.layout.rowYFractions,
  [0.71, 0.59, 0.49, 0.35, 0.235],
);
assert.ok(
  CELESTIAL_TALENT_TREE_UI_CONFIG.layout.closeYFraction
    < CELESTIAL_TALENT_TREE_UI_CONFIG.layout.headerYFraction,
  "ESC must stay above the money and Star Point plaques",
);
assert.match(
  CELESTIAL_TALENT_TREE_UI_CONFIG.copy.subtitle,
  /TALENT POINTS UNLOCK NODES.*STAR POINTS UPGRADE THEIR RANKS/,
);
assert.match(describeCelestialTalentAvailability({ reason: "level-locked", requiredLevel: 4 }), /4/);
assert.match(describeCelestialTalentAvailability({ reason: "insufficient-stars", starsCost: 75, starsBalance: 12 }), /75 Star Points/);
assert.match(describeCelestialTalentAvailability({ reason: "root-choice-locked" }), /top node/);
for (const branch of CELESTIAL_TALENT_PROGRESSION_CONFIG.branches) {
  assert.equal(branch.nodes.filter(node => node.row === 1).length, 3);
  assert.equal(branch.nodes.filter(node => node.row === 2).length, 3);
  assert.deepEqual(
    branch.nodes.filter(node => node.kind === "capstone").map(node => node.lane),
    [-1, 0, 1],
  );
  assert.equal(branch.nodes.filter(node => node.displayRole === "bridge").length, 1);
  assert.equal(branch.nodes.filter(node => node.kind === "apex").length, 1);
  assert.equal(branch.nodes.find(node => node.kind === "apex").row, 4);
  for (const node of branch.nodes) {
    assert.ok(
      CELESTIAL_TALENT_TREE_UI_CONFIG.assets.nodeIconKeys[node.id],
      `${node.id} must have a resident authored icon`,
    );
  }
}

const sources = await Promise.all([
  "../ui/overlays/CelestialTalentTreeView.js",
  "../ui/overlays/CelestialTalentTreeNodeView.js",
  "../ui/overlays/CelestialTalentTreeConnectorLayer.js",
  "../ui/overlays/CelestialTalentTooltipView.js",
].map(path => readFile(new URL(path, import.meta.url), "utf8")));
for (const source of sources) {
  assert.doesNotMatch(source, /\.add\.(graphics|rectangle|circle)\(/i);
}
assert.match(sources[0], /purchaseNode/);
assert.match(sources[0], /handleInput/);
assert.match(sources[0], /getCelestialTalentNodePosition/);
assert.match(sources[0], /expectedNodeCount/);
assert.match(sources[0], /talentPointsTitle/);
assert.match(sources[0], /starPointsTitle/);
assert.match(sources[0], /upgradeNode/);
assert.match(sources[0], /CelestialTalentTooltipView/);
assert.match(sources[0], /view\.snapshot\?\.available === true/);
assert.doesNotMatch(sources[0], /nodes\.length === 15|columnXFractions|nodeYFractions/);
assert.match(sources[1], /pointerover/);
assert.match(sources[1], /nodeSizeByKindPx/);
assert.match(sources[1], /preLevelGate/);
assert.match(sources[1], /this\.node\.kind === "ability"/);
assert.match(sources[1], /insufficient-talent-points/);
assert.match(sources[1], /rootChoiceGate/);
assert.doesNotMatch(sources[1], /copy\.nodeLocked/);
assert.doesNotMatch(sources[1], /nodeSizesPx/);
assert.match(sources[2], /connectorKeysByBranch/);
assert.match(sources[2], /this\.scene\.add\.image/);
assert.match(sources[2], /selectedNodeId/);
assert.match(sources[2], /getStateSnapshot/);
assert.doesNotMatch(sources[2], /const image = scene\.add/);
assert.match(sources[0], /deltaX/);
assert.match(sources[0], /deltaY/);
assert.match(sources[3], /describeCelestialTalentAvailability/);
assert.match(sources[3], /assets\.tooltip\.key/);

console.log("PASS Celestial tree UI: resident icons, three choices, popup, and authored-only presentation");
