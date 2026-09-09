import { CAMPFIRE_EVOLUTION } from "../../values/campfireEvolution.js";
import { CAMPFIRE_TIERS } from "../../values/campfireConfig.js";
import { getCampfireFeatureAssetGroupId } from "../../values/runtimeAssetLoading.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { CELESTIAL_TALENT_TREE_UI_CONFIG } from "../../values/celestialTalentTreeUi.js";

/** A short, world-anchored before/after beat; never owns payment or input. */
export class CampfireEvolutionPresentation {
  constructor(scene, config = CAMPFIRE_EVOLUTION) {
    this.scene = scene;
    this.config = config;
    this.record = null;
    this.serial = 0;
    this.phase = "idle";
    this.objects = [];
    this.timers = [];
    this.destroyed = false;
    this.reducedMotion = globalThis.matchMedia?.(config.reducedMotionQuery)?.matches === true;
  }

  prepare(sprite, level) {
    this.cancel();
    if (this.destroyed || !sprite?.texture?.key || !this.scene?.add) return null;
    const manager = this.scene.runtimeFeatureAssetManager;
    const record = {
      level, key: sprite.texture.key, frame: sprite.frame?.name,
      width: sprite.displayWidth, height: sprite.displayHeight,
      groupId: getCampfireFeatureAssetGroupId(level),
      consumer: `${this.config.consumer}:${++this.serial}`,
      manager, cancelled: false,
    };
    this.record = record;
    // ensureGroup adds the consumer synchronously, before the transaction can
    // release the old form. A unique consumer also isolates cancelled loads.
    if (manager?.enabled) {
      Promise.resolve(manager.ensureGroup(record.groupId, {
        consumer: record.consumer, adoptExisting: true,
      })).then(() => {
        if (record.cancelled) manager.releaseGroup(record.groupId, record.consumer);
      }).catch(() => this.discard(record));
    }
    return record;
  }

  play(record, sprite, tier) {
    if (this.destroyed || !record || record !== this.record || record.cancelled
      || !sprite?.active || !this.scene?.tweens?.add) {
      this.discard(record);
      return false;
    }
    const cfg = this.config;
    this.mainSprite = sprite;
    this.mainAlpha = 1;
    this.scene.tweens.killTweensOf(sprite);
    sprite.setAlpha(0);
    this.root = this.scene.add.container(sprite.x, sprite.y).setDepth(cfg.depth);
    const oldExists = this.scene.textures.exists(record.key);
    this.before = oldExists ? this._image(record.key, record.frame, record.width, record.height) : null;
    this.after = this._image(sprite.texture.key, sprite.frame.name, sprite.displayWidth, sprite.displayHeight);
    this.glow = this._image(sprite.texture.key, sprite.frame.name, sprite.displayWidth, sprite.displayHeight)
      .setTintFill(cfg.motion.glowTint).setBlendMode(cfg.motion.blendMode).setAlpha(0);
    this.after.setAlpha(0);
    this._caption(tier, Math.max(record.height, sprite.displayHeight));
    this.phase = this.reducedMotion ? "settled" : "gather";
    if (this.reducedMotion) {
      this.before?.setVisible(false);
      this.after.setVisible(false);
      sprite.setAlpha(this.mainAlpha);
      this._setCaption(tier, true);
      this._later(cfg.timing.reducedHoldMs, () => this._exit());
      return true;
    }
    if (this.before) this._scaleTween(this.before, cfg.motion.gatherScale, cfg.timing.gatherMs);
    this._later(cfg.timing.gatherMs, () => this._ignite(tier));
    return true;
  }

  _image(key, frame, width, height) {
    const image = this.scene.add.image(0, 0, key, frame)
      .setOrigin(0.5, 1).setDisplaySize(width, height);
    image.evolutionScaleX = image.scaleX;
    image.evolutionScaleY = image.scaleY;
    this.root.add(image);
    this.objects.push(image);
    return image;
  }

  _caption(tier, height) {
    const cfg = this.config.caption;
    const key = CELESTIAL_TALENT_TREE_UI_CONFIG.assets.tooltip.key;
    if (!this.scene.textures.exists(key)) return;
    const y = -height - cfg.gap;
    const frame = this.scene.add.image(0, y, key)
      .setDisplaySize(cfg.width, cfg.height);
    const text = (offset, size, color) => this.scene.add.text(0, y + offset, "", {
      fontFamily: UI_FONTS.display, fontSize: `${size}px`, color,
      stroke: cfg.stroke, strokeThickness: cfg.strokeThickness,
    }).setOrigin(0.5);
    this.title = text(cfg.titleY, cfg.titleSize, cfg.color);
    this.detail = text(cfg.detailY, cfg.detailSize, cfg.dimColor);
    this.root.add([frame, this.title, this.detail]);
    this.objects.push(frame, this.title, this.detail);
    this._setCaption(tier, false);
  }

  _setCaption(tier, done) {
    const cfg = this.config;
    this.title?.setText(done ? tier.label.toUpperCase() : cfg.caption.evolving);
    this.detail?.setText(`${done ? cfg.caption.upgraded : tier.label}  ·  ${tier.level} / ${CAMPFIRE_TIERS.length}`);
  }

  _ignite(tier) {
    if (!this.record || !this.root) return;
    const { timing, motion } = this.config;
    this.phase = "ignite";
    if (this.before) this.scene.tweens.add({ targets: this.before, alpha: 0,
      duration: timing.igniteMs, ease: motion.ease });
    this.after.setScale(this.after.evolutionScaleX * motion.birthScale,
      this.after.evolutionScaleY * motion.birthScale);
    this._scaleTween(this.after, motion.bloomScale, timing.igniteMs, 1);
    this.glow.setAlpha(motion.glowAlpha);
    this._scaleTween(this.glow, motion.glowScale, timing.igniteMs, 0);
    this._setCaption(tier, true);
    this._later(timing.igniteMs, () => {
      this.phase = "settle";
      this._scaleTween(this.after, 1, timing.settleMs);
      this._later(timing.settleMs, () => {
        this.phase = "settled";
        this.mainSprite?.setAlpha(this.mainAlpha);
        this.after?.setVisible(false);
        this._later(timing.holdMs, () => this._exit());
      });
    });
  }

  _scaleTween(image, scale, duration, alpha = image.alpha) {
    this.scene.tweens.add({ targets: image, alpha,
      scaleX: image.evolutionScaleX * scale,
      scaleY: image.evolutionScaleY * scale,
      duration, ease: this.config.motion.ease });
  }

  _later(delay, callback) {
    this.timers.push(this.scene.time.delayedCall(delay, callback));
  }

  _exit() {
    if (!this.root) return;
    this.phase = "exit";
    this.scene.tweens.add({ targets: this.root, alpha: 0,
      duration: this.config.timing.exitMs, onComplete: () => this.cancel() });
  }

  discard(record) {
    if (!record) return;
    if (this.record === record) this.cancel();
    else this._release(record);
  }

  _release(record) {
    record.cancelled = true;
    if (record.manager?.enabled) record.manager.releaseGroup(record.groupId, record.consumer);
  }

  cancel() {
    for (const timer of this.timers) timer?.remove?.();
    this.timers.length = 0;
    this.scene?.tweens?.killTweensOf?.([...this.objects, this.root].filter(Boolean));
    this.mainSprite?.setAlpha?.(this.mainAlpha);
    this.mainSprite = null;
    this.root?.destroy?.(true);
    this.root = null;
    this.before = this.after = this.glow = this.title = this.detail = null;
    this.objects.length = 0;
    if (this.record) this._release(this.record);
    this.record = null;
    this.phase = "idle";
  }

  getSnapshot() {
    return { active: Boolean(this.root), phase: this.phase,
      fromLevel: this.record?.level ?? null, objects: this.objects.length,
      reducedMotion: this.reducedMotion, groundedY: this.root?.y ?? null };
  }

  destroy() {
    this.cancel();
    this.destroyed = true;
    this.scene = null;
  }
}
