import { SIGNAL_TRAP as cfg } from "../../values/signalRisk.js";
import { ensureSignalSurvivor } from "./SignalSurvivorAssets.js";

// Reuses the approved ember destruction frames for a pack ember and local blast.
export class SignalTrapView {
  constructor(scene) {
    this.scene = scene; this.ready = false; this.glow = null; this.fuseSound = null;
    this.burst = null; this.timers = []; this.tween = null; this.generation = 0;
    this.reducedMotion = globalThis.matchMedia?.(cfg.art.reducedMotionQuery)?.matches === true;
  }
  async prepare() {
    const scene = this.scene, art = cfg.art, asset = art.asset, generation = this.generation;
    const ok = await ensureSignalSurvivor(scene, { sheet: asset.key, source: asset.path });
    if (!ok || !this.scene || generation !== this.generation) return false;
    const texture = scene.textures.get(asset.key);
    for (let i = 0; i < asset.columns; i++) {
      const name = "signal-ember-" + i;
      if (!texture.has(name)) texture.add(name, 0, i * asset.frameWidth,
        art.row * asset.frameHeight, asset.frameWidth, asset.frameHeight);
    }
    for (const id of [cfg.sound.fuse, cfg.sound.blast]) scene.soundSystem?.reviewedSfx?.warm?.(id);
    this.ready = true; return true;
  }
  fuse(active, remaining) {
    if (!this.ready || !this.scene) return;
    const art = cfg.art, size = this.scene.config.tileSize, anchor = active.anchors[0];
    if (!this.glow) this.glow = this.scene.add.image(
      (anchor.tx + 0.5) * size + art.packOffsetX, (anchor.ty + 1) * size + art.packOffsetY,
      art.asset.key, "signal-ember-0").setDisplaySize(art.fuseWidth, art.fuseHeight).setDepth(art.depth);
    const progress = 1 - remaining / cfg.fuseMs;
    this.glow.setVisible(true).setAlpha(art.fuseAlpha + progress * art.fuseAlphaGain);
    if (!this.fuseSound) this.fuseSound = this.scene.soundSystem?.reviewedSfx?.play?.(cfg.sound.fuse,
      { gain: cfg.sound.fuseGain, group: cfg.sound.group, cooldownKey: active.id + "-fuse" });
    if (this.scene.soundSystem?.sfxEnabled === false || this.scene.sound?.mute) this.stopFuse();
  }
  detonate(active) {
    if (!this.ready || !this.scene) return;
    this.suspend(); this.clearBurst();
    const art = cfg.art, size = this.scene.config.tileSize, anchor = active.anchors[0];
    this.burst = this.scene.add.image((anchor.tx + 0.5) * size,
      (anchor.ty + 1 + art.burstY) * size, art.asset.key, "signal-ember-0")
      .setDisplaySize(size * art.burstWidthTiles, size * art.burstHeightTiles)
      .setOrigin(0.5, art.burstOriginY).setDepth(art.depth)
      .setAlpha(this.reducedMotion ? art.reducedMotionAlpha : 1);
    for (let i = 1; i < art.asset.columns; i++) this.timers.push(this.scene.time.delayedCall(
      art.frameMs * i, () => this.burst?.setFrame("signal-ember-" + i)));
    this.tween = this.scene.tweens.add({ targets: this.burst, alpha: 0,
      delay: art.frameMs * art.asset.columns, duration: art.fadeMs, onComplete: () => this.clearBurst() });
    this.blastSound = this.scene.soundSystem?.reviewedSfx?.play?.(cfg.sound.blast,
      { gain: cfg.sound.blastGain, group: cfg.sound.group, cooldownKey: active.id + "-blast" });
  }
  stopFuse() { this.scene?.soundSystem?.stopTrackedSfx?.(this.fuseSound); this.fuseSound = null; }
  suspend() { this.stopFuse(); this.glow?.setVisible(false); }
  clearBurst() {
    this.timers.forEach(timer => timer.remove(false)); this.timers = [];
    this.tween?.stop(); this.tween = null; this.burst?.destroy(); this.burst = null;
  }
  reset() {
    this.generation++; this.ready = false; this.suspend(); this.glow?.destroy(); this.glow = null;
    this.clearBurst(); this.scene?.soundSystem?.stopTrackedSfx?.(this.blastSound); this.blastSound = null;
  }
  destroy() { this.reset(); this.scene = null; }
}
