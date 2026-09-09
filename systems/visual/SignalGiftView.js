import { SIGNAL_EVENT as cfg } from "../../values/signalEvent.js";
import { RESOURCE_KEYS, getResourceDisplayName } from "../../values/resourceTypes.js";

export class SignalGiftView {
  constructor(owner) { this.owner = owner; this.root = null; this.amounts = {}; this.page = 0; this.index = 0; }
  show(resources) {
    this.destroy();
    this.resources = resources;
    this.keys = RESOURCE_KEYS.filter(key => (resources[key] || 0) > 0);
    this.amounts = {}; this.page = 0; this.index = 0; this.replace = true;
    this.root = this.owner.scene.add.container(0, 0);
    this.owner.root.add(this.root);
    this.draw();
  }
  draw() {
    this.root.removeAll(true);
    const owner = this.owner, c = cfg.cinema;
    const count = Math.max(1, Math.ceil(this.keys.length / c.giftRows));
    const visible = this.keys.slice(this.page * c.giftRows, (this.page + 1) * c.giftRows);
    if (!visible.length) this.root.add(owner.text(0, 0, "Your pack is empty.", 20));
    visible.forEach((key, row) => {
      const index = row + this.page * c.giftRows, y = c.giftStartY + row * c.giftRowGap;
      const rowButton = owner.button(80, y, c.giftWidth, 38,
        (index === this.index ? "› " : "") + getResourceDisplayName(key)
        + "   " + (this.amounts[key] || 0) + " / " + this.resources[key],
        () => { this.index = index; this.replace = true; this.draw(); });
      this.root.add(rowButton);
    });
    this.root.add(owner.button(-240, c.giftNavY, 140, c.giftNavHeight, "‹ PAGE", () => this.changePage(-1)));
    this.root.add(owner.text(0, c.giftNavY, (this.page + 1) + " / " + count, 14));
    this.root.add(owner.button(240, c.giftNavY, 140, c.giftNavHeight, "PAGE ›", () => this.changePage(1)));
  }
  changePage(step) {
    const pages = Math.max(1, Math.ceil(this.keys.length / cfg.cinema.giftRows));
    this.page = (this.page + step + pages) % pages;
    this.index = this.page * cfg.cinema.giftRows; this.replace = true; this.draw();
  }
  key(event) {
    const key = event.key;
    if (key.toLowerCase() === "a") { this.changePage(-1); return; }
    if (key.toLowerCase() === "d") { this.changePage(1); return; }
    if (!this.keys.length) return;
    if (key === "Tab" || key === "ArrowDown" || key === "ArrowUp") {
      const step = key === "ArrowUp" || event.shiftKey ? -1 : 1;
      this.index = (this.index + step + this.keys.length) % this.keys.length;
      this.page = Math.floor(this.index / cfg.cinema.giftRows); this.replace = true;
    } else {
      const resource = this.keys[this.index];
      let value = String(this.amounts[resource] || "");
      if (/^[0-9]$/.test(key)) { value = (this.replace ? "" : value) + key; this.replace = false; }
      else if (key === "Backspace") { value = value.slice(0, -1); this.replace = false; }
      else if (key === "ArrowRight") value = String(Math.min(this.resources[resource], (Number(value) || 0) + 1));
      else if (key === "ArrowLeft") value = String(Math.max(0, (Number(value) || 0) - 1));
      if (value.length <= 15) this.amounts[resource] = Number(value) || 0;
    }
    this.draw();
  }
  destroy() { this.root?.destroy(true); this.root = null; }
}
