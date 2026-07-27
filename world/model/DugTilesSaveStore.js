/**
 * DugTilesSaveStore — Tracks which tiles have been dug/modified by the player.
 * Stores tile coordinates as string keys for O(1) lookup.
 * Full persistence layer with localStorage and optional remote endpoint support.
 */
import { SaveBackupManager } from "../../systems/save-system/SaveBackupManager.js";
import { WORLD_GAMEPLAY_LAYOUT } from "../../values/worldGameplayLayout.js";
import { RESOURCE_ZERO_TOTALS, sanitizeResourceTotals } from "../../values/resourceTypes.js";
import { ANCIENT_RELIC_CONFIG } from "../../values/ancientRelics.js";
import { CAVE_SCENE_CONFIG } from "../../values/caveSceneConfig.js";
import { sanitizeOpeningFlightArtifactData } from "../../values/openingFlightArtifact.js";
import { sanitizeStarHeartData } from "../../values/celestialEngines.js";
import { sanitizeHeavenblocksProgressionData } from "../../values/heavenblocksProgressionConfig.js";
import { sanitizeHardcoreModeData } from "../../values/hardcoreMode.js";
import { sanitizeGraveborerWurmData } from "../../values/graveborerWurm.js";
import { sanitizeRetentionProgressData } from "../../systems/progression/retentionProgressState.js";

const DEFAULT_ENDPOINT = "save-dug-tiles.php";
const LOCAL_STORAGE_KEY = "dig-game-dug-tiles-admin";
const MAX_DUG_TILE_KEYS = 500000;
const MAX_RUBBLE_TILES = 500000;
const MAX_CAVE_SCENE_NODE_KEYS = 10000;
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

export function sanitizeCaveSceneData(data) {
  const collectedNodes = Array.isArray(data?.collectedNodes) ? data.collectedNodes : [];
  const normalized = [];
  const seen = new Set();
  for (const key of collectedNodes) {
    if (typeof key !== "string") continue;
    const coordinateMatch = /^([a-z0-9][a-z0-9-]{0,63}):(\d{1,3}),(\d{1,3})$/i.exec(key);
    const legacyMatch = /^([a-z0-9][a-z0-9-]{0,63}):(\d{1,2})$/i.exec(key);
    const legacyNode = legacyMatch
      ? CAVE_SCENE_CONFIG.rewards.nodeLayout[Number.parseInt(legacyMatch[2], 10)]
      : null;
    if (!coordinateMatch && !legacyNode) continue;
    const caveId = coordinateMatch?.[1] || legacyMatch[1];
    const tx = coordinateMatch ? Number.parseInt(coordinateMatch[2], 10) : legacyNode.tx;
    const ty = coordinateMatch ? Number.parseInt(coordinateMatch[3], 10) : legacyNode.ty;
    if (tx < 0 || ty < 0 || tx >= 1000 || ty >= 1000) continue;
    const normalizedKey = `${caveId}:${tx},${ty}`;
    if (seen.has(normalizedKey)) continue;
    seen.add(normalizedKey);
    normalized.push(normalizedKey);
    if (normalized.length >= MAX_CAVE_SCENE_NODE_KEYS) break;
  }
  return { collectedNodes: normalized };
}

function sanitizeAncientRelicData(data) {
  const count = Number.isFinite(data?.count) ? Math.floor(data.count) : 0;
  return {
    count: Math.max(0, Math.min(ANCIENT_RELIC_CONFIG.persistence.maxRelics, count)),
  };
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
  const expectedLayoutId = expectedWorld.layoutId || WORLD_GAMEPLAY_LAYOUT.id;
  const candidateLayoutId = candidateWorld.layoutId || WORLD_GAMEPLAY_LAYOUT.id;
  const expectedLayoutRevision = expectedWorld.layoutRevision ?? WORLD_GAMEPLAY_LAYOUT.revision;
  const candidateLayoutRevision = candidateWorld.layoutRevision ?? WORLD_GAMEPLAY_LAYOUT.revision;
  return expectedWorld.seed === candidateWorld.seed
    && widthMatches
    && expectedWorld.depth === candidateWorld.depth
    && expectedWorld.topAirRows === candidateWorld.topAirRows
    && expectedLayoutId === candidateLayoutId
    && expectedLayoutRevision === candidateLayoutRevision;
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
  ) {
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
    );
    const localSaved = this.saveToLocalStorage(payload);
    if (!localSaved) return false;
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
  ) {
    return {
      version: 12,
      updatedAt: new Date().toISOString(),
      playerCharacterId: typeof playerCharacterId === "string" ? playerCharacterId : null,
      world: {
        seed: worldIdentity.seed,
        width: worldIdentity.width,
        depth: worldIdentity.depth,
        topAirRows: worldIdentity.topAirRows,
        layoutId: worldIdentity.layoutId || WORLD_GAMEPLAY_LAYOUT.id,
        layoutRevision: worldIdentity.layoutRevision ?? WORLD_GAMEPLAY_LAYOUT.revision,
      },
      dugTiles: sanitizeDugTileKeys(dugTileKeys),
      rubbleTiles: sanitizeRubbleTiles(rubbleTiles),
      resources: sanitizeResourceTotals(resources),
      upgrades: upgrades || null,
      levelData: levelData || null,
      specialTileData: specialTileData || null,
      depthGateData: normalizeDepthGateData(depthGateData),
      dayNightData: dayNightData || null,
      caveSceneData: sanitizeCaveSceneData(caveSceneData),
      ancientRelicData: sanitizeAncientRelicData(ancientRelicData),
      openingFlightArtifactData: sanitizeOpeningFlightArtifactData(openingFlightArtifactData),
      starHeartData: sanitizeStarHeartData(starHeartData),
      retentionData: sanitizeRetentionProgressData(retentionData),
      heavenblocksData: sanitizeHeavenblocksProgressionData(heavenblocksData),
      hardcoreModeData: sanitizeHardcoreModeData(hardcoreModeData),
      graveborerWurmData: sanitizeGraveborerWurmData(graveborerWurmData),
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
      world: {
        seed: world.seed,
        width: world.width,
        depth: world.depth,
        topAirRows: world.topAirRows,
        layoutId: typeof world.layoutId === "string" ? world.layoutId : WORLD_GAMEPLAY_LAYOUT.id,
        layoutRevision: Number.isInteger(world.layoutRevision)
          ? world.layoutRevision
          : WORLD_GAMEPLAY_LAYOUT.revision,
      },
      dugTiles: sanitizeDugTileKeys(payload.dugTiles),
      rubbleTiles: sanitizeRubbleTiles(payload.rubbleTiles),
      resources: sanitizeResourceTotals(payload.resources),
      upgrades: payload.upgrades || null,
      levelData: payload.levelData || null,
      specialTileData: payload.specialTileData || null,
      depthGateData: normalizeDepthGateData(payload.depthGateData),
      dayNightData: payload.dayNightData || null,
      caveSceneData: sanitizeCaveSceneData(payload.caveSceneData),
      ancientRelicData: sanitizeAncientRelicData(payload.ancientRelicData),
      openingFlightArtifactData: payload.openingFlightArtifactData
        ? sanitizeOpeningFlightArtifactData(payload.openingFlightArtifactData)
        : null,
      starHeartData: payload.starHeartData
        ? sanitizeStarHeartData(payload.starHeartData)
        : null,
      retentionData: sanitizeRetentionProgressData(payload.retentionData),
      heavenblocksData: sanitizeHeavenblocksProgressionData(payload.heavenblocksData),
      hardcoreModeData: sanitizeHardcoreModeData(payload.hardcoreModeData),
      graveborerWurmData: sanitizeGraveborerWurmData(payload.graveborerWurmData),
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
    try {
      window.localStorage.setItem(this.localStorageKey, JSON.stringify(payload));
      return true;
    } catch (error) {
      console.warn('[DugTilesSaveStore] Local save failed:', error?.message || error);
      return false;
    }
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
    try { window.localStorage.removeItem(this.localStorageKey); }
    catch (e) { console.error("Failed to clear save:", e); }
  }

  async clearRemoteSave(worldIdentity) {
    if (!this.endpoint) return;
    try {
      await fetch(this.endpoint, {
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
      level: payload?.levelData?.level || 1,
      bestDepth: payload?.retentionData?.stats?.bestDepth || 0,
      wallet: payload?.upgrades?.money || 0,
      stars: payload?.retentionData?.stats?.starsCollected || 0,
      backupCount: backups.length,
      backupStats: this.slotId ? this.backupManager.getBackupStats(this.slotId) : null,
      checksum: payload ? this.backupManager.calculateChecksum(payload) : null
    };
  }
}
