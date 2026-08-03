import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CELESTIAL_TALENT_TREE_PRELOAD_ASSETS,
  CELESTIAL_TALENT_TREE_UI_CONFIG,
  describeCelestialTalentAvailability,
} from "../values/celestialTalentTreeUi.js";

assert.equal(CELESTIAL_TALENT_TREE_PRELOAD_ASSETS.length, 1);
assert.match(CELESTIAL_TALENT_TREE_PRELOAD_ASSETS[0].path, /celestial-talent-foundation-v1\.png$/);
assert.deepEqual(CELESTIAL_TALENT_TREE_UI_CONFIG.layout.columnXFractions, [0.2, 0.5, 0.8]);
assert.equal(CELESTIAL_TALENT_TREE_UI_CONFIG.layout.nodeYFractions.length, 5);
assert.ok(
  CELESTIAL_TALENT_TREE_UI_CONFIG.layout.nodeYFractions
    .every((value, index, all) => index === 0 || value < all[index - 1]),
);
assert.match(CELESTIAL_TALENT_TREE_UI_CONFIG.copy.subtitle, /BOTTOM.*UPWARD/);
assert.match(describeCelestialTalentAvailability({ reason: "level-locked", requiredLevel: 28 }), /28/);
assert.match(describeCelestialTalentAvailability({ reason: "insufficient-stars", starsCost: 75, starsBalance: 12 }), /75 Stars/);
assert.match(describeCelestialTalentAvailability({ reason: "root-choice-locked" }), /Complete/);

const sources = await Promise.all([
  "../ui/overlays/CelestialTalentTreeView.js",
  "../ui/overlays/CelestialTalentTreeNodeView.js",
].map(path => readFile(new URL(path, import.meta.url), "utf8")));
for (const source of sources) {
  assert.doesNotMatch(source, /\.add\.(graphics|rectangle|circle)\(/i);
}
assert.match(sources[0], /purchaseNode/);
assert.match(sources[0], /handleInput/);
assert.match(sources[0], /nodes\.length === 15/);
assert.match(sources[1], /pointerover/);
assert.match(sources[0], /current\.tier - Math\.sign\(dy/);

console.log("Celestial talent tree UI contract passed.");
