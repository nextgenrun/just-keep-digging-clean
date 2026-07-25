const approach = (current, target, amount) => current + ((target - current) * amount);

export class FlightInput {
  constructor() {
    this.keys = new Set();
    this.bank = 0;
    this.lift = 0;
    this.onKeyDown = event => this.handleKey(event, true);
    this.onKeyUp = event => this.handleKey(event, false);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  handleKey(event, pressed) {
    const code = event.code;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(code)) {
      event.preventDefault();
    }
    if (pressed) this.keys.add(code);
    else this.keys.delete(code);
  }

  update(deltaMs) {
    const response = Math.min(1, deltaMs / 105);
    const bankTarget = (this.isDown("KeyD", "ArrowRight") ? 1 : 0)
      - (this.isDown("KeyA", "ArrowLeft") ? 1 : 0);
    const liftTarget = (this.isDown("KeyS", "ArrowDown") ? 1 : 0)
      - (this.isDown("KeyW", "ArrowUp") ? 1 : 0);
    this.bank = approach(this.bank, bankTarget, response);
    this.lift = approach(this.lift, liftTarget, response);
  }

  isDown(...codes) { return codes.some(code => this.keys.has(code)); }

  snapshot() {
    return {
      bank: this.bank,
      lift: this.lift,
      boostHeld: this.isDown("ShiftLeft", "ShiftRight"),
    };
  }

  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }
}
