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
          this.items.push({ image, sourceId, destinationId: node.id, branchIndex });
        });
      });
    });
  }

  refresh(nodesById) {
    const presentation = CELESTIAL_TALENT_TREE_UI_CONFIG.presentation;
    this.items.forEach(item => {
      const destination = nodesById.get(item.destinationId)?.snapshot;
      const alpha = destination?.purchased
        ? presentation.connectorOwnedAlpha
        : destination?.available
          ? presentation.connectorReadyAlpha
          : presentation.connectorLockedAlpha;
      item.image.setAlpha(alpha);
    });
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
