import { placeEventOnScreen } from "./eventScreenLayout.js";
import { DYNAMIC_EVENT_HEALTH as cfg } from "../../values/dynamicEventHealth.js";
import { EARTHQUAKE_FEEDBACK_CONFIG as quakeArt } from "../../values/earthquakeFeedback.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { fitBakedUiImage, fitLiveUiText } from "./bakedUiArt.js";

export class DynamicEventAwarenessView {
  constructor(scene) { this.scene = scene; this.cards = new Map(); }
  _create(id) {
    if (!this.scene.textures?.exists?.(quakeArt.assets.statusFrame.key)) return null;
    const n = cfg.notice, font = APPROVED_HUD_SKIN.font;
    const root = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(n.depth);
    const art = this.scene.add.image(0, 0, quakeArt.assets.statusFrame.key).setDisplaySize(n.width, n.height);
    const icon = fitBakedUiImage(this.scene.add.image(n.iconX, 0,
      id === "wurm" ? ASSET_KEYS.environment.graveborerWurm.medallion : quakeArt.assets.medallion.key),
      n.iconSize, n.iconSize);
    const style = { fontFamily: font.family, color: font.color, stroke: font.shadow, strokeThickness: font.strokeThickness };
    const title = this.scene.add.text(n.textX, n.titleY, "", { ...style, fontSize: n.titleSize, color: font.gold }).setOrigin(0, 0.5);
    const detail = this.scene.add.text(n.textX, n.detailY, "", { ...style, fontSize: n.detailSize,
      wordWrap: { width: n.textWidth } }).setOrigin(0, 0.5);
    root.add([art, icon, title, detail]);
    const card = { root, icon, title, detail };
    this.cards.set(id, card);
    return card;
  }
  update(snapshot, time) {
    const n = cfg.notice;
    let index = 0;
    for (const id of cfg.ids) {
      if (id === "signal") continue; // Signal owns its sparse sound/caption cue.
      const row = snapshot.events[id];
      const visible = row && ((row.active && id !== "earthquake")
        || (!row.active && row.result && time - row.finishedAt < cfg.completeHoldMs));
      const card = this.cards.get(id) || (visible ? this._create(id) : null);
      if (!card) continue;
      card.root.setVisible(Boolean(visible));
      if (!visible) continue;
      const width = this.scene.scale.width;
      placeEventOnScreen(this.scene, card.root, width / 2, n.top + index++ * n.gap);
      card.title.setText(row.active ? cfg.names[id] + " · " + (cfg.phaseLabels[row.phase] || row.phase.toUpperCase()) : row.result.title);
      card.detail.setText(row.active ? row.detail || cfg.actions[id] : row.result.detail);
      fitLiveUiText(card.title, n.textWidth, n.titleHeight);
      fitLiveUiText(card.detail, n.textWidth, n.detailHeight);
      if (id === "shadow") {
        const sprite = this.scene.shadowMinerSystem?.view?.primary;
        if (sprite?.texture?.key) fitBakedUiImage(card.icon.setTexture(sprite.texture.key, sprite.frame.name),
          n.iconSize, n.iconSize);
      }
    }
  }
  destroy() { for (const card of this.cards.values()) card.root.destroy(true); this.cards.clear(); this.scene = null; }
}
