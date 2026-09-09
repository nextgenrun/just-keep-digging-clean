import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";
import {
  PICKAXE_HUD_CONFIG,
  getPickaxeHudTheme,
} from "../../values/pickaxeHudThemes.js";
import { createUiIcon, setUiIcon } from "./UiIconRenderer.js";


function isRollbackDisabled() {
  const search = globalThis.location?.search || "";
  if (!search) return false;
  try {
    const params = new URLSearchParams(search);
    return params.get(PICKAXE_HUD_CONFIG.rollbackQuery.name)
      === PICKAXE_HUD_CONFIG.rollbackQuery.disabledValue;
  } catch {
    return false;
  }
}

export class PickaxeHudView {
  constructor(scene, scale) {
    this.scene = scene;
    this.scale = scale;
    this.currentPickaxeId = null;
    this.overlay = null;
    this.label = null;
    this.enabled = PICKAXE_HUD_CONFIG.enabled === true && !isRollbackDisabled();
    if (!this.enabled) return;

    const overlayConfig = PICKAXE_HUD_CONFIG.overlay;
    const labelConfig = PICKAXE_HUD_CONFIG.label;
    this.overlay = createUiIcon(scene, "pickaxe", {
      x: overlayConfig.x * scale,
      y: overlayConfig.y * scale,
      size: overlayConfig.size * scale,
      depth: HUD_LAYOUT.hudOverlayDepth + overlayConfig.depthOffset,
      scrollFactor: 0,
    });
    if (!this.overlay) return;

    this.label = scene.add.text(
      labelConfig.x * scale,
      labelConfig.y * scale,
      "",
      {
        fontFamily: APPROVED_HUD_SKIN.font.family,
        fontSize: `${labelConfig.fontSize * scale}px`,
        fontStyle: "bold",
        color: APPROVED_HUD_SKIN.font.secondary,
        stroke: APPROVED_HUD_SKIN.font.shadow,
        strokeThickness: labelConfig.strokeThickness,
      },
    )
      .setOrigin(labelConfig.originX, labelConfig.originY)
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudOverlayDepth + labelConfig.depthOffset)
      .setVisible(true);
    this.clear();
  }

  setPickaxe(pickaxeId, options = {}) {
    const theme = getPickaxeHudTheme(pickaxeId);
    const asset = ASSET_KEYS.ui.pickaxeIcons?.[theme?.id];
    const ready = this.enabled
      && this.overlay?.active
      && this.label?.active
      && (!asset || this.scene?.textures?.exists(asset.key) === true);
    if (!ready) {
      this.clear();
      return false;
    }
    if (!theme || !asset) {
      this.clear();
      return !pickaxeId;
    }

    const unchanged = this.currentPickaxeId === theme.id;
    if (unchanged && options.force !== true && options.animate !== true) return true;

    this.currentPickaxeId = theme.id;
    setUiIcon(this.overlay, asset.key);
    this.overlay.setAlpha(1).setVisible(true);
    this.label
      .setText(theme.label)
      .setColor(theme.accent)
      .setAlpha(1)
      .setVisible(true);

    if (options.animate === true) this._pulsePurchase();
    return true;
  }

  clear() {
    this.currentPickaxeId = null;
    this.scene?.tweens?.killTweensOf?.(this.overlay);
    this.scene?.tweens?.killTweensOf?.(this.label);
    if (this.overlay?.active) {
      setUiIcon(this.overlay, "pickaxe");
      this.overlay.setAlpha(1).setVisible(true);
    }
    this.label
      ?.setAlpha(1)
      .setText(PICKAXE_HUD_CONFIG.fallbackLabel)
      .setColor(APPROVED_HUD_SKIN.font.secondary)
      .setVisible(true);
  }

  getTheme() {
    return getPickaxeHudTheme(this.currentPickaxeId);
  }

  getSnapshot() {
    const theme = this.getTheme();
    return Object.freeze({
      enabled: this.enabled,
      ready: Boolean(this.overlay?.active && this.label?.active),
      pickaxeId: theme?.id || null,
      label: this.label?.text || "",
      themed: Boolean(theme),
      badgeVisible: this.overlay?.visible === true,
      overlayVisible: this.overlay?.visible === true,
    });
  }

  destroy() {
    this.scene?.tweens?.killTweensOf?.(this.overlay);
    this.scene?.tweens?.killTweensOf?.(this.label);
    this.overlay?.destroy();
    this.label?.destroy();
    this.overlay = null;
    this.label = null;
    this.scene = null;
  }

  _pulsePurchase() {
    const pulse = PICKAXE_HUD_CONFIG.purchasePulse;
    const targets = [this.overlay, this.label].filter(Boolean);
    this.scene?.tweens?.killTweensOf?.(targets);
    targets.forEach(target => target.setAlpha(pulse.startAlpha));
    this.scene?.tweens?.add?.({
      targets,
      alpha: 1,
      duration: pulse.durationMs,
      ease: pulse.ease,
    });
  }
}
