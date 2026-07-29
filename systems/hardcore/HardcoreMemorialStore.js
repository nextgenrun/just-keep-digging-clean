import { HARDCORE_MEMORIAL_CONFIG } from "../../values/hardcoreMemorials.js";
import { sanitizeHardcoreMemorialRecord } from "./hardcoreMemorialRecord.js";

function resolveStorage(explicitStorage) {
  if (explicitStorage) return explicitStorage;
  return globalThis.window?.localStorage ?? globalThis.localStorage ?? null;
}

export class HardcoreMemorialStore {
  constructor(options = {}) {
    this.config = options.config || HARDCORE_MEMORIAL_CONFIG;
    this.storage = resolveStorage(options.storage);
  }

  _readPayload() {
    if (!this.storage) return { version: this.config.version, records: [] };
    try {
      const raw = this.storage.getItem(this.config.persistence.storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      const records = Array.isArray(parsed?.records)
        ? parsed.records
          .map(sanitizeHardcoreMemorialRecord)
          .slice(-this.config.persistence.maximumRecords)
        : [];
      return { version: this.config.version, records };
    } catch (error) {
      console.warn("[HardcoreMemorialStore] Could not read memorials:", error);
      return { version: this.config.version, records: [] };
    }
  }

  _writePayload(payload) {
    if (!this.storage) return false;
    try {
      this.storage.setItem(
        this.config.persistence.storageKey,
        JSON.stringify(payload),
      );
      return true;
    } catch (error) {
      console.error("[HardcoreMemorialStore] Could not persist memorial:", error);
      return false;
    }
  }

  append(value) {
    const record = sanitizeHardcoreMemorialRecord(value);
    const payload = this._readPayload();
    const records = payload.records.filter(entry => entry.id !== record.id);
    records.push(record);
    const bounded = records.slice(-this.config.persistence.maximumRecords);
    const persisted = this._writePayload({
      version: this.config.version,
      records: bounded,
    });
    return { record, persisted };
  }

  getAll() {
    return this._readPayload().records.map(record => ({
      ...record,
      position: { ...record.position },
      player: { ...record.player },
      hardcore: { ...record.hardcore },
      stats: { ...record.stats },
      achievements: record.achievements.map(event => ({ ...event })),
    }));
  }

  getForSlot(slotId) {
    const normalizedSlot = Math.max(1, Math.floor(Number(slotId) || 1));
    return this.getAll()
      .filter(record => record.slotId === normalizedSlot)
      .slice(-this.config.persistence.maximumRecordsPerSlot);
  }
}
