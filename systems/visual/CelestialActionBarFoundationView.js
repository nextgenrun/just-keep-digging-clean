// Owns the authored five-well foundation plus the framed sixth action-bar socket.

import { CELESTIAL_ACTION_BAR_CONFIG } from "../../values/celestialActionBar.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { HUD_QUICK_CONTROLS } from "../../values/hudQuickControls.js";

export function resolveCelestialActionBarPlacement(viewportWidth, viewportHeight) {
  const layout = CELESTIAL_ACTION_BAR_CONFIG.layout;
  const hudReference = APPROVED_HUD_SKIN.referenceViewport;
  const width = Math.max(1, Number(viewportWidth) || layout.referenceWidthPx);
  const height = Math.max(1, Number(viewportHeight) || layout.referenceHeightPx);
  const hudScale = Math.min(width / hudReference.width, height / hudReference.height);
  const baseScale = Math.max(layout.minimumScale, Math.min(
    layout.maximumScale,
    width / layout.referenceWidthPx,
    height / layout.referenceHeightPx,
  ));
  const xp = APPROVED_HUD_SKIN.layout.xp;
  const inventory = HUD_QUICK_CONTROLS.inventory;
  const xpRight = width / 2 + xp.width * hudScale / 2;
  const inventoryHitLeft = width - (
    inventory.right + inventory.width + inventory.hitPadding
  ) * hudScale;
  const neighborGap = layout.neighborGapPx * hudScale;
  const availableLeft = xpRight + neighborGap;
  const availableRight = inventoryHitLeft - neighborGap;
  const totalWidthPx = layout.foundationWidthPx
    + layout.detachedSlotGapPx + layout.detachedSlotFrameSizePx;
  const scale = Math.max(0.01, Math.min(
    baseScale * layout.preferredRailScaleMultiplier,
    Math.max(1, availableRight - availableLeft) / totalWidthPx,
  ));
  const scaledWidth = totalWidthPx * scale;
  const foundationLeft = availableLeft
    + Math.max(0, availableRight - availableLeft - scaledWidth) / 2;
  const centerX = foundationLeft + layout.foundationWidthPx * scale / 2;
  const bottom = height - xp.bottom * hudScale;
  const centerY = bottom - layout.foundationHeightPx * scale / 2;
  return Object.freeze({
    scale,
    centerX,
    centerY,
    bounds: Object.freeze({
      left: foundationLeft,
      right: foundationLeft + scaledWidth,
      top: centerY - layout.foundationHeightPx * scale / 2,
      bottom,
    }),
    neighbors: Object.freeze({ xpRight, inventoryHitLeft, neighborGap }),
  });
}

export class CelestialActionBarFoundationView {
  constructor(scene, assetHealth) {
    this.scene = scene;
    this.config = CELESTIAL_ACTION_BAR_CONFIG;
    const presentation = this.config.presentation;
    this.foundation = scene.add.image(0, 0, assetHealth.chrome.foundation)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(presentation.depth - 1)
      .setAlpha(presentation.foundationAlpha);
    this.detachedSlot = scene.add.image(0, 0, assetHealth.chrome.detachedSlot)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(presentation.depth - 1)
      .setAlpha(presentation.foundationAlpha);
  }

  resize(centerX, centerY, uiScale) {
    const layout = this.config.layout;
    this.centerX = centerX;
    this.centerY = centerY;
    this.uiScale = uiScale;
    this.foundation.setPosition(centerX, centerY).setDisplaySize(
      layout.foundationWidthPx * uiScale,
      layout.foundationHeightPx * uiScale,
    );
    const detached = this.getSlotPosition(this.config.slotCount - 1);
    this.detachedSlot.setPosition(detached.x, detached.y).setDisplaySize(
      layout.detachedSlotFrameSizePx * uiScale,
      layout.detachedSlotFrameSizePx * uiScale,
    );
  }

  getSlotPosition(index) {
    const layout = this.config.layout;
    const foundationWidth = layout.foundationWidthPx * this.uiScale;
    const foundationLeft = this.centerX - foundationWidth / 2;
    const y = this.centerY + layout.slotOffsetYPx * this.uiScale;
    const ratio = layout.slotCenterRatios[index];
    if (Number.isFinite(ratio)) {
      return { x: foundationLeft + foundationWidth * ratio, y };
    }
    return {
      x: foundationLeft + foundationWidth
        + (layout.detachedSlotGapPx + layout.detachedSlotFrameSizePx / 2) * this.uiScale,
      y,
    };
  }

  setVisible(visible) {
    this.foundation.setVisible(visible === true);
    this.detachedSlot.setVisible(visible === true);
  }

  destroy() {
    this.foundation?.destroy();
    this.detachedSlot?.destroy();
  }
}
