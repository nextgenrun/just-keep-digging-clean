// Keeps merchant artwork and its live control/event labels inside the camera view.
import { GAMEPLAY_PRESENTATION } from "../../values/gameplayPresentation.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { MERCHANT_SIGN_ART } from "../../values/merchantSignArt.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { USER_SETTINGS } from "../UserSettings.js";

export function clampMerchantPlate(anchor, viewport, size, margin) {
  const halfWidth = size.width / 2;
  const halfHeight = size.height / 2;
  return {
    x: Math.max(viewport.x + margin + halfWidth,
      Math.min(viewport.x + viewport.width - margin - halfWidth, anchor.x)),
    y: Math.max(viewport.y + margin + halfHeight,
      Math.min(viewport.y + viewport.height - margin - halfHeight, anchor.y - halfHeight)),
  };
}
export class MerchantPromptView {
  constructor(scene, merchantId, name, worldX, worldY, options = {}) {
    this.scene = scene;
    this.merchantId = merchantId;
    this.name = name;
    this.worldX = worldX;
    this.worldY = worldY;
    this.inRange = false;
    this.config = GAMEPLAY_PRESENTATION.merchant;
    this.size = { width: this.config.width, height: this.config.height };
    const asset = options.art || MERCHANT_SIGN_ART.merchants[merchantId];
    this.art = MERCHANT_SIGN_ART.enabled && asset && scene.textures?.exists(asset.key)
      ? asset : null;
    this.root = scene.add.container(0, 0).setScrollFactor(1)
      .setDepth(this.config.depth).setVisible(false);
    const font = APPROVED_HUD_SKIN.font;
    const style = { fontFamily: font.family, fontStyle: "bold", color: font.color,
      stroke: font.shadow, strokeThickness: font.strokeThickness, align: "center" };
    if (this.art) this._createArtwork(style);
    else this._createFallback(style);
    scene.events.on("prerender", this.refresh, this);
  }
  _createFallback(style) {
    const cfg = this.config;
    this.frame = this.scene.add.image(0, 0, ASSET_KEYS.ui.approvedHud.buffChip)
      .setDisplaySize(cfg.width, cfg.height);
    this.title = this.scene.add.text(0, cfg.titleY, "",
      { ...style, fontSize: cfg.titleSize }).setOrigin(0.5);
    this.detail = this.scene.add.text(0, cfg.detailY, "",
      { ...style, fontSize: cfg.detailSize, color: APPROVED_HUD_SKIN.font.secondary }).setOrigin(0.5);
    this.root.add([this.frame, this.title, this.detail]);
  }
  _createArtwork(style) {
    const cfg = MERCHANT_SIGN_ART;
    this.frame = this.scene.add.image(0, 0, this.art.key, this.art.frame);
    this.artHeight = cfg.width * this.frame.height / this.frame.width;
    this.frame.setDisplaySize(cfg.width, this.artHeight);
    this.keyFrame = this.scene.add.image(0, 0, ASSET_KEYS.ui.approvedHud.buffChip);
    this.keyLabel = this.scene.add.text(0, 0, "",
      { ...style, fontSize: cfg.key.fontSize }).setOrigin(0.5);
    this.rushFrame = this.scene.add.image(0, 0, ASSET_KEYS.ui.approvedHud.buffChip)
      .setDisplaySize(cfg.width, cfg.rush.height).setVisible(false);
    this.rushLabel = this.scene.add.text(0, 0, "",
      { ...style, fontSize: cfg.rush.fontSize }).setOrigin(0.5).setVisible(false);
    this.root.add([this.frame, this.keyFrame, this.keyLabel, this.rushFrame, this.rushLabel]);
    this._layoutArtwork(false);
  }
  _layoutArtwork(hasRush) {
    const cfg = MERCHANT_SIGN_ART;
    const header = hasRush ? cfg.rush.height + cfg.gap : 0;
    this.size = { width: cfg.width, height: header + this.artHeight + cfg.gap + cfg.key.height };
    const top = -this.size.height / 2;
    this.frame.setPosition(0, top + header + this.artHeight / 2);
    const keyY = top + header + this.artHeight + cfg.gap + cfg.key.height / 2;
    const keyWidth = Math.max(cfg.key.width,
      Math.min(cfg.key.maxWidth, this.keyLabel.width + cfg.key.padding));
    this.keyFrame.setPosition(0, keyY).setDisplaySize(keyWidth, cfg.key.height);
    this.keyLabel.setPosition(0, keyY);
    this.rushFrame.setPosition(0, top + cfg.rush.height / 2).setVisible(hasRush);
    this.rushLabel.setPosition(0, top + cfg.rush.height / 2).setVisible(hasRush);
  }
  update(inRange, rushPrompt = null) {
    this.inRange = inRange;
    const key = USER_SETTINGS.getKeyLabel("interact");
    if (this.art) {
      const cfg = MERCHANT_SIGN_ART;
      this._fit(this.keyLabel, key, cfg.key.maxWidth - cfg.key.padding);
      this._fit(this.rushLabel, rushPrompt || "", cfg.width - cfg.rush.inset);
      this._layoutArtwork(Boolean(rushPrompt));
    } else {
      const cfg = this.config;
      const title = (this.name || cfg.fallbackTitle).toUpperCase();
      const action = rushPrompt || cfg.actions[this.merchantId] || cfg.fallbackAction;
      this._fit(this.title, title);
      this._fit(this.detail, key + "  ·  " + action);
    }
    this.refresh();
  }
  _fit(text, value, maxWidth = this.config.textWidth) {
    if (text.text === value) return;
    text.setScale(1).setText(value);
    text.setScale(Math.min(1, maxWidth / Math.max(1, text.width)));
  }
  refresh() {
    const scene = this.scene;
    const visible = this.inRange && scene.gameState === "playing"
      && !scene.hasEscapeClosableUi?.()
      && !scene.shopOverlay?.isVisible && !scene._pillarViewActive
      && !scene.townSquareTutorialSystem?.isShowingGuide?.()
      && !scene.campfireSystem?.isSelecting?.()
      && !scene.townRestSystem?.isActive?.();
    this.root.setVisible(Boolean(visible));
    if (!visible) return;
    const camera = scene.cameras.main;
    const ref = APPROVED_HUD_SKIN.referenceViewport;
    const scale = Math.min(scene.scale.width / ref.width, scene.scale.height / ref.height);
    const anchor = camera.matrix.transformPoint(
      this.worldX - camera.scrollX, this.worldY - camera.scrollY, {});
    const point = clampMerchantPlate(anchor, camera,
      { width: this.size.width * scale, height: this.size.height * scale },
      this.config.margin * scale);
    const local = camera.matrix.applyInverse(point.x, point.y, {});
    this.root.setPosition(local.x + camera.scrollX, local.y + camera.scrollY)
      .setScale(scale / camera.zoomX, scale / camera.zoomY)
      .setRotation(-camera.rotation);
  }
  destroy() {
    this.scene.events.off("prerender", this.refresh, this);
    this.root.destroy(true);
    this.scene = null;
  }
}
