import { EMBER_DISCOVERY_EVENT_CONFIG } from "../../values/emberDiscoveryEvent.js";
import { CAMPFIRE_CONSUMABLE_CONFIG } from "../../values/campfireConfig.js";
import { UI_FONTS } from "../../values/uiLayout.js";

/** Shows the real Ember entering the current hearth; capacity is read-only. */
export class EmberDiscoveryEvolutionView {
  constructor(scene, config = EMBER_DISCOVERY_EVENT_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.phase = "idle";
    this.objects = [];
    this.slots = [];
    this.reducedMotion = globalThis.matchMedia?.(config.evolution.reducedMotionQuery)?.matches === true;
  }

  create(root) {
    const cfg = this.config.evolution;
    this.hearth = this.scene.add.image(cfg.hearthX, cfg.hearthGroundY, this.config.assets.icon)
      .setOrigin(0.5, 1).setVisible(false);
    this.flight = this.scene.add.image(this.config.layout.iconX, 0, this.config.assets.icon)
      .setDisplaySize(cfg.flightSize, cfg.flightSize).setVisible(false);
    this.caption = this.scene.add.text(cfg.captionX, cfg.captionY, "", {
      fontFamily: UI_FONTS.display, fontSize: `${cfg.captionSize}px`,
      color: this.config.presentation.rewardColor,
      stroke: this.config.presentation.shadowColor, strokeThickness: 3,
    }).setOrigin(0.5);
    const count = CAMPFIRE_CONSUMABLE_CONFIG.refill.maximumCharges;
    this.slots = Array.from({ length: count }, (_, index) => this.scene.add.image(
      cfg.hearthX + (index - (count - 1) / 2) * cfg.slotSpacing, cfg.slotY,
      this.config.assets.icon,
    ).setDisplaySize(cfg.slotSize, cfg.slotSize));
    this.objects = [this.hearth, ...this.slots, this.flight, this.caption];
    root.add(this.objects);
  }

  play(detail) {
    this.cancel();
    if (!this.hearth) return false;
    const cfg = this.config.evolution;
    const source = this.scene.campfireSystem?._campfireSprite;
    const hasHearth = source?.texture?.key && this.scene.textures.exists(source.texture.key);
    this.hearth.setVisible(Boolean(hasHearth));
    if (hasHearth) {
      this.hearth.setTexture(source.texture.key, source.frame.name);
      const factor = Math.min(cfg.hearthHeight / source.displayHeight,
        cfg.hearthMaxWidth / source.displayWidth);
      this.hearth.setDisplaySize(source.displayWidth * factor, source.displayHeight * factor);
    }
    this.beforeCapacity = detail.previousRefillCapacity ?? detail.refillCapacity;
    this.capacity = detail.refillCapacity;
    this._setSlots(this.beforeCapacity);
    this.caption.setText(detail.refillUpgraded
      ? cfg.capacity.replace("{before}", this.beforeCapacity).replace("{after}", this.capacity)
      : cfg.stored);
    this.hearth.setAlpha(cfg.initialAlpha);
    this.phase = detail.refillUpgraded ? "evolving" : "charging";
    if (this.reducedMotion || !this.scene.tweens?.add || !hasHearth) {
      this._settle();
      return true;
    }
    this.flight.setPosition(this.config.layout.iconX, 0).setAlpha(1).setVisible(true);
    this.scene.tweens.add({ targets: this.flight,
      x: cfg.hearthX, y: cfg.flightEndY, alpha: 0,
      delay: cfg.flightDelayMs, duration: cfg.flightMs, ease: "Cubic.InOut",
      onComplete: () => {
        this._settle();
        this.scene.tweens.add({ targets: this.hearth,
          scaleX: this.hearth.scaleX * cfg.pulseScale,
          scaleY: this.hearth.scaleY * cfg.pulseScale,
          duration: cfg.settleMs, yoyo: true, ease: "Sine.InOut" });
      },
    });
    return true;
  }

  _setSlots(capacity) {
    this.slots.forEach((slot, index) => slot.setAlpha(
      index < capacity ? 1 : this.config.evolution.emptySlotAlpha,
    ));
  }

  _settle() {
    this.phase = "settled";
    this.hearth?.setAlpha(1);
    this.flight?.setVisible(false);
    this._setSlots(this.capacity);
  }

  cancel() {
    this.scene?.tweens?.killTweensOf?.(this.objects);
    this.flight?.setVisible(false);
    this.phase = "idle";
  }

  getSnapshot() {
    return { phase: this.phase, hearthKey: this.hearth?.texture?.key ?? null,
      hearthVisible: this.hearth?.visible === true, beforeCapacity: this.beforeCapacity,
      capacity: this.capacity, reducedMotion: this.reducedMotion };
  }

  destroy() {
    this.cancel();
    for (const object of this.objects) object.destroy?.();
    this.objects = [];
    this.slots = [];
    this.scene = null;
  }
}
