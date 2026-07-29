/**
 * Owns ordered transient-notification state without depending on Phaser.
 */
export class NotificationCarouselState {
  constructor(maxQueued) {
    this.maxQueued = Math.max(2, Math.floor(Number(maxQueued) || 2));
    this.entries = [];
    this.currentId = null;
  }

  get current() {
    return this.entries.find(entry => entry.id === this.currentId) || null;
  }

  get size() {
    return this.entries.length;
  }

  get position() {
    const index = this.entries.findIndex(entry => entry.id === this.currentId);
    return index >= 0 ? index + 1 : 0;
  }

  enqueue(entry, { focus = false } = {}) {
    if (!entry?.id) return { accepted: false, evicted: null };

    const wasEmpty = this.entries.length === 0;
    this.entries.push(entry);
    if (wasEmpty || focus || !this.currentId) this.currentId = entry.id;

    let evicted = null;
    if (this.entries.length > this.maxQueued) {
      const hidden = this.entries
        .filter(candidate => candidate.id !== this.currentId)
        .sort((left, right) => (
          (left.priority - right.priority)
          || (left.createdAt - right.createdAt)
        ));
      evicted = hidden[0] || null;
      if (evicted) this.removeById(evicted.id);
    }

    return {
      accepted: evicted?.id !== entry.id,
      evicted,
    };
  }

  consumeCurrent(step = 1) {
    if (!this.currentId) return null;
    const currentIndex = this.entries.findIndex(
      entry => entry.id === this.currentId,
    );
    if (currentIndex < 0) return null;

    const [removed] = this.entries.splice(currentIndex, 1);
    if (this.entries.length === 0) {
      this.currentId = null;
      return removed;
    }

    const nextIndex = step < 0
      ? (currentIndex - 1 + this.entries.length) % this.entries.length
      : currentIndex % this.entries.length;
    this.currentId = this.entries[nextIndex].id;
    return removed;
  }

  removeCurrent() {
    if (!this.currentId) return null;
    return this.removeById(this.currentId);
  }

  removeById(id) {
    const index = this.entries.findIndex(entry => entry.id === id);
    if (index < 0) return null;

    const [removed] = this.entries.splice(index, 1);
    if (removed.id === this.currentId) {
      const next = this.entries[index] || this.entries[0] || null;
      this.currentId = next?.id || null;
    }
    return removed;
  }

  clear() {
    const removed = [...this.entries];
    this.entries.length = 0;
    this.currentId = null;
    return removed;
  }
}
