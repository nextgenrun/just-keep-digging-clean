/** Keeps the bounded priority queue for non-interrupting voice requests. */
export class VoiceLineRequestQueue {
  constructor(maxLength, onDrop = () => {}) {
    this.maxLength = maxLength;
    this.onDrop = onDrop;
    this.items = [];
  }

  get length() {
    return this.items.length;
  }

  includes(request) {
    return this.items.includes(request);
  }

  hasId(id) {
    return this.items.some(request => request.id === id);
  }

  ids() {
    return this.items.map(request => request.id);
  }

  enqueue(request, now) {
    const expired = this.dropExpired(now);
    if (this.hasId(request.id)) {
      return { accepted: false, reason: "queue-duplicate", expired, replaced: 0 };
    }
    let replaced = 0;
    if (this.items.length >= this.maxLength) {
      const lowest = this.items.reduce((candidate, item) => (
        !candidate || item.priority < candidate.priority ? item : candidate
      ), null);
      if (!lowest || request.priority <= lowest.priority) {
        return { accepted: false, reason: "queue-full", expired, replaced };
      }
      this.items.splice(this.items.indexOf(lowest), 1);
      this.onDrop(lowest, "priority-replaced");
      replaced = 1;
    }
    this.items.push(request);
    this.items.sort((left, right) => (
      right.priority - left.priority || left.createdAtMs - right.createdAtMs
    ));
    return { accepted: true, reason: "queued", expired, replaced };
  }

  shift() {
    return this.items.shift() || null;
  }

  dropExpired(now) {
    const expired = this.items.filter(request => request.expiresAtMs <= now);
    this.items = this.items.filter(request => request.expiresAtMs > now);
    expired.forEach(request => this.onDrop(request, "expired"));
    return expired.length;
  }

  clear() {
    this.items.forEach(request => this.onDrop(request, "destroyed"));
    this.items.length = 0;
  }
}
