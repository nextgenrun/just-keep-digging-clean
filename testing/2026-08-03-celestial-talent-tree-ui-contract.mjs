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

assert.equal(CELESTIAL_TALENT_TREE_PRELOAD_ASSETS.length, 39);
assert.equal(CELESTIAL_TALENT_NODE_ICON_ASSETS.length, 33);
assert.equal(
  new Set(CELESTIAL_TALENT_NODE_ICON_ASSETS.map(asset => asset.key)).size,
  33,
  "every talent node must own a unique runtime texture key",
);
assert.equal(
  new Set(CELESTIAL_TALENT_NODE_ICON_ASSETS.map(asset => asset.path)).size,
  33,
  "every talent node must own a unique authored bitmap",
);
assert.ok(
  CELESTIAL_TALENT_NODE_ICON_ASSETS.every(asset => (
    asset.path.startsWith("sprites/UI/celestial-overhaul-v1/talent-icon-")
      && asset.path.endsWith("-v1.png")
  )),
);
const iconPayloads = await Promise.all(
  CELESTIAL_TALENT_NODE_ICON_ASSETS.map(asset => (
    readFile(new URL(`../${asset.path}`, import.meta.url))
  )),
);
for (const payload of iconPayloads) {
  assert.equal(payload.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(payload.readUInt32BE(16), 256, "talent icons must be 256 px wide");
  assert.equal(payload.readUInt32BE(20), 256, "talent icons must be 256 px tall");
  assert.equal(payload[25], 6, "talent icons must remain RGBA PNGs");
}
assert.equal(
  new Set(iconPayloads.map(payload => (
    createHash("sha256").update(payload).digest("hex")
  ))).size,
  33,
  "all 33 resident icon files must remain byte-distinct",
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
  CELESTIAL_TALENT_TREE_UI_CONFIG.presentation.haloAlpha
    > CELESTIAL_TALENT_TREE_UI_CONFIG.presentation.purchasedHaloAlpha,
  "selection focus must be stronger than the purchased-state halo",
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
assert.equal(CELESTIAL_TALENT_TREE_UI_CONFIG.layout.rowYFractions.length, 4);
assert.ok(
  CELESTIAL_TALENT_TREE_UI_CONFIG.layout.rowYFractions
    .every((value, index, all) => index === 0 || value < all[index - 1]),
);
assert.deepEqual(
  CELESTIAL_TALENT_TREE_UI_CONFIG.layout.rowYFractions,
  [0.695, 0.552, 0.455, 0.235],
);
assert.ok(
  CELESTIAL_TALENT_TREE_UI_CONFIG.layout.closeYFraction
    < CELESTIAL_TALENT_TREE_UI_CONFIG.layout.headerYFraction,
  "ESC must stay above the money and Star Point plaques",
);
assert.match(CELESTIAL_TALENT_TREE_UI_CONFIG.copy.subtitle, /LEVEL 3.*MASTER UPWARD/);
assert.match(describeCelestialTalentAvailability({ reason: "level-locked", requiredLevel: 4 }), /4/);
assert.match(describeCelestialTalentAvailability({ reason: "insufficient-stars", starsCost: 75, starsBalance: 12 }), /75 Star Points/);
assert.match(describeCelestialTalentAvailability({ reason: "root-choice-locked" }), /Complete/);
for (const branch of CELESTIAL_TALENT_PROGRESSION_CONFIG.branches) {
  assert.equal(branch.nodes.filter(node => node.row === 1).length, 3);
  assert.equal(branch.nodes.filter(node => node.row === 2).length, 3);
  assert.deepEqual(
    branch.nodes.filter(node => node.kind === "capstone").map(node => node.lane),
    [-1, 0, 1],
  );
  assert.equal(branch.nodes.filter(node => node.displayRole === "bridge").length, 1);
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
assert.match(sources[0], /STAR POINTS/);
assert.match(sources[0], /CelestialTalentTooltipView/);
assert.match(sources[0], /view\.snapshot\?\.available === true/);
assert.doesNotMatch(sources[0], /nodes\.length === 15|columnXFractions|nodeYFractions/);
assert.match(sources[1], /pointerover/);
assert.match(sources[1], /nodeSizeByKindPx/);
assert.match(sources[1], /preLevelGate/);
assert.match(sources[1], /this\.node\.kind === "ability"/);
assert.doesNotMatch(sources[1], /nodeSizesPx/);
assert.match(sources[2], /connectorKeysByBranch/);
assert.match(sources[2], /this\.scene\.add\.image/);
assert.doesNotMatch(sources[2], /const image = scene\.add/);
assert.match(sources[0], /deltaX/);
assert.match(sources[0], /deltaY/);
assert.match(sources[3], /describeCelestialTalentAvailability/);
assert.match(sources[3], /assets\.tooltip\.key/);

console.log("PASS Celestial tree UI: resident icons, three choices, popup, and authored-only presentation");
