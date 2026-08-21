// One image-backed node in the full Celestial talent tree.

import { CELESTIAL_TALENT_TREE_UI_CONFIG } from "../../values/celestialTalentTreeUi.js";
import { UI_FONTS } from "../../values/uiLayout.js";

export class CelestialTalentTreeNodeView {
  constructor(scene, node, iconKey, accent, callbacks = {}) {
    this.scene = scene;
    this.node = node;
    this.callbacks = callbacks;
    this.baseScale = 1;
    this.selected = false;
    const { assets, layout, presentation } = CELESTIAL_TALENT_TREE_UI_CONFIG;
    const size = layout.nodeSizeByKindPx[node.kind]
      || layout.nodeSizeByKindPx.upgrade;
    this.root = scene.add.container(0, 0);
    this.halo = scene.add.image(0, 0, assets.nodeHalo.key)
      .setDisplaySize(size * layout.haloWidthScale, size * layout.haloHeightScale)
      .setTint(accent)
      .setAlpha(0);
    this.icon = scene.add.image(0, 0, iconKey)
      .setDisplaySize(size, size);
    this.frame = scene.add.image(0, 0, assets.nodeFrame.key)
      .setDisplaySize(
        size * layout.nodeFrameScale,
        size * layout.nodeFrameScale,
      );
    this.lock = scene.add.image(0, 0, assets.lock.key)
      .setDisplaySize(layout.lockWidthPx, layout.lockHeightPx)
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
    // Reuse the authored halo as a near-transparent display hit target. The
    // immersive container transform made Phaser Zone hit tests unreliable in
    // real browser input, while an Image retains the same visual-art contract.
    this.hit = scene.add.image(
      0,
      0,
      assets.nodeHalo.key,
    )
      .setDisplaySize(layout.nodeHitWidthPx, layout.nodeHitHeightPx)
      .setAlpha(0.001)
      .setInteractive({ useHandCursor: true });
    this.root.add([
      this.halo,
      this.icon,
      this.frame,
      this.lock,
      this.status,
      this.hit,
    ]);
    this._fitIcon(size * layout.nodeIconScale);
    this._bind();
  }

  _fitIcon(maxSize) {
    const frame = this.scene.textures?.getFrame?.(this.icon.texture?.key);
    const width = Number(frame?.realWidth || frame?.width) || maxSize;
    const height = Number(frame?.realHeight || frame?.height) || maxSize;
    const scale = Math.min(maxSize / width, maxSize / height);
    this.icon.setDisplaySize(width * scale, height * scale);
  }

  _bind() {
    this.hit.on("pointerover", () => this.callbacks.onHover?.(this));
    this.hit.on("pointerout", () => this.callbacks.onOut?.(this));
  }

  setState(snapshot, selected = false) {
    this.snapshot = snapshot;
    const { presentation } = CELESTIAL_TALENT_TREE_UI_CONFIG;
    const purchased = snapshot?.purchased === true;
    const available = snapshot?.available === true;
    this.icon.clearTint();
    if (purchased) {
      this.icon.setAlpha(presentation.purchasedAlpha);
      this.status.setText(CELESTIAL_TALENT_TREE_UI_CONFIG.copy.nodeOwned)
        .setColor(presentation.ownedColor);
    } else if (available) {
      this.icon.setAlpha(presentation.availableAlpha);
      this.status.setText(snapshot.starsCost > 0 ? `${snapshot.starsCost} SP` : "FREE")
        .setColor(presentation.readyColor);
    } else {
      this.icon.setTint(presentation.lockedTint).setAlpha(presentation.lockedAlpha);
      const preLevelGate = snapshot?.reason === "talents-locked";
      this.status.setText(preLevelGate
        ? this.node.kind === "ability" ? "LV 20" : ""
        : CELESTIAL_TALENT_TREE_UI_CONFIG.copy.nodeLocked)
        .setColor(presentation.lockedColor);
    }
    const preLevelGate = snapshot?.reason === "talents-locked";
    this.lock.setVisible(
      !purchased
        && !available
        && (!preLevelGate || this.node.kind === "ability"),
    );
    this.halo.setAlpha(selected
      ? presentation.haloAlpha
      : purchased
        ? presentation.purchasedHaloAlpha
        : 0);
    this.selected = selected;
    this._applyScale();
  }

  _applyScale() {
    const selectedScale = this.selected
      ? CELESTIAL_TALENT_TREE_UI_CONFIG.presentation.selectedScale
      : 1;
    this.root.setScale(this.baseScale * selectedScale);
  }

  setFocusScale(scale = 1) {
    this.baseScale = Math.max(0.5, Number(scale) || 1);
    this._applyScale();
  }

  setBranchVisibility(visible) {
    this.root.setVisible(visible === true);
  }

  setCompactStatus(compact) {
    this.status.setVisible(compact !== true);
  }

  setPosition(x, y) {
    this.root.setPosition(x, y);
  }

  destroy() {
    this.hit?.removeAllListeners?.();
    this.root.destroy(true);
  }
}
