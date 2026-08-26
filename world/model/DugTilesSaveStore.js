/**
 * DugTilesSaveStore — Tracks which tiles have been dug/modified by the player.
 * Stores tile coordinates as string keys for O(1) lookup.
 * Full persistence layer with localStorage and optional remote endpoint support.
 */
import { SaveBackupManager } from "../../systems/save-system/SaveBackupManager.js";
import { WORLD_GAMEPLAY_LAYOUT } from "../../values/worldGameplayLayout.js";
import { RESOURCE_ZERO_TOTALS } from "../../values/resourceTypes.js";
import {
  isHardcoreMode,
  isHardcoreModeArmed,
  isHardcoreRunActive,
  sanitizeHardcoreModeData,
} from "../../values/hardcoreMode.js";
import { sanitizePlayerPersistenceData } from "../../values/playerPersistence.js";
import { LegacyProgressSidecarRepository } from
  "../../systems/save-system/LegacyProgressSidecarRepository.js";
import { resolvePlayerLevelSaveState } from
  "../../systems/progression/playerLevelSaveState.js";
import {
  SAVE_PAYLOAD_VERSION,
  sanitizeMilestoneData,
  sanitizeSaveRevisionMetadata,
  sanitizeStarCollectionData,
} from "../../values/savePayloadV15.js";
import {
  createDugTilesSavePayload,
  normalizeDugTilesSavePayload,
  worldMatches,
} from "./DugTilesSaveCodec.js";
export { sanitizeCaveSceneData } from "./DugTilesSaveCodec.js";

const DEFAULT_ENDPOINT = "save-dug-tiles.php";
const LOCAL_STORAGE_KEY = "dig-game-dug-tiles-admin";
const PERMANENT_DEATH_TOMBSTONE_TOKEN = Symbol("permanent-death-tombstone");

export class DugTilesSaveStore {
  constructor(options = {}) {
    this.endpoint = options.endpoint ?? null;
    this.localStorageKey = options.localStorageKey
      ?? (options.slotId ? `dig-game-save-slot-${options.slotId}` : LOCAL_STORAGE_KEY);
    this.slotId = options.slotId || null;
    this.backupManager = new SaveBackupManager({ maxBackups: 5, backupPrefix: 'dig-game-backup' });
    this.deathTombstoneKey = options.deathTombstoneKey
      ?? `dig-game-permadeath-tombstone-${this.slotId || this.localStorageKey}`;
    this.hardcoreCheckpointKey = options.hardcoreCheckpointKey
      ?? `dig-game-hardcore-checkpoint-${this.slotId || this.localStorageKey}`;
    this._deathTombstoned = false;
    this._lastCommittedRevision = 0;
    this.legacyProgressRepository = options.legacyProgressRepository
      ?? new LegacyProgressSidecarRepository({ slotId: this.slotId || 1 });

    // In-memory dug tile tracker (for runtime O(1) lookups)
    this._store = new Map();
  }

  // ── In-memory tracking (runtime fast path) ──

  markDug(tileX, tileY) {
    const key = `${tileX},${tileY}`;
    this._store.set(key, { tileX, tileY, dugAt: Date.now() });
  }

  isDug(tileX, tileY) {
    return this._store.has(`${tileX},${tileY}`);
  }

  unmarkDug(tileX, tileY) {
    this._store.delete(`${tileX},${tileY}`);
  }

  getAllDug() {
    return Array.from(this._store.values()).map(e => [e.tileX, e.tileY]);
  }

  get count() {
    return this._store.size;
  }

  clear() {
    this._store.clear();
  }

  toJSON() {
    return Array.from(this._store.keys());
  }

  fromJSON(data) {
    this._store.clear();
    if (Array.isArray(data)) {
      data.forEach(key => {
        const [x, y] = key.split(',').map(Number);
        this._store.set(key, { tileX: x, tileY: y, dugAt: Date.now() });
      });
    }
  }

  // ── Persistence layer ──

  loadCached(worldIdentity) {
    if (this.isDeathTombstoned()) return null;
    const localPayload = this.loadFromLocalStorage();
    const localData = this._normalizeAndMigratePayload(localPayload, true);
    if (localData && worldMatches(worldIdentity, localData.world)) {
      return this.applyHardcoreCheckpoint(localData, worldIdentity);
    }
    return null;
  }

  loadForDisplay() {
    if (this.isDeathTombstoned()) return null;
    const payload = this.loadFromLocalStorage();
    return this._normalizeAndMigratePayload(payload, true);
  }

  async load(worldIdentity) {
    if (this.isDeathTombstoned()) return null;
    const cached = this.loadCached(worldIdentity);
    if (cached) return cached;
    if (!this.endpoint) return null;
    const remotePayload = await this.loadFromEndpoint();
    if (this.isDeathTombstoned()) return null;
    const remoteData = this._normalizeAndMigratePayload(remotePayload, false);
    if (remoteData && worldMatches(worldIdentity, remoteData.world)) {
      this.saveToLocalStorage(remoteData);
      return this.applyHardcoreCheckpoint(remoteData, worldIdentity);
    }
    return null;
  }

  async save(
    worldIdentity,
    dugTileKeys,
    resources = RESOURCE_ZERO_TOTALS,
    upgrades = null,
    levelData = null,
    specialTileData = null,
    depthGateData = null,
    dayNightData = null,
    rubbleTiles = [],
    playerCharacterId = null,
    caveSceneData = null,
    ancientRelicData = null,
    openingFlightArtifactData = null,
    starHeartData = null,
    retentionData = null,
    heavenblocksData = null,
    hardcoreModeData = null,
    graveborerWurmData = null,
    playerStateData = null,
    campfireData = null,
    journeyData = null,
    celestialOverhaulData = null,
    milestoneData = null,
    starCollectionData = null,
    revisionMetadata = null,
    understarEndingData = null,
  ) {
    if (this.isDeathTombstoned()) return false;
    const payload = this.createPayload(
      worldIdentity,
      dugTileKeys,
      resources,
      upgrades,
      levelData,
      specialTileData,
      depthGateData,
      dayNightData,
      rubbleTiles,
      playerCharacterId,
      caveSceneData,
      ancientRelicData,
      openingFlightArtifactData,
      starHeartData,
      retentionData,
      heavenblocksData,
      hardcoreModeData,
      graveborerWurmData,
      playerStateData,
      campfireData,
      journeyData,
      celestialOverhaulData,
      milestoneData,
      starCollectionData,
      revisionMetadata,
      understarEndingData,
    );
    return this.commitPayload(payload);
  }

  saveSnapshot(snapshot) {
    return this.commitPayload(this.createPayload(
      snapshot.worldIdentity,
      snapshot.dugTileKeys,
      snapshot.resources,
      snapshot.upgrades,
      snapshot.levelData,
      snapshot.specialTileData,
      snapshot.depthGateData,
      snapshot.dayNightData,
      snapshot.rubbleTiles,
      snapshot.playerCharacterId,
      snapshot.caveSceneData,
      snapshot.ancientRelicData,
      snapshot.openingFlightArtifactData,
      snapshot.starHeartData,
      snapshot.retentionData,
      snapshot.heavenblocksData,
      snapshot.hardcoreModeData,
      snapshot.graveborerWurmData,
      snapshot.playerStateData,
      snapshot.campfireData,
      snapshot.journeyData,
      snapshot.celestialOverhaulData,
      snapshot.milestoneData,
      snapshot.starCollectionData,
      snapshot.revisionMetadata,
      snapshot.understarEndingData,
    ));
  }

  async commitPayload(payload) {
    if (this.isDeathTombstoned()) return false;
    const revision = sanitizeSaveRevisionMetadata(payload?.revisionMetadata).revision;
    const storedRevision = this.normalizePayload(this.loadFromLocalStorage())
      ?.revisionMetadata?.revision || 0;
    if (revision <= Math.max(this._lastCommittedRevision, storedRevision)) return false;
    if (!this.saveToLocalStorage(payload)) return false;
    this._lastCommittedRevision = revision;
    this.clearHardcoreCheckpoint();
    if (this.isDeathTombstoned()) { this.clearSave(); return false; }
    if (this.slotId) this.backupManager.createBackup(this.slotId, payload);
    if (!this.endpoint) return true;
    return this.saveToEndpoint(payload);
  }

  createPayload(
    worldIdentity,
    dugTileKeys,
    resources,
    upgrades = null,
    levelData = null,
    specialTileData = null,
    depthGateData = null,
    dayNightData = null,
    rubbleTiles = [],
    playerCharacterId = null,
    caveSceneData = null,
    ancientRelicData = null,
    openingFlightArtifactData = null,
    starHeartData = null,
    retentionData = null,
    heavenblocksData = null,
    hardcoreModeData = null,
    graveborerWurmData = null,
    playerStateData = null,
    campfireData = null,
    journeyData = null,
    celestialOverhaulData = null,
    milestoneData = null,
    starCollectionData = null,
    revisionMetadata = null,
    understarEndingData = null,
  ) {
    return createDugTilesSavePayload({
      worldIdentity, dugTileKeys, resources, upgrades, levelData,
      specialTileData, depthGateData, dayNightData, rubbleTiles,
      playerCharacterId, caveSceneData, ancientRelicData,
      openingFlightArtifactData, starHeartData, retentionData,
      heavenblocksData, hardcoreModeData, graveborerWurmData,
      playerStateData, campfireData, journeyData, celestialOverhaulData,
      milestoneData, starCollectionData,
      understarEndingData,
      revisionMetadata: revisionMetadata ?? this._createNextRevisionMetadata("direct-save"),
    });
  }

  normalizePayload(payload) {
    return normalizeDugTilesSavePayload(payload);
  }

  _createNextRevisionMetadata(reason) {
    const stored = this.normalizePayload(this.loadFromLocalStorage())
      ?.revisionMetadata?.revision || 0;
    const parentRevision = Math.max(this._lastCommittedRevision, stored);
    return {
      revision: parentRevision + 1,
      parentRevision,
      transactionId: null,
      reason,
      capturedAt: new Date().toISOString(),
    };
  }

  _normalizeAndMigratePayload(payload, persistMigration) {
    const normalized = this.normalizePayload(payload);
    if (!normalized || normalized.version !== 14) {
      this._lastCommittedRevision = Math.max(
        this._lastCommittedRevision,
        normalized?.revisionMetadata?.revision || 0,
      );
      return normalized;
    }
    const revisionMetadata = sanitizeSaveRevisionMetadata({
      revision: 1,
      parentRevision: 0,
      transactionId: "migration:v14-v15",
      reason: "legacy-sidecar-merge",
      capturedAt: new Date().toISOString(),
    }, 1);
    const migrated = {
      ...normalized,
      version: SAVE_PAYLOAD_VERSION,
      updatedAt: new Date().toISOString(),
      revisionMetadata,
      campfireData: payload?.campfireData && typeof payload.campfireData === "object"
        ? normalized.campfireData
        : this.legacyProgressRepository.readCampfireData(),
      milestoneData: payload?.milestoneData
        ? sanitizeMilestoneData(payload.milestoneData)
        : sanitizeMilestoneData(this.legacyProgressRepository.readMilestoneData()),
      starCollectionData: payload?.starCollectionData
        ? sanitizeStarCollectionData(payload.starCollectionData)
        : sanitizeStarCollectionData(this.legacyProgressRepository.readStarCollectionData()),
    };
    if (persistMigration) this.saveToLocalStorage(migrated);
    this._lastCommittedRevision = Math.max(this._lastCommittedRevision, 1);
    return migrated;
  }

  loadFromLocalStorage() {
    try {
      const raw = window.localStorage.getItem(this.localStorageKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  saveToLocalStorage(payload) {
    if (this.isDeathTombstoned()) return false;
    try {
      window.localStorage.setItem(this.localStorageKey, JSON.stringify(payload));
      return true;
    } catch (error) {
      console.warn('[DugTilesSaveStore] Local save failed:', error?.message || error);
      return false;
    }
  }

  saveHardcoreCheckpoint(
    worldIdentity,
    hardcoreModeData,
    playerStateData,
  ) {
    if (this.isDeathTombstoned()) return false;
    const mode = sanitizeHardcoreModeData(hardcoreModeData);
    const player = sanitizePlayerPersistenceData(playerStateData);
    const requiredWorldFields = ["seed", "width", "depth", "topAirRows"];
    if (
      !isHardcoreModeArmed(mode)
      || !player
      || !requiredWorldFields.every(field => Number.isInteger(worldIdentity?.[field]))
    ) {
      return false;
    }
    const checkpoint = {
      version: 1,
      updatedAt: new Date().toISOString(),
      world: {
        seed: worldIdentity.seed,
        width: worldIdentity.width,
        depth: worldIdentity.depth,
        topAirRows: worldIdentity.topAirRows,
        layoutId: worldIdentity.layoutId || WORLD_GAMEPLAY_LAYOUT.id,
        layoutRevision: Number.isInteger(worldIdentity.layoutRevision)
          ? worldIdentity.layoutRevision
          : WORLD_GAMEPLAY_LAYOUT.revision,
      },
      hardcoreModeData: mode,
      playerStateData: player,
    };
    try {
      window.localStorage.setItem(
        this.hardcoreCheckpointKey,
        JSON.stringify(checkpoint),
      );
      return true;
    } catch (error) {
      console.warn(
        "[DugTilesSaveStore] Hardcore checkpoint failed:",
        error?.message || error,
      );
      return false;
    }
  }

  loadHardcoreCheckpoint(worldIdentity) {
    if (this.isDeathTombstoned()) return null;
    try {
      const raw = window.localStorage.getItem(this.hardcoreCheckpointKey);
      if (!raw) return null;
      const checkpoint = JSON.parse(raw);
      const mode = sanitizeHardcoreModeData(checkpoint?.hardcoreModeData);
      const player = sanitizePlayerPersistenceData(checkpoint?.playerStateData);
      if (
        checkpoint?.version !== 1
        || !worldMatches(worldIdentity, checkpoint?.world)
        || !isHardcoreModeArmed(mode)
        || !player
      ) {
        return null;
      }
      return {
        version: 1,
        updatedAt: typeof checkpoint.updatedAt === "string"
          ? checkpoint.updatedAt
          : null,
        hardcoreModeData: mode,
        playerStateData: player,
      };
    } catch {
      return null;
    }
  }

  applyHardcoreCheckpoint(saveData, worldIdentity) {
    if (!saveData || !isHardcoreModeArmed(saveData.hardcoreModeData)) {
      return saveData;
    }
    const checkpoint = this.loadHardcoreCheckpoint(worldIdentity);
    if (!checkpoint) return saveData;
    return {
      ...saveData,
      hardcoreModeData: checkpoint.hardcoreModeData,
      playerStateData: checkpoint.playerStateData,
    };
  }

  clearHardcoreCheckpoint() {
    try {
      window.localStorage.removeItem(this.hardcoreCheckpointKey);
      return true;
    } catch {
      return false;
    }
  }

  async loadFromEndpoint() {
    if (this.isDeathTombstoned()) return null;
    try {
      const response = await fetch(this.endpoint, { method: "GET", headers: { Accept: "application/json" } });
      if (!response.ok) return null;
      const json = await response.json();
      return json?.data ?? null;
    } catch { return null; }
  }

  async saveToEndpoint(payload) {
    if (this.isDeathTombstoned()) return false;
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        console.warn(`[DugTilesSaveStore] Remote save failed: HTTP ${response.status}`);
        return false;
      }
      return true;
    } catch (error) {
      console.warn('[DugTilesSaveStore] Remote save failed:', error?.message || error);
      return false;
    }
  }

  clearSave() {
    try {
      window.localStorage.removeItem(this.localStorageKey);
      window.localStorage.removeItem(this.hardcoreCheckpointKey);
    }
    catch (e) { console.error("Failed to clear save:", e); }
  }

  isDeathTombstoned() {
    if (this._deathTombstoned) return true;
    try {
      return window.localStorage.getItem(this.deathTombstoneKey) !== null;
    } catch {
      return false;
    }
  }

  markDeathTombstone(metadata = {}, authorizationToken = null) {
    if (
      authorizationToken !== PERMANENT_DEATH_TOMBSTONE_TOKEN
      || !isHardcoreModeArmed(metadata)
    ) {
      console.error(
        "[DugTilesSaveStore] Refused unauthorized permadeath tombstone.",
      );
      return false;
    }
    try {
      window.localStorage.setItem(this.deathTombstoneKey, JSON.stringify({
        version: 2,
        slotId: this.slotId,
        erasedAt: new Date().toISOString(),
        mode: "hardcore",
        armed: true,
        source: String(metadata?.source || "unknown"),
        depth: Math.max(0, Number.isFinite(metadata?.depth) ? metadata.depth : 0),
      }));
      this._deathTombstoned = true;
      return true;
    } catch (error) {
      this._deathTombstoned = false;
      console.error("[DugTilesSaveStore] Could not write permadeath tombstone:", error);
      return false;
    }
  }

  clearDeathTombstone() {
    this._deathTombstoned = false;
    try {
      window.localStorage.removeItem(this.deathTombstoneKey);
      return true;
    } catch {
      return false;
    }
  }

  beginNewSave() {
    this.clearSave();
    this.deleteAllBackups();
    this.clear();
    return this.clearDeathTombstone();
  }

  async clearRemoteSave(worldIdentity) {
    if (!this.endpoint) return true;
    try {
      const response = await fetch(this.endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          seed: worldIdentity.seed,
          width: worldIdentity.width,
          depth: worldIdentity.depth,
          topAirRows: worldIdentity.topAirRows,
          layoutId: worldIdentity.layoutId || WORLD_GAMEPLAY_LAYOUT.id,
          layoutRevision: worldIdentity.layoutRevision ?? WORLD_GAMEPLAY_LAYOUT.revision,
        }),
      });
      return response.ok;
    } catch (error) {
      console.warn('Failed to clear remote save:', error.message);
      return false;
    }
  }

  _hasAuthorizedDeathTombstone() {
    try {
      const raw = window.localStorage.getItem(this.deathTombstoneKey);
      if (!raw) return false;
      return isHardcoreModeArmed(JSON.parse(raw));
    } catch {
      return false;
    }
  }

  _hasStoredArmedHardcoreRun() {
    const current = this.normalizePayload(this.loadFromLocalStorage());
    if (isHardcoreModeArmed(current?.hardcoreModeData)) return true;
    try {
      const checkpointRaw = window.localStorage.getItem(
        this.hardcoreCheckpointKey,
      );
      const checkpoint = checkpointRaw ? JSON.parse(checkpointRaw) : null;
      if (isHardcoreModeArmed(checkpoint?.hardcoreModeData)) return true;
    } catch {
      // A corrupt checkpoint is not valid deletion authorization.
    }
    if (!this.slotId) return false;
    return this.backupManager.getBackups(this.slotId).some(entry => (
      isHardcoreModeArmed(
        this.normalizePayload(entry?.data)?.hardcoreModeData,
      )
    ));
  }

  preparePermanentDeath(metadata = {}) {
    const authorized = isHardcoreModeArmed(metadata)
      && (
        this._hasAuthorizedDeathTombstone()
        || this._hasStoredArmedHardcoreRun()
      );
    if (!authorized) {
      console.error(
        "[DugTilesSaveStore] Refused permanent death purge without stored armed-Hardcore evidence.",
      );
      return { success: false, backupsDeleted: 0, refused: true };
    }
    const backupsPresent = this.slotId
      ? this.backupManager.getBackups(this.slotId).length
      : 0;
    if (!this.markDeathTombstone(
      metadata,
      PERMANENT_DEATH_TOMBSTONE_TOKEN,
    )) {
      return { success: false, backupsDeleted: 0, refused: true };
    }
    this.clearSave();
    this.deleteAllBackups();
    this.clear();
    return {
      success: this.isDeathTombstoned(),
      backupsDeleted: backupsPresent,
    };
  }

  async purgePermanentDeath(worldIdentity, metadata = {}) {
    const prepared = this.preparePermanentDeath(metadata);
    if (prepared.refused) {
      return {
        success: false,
        remoteDeleted: false,
        backupsDeleted: 0,
        refused: true,
      };
    }
    const previouslyDeleted = Math.max(
      0,
      Math.floor(Number(metadata?.backupsDeleted) || 0),
    );
    const remoteDeleted = await this.clearRemoteSave(worldIdentity);
    return {
      success: this.isDeathTombstoned(),
      remoteDeleted,
      backupsDeleted: Math.max(previouslyDeleted, prepared.backupsDeleted),
    };
  }

  getBackups() {
    if (this.isDeathTombstoned()) return [];
    return this.slotId ? this.backupManager.getBackups(this.slotId) : [];
  }

  getLatestBackup() {
    if (this.isDeathTombstoned()) return null;
    if (!this.slotId) return null;
    const backup = this.backupManager.getLatestBackup(this.slotId);
    return isHardcoreMode(this.normalizePayload(backup)?.hardcoreModeData)
      ? null
      : backup;
  }

  restoreFromBackup(backupIndex) {
    if (this.isDeathTombstoned()) {
      return { success: false, error: "This Hardcore save was erased by permadeath" };
    }
    if (!this.slotId) return { success: false, error: 'No slot ID' };
    const current = this.normalizePayload(this.loadFromLocalStorage());
    if (isHardcoreMode(current?.hardcoreModeData)) {
      return {
        success: false,
        error: "Hardcore backups are oath-locked and cannot rewind the current run",
      };
    }
    const restored = this.backupManager.restoreBackup(this.slotId, backupIndex);
    if (
      restored.success
      && isHardcoreMode(this.normalizePayload(restored.saveData)?.hardcoreModeData)
    ) {
      return {
        success: false,
        error: "Hardcore backups cannot be restored as rollback saves",
      };
    }
    return restored;
  }

  deleteAllBackups() {
    return this.slotId ? this.backupManager.deleteAllBackups(this.slotId) : 0;
  }

  exportSave(filename = null) {
    try {
      if (this.isDeathTombstoned()) return false;
      const payload = this.loadFromLocalStorage();
      if (!payload) { console.warn('[DugTilesSaveStore] No save data to export'); return false; }
      const normalized = this.normalizePayload(payload);
      if (isHardcoreRunActive(normalized?.hardcoreModeData)) {
        console.warn('[DugTilesSaveStore] Active Hardcore saves cannot be exported as rollback files');
        return false;
      }
      const exportData = { version: payload.version, exportedAt: new Date().toISOString(), slotId: this.slotId, saveData: payload };
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `save-slot-${this.slotId || 'export'}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } catch (error) { console.error('[DugTilesSaveStore] Failed to export save:', error); return false; }
  }

  async importSave(file) {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      if (!importData.saveData || typeof importData.saveData !== 'object') return { success: false, error: 'Invalid save file structure' };
      const saveData = this.normalizePayload(importData.saveData);
      if (!saveData) return { success: false, error: 'Invalid save data' };
      if (isHardcoreRunActive(saveData.hardcoreModeData)) {
        return {
          success: false,
          error: "Active Hardcore saves cannot be imported because external rollback files break the oath",
        };
      }
      if (this.isDeathTombstoned()) {
        this.clearDeathTombstone();
      }
      const currentSave = this.loadFromLocalStorage();
      if (currentSave && this.slotId) {
        const backup = this.backupManager.createBackup(this.slotId, currentSave);
        if (!backup.success) {
          return { success: false, error: 'Could not create a safety backup for the current slot' };
        }
      }
      if (!this.saveToLocalStorage(saveData)) {
        return { success: false, error: 'Could not write the imported save' };
      }
      this.clearHardcoreCheckpoint();
      return { success: true, saveData, importedFrom: importData.exportedAt, originalSlot: importData.slotId };
    } catch (error) { return { success: false, error: error.message }; }
  }

  calculateChecksum() {
    const payload = this.loadFromLocalStorage();
    return payload ? this.backupManager.calculateChecksum(payload) : null;
  }

  verifyChecksum(expectedChecksum) {
    const payload = this.loadFromLocalStorage();
    return payload ? this.backupManager.verifyChecksum(payload, expectedChecksum) : false;
  }

  getSaveStats() {
    const payload = this.loadFromLocalStorage();
    const backups = this.getBackups();
    const levelState = resolvePlayerLevelSaveState(payload?.levelData || {});
    return {
      hasSave: payload !== null,
      lastUpdated: payload?.updatedAt || null,
      version: payload?.version || null,
      tilesDug: payload?.dugTiles?.length || 0,
      resources: payload?.resources || null,
      level: levelState.ok ? levelState.level : 1,
      bestDepth: payload?.retentionData?.stats?.bestDepth || 0,
      wallet: payload?.upgrades?.money || 0,
      stars: Number(payload?.version || 0) >= 14
        ? payload?.celestialOverhaulData?.talents?.stars || 0
        : payload?.retentionData?.stats?.starsCollected || 0,
      backupCount: backups.length,
      backupStats: this.slotId ? this.backupManager.getBackupStats(this.slotId) : null,
      checksum: payload ? this.backupManager.calculateChecksum(payload) : null
    };
  }
}
