import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";
import {
  PICKAXE_HUD_CONFIG,
  getPickaxeHudTheme,
} from "../../values/pickaxeHudThemes.js";


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

    const firstAsset = Object.values(ASSET_KEYS.ui.pickaxeHud)[0];
    if (!firstAsset || scene.textures?.exists(firstAsset.key) !== true) return;

    const frame = APPROVED_HUD_SKIN.layout.playerCore;
    const overlayConfig = PICKAXE_HUD_CONFIG.overlay;
    const labelConfig = PICKAXE_HUD_CONFIG.label;
    this.overlay = scene.add.image(
      frame.x * scale,
      frame.y * scale,
      firstAsset.key,
    )
      .setOrigin(0, 0)
      .setDisplaySize(frame.width * scale, frame.height * scale)
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudOverlayDepth + overlayConfig.depthOffset)
      .setVisible(false);

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
      .setVisible(false);
  }

  setPickaxe(pickaxeId, options = {}) {
    const theme = getPickaxeHudTheme(pickaxeId);
    const asset = ASSET_KEYS.ui.pickaxeHud?.[theme?.id];
    const ready = this.enabled
      && this.overlay?.active
      && this.label?.active
      && asset
      && this.scene?.textures?.exists(asset.key) === true;
    if (!ready) {
      this.clear();
      return false;
    }

    const unchanged = this.currentPickaxeId === theme.id;
    if (unchanged && options.force !== true && options.animate !== true) return true;

    this.currentPickaxeId = theme.id;
    this.overlay
      .setTexture(asset.key)
      .setAlpha(1)
      .setVisible(true);
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
    this.overlay?.setAlpha(1).setVisible(false);
    this.label?.setAlpha(1).setText("").setVisible(false);
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
      label: theme?.label || "",
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
