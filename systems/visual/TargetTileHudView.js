// Shows the authoritative mining target's remaining HP beside the GP panel.
import { GAMEPLAY_PRESENTATION, TARGET_TILE_LABELS } from "../../values/gameplayPresentation.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";

export class TargetTileHudView {
  constructor(scene) {
    this.scene = scene;
    this.config = GAMEPLAY_PRESENTATION.target;
    this.target = null;
    this.root = scene.add.container(0, 0).setScrollFactor(0)
      .setDepth(this.config.depth).setVisible(false);
    this.frame = scene.add.image(this.config.width / 2, this.config.height / 2,
      ASSET_KEYS.ui.approvedHud.buffChip)
      .setDisplaySize(this.config.width, this.config.height);
    const font = APPROVED_HUD_SKIN.font;
    const style = { fontFamily: font.family, fontStyle: "bold",
      color: font.color, stroke: font.shadow, strokeThickness: font.strokeThickness };
    this.title = scene.add.text(this.config.width / 2, this.config.titleY, "",
      { ...style, fontSize: this.config.titleSize, color: font.secondary }).setOrigin(0.5);
    this.hp = scene.add.text(this.config.width / 2, this.config.hpY, "",
      { ...style, fontSize: this.config.hpSize }).setOrigin(0.5);
    this.root.add([this.frame, this.title, this.hp]);
    scene.events.on("postupdate", this.refresh, this);
    scene.scale.on("resize", this.resize, this);
    this.resize();
  }
  resize() {
    const ref = APPROVED_HUD_SKIN.referenceViewport;
    const scale = Math.min(this.scene.scale.width / ref.width, this.scene.scale.height / ref.height);
    const { playerCore, gemPower } = APPROVED_HUD_SKIN.layout;
    const gpBounds = this.scene.hudSystem?.getGemPowerValueBounds?.();
    const rowCenterY = Number.isFinite(gpBounds?.centerY)
      ? gpBounds.centerY : (gemPower.y + gemPower.height / 2) * scale;
    this.root.setPosition(
      (playerCore.x + playerCore.width + this.config.gapFromCore) * scale,
      rowCenterY - this.config.hpY * scale,
    ).setScale(scale);
  }
  setTarget(tile, visible) {
    this.target = visible && tile ? { tx: tile.tx, ty: tile.ty } : null;
  }
  refresh() {
    const scene = this.scene;
    const world = scene.worldModel;
    const tile = this.target;
    const show = tile && scene.gameState === "playing"
      && !scene.hasEscapeClosableUi?.()
      && !scene.shopOverlay?.isVisible && !scene._pillarViewActive
      && !scene.campfireSystem?.isSelecting?.()
      && !scene.townSquareTutorialSystem?.isShowingGuide?.()
      && world?.inBounds(tile.tx, tile.ty) && world.isDiggable(tile.tx, tile.ty);
    const hp = show ? world.getHp(tile.tx, tile.ty) : 0;
    this.root.setVisible(Boolean(show && hp > 0));
    if (!this.root.visible) return;
    // HUD rebinding follows resize; use the final live GP geometry each frame.
    this.resize();
    const maxHp = world.getTileMaxHp(tile.tx, tile.ty);
    const label = (TARGET_TILE_LABELS[world.getType(tile.tx, tile.ty)] || "").toUpperCase();
    const value = this.config.hpLabel + " " + Math.ceil(hp) + "/" + Math.ceil(maxHp);
    if (this.title.text !== label) this._fit(this.title, label);
    if (this.hp.text !== value) this._fit(this.hp, value);
  }
  _fit(text, value) {
    text.setScale(1).setText(value);
    text.setScale(Math.min(1, this.config.textWidth / Math.max(1, text.width)));
  }
  destroy() {
    this.scene.events.off("postupdate", this.refresh, this);
    this.scene.scale.off("resize", this.resize, this);
    this.root.destroy(true);
    this.scene = null;
  }
}
