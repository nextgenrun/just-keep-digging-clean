import { SIGNAL_MIA as cfg } from "../../values/signalMia.js";
import { getSignalSurvivor } from "../../values/signalSurvivors.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { ensureSignalSurvivor } from "../../systems/visual/SignalSurvivorAssets.js";

// Restore rescued Mia beside Bobo from the existing upgrade-level save authority.
export class SurfaceMiaCompanion {
  constructor(scene, manager) { this.scene = scene; this.manager = manager; this.loading = false; }
  async create() {
    this.loading = true;
    const mia = getSignalSurvivor(cfg.id);
    const loaded = await ensureSignalSurvivor(this.scene, mia);
    this.loading = false;
    if (!loaded || !this.scene || !this.scene.upgradeSystem?.getUpgradeLevel(cfg.upgradeId)) return;
    const npc = this.manager.npcDefs.find(n => n.merchantId === cfg.merchantId);
    if (!npc) return;
    const size = this.scene.config.tileSize;
    this.tile = { tx: npc.tx + cfg.surfaceOffsetTiles, ty: npc.ty };
    this.sprite = this.scene.add.image((this.tile.tx + 0.5) * size, (npc.ty + 1) * size, mia.sheet, "portrait-2")
      .setOrigin(0.5, 1).setDepth(cfg.surfaceDepth);
    this.sprite.setScale(cfg.surfaceHeight / this.sprite.height);
    const font = APPROVED_HUD_SKIN.font;
    this.name = this.scene.add.text(this.sprite.x, this.sprite.y - cfg.surfaceHeight - cfg.nameGap, cfg.copy.name,
      { fontFamily: font.family, fontSize: 14, color: font.color, stroke: font.shadow, strokeThickness: 3 })
      .setOrigin(0.5).setDepth(cfg.surfaceDepth + 1).setVisible(false);
  }
  update(playerTile) {
    const owned = this.scene.upgradeSystem?.getUpgradeLevel(cfg.upgradeId) > 0;
    if (!owned) { this.clear(); return; }
    if (!this.sprite && !this.loading) void this.create();
    const bobo = this.manager.npcSprites.get(cfg.merchantId);
    this.sprite?.setVisible(bobo?.visible !== false);
    this.name?.setVisible(Boolean(this.sprite?.visible && playerTile
      && Math.hypot(this.tile.tx - playerTile.tx, this.tile.ty - playerTile.ty) < cfg.noticeDistance));
  }
  clear() { this.sprite?.destroy(); this.name?.destroy(); this.sprite = null; this.name = null; }
  destroy() { this.clear(); this.scene = null; }
}
