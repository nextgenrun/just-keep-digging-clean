import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CELESTIAL_TALENT_TREE_PRELOAD_ASSETS,
  CELESTIAL_TALENT_TREE_UI_CONFIG,
  describeCelestialTalentAvailability,
} from "../values/celestialTalentTreeUi.js";

assert.equal(CELESTIAL_TALENT_TREE_PRELOAD_ASSETS.length, 4);
assert.match(CELESTIAL_TALENT_TREE_PRELOAD_ASSETS[0].path, /celestial-talent-foundation-v1\.png$/);
assert.deepEqual(CELESTIAL_TALENT_TREE_UI_CONFIG.layout.branchCenterXFractions, [0.219, 0.5, 0.781]);
assert.equal(CELESTIAL_TALENT_TREE_UI_CONFIG.layout.rowYFractions.length, 4);
assert.ok(
  CELESTIAL_TALENT_TREE_UI_CONFIG.layout.rowYFractions
    .every((value, index, all) => index === 0 || value < all[index - 1]),
);
assert.match(CELESTIAL_TALENT_TREE_UI_CONFIG.copy.subtitle, /LEVEL 20.*MASTER UPWARD/);
assert.match(describeCelestialTalentAvailability({ reason: "level-locked", requiredLevel: 28 }), /28/);
assert.match(describeCelestialTalentAvailability({ reason: "insufficient-stars", starsCost: 75, starsBalance: 12 }), /75 Star Points/);
assert.match(describeCelestialTalentAvailability({ reason: "root-choice-locked" }), /Complete/);

const sources = await Promise.all([
  "../ui/overlays/CelestialTalentTreeView.js",
  "../ui/overlays/CelestialTalentTreeNodeView.js",
  "../ui/overlays/CelestialTalentTreeConnectorLayer.js",
].map(path => readFile(new URL(path, import.meta.url), "utf8")));
for (const source of sources) {
  assert.doesNotMatch(source, /\.add\.(graphics|rectangle|circle)\(/i);
}
assert.match(sources[0], /purchaseNode/);
assert.match(sources[0], /handleInput/);
assert.match(sources[0], /getCelestialTalentNodePosition/);
assert.match(sources[0], /expectedNodeCount/);
assert.match(sources[0], /STAR POINTS/);
assert.doesNotMatch(sources[0], /nodes\.length === 15|columnXFractions|nodeYFractions/);
assert.match(sources[1], /pointerover/);
assert.match(sources[1], /nodeSizeByKindPx/);
assert.doesNotMatch(sources[1], /nodeSizesPx/);
assert.match(sources[2], /connectorKeysByBranch/);
assert.match(sources[2], /this\.scene\.add\.image/);
assert.doesNotMatch(sources[2], /const image = scene\.add/);
assert.match(sources[0], /deltaX/);
assert.match(sources[0], /deltaY/);

console.log("Celestial talent tree UI contract passed.");
