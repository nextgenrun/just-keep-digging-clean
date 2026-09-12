import { GAME_CONFIG } from "../../values/gameConfig.js";
import { resolveStellarLanceOrigin } from "../../systems/celestial/stellarLanceTravel.js";
import { captureDigImpactPose, resolveDigImpactContact } from "../../systems/visual/digImpactContact.js";
import { LANCE_VISUAL_REVIEW as C } from "../../values/stellarLanceVisualReview.js";
import { ProjectilePresentation } from "./ProjectilePresentation.js";

/** Builds a synchronized, save-free Phaser gallery at the game's tile scale. */
export class LanceReviewScene extends Phaser.Scene {
  constructor() {
    super(C.sceneKey);
    this.playing = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.speed = 1; this.direction = 1; this.attack = "punch";
    this.elapsedMs = this.playing ? 0 : C.freezeAtMs;
    this.showFootprint = false; this.ready = false; this.loadFailures = [];
  }
  preload() {
    this.load.on("loaderror", file => this.loadFailures.push(file.src));
    for (const asset of Object.values(C.assets)) {
      if (asset.frameWidth) this.load.spritesheet(asset.key, asset.path, asset);
      else this.load.image(asset.key, asset.path);
    }
  }
  create() {
    if (this.loadFailures.length) {
      document.getElementById("status").textContent = "Artwork failed to load. Reload this local preview.";
      return;
    }
    for (const asset of Object.values(C.assets)) {
      const f = asset.frame;
      if (f) this.textures.get(asset.key).add(f.name, 0, f.x, f.y, f.width, f.height);
    }
    this.baseline = { projectileDisplayWidthPx: C.originalWidth, projectileDisplayHeightPx: C.originalHeight };
    this.rows = C.variants.map((variant, index) => this.createRow(variant, index));
    this.ready = true; this.renderReview();
    document.getElementById("size-reference").textContent =
      `Original wave: ${this.baseline.projectileDisplayWidthPx} × ${this.baseline.projectileDisplayHeightPx} px. Cinder stays 64 × 28 px.`;
    this.events.emit("review-ready");
  }
  createRow(v, index) {
    const top = index * C.rowHeight;
    const tile = GAME_CONFIG.tileSize;
    this.add.tileSprite(C.width / 2, top + C.rowHeight / 2, C.width, C.rowHeight, C.assets.background.key)
      .setTileScale(0.5).setTint(0x8a94a6).setAlpha(0.36);
    this.add.rectangle(0, top, C.width, 69, C.colors.background, 0.89).setOrigin(0);
    this.add.rectangle(0, top + C.floorY, C.width, C.rowHeight - C.floorY, C.colors.floor).setOrigin(0);
    const textureWidth = this.textures.get(C.assets.stone.key).getSourceImage().width;
    this.add.tileSprite(C.width / 2, top + C.floorY + 21, C.width, 42, C.assets.stone.key)
      .setTileScale(tile / textureWidth).setTint(0x485057).setAlpha(0.68);
    this.add.rectangle(0, top + C.rowHeight - 1, C.width, 1, C.colors.line).setOrigin(0);
    this.text(22, top + 18, v.number, 22, C.colors.accent, "Georgia");
    this.text(116, top + 15, v.name, 18, C.colors.text, "Georgia");
    this.text(116, top + 41, v.description, 12, C.colors.muted);
    this.text(710, top + 19, `${v.width} × ${Math.round(v.height)} px`, 15, C.colors.text);
    this.text(710, top + 43, `${Math.round((1 - v.height / this.baseline.projectileDisplayHeightPx) * 100)}% less height`, 10, C.colors.muted);
    const player = this.add.image(C.playerX, top + C.floorY, C.assets.idle.key, 0)
      .setOrigin(0.5, C.playerOriginY).setDisplaySize(C.playerDisplaySize, C.playerDisplaySize).setDepth(3);
    const presentation = new ProjectilePresentation(this, v, top + C.floorY, tile);
    this.add.rectangle(C.width - C.detailWidth, top + 1, C.detailWidth, C.rowHeight - 2, 0x101019, 0.95).setOrigin(0).setDepth(9);
    this.add.rectangle(C.width - C.detailWidth, top + 1, 1, C.rowHeight - 2, C.colors.line).setOrigin(0).setDepth(10);
    this.text(C.width - C.detailWidth + 19, top + 18, v.source, 9, C.colors.accent).setDepth(10);
    const detail = this.add.image(C.detailX, top + C.detailY, C.assets[v.asset].key, v.frame)
      .setOrigin(0.5).setDisplaySize(v.width * C.detailScale, v.height * C.detailScale)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(10);
    this.text(C.width - C.detailWidth + 19, top + 192, "3× STILL DETAIL / FIXED SILHOUETTE", 9, C.colors.muted).setDepth(10);
    this.text(22, top + 207, `${C.speedPxPerSecond} px/s · hand / foot contact · fixed silhouette`, 10, C.colors.muted);
    return { presentation, player, detail, top };
  }
  text(x, y, text, size, color, family = "Arial") {
    return this.add.text(x, y, text, { fontFamily: family, fontSize: `${size}px`, color, resolution: 2 }).setDepth(4);
  }
  update(_time, delta) {
    if (!this.ready) return;
    if (this.playing) this.elapsedMs = (this.elapsedMs + Math.min(delta, C.maxDeltaMs) * this.speed) % C.cycleMs;
    this.renderReview();
  }
  renderReview() {
    const attack = C.attacks[this.attack];
    const launchAtMs = attack.contactFrame / attack.frameRate * 1000;
    for (const row of this.rows || []) {
      const player = row.player;
      const asset = C.assets[attack.asset];
      player.setX(row.presentation.projectX(C.playerX, this.direction)).setFlipX(this.direction < 0);
      player.setTexture(asset.key, attack.contactFrame);
      const pose = captureDigImpactPose(player, { animationKey: "review-contact", contactFrame: attack.contactFrame });
      const contact = resolveDigImpactContact({ pose,
        body: { x: player.x - 10, y: player.y - 60, w: 20, h: 60 },
        targetTile: { tx: 0, ty: 0 }, tileSize: GAME_CONFIG.tileSize });
      const frame = Math.floor(this.elapsedMs * attack.frameRate / 1000);
      if (frame < attack.frameCount) player.setTexture(asset.key, frame);
      else player.setTexture(C.assets.idle.key, 0);
      const origin = resolveStellarLanceOrigin(contact, pose);
      row.presentation.render(this.elapsedMs, this.direction, this.showFootprint, origin, launchAtMs);
      row.contact = { ...contact, origin, pose, visibleFrame: frame, contactFrame: attack.contactFrame };
      row.detail.setFlipX(this.direction < 0);
    }
    document.getElementById("scrub").value = Math.round(this.elapsedMs);
    document.getElementById("time").textContent = `${Math.round(this.elapsedMs)} ms`;
    document.getElementById("status").textContent = `${this.playing ? "Playing" : "Paused"} · ${this.speed === 1 ? "real time" : "¼ speed"} · four Cinder palettes`;
  }
  seek(timeMs) {
    this.elapsedMs = Math.max(0, Math.min(C.cycleMs, Number(timeMs) || 0));
    this.playing = false; this.renderReview();
  }
  snapshot() {
    return { ready: this.ready, playing: this.playing, direction: this.direction, timeMs: this.elapsedMs,
      attack: this.attack, contacts: this.rows?.map(row => row.contact), tileSize: GAME_CONFIG.tileSize, renderer: this.game.renderer.type, loadFailures: [...this.loadFailures],
      projectiles: this.rows?.map(row => row.presentation.snapshot) || [], displayObjects: this.children.length };
  }
}
