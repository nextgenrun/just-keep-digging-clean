import { PLAYER_SESSION_LOGGING as C } from '../../values/playerSessionLogging.js';
// Separate bounded database; gameplay localStorage is never used.
export class PlayerDataOutbox {
  constructor(indexedDB = globalThis.indexedDB) {
    this.indexedDB = indexedDB; this.db = null; this.memory = new Map(); this.lost = 0; this.persistent = false;
  }
  async open() {
    if (!this.indexedDB) return;
    try {
      this.db = await new Promise((resolve, reject) => {
        const request = this.indexedDB.open(C.databaseName, C.databaseVersion);
        const timer = setTimeout(() => reject(new Error('Database unavailable')), C.requestTimeoutMs);
        request.onupgradeneeded = () => {
          for (const name of [C.queueStore, C.metadataStore]) {
            if (!request.result.objectStoreNames.contains(name))
              request.result.createObjectStore(name, name === C.queueStore ? { keyPath: 'id' } : undefined);
          }
        };
        request.onsuccess = () => { clearTimeout(timer); resolve(request.result); };
        request.onerror = request.onblocked = () => { clearTimeout(timer); reject(request.error); };
      });
      this.persistent = true;
      this.db.onversionchange = () => { this.db?.close(); this.db = null; this.persistent = false; };
    } catch { this.db = null; }
  }
  async transaction(store, mode, operation) {
    if (!this.db) return undefined;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, mode), request = operation(tx.objectStore(store));
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  }
  async identity() {
    const fresh = () => ({ player: crypto.randomUUID(),
      token: Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join(''),
      enabled: true });
    if (!this.db) return fresh();
    try {
      return await new Promise((resolve, reject) => {
        const tx = this.db.transaction(C.metadataStore, 'readwrite'), store = tx.objectStore(C.metadataStore);
        const request = store.get('owner'); let identity;
        request.onsuccess = () => {
          identity = request.result;
          if (!identity?.player || !identity?.token) { identity = fresh(); store.put(identity, 'owner'); }
        };
        tx.oncomplete = () => resolve(identity); tx.onerror = tx.onabort = () => reject(tx.error);
      });
    } catch { this.persistent = false; return fresh(); }
  }
  async saveIdentity(identity) {
    try { await this.transaction(C.metadataStore, 'readwrite', store => store.put(identity, 'owner')); } catch {}
  }
  async list() {
    let stored = [];
    try { stored = await this.transaction(C.queueStore, 'readonly', store => store.getAll()) || []; } catch {}
    return [...new Map([...stored, ...this.memory.values()].map(item => [item.id, item])).values()]
      .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  }
  async put(body) {
    const text = JSON.stringify(body);
    const item = { id: body.id, createdAt: body.createdAt, kind: body.kind, text, bytes: new TextEncoder().encode(text).byteLength };
    if (item.bytes > (body.kind === 'save' ? C.maxBackupBytes : C.maxBatchBytes)) { this.lost++; return false; }
    this.memory.set(item.id, item);
    const entries = await this.list();
    let bytes = entries.filter(e => e.kind !== 'save').reduce((sum, e) => sum + e.bytes, 0);
    let logs = entries.filter(e => e.kind !== 'save').length, backups = entries.filter(e => e.kind === 'save').length;
    for (const entry of entries) {
      const expired = Date.now() - entry.createdAt > C.queueLifetimeMs;
      const overflow = entry.kind === 'save' ? backups > C.maxQueuedBackups : logs > C.maxQueuedBatches || bytes > C.maxQueueBytes;
      if (!expired && !overflow) continue;
      await this.remove(entry.id); this.lost++;
      if (entry.kind === 'save') backups--; else { logs--; bytes -= entry.bytes; }
    }
    if (!this.memory.has(item.id)) return false;
    try {
      if (this.db) { await this.transaction(C.queueStore, 'readwrite', store => store.put(item)); this.memory.delete(item.id); }
    } catch { /* Retain bounded memory only, never fall back to gameplay storage. */ }
    return true;
  }
  async remove(id) {
    this.memory.delete(id);
    try { await this.transaction(C.queueStore, 'readwrite', store => store.delete(id)); } catch {}
  }
  async clear() {
    this.memory.clear();
    try { await this.transaction(C.queueStore, 'readwrite', store => store.clear()); } catch {}
  }
}
