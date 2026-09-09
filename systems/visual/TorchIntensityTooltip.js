import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { LIGHT_CONFIG } from "../../values/lightConfig.js";
import { USER_SETTINGS } from "../UserSettings.js";
import { createBakedUiPanel, fitLiveUiText } from "./bakedUiArt.js";

export class TorchIntensityTooltip {
  constructor(scene, control) {
    this.scene = scene;
    this.control = control;
    const cfg = APPROVED_HUD_SKIN.layout.torchIntensity.tooltip;
    const font = APPROVED_HUD_SKIN.font;
    this.root = scene.add.container(0, 0).setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudOverlayDepth + cfg.depthOffset).setVisible(false);
    this.frame = createBakedUiPanel(scene, 0, 0, cfg.width, cfg.height)
      || scene.add.image(0, 0, ASSET_KEYS.ui.approvedHud.buffChip);
    const style = {
      fontFamily: font.family, fontStyle: "bold", align: "center",
      stroke: font.shadow, strokeThickness: font.strokeThickness,
    };
    this.title = scene.add.text(0, cfg.titleY, "", {
      ...style, fontSize: cfg.titleFontSize, color: font.gold,
    }).setOrigin(0.5);
    this.body = scene.add.text(0, cfg.bodyY, "", {
      ...style, fontSize: cfg.bodyFontSize, color: font.secondary,
      lineSpacing: cfg.lineSpacing,
    }).setOrigin(0.5);
    this.root.add([this.frame, this.title, this.body]);
    this._update = () => {
      if (this.root.visible && !this._canShow()) this.hide();
    };
    scene.events.on("update", this._update);
  }

  _canShow() {
    return this.control.visible
      && (!this.scene.gameState || this.scene.gameState === "playing")
      && !this.scene.hasEscapeClosableUi?.()
      && !this.scene.shopOverlay?.isVisible
      && !this.scene._pillarViewActive
      && !this.scene.campfireSystem?.isSelecting?.();
  }

  show() {
    if (!this._canShow()) return;
    this.refresh();
    this.root.setVisible(true);
  }

  refresh() {
    const layout = APPROVED_HUD_SKIN.layout.torchIntensity;
    const cfg = layout.tooltip;
    const power = LIGHT_CONFIG.torchIntensity;
    const control = this.control;
    const state = control.active
      ? (control.overdriveActive ? HUD_LAYOUT.torchIntensityOverdriveLabel : layout.onLabel)
      : layout.offLabel;
    const copy = value => value
      .replace("{percent}", Math.round(control.intensity * 100))
      .replace("{state}", state)
      .replace("{scroll}", power.scrollStepPercent).replace("{scroll}", power.scrollStepPercent)
      .replace("{click}", power.clickStepPercent)
      .replace("{key}", USER_SETTINGS.getKeyLabel("torch"))
      .replace("{drain}", Number(control.drainGpPerSecond.toFixed(cfg.drainDecimals)));
    const viewport = this.scene.scale;
    const reference = APPROVED_HUD_SKIN.referenceViewport;
    const s = Math.min(viewport.width / reference.width, viewport.height / reference.height);
    const bounds = control.hit.getBounds();
    const halfWidth = cfg.width * s / 2;
    const halfHeight = cfg.height * s / 2;
    const margin = cfg.viewportMargin * s;
    const x = Math.max(margin + halfWidth,
      Math.min(viewport.width - margin - halfWidth, bounds.centerX));
    const y = Math.max(margin + halfHeight,
      Math.min(viewport.height - margin - halfHeight, bounds.bottom + cfg.gap * s + halfHeight));
    this.root.setPosition(x, y);
    this.frame.setDisplaySize(cfg.width * s, cfg.height * s);
    this.title.setText(copy(cfg.title)).setPosition(0, cfg.titleY * s)
      .setFontSize(cfg.titleFontSize * s);
    this.body.setText([cfg.wheelHint, cfg.stepsHint, cfg.toggleHint].map(copy).join("\n"))
      .setPosition(0, cfg.bodyY * s).setFontSize(cfg.bodyFontSize * s)
      .setLineSpacing(cfg.lineSpacing * s);
    fitLiveUiText(this.title, cfg.bodyWidth * s);
    fitLiveUiText(this.body, cfg.bodyWidth * s);
  }

  hide() {
    this.root.setVisible(false);
  }

  destroy() {
    this.scene.events.off("update", this._update);
    this.root.destroy();
    this.scene = null;
    this.control = null;
  }
}