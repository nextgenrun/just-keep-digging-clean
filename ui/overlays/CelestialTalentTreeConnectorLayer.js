import {
  CELESTIAL_TALENT_TREE_UI_CONFIG,
  getCelestialTalentNodePosition,
} from "../../values/celestialTalentTreeUi.js";

function localPoint(branchIndex, node) {
  const layout = CELESTIAL_TALENT_TREE_UI_CONFIG.layout;
  const position = getCelestialTalentNodePosition(branchIndex, node);
  return {
    x: (position.xFraction - 0.5) * layout.referenceWidthPx,
    y: (position.yFraction - 0.5) * layout.referenceHeightPx,
  };
}

export class CelestialTalentTreeConnectorLayer {
  constructor(scene, root, branches = []) {
    this.scene = scene;
    this.root = root;
    this.items = [];
    this._build(branches);
  }

  _build(branches) {
    const { assets, layout, presentation } = CELESTIAL_TALENT_TREE_UI_CONFIG;
    const locations = new Map();
    branches.forEach((branch, branchIndex) => {
      branch.nodes.forEach(node => locations.set(node.id, {
        branchIndex,
        node,
        point: localPoint(branchIndex, node),
      }));
    });

    branches.forEach((branch, branchIndex) => {
      const textureKey = assets.connectorKeysByBranch[branch.id];
      branch.nodes.forEach(node => {
        const destination = locations.get(node.id);
        node.prerequisiteIds.forEach(sourceId => {
          const source = locations.get(sourceId);
          if (!source || !destination || !textureKey) return;
          const dx = destination.point.x - source.point.x;
          const dy = destination.point.y - source.point.y;
          const length = Math.max(1, Math.hypot(dx, dy));
          const image = this.scene.add.image(
            source.point.x + dx / 2,
            source.point.y + dy / 2,
            textureKey,
          ).setDisplaySize(length, layout.connectorThicknessPx)
            .setRotation(Math.atan2(dy, dx))
            .setTint(presentation.branchAccents[branchIndex])
            .setAlpha(presentation.connectorLockedAlpha);
          this.root.add(image);
          this.items.push({
            image, sourceId, destinationId: node.id, branchIndex, branchId: branch.id, length,
            state: "locked",
          });
        });
      });
    });
  }

  refresh(nodesById, selectedNodeId = null) {
    const { layout, presentation } = CELESTIAL_TALENT_TREE_UI_CONFIG;
    this.items.forEach(item => {
      const source = nodesById.get(item.sourceId)?.snapshot;
      const destination = nodesById.get(item.destinationId)?.snapshot;
      const selected = item.sourceId === selectedNodeId
        || item.destinationId === selectedNodeId;
      const owned = source?.purchased === true && destination?.purchased === true;
      const ready = source?.purchased === true && (
        destination?.available === true
        || destination?.reason === "insufficient-talent-points"
      );
      item.state = selected ? "selected" : owned ? "owned" : ready ? "ready" : "locked";
      const alpha = presentation[`connector${item.state[0].toUpperCase()}${item.state.slice(1)}Alpha`];
      const thicknessScale = presentation.connectorThicknessScaleByState[item.state];
      item.image
        .setAlpha(alpha)
        .setDisplaySize(item.length, layout.connectorThicknessPx * thicknessScale);
    });
  }

  setBranch(branchId) {
    this.items.forEach(item => item.image.setVisible(item.branchId === branchId));
  }

  getStateSnapshot() {
    return Object.freeze(this.items.reduce((counts, item) => {
      if (item.image.visible) counts[item.state] += 1;
      return counts;
    }, { locked: 0, ready: 0, owned: 0, selected: 0 }));
  }

  get count() {
    return this.items.length;
  }

  destroy() {
    this.items = [];
    this.scene = null;
    this.root = null;
  }
}
