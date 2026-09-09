import { APPROVED_POLISH_ART, APPROVED_ABILITY_FX as CFG } from "../../values/approvedPolishArt.js";

/** Adds the approved silver/cyan crescent only to successful Quickslash contacts. */
export class QuickslashContactFx {
  constructor(scene, player, controller) {
    this.scene = scene; this.player = player; this.controller = controller; this.live = new Set();
  }
  onMineImpact(tile, point) {
    const scene = this.scene;
    const art = APPROVED_POLISH_ART["quickslash-fx"];
    if (!this.controller?.abilities?.isQuickslashActive?.() || !tile
      || !scene.textures?.exists?.(art.key) || this.live.size >= CFG.maxSlashes) return;
    const size = scene.config.tileSize;
    const body = this.controller.physicsBody;
    const x = point?.x ?? (tile.tx + 0.5) * size;
    const y = point?.y ?? (tile.ty + 0.5) * size;
    const angle = Math.atan2(y - (body.y + body.h / 2), x - (body.x + body.w / 2));
    const image = scene.add.image(x, y, art.key)
      .setDisplaySize(size * CFG.slashSizeTiles, size * CFG.slashSizeTiles)
      .setRotation(angle).setAlpha(CFG.slashAlpha)
      .setDepth(this.player.depth + CFG.slashDepthOffset).setBlendMode("ADD");
    this.live.add(image);
    scene.tweens.add({ targets: image, alpha: 0,
      scaleX: image.scaleX * CFG.slashEndScale, scaleY: image.scaleY * CFG.slashEndScale,
      duration: CFG.slashDurationMs, ease: "Sine.Out",
      onComplete: () => { this.live.delete(image); image.destroy(); } });
  }
  destroy() {
    for (const image of this.live) { this.scene.tweens.killTweensOf(image); image.destroy(); }
    this.live.clear();
  }
}
