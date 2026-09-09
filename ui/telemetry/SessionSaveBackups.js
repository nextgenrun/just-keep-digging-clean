import { PLAYER_SESSION_LOGGING as C } from '../../values/playerSessionLogging.js';
import { PORTABLE_SAVE_FILE } from '../../values/saveTransfer.js';
import { isHardcoreMode } from '../../values/hardcoreMode.js';
// Backup transport only: no automatic remote restore and no write to a game slot.
export class SessionSaveBackups {
  constructor(service) { this.service = service; this.pending = new Map(); this.lastAt = new Map(); this.lastRevision = new Map(); }
  committed({ slot, store, revision } = {}) {
    if (!this.service.enabled || !store || !Number.isInteger(Number(slot))) return;
    this.pending.set(Number(slot), { store, revision });
    this.service.record('save_committed', { slot: Number(slot), revision });
  }
  async flush(force = false) {
    if (!this.service.enabled || !this.service.identity || !this.service.outbox.persistent) return;
    for (const [slot, entry] of this.pending) {
      if (!force && Date.now() - (this.lastAt.get(slot) || 0) < C.backupIntervalMs) continue;
      if (entry.store.isDeathTombstoned()) { this.pending.delete(slot); continue; }
      const saved = entry.store.normalizePayload(entry.store.loadFromLocalStorage());
      if (!saved || isHardcoreMode(saved.hardcoreModeData)) { this.pending.delete(slot); continue; }
      const revision = saved.revisionMetadata?.revision;
      const revisionKey = JSON.stringify([saved.world, revision, saved.updatedAt]);
      if (this.lastRevision.get(slot) === revisionKey) { this.pending.delete(slot); continue; }
      const portable = { format: PORTABLE_SAVE_FILE.format, formatVersion: PORTABLE_SAVE_FILE.formatVersion,
        version: saved.version, payloadVersion: saved.version, checksumAlgorithm: PORTABLE_SAVE_FILE.checksumAlgorithm,
        payloadChecksum: entry.store.backupManager.calculateChecksum(saved), exportedAt: new Date().toISOString(),
        slotId: slot, saveData: saved };
      const body = { schema: C.schemaVersion, kind: 'save', id: crypto.randomUUID(), createdAt: Date.now(),
        player: this.service.identity.player, ownerToken: this.service.identity.token, slot, portableJson: JSON.stringify(portable) };
      if (await this.service.outbox.put(body)) {
        this.lastRevision.set(slot, revisionKey); this.lastAt.set(slot, Date.now());
        if (this.pending.get(slot) === entry) this.pending.delete(slot);
        this.service.record('backup_queued', { slot, revision });
      }
    }
  }
}
