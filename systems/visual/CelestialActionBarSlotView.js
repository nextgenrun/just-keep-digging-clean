// Renders and owns interaction for one image-backed Celestial actionbar slot.

import { CELESTIAL_ACTION_BAR_CONFIG } from "../../values/celestialActionBar.js";
import { UI_FONTS } from "../../values/uiLayout.js";

function textStyle(fontFamily, fontSizePx, color) {
  const presentation = CELESTIAL_ACTION_BAR_CONFIG.presentation;
  return {
    fontFamily,
    fontSize: `${fontSizePx}px`,
    fontStyle: "bold",
    color,
    stroke: presentation.shadowColor,
    strokeThickness: presentation.shadowThicknessPx,
    align: "center",
  };
}

export class CelestialActionBarSlotView {
  constructor(scene, entry, assetHealth, callbacks = {}) {
    this.scene = scene;
    this.entry = entry;
    this.callbacks = callbacks;
    this.config = CELESTIAL_ACTION_BAR_CONFIG;
    this.basePosition = { x: 0, y: 0 };
    this.uiScale = 1;
    this.state = null;
    this.dragging = false;
    this.draggedSincePointerDown = false;
    this.destroyed = false;
    this.bindings = [];

    const layout = this.config.layout;
    const presentation = this.config.presentation;
    const icon = assetHealth.icons[entry.id];
    this.root = scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(presentation.depth)
      .setSize(layout.slotSizePx, layout.slotSizePx)
      .setInteractive({ useHandCursor: true });
    this.icon = scene.add.image(0, 0, icon.key, icon.frame)
      .setDisplaySize(layout.iconSizePx, layout.iconSizePx);
    this.keyText = scene.add.text(
      layout.keyOffsetXPx,
      layout.keyOffsetYPx,
      "",
      textStyle(UI_FONTS.mono, presentation.keyFontSizePx, presentation.textColor),
    ).setOrigin(0.5);
    this.root.add([
      this.icon,
      this.keyText,
    ]);

    scene.input.setDraggable(this.root, true);
    this.draggable = true;
    this._bindInteraction();
  }

  _listen(eventName, handler) {
    this.root.on(eventName, handler);
    this.bindings.push({ eventName, handler });
  }

  _bindInteraction() {
    this._listen("pointerdown", () => {
      this.draggedSincePointerDown = false;
    });
    this._listen("pointerup", pointer => {
      const dragged = this.draggedSincePointerDown;
      this.draggedSincePointerDown = false;
      if (!dragged) this.callbacks.onActivate?.(this, pointer);
    });
    this._listen("pointerover", pointer => {
      if (!this.dragging) this.callbacks.onHover?.(this, pointer);
    });
    this._listen("pointerout", pointer => {
      if (!this.dragging) this.callbacks.onOut?.(this, pointer);
    });
    this._listen("dragstart", pointer => {
      this.draggedSincePointerDown = true;
      this.setDragging(true);
      this.callbacks.onDragStart?.(this, pointer);
    });
    this._listen("drag", (pointer, dragX, dragY) => {
      this.root.setPosition(dragX, dragY);
      this.callbacks.onDrag?.(this, pointer, dragX, dragY);
    });
    this._listen("dragend", pointer => {
      this.callbacks.onDragEnd?.(this, pointer);
      this.setDragging(false);
    });
  }

  setSlotNumber(slotNumber) {
    this.slotNumber = slotNumber;
    this.keyText.setText(String(slotNumber));
  }

  setBasePosition(x, y, uiScale) {
    this.basePosition = { x, y };
    this.uiScale = uiScale;
    if (!this.dragging) this.snapToBase();
  }

  snapToBase() {
    this.root.setPosition(this.basePosition.x, this.basePosition.y);
    this._applyScale();
    this.root.setDepth(this.config.presentation.depth);
  }

  setDragging(value) {
    this.dragging = value === true;
    if (!this.dragging) {
      this.snapToBase();
      return;
    }
    this.root.setDepth(this.config.presentation.dragDepth);
    this._applyScale();
  }

  setState(state) {
    this.state = state;
    const presentation = this.config.presentation;
    const locked = state.unlocked !== true;
    const available = !locked && state.available !== false;

    this.icon.setVisible(!locked).clearTint();
    if (locked) {
      // An unowned ability is an empty socket. The hover target and shortcut
      // label stay available, but repeated lock seals and ghost icons do not.
      this.icon.setAlpha(0);
    } else if (!available) {
      this.icon.setTint(presentation.unavailableTint)
        .setAlpha(presentation.unavailableAlpha);
    } else {
      this.icon.setAlpha(presentation.readyAlpha);
    }
    this._applyScale();
  }

  _applyScale() {
    const presentation = this.config.presentation;
    const stateScale = this.state?.active === true ? presentation.activeScale : 1;
    const dragScale = this.dragging ? presentation.dragScale : 1;
    this.root.setScale(this.uiScale * stateScale * dragScale);
  }

  pulse() {
    const presentation = this.config.presentation;
    const baseScale = this.uiScale * (this.state?.active === true
      ? presentation.activeScale
      : 1);
    this.scene.tweens?.killTweensOf?.(this.root);
    this.scene.tweens?.add?.({
      targets: this.root,
      scale: baseScale * presentation.activationPulseScale,
      duration: presentation.activationPulseMs,
      yoyo: true,
      ease: "Back.out",
      onComplete: () => this._applyScale(),
    });
  }

  containsScreenPoint(x, y) {
    const radius = this.config.interaction.dropRadiusPx * this.uiScale;
    return Math.abs(x - this.basePosition.x) <= radius
      && Math.abs(y - this.basePosition.y) <= radius;
  }

  setVisible(visible) {
    this.root.setVisible(visible === true);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    const root = this.root;
    const isLive = root?.scene?.sys != null;
    if (isLive) this.scene?.tweens?.killTweensOf?.(root);
    if (isLive && this.draggable && root.input) {
      this.scene?.input?.setDraggable?.(root, false);
    }
    this.draggable = false;
    for (const { eventName, handler } of this.bindings) {
      root?.off?.(eventName, handler);
    }
    this.bindings = [];
    root?.destroy?.(true);
    this.root = null;
  }
}
