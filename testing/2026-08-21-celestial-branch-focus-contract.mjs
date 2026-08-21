import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { CELESTIAL_TALENT_PROGRESSION_CONFIG } from
  "../values/celestialTalentProgression.js";
import {
  CELESTIAL_TALENT_TREE_UI_CONFIG,
  describeCelestialTalentComparison,
  getCelestialTalentFocusedNodePosition,
} from "../values/celestialTalentTreeUi.js";

const { layout } = CELESTIAL_TALENT_TREE_UI_CONFIG;
assert.ok(layout.branchFocusScaleThreshold > layout.compactStatusScaleThreshold);
assert.ok(layout.focusedNodeScale >= 1.25);
assert.ok(layout.focusedLaneStepXFraction > layout.laneStepXFraction);
assert.ok(layout.branchTabWidthPx >= 240 && layout.branchTabHeightPx >= 48);

for (const branch of CELESTIAL_TALENT_PROGRESSION_CONFIG.branches) {
  for (const node of branch.nodes) {
    const position = getCelestialTalentFocusedNodePosition(node);
    assert.ok(position.xFraction >= 0.25 && position.xFraction <= 0.75);
    assert.ok(position.yFraction >= 0.2 && position.yFraction <= 0.7);
  }
}

const example = CELESTIAL_TALENT_PROGRESSION_CONFIG.branches[0].nodes[1];
assert.match(
  describeCelestialTalentComparison(example, { purchased: false }),
  /CURRENT: INACTIVE[\s\S]*AFTER UNLOCK:[\s\S]*0\.8 tiles per second/,
);
assert.match(
  describeCelestialTalentComparison(example, { purchased: true }),
  /CURRENT: ACTIVE[\s\S]*ALREADY MASTERED/,
);

const [viewSource, nodeSource, connectorSource] = await Promise.all([
  readFile(new URL("../ui/overlays/CelestialTalentTreeView.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/overlays/CelestialTalentTreeNodeView.js", import.meta.url), "utf8"),
  readFile(new URL("../ui/overlays/CelestialTalentTreeConnectorLayer.js", import.meta.url), "utf8"),
]);
assert.match(viewSource, /setBranchFocus\(/);
assert.match(viewSource, /branchFocusSource = "responsive"/);
assert.match(viewSource, /focusedBranchIndex !== null/);
assert.match(viewSource, /describeCelestialTalentComparison/);
assert.match(viewSource, /visibleNodeCount/);
assert.match(nodeSource, /setBranchVisibility/);
assert.match(nodeSource, /setFocusScale/);
assert.match(connectorSource, /setVisible\(visible\)/);
assert.match(connectorSource, /destinationView\.root\.x - sourceView\.root\.x/);
for (const source of [viewSource, nodeSource, connectorSource]) {
  assert.doesNotMatch(source, /\.add\.(graphics|rectangle|circle)\(/i);
}

console.log("CELESTIAL_BRANCH_FOCUS_CONTRACT_OK");
