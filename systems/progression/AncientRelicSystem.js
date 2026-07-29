import { ANCIENT_RELIC_CONFIG } from "../../values/ancientRelics.js";

function sanitizeRelicCount(value) {
  const numericValue = Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.max(0, Math.min(ANCIENT_RELIC_CONFIG.persistence.maxRelics, numericValue));
}

export class AncientRelicSystem {
  constructor(initialCount = 0) {
    this.count = sanitizeRelicCount(initialCount);
    this.listeners = new Set();
  }

  add(amount = 1) {
    const previous = this.count;
    this.count = sanitizeRelicCount(this.count + amount);
    const gained = this.count - previous;
    if (gained !== 0) this._emit(previous, "add");
    return gained;
  }

  getCount() {
    return this.count;
  }

  getSaveData() {
    return { count: this.count };
  }

  loadSaveData(data) {
    const previous = this.count;
    this.count = sanitizeRelicCount(data?.count);
    if (previous !== this.count) this._emit(previous, "load");
  }

  subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _emit(previous, source) {
    const snapshot = Object.freeze({ count: this.count, previous, source });
    for (const listener of this.listeners) listener(snapshot);
  }
}
