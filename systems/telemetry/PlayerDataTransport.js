import { PLAYER_SESSION_LOGGING as C } from '../../values/playerSessionLogging.js';
export class PlayerDataTransport {
  constructor(outbox, { endpoint, fetch = globalThis.fetch?.bind(globalThis), navigator = globalThis.navigator } = {}) {
    Object.assign(this, { outbox, endpoint, fetch, navigator });
    this.inFlight = false; this.nextAttempt = 0; this.failures = 0; this.acknowledged = 0;
    this.lastStatus = 'waiting'; this.enabled = true; this.abort = null;
  }
  async drain() {
    if (!this.enabled || this.inFlight || Date.now() < this.nextAttempt || !this.fetch) return;
    this.inFlight = true;
    try {
      for (const item of await this.outbox.list()) {
        if (!this.enabled) break;
        if (Date.now() - item.createdAt > C.queueLifetimeMs) { await this.outbox.remove(item.id); continue; }
        const controller = new AbortController(); this.abort = controller;
        const timer = setTimeout(() => controller.abort(), C.requestTimeoutMs);
        try {
          const response = await this.fetch(this.endpoint, { method: 'POST', credentials: 'omit',
            headers: { 'Content-Type': 'application/json' }, body: item.text,
            signal: controller.signal, cache: 'no-store' });
          if (!response.ok) throw new Error('Delivery failed');
          const receipt = await response.json();
          if (receipt.ok !== true || receipt.copies !== 2 || receipt.id !== item.id) throw new Error('Missing two-copy receipt');
        } finally { clearTimeout(timer); this.abort = null; }
        await this.outbox.remove(item.id);
        this.acknowledged++; this.failures = 0; this.lastStatus = 'stored_twice';
      }
    } catch {
      this.lastStatus = 'retry_pending'; this.failures++;
      this.nextAttempt = Date.now() + Math.min(C.retryMaxMs, C.flushIntervalMs * 2 ** Math.min(this.failures, 4));
    } finally { this.inFlight = false; }
  }
  beacon(item) {
    if (!this.enabled || !item || item.kind === 'save' || item.bytes > C.maxBatchBytes) return false;
    try { return this.navigator?.sendBeacon?.(this.endpoint, new Blob([item.text], { type: 'application/json' })) === true; }
    catch { return false; }
    // Beacons have no storage receipt: their item deliberately remains queued.
  }
  stop() { this.enabled = false; this.abort?.abort(); }
}
