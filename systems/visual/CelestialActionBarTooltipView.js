// Owns the image-backed hover tooltip for Celestial actionbar availability.

import { CELESTIAL_ACTION_BAR_CONFIG } from "../../values/celestialActionBar.js";
import { UI_FONTS } from "../../values/uiLayout.js";

export class CelestialActionBarTooltipView {
  constructor(scene, textureKey) {
    this.scene = scene;
    this.config = CELESTIAL_ACTION_BAR_CONFIG;
    this.visible = false;
    const layout = this.config.layout;
    const presentation = this.config.presentation;
    this.root = scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(presentation.tooltipDepth)
      .setVisible(false);
    this.frame = scene.add.image(0, 0, textureKey)
      .setDisplaySize(layout.tooltipWidthPx, layout.tooltipHeightPx)
      .setAlpha(presentation.tooltipAlpha);
    this.title = scene.add.text(0, layout.tooltipTitleOffsetYPx, "", {
      fontFamily: UI_FONTS.display,
      fontSize: `${presentation.tooltipTitleFontSizePx}px`,
      fontStyle: "bold",
      color: presentation.textColor,
      stroke: presentation.shadowColor,
      strokeThickness: presentation.shadowThicknessPx,
    }).setOrigin(0.5);
    this.body = scene.add.text(0, layout.tooltipBodyOffsetYPx, "", {
      fontFamily: UI_FONTS.display,
      fontSize: `${presentation.tooltipBodyFontSizePx}px`,
      fontStyle: "bold",
      color: presentation.secondaryTextColor,
      align: "center",
      wordWrap: { width: layout.tooltipBodyWidthPx },
      stroke: presentation.shadowColor,
      strokeThickness: presentation.shadowThicknessPx,
    }).setOrigin(0.5);
    this.root.add([this.frame, this.title, this.body]);
  }

  show(slot, title, body) {
    this.slot = slot;
    this.title.setText(title);
    this.body.setText(body);
    this.visible = true;
    this.resize(this.viewportWidth, this.barCenterY, this.uiScale);
    this.root.setVisible(true);
  }

  hide() {
    this.slot = null;
    this.visible = false;
    this.root.setVisible(false);
  }

  resize(viewportWidth, barCenterY, uiScale, barLeft = this.barLeft) {
    this.viewportWidth = viewportWidth;
    this.barCenterY = barCenterY;
    this.uiScale = uiScale;
    this.barLeft = barLeft;
    if (!this.slot || !Number.isFinite(viewportWidth)) return;
    const layout = this.config.layout;
    const tooltipScale = Math.max(uiScale, layout.tooltipMinimumScreenScale);
    const halfWidth = layout.tooltipWidthPx * tooltipScale / 2;
    const margin = layout.viewportMarginPx * tooltipScale;
    const rightOfTooltip = Number.isFinite(barLeft)
      ? barLeft - layout.tooltipGapPx * uiScale - halfWidth
      : this.slot.basePosition.x;
    const x = Math.max(margin + halfWidth, Math.min(
      viewportWidth - margin - halfWidth,
      this.slot.basePosition.x,
      rightOfTooltip,
    ));
    const y = barCenterY - (
      layout.foundationHeightPx / 2
    ) * uiScale - (
      layout.tooltipGapPx * uiScale
      + layout.tooltipHeightPx * tooltipScale / 2
    );
    this.root.setPosition(x, y).setScale(tooltipScale);
  }

  setParentVisible(visible) {
    this.root.setVisible(visible === true && this.visible);
  }

  destroy() {
    this.hide();
    this.root.destroy(true);
  }
}
