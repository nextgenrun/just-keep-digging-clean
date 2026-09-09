import {
  SHADOW_MINER_CONFIG,
  SHADOW_MINER_REPELLENTS,
} from "../../values/shadowMiner.js";

export class ShadowMinerResidueTrail {
  constructor(scene, config = SHADOW_MINER_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.entries = [];
    this.lastStampAtMs = Number.NEGATIVE_INFINITY;
    this.reducedMotion = globalThis.matchMedia?.(
      config.visual.reducedMotionMediaQuery,
    )?.matches === true;
  }

  stamp(sprite, time, repellent) {
    const residueConfig = this.config.visual.residue;
    if (
      !sprite?.texture?.key
      || !this.scene?.add?.sprite
      || !Number.isFinite(time)
      || (this.reducedMotion && !residueConfig.enabledInReducedMotion)
      || time - this.lastStampAtMs < residueConfig.intervalMs
      || this.entries.length >= residueConfig.maximumSprites
    ) {
      return false;
    }

    const residue = this.scene.add.sprite(
      sprite.x,
      sprite.y,
      sprite.texture.key,
      sprite.frame?.name,
    );
    residue.setOrigin(sprite.originX, sprite.originY);
    residue.setDisplaySize(sprite.displayWidth, sprite.displayHeight);
    residue.setFlipX(sprite.flipX === true);
    residue.setTintFill(
      repellent === SHADOW_MINER_REPELLENTS.STAR
        ? residueConfig.starTint
        : residueConfig.tint,
    );
    residue.setBlendMode("ADD");
    residue.setDepth(residueConfig.depth);
    residue.setAlpha(residueConfig.alpha);

    const entry = { sprite: residue, tween: null };
    this.entries.push(entry);
    this.lastStampAtMs = time;
    const remove = () => this._remove(entry);
    if (this.scene?.tweens?.add) {
      entry.tween = this.scene.tweens.add({
        targets: residue,
        alpha: 0,
        scaleX: residue.scaleX * residueConfig.fadeScaleMultiplier,
        scaleY: residue.scaleY * residueConfig.fadeScaleMultiplier,
        duration: residueConfig.durationMs,
        ease: "Sine.Out",
        onComplete: remove,
      });
    } else {
      remove();
    }
    return true;
  }

  getSnapshot() {
    return Object.freeze({
      activeSprites: this.entries.length,
      maximumSprites: this.config.visual.residue.maximumSprites,
      lastStampAtMs: Number.isFinite(this.lastStampAtMs)
        ? this.lastStampAtMs
        : null,
    });
  }

  clear() {
    for (const entry of [...this.entries]) this._remove(entry);
    this.lastStampAtMs = Number.NEGATIVE_INFINITY;
  }

  destroy() {
    this.clear();
    this.scene = null;
  }

  _remove(entry) {
    const index = this.entries.indexOf(entry);
    if (index >= 0) this.entries.splice(index, 1);
    entry.tween?.stop?.();
    entry.tween?.remove?.();
    entry.sprite?.destroy?.();
    entry.tween = null;
    entry.sprite = null;
  }
}
