import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CELESTIAL_TALENT_NODE_ICON_ASSETS,
  CELESTIAL_TALENT_TREE_PRELOAD_ASSETS,
  CELESTIAL_TALENT_TREE_UI_CONFIG,
  describeCelestialTalentAvailability,
} from "../values/celestialTalentTreeUi.js";
import { CELESTIAL_TALENT_PROGRESSION_CONFIG } from
  "../values/celestialTalentProgression.js";

assert.equal(CELESTIAL_TALENT_TREE_PRELOAD_ASSETS.length, 20);
assert.equal(CELESTIAL_TALENT_NODE_ICON_ASSETS.length, 14);
assert.equal(
  new Set(CELESTIAL_TALENT_TREE_PRELOAD_ASSETS.map(asset => asset.key)).size,
  CELESTIAL_TALENT_TREE_PRELOAD_ASSETS.length,
);
assert.match(CELESTIAL_TALENT_TREE_PRELOAD_ASSETS[0].path, /celestial-talent-foundation-v1\.png$/);
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
assert.match(CELESTIAL_TALENT_TREE_UI_CONFIG.copy.subtitle, /LEVEL 20.*MASTER UPWARD/);
assert.match(describeCelestialTalentAvailability({ reason: "level-locked", requiredLevel: 28 }), /28/);
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
assert.match(sources[0], /tooltip\.nodeId/);
assert.doesNotMatch(sources[0], /nodes\.length === 15|columnXFractions|nodeYFractions/);
assert.match(sources[1], /pointerover/);
assert.match(sources[1], /nodeSizeByKindPx/);
assert.doesNotMatch(sources[1], /nodeSizesPx/);
assert.match(sources[2], /connectorKeysByBranch/);
assert.match(sources[2], /this\.scene\.add\.image/);
assert.doesNotMatch(sources[2], /const image = scene\.add/);
assert.match(sources[0], /deltaX/);
assert.match(sources[0], /deltaY/);
assert.match(sources[3], /describeCelestialTalentAvailability/);
assert.match(sources[3], /assets\.tooltip\.key/);

console.log("PASS Celestial tree UI: resident icons, three choices, popup, and authored-only presentation");
