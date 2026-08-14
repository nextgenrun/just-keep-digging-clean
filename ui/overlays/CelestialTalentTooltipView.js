// Owns the authored image-backed description popup for one Celestial talent.

import {
  CELESTIAL_TALENT_TREE_UI_CONFIG,
  describeCelestialTalentAvailability,
  getCelestialTalentChoiceLabel,
} from "../../values/celestialTalentTreeUi.js";
import { UI_FONTS } from "../../values/uiLayout.js";

export class CelestialTalentTooltipView {
  constructor(scene, parent) {
    this.scene = scene;
    this.config = CELESTIAL_TALENT_TREE_UI_CONFIG;
    this.nodeId = null;
    this.visible = false;
    const { assets, layout, presentation } = this.config;
    this.root = scene.add.container(0, 0).setVisible(false);
    this.frame = scene.add.image(0, 0, assets.tooltip.key)
      .setDisplaySize(layout.tooltipWidthPx, layout.tooltipHeightPx);
    this.title = this._text(
      layout.tooltipTitleOffsetYPx,
      presentation.tooltipTitleFontSizePx,
      presentation.titleColor,
    );
    this.meta = this._text(
      layout.tooltipMetaOffsetYPx,
      presentation.tooltipMetaFontSizePx,
      presentation.dimColor,
    );
    this.body = this._text(
      layout.tooltipBodyOffsetYPx,
      presentation.tooltipBodyFontSizePx,
      presentation.bodyColor,
      layout.tooltipBodyWidthPx,
    );
    this.status = this._text(
      layout.tooltipStatusOffsetYPx,
      presentation.tooltipStatusFontSizePx,
      presentation.readyColor,
      layout.tooltipBodyWidthPx,
    );
    this.root.add([this.frame, this.title, this.meta, this.body, this.status]);
    parent.add(this.root);
  }

  _text(y, size, color, wrapWidth = null) {
    const presentation = this.config.presentation;
    const style = {
      fontFamily: UI_FONTS.display,
      fontSize: `${size}px`,
      fontStyle: "bold",
      color,
      align: "center",
      stroke: presentation.shadowColor,
      strokeThickness: presentation.shadowThicknessPx,
    };
    if (wrapWidth) style.wordWrap = { width: wrapWidth };
    return this.scene.add.text(0, y, "", style).setOrigin(0.5);
  }

  show(nodeView, snapshot) {
    if (!nodeView || !snapshot) return false;
    const { copy, layout, presentation } = this.config;
    const node = nodeView.node;
    const price = snapshot.starsCost > 0
      ? `${snapshot.starsCost} ${copy.starPointLabel}`
      : copy.free;
    this.nodeId = node.id;
    this.nodeView = nodeView;
    this.title.setText(node.name.toUpperCase());
    this.meta.setText([
      getCelestialTalentChoiceLabel(node),
      node.path,
      `${copy.levelLabel} ${node.requiredLevel}`,
      price,
    ].join("  •  "));
    this.body.setText(node.description);
    this.status.setText(describeCelestialTalentAvailability(snapshot));
    this.status.setColor(snapshot.purchased
      ? presentation.ownedColor
      : snapshot.available
        ? presentation.readyColor
        : presentation.lockedColor);
    this._position(nodeView);
    this.visible = true;
    this.root.setVisible(true);
    return true;
  }

  _position(nodeView) {
    const layout = this.config.layout;
    const halfWidth = layout.tooltipWidthPx / 2;
    const halfHeight = layout.tooltipHeightPx / 2;
    const halfReferenceWidth = layout.referenceWidthPx / 2;
    const halfReferenceHeight = layout.referenceHeightPx / 2;
    const branchDirection = nodeView.branchIndex === 0
      ? 1
      : nodeView.branchIndex === 2
        ? -1
        : nodeView.lane > 0 ? -1 : 1;
    const isApexChoice = nodeView.node.kind === "capstone";
    const requestedX = isApexChoice
      ? nodeView.root.x
      : nodeView.root.x + branchDirection * (
        layout.nodeHitWidthPx / 2 + layout.tooltipGapPx + halfWidth
      );
    const x = Math.max(
      -halfReferenceWidth + layout.tooltipViewportMarginPx + halfWidth,
      Math.min(
        halfReferenceWidth - layout.tooltipViewportMarginPx - halfWidth,
        requestedX,
      ),
    );
    const requestedY = isApexChoice
      ? nodeView.root.y + layout.nodeHitHeightPx / 2
        + layout.tooltipGapPx + halfHeight
      : nodeView.root.y;
    const y = Math.max(
      -halfReferenceHeight + layout.tooltipViewportMarginPx + halfHeight,
      Math.min(
        halfReferenceHeight - layout.tooltipViewportMarginPx - halfHeight,
        requestedY,
      ),
    );
    this.root.setPosition(x, y);
  }

  refresh(snapshot) {
    if (!this.visible || !this.nodeView || snapshot?.id !== this.nodeId) return false;
    return this.show(this.nodeView, snapshot);
  }

  hide() {
    this.nodeId = null;
    this.nodeView = null;
    this.visible = false;
    this.root.setVisible(false);
  }

  destroy() {
    this.hide();
    this.root.destroy(true);
    this.scene = null;
  }
}
