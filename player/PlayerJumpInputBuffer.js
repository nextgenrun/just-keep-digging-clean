import { PLAYER_TRAVERSAL_CONFIG } from "../values/playerTraversal.js";

/** Keeps one short jump press alive until the next eligible input sample. */
export class PlayerJumpInputBuffer {
  constructor(input, now = () => globalThis.performance?.now?.() ?? Date.now()) {
    this.input = input;
    this.now = now;
    this.key = null;
    this.expiresAtMs = -Infinity;
    this.onDown = (_key, event) => {
      if (!this.input.controlsEnabled || event?.repeat === true) return;
      this.expiresAtMs = this.now() + PLAYER_TRAVERSAL_CONFIG.jump.inputBufferMs;
    };
    this.onShutdown = () => this.destroy();
    this.bind(input.keys?.jump);
    this.input.scene?.events?.once?.("shutdown", this.onShutdown);
  }

  bind(key) {
    this.key?.off?.("down", this.onDown);
    this.clear();
    this.key = key || null;
    this.clear();
    this.key?.on?.("down", this.onDown);
  }

  clear() {
    this.expiresAtMs = -Infinity;
    if (this.key) Phaser.Input.Keyboard.JustDown(this.key);
  }

  consume() {
    const buffered = this.now() <= this.expiresAtMs;
    const justDown = this.key && Phaser.Input.Keyboard.JustDown(this.key);
    this.expiresAtMs = -Infinity;
    if (!this.input.controlsEnabled || !this.key) return false;
    // Phaser clears JustDown on key-up. Event-backed keys use the bounded
    // request even after release; simple test/fallback keys retain polling.
    return typeof this.key.on === "function" ? buffered : justDown === true;
  }

  destroy() {
    this.bind(null);
    this.input.scene?.events?.off?.("shutdown", this.onShutdown);
  }
}
