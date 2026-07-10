/**
 * DugTilesSaveStore — Tracks which tiles have been dug/modified by the player.
 * Stores tile coordinates as string keys for O(1) lookup.
 * Full persistence layer with localStorage and optional remote endpoint support.
 */
import { SaveBackupManager } from "../../systems/save-system/SaveBackupManager.js";
import { RESOURCE_ZERO_TOTALS, sanitizeResourceTotals } from "../../values/resourceTypes.js";

const DEFAULT_ENDPOINT = "save-dug-tiles.php";
const LOCAL_STORAGE_KEY = "dig-game-dug-tiles-admin";
const MAX_DUG_TILE_KEYS = 500000;
const MAX_RUBBLE_TILES = 500000;
const LEGACY_WORLD_WIDTH_TILES = 120;

function sanitizeDugTileKeys(dugTileKeys) {
  if (!Array.isArray(dugTileKeys)) return [];
  const normalized = [];
  const seen = new Set();
  for (const tileKey of dugTileKeys) {
    if (typeof tileKey !== "string") continue;
    const [txText, tyText] = tileKey.split(",");
    const tx = Number.parseInt(txText, 10);
    const ty = Number.parseInt(tyText, 10);
    if (!Number.isInteger(tx) || !Number.isInteger(ty) || tx < 0 || ty < 0) continue;
    const normalizedKey = `${tx},${ty}`;
    if (seen.has(normalizedKey)) continue;
    seen.add(normalizedKey);
    normalized.push(normalizedKey);
    if (normalized.length >= MAX_DUG_TILE_KEYS) break;
  }
  return normalized;
}

function sanitizeRubbleTiles(rubbleTiles) {
  if (!Array.isArray(rubbleTiles)) return [];
  const normalized = [];
  const seen = new Set();
  for (const rubble of rubbleTiles) {
    const tx = Number.isInteger(rubble?.tx) ? rubble.tx : null;
    const ty = Number.isInteger(rubble?.ty) ? rubble.ty : null;
    const type = Number.isInteger(rubble?.type) ? rubble.type : null;
    if (tx === null || ty === null || type === null || tx < 0 || ty < 0 || type <= 0) continue;
    const key = `${tx},${ty}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({
      tx, ty, type,
      hp: Math.max(1, Math.floor(Number.isFinite(rubble.hp) ? rubble.hp : 1)),
      maxHp: Math.max(1, Math.floor(Number.isFinite(rubble.maxHp) ? rubble.maxHp : rubble.hp || 1)),
    });
    if (normalized.length >= MAX_RUBBLE_TILES) break;
  }
  return normalized;
}

function normalizeDepthGateData(data) {
  const valid = new Set([100, 300, 1000]);
  const acceptedThresholds = Array.isArray(data?.acceptedThresholds)
    ? [...new Set(data.acceptedThresholds
        .map(v => (v === 999 ? 1000 : valid.has(v) ? v : null))
        .filter(v => v !== null))].sort((a, b) => a - b)
    : [];
  return { acceptedThresholds };
}

function worldMatches(expectedWorld, candidateWorld) {
  if (!expectedWorld || !candidateWorld) return false;
  const widthMatches = expectedWorld.width === candidateWorld.width
    || (candidateWorld.width === LEGACY_WORLD_WIDTH_TILES && expectedWorld.width >= LEGACY_WORLD_WIDTH_TILES);
  return expectedWorld.seed === candidateWorld.seed
    && widthMatches
    && expectedWorld.depth === candidateWorld.depth
    && expectedWorld.topAirRows === candidateWorld.topAirRows;
}

export class DugTilesSaveStore {
  constructor(options = {}) {
    this.endpoint = options.endpoint ?? null;
    this.localStorageKey = options.localStorageKey
      ?? (options.slotId ? `dig-game-save-slot-${options.slotId}` : LOCAL_STORAGE_KEY);
    this.slotId = options.slotId || null;
    this.backupManager = new SaveBackupManager({ maxBackups: 5, backupPrefix: 'dig-game-backup' });

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
    const localPayload = this.loadFromLocalStorage();
    const localData = this.normalizePayload(localPayload);
    if (localData && worldMatches(worldIdentity, localData.world)) return localData;
    return null;
  }

  loadForDisplay() {
    const payload = this.loadFromLocalStorage();
    return this.normalizePayload(payload);
  }

  async load(worldIdentity) {
    const cached = this.loadCached(worldIdentity);
    if (cached) return cached;
    if (!this.endpoint) return null;
    const remotePayload = await this.loadFromEndpoint();
    const remoteData = this.normalizePayload(remotePayload);
    if (remoteData && worldMatches(worldIdentity, remoteData.world)) {
      this.saveToLocalStorage(remoteData);
      return remoteData;
    }
    return null;
  }

  async save(worldIdentity, dugTileKeys, resources = RESOURCE_ZERO_TOTALS, upgrades = null, levelData = null, specialTileData = null, depthGateData = null, dayNightData = null, rubbleTiles = [], playerCharacterId = null) {
    const payload = this.createPayload(worldIdentity, dugTileKeys, resources, upgrades, levelData, specialTileData, depthGateData, dayNightData, rubbleTiles, playerCharacterId);
    this.saveToLocalStorage(payload);
    if (this.slotId) this.backupManager.createBackup(this.slotId, payload);
    if (!this.endpoint) return;
    try { await this.saveToEndpoint(payload); }
    catch (error) { console.warn('Failed to save to remote server:', error.message); }
  }

  createPayload(worldIdentity, dugTileKeys, resources, upgrades = null, levelData = null, specialTileData = null, depthGateData = null, dayNightData = null, rubbleTiles = [], playerCharacterId = null) {
    return {
      version: 4,
      updatedAt: new Date().toISOString(),
      playerCharacterId: typeof playerCharacterId === "string" ? playerCharacterId : null,
      world: {
        seed: worldIdentity.seed,
        width: worldIdentity.width,
        depth: worldIdentity.depth,
        topAirRows: worldIdentity.topAirRows,
      },
      dugTiles: sanitizeDugTileKeys(dugTileKeys),
      rubbleTiles: sanitizeRubbleTiles(rubbleTiles),
      resources: sanitizeResourceTotals(resources),
      upgrades: upgrades || null,
      levelData: levelData || null,
      specialTileData: specialTileData || null,
      depthGateData: normalizeDepthGateData(depthGateData),
      dayNightData: dayNightData || null,
    };
  }

  normalizePayload(payload) {
    if (!payload || typeof payload !== "object") return null;
    const world = payload.world;
    if (!world || typeof world !== "object") return null;
    if (!["seed", "width", "depth", "topAirRows"].every(f => Number.isInteger(world[f]))) return null;
    return {
      version: Number.isInteger(payload.version) ? payload.version : 1,
      updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : null,
      world: { seed: world.seed, width: world.width, depth: world.depth, topAirRows: world.topAirRows },
      dugTiles: sanitizeDugTileKeys(payload.dugTiles),
      rubbleTiles: sanitizeRubbleTiles(payload.rubbleTiles),
      resources: sanitizeResourceTotals(payload.resources),
      upgrades: payload.upgrades || null,
      levelData: payload.levelData || null,
      specialTileData: payload.specialTileData || null,
      depthGateData: normalizeDepthGateData(payload.depthGateData),
      dayNightData: payload.dayNightData || null,
      playerCharacterId: typeof payload.playerCharacterId === "string" ? payload.playerCharacterId : null,
    };
  }

  loadFromLocalStorage() {
    try {
      const raw = window.localStorage.getItem(this.localStorageKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  saveToLocalStorage(payload) {
    try { window.localStorage.setItem(this.localStorageKey, JSON.stringify(payload)); }
    catch { /* ignore storage limits */ }
  }

  async loadFromEndpoint() {
    try {
      const response = await fetch(this.endpoint, { method: "GET", headers: { Accept: "application/json" } });
      if (!response.ok) return null;
      const json = await response.json();
      return json?.data ?? null;
    } catch { return null; }
  }

  async saveToEndpoint(payload) {
    try {
      await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
    } catch { /* silence */ }
  }

  clearSave() {
    try { window.localStorage.removeItem(this.localStorageKey); }
    catch (e) { console.error("Failed to clear save:", e); }
  }

  async clearRemoteSave(worldIdentity) {
    if (!this.endpoint) return;
    try {
      await fetch(this.endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ seed: worldIdentity.seed, width: worldIdentity.width, depth: worldIdentity.depth, topAirRows: worldIdentity.topAirRows }),
      });
    } catch (error) { console.warn('Failed to clear remote save:', error.message); }
  }

  getBackups() {
    return this.slotId ? this.backupManager.getBackups(this.slotId) : [];
  }

  getLatestBackup() {
    return this.slotId ? this.backupManager.getLatestBackup(this.slotId) : null;
  }

  restoreFromBackup(backupIndex) {
    if (!this.slotId) return { success: false, error: 'No slot ID' };
    return this.backupManager.restoreBackup(this.slotId, backupIndex);
  }

  deleteAllBackups() {
    return this.slotId ? this.backupManager.deleteAllBackups(this.slotId) : 0;
  }

  exportSave(filename = null) {
    try {
      const payload = this.loadFromLocalStorage();
      if (!payload) { console.warn('[DugTilesSaveStore] No save data to export'); return false; }
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
      this.saveToLocalStorage(saveData);
      if (this.slotId) this.backupManager.createBackup(this.slotId, saveData);
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
    return {
      hasSave: payload !== null,
      lastUpdated: payload?.updatedAt || null,
      version: payload?.version || null,
      tilesDug: payload?.dugTiles?.length || 0,
      resources: payload?.resources || null,
      backupCount: backups.length,
      backupStats: this.slotId ? this.backupManager.getBackupStats(this.slotId) : null,
      checksum: payload ? this.backupManager.calculateChecksum(payload) : null
    };
  }
}
