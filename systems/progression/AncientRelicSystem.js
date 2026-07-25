import { ANCIENT_RELIC_CONFIG } from "../../values/ancientRelics.js";

function sanitizeRelicCount(value) {
  const numericValue = Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.max(0, Math.min(ANCIENT_RELIC_CONFIG.persistence.maxRelics, numericValue));
}

export class AncientRelicSystem {
  constructor(initialCount = 0) {
    this.count = sanitizeRelicCount(initialCount);
  }

  add(amount = 1) {
    const previous = this.count;
    this.count = sanitizeRelicCount(this.count + amount);
    return this.count - previous;
  }

  getCount() {
    return this.count;
  }

  getSaveData() {
    return { count: this.count };
  }

  loadSaveData(data) {
    this.count = sanitizeRelicCount(data?.count);
  }
}
