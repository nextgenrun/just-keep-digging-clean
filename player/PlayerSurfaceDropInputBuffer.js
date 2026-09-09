/** Keeps one quick DOWN/S press alive until the next gameplay input sample. */
export class PlayerSurfaceDropInputBuffer {
  constructor(input) {
    this.input = input;
    this.key = null;
    this.pending = false;
    this.onDown = (_key, event) => {
      if (!this.input.controlsEnabled
        || this.input.keys?.shift?.isDown
        || event?.shiftKey === true
        || (event?.ctrlKey === true && this.input.keys?.run?.isDown !== true)
        || event?.altKey === true
        || event?.metaKey === true
        || event?.repeat === true) return;
      // Ctrl+DOWN is gameplay while Run is held, including the browser Ctrl+S chord.
      if (event?.ctrlKey === true) event.preventDefault?.();
      this.pending = true;
    };
    this.onShutdown = () => this.destroy();
    this.bind(input.keys?.aimDown);
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
    this.pending = false;
    if (this.key) Phaser.Input.Keyboard.JustDown(this.key);
  }

  consume() {
    const pending = this.pending;
    const justDown = this.key && Phaser.Input.Keyboard.JustDown(this.key);
    this.pending = false;
    if (!this.input.controlsEnabled
      || !this.key
      || this.input.keys?.shift?.isDown) return false;
    // Event-backed keys retain taps through key-up. Test/fallback keys keep
    // Phaser's ordinary JustDown behavior.
    return typeof this.key.on === "function" ? pending : justDown === true;
  }

  destroy() {
    this.bind(null);
    this.input.scene?.events?.off?.("shutdown", this.onShutdown);
  }
}
