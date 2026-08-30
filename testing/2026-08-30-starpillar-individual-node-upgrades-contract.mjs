import assert from "node:assert/strict";

import { CelestialTalentProgressionSystem } from
  "../systems/progression/CelestialTalentProgressionSystem.js";
import { CelestialTalentTreeView } from
  "../ui/overlays/CelestialTalentTreeView.js";
import { CELESTIAL_TALENT_TREE_UI_CONFIG } from
  "../values/celestialTalentTreeUi.js";

const progression = new CelestialTalentProgressionSystem({
  getPlayerLevel: () => 5,
});
progression.grantStars(100, { source: "individual-node-contract" });
assert.equal(progression.purchaseNode("wayward-star-root").ok, true);

function getNodeSnapshot(nodeId) {
  return progression.getSnapshot().branches
    .flatMap(branch => branch.nodes)
    .find(node => node.id === nodeId);
}

function makeNodeView(nodeId) {
  return {
    node: { id: nodeId },
    snapshot: getNodeSnapshot(nodeId),
    root: {
      getWorldTransformMatrix: () => ({
        applyInverse: () => ({ x: 0, y: 0 }),
      }),
    },
  };
}

const purchaseEvents = [];
const selectedNodes = [];
const tree = {
  config: CELESTIAL_TALENT_TREE_UI_CONFIG,
  progression,
  selectedIndex: 0,
  tooltip: { visible: false, nodeId: null },
  root: {
    getWorldTransformMatrix: () => ({
      applyInverse: () => ({ x: 10000, y: 10000 }),
    }),
  },
  _x: CelestialTalentTreeView.prototype._x,
  _y: CelestialTalentTreeView.prototype._y,
  isOpen: () => true,
  selectNode(nodeId, showPopup) {
    selectedNodes.push(nodeId);
    this.tooltip.visible = showPopup === true;
    this.tooltip.nodeId = showPopup ? nodeId : null;
    this.nodes[0].snapshot = getNodeSnapshot(nodeId);
    return true;
  },
  refresh() {
    this.nodes[0].snapshot = getNodeSnapshot(this.nodes[0].node.id);
  },
  onNodePurchased: result => purchaseEvents.push(result),
};
tree.purchaseNode = nodeId => (
  CelestialTalentTreeView.prototype.purchaseNode.call(tree, nodeId)
);

tree.nodes = [makeNodeView("wayward-ricochet-matrix")];
assert.equal(tree.nodes[0].snapshot.available, true);
assert.equal(tree.tooltip.visible, false, "touch starts without hover confirmation");
assert.equal(
  CelestialTalentTreeView.prototype._handlePointerDown.call(tree, { x: 1, y: 1 }),
  true,
);

let snapshot = progression.getSnapshot();
assert.equal(snapshot.stars, 50);
assert.equal(snapshot.spentStars, 50);
assert.deepEqual(snapshot.purchasedNodeIds, [
  "wayward-star-root",
  "wayward-ricochet-matrix",
]);
assert.equal(getNodeSnapshot("wayward-stellar-bearings").purchased, false);
assert.deepEqual(selectedNodes, ["wayward-ricochet-matrix"]);
assert.equal(purchaseEvents.length, 1);
assert.equal(purchaseEvents[0].nodeId, "wayward-ricochet-matrix");

const saved = progression.getSaveData();
const reloaded = new CelestialTalentProgressionSystem({
  getPlayerLevel: () => 5,
});
reloaded.loadSaveData(saved);
assert.deepEqual(reloaded.getSaveData(), saved);

tree.nodes = [makeNodeView("wayward-impact-lattice")];
tree.tooltip.visible = false;
tree.tooltip.nodeId = null;
assert.equal(tree.nodes[0].snapshot.available, false);
assert.equal(
  CelestialTalentTreeView.prototype._handlePointerDown.call(tree, { x: 1, y: 1 }),
  true,
);
snapshot = progression.getSnapshot();
assert.equal(snapshot.stars, 50);
assert.equal(snapshot.spentStars, 50);
assert.equal(getNodeSnapshot("wayward-impact-lattice").purchased, false);
assert.equal(tree.tooltip.nodeId, "wayward-impact-lattice");
assert.equal(purchaseEvents.length, 1);

assert.match(CELESTIAL_TALENT_TREE_UI_CONFIG.copy.subtitle, /SPEND STAR POINTS/);
assert.match(CELESTIAL_TALENT_TREE_UI_CONFIG.copy.available, /tap to upgrade/i);

progression.destroy();
reloaded.destroy();
console.log("STARPILLAR_INDIVIDUAL_NODE_UPGRADES_OK");
