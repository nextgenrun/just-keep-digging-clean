import { EMBER_DISCOVERY_EVENT_CONFIG } from "../../values/emberDiscoveryEvent.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { CELESTIAL_TALENT_TREE_UI_CONFIG } from "../../values/celestialTalentTreeUi.js";

const CONTINUE_KEYS = new Set(["Space", "Enter", "KeyE", "Escape"]);

export class EmberDiscoveryEventSystem {
  constructor(scene, config = EMBER_DISCOVERY_EVENT_CONFIG, evolution = null) {
    this.scene = scene;
    this.config = config;
    this.evolution = evolution;
    this.reducedMotion = globalThis.matchMedia?.(config.evolution.reducedMotionQuery)?.matches === true;
    this.active = false;
    this.queue = [];
    this._startedAt = 0;
    this._timer = null;
    this._inputLocked = false;
    this._finishing = false;
    this._destroyed = false;
    this._queueTimer = null;
    this._resizeHandler = () => this._resize();
    this._keyHandler = event => {
      if (CONTINUE_KEYS.has(event?.code)) this._requestSkip();
    };
    this._createView();
    this.scene.scale?.on?.("resize", this._resizeHandler);
  }

  play(detail = {}) {
    if (this._destroyed || !this.root || this.config.enabled !== true) return false;
    if (this.active) {
      this.queue = [detail];
      return true;
    }
    this._show(detail);
    return true;
  }

  _createView() {
    const { assets, depth, layout, presentation } = this.config;
    const frameKey = assets.frame || CELESTIAL_TALENT_TREE_UI_CONFIG.assets.tooltip.key;
    if (!this.scene?.textures?.exists?.(frameKey)
      || !this.scene?.textures?.exists?.(assets.icon)) return;
    this.root = this.scene.add.container(0, 0)
      .setDepth(depth)
      .setScrollFactor(0)
      .setVisible(false);
    this.frame = this.scene.add.image(0, 0, frameKey)
      .setDisplaySize(layout.cardWidth, layout.cardHeight)
      .setAlpha(presentation.frameAlpha);
    this.iconGlow = this.scene.add.image(layout.iconX, 0, assets.icon)
      .setDisplaySize(layout.iconGlowSize, layout.iconGlowSize)
      .setAlpha(presentation.glowAlpha);
    this.icon = this.scene.add.image(layout.iconX, 0, assets.icon)
      .setDisplaySize(layout.iconSize, layout.iconSize);
    this.title = this._text(layout.textX, layout.titleY, presentation.titleFontSize,
      presentation.titleColor);
    this.reward = this._text(layout.textX, layout.rewardY, presentation.rewardFontSize,
      presentation.rewardColor);
    this.connection = this._text(layout.textX, layout.connectionY,
      presentation.connectionFontSize, presentation.connectionColor);
    this.hint = this._text(layout.textX, layout.hintY, presentation.hintFontSize,
      presentation.hintColor);
    this.hit = this.scene.add.zone(0, 0, layout.cardWidth, layout.cardHeight)
      .setInteractive({ useHandCursor: true });
    this.hit.on("pointerdown", () => this._requestSkip());
    this.root.add([
      this.frame, this.iconGlow, this.icon, this.title,
      this.reward, this.connection, this.hint, this.hit,
    ]);
    this.evolution?.create(this.root);
    this._resize();
  }

  _text(x, y, size, color) {
    return this.scene.add.text(x, y, "", {
      fontFamily: UI_FONTS.display,
      fontSize: `${size}px`,
      fontStyle: "bold",
      color,
      stroke: this.config.presentation.shadowColor,
      strokeThickness: 3,
      wordWrap: { width: this.config.layout.textWidth },
    }).setOrigin(0, 0.5);
  }

  _show(detail) {
    const copy = this.config.copy;
    this.active = true;
    this._finishing = false;
    this.detail = detail;
    this._startedAt = this.scene.time?.now ?? Date.now();
    this.title.setText(copy.title);
    this.reward.setText(detail.refillUpgraded
      ? copy.evolvedReward.replace("{before}", detail.previousRefillCapacity)
        .replace("{after}", detail.refillCapacity)
      : detail.gained === 1 ? copy.reward : copy.rewardCount.replace("{count}", detail.gained));
    this.connection.setText(detail.refillUpgraded && detail.gained > 0
      ? copy.chargeReserve.replace("{count}", detail.gained).replace("{charges}", detail.charges)
      : copy.connection);
    const findDetail = detail.refillUpgraded
      ? copy.firstFind
      : copy.repeatFind.replace("{charges}", String(detail.charges || 0));
    this.hint.setText(`${findDetail}\n${copy.continueHint}`);
    this.evolution?.play(detail);
    this._resize();
    this.root.setVisible(true).setAlpha(0).setScale(
      this._uiScale * (this.reducedMotion ? 1 : this.config.presentation.startScale),
    );
    this._lockInput();
    this.scene.input?.keyboard?.on?.("keydown", this._keyHandler);
    this.scene.soundSystem?.playFirstAvailableSfx?.(
      ["sfx-ui-confirm", "tileHit-0", "footsteps-0"],
      0.62,
    );
    if (!this.reducedMotion) this.scene.shakeSystem?.shake?.("misc.depthMilestone");
    this.scene.tweens?.add?.({
      targets: this.root,
      alpha: 1,
      scaleX: this._uiScale,
      scaleY: this._uiScale,
      duration: this.config.timing.enterMs,
      ease: "Back.Out",
    });
    this.iconGlow.setDisplaySize(this.config.layout.iconGlowSize, this.config.layout.iconGlowSize)
      .setAlpha(this.config.presentation.glowAlpha);
    if (!this.reducedMotion) this.scene.tweens?.add?.({
      targets: this.iconGlow,
      alpha: this.config.presentation.glowAlpha * 0.45,
      scaleX: this.iconGlow.scaleX * this.config.presentation.glowPulseScale,
      scaleY: this.iconGlow.scaleY * this.config.presentation.glowPulseScale,
      duration: this.config.presentation.glowPulseMs,
      yoyo: true,
      repeat: 2,
      ease: "Sine.InOut",
    });
    this._timer?.remove?.();
    this._timer = this.scene.time?.delayedCall?.(
      this.config.timing.holdMs,
      () => this._finish(),
    );
  }

  _requestSkip() {
    if (!this.active) return false;
    const now = this.scene.time?.now ?? Date.now();
    if (now - this._startedAt < this.config.timing.minimumSkipMs) return false;
    this._finish();
    return true;
  }

  _finish() {
    if (!this.active || this._finishing) return;
    this._finishing = true;
    this.evolution?.cancel();
    this._timer?.remove?.();
    this._timer = null;
    const complete = () => this._complete();
    if (!this.scene.tweens?.add) {
      complete();
      return;
    }
    this.scene.tweens.killTweensOf?.([this.root, this.iconGlow]);
    this.scene.tweens.add({
      targets: this.root,
      alpha: 0,
      scaleX: this._uiScale * (this.reducedMotion ? 1 : 0.96),
      scaleY: this._uiScale * (this.reducedMotion ? 1 : 0.96),
      duration: this.config.timing.exitMs,
      ease: "Quad.In",
      onComplete: complete,
    });
  }

  _complete() {
    this.active = false;
    this._finishing = false;
    this.root?.setVisible(false);
    this.scene.input?.keyboard?.off?.("keydown", this._keyHandler);
    this._unlockInput();
    const next = this.queue.shift();
    if (next) this._queueTimer = this.scene.time?.delayedCall?.(80, () => {
      if (!this._destroyed) this.play(next);
    });
  }

  _lockInput() {
    if (this._inputLocked) return;
    this._inputLocked = true;
    this.scene.setShopOpen?.(true);
    this.scene.uiNotifications?.setPaused?.(true);
  }

  _unlockInput() {
    if (!this._inputLocked) return;
    this._inputLocked = false;
    this.scene.setShopOpen?.(false);
    this.scene.uiNotifications?.setPaused?.(false);
  }

  _resize() {
    if (!this.root) return;
    const width = this.scene.scale?.width || this.config.layout.referenceWidth;
    const height = this.scene.scale?.height || this.config.layout.referenceHeight;
    this._uiScale = Math.min(
      1,
      width / this.config.layout.referenceWidth,
      height / this.config.layout.referenceHeight,
    );
    this.root.setPosition(
      width / 2,
      this.config.layout.centerY * this._uiScale,
    );
    if (this.active && !this._finishing) {
      this.scene.tweens?.killTweensOf?.(this.root);
      this.root.setAlpha(1).setScale(this._uiScale);
    } else if (!this.active) this.root.setScale(this._uiScale);
  }

  getSnapshot() {
    return Object.freeze({
      active: this.active,
      queued: this.queue.length,
      title: this.title?.text || "",
      reward: this.reward?.text || "",
      connection: this.connection?.text || "",
      detail: this.hint?.text || "",
      hitWidth: this.hit?.width || 0,
      hitHeight: this.hit?.height || 0,
      iconKey: this.config.assets.icon,
      tile: this.detail?.tile || null,
      evolution: this.evolution?.getSnapshot() ?? null,
    });
  }

  destroy() {
    this._destroyed = true;
    this._queueTimer?.remove?.();
    this._timer?.remove?.();
    this.evolution?.destroy();
    this.scene?.scale?.off?.("resize", this._resizeHandler);
    this.scene?.tweens?.killTweensOf?.([this.root, this.iconGlow]);
    this.scene?.input?.keyboard?.off?.("keydown", this._keyHandler);
    this._unlockInput();
    this.hit?.removeAllListeners?.();
    this.root?.destroy?.(true);
    this.root = null;
    this.scene = null;
  }
}
