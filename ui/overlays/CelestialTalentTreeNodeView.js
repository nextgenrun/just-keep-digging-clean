// One image-backed node in the full Celestial talent tree.

import { CELESTIAL_TALENT_TREE_UI_CONFIG } from "../../values/celestialTalentTreeUi.js";
import { UI_FONTS } from "../../values/uiLayout.js";

export class CelestialTalentTreeNodeView {
  constructor(scene, node, iconKey, accent, callbacks = {}) {
    this.scene = scene;
    this.node = node;
    this.callbacks = callbacks;
    const { assets, layout, presentation } = CELESTIAL_TALENT_TREE_UI_CONFIG;
    const size = layout.nodeSizesPx[node.tier];
    this.root = scene.add.container(0, 0)
      .setSize(layout.nodeHitWidthPx, layout.nodeHitHeightPx)
      .setInteractive({ useHandCursor: true });
    this.halo = scene.add.image(0, 0, iconKey)
      .setDisplaySize(size * 1.22, size * 1.22)
      .setTint(accent)
      .setAlpha(0);
    this.icon = scene.add.image(0, 0, iconKey)
      .setDisplaySize(size, size);
    this.lock = scene.add.image(0, 0, assets.lock)
      .setDisplaySize(layout.lockSizePx, layout.lockSizePx)
      .setVisible(false);
    this.status = scene.add.text(0, layout.nodeStatusOffsetYPx, "", {
      fontFamily: UI_FONTS.mono,
      fontSize: `${presentation.nodeStatusFontSizePx}px`,
      fontStyle: "bold",
      color: presentation.bodyColor,
      stroke: presentation.shadowColor,
      strokeThickness: presentation.shadowThicknessPx,
      align: "center",
    }).setOrigin(0.5);
    this.root.add([this.halo, this.icon, this.lock, this.status]);
    this._bind();
  }

  _bind() {
    this.root.on("pointerover", () => this.callbacks.onHover?.(this));
    this.root.on("pointerout", () => this.callbacks.onOut?.(this));
    this.root.on("pointerdown", () => this.callbacks.onActivate?.(this));
  }

  setState(snapshot, selected = false) {
    this.snapshot = snapshot;
    const { presentation } = CELESTIAL_TALENT_TREE_UI_CONFIG;
    const purchased = snapshot?.purchased === true;
    const available = snapshot?.available === true;
    this.icon.clearTint();
    if (purchased) {
      this.icon.setAlpha(presentation.purchasedAlpha);
      this.status.setText(CELESTIAL_TALENT_TREE_UI_CONFIG.copy.owned)
        .setColor(presentation.ownedColor);
    } else if (available) {
      this.icon.setAlpha(presentation.availableAlpha);
      this.status.setText(snapshot.starsCost > 0 ? `${snapshot.starsCost} STARS` : "FREE")
        .setColor(presentation.readyColor);
    } else {
      this.icon.setTint(0x69747f).setAlpha(presentation.lockedAlpha);
      const lockedLabel = snapshot?.reason === "insufficient-stars"
        ? (snapshot.starsCost + " STARS")
        : snapshot?.reason === "root-choice-locked"
          ? "FINISH PATH"
          : snapshot?.reason === "prerequisite-locked"
            ? "PREVIOUS NODE"
            : snapshot?.reason === "talents-locked"
              ? "LV 20"
              : "LV " + (snapshot?.requiredLevel || 20);
      this.status.setText(lockedLabel).setColor(presentation.lockedColor);
    }
    this.lock.setVisible(!purchased && !available);
    this.halo.setAlpha(selected || purchased ? presentation.haloAlpha : 0);
    this.root.setScale(selected ? presentation.selectedScale : 1);
  }

  setPosition(x, y) {
    this.root.setPosition(x, y);
  }

  destroy() {
    this.root.removeAllListeners();
    this.root.destroy(true);
  }
}
