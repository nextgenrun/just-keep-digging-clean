import { WORLD_MAP_CONFIG } from "../../../values/worldMapConfig.js";

/** Owns one readable text label and its larger, aligned mouse hit target. */
export class WorldMapTextButton {
  constructor(scene, root, label, options) {
    this.scene = scene;
    this.label = label;
    this.activate = options.activate;
    this.baseColor = options.baseColor || WORLD_MAP_CONFIG.colors.body;
    this.enabled = true;
    this.hovered = false;

    this.zone = scene.add.zone(options.x, options.y, options.width, options.height)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive({ cursor: WORLD_MAP_CONFIG.input.buttonCursor });
    this.zone.input?.hitArea?.setTo?.(0, 0, options.width, options.height);
    root.add(this.zone);

    this.zone.on("pointerover", this._onPointerOver, this);
    this.zone.on("pointerout", this._onPointerOut, this);
    this.zone.on("pointerdown", this._onPointerDown, this);
  }

  _onPointerOver() {
    this.hovered = true;
    this._applyVisualState();
  }

  _onPointerOut() {
    this.hovered = false;
    this.scene?.tweens?.killTweensOf?.(this.label);
    this.label?.setScale?.(1);
    this._applyVisualState();
  }

  _onPointerDown(_pointer, _localX, _localY, event) {
    event?.stopPropagation?.();
    if (!this.enabled) return;
    const scene = this.scene;
    const accepted = this.activate?.();
    if (accepted === false) return;
    scene?.soundSystem?.playUiSelect?.();
    if (!this.label) return;
    const label = this.label;
    scene?.tweens?.killTweensOf?.(label);
    label.setScale?.(1);
    scene?.tweens?.add?.({
      targets: label,
      scale: WORLD_MAP_CONFIG.input.pressScale,
      duration: WORLD_MAP_CONFIG.input.pressDurationMs,
      yoyo: true,
      ease: "Quad.out",
    });
  }

  _applyVisualState() {
    const color = this.enabled && this.hovered
      ? WORLD_MAP_CONFIG.colors.active
      : this.baseColor;
    this.label?.setColor?.(color);
    this.label?.setAlpha?.(this.enabled ? 1 : WORLD_MAP_CONFIG.input.disabledAlpha);
    if (this.zone?.input) {
      this.zone.input.cursor = this.enabled
        ? WORLD_MAP_CONFIG.input.buttonCursor
        : WORLD_MAP_CONFIG.input.disabledCursor;
    }
    if (!this.scene?.tweens || !this.label) return;
    if (this.hovered && this.enabled) {
      this.label.setScale(WORLD_MAP_CONFIG.input.hoverScale);
    } else {
      this.label.setScale(1);
    }
  }

  setBaseColor(color) {
    this.baseColor = color || WORLD_MAP_CONFIG.colors.body;
    this._applyVisualState();
  }

  setEnabled(enabled) {
    this.enabled = enabled === true;
    this._applyVisualState();
  }

  destroy() {
    this.scene?.tweens?.killTweensOf?.(this.label);
    this.zone?.removeAllListeners?.();
    this.zone?.destroy?.();
    this.label?.destroy?.();
    this.scene = null;
    this.zone = null;
    this.label = null;
    this.activate = null;
  }
}
