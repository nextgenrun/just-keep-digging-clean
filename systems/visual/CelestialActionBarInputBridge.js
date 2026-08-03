// Owns fixed 1-5 actionbar hotkeys while activation remains in the actionbar/controller.

import { CELESTIAL_ACTION_BAR_CONFIG } from "../../values/celestialActionBar.js";

const HOTKEY_NAMES = Object.freeze(["ONE", "TWO", "THREE", "FOUR", "FIVE"]);

export class CelestialActionBarInputBridge {
  constructor(scene, actionBar, { isEnabled = null } = {}) {
    this.scene = scene;
    this.actionBar = actionBar;
    this.isEnabled = typeof isEnabled === "function" ? isEnabled : () => true;
    this.destroyed = false;
    this.keys = HOTKEY_NAMES.slice(0, CELESTIAL_ACTION_BAR_CONFIG.slotCount)
      .map(name => scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[name]));
  }

  update() {
    if (this.destroyed || !this.isEnabled()) return false;
    for (let index = 0; index < this.keys.length; index += 1) {
      if (!Phaser.Input.Keyboard.JustDown(this.keys[index])) continue;
      this.actionBar?.activateSlot?.(index + 1, "keyboard");
      return true;
    }
    return false;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const key of this.keys) key?.destroy?.();
    this.keys = [];
    this.actionBar = null;
    this.isEnabled = null;
  }
}
