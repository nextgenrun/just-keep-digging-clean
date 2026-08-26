// Image-backed dynamic edge rendered behind interactive talent nodes.

import { CELESTIAL_TALENT_TREE_UI_CONFIG } from "../../values/celestialTalentTreeUi.js";

export class CelestialTalentTreeConnectorView {
  constructor(scene, fromNodeId, toNodeId, textureKey, accent) {
    this.fromNodeId = fromNodeId;
    this.toNodeId = toNodeId;
    this.image = scene.add.image(0, 0, textureKey)
      .setOrigin(0.5)
      .setTint(accent);
  }

  setGeometry(fromX, fromY, toX, toY) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.max(1, Math.hypot(dx, dy));
    this.image
      .setPosition(fromX + dx / 2, fromY + dy / 2)
      .setRotation(Math.atan2(dy, dx))
      .setDisplaySize(length, CELESTIAL_TALENT_TREE_UI_CONFIG.layout.connectorThicknessPx);
  }

  setState(fromSnapshot, toSnapshot) {
    const presentation = CELESTIAL_TALENT_TREE_UI_CONFIG.presentation;
    const fromOwned = (fromSnapshot?.currentRank || 0) > 0;
    const toOwned = (toSnapshot?.currentRank || 0) > 0;
    const alpha = fromOwned && toOwned
      ? presentation.connectorOwnedAlpha
      : fromOwned && toSnapshot?.available
        ? presentation.connectorReadyAlpha
        : presentation.connectorLockedAlpha;
    this.image.setAlpha(alpha);
  }

  destroy() {
    this.image.destroy();
  }
}
