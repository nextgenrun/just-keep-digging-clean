import { USER_SETTINGS } from "../UserSettings.js";
import { SIGNAL_MIA } from "../../values/signalMia.js";
import { SIGNAL_EVENT as cfg } from "../../values/signalEvent.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { ensureSignalSurvivor } from "./SignalSurvivorAssets.js";
import { createBakedUiPanel } from "./bakedUiArt.js";

export class SignalWorldView {
  constructor(scene) {
    this.scene = scene; this.sprite = null; this.key = null; this.version = 0;
    const c = cfg.cue, font = APPROVED_HUD_SKIN.font;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(c.depth).setVisible(false);
    this.panel = (createBakedUiPanel(scene, 0, 0, c.width, c.height)
      || scene.add.image(0, 0, c.panel).setDisplaySize(c.width, c.height)).setAlpha(0.83);
    this.caption = scene.add.text(0, 7, "", { fontFamily: font.family, fontSize: c.textSize,
      color: c.color, stroke: font.shadow, strokeThickness: 3, align: "center", wordWrap: { width: c.width - 40 } }).setOrigin(0.5);
    this.direction = scene.add.text(0, -22, "", { fontFamily: font.family, fontSize: c.directionSize,
      color: c.color, stroke: font.shadow, strokeThickness: 3 }).setOrigin(0.5);
    this.root.add([this.panel, this.caption, this.direction]);
    // Three travelling chevrons are directional sound notation, drawn by the engine.
    this.ripples = scene.add.graphics().setScrollFactor(0).setDepth(c.depth);
    this.prompt = scene.add.text(0, 0, cfg.copy.meet, { fontFamily: font.family, fontSize: 16,
      color: c.color, stroke: font.shadow, strokeThickness: 4 }).setOrigin(0.5).setDepth(c.depth).setVisible(false);
    this.resize();
  }
  async showSurvivor(active, survivor) {
    if (this.key === active.id) return;
    this.clearSurvivor();
    this.key = active.id;
    const version = ++this.version;
    if (!await ensureSignalSurvivor(this.scene, survivor) || !this.scene || version !== this.version) return;
    const tile = active.anchors[0], size = this.scene.config.tileSize;
    this.sprite = this.scene.add.image((tile.tx + 0.5) * size, (tile.ty + 1) * size,
      survivor.sheet, String(cfg.art.pose.rest)).setOrigin(0.5, cfg.art.originY)
      .setDisplaySize(cfg.art.worldHeight, survivor.kind === "dog" ? cfg.art.worldHeight * 2 / 3 : cfg.art.worldHeight).setDepth(cfg.art.worldDepth);
    this.promptCopy = survivor.kind === "dog" ? SIGNAL_MIA.copy.meet : cfg.copy.meet;
    this.prompt.setText(this.promptCopy.replace("{key}", USER_SETTINGS.getKeyLabel("interact")));
  }
  async showCamp(active) {
    if (this.campKey === active.id) return;
    this.campKey = active.id;
    const id = active.id;
    if (!await ensureSignalSurvivor(this.scene, { sheet: cfg.camp.key, source: cfg.camp.source }) || !this.scene || this.campKey !== id) return;
    const size = this.scene.config.tileSize, tile = active.anchors[0], texture = this.scene.textures.get(cfg.camp.key).getSourceImage();
    this.camp = this.scene.add.image((tile.tx + 0.5) * size, (tile.ty + 1) * size, cfg.camp.key)
      .setOrigin(0.5, cfg.camp.originY).setDisplaySize(cfg.camp.widthTiles * size, cfg.camp.widthTiles * size * texture.height / texture.width)
      .setDepth(cfg.art.worldDepth - 1);
  }
  setPose(pose) { this.sprite?.setFrame(String(pose)); }
  cue(text, label) { this.caption.setText(text); this.direction.setText(label); this.root.setVisible(true); }
  update(active, playerTile, speaking, time) {
    this.resize();
    this.ripples.clear();
    const anchor = active?.anchors?.[0];
    if (!anchor) return;
    const dx = anchor.tx - playerTile.tx, dy = anchor.ty - playerTile.ty;
    const d = Math.hypot(dx, dy), angle = Math.atan2(dy, dx), c = cfg.cue;
    if (speaking) {
      const cam = this.scene.cameras.main, p = this.scene.player;
      const px = Math.max(c.inset, Math.min(this.scene.scale.width - c.inset, (p.x - cam.worldView.x) * cam.zoom));
      const py = Math.max(c.inset, Math.min(this.scene.scale.height - c.inset, (p.y - cam.worldView.y) * cam.zoom));
      const x = Math.max(c.inset, Math.min(this.scene.scale.width - c.inset, px + Math.cos(angle) * c.radius));
      const y = Math.max(c.inset, Math.min(this.scene.scale.height - c.inset, py + Math.sin(angle) * c.radius));
      for (let i = 0; i < 3; i++) {
        const t = (time / c.pulseMs + i / 3) % 1, offset = t * c.drift;
        const cx = x + Math.cos(angle) * offset, cy = y + Math.sin(angle) * offset;
        const spread = c.arrowSize * 0.35, tail = c.arrowSize * 0.5;
        this.ripples.lineStyle(3, 0xbbe4e1, (1 - t) * (i ? 0.55 : 0.95));
        this.ripples.beginPath();
        this.ripples.moveTo(cx - Math.cos(angle) * tail + Math.sin(angle) * spread, cy - Math.sin(angle) * tail - Math.cos(angle) * spread);
        this.ripples.lineTo(cx, cy);
        this.ripples.lineTo(cx - Math.cos(angle) * tail - Math.sin(angle) * spread, cy - Math.sin(angle) * tail + Math.cos(angle) * spread);
        this.ripples.strokePath();
      }
    } else this.root.setVisible(false);
    const showPrompt = Boolean(active.signal?.real && !active.signal?.explosive && d <= cfg.interactDistance && this.sprite);
    this.prompt.setVisible(showPrompt);
    if (showPrompt) this.prompt.setText(this.promptCopy.replace("{key}", USER_SETTINGS.getKeyLabel("interact"))).setPosition(this.sprite.x, this.sprite.y - cfg.art.worldHeight);
  }
  resize() {
    if (!this.scene) return;
    this.root.setPosition(this.scene.scale.width / 2, this.scene.scale.height - cfg.cue.bottom);
    this.root.setScale(Math.min(1, (this.scene.scale.width - 32) / cfg.cue.width));
  }
  clearSurvivor() { this.version++; this.sprite?.destroy(); this.sprite = null; this.key = null; }
  clear() { this.clearSurvivor(); this.campKey = null; this.camp?.destroy(); this.camp = null; this.root.setVisible(false); this.prompt.setVisible(false); this.ripples.clear(); }
  destroy() { this.clear(); this.root.destroy(true); this.prompt.destroy(); this.ripples.destroy(); this.scene = null; }
}
