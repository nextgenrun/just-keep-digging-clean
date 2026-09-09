export class AudioReviewDecisionStore {
  constructor(flowConfig, storage = null) {
    this.config = flowConfig;
    this.storage = storage || (
      typeof window !== "undefined" ? window.localStorage : null
    );
    this.decisions = this._load();
  }

  get(itemId) {
    return this.decisions[itemId] || null;
  }

  getAll() {
    return { ...this.decisions };
  }

  set(itemId, decision) {
    if (!this.config.reviewItemIds.includes(itemId)) return false;
    const allowed = Object.values(this.config.decisions);
    if (!allowed.includes(decision)) return false;
    this.decisions[itemId] = decision;
    this._save();
    return true;
  }

  clear(itemId) {
    if (!this.decisions[itemId]) return false;
    delete this.decisions[itemId];
    this._save();
    return true;
  }

  clearAll() {
    this.decisions = {};
    this._save();
  }

  summary() {
    const values = this.config.reviewItemIds.map(itemId => this.get(itemId));
    const approved = values.filter(
      value => value === this.config.decisions.approved,
    ).length;
    const rejected = values.filter(
      value => value === this.config.decisions.rejected,
    ).length;
    return {
      approved,
      rejected,
      open: this.config.reviewItemIds.length - approved - rejected,
      total: this.config.reviewItemIds.length,
    };
  }

  exportPayload() {
    return {
      schemaVersion: this.config.schemaVersion,
      exportedAt: new Date().toISOString(),
      decisions: this.getAll(),
      summary: this.summary(),
    };
  }

  download(documentRef = null) {
    const activeDocument = documentRef || (
      typeof document !== "undefined" ? document : null
    );
    if (!activeDocument || typeof Blob === "undefined") return false;
    const blob = new Blob(
      [JSON.stringify(this.exportPayload(), null, 2)],
      { type: "application/json" },
    );
    const href = URL.createObjectURL(blob);
    const anchor = activeDocument.createElement("a");
    anchor.href = href;
    anchor.download = this.config.exportFilename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(href), 0);
    return true;
  }

  _load() {
    if (!this.storage) return {};
    try {
      const parsed = JSON.parse(this.storage.getItem(this.config.decisionStorageKey) || "{}");
      return Object.fromEntries(Object.entries(parsed).filter(([itemId, decision]) => (
        this.config.reviewItemIds.includes(itemId)
        && Object.values(this.config.decisions).includes(decision)
      )));
    } catch {
      return {};
    }
  }

  _save() {
    try {
      this.storage?.setItem(
        this.config.decisionStorageKey,
        JSON.stringify(this.decisions),
      );
    } catch {
      // Review decisions remain available in memory if storage is unavailable.
    }
  }
}
