export class BrowserStorageRepository {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
  }

  read(key) {
    try { return this.storage?.getItem?.(key) ?? null; } catch { return null; }
  }

  readJson(key, fallback = null) {
    const raw = this.read(key);
    if (raw === null) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  write(key, value) {
    try {
      this.storage?.setItem?.(key, String(value));
      return true;
    } catch { return false; }
  }

  writeJson(key, value) {
    try { return this.write(key, JSON.stringify(value)); } catch { return false; }
  }

  remove(key) {
    try {
      this.storage?.removeItem?.(key);
      return true;
    } catch { return false; }
  }
}
