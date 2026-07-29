import { TILE_TYPES } from "../../values/tileTypes.js";
import { HEAVENBLOCKS_WORLD_CONFIG } from "../../values/heavenblocksWorldConfig.js";
import { HEAVENBLOCKS_PROGRESSION_CONFIG } from "../../values/heavenblocksProgressionConfig.js";

function validIds(values, allowed, max) {
  const result = [];
  for (const value of Array.isArray(values) ? values : []) {
    if (!allowed.has(value) || result.includes(value)) continue;
    result.push(value);
    if (result.length >= max) break;
  }
  return result;
}

export class HeavenblocksProgressionSystem {
  constructor(options = {}) {
    this.relicSystem = options.relicSystem || null;
    this.worldModel = options.worldModel || null;
    this.onRegionUnlocked = options.onRegionUnlocked || null;
    this.onHeartAttuned = options.onHeartAttuned || null;
    this.onRelicProgress = options.onRelicProgress || null;
    this.onTileChanged = options.onTileChanged || null;
    this.unlockedRegions = new Set();
    this.attunedHearts = new Set();
    this.discoveredRegions = new Set();
    this.unsubscribeRelics = this.relicSystem?.subscribe?.((snapshot) => {
      this.onRelicProgress?.(snapshot);
      this.evaluateUnlocks({ silent: snapshot.source === "load" });
    }) || null;
    this.evaluateUnlocks({ silent: true });
  }

  getRelicCount() {
    return this.relicSystem?.getCount?.() || 0;
  }

  isRegionUnlocked(regionId) {
    return this.unlockedRegions.has(regionId);
  }

  isHeartAttuned(regionId) {
    return this.attunedHearts.has(regionId);
  }

  isRegionDiscovered(regionId) {
    return this.discoveredRegions.has(regionId);
  }

  evaluateUnlocks(options = {}) {
    for (const entry of HEAVENBLOCKS_PROGRESSION_CONFIG.regionSequence) {
      if (this.unlockedRegions.has(entry.id) || !this._meetsUnlock(entry)) continue;
      this.unlockedRegions.add(entry.id);
      this._removeRegionBarrier(entry.id);
      if (!options.silent) this.onRegionUnlocked?.(entry.id, this.getSnapshot());
    }
    return this.getSnapshot();
  }

  _meetsUnlock(entry) {
    if (entry.unlockKind === "relics") return this.getRelicCount() >= entry.unlockValue;
    if (entry.unlockKind === "heart") return this.attunedHearts.has(entry.unlockValue);
    return false;
  }

  attuneHeart(regionId) {
    const entry = HEAVENBLOCKS_PROGRESSION_CONFIG.regionSequence.find(
      (candidate) => candidate.id === regionId
    );
    if (!entry) return { success: false, reason: "unknown-region" };
    if (!this.isRegionUnlocked(regionId)) {
      return { success: false, reason: "region-locked", regionId };
    }
    if (this.attunedHearts.has(regionId)) {
      return { success: false, reason: "already-attuned", regionId };
    }
    this.attunedHearts.add(regionId);
    this.onHeartAttuned?.(regionId, this.getSnapshot());
    this.evaluateUnlocks();
    return {
      success: true,
      regionId,
      nextRegionId: entry.unlocksRegionId,
      snapshot: this.getSnapshot(),
    };
  }

  markDiscovered(regionId, options = {}) {
    if (!this.isRegionUnlocked(regionId) || this.discoveredRegions.has(regionId)) return false;
    this.discoveredRegions.add(regionId);
    if (!options.silent) options.onDiscovered?.(regionId, this.getSnapshot());
    return true;
  }

  getRegionAccessState(regionId) {
    const entry = HEAVENBLOCKS_PROGRESSION_CONFIG.regionSequence.find(
      (candidate) => candidate.id === regionId
    );
    if (!entry) return { allowed: false, reason: "unknown-region" };
    if (this.isRegionUnlocked(regionId)) return { allowed: true, regionId };
    if (entry.unlockKind === "relics") {
      return {
        allowed: false,
        reason: "relics",
        have: this.getRelicCount(),
        required: entry.unlockValue,
        regionId,
      };
    }
    return {
      allowed: false,
      reason: "heart",
      requiredRegionId: entry.unlockValue,
      regionId,
    };
  }

  getLevelAccessState(levelId) {
    const level = HEAVENBLOCKS_WORLD_CONFIG.levels.find(
      (entry) => entry.levelId === Number(levelId)
    );
    const regionId = level?.regionIds?.[0];
    return regionId
      ? this.getRegionAccessState(regionId)
      : { allowed: false, reason: "unknown-level" };
  }

  _removeRegionBarrier(regionId) {
    const region = HEAVENBLOCKS_WORLD_CONFIG.regions.find((entry) => entry.id === regionId);
    if (!region?.barrier || !this.worldModel) return;
    for (let offset = 0; offset < region.barrier.height; offset += 1) {
      const tx = region.barrier.tx;
      const ty = region.barrier.topTy + offset;
      if (this.worldModel.getTileType(tx, ty) !== TILE_TYPES.HEAVEN_BARRIER) continue;
      this.worldModel.setTile(tx, ty, TILE_TYPES.AIR, 0);
      this.onTileChanged?.(tx, ty);
    }
  }

  getSnapshot() {
    return Object.freeze({
      relics: this.getRelicCount(),
      relicsRequired: HEAVENBLOCKS_PROGRESSION_CONFIG.relicUnlockCount,
      unlockedRegions: Object.freeze([...this.unlockedRegions]),
      attunedHearts: Object.freeze([...this.attunedHearts]),
      discoveredRegions: Object.freeze([...this.discoveredRegions]),
    });
  }

  getSaveData() {
    return {
      unlockedRegions: [...this.unlockedRegions],
      attunedHearts: [...this.attunedHearts],
      discoveredRegions: [...this.discoveredRegions],
    };
  }

  loadSaveData(data) {
    const sequence = HEAVENBLOCKS_PROGRESSION_CONFIG.regionSequence;
    const allowed = new Set(sequence.map((entry) => entry.id));
    const savedHearts = validIds(
      data?.attunedHearts,
      allowed,
      HEAVENBLOCKS_PROGRESSION_CONFIG.persistence.maxRegionIds
    );
    this.attunedHearts.clear();
    for (let index = 0; index < sequence.length; index += 1) {
      const entry = sequence[index];
      if (!savedHearts.includes(entry.id)) continue;
      if (entry.id === HEAVENBLOCKS_PROGRESSION_CONFIG.initialRegionId) {
        if (this.getRelicCount() < HEAVENBLOCKS_PROGRESSION_CONFIG.relicUnlockCount) continue;
      } else {
        const previous = sequence[index - 1]?.id;
        if (previous && !this.attunedHearts.has(previous)) continue;
      }
      this.attunedHearts.add(entry.id);
    }
    this.unlockedRegions.clear();
    this.evaluateUnlocks({ silent: true });
    const savedDiscovered = validIds(
      data?.discoveredRegions,
      allowed,
      HEAVENBLOCKS_PROGRESSION_CONFIG.persistence.maxRegionIds
    );
    this.discoveredRegions = new Set(
      savedDiscovered.filter((regionId) => this.unlockedRegions.has(regionId))
    );
    return this.getSnapshot();
  }

  destroy() {
    this.unsubscribeRelics?.();
    this.unsubscribeRelics = null;
  }
}
